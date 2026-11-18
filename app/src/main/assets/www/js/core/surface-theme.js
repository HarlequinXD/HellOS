/* Painted material choices, persisted independently for panels and headers. */
(function(){
 'use strict';
 const tones=[
  {id:'obsidian',name:'Obsidian',pos:'0% 0%',text:'#f4e5d2',muted:'#cfbda9',wash:'#080608bb'},
  {id:'ember',name:'Oxblood',pos:'50% 0%',text:'#ffebd2',muted:'#dfb8a4',wash:'#240707ad'},
  {id:'slate',name:'Midnight slate',pos:'100% 0%',text:'#eff3f4',muted:'#c2ced6',wash:'#101b2bb0'},
  {id:'ash',name:'Ash stone',pos:'0% 100%',text:'#17120f',muted:'#39312c',wash:'#aaa198dc',light:true},
  {id:'parchment',name:'Parchment',pos:'50% 100%',text:'#28170b',muted:'#574025',wash:'#d3b580dc',light:true},
  {id:'ivory',name:'Cathedral ivory',pos:'100% 100%',text:'#231b15',muted:'#55483b',wash:'#e6ddcfdc',light:true}
 ];
 function tone(id){return tones.find(t=>t.id===id)||tones[0]}
 function apply(){
  const s=Store.settings(),p=tone(s.panelTone),head=tone(s.headerTone==='auto'||!s.headerTone?p.id:s.headerTone),root=document.documentElement;
  root.dataset.surfaceTone=p.id;root.dataset.lightSurfaces=String(!!p.light);
  for(const [key,value] of Object.entries({'--panel-pos':p.pos,'--panel-text':p.text,'--panel-muted':p.muted,'--surface-wash':p.wash,'--header-pos':head.pos,'--header-text':head.text,'--text':p.text,'--muted':p.muted}))root.style.setProperty(key,value);
 }
 function picker(selected,onChange,headers){
  const grid=h('div.material-picker');
  if(headers)grid.appendChild(h('button.material-follow',{type:'button','aria-pressed':String(!selected||selected==='auto'),onclick:()=>onChange('auto')},'Match panels'));
  for(const t of tones)grid.appendChild(h('button.material-choice',{type:'button','aria-label':t.name,'aria-pressed':String(selected===t.id),style:{backgroundImage:'url("art/illustrated/panel-palettes.png")',backgroundSize:'300% 200%',backgroundPosition:t.pos,color:t.text},onclick:()=>onChange(t.id)},h('span',t.name)));
  return grid;
 }
 const original=OS.applySettings;OS.applySettings=function(){original.apply(OS,arguments);apply()};
 window.SurfaceTheme={apply,picker,tones};apply();
})();
