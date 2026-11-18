/* Illustrated game surfaces and bounded, lifecycle-aware effects. */
(function(){
 'use strict';
 const load=name=>{const im=new Image();im.src='art/illustrated/'+name+'.png';return im};
 const scenes=load('environments'),tiles=load('relic-tiles');
 const sceneIndex={serpent:0,hellmines:1,damned2048:2,soulflap:3,brimblocks:4,ouija:5};
 const backgrounds={calls:'calls_active',pacts:'pacts_inbox',souls:'souls_contacts',pyrecam:'pyrecam_camera',relics:'relics_gallery',brimstone:'brimstone_seek',lament:'lament_player',doomclock:'doomclock_clock',dates:'dates_calendar',hellscape:'hellscape_map',abyss:'abyss_files',scribe:'scribe_notes',abacus:'abacus_calculator',omens:'omens_forecast',rites:'rites_settings',hellplay:'hellplay_store',paint:'paint_play',torch:'torch_idle',whispers:'whispers_play'};
 const ready=im=>!!(im.complete&&im.naturalWidth);
 function tile(g,index,x,y,w,h,tint){
  if(!ready(tiles)){g.fillStyle=tint||'#39231d';g.fillRect(x,y,w,h);return}
  const sw=tiles.naturalWidth/4,sh=tiles.naturalHeight/4;
  g.drawImage(tiles,(index%4)*sw,Math.floor(index/4)*sh,sw,sh,x,y,w,h);
  if(tint){g.save();g.globalAlpha=.38;g.fillStyle=tint;g.fillRect(x,y,w,h);g.restore()}
 }
 function background(g,id,w,h){
  const n=sceneIndex[id];
  if(ready(scenes)&&n!==undefined){const sw=scenes.naturalWidth/3,sh=scenes.naturalHeight/2;g.drawImage(scenes,(n%3)*sw,Math.floor(n/3)*sh,sw,sh,0,0,w,h)}
  else {g.fillStyle='#150b10';g.fillRect(0,0,w,h)}
  g.fillStyle='rgba(8,4,9,.24)';g.fillRect(0,0,w,h);
 }
 function embers(g,w,h,time){
  if(Store.settings().reduceMotion||window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  g.save();
  for(let i=0;i<9;i++){
   const p=((time/25+i*43)%h),x=(i%2?w-9:9)+Math.sin(time/700+i)*6;
   g.globalAlpha=.2+Math.sin(time/400+i)*.12;g.fillStyle=i%3?'#ffbd66':'#c489fa';g.beginPath();g.arc(x,h-p,1.2+i%2,0,Math.PI*2);g.fill();
  }
  g.restore();
 }
 function animate(win,draw){
  let timer,closed=false;
  function next(){if(closed)return;if(win.visible()&&!document.hidden&&!OS._paused)draw();timer=setTimeout(next,win.visible()?70:400)}
  timer=setTimeout(next,100);win.own(()=>{closed=true;clearTimeout(timer)});
 }
 function mount(win){
  const id=win.app.id,key=backgrounds[id]||id+'_play',art=Art.get('backgrounds',key);
  win.body.classList.add('illustrated-app');
  if(art){win.body.style.setProperty('--app-scene','url("'+art+'")');if(!win.body.style.backgroundImage)UI.backdrop(win.body,key,{top:.48,bottom:.87})}
  let bar=win.body.querySelector('.appbar');
  if(!bar){bar=UI.appbar({title:win.app.name});win.body.insertBefore(bar,win.body.firstChild)}
  if(bar&&!bar.querySelector('.appbar-emblem')){bar.classList.add('illustrated-bar');const emblem=OS.appIcon(win.app,38);emblem.classList.add('appbar-emblem');bar.insertBefore(emblem,bar.firstChild)}
  if(sceneIndex[id]!==undefined){
   win.body.classList.add('illustrated-game');
   const game=win.body.querySelector('.game');
   if(game){game.setAttribute('data-game-art',id);const caption=h('div.game-caption',h('span','THE INFERNAL ARCADE'),h('strong',win.app.name));game.insertBefore(caption,game.firstChild)}
  }
 }
 window.GameArt={tile,background,embers,animate,mount,sceneIndex};
})();
