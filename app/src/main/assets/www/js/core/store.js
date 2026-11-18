/* HellOS persistent storage: localStorage for state, IndexedDB for media blobs. */
(function () {
  'use strict';
  const PFX = 'hellos.';
  const cache = {};

  const DEFAULT_SETTINGS = {
    name: 'Damned Soul',
    email: '',
    language: 'English (Australia)',
    accent: '#FF5A2A',
    wallpaper: 'lava',
    wallpaperPhoto: null,
    brightness: 0.8,
    autoBrightness: false,
    volume: 0.7,
    ringVolume: 0.8,
    vibrate: true,
    touchSounds: true,
    ringtone: 'choir',
    notifSound: 'bell',
    alarmSound: 'klaxon',
    lockType: 'none',
    pin: '',
    seal: false,
    fontScale: 1,
    navMode: 'gestures',
    time24: false,
    hellnet: true,
    hellnetName: 'Hellnet 666',
    bonelink: true,
    silence: false,
    descent: false,
    emberSaver: false,
    watched: true,
    rotate: false,
    confess: false,
    backup: true,
    screenTimeout: 0,
    lockOnLeave: true,
    showNotifsOnLock: true,
    souls: 66,
    homeApps: null,
    deviceName: 'HellOS Phone'
  };

  const Store = {
    get(key, def) {
      if (key in cache) return cache[key];
      let v = def;
      try {
        const raw = localStorage.getItem(PFX + key);
        if (raw != null) v = JSON.parse(raw);
      } catch (e) { /* corrupted → default */ }
      cache[key] = v;
      return v;
    },
    set(key, value) {
      cache[key] = value;
      try { localStorage.setItem(PFX + key, JSON.stringify(value)); }
      catch (e) { console.warn('Storage full', e); if (window.OS && OS.toast) OS.toast('Soul vault is full'); }
      Store.emit(key, value);
      return value;
    },
    update(key, def, fn) {
      const v = Store.get(key, def);
      const r = fn(v);
      return Store.set(key, r === undefined ? v : r);
    },
    remove(key) { delete cache[key]; localStorage.removeItem(PFX + key); Store.emit(key, undefined); },
    settings() {
      const s = Store.get('settings', null);
      if (!s) return Object.assign({}, DEFAULT_SETTINGS);
      return Object.assign({}, DEFAULT_SETTINGS, s);
    },
    setting(k, v) {
      const s = Store.settings();
      s[k] = v;
      Store.set('settings', s);
      Store.emit('setting:' + k, v);
      return v;
    },
    defaults: DEFAULT_SETTINGS,
    usedBytes() {
      let n = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PFX)) n += (localStorage.getItem(k) || '').length * 2;
      }
      return n;
    },
    async wipe() {
      Object.keys(cache).forEach(k => delete cache[k]);
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PFX)) keys.push(k); }
      keys.forEach(k => localStorage.removeItem(k));
      await Blobs.clear();
    },
    // tiny event bus
    _subs: {},
    on(key, fn) { (Store._subs[key] = Store._subs[key] || []).push(fn); return () => Store.off(key, fn); },
    off(key, fn) { const a = Store._subs[key]; if (a) Store._subs[key] = a.filter(f => f !== fn); },
    emit(key, v) { (Store._subs[key] || []).slice().forEach(f => { try { f(v); } catch (e) { console.error(e); } }); }
  };

  // ---------- IndexedDB blob store (photos, recordings, drawings) ----------
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('no idb')); return; }
      const r = indexedDB.open('hellos-media', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('media', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction('media', mode);
      const st = t.objectStore('media');
      const out = fn(st);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    }));
  }
  const memFallback = {};
  const Blobs = {
    // item: { id, kind: 'photo'|'audio'|'drawing', blob|dataUrl, created, name, size }
    async put(item) {
      item.id = item.id || U.uid();
      item.created = item.created || Date.now();
      try { await tx('readwrite', st => st.put(item)); }
      catch (e) { memFallback[item.id] = item; }
      Store.emit('media', item);
      return item;
    },
    async get(id) {
      try { return await tx('readonly', st => st.get(id)); }
      catch (e) { return memFallback[id]; }
    },
    async list(kind) {
      let all;
      try { all = await tx('readonly', st => st.getAll()); }
      catch (e) { all = Object.values(memFallback); }
      all = all || [];
      return all.filter(x => !kind || x.kind === kind).sort((a, b) => b.created - a.created);
    },
    async del(id) {
      try { await tx('readwrite', st => st.delete(id)); } catch (e) { delete memFallback[id]; }
      Store.emit('media', null);
    },
    async clear() {
      try { await tx('readwrite', st => st.clear()); } catch (e) { /* ignore */ }
      Object.keys(memFallback).forEach(k => delete memFallback[k]);
    },
    url(item) {
      if (!item) return '';
      if (item.dataUrl) return item.dataUrl;
      if (item.blob) { item._url = item._url || URL.createObjectURL(item.blob); return item._url; }
      return '';
    }
  };

  window.Store = Store;
  window.Blobs = Blobs;
})();
