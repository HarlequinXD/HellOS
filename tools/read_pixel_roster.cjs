/* Read the same resident and phone app registries the Android WebView loads. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const www = path.resolve(__dirname, '../app/src/main/assets/www');
const apps = Object.create(null);
const context = vm.createContext({
  OS: {
    register(app) {
      if (apps[app.id]) throw new Error('Duplicate app ID: ' + app.id);
      apps[app.id] = app;
    },
    onTick() {},
  },
  Store: { on() {}, get() { return true; } },
  setInterval() {},
});
context.window = context;

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(www, file), 'utf8'), context, { filename: file });
}

load('js/core/util.js');
load('js/core/helltime.js');
load('js/core/residents.js');

const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
for (const [, script] of html.matchAll(/<script src="(js\/(?:apps|store)\/[^"]+\.js)"><\/script>/g)) {
  load(script);
}

const { all, CIRCLES } = context.Residents;
const residents = all.map(p => ({
  id: p.id, cid: p.cid, name: p.name, kind: p.kind, pron: p.pron, king: p.king,
  circle: p.circle, circleName: CIRCLES[p.circle], job: p.job.title,
  jobKey: p.job.title, face: p.face, warmth: p.traits.warmth, temper: p.traits.temper,
  quirk: p.lore.quirk,
}));
const appList = Object.values(apps).map(a => ({ id: a.id, name: a.name, source: a.store ? 'HellPlay' : 'System' }));
process.stdout.write(JSON.stringify({ residents, apps: appList }));
