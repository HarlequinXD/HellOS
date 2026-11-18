/* Adaptive phone shell. 360x780 is the S23 design baseline, never a forced size. */
(function(){
 'use strict';
 const controls='button,input,textarea,select,[role="button"]';
 const surfaces='.hud,.overlay-msg,.st-card,.toast,.qs button,.card,.list,.widget,.dock,.home-search,.dsearch,.searchbox,.urlbar .addr,.dialog,.sheet,.notif,.lnote,.headsup,.media-card,.miniplayer,.alarm-row,.note-card,.mapcard,.mapresults,.storage-card,.souls-pill,.bubble,.typing,.caption,.keypad,.calc .disp,.wx-hours>div,.tinputs,.tabsbar,.rcard,.crumbs,.composer,.setup-page';
 const panel='url("art/illustrated/panel-surface.png")';
 let scheduled=0,largestHeight=window.innerHeight||780,lastWidth=0,lastHeight=0;
 function imageAlreadyPresent(el){
  return /url\(/.test(el.style.backgroundImage||el.style.background||'')||
   (typeof getComputedStyle==='function'&&/url\(/.test(getComputedStyle(el).backgroundImage||''));
 }
 function material(el,type){
  if(!el.dataset.graphic)el.dataset.graphic=type;el.classList.add(type==='control'?'graphic-control':type==='input'?'graphic-input':'phone-panel');
  if(el.matches('.swatch'))el.style.setProperty('--swatch-color',el.style.backgroundColor||el.style.background||'#bd8d65');
  const contentIcon=el.matches('.app-tile,.page-dot,.nav-pill,.seal-btn,.nav-buttons button')||el.querySelector('img,canvas,video');
  if(!contentIcon&&!imageAlreadyPresent(el)&&!el.matches('input[type="range"],.switch input'))el.style.backgroundImage=panel;
  if(((el.style.backgroundImage||'').includes('panel-surface.png')||(typeof getComputedStyle==='function'&&(getComputedStyle(el).backgroundImage||'').includes('panel-surface.png'))))el.dataset.material='panel';
  if(type==='control'&&!el.style.position&&typeof getComputedStyle==='function'&&getComputedStyle(el).position==='static')el.style.position='relative';
 }
 function decorate(){
  document.querySelectorAll(surfaces).forEach(el=>material(el,'surface'));
  document.querySelectorAll('div[style],section[style],form[style]').forEach(el=>{if(el.style.background&&!imageAlreadyPresent(el)&&!el.matches('.bar>div,.dlbar>div,.flash,#brightness-veil'))material(el,'surface')});
  document.querySelectorAll(controls).forEach(el=>{
   if(el.matches('input,textarea,select'))material(el,'input');
   else material(el,'control');
  });
 }
 function css(el){return typeof getComputedStyle==='function'?getComputedStyle(el):null}
 function number(v){return parseFloat(v)||0}
 function space(game,target){
  const style=css(game),gap=style?number(style.rowGap||style.gap):8;
  const children=[...game.children].filter(el=>el!==target&&!el.classList.contains('overlay-msg')&&(!css(el)||css(el).display!=='none')&&(!css(el)||!['absolute','fixed'].includes(css(el).position)));
  const other=children.reduce((n,el)=>{const s=css(el);return n+el.getBoundingClientRect().height+(s?number(s.marginTop)+number(s.marginBottom):0)},0);
  return {w:Math.max(80,game.clientWidth-(style?number(style.paddingLeft)+number(style.paddingRight):18)),
   h:Math.max(100,game.clientHeight-other-gap*children.length-(style?number(style.paddingTop)+number(style.paddingBottom):14))};
 }
 function setSize(el,key,value){if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value)}
 function fit(){
  document.querySelectorAll('.illustrated-game .game').forEach(game=>{
   const win=game.closest('.win');if(game.closest('.shot')||win&&(!OS.fg||OS.fg.el!==win||win.classList.contains('bg')))return;
   const cv=game.querySelector(':scope > canvas');
   if(cv&&cv.width&&cv.height){const room=space(game,cv),ratio=cv.width/cv.height,style=css(cv);
    const bx=style?number(style.borderLeftWidth)+number(style.borderRightWidth):0,by=style?number(style.borderTopWidth)+number(style.borderBottomWidth):0;
    const contentWidth=Math.max(20,Math.min(room.w-bx,(room.h-by)*ratio));
    setSize(cv,'--game-w',Math.floor(contentWidth+bx)+'px');setSize(cv,'--game-h',Math.floor(contentWidth/ratio+by)+'px');
   }
   const board=game.querySelector(':scope > .g2048,:scope > .ouija');
   if(board){const room=space(game,board),ratio=board.classList.contains('ouija')?1.3:1;
    const w=Math.floor(Math.max(130,Math.min(room.w,room.h*ratio,350)));setSize(board,'--board-size',w+'px');
   }
   const mines=game.querySelector(':scope > .mines');
   if(mines){const match=(mines.style.gridTemplateColumns||'').match(/repeat\((\d+)/),cols=match?+match[1]:8,rows=Math.ceil(mines.children.length/cols),room=space(game,mines);
    const cell=Math.max(18,Math.floor(Math.min((room.w-18-(cols-1)*3)/cols,(room.h-18-(rows-1)*3)/rows)));
    setSize(mines,'--mine-cell',cell+'px');
    const grid='repeat('+cols+', '+cell+'px)';if(mines.style.gridTemplateColumns!==grid)mines.style.gridTemplateColumns=grid;
   }
  });
 }
 function viewport(){
  const vv=window.visualViewport,w=Math.round(window.innerWidth||vv?.width||360),h=Math.round(window.innerHeight||vv?.height||780);
  largestHeight=Math.max(largestHeight,h);
  document.documentElement.style.setProperty('--phone-w',w+'px');document.documentElement.style.setProperty('--phone-h',h+'px');
  document.documentElement.classList.toggle('keyboard-open',Math.min(h,vv?.height||h)<largestHeight*.75);
  const changed=w!==lastWidth||Math.abs(h-lastHeight)>80;
  lastWidth=w;lastHeight=h;
  if(changed&&window.Home&&OS.booted&&!OS.fg&&!OS.locked&&document.querySelector('.home'))Home.render();
  schedule();
 }
 function run(){scheduled=0;decorate();fit()}
 function schedule(){if(!scheduled)scheduled=setTimeout(run,35)}
 const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))schedule()});
 observer.observe(document.body,{childList:true,subtree:true});
 // Delegated visual feedback works for installed apps and future dynamic controls.
 const pressed=new Map(),pointers=new Map();
 function target(event){const el=event.target.closest?.('button,[role="button"]');return el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'?el:null}
 function press(el){if(!el)return;const old=pressed.get(el);if(old)clearTimeout(old.timer);pressed.set(el,{at:performance.now()});el.classList.add('is-pressed')}
 function release(el,immediate){const state=pressed.get(el);if(!state)return;clearTimeout(state.timer);const clear=()=>{el.classList.remove('is-pressed');pressed.delete(el)};if(immediate)clear();else state.timer=setTimeout(clear,Math.max(0,140-(performance.now()-state.at)))}
 document.addEventListener('pointerdown',e=>{const el=target(e);if(el){pointers.set(e.pointerId,el);press(el)}},{passive:true});
 document.addEventListener('pointerup',e=>{release(pointers.get(e.pointerId));pointers.delete(e.pointerId)},{passive:true});
 document.addEventListener('pointercancel',e=>{release(pointers.get(e.pointerId),true);pointers.delete(e.pointerId)},{passive:true});
 document.addEventListener('keydown',e=>{if(!e.repeat&&(e.key==='Enter'||e.key===' '))press(target(e))});
 document.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')release(target(e))});
 document.addEventListener('click',e=>{if(e.detail===0){const el=target(e);press(el);release(el)}});
 const clearPresses=()=>{for(const el of pressed.keys())release(el,true);pointers.clear()};
 window.addEventListener('blur',clearPresses);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearPresses()});
 const originalFocus=OS.focus;OS.focus=function(win,isNew){originalFocus(win,isNew);schedule();setTimeout(schedule,320)};
 window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);
 document.addEventListener('focusin',event=>{if(event.target.matches('input:not([type="range"]):not([type="checkbox"]),textarea,select'))setTimeout(()=>event.target.scrollIntoView?.({block:'nearest',inline:'nearest'}),180)});
 // The redesign starts with familiar phone navigation; later user choices stay respected.
 if(Store.get('phoneLayoutVersion',0)<1){Store.setting('navMode','buttons');Store.set('phoneLayoutVersion',1)}
 window.PhoneUI={refresh:()=>{viewport();run()},fit,decorate,audit(){
  const all=[...document.querySelectorAll(controls)];return {width:lastWidth,height:lastHeight,controls:all.length,unskinned:all.filter(el=>!el.dataset.graphic).map(el=>el.outerHTML.slice(0,140))};
 }};
 viewport();run();
})();
