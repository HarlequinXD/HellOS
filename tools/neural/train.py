"""Trains the residents' own language model from scratch (numpy only, no libraries).

A small word-level GRU that writes a reply one word at a time, steered by the kind
of reply wanted (a greeting, a "how are you" when things are going badly, a goodbye
to a close friend...). It learns from the game's own wordings (corpus.json, built by
corpus.js). Facts are never part of what it learns: they appear as [slot] tokens,
which the game fills in from the resident's real life.

    node tools/neural/corpus.js
    python3 tools/neural/train.py           (a few minutes)
Writes app/src/main/assets/www/js/core/neural-weights.js
"""
import json, math, os, re, sys, base64, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'app/src/main/assets/www/js/core/neural-weights.js')
rng = np.random.default_rng(7)
corpus = json.load(open(os.path.join(HERE, 'corpus.json')))
LABELS = sorted(corpus.keys())

TOK = re.compile(r"\[\w+\]|[A-Za-z’'\-]+|\d+|[.,!?…;:()*♪“”\"~]|\S")
def tokens(s): return TOK.findall(s)

# vocabulary, and the usual capitalisation of each word
counts, casing = {}, {}
for l in LABELS:
    for s in corpus[l]:
        prev = '.'
        for w in tokens(s):
            lw = w.lower() if not w.startswith('[') else w
            counts[lw] = counts.get(lw, 0) + 1
            # only mid-sentence spellings count (sentence starts are capitalised anyway)
            if not re.match(r'^[.!?…*♪“"]$', prev): casing.setdefault(lw, {}).setdefault(w, 0); casing[lw][w] += 1
            prev = w
VOCAB = ['<pad>', '<s>', '</s>'] + sorted(counts)
W2I = {w: i for i, w in enumerate(VOCAB)}
CASE = {w: max(c.items(), key=lambda x: x[1])[0] for w, c in casing.items() if max(c.items(), key=lambda x: x[1])[0] != w}
V, L = len(VOCAB), len(LABELS)
E, LE, H = 48, 16, 128
print(len(LABELS), 'kinds of reply,', sum(len(corpus[l]) for l in LABELS), 'sentences, vocab', V)

seqs = []
for li, l in enumerate(LABELS):
    for s in corpus[l]:
        ids = [1] + [W2I[w.lower() if not w.startswith('[') else w] for w in tokens(s)][:30] + [2]
        seqs.append((li, ids))
# balance: small kinds of reply are repeated so the model learns them too
by = {}
for li, ids in seqs: by.setdefault(li, []).append(ids)
data = []
for li, lst in by.items():
    k = max(1, 250 // len(lst))
    for ids in lst: data += [(li, ids)] * min(k, 12)
print('training sequences', len(data))

def init(*shape, s=None): return (rng.standard_normal(shape) * (s or 1 / math.sqrt(shape[0]))).astype(np.float32)
P = {
    'emb': init(V, E, s=0.1), 'lab': init(L, LE, s=0.1),
    'Wx': init(E + LE, 3 * H), 'Wh': init(H, 3 * H), 'b': np.zeros(3 * H, np.float32), 'bhn': np.zeros(H, np.float32),
    'Wo': init(H, V), 'bo': np.zeros(V, np.float32)
}
M = {k: np.zeros_like(v) for k, v in P.items()}; S = {k: np.zeros_like(v) for k, v in P.items()}
sig = lambda x: 1 / (1 + np.exp(-x))

def step_batch(batch, lr, t):
    B = len(batch); T = max(len(ids) for _, ids in batch) - 1
    X = np.zeros((B, T), np.int64); Y = np.zeros((B, T), np.int64); mask = np.zeros((B, T), np.float32)
    lab = np.array([li for li, _ in batch])
    for i, (_, ids) in enumerate(batch):
        n = len(ids) - 1; X[i, :n] = ids[:-1]; Y[i, :n] = ids[1:]; mask[i, :n] = 1
    labv = P['lab'][lab]
    h = np.zeros((B, H), np.float32); cache = []; loss = 0.0
    G = {k: np.zeros_like(v) for k, v in P.items()}
    dlogits_all = []
    for s in range(T):
        x = np.concatenate([P['emb'][X[:, s]], labv], 1)
        gx = x @ P['Wx'] + P['b']; gh = h @ P['Wh']
        z = sig(gx[:, :H] + gh[:, :H]); r = sig(gx[:, H:2 * H] + gh[:, H:2 * H])
        hn = gh[:, 2 * H:] + P['bhn']; n = np.tanh(gx[:, 2 * H:] + r * hn)
        hnew = (1 - z) * n + z * h
        logits = hnew @ P['Wo'] + P['bo']; logits -= logits.max(1, keepdims=True)
        p = np.exp(logits); p /= p.sum(1, keepdims=True)
        m = mask[:, s]
        loss -= (np.log(p[np.arange(B), Y[:, s]] + 1e-9) * m).sum()
        dl = p; dl[np.arange(B), Y[:, s]] -= 1; dl *= m[:, None]
        cache.append((x, h, z, r, hn, n, hnew, dl))
        h = hnew
    ntok = mask.sum()
    dh_next = np.zeros((B, H), np.float32)
    for s in reversed(range(T)):
        x, hprev, z, r, hn, n, hnew, dl = cache[s]
        dl = dl / ntok
        G['Wo'] += hnew.T @ dl; G['bo'] += dl.sum(0)
        dh = dl @ P['Wo'].T + dh_next
        dz = dh * (hprev - n) * z * (1 - z)
        dn = dh * (1 - z) * (1 - n * n)
        dr = dn * hn * r * (1 - r)
        dhn = dn * r
        dgx = np.concatenate([dz, dr, dn], 1)
        dgh = np.concatenate([dz, dr, dhn], 1)
        G['Wx'] += x.T @ dgx; G['b'] += dgx.sum(0); G['bhn'] += dhn.sum(0)
        G['Wh'] += hprev.T @ dgh
        dx = dgx @ P['Wx'].T
        dh_next = dh * z + dgh @ P['Wh'].T
        np.add.at(G['emb'], X[:, s], dx[:, :E])
        np.add.at(G['lab'], lab, dx[:, E:])
    # clip and Adam
    norm = math.sqrt(sum(float((g * g).sum()) for g in G.values()))
    if norm > 5: G = {k: g * (5 / norm) for k, g in G.items()}
    for k in P:
        M[k] = 0.9 * M[k] + 0.1 * G[k]; S[k] = 0.999 * S[k] + 0.001 * G[k] * G[k]
        P[k] -= lr * (M[k] / (1 - 0.9 ** t)) / (np.sqrt(S[k] / (1 - 0.999 ** t)) + 1e-8)
    return loss / ntok

EPOCHS = int(os.environ.get('EPOCHS', 14)); BS = 64; t = 0; t0 = time.time()
for ep in range(EPOCHS):
    order = rng.permutation(len(data)); tot = 0; nb = 0
    lr = 0.004 * (0.85 ** ep)
    for i in range(0, len(order), BS):
        batch = [data[j] for j in order[i:i + BS]]
        t += 1; tot += step_batch(batch, lr, t); nb += 1
    print('epoch', ep + 1, 'loss %.3f' % (tot / nb), '%ds' % (time.time() - t0)); sys.stdout.flush()

# ---------------------------------------------------------------- try it: how many replies are new?
def sample(li, temp=0.8, k=12):
    h = np.zeros(H, np.float32); w = 1; out = []
    for _ in range(32):
        x = np.concatenate([P['emb'][w], P['lab'][li]])
        gx = x @ P['Wx'] + P['b']; gh = h @ P['Wh']
        z = sig(gx[:H] + gh[:H]); r = sig(gx[H:2 * H] + gh[H:2 * H]); n = np.tanh(gx[2 * H:] + r * (gh[2 * H:] + P['bhn']))
        h = (1 - z) * n + z * h
        lg = (h @ P['Wo'] + P['bo']) / temp; top = np.argsort(lg)[-k:]
        pr = np.exp(lg[top] - lg[top].max()); pr /= pr.sum()
        w = int(rng.choice(top, p=pr))
        if w == 2: break
        out.append(VOCAB[w])
    return out
def detok(ws):
    s = ''; start = True
    for w in ws:
        w = CASE.get(w, w)
        if start and w[:1].isalpha(): w = w[:1].upper() + w[1:]
        s += ('' if re.match(r"^[.,!?…;:)~]$", w) or s == '' else ' ') + w
        start = bool(re.match(r'^[.!?…]$', w))
    return s
seen = set(s.lower() for l in LABELS for s in corpus[l])
new = 0; tries = 0
for l in ['greet', 'how_bad', 'bye_close', 'compliment', 'react', 'idk', 'hungry', 'best_hell']:
    li = LABELS.index(l)
    ex = [detok(sample(li)) for _ in range(6)]
    for e in ex:
        tries += 1; new += e.lower() not in seen
    print(l, '|', ' || '.join(ex[:4]))
print('new sentences (not in the training text): %d of %d' % (new, tries))

# ---------------------------------------------------------------- export int8
def q(a):
    a = a.astype(np.float32).ravel(); s = float(np.abs(a).max()) / 127 or 1.0
    return base64.b64encode(np.round(a / s).astype(np.int8).tobytes()).decode(), s
blob = {'version': 'nv-%d' % int(time.time()), 'vocab': VOCAB, 'case': CASE, 'labels': LABELS, 'E': E, 'LE': LE, 'H': H}
for k in ['emb', 'lab', 'Wx', 'Wh', 'Wo']:
    blob[k], blob['s_' + k] = q(P[k])
for k in ['b', 'bhn', 'bo']:
    blob[k] = [round(float(x), 5) for x in P[k]]
open(OUT, 'w').write("/* The residents' own language model (neural.js). Generated by tools/neural/train.py: do not edit. */\nwindow.NEURAL_WEIGHTS = " + json.dumps(blob, separators=(',', ':')) + ';\n')
print('wrote neural-weights.js', os.path.getsize(OUT) // 1024, 'KB')
