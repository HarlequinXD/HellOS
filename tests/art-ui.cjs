const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const base=path.resolve(__dirname,'../app/src/main/assets/www');
const {window}=parseHTML(fs.readFileSync(path.join(base,'index.html'),'utf8'));const document=window.document;
let id=0,time=1000;const timeouts=new Map(),intervals=new Map(),images=[],errors=[];
const storage=new Map();
const context2d=cv=>new Proxy({canvas:cv,measureText:t=>({width:String(t).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),getImageData:()=>({data:new Uint8ClampedArray(360*640*4)})},{get(t,k){return k in t?t[k]:(...args)=>{if(k==='drawImage')images.push(args)}}});
window.HTMLCanvasElement.prototype.getContext=function(){return this._g||(this._g=context2d(this))};
window.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,';
Object.defineProperties(window.HTMLElement.prototype,{clientWidth:{get(){return this.width||360}},clientHeight:{get(){return this.height||640}}});
window.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,right:360,bottom:640,width:this.width||360,height:this.height||640}};
window.HTMLElement.prototype.setPointerCapture=function(){};
class Picture {constructor(){this.complete=true;this.naturalWidth=1254;this.naturalHeight=1254;}set src(v){this._src=v;if(v.endsWith('environments.png')){this.naturalWidth=1536;this.naturalHeight=1024}}get src(){return this._src}}
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k),key:i=>[...storage.keys()][i],get length(){return storage.size}};
const scope=vm.createContext({window,document,Node:window.Node,Image:Picture,Event:window.Event,console:{log:console.log,warn(){},error(...args){errors.push(args.map(String).join(' '))}},
 localStorage,MutationObserver:class{observe(){}disconnect(){}},getComputedStyle:el=>({backgroundImage:el.style.backgroundImage||'none',position:el.style.position||'static',display:el.classList.contains('game-caption')?'none':'block',paddingLeft:'9px',paddingRight:'9px',paddingTop:'4px',paddingBottom:'10px',rowGap:'8px',marginTop:'0px',marginBottom:'0px'}),ResizeObserver:class{observe(){}disconnect(){}},navigator:{language:'en-AU',onLine:true,mediaDevices:{getUserMedia:async()=>{throw Error('Test media permission denied')}}},
 matchMedia:()=>({matches:false}),innerWidth:393,innerHeight:825,devicePixelRatio:1,performance:{now:()=>time},
 setTimeout:(f,d)=>{timeouts.set(++id,{f,d});return id},clearTimeout:i=>timeouts.delete(i),setInterval:(f,d)=>{intervals.set(++id,{f,d});return id},clearInterval:i=>intervals.delete(i),
 requestAnimationFrame:f=>{timeouts.set(++id,{f:()=>f(time),d:16});return id},cancelAnimationFrame:i=>timeouts.delete(i),
 fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(base,url),'utf8'))}),
 URL,Blob,File:globalThis.File,URLSearchParams,TextEncoder,Uint8Array,Uint8ClampedArray,
 });
window.innerWidth=393;window.innerHeight=825;window.devicePixelRatio=1;
function exportGlobals(){for(const key of Object.keys(window))if(!(key in scope))scope[key]=window[key]}
for(const el of document.querySelectorAll('script[src]')){
 const file=el.getAttribute('src');if(file==='js/main.js')continue;
 try{vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),scope,{filename:file});exportGlobals()}catch(e){throw Error(file+': '+e.stack)}
}
const wait=()=>new Promise(r=>setImmediate(r));
(async()=>{
 await scope.Art.load();scope.Blobs.list=async()=>[];scope.Blobs.get=async()=>null;
 scope.Store.set('setupDone',true);scope.Store.setting('touchSounds',false);scope.Store.setting('silence',true);
 scope.Store.set('installed',Object.fromEntries(Object.keys(scope.CATALOG).map(k=>[k,true])));
 // Assert every asset key resolves to an actual file, including all 25 app icons.
 const art=scope.Art.raw();let assetCount=0;
 for(const group of Object.values(art)){if(!group||typeof group!=='object')continue;for(const value of Object.values(group)){if(!value)continue;assert(fs.existsSync(path.join(base,'art',value)),value);assetCount++}}
 assert.equal(Object.keys(scope.OS.apps).length,25);
 const keys=Object.keys(scope.OS.apps),games=['serpent','hellmines','damned2048','soulflap','brimblocks','ouija'];
 for(const key of keys){
  const before=errors.length;const win=scope.OS.open(key);await wait();
  assert(!win.body.textContent.includes('This app has been possessed'),key+': '+win.body.textContent+' '+errors.slice(before).join(' '));
  scope.PhoneUI.refresh();
  assert(win,key+' did not open');assert(win.body.classList.contains('illustrated-app'),key+' missing artwork theme');
  assert(scope.Art.icon(key),key+' missing icon');
  assert(!win.body.textContent.includes('This app has been possessed'),key+': '+win.body.textContent);
  assert(win.body.querySelector('.illustrated-bar'),key+' missing framed illustrated header');
  if(games.includes(key))assert(win.body.querySelector('[data-game-art="'+key+'"]'),key+' missing game art');
  assert.equal(errors.length,before,errors.slice(before).join('\n'));
  if(key==='serpent'||key==='brimblocks'||key==='soulflap'){
   const start=[...win.body.querySelectorAll('.overlay-msg button')][0];start?.click();
   const recent=[...timeouts.entries()].filter(([,t])=>t.d<=200).slice(-4);
   for(const [n,t] of recent){timeouts.delete(n);time+=80;t.f()}
   assert(images.length>0,key+' did not draw image artwork');
  }
  if(key==='hellmines'){
   const first=win.body.querySelector('.mines button');first.click();assert(win.body.querySelector('.mines button.open'),'Mine reveal failed');
  }
  if(key==='damned2048'){
   assert.equal(win.body.querySelectorAll('.g2048 .relic-filled').length,2);
   const event=new window.Event('keydown');event.key='ArrowLeft';window.dispatchEvent(event);
   assert(win.body.querySelectorAll('.g2048 .relic-filled').length>=2);
  }
  scope.OS.closeWindow(win);
 }
 scope.PhoneUI.refresh();
 assert.equal(scope.PhoneUI.audit().unskinned.length,0,JSON.stringify(scope.PhoneUI.audit().unskinned));
 assert(scope.icon('gear',24).classList.contains('art-control'));
 assert.equal(scope.icon('wifi',14).tagName.toLowerCase(),'svg');
 // A backgrounded game must not be considered visible.
 const win=scope.OS.open('serpent');scope.OS.onPause();assert.equal(win.visible(),false);scope.OS.onResume();scope.OS.closeWindow(win);
 assert(images.some(args=>String(args[0]?.src).includes('environments.png')),'No painted game environment drawn');
 assert(images.some(args=>String(args[0]?.src).includes('relic-tiles.png')),'No textured game piece drawn');
 // Unlock and exercise familiar phone flows with the S23 logical baseline.
 scope.Lock.unlockThen(()=>{});
 for(const [n,t] of [...timeouts])if(t.d===220){timeouts.delete(n);t.f()}
 assert.equal(scope.OS.locked,false,'Unlock did not return to the phone');
 scope.OS.booted=true;window.innerWidth=360;window.innerHeight=780;scope.innerWidth=360;scope.innerHeight=780;
 scope.Seed.run();scope.Store.set('installed',Object.fromEntries(Object.keys(scope.CATALOG).map(k=>[k,true])));
 const pinned=Object.keys(scope.OS.apps).filter(k=>!scope.Home.DOCK.includes(k)).slice(0,16);
 scope.Store.setting('homeApps',pinned);scope.Home.render();scope.OS.renderNav();scope.PhoneUI.refresh();
 assert.equal(document.querySelectorAll('.home-page').length,2,'S23 home should paginate sixteen icons');
 assert.equal(document.querySelectorAll('.home-page')[0].querySelectorAll('.app-tile').length,8);
 assert.equal(document.querySelectorAll('.nav-buttons button').length,3);
 assert.equal(document.documentElement.style.getPropertyValue('--phone-w'),'360px');
 assert.equal(document.documentElement.style.getPropertyValue('--phone-h'),'780px');
 scope.Home.openDrawer();const search=document.querySelector('.drawer input');search.value='Abacus';search.dispatchEvent(new window.Event('input'));
 assert.equal(document.querySelectorAll('.drawer .dgrid .app-tile').length,1);scope.Home.closeDrawer();
 window.innerHeight=620;scope.innerHeight=620;scope.PhoneUI.refresh();
 assert.equal(document.querySelectorAll('.home-page').length,4,'Short viewport needs fewer icons per page');
 window.innerHeight=780;scope.innerHeight=780;scope.PhoneUI.refresh();
 const calc=scope.OS.open('abacus');
 for(const value of ['2','+','2','='])[...calc.body.querySelectorAll('.keys button')].find(el=>el.textContent===value).click();
 assert.equal(calc.body.querySelector('.expr').textContent,'4','Calculator controls stopped working');scope.OS.closeWindow(calc);
 const notes=scope.OS.open('scribe');notes.body.querySelector('.fab').click();
 notes.body.querySelector('.etitle').value='S23 test';notes.body.querySelector('.editor textarea').value='The controls remain reachable.';
 scope.OS.back();assert(scope.Store.get('notes',[]).some(n=>n.title==='S23 test'));scope.OS.closeWindow(notes);
 const phone=scope.OS.open('calls');for(const number of ['6','1','0'])[...phone.body.querySelectorAll('.keypad button')].find(el=>el.textContent.startsWith(number)).click();
 assert.equal(phone.body.querySelector('.num').textContent,'610');scope.OS.closeWindow(phone);
 const chat=scope.OS.open('pacts',{contact:'c_vex'});chat.body.querySelector('.composer textarea').value='S23 messaging test';chat.body.querySelector('.send').click();
 assert.equal(scope.Chat.threads().c_vex.msgs.at(-1).text,'S23 messaging test');scope.PhoneUI.refresh();
 window.innerHeight=420;scope.innerHeight=420;scope.PhoneUI.refresh();assert(document.documentElement.classList.contains('keyboard-open'));
 assert(chat.body.querySelector('.composer .send'));scope.OS.closeWindow(chat);
 window.innerHeight=780;scope.innerHeight=780;scope.PhoneUI.refresh();assert(!document.documentElement.classList.contains('keyboard-open'));
 scope.Shade.open();const oldNet=scope.Store.settings().hellnet;document.querySelector('.qs button').click();assert.notEqual(scope.Store.settings().hellnet,oldNet);scope.Shade.close(true);
 // Geometry supplied by the device is honored by the actual fitter. These
 // model checks are deliberately separate from a real browser layout test.
 for(const height of [780,700,620]){
  window.innerHeight=height;scope.innerHeight=height;
  for(const name of ['serpent','soulflap','brimblocks']){
   const w=scope.OS.open(name),game=w.body.querySelector('.game'),cv=game.querySelector('canvas');
   Object.defineProperty(game,'clientWidth',{value:340,configurable:true});Object.defineProperty(game,'clientHeight',{value:height-140,configurable:true});
   [...game.children].filter(el=>el!==cv).forEach(el=>el.getBoundingClientRect=()=>({height:el.classList.contains('dpad')?132:el.classList.contains('overlay-msg')?0:44,width:300}));
   scope.PhoneUI.refresh();assert(parseInt(cv.style.getPropertyValue('--game-w'))<=322);
   assert(parseInt(cv.style.getPropertyValue('--game-h'))<=height-140);
   scope.OS.closeWindow(w);
  }
 }
 window.innerHeight=780;scope.innerHeight=780;scope.PhoneUI.refresh();
 const retained=scope.OS.open('serpent'),retainedGame=retained.body.querySelector('.game'),retainedCv=retainedGame.querySelector('canvas');
 Object.defineProperty(retainedGame,'clientWidth',{value:340,configurable:true});Object.defineProperty(retainedGame,'clientHeight',{value:550,configurable:true});
 [...retainedGame.children].filter(el=>el!==retainedCv).forEach(el=>el.getBoundingClientRect=()=>({height:el.classList.contains('dpad')?132:el.classList.contains('overlay-msg')?0:44,width:300}));
 scope.PhoneUI.refresh();const previousWidth=retainedCv.style.getPropertyValue('--game-w');
 scope.OS.goHome();scope.PhoneUI.fit();assert.equal(retainedCv.style.getPropertyValue('--game-w'),previousWidth,'Hidden game was resized against unavailable space');
 assert.equal(scope.OS.open('serpent'),retained,'Returning home lost the retained game');
 Object.defineProperty(retainedGame,'clientHeight',{value:350,configurable:true});scope.PhoneUI.refresh();
 assert(parseInt(retainedCv.style.getPropertyValue('--game-h'))<=350,'Retained game did not refit after focus');scope.OS.closeWindow(retained);
 // Exercise the settings controls, persistence, weather navigation and delegated
 // press lifecycle, using the same handlers as the installed WebView.
 scope.Store.setting('hellnet',true);
 const paletteWin=scope.OS.open('rites',{page:'display'});scope.PhoneUI.refresh();
 let pickers=paletteWin.body.querySelectorAll('.material-picker');assert.equal(pickers.length,2);
 pickers[0].querySelector('[aria-label="Cathedral ivory"]').click();
 assert.equal(scope.Store.settings().panelTone,'ivory');assert.equal(document.documentElement.dataset.lightSurfaces,'true');
 pickers=paletteWin.body.querySelectorAll('.material-picker');pickers[1].querySelector('[aria-label="Oxblood"]').click();
 assert.equal(scope.Store.settings().headerTone,'ember');assert.equal(document.documentElement.style.getPropertyValue('--header-pos'),'50% 0%');
 scope.OS.closeWindow(paletteWin);const reopened=scope.OS.open('rites',{page:'display'});
 assert.equal(reopened.body.querySelector('.material-picker [aria-label="Cathedral ivory"]').getAttribute('aria-pressed'),'true');scope.OS.closeWindow(reopened);
 const omens=scope.OS.open('omens');assert(omens.body.querySelector('.wx-hero .weather-symbol'));
 omens.body.querySelector('[aria-label="Weather symbols"]').click();assert.equal(omens.body.querySelectorAll('.weather-guide-card').length,9);
 assert.equal(omens.onBack(),true);assert(omens.body.querySelector('.wx-hero'));scope.OS.closeWindow(omens);
 const tap=document.createElement('button');document.body.appendChild(tap);
 function pointer(type){const e=new window.Event(type,{bubbles:true});e.pointerId=31;tap.dispatchEvent(e)}
 pointer('pointerdown');assert(tap.classList.contains('is-pressed'));pointer('pointercancel');assert(!tap.classList.contains('is-pressed'));
 pointer('pointerdown');pointer('pointerup');assert(tap.classList.contains('is-pressed'));
 for(const [n,t] of [...timeouts.entries()])if(t.d===140){timeouts.delete(n);t.f()}
 assert(!tap.classList.contains('is-pressed'));tap.remove();
 window.visualViewport={width:360,height:650};scope.PhoneUI.refresh();assert.equal(scope.PhoneUI.audit().height,780,'Visual viewport clipping must not shrink the OS root');window.visualViewport=undefined;
 scope.Store.setting('panelTone','obsidian');scope.Store.setting('headerTone','auto');scope.OS.applySettings();
 scope.PhoneUI.refresh();
 assert.equal(scope.PhoneUI.audit().unskinned.length,0,'Some phone controls missed the artwork pass');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('Verified saved panel/header choices, nine weather guide entries, touch release/cancel feedback and unclipped viewport dimensions.');
 console.log('Verified S23 360x780 viewport, home pagination, three-button navigation, app search, calculator, notes, dial pad, message send, keyboard resizing, quick toggles, modeled game fitting and complete control-skin coverage.');
 console.log('Verified '+keys.length+' app launches, '+games.length+' illustrated game screens, '+assetCount+' asset references, raster control icons, textured canvas drawing, mine reveal, 2048 movement, and lifecycle visibility with simulated media/canvas APIs.');
})().catch(error=>{console.error(error);process.exitCode=1});
