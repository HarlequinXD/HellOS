"""Export HellOS roster and app artwork. Requires Pillow and Node.js.

Run from any directory: python tools/export_pixel_pack.py
The live registry supplies names, kinds, pronouns, faces and app IDs.
"""
import csv
import hashlib
import json
from pathlib import Path
import random
import re
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
WWW = ROOT / 'app/src/main/assets/www'
ART = WWW / 'art'
SIZE = 64
INK = '#130c1e'
BONE = '#fff1cc'
RAMPS = {
    'iron': ('#191724', '#68647b', '#dadfe5'), 'plum': ('#170b23', '#673a74', '#e1a0d5'),
    'blood': ('#250b20', '#a02d4b', '#ff8c82'), 'crimson': ('#300b22', '#c34759', '#ffc098'),
    'ember': ('#39162a', '#db613e', '#ffd57c'), 'gold': ('#39232c', '#be874c', '#ffe4a0'),
    'bone': ('#352940', '#b6a3a1', '#fff1cb'), 'flesh': ('#412333', '#ba7361', '#ffd6a5'),
    'wood': ('#2c1925', '#90624e', '#e6af78'), 'bile': ('#222334', '#82924a', '#dfeb92'),
    'serpent': ('#13252c', '#488763', '#b8efaf'), 'soul': ('#152738', '#468eab', '#bcffed'),
    'slate': ('#141d35', '#536386', '#c2dbf2'), 'void': ('#190d29', '#574485', '#c6b3ff'),
    'vex': ('#2a1441', '#ab5a9b', '#ffb7da'), 'ash': ('#252337', '#7f7989', '#e7d9da'),
}
CIRCLES = ['blood', 'vex', 'wood', 'gold', 'crimson', 'slate', 'ember', 'void', 'soul']
BACKDROPS = {
    'blood': 0, 'vex': 1, 'wood': 2, 'gold': 3, 'crimson': 4, 'slate': 5, 'ember': 6,
    'void': 7, 'soul': 8, 'plum': 13, 'iron': 10, 'bone': 10, 'ash': 10,
    'serpent': 14, 'bile': 14, 'flesh': 15,
}
CLASSICS = {
    'c_lucien': dict(bg='blood', skin=['flesh', 8], hair=['plum', 3], hairStyle='side',
                     horns='small', eyes='gold', suit=['iron', 4], tie='crimson', mouth='smirk'),
    'c_vex': dict(bg='vex', skin=['vex', 8], hair=['plum', 4], hairStyle='spiky',
                  horns='small', ears=True, eyes='gold', suit=['plum', 5], mouth='grin'),
    'c_charon': dict(bg='slate', skin=['ash', 5], hood=['iron', 4], eyes='soul',
                     beard=['ash', 11], suit=['iron', 2], mouth='flat'),
    'c_mortis': dict(bg='void', skull=True, cap=['void', 6], eyes='void', suit=['wood', 5]),
    'c_morgana': dict(bg='serpent', skin=['flesh', 10], hair=['plum', 4], hairStyle='side',
                      long=True, hat=['plum', 5], eyes='serpent', suit=['serpent', 5],
                      mouth='smile', earring='gold'),
    'c_pizza': dict(bg='ember', skin=['crimson', 7], chef=True, horns='small',
                    eyes='gold', mustache=True, suit=['bone', 11], mouth='grin'),
    'c_hotline': dict(bg='crimson', skull=True, horns='ram', eyes='ember', suit=['blood', 4]),
    'player_default': dict(bg='void', hood=['void', 6], eyes='vex', suit=['void', 5], faceless=True),
}

def rgb(color):
    return tuple(bytes.fromhex(color.lstrip('#')))

def shade(key, value):
    a, b, c = map(rgb, RAMPS[key])
    value = min(15, max(0, value))
    start, end, t = (a, b, value / 8) if value <= 8 else (b, c, (value - 8) / 7)
    return tuple(round(s + (e - s) * t) for s, e in zip(start, end))

def tones(spec):
    key, value = spec
    return [shade(key, value + delta) for delta in (-5, -2, 1, 4, 7)]

def rect(d, x, y, w, h, color):
    d.rectangle((x, y, x+w-1, y+h-1), fill=color)

def poly(d, color, *xy):
    d.polygon(xy, fill=color)

def line(d, color, *xy, width=1):
    d.line(xy, fill=color, width=width)

def orb(d, x, y, radius, color):
    d.ellipse((x-radius,y-radius,x+radius,y+radius), fill=color)

def sparkle(d, x, y, color, size=2):
    line(d, color, (x-size,y), (x+size,y))
    line(d, color, (x,y-size), (x,y+size))

def backdrop(d, ramp, rng, plate=False):
    silhouette = [(3,15),(8,8),(15,3),(48,3),(55,8),(60,15),(60,48),(55,55),(48,60),(15,60),(8,55),(3,48)] if plate else None
    if plate:
        d.polygon(silhouette, fill=INK)
        d.polygon([(5,16),(10,10),(16,5),(47,5),(53,10),(58,16),(58,47),(53,53),
                   (47,58),(16,58),(10,53),(5,47)], fill=shade(ramp, 2))
        line(d, shade(ramp, 7), (6,25),(6,16),(16,6),(47,6),(56,15))
        line(d, shade(ramp, 4), (57,37),(57,47),(47,57),(16,57),(8,49))
        line(d, shade(ramp, 12), (18,6),(30,6))
        for x,y in [(10,13),(53,13),(10,50),(53,50)]:
            rect(d,x,y,2,2,shade(ramp,8))
    else:
        orb(d, 31, 31, 31, INK)
        orb(d, 31, 31, 29, shade(ramp, 4))
        d.arc((2,2,60,60), 198, 301, fill=shade(ramp, 8), width=1)
    orb(d, 31, 28, 21 if plate else 24, shade(ramp, 3))
    orb(d, 28, 24, 16, shade(ramp, 4.5 if plate else 6))
    if not plate:
        for i in range(5):
            x = 9+i*10+rng.randrange(-2,3)
            y = rng.randrange(21,53)
            rect(d, x, y, 3, 67-y, shade(ramp, 2.5))
            poly(d, shade(ramp, 2.5), (x-2,y+2),(x+1,y-4),(x+4,y+2))
    for x,y in [(11,28),(51,20),(16,14),(47,45),(14,45),(48,11)]:
        for _ in range(1 + rng.randrange(2)):
            xx, yy = x+rng.randrange(-3,4), y+rng.randrange(-3,4)
            d.point((xx,yy), fill=shade(ramp, rng.choice([8,10,12])))
    if plate:
        sparkle(d, 13, 37, shade(ramp, 8), 2)
        sparkle(d, 50, 24, shade(ramp, 10), 2)

def portrait(p, scenery=None):
    name, cid, kind = p['name'], p['cid'], p['kind']
    seed = int.from_bytes(hashlib.sha256((cid + ':' + name).encode()).digest()[:8], 'little')
    rng = random.Random(seed)
    f = CLASSICS.get(cid, p.get('face', {})).copy()
    canonical = cid in CLASSICS or p.get('king')
    pron = p.get('pron')
    eye = f.get('eyes','gold')
    bg = f.get('bg', 'void') if canonical else CIRCLES[p['circle']]
    if not canonical:
        if p.get('quirk','').startswith('never takes their sunglasses'):
            f['glasses'] = 'shades'
        if p.get('quirk','').startswith('wears three scarves'):
            f['scarf'] = True
    skull = f.get('skull')
    hidden = f.get('faceless')
    job = p.get('jobKey', '')
    outfit = f.get('suit',['void',5])
    coat = tones([outfit[0], max(5,outfit[1])])
    skin = tones(['bone',11] if skull else f.get('skin',['ash',6]))
    hair = tones(f.get('hair',['plum',5]))
    horn = tones(['gold',8] if f.get('horns') == 'ram' else ['bone',8])
    jewelry = shade(f.get('earring','gold'), 12)
    eyes = tones([eye,11])
    canvas = Image.new('RGBA',(SIZE,SIZE))
    d = ImageDraw.Draw(canvas)
    backdrop(d,bg,rng)
    if scenery is not None:
        special = {'pride': 9, 'greed': 3, 'lust': 1, 'envy': 13,
                   'gluttony': 2, 'wrath': 4, 'sloth': 10}
        occupations = {'iron smith': 12, 'ferry deckhand': 0, 'librarian': 13,
                       'marsh ranger': 14, 'gravedigger': 10, 'bath keeper': 11}
        tile_index = special.get(p.get('king'), occupations.get(job, BACKDROPS[bg]))
        env = scenery[tile_index]
        canvas.paste(env, (0,0), SCENERY_MASK)
    # A slight turn, jaw and chin differences, and lighting establish the face planes.
    turn = rng.choice([-1, 1])
    xoff = rng.choice([-2,-1,0,1,2])
    yoff = rng.choice([-1,0,1])
    narrow = rng.choice([-2,-1,0,1]) + {'she':-1,'he':1}.get(pron,0)
    if kind in {'imp','ghoul','lich'}: narrow -= 1
    if kind in {'gargoyle','hellhound-kin'} or p.get('king') == 'gluttony': narrow += 3
    ink = '#1a101f'
    # Wings frame fallen angels and gargoyles.
    if kind in {'fallen angel','gargoyle'}:
        for s in (-1,1):
            poly(d, shade(bg, 2), (32+s*10,48),(32+s*24,35),(32+s*29,20),
                 (32+s*28,44),(32+s*23,49),(32+s*22,55),(32+s*15,58))
            line(d, shade(bg, 9), (32+s*12,49),(32+s*24,39),(32+s*29,21))
            line(d, shade(bg, 6), (32+s*21,45),(32+s*26,36))
    # Hood, the fall of long hair and the shoulders are behind the face.
    if f.get('long') and f.get('hair'):
        poly(d, ink, (17,22),(25,14),(45,18),(49,25),(52,47),(46,58),(13,57),(16,39))
        poly(d, hair[1], (19,22),(25,16),(45,19),(47,27),(49,48),(44,55),(15,55))
        for x,y in [(18,42),(21,38),(45,41),(47,46)]:
            line(d,hair[2],(x,y-8),(x+1,y),(x-1,y+8),width=2)
    hood = tones(f['hood']) if f.get('hood') else None
    if hood:
        poly(d,ink,(10,50),(12,30),(17,18),(32,9),(45,16),(53,30),(55,52),(46,60),(16,60))
        poly(d,hood[1],(12,50),(15,30),(19,19),(32,11),(44,18),(51,31),(53,52),(44,59),(17,59))
        poly(d,hood[2],(14,42),(17,28),(23,19),(32,12),(43,18),(33,16),(25,23),(21,39),(17,48))
        line(d,hood[3],(17,28),(22,20),(30,14),(34,14))
    poly(d,ink,(3,64),(7,55),(15,50),(24,46),(40,46),(48,49),(56,54),(61,64))
    poly(d,coat[1],(5,64),(10,56),(16,52),(25,48),(39,48),(47,51),(55,55),(59,64))
    poly(d,coat[2],(8,63),(12,56),(22,52),(27,53),(23,62))
    poly(d,coat[0],(41,53),(49,54),(54,58),(57,64),(43,64))
    line(d,coat[3],(10,59),(14,55),(22,52))
    line(d,coat[2],(46,51),(53,54),(56,57))
    if kind in {'cultist','wraith'} or f.get('scarf') or job in {'ferry deckhand','ice warden','tavern keeper'}:
        poly(d,coat[3],(15,51),(24,47),(42,48),(51,53),(41,57),(25,56))
        line(d,coat[0],(22,52),(30,55),(42,55),(47,53))
    for s in (-1,1):
        x = 32+s*19
        if job in {'throne guard','arena fighter','iron smith','brimstone miner'} or p.get('king') == 'wrath':
            poly(d,coat[3],(x-4,55),(x+3,52),(x+7,55),(x+6,59),(x,58))
            line(d,coat[4],(x-2,55),(x+3,53),(x+5,55))
    # Local face coordinates. Mirroring changes the visible cheek and accessory placement.
    def at(x,y):
        return (32 + xoff + turn*(x-32), y+yoff)
    def P(c,*pts): poly(d,c,*(at(x,y) for x,y in pts))
    def L(c,*pts,width=1): line(d,c,*(at(x,y) for x,y in pts),width=width)
    def R(c,x,y,w,h):
        a,b = at(x,y),at(x+w-1,y+h-1)
        d.rectangle((min(a[0],b[0]),a[1],max(a[0],b[0]),b[1]),fill=c)
    def E(c,x,y,rx,ry):
        a,b = at(x-rx,y-ry),at(x+rx,y+ry)
        d.ellipse((min(a[0],b[0]),a[1],max(a[0],b[0]),b[1]),fill=c)
    if f.get('halo'):
        d.arc((17,5,46,20), 182, 518 if f['halo']=='broken' else 540, fill=shade('gold', 9), width=2)
        d.arc((17,5,46,20), 192, 318, fill='#ffe8a3', width=1)
    horns = f.get('horns')
    if horns:
        templates = {
            'small': [(20,24),(14,19),(13,12),(11,8),(18,12),(22,18),(25,22)],
            'long': [(21,24),(13,18),(10,10),(10,3),(15,8),(19,14),(26,21)],
            'curl': [(24,24),(15,24),(10,20),(8,15),(12,9),(20,7),(25,11),(20,11),(15,15),(17,19),(24,18)],
            'ram': [(26,22),(19,26),(12,25),(7,19),(7,13),(11,8),(17,7),(22,10),(22,15),(18,17),(16,15),(18,12),(14,12),(12,15),(13,19),(19,20),(24,17)],
        }
        for s in (1,-1):
            pts = [(32+s*(x-32),y) for x,y in templates[horns]]
            P(ink,*pts)
            L(horn[1],*pts[:min(len(pts),8)],width=3)
            L(horn[3],*pts[1:5])
            for x,y in pts[2:5:2]: R(horn[4],x,y,1,1)
    if f.get('ears') or kind in {'imp','hellhound-kin','harpy','gargoyle'}:
        tall = 10 if kind == 'hellhound-kin' else 0
        for s in (1,-1):
            pts = [(32+s*(x-32),y) for x,y in [(22,31),(11,23-tall),(13,33),(19,40),(24,36)]]
            P(ink,*pts); P(skin[1],*pts[1:]); L(skin[3],*pts[1:3])
    left, right = 18-narrow, 44+narrow
    # Contrasting neck, collar and clasps.
    P(skin[0],(25,40),(38,41),(41,51),(35,55),(25,52))
    P(skin[1],(28,43),(36,43),(37,52),(29,52))
    P(coat[4],(21,50),(27,49),(32,55),(27,58))
    P(coat[3],(38,49),(44,50),(38,58),(33,55))
    if f.get('tie'):
        P(shade(f['tie'],11),(30,55),(35,55),(35,58),(37,63),(31,64),(29,62))
    if hidden:
        P(ink,(23,22),(36,18),(43,23),(46,35),(41,46),(33,51),(23,46),(19,36))
        L(hood[3] if hood else shade(bg,8),(20,32),(25,22),(32,19),(37,19))
        L(shade(bg,5),(42,29),(43,39),(36,49))
    else:
        # Faceted brow, temple, cheek and jaw with a hand-placed rim light.
        P(ink,(left,27),(left+3,19),(27,15),(38,16),(right-1,22),(right+1,32),
          (right-2,41),(38+narrow,48),(31,51),(24-narrow,48),(left+1,42),(left-2,34))
        P(skin[1],(left,28),(left+4,20),(28,16),(38,17),(right-2,22),(right,32),
          (right-3,41),(38+narrow,47),(31,50),(25-narrow,47),(left+2,41),(left-1,34))
        P(skin[2],(left,30),(left+4,21),(28,18),(38,19),(right-4,24),(right-4,31),
          (35,34),(38,40),(35,46),(30,48),(24-narrow,44),(left+1,36))
        P(skin[3],(left+3,29),(left+6,23),(27,20),(35,20),(39,25),(32,28),(29,34),(24,35),(left+2,37))
        P(skin[4],(left+5,24),(26,20),(33,20),(28,22),(24,22),(left+7,26))
        P(skin[1],(35,29),(41,28),(right-2,34),(right-3,40),(38,45),(40,37))
        L(skin[3],(left+2,36),(left+5,39),(26,39),(29,37),width=2)
        if kind == 'gargoyle':
            L(skin[0],(left+1,29),(left+6,30),(left+7,33))
            L(skin[0],(right-4,24),(right-4,28),(right-7,30))
        if skull:
            P(skin[0],(left+2,36),(23,38),(25,43),(22,46),(left+2,42))
            P(skin[0],(right-2,35),(40,38),(38,43),(40,46),(right-3,42))
            R(skin[4],26,42,12,4)
            for x in [27,30,33,36]: L(skin[0],(x,42),(x,46))
            L(skin[0],(26,44),(37,44))
        elif kind == 'hellhound-kin':
            P(skin[3],(24,34),(33,34),(40,39),(38,45),(31,46),(23,42))
            P(ink,(28,36),(38,36),(38,38),(34,40),(31,40))
            R(skin[4],29,36,4,1)
        elif kind == 'harpy':
            P(shade('gold',13),(25,36),(32,34),(40,37),(35,44),(31,45),(33,41))
            L(shade('wood',6),(27,39),(37,39),(34,43))
        else:
            P(skin[1],(32,30),(36,35),(36,38),(31,39),(29,37),(34,36))
            L(skin[4],(32,32),(31,35),(30,35),width=2)
    if f.get('hair') and not hidden:
        style = f.get('hairStyle','side')
        profiles = {
            'flat': [(17,28),(17,20),(22,15),(40,15),(44,19),(46,27),(39,23),(29,24),(24,22)],
            'spiky': [(16,30),(16,21),(14,14),(20,17),(22,9),(27,14),(32,8),(36,13),(41,10),(42,17),(46,14),(46,25),(42,29),(37,21),(30,24),(25,22)],
            'mohawk': [(18,24),(23,19),(27,15),(29,7),(34,5),(37,9),(38,14),(43,20),(45,25),(40,22),(34,22),(30,25),(25,23)],
            'bun': [(17,28),(17,21),(22,16),(26,14),(28,8),(35,7),(40,11),(40,15),(45,19),(46,28),(42,25),(36,20),(28,25),(23,26)],
            'messy': [(17,30),(15,22),(19,18),(17,14),(23,15),(28,11),(33,13),(39,11),(41,15),(45,15),(47,24),(44,29),(38,22),(34,26),(30,22),(26,27),(22,24)],
            'side': [(17,29),(17,21),(22,16),(30,13),(40,14),(46,20),(46,28),(42,25),(39,21),(35,20),(29,25),(24,27)],
        }
        path = profiles.get(style, profiles['side'])
        P(ink,*path)
        P(hair[1],*[(x, y+1) if y < 23 else (x,y-1) for x,y in path])
        L(hair[3],(19,23),(23,18),(29,16),(35,15),(40,17),width=2)
        L(hair[2],(21,25),(25,22),(31,21),(35,18),width=2)
        if f.get('long'):
            L(hair[3],(21,23),(19,29),(18,37),(17,43),width=2)
        if kind == 'harpy':
            L(hair[4],(26,19),(24,13),(22,11))
            L(hair[3],(39,20),(40,14),(44,11))
    if f.get('cap') or (not canonical and job in {'delivery imp','brimstone miner','projectionist','arcade technician'}):
        cap = tones(f.get('cap',outfit))
        P(ink,(16,25),(18,18),(23,14),(40,14),(46,18),(46,22),(51,24),(49,27),(22,27))
        P(cap[2],(17,24),(20,18),(24,15),(39,15),(44,18),(44,22),(49,24),(46,25),(21,25))
        L(cap[4],(19,21),(22,17),(28,16),(38,16))
        L(cap[0],(18,23),(26,23),(43,22),(48,24),width=2)
        if job=='brimstone miner':
            E('#322333',32,20,4,4); E('#e79644',32,20,3,3); R('#fff1c4',30,18,3,2)
    if f.get('hat'):
        h = tones([f['hat'][0], max(f['hat'][1], 6)])
        P(ink,(9,24),(13,21),(22,19),(26,12),(31,6),(39,4),(34,10),
          (39,17),(43,20),(51,20),(55,22),(51,26),(39,28),(18,28),(11,26))
        P(h[2],(11,24),(22,21),(27,13),(32,7),(37,5),(33,10),(38,18),(44,21),(53,22),(50,25),(41,27),(18,27))
        L(h[3],(23,21),(28,13),(32,7),(36,5))
        P(h[0],(13,24),(24,23),(38,24),(51,22),(52,23),(44,26),(19,26))
        L(shade('gold',10),(25,20),(34,20),(40,19),width=2)
        R('#eae2b0',32,18,3,3); R(h[0],33,19,1,1)
    if f.get('chef') or (not canonical and job == 'pizza cook'):
        P(ink,(18,24),(16,19),(17,13),(21,10),(26,11),(30,7),(35,7),(40,10),
          (45,11),(48,16),(46,22),(44,26),(22,26))
        P('#aba1a3',(19,23),(17,17),(20,12),(27,13),(30,9),(35,9),(39,12),(44,12),(46,17),(44,23),(40,25),(22,25))
        P('#f7dfc0',(19,17),(22,13),(27,15),(30,10),(34,10),(38,14),(44,14),(45,17),(41,20),(23,20))
        L('#fff4d6',(21,21),(28,21),(38,20),(44,21),width=2)
    if f.get('crown') and not p.get('king'):
        P(ink,(19,20),(26,21),(32,17),(38,21),(46,19),(43,25),(23,25))
        L(shade('gold',11),(20,21),(26,23),(32,19),(38,23),(44,21),width=2)
        R(shade(eye,14),31,20,2,2)
    if f.get('crown') and p.get('king'):
        crown_hi, crown_low = shade('gold',14), shade('gold',7)
        P(ink,(18,12),(24,15),(27,9),(32,13),(38,6),(41,13),(48,10),(44,23),(23,23))
        P(crown_low,(19,13),(25,17),(27,11),(32,15),(38,8),(41,15),(47,12),(43,22),(24,22))
        L(crown_hi,(21,14),(25,17),(27,12),(32,16),(38,9),(41,16),(46,13))
        L(shade('gold',12),(23,20),(31,21),(43,20))
        jewel = shade(bg,14)
        R(jewel,35,16,3,3)
        marks = {
            'pride': ['.#.','###','.#.'],
            'greed': ['.#.','#.#','.#.'],
            'lust': ['#.#','###','.#.'],
            'envy': ['###','#.#','###'],
            'gluttony': ['#..','###','..#'],
            'wrath': ['..#','.#.','#..'],
            'sloth': ['##.','#..','##.'],
        }
        for i, row in enumerate(marks[p['king']]):
            for j, dot in enumerate(row):
                if dot == '#':
                    R(BONE,35+j,16+i,1,1)
    if f.get('beard') and not hidden:
        b = tones(f['beard'])
        P(b[0],(left+2,37),(26,42),(31,40),(38,42),(right-4,36),(right-3,44),(36,52),(31,55),(24,51),(left+1,43))
        P(b[2],(left+4,40),(26,44),(30,42),(39,43),(40,41),(38,47),(34,52),(30,53),(24,49))
        L(b[3],(23,44),(26,49),(30,51),width=2)
    mouth = f.get('mouth','flat')
    if not skull and not hidden and kind not in {'harpy','hellhound-kin'}:
        mouthY = 42
        if f.get('mustache'):
            P(hair[0],(23,41),(27,38),(31,39),(34,38),(40,41),(37,42),(31,41),(26,43))
        elif mouth in {'grin','fangs','open'}:
            P(ink,(25,41),(36,41),(39,39),(38,44),(34,47),(29,46))
            if mouth != 'open':
                L('#f7dbad',(27,42),(33,43),(37,41))
                if mouth=='fangs':
                    R(BONE,27,43,2,2); R(BONE,35,43,1,2)
        else:
            ey = -2 if mouth in {'smile','smirk'} else 0
            L(skin[0],(27,mouthY + (ey if mouth=='smile' else 0)),(29,mouthY+1),
              (35,mouthY+1),(38,mouthY+ey))
            L(skin[3],(30,45),(34,45))
    # Eye silhouettes, lashes, sockets, brow gestures and glints stay readable at 40 CSS px.
    if skull:
        for x,y in [(25,31),(38,31)]:
            E(ink,x,y,5,4)
            R(skin[3],x-3,y-5,6,1)
        P(ink,(30,36),(32,34),(34,36),(33,39),(30,39))
    eyeset = [(24,31,6),(37,30,5)]
    for x,y,w in eyeset:
        if f.get('glasses') != 'shades':
            inc = 1 if p.get('temper',.5) > .65 else -1 if p.get('warmth',.5) > .66 else 0
            if not hidden and not skull:
                L(skin[0],(x-3,y-3-inc),(x+1,y-4),(x+3,y-3+inc),width=1 if pron=='she' else 2)
                P(ink,(x-4,y-1),(x+2,y-2),(x+4,y-1),(x+2,y+2),(x-2,y+2))
            R(eyes[1],x-2,y,w-2,2)
            R(eyes[3],x-1,y,2,1 if skull else 2)
            if not skull and not hidden:
                R(ink,x+1,y,1,2)
                if pron=='she' or kind=='succubus':
                    L(ink,(x-5,y-2),(x-3,y),(x-1,y))
    if f.get('glasses') and not hidden:
        if f['glasses']=='shades':
            P(ink,(18,28),(29,28),(31,30),(34,30),(43,27),(45,30),(42,34),(35,35),(32,32),(29,32),(27,35),(21,35))
            L(shade(bg,9),(20,29),(27,29),(28,30))
            L(shade(bg,9),(35,30),(41,28))
        else:
            for x,y in [(24,31),(37,30)]:
                L(jewelry,(x-3,y-3),(x+2,y-3),(x+4,y-1),(x+4,y+2),(x+2,y+4),(x-3,y+4),(x-5,y+2),(x-5,y-1),(x-3,y-3))
            L(jewelry,(28,30),(32,30))
    if f.get('scar') and not hidden:
        L(skin[0],(23,30),(24,33),(21,36),(20,39))
        L(shade('crimson',10),(22,34),(21,37),(20,38))
    if f.get('freckles') or f.get('blush'):
        for x,y in [(22,37),(24,36),(26,37),(38,35),(40,35)]:
            if not hidden: R(skin[0] if f.get('freckles') else shade('vex',9),x,y,1,1)
    if f.get('thirdEye'):
        E(ink,31,25,4,2)
        R(eyes[3],30,24,2,2)
    if f.get('earring') or (not hidden and not skull and rng.random() < (.36 if pron=='she' else .16)):
        R(INK,right-1,36,3,5); L(jewelry,(right,36),(right+1,38),(right,40))
        R(BONE,right,37,1,1)
    # A distinct job accessory, lapel clasp, or guild pin.
    if p.get('king'):
        poly(d, shade(bg,11),(14,56),(17,53),(20,56),(17,59))
        d.point((17,55),fill=BONE)
    elif job in {'paralegal','judgement clerk','soul sorter','stockbroker','librarian','forum moderator',
                 'Hellnet engineer','mall clerk','potion apprentice','night-market cook','gravedigger'}:
        bx = 14 if turn > 0 else 47
        rect(d,bx,54,5,5,INK)
        rect(d,bx+1,55,3,3,shade('soul' if job=='Hellnet engineer' else 'gold',11))
        d.point((bx+2,56),fill=BONE)
    elif f.get('scarf'):
        L(shade('vex',12),(16,54),(22,57),(32,58),(42,57),(48,54),width=2)
    elif kind in {'lich','wraith','banshee'}:
        sparkle(d,11,38,shade(eye,12),2)
        sparkle(d,51,38,shade(eye,9),1)
    mask = Image.new('L',(SIZE,SIZE))
    ImageDraw.Draw(mask).ellipse((1,1,62,62),fill=255)
    canvas.putalpha(mask)
    return canvas

ICONS = {
    'calls': ('serpent','Bone handset'),
    'pacts': ('crimson','Wax-sealed contract'),
    'souls': ('vex','Enchanted skull'),
    'pyrecam': ('ember','Fire lens camera'),
    'relics': ('gold','Cursed picture frame'),
    'brimstone': ('ember','Molten globe'),
    'lament': ('plum','Cursed vinyl record'),
    'doomclock': ('blood','Blood-moon clock'),
    'dates': ('vex','Torn infernal calendar'),
    'hellscape': ('serpent','Crossroads map'),
    'abyss': ('slate','Abyssal folder'),
    'scribe': ('wood','Cinder quill'),
    'abacus': ('gold','Hellforged calculator'),
    'omens': ('soul','Eclipsed sun and storm'),
    'rites': ('ash','Forged ritual gear'),
    'hellplay': ('crimson','Infernal shop bag'),
    'census': ('soul','Three resident skulls'),
    'grimoire': ('void','Spellbound book'),
    'almanac': ('gold','Seasonal hourglass'),
    'serpent': ('bile','Serpent and forbidden fruit'),
    'hellmines': ('ember','Spiked brimstone mine'),
    'damned2048': ('gold','Ascending cursed tiles'),
    'soulflap': ('vex','Ember-eyed bat'),
    'brimblocks': ('blood','Molten falling blocks'),
    'paint': ('vex','Blood-ink brush'),
    'torch': ('ember','Hellfire torch'),
    'whispers': ('soul','Spectral microphone'),
    'ouija': ('wood','Bone planchette'),
}

def app_icon(key):
    ramp, _ = ICONS[key]
    img = Image.new('RGBA', (SIZE,SIZE))
    d = ImageDraw.Draw(img)
    backdrop(d,ramp,random.Random(key),plate=True)
    dark, dim, mid, lit, hot = (shade(ramp,i) for i in (1,6,9,12,15))
    red, fire, brass, teal = '#e74a53','#ffac65','#ddac69','#8edacb'
    shadow = '#110a19'
    def p(c,*pts): poly(d,c,*pts)
    def l(c,*pts,width=1): line(d,c,*pts,width=width)
    def r(c,x,y,w,h): rect(d,x,y,w,h,c)
    def o(c,x,y,rad): orb(d,x,y,rad,c)
    def a(c,bounds,start,end,w=2): d.arc(bounds,start,end,fill=c,width=w)
    def skull(x,y,small=False):
        if small:
            p(shadow,(x-8,y-4),(x-4,y-8),(x+4,y-8),(x+8,y-4),(x+8,y+4),
              (x+4,y+6),(x+4,y+9),(x-4,y+9),(x-4,y+6),(x-8,y+4))
            r(lit,x-6,y-5,13,10); r(mid,x-4,y+4,9,4)
            r(shadow,x-5,y-1,4,3); r(shadow,x+2,y-1,4,3)
            r(hot,x-4,y-5,6,1)
            return
        p(shadow,(13,39),(12,27),(17,18),(25,14),(40,15),(49,22),(51,35),(47,42),
          (42,44),(41,50),(23,50),(22,44),(17,43))
        p(mid,(15,37),(14,28),(19,20),(26,16),(39,17),(47,23),(49,34),(45,40),
          (40,42),(39,48),(24,48),(23,42),(18,41))
        p(lit,(15,31),(17,23),(26,17),(38,18),(43,22),(39,25),(26,25),(21,29),(21,37),(17,39))
        l(hot,(19,23),(25,19),(31,19),(34,18),width=2)
        for x0 in (18,35):
            p(shadow,(x0,30),(x0+8,28),(x0+11,31),(x0+10,36),(x0+5,38),(x0+1,36))
            r(red,x0+4,32,3,2); r('#fff6a2',x0+4,32,1,1)
        p(shadow,(29,39),(32,35),(34,39),(32,41))
        for x0 in (27,32,37): r(shadow,x0,44,1,5)
    def flame(x,y):
        p(shadow,(x-10,y+3),(x-11,y-4),(x-5,y-11),(x-3,y-18),(x+2,y-12),
          (x+3,y-7),(x+8,y-11),(x+8,y-4),(x+11,y),(x+6,y+6),(x-5,y+7))
        p(red,(x-9,y+2),(x-9,y-4),(x-4,y-10),(x-3,y-16),(x+1,y-10),
          (x+1,y-5),(x+7,y-8),(x+6,y-2),(x+9,y),(x+4,y+5),(x-5,y+5))
        p(fire,(x-5,y+3),(x-7,y),(x-2,y-6),(x-1,y-10),(x+2,y-2),(x+5,y-4),(x+6,y+1),(x+3,y+4))
        p(BONE,(x-3,y+2),(x,y-4),(x+3,y+1),(x+2,y+3))
    def paper(x,y,w,h):
        p(shadow,(x,y),(x+w-7,y),(x+w,y+7),(x+w,y+h),(x,y+h))
        p(brass,(x+2,y+2),(x+w-8,y+2),(x+w-2,y+8),(x+w-2,y+h-2),(x+2,y+h-2))
        p('#f6d4a2',(x+3,y+3),(x+w-9,y+3),(x+w-9,y+9),(x+w-3,y+9),(x+w-3,y+h-5),(x+3,y+h-6))
        l(BONE,(x+4,y+4),(x+w-10,y+4))
        for xx in range(y+13,y+h-5,4): l('#885a5e',(x+6,xx),(x+w-7-(xx%3),xx))
    def tile(x,y,n,c):
        r(shadow,x-1,y-1,n+2,n+2); r(c,x,y,n,n)
        l(lit,(x,y+n-2),(x,y),(x+n-1,y))
        l(dark,(x+1,y+n-1),(x+n-1,y+n-1),(x+n-1,y+1))
        r(hot,x+2,y+2,2,2); r(mid,x+n-4,y+n-4,2,2)
    if key=='calls':
        shape = [(16,16),(22,14),(30,24),(26,30),(31,36),(37,39),(43,35),
                 (51,42),(48,49),(41,52),(30,48),(20,40),(13,30),(12,22)]
        p(shadow,*shape)
        p(teal,(16,18),(22,16),(28,24),(24,29),(29,36),(37,42),(43,37),(49,42),
          (47,47),(41,50),(31,46),(22,39),(15,29),(14,22))
        l(BONE,(16,23),(18,18),(21,17),(26,23),width=2)
        l(lit,(19,30),(26,40),(33,45),(40,47),width=2)
        l(BONE,(38,42),(43,39),(47,42),width=2)
        a(teal,(27,11,48,34),268,355); a(hot,(34,13,52,31),270,356)
    elif key=='pacts':
        paper(15,11,32,41)
        o(shadow,41,43,9); o(red,41,42,7); o('#9b2442',41,43,5)
        p(red,(36,46),(35,55),(41,51),(45,54),(46,47))
        l(hot,(38,42),(41,39),(44,42),(41,45),(38,42))
    elif key=='souls':
        p(lit,(20,23),(15,17),(15,11),(22,16),(26,20))
        p(mid,(38,20),(46,14),(49,11),(48,23),(43,26))
        skull(32,32)
    elif key=='pyrecam':
        p(shadow,(11,23),(20,23),(23,17),(40,17),(44,23),(51,23),(53,27),(53,46),(49,50),(14,50),(10,46),(10,27))
        p(mid,(13,25),(21,25),(24,19),(39,19),(43,25),(50,25),(51,28),(51,45),(48,48),(15,48),(12,45),(12,28))
        l(lit,(13,29),(16,26),(23,26),(25,20),(37,20),width=2)
        r(BONE,43,27,5,3); r(dim,14,34,6,9)
        o(shadow,32,35,13); o(brass,32,35,11); o(dark,32,35,8)
        p(red,(26,38),(27,31),(31,26),(32,34),(37,30),(39,37),(36,42),(29,42))
        p(hot,(30,39),(32,34),(35,38),(34,41),(31,41)); r(BONE,27,30,2,2)
    elif key=='relics':
        r(shadow,12,15,41,36); r(brass,13,16,39,33); r(dark,17,20,31,25)
        l(BONE,(14,47),(14,17),(50,17)); l(dim,(16,48),(51,48),(51,19))
        o(fire,39,26,4)
        p(mid,(18,43),(18,40),(27,28),(37,40),(43,34),(47,40),(47,43))
        p(lit,(24,32),(27,28),(30,33),(27,32))
        for x,y in [(15,18),(48,18),(15,46),(48,46)]: r(hot,x,y,3,2)
    elif key=='brimstone':
        o(shadow,32,32,21); o(red,32,31,18); o(dim,32,31,16)
        p(mid,(19,25),(23,19),(30,17),(33,23),(27,25),(30,29),(27,34),(24,32),(21,33))
        p(fire,(37,24),(44,24),(46,30),(40,32),(41,39),(35,45),(31,39),(35,33),(31,30))
        d.ellipse((24,13,40,49),outline=lit,width=1)
        a(lit,(15,22,49,41),4,175); a(hot,(15,14,49,48),180,292)
        l(BONE,(12,46),(23,42),(38,37),(52,29),width=2)
        sparkle(d,48,17,BONE)
    elif key=='lament':
        o(shadow,30,32,20); o(mid,30,31,18); o(dark,30,31,16)
        for k in (7,11,14): a(dim,(30-k,31-k,30+k,31+k),144,308,1)
        o(lit,30,31,7); o(mid,30,31,5); o(BONE,30,31,1)
        p(BONE,(49,14),(53,15),(51,29),(44,38),(41,37),(46,29))
        r(red,41,37,5,4); a(hot,(12,13,48,49),192,278,1)
    elif key=='doomclock':
        o(shadow,32,34,21); o(dim,32,33,19); o(lit,32,33,17); o(dark,32,33,15)
        p(red,(23,24),(27,21),(33,20),(31,25),(30,30),(24,35),(20,35),(19,30))
        for x,y in [(32,20),(45,33),(32,46),(19,33)]: r(hot,x-1,y-1,3,2)
        l(BONE,(31,24),(31,33),(40,37),width=3); o(fire,31,33,2)
        p(brass,(13,19),(14,14),(20,11),(25,11),(23,15),(17,19))
        p(brass,(41,12),(46,11),(51,15),(52,20),(47,18))
    elif key=='dates':
        r(shadow,12,15,40,36); r(brass,14,17,36,30); r('#e6b3a3',15,24,34,22); r(red,14,17,36,8)
        l(hot,(16,18),(48,18))
        for x in (21,40):
            r(shadow,x,12,4,10); r(BONE,x+1,12,2,7)
        for y in (29,35,41):
            for x in (18,25,32,39): r('#a75871',x,y,4,2)
        r(shadow,31,33,8,7); r(hot,33,35,4,3)
        p(BONE,(41,45),(49,40),(49,46),(42,47))
    elif key=='hellscape':
        p(shadow,(10,19),(24,13),(37,17),(53,12),(54,45),(38,51),(24,47),(11,52))
        p(mid,(12,20),(24,15),(37,19),(51,15),(52,44),(38,49),(24,45),(13,50))
        p('#78b194',(12,21),(24,16),(24,44),(13,49))
        p(dim,(38,19),(50,16),(51,43),(38,47))
        l(BONE,(16,40),(24,35),(29,37),(37,30),(46,30),width=2)
        p(shadow,(36,15),(42,15),(47,19),(48,24),(44,30),(39,36),(37,32),(32,24),(32,19))
        p(red,(36,17),(42,17),(45,20),(45,24),(39,33),(34,24),(34,20)); o(BONE,39,21,2)
    elif key=='abyss':
        p(shadow,(10,22),(10,17),(14,14),(28,14),(33,19),(48,19),(51,22),(51,29),(55,29),(50,49),(14,49))
        p(mid,(12,20),(14,16),(27,16),(32,21),(47,21),(49,23),(49,39),(14,39))
        p(dim,(13,27),(50,25),(54,29),(49,47),(15,47))
        p(lit,(15,28),(50,27),(51,31),(21,35),(15,46))
        l(hot,(17,28),(49,28))
        p(shadow,(25,36),(34,32),(43,36),(34,43))
        p(teal,(29,36),(34,34),(39,36),(34,40)); r(dark,33,35,2,4)
    elif key=='scribe':
        paper(14,16,28,35)
        p(shadow,(22,48),(28,37),(31,27),(40,17),(54,11),(54,17),(47,30),(36,36))
        p(red,(27,43),(31,34),(32,27),(41,18),(52,13),(50,21),(45,29),(35,35))
        p(fire,(32,34),(34,25),(41,19),(51,14),(47,24),(42,28))
        l(BONE,(25,47),(32,36),(43,23),(51,14),width=2)
    elif key=='abacus':
        p(shadow,(14,15),(19,11),(45,11),(50,15),(50,51),(45,54),(18,54),(14,50))
        r(mid,16,15,32,35); l(hot,(16,47),(16,16),(19,13),(45,13))
        r(dark,19,18,25,11); r(teal,22,21,19,5)
        for x in (21,29,37):
            for y in (33,41): r(dark,x,y,6,6); r(brass,x+1,y,4,4)
        r(red,38,41,4,4); r(BONE,24,22,10,1)
    elif key=='omens':
        for x,y in [(29,12),(16,20),(43,20),(12,31),(48,29),(29,34)]:
            sparkle(d,x,y,fire,2)
        o(shadow,29,25,12); o(fire,29,25,10); o(dark,34,22,8); a(BONE,(19,15,39,35),155,280,2)
        p(shadow,(11,42),(15,35),(20,35),(24,31),(32,31),(38,36),(46,36),(52,41),(49,47),(14,47))
        p(mid,(13,42),(17,37),(22,37),(25,33),(32,33),(38,38),(46,38),(50,41),(48,45),(15,45))
        l(hot,(16,40),(23,38),(26,35),(32,35),(37,39),width=2)
        p(fire,(31,40),(39,40),(34,46),(38,46),(28,54),(30,48),(26,48))
    elif key=='rites':
        from math import cos, sin, tau
        gear = [(32+round((20 if i%4 in (1,2) else 16)*cos(i*tau/32)),32+round((20 if i%4 in (1,2) else 16)*sin(i*tau/32))) for i in range(32)]
        p(shadow,*gear)
        p(mid,*[(32+round((x-32)*.91),32+round((y-32)*.91)) for x,y in gear])
        l(hot,*gear[16:25],width=2)
        o(dim,32,32,13); o(shadow,32,32,10)
        p(red,(25,31),(32,24),(39,31),(32,40)); p(fire,(28,31),(32,26),(35,31),(32,35))
        r(BONE,31,29,2,2)
    elif key=='hellplay':
        a(brass,(23,11,40,36),180,360,3)
        p(shadow,(14,23),(49,23),(52,49),(46,52),(16,51),(11,48))
        p(red,(16,25),(47,25),(50,48),(45,50),(17,49),(13,47))
        p(mid,(18,25),(46,25),(47,28),(15,30)); l(hot,(15,29),(17,25),(44,25))
        p(BONE,(28,31),(41,37),(28,44)); p(fire,(30,34),(37,37),(30,41))
    elif key=='census':
        skull(19,29,True); skull(45,29,True); skull(32,38,True)
        l(teal,(14,47),(21,50),(43,50),(50,47),width=2)
        sparkle(d,32,16,BONE)
    elif key=='grimoire':
        p(shadow,(10,20),(23,14),(32,18),(41,14),(52,18),(52,45),(41,45),(32,52),(21,47),(10,47))
        p(lit,(12,20),(23,16),(32,21),(42,16),(50,19),(50,43),(41,43),(32,49),(21,45),(12,45))
        p(dim,(13,22),(23,18),(31,22),(31,46),(22,42),(13,43))
        p(mid,(33,22),(42,18),(49,20),(49,41),(42,41),(33,46))
        l(BONE,(32,22),(32,47)); l(hot,(15,24),(22,21),(28,24))
        for y in (28,32,36): l(lit,(16,y),(22,y-2),(28,y))
        p(hot,(39,24),(46,30),(40,36),(35,30)); p(shadow,(39,27),(44,30),(40,33),(37,30))
        p(red,(41,41),(45,40),(45,52),(43,49),(41,52))
    elif key=='almanac':
        p(shadow,(17,12),(47,12),(47,19),(44,20),(42,25),(35,31),(42,38),(44,45),(47,46),(47,52),(17,52),(17,46),(20,45),(22,38),(29,31),(22,25),(20,19),(17,19))
        p(teal,(22,18),(42,18),(39,24),(33,29),(33,34),(39,39),(42,46),(22,46),(25,39),(31,34),(31,29),(25,24))
        p(dim,(25,21),(39,21),(35,25),(32,28),(27,24))
        p(brass,(24,44),(32,38),(39,44)); r(BONE,31,31,2,8)
        for y in (13,46): r(brass,19,y,26,5); l(hot,(20,y),(43,y))
    elif key=='serpent':
        path = [(15,39),(18,44),(31,45),(42,41),(45,34),(41,29),(33,30),(26,34),(19,32),(17,27),(21,21),(29,19),(37,19)]
        l(shadow,*path,width=10); l(mid,*path,width=7); l(lit,*[(x,y-2) for x,y in path],width=2)
        p(shadow,(30,16),(39,13),(48,17),(49,22),(44,26),(35,25),(30,22))
        p(teal,(32,17),(39,15),(46,17),(47,21),(44,24),(35,23),(32,22))
        r(shadow,40,17,3,3); r(BONE,40,17,1,1)
        o(red,49,46,5); l(BONE,(49,42),(50,38))
        l(lit,(45,40),(49,39),(47,37))
    elif key=='hellmines':
        for x,y,u,v in [(32,12,32,24),(46,17,40,25),(52,31,42,31),(50,46,42,40),(33,52,33,43),(15,46,22,39),(11,32,22,32),(16,17,24,24)]:
            l(shadow,(x,y),(u,v),width=7); l(lit,(x,y),(u,v),width=3)
        o(shadow,32,32,15); o(dim,32,32,13)
        p(mid,(21,26),(27,21),(38,21),(44,30),(42,38),(35,43),(24,39),(19,32))
        l(lit,(22,31),(24,26),(28,23),(34,23),width=2)
        o(red,33,33,7); o(fire,32,32,4); o(BONE,31,31,2)
    elif key=='damned2048':
        tile(13,31,14,dim); tile(29,30,18,mid); tile(18,15,14,brass)
        p(shadow,(33,37),(35,33),(40,35),(44,32),(44,41),(34,42))
        l(BONE,(34,36),(37,38),(40,35),(43,36)); l(lit,(34,41),(44,41))
        sparkle(d,45,18,BONE,3)
    elif key=='soulflap':
        p(shadow,(9,17),(17,20),(23,29),(27,24),(28,16),(32,21),(36,16),(38,26),(41,28),(48,20),(55,17),(54,33),(51,42),(47,39),(43,44),(39,42),(34,49),(30,49),(25,43),(20,45),(16,40),(12,42))
        p(mid,(11,19),(17,22),(23,32),(28,26),(29,19),(32,24),(36,19),(37,27),(41,32),(48,23),(53,20),(51,36),(47,36),(43,41),(38,39),(34,46),(30,47),(25,40),(20,42),(16,37),(13,39))
        l(lit,(13,22),(20,29),(24,37)); l(lit,(50,24),(43,30),(40,37))
        p(dim,(29,28),(35,27),(40,34),(35,43),(29,43),(24,34))
        r(red,26,32,4,2); r(red,34,32,4,2); r(BONE,27,32,1,1); r(BONE,35,32,1,1)
    elif key=='brimblocks':
        for x,y in [(16,16),(16,27),(27,27),(38,27)]: tile(x,y,11,red)
        for x,y in [(26,43),(37,43)]: tile(x,y,10,fire)
        l(lit,(22,41),(22,49)); l(fire,(15,39),(15,46))
    elif key=='paint':
        o(shadow,27,35,16); o(mid,27,35,14)
        for x,y,c in [(20,28,BONE),(28,25,red),(18,37,teal),(25,44,fire)]:
            o(shadow,x,y,3); o(c,x,y-1,2)
        o(dark,34,32,4)
        p(shadow,(25,48),(28,39),(34,36),(39,26),(49,13),(53,12),(54,16),(47,27),(39,38),(38,44),(33,49))
        p(brass,(32,42),(37,33),(49,15),(52,14),(51,17),(41,32),(36,42))
        l(BONE,(38,34),(49,17),width=2)
        p(red,(26,48),(29,41),(34,39),(38,41),(35,46),(31,48))
        l(hot,(28,47),(32,44),(35,44))
    elif key=='torch':
        p(shadow,(20,35),(43,35),(40,42),(36,45),(35,53),(28,53),(27,44),(23,41))
        p(brass,(22,36),(41,36),(38,41),(34,43),(33,51),(30,51),(29,43),(25,40))
        l(BONE,(24,37),(38,37)); r(dim,29,44,6,3)
        flame(32,29)
        sparkle(d,14,23,fire); sparkle(d,48,19,BONE)
    elif key=='whispers':
        p(shadow,(24,18),(28,13),(36,13),(40,17),(42,33),(39,39),(25,39),(21,34),(21,22))
        p(teal,(25,18),(29,15),(36,15),(39,18),(40,32),(37,37),(26,37),(23,33),(23,22))
        l(BONE,(25,23),(27,18),(32,16),width=2)
        for y in (23,27,31): l(dark,(26,y),(37,y),width=2)
        l(lit,(18,30),(18,37),(24,43),(38,43),(45,37),(45,30),width=3)
        l(hot,(32,43),(32,50),width=3); l(mid,(24,50),(40,50),width=3)
        l(teal,(12,25),(12,31)); l(teal,(51,25),(51,31))
    elif key=='ouija':
        p(shadow,(31,12),(36,14),(44,23),(52,40),(49,47),(41,51),(22,51),(13,46),(11,40),(20,24))
        p(brass,(31,14),(35,16),(42,24),(49,40),(47,45),(40,49),(23,49),(16,45),(13,40),(22,25))
        p(BONE,(15,39),(23,24),(30,16),(34,17),(39,23),(30,24),(24,32),(22,40))
        o(shadow,32,33,9); o(dim,32,33,7); o(teal,32,33,5); o(BONE,31,32,2)
        l(dim,(20,43),(26,46),(40,46),(45,42),width=2)
        sparkle(d,49,19,hot,2)
    return img

SCENERY_MASK = Image.new('L',(SIZE,SIZE))
ImageDraw.Draw(SCENERY_MASK).ellipse((3,3,59,59),fill=87)

def load_scenery():
    source = ROOT / 'tools' / 'portrait-backdrop-atlas.png'
    if not source.exists():
        return None
    with Image.open(source) as atlas:
        width, height = atlas.size
        return [atlas.crop((x*width//4,y*height//4,(x+1)*width//4,(y+1)*height//4))
                .convert('RGBA').resize((SIZE,SIZE),Image.Resampling.NEAREST)
                for y in range(4) for x in range(4)]

def resident_slug(name):
    return re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')

def read_registries():
    result = subprocess.check_output(['node',ROOT / 'tools' / 'read_pixel_roster.cjs'],text=True)
    return json.loads(result)

def main():
    data = read_registries()
    residents = data['residents']
    extras = [
        dict(cid='c_hotline',name='Hell Hotline',kind='service',pron=None),
        dict(cid='player_default',name='Default Player',kind='player',pron=None),
    ]
    art_index = {'avatars': {}, 'icons': {}}
    scenery = load_scenery()
    for folder in ('avatars','icons'):
        (ART / folder).mkdir(parents=True,exist_ok=True)
    resident_rows, app_rows = [], []
    portrait_hashes = set()
    for p in residents + extras:
        cid = p['cid']
        file = f"art/avatars/{cid}--{resident_slug(p['name'])}.png"
        pic = portrait(p,scenery)
        digest = hashlib.sha256(pic.tobytes()).digest()
        assert digest not in portrait_hashes, f'Duplicate portrait: {cid}'
        portrait_hashes.add(digest)
        pic.save(WWW / file,optimize=True)
        art_index['avatars'][cid] = file
        pronouns = {'she':'she/her','he':'he/him','they':'they/them'}.get(p['pron'],'')
        resident_rows.append(dict(resident_id=p.get('id'), contact_id=cid, display_name=p['name'],
                                  pronouns=pronouns, kind=p['kind'], circle=p.get('circleName',''),
                                  job=p.get('job',''), role='sin king' if p.get('king') else p['kind'] if p in extras else 'resident',
                                  asset_path=file))
    assert set(ICONS) == {a['id'] for a in data['apps']}, 'App registry and icon designs differ'
    for app in data['apps']:
        app_id = app['id']
        file = f'art/icons/app--{app_id}.png'
        app_icon(app_id).save(WWW / file,optimize=True)
        art_index['icons'][app_id] = file
        app_rows.append(dict(app_id=app_id, display_name=app['name'], group=app['source'],
                             motif=ICONS[app_id][1], asset_path=file))
    for name, rows in [('residents',resident_rows),('apps',app_rows)]:
        with (ART / f'{name}.csv').open('w',encoding='utf-8',newline='') as stream:
            writer = csv.DictWriter(stream,fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    manifest = json.dumps(art_index,ensure_ascii=False,indent=2)
    (ART / 'manifest.json').write_text(manifest+'\n',encoding='utf-8')
    (ART / 'asset-index.js').write_text('/* Generated by tools/export_pixel_pack.py. */\nwindow.HellOSPixelAssets = '+manifest+';\n',encoding='utf-8')
    gallery = {
        'residents': [{k: r[k] for k in ('contact_id','display_name','pronouns','kind','circle','job','role')}
                      for r in resident_rows],
        'apps': [{k: r[k] for k in ('app_id','display_name','group','motif')} for r in app_rows],
    }
    (ART / 'gallery-data.js').write_text(
        '/* Generated by tools/export_pixel_pack.py. */\nwindow.HellOSGallery = '
        + json.dumps(gallery,ensure_ascii=False,separators=(',',':')) + ';\n',encoding='utf-8')
    print(f'Wrote {len(residents)} resident portraits, {len(extras)} auxiliary portraits and {len(app_rows)} app icons.')

if __name__ == '__main__':
    main()
