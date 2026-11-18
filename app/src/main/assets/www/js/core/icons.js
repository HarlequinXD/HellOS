/* HellOS stroke icon set (24x24, drawn with currentColor). */
(function () {
  'use strict';
  const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const P = {
    back: 'M15 5l-7 7 7 7',
    forward: 'M9 5l7 7-7 7',
    close: 'M6 6l12 12M18 6L6 18',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    search: C(11, 11, 7) + 'M20 20l-4-4',
    more: C(12, 5, 1) + C(12, 12, 1) + C(12, 19, 1),
    menu: 'M4 7h16M4 12h16M4 17h16',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
    phoneOff: 'M3 3l18 18M8.5 13.5A16 16 0 0 1 3 6a2 2 0 0 1 2-2h4l2 5-2.5 1.5M18 21a16 16 0 0 1-6.5-2.3M15 13l5 2v4',
    message: 'M4 5h16v11H8l-4 4z',
    send: 'M4 12l16-8-6 16-3-7z',
    camera: 'M3 9a2 2 0 0 1 2-2h3l2-3h4l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' + C(12, 13.5, 3.5),
    flip: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
    image: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 16l5-5 4 4 3-3 6 6' + C(15, 9, 1.5),
    globe: C(12, 12, 9) + 'M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    music: 'M9 18V5l11-2v13' + C(6, 18, 3) + C(17, 16, 3),
    play: 'M7 4.5v15l13-7.5z',
    pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
    next: 'M5 5l10 7-10 7zM18 5v14',
    prev: 'M19 5L9 12l10 7zM6 5v14',
    shuffle: 'M3 7h3c4 0 6 10 10 10h5M18 14l3 3-3 3M3 17h3c1.5 0 2.7-1.4 3.8-3.2M14 9.2C15 7.6 16 7 18 7h3M18 4l3 3-3 3',
    repeat: 'M4 11V9a3 3 0 0 1 3-3h13M17 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H4M7 21l-3-3 3-3',
    clock: C(12, 12, 9) + 'M12 7v5l3 2',
    alarm: C(12, 13, 7.5) + 'M12 9v4l2.5 1.5M4 5l3-2M20 5l-3-2',
    timer: C(12, 13, 8) + 'M12 9v4M9 2h6M12 2v3',
    stopwatch: C(12, 14, 7) + 'M12 11v3l2 1M10 3h4M12 3v4M19 6l1.5-1.5',
    calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4',
    map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
    pin: 'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z' + C(12, 9, 2.5),
    navigate: 'M12 2l7 19-7-4-7 4z',
    locate: C(12, 12, 7) + C(12, 12, 2) + 'M12 1v4M12 19v4M1 12h4M19 12h4',
    folder: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
    file: 'M6 3h8l5 5v13H6zM14 3v5h5',
    note: 'M5 4h14v12l-4 4H5zM15 20v-4h4M8 9h8M8 13h5',
    calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8v3H8zM8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01',
    cloud: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z',
    sun: C(12, 12, 4) + 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    rain: 'M7 14a4 4 0 0 1-.5-8A6 6 0 0 1 18 5a4.5 4.5 0 0 1-.5 9zM8 17l-1 3M12 17l-1 3M16 17l-1 3',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
    gear: C(12, 12, 3) + 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
    bag: 'M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0',
    skull: 'M12 3a7 7 0 0 0-7 7v3l2 2v4h10v-4l2-2v-3a7 7 0 0 0-7-7z' + C(9.5, 11, 1.5) + C(14.5, 11, 1.5) + 'M10 19v-2M14 19v-2',
    flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 2 4 1-2 1-4 1-7z',
    star: 'M12 2.5l2.9 6.2 6.6.6-5 4.5 1.5 6.7L12 17l-6 3.5 1.5-6.7-5-4.5 6.6-.6z',
    pentagram: C(12, 12, 10) + 'M12 2.5l5.6 17.2L3 9.1h18L6.4 19.7z',
    heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
    lock: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3',
    unlock: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 7.5-2',
    wifi: 'M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01',
    wifiOff: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M2 9a15 15 0 0 1 4.5-3M12 20h.01M16.5 11.5A10 10 0 0 1 19 13M11 5a15 15 0 0 1 11 4',
    bonelink: 'M7 7l10 10-5 5V2l5 5L7 17',
    moon: 'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z',
    silence: C(12, 12, 9) + 'M8 12h8',
    descent: 'M12 3v18M5 14l7 7 7-7',
    battery: 'M7 6h10v15H7zM10 3h4v3',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z' + C(12, 12, 3),
    rotate: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
    power: 'M12 2v10M6.3 5.7a8 8 0 1 0 11.4 0',
    restart: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    bellOff: 'M3 3l18 18M6 16v-5a6 6 0 0 1 1-3.3M9.5 5.5A6 6 0 0 1 18 11v4M4 18h14M10 21h4',
    user: C(12, 8, 4) + 'M4 21a8 8 0 0 1 16 0',
    users: C(9, 8, 3.5) + 'M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a6.5 6.5 0 0 0-4-6',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    home: 'M3 11l9-7 9 7M5 9.5V20h14V9.5',
    recents: 'M5 5h14v14H5z',
    download: 'M12 3v12M6 10l6 6 6-6M4 21h16',
    refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4',
    bookmark: 'M6 3h12v18l-6-5-6 5z',
    share: C(18, 5, 2.5) + C(6, 12, 2.5) + C(18, 19, 2.5) + 'M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4',
    tabs: 'M7 7h13v13H7zM4 4h13v3M4 4v13h3',
    mic: 'M9 3h6v11H9zM5 11a7 7 0 0 0 14 0M12 18v3',
    stop: 'M6 6h12v12H6z',
    record: C(12, 12, 7),
    dice: 'M4 4h16v16H4z' + C(8.5, 8.5, 1) + C(15.5, 15.5, 1) + C(12, 12, 1),
    game: 'M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6h-6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4zM7 11v3M5.5 12.5h3M16 12h.01M18 14h.01',
    brush: 'M18 3l3 3-9 9-3-3zM9 12c-3 0-5 2-5 5 0 1-1 2-2 2 2 2 9 2 9-4z',
    torch: 'M8 2h8v5l-2 4v11h-4V11L8 7zM8 7h8M12 14v2',
    eraser: 'M16 3l5 5-11 11H5l-3-3zM9 9l6 6M10 19h11',
    undo: 'M9 14l-5-5 5-5M4 9h10a6 6 0 0 1 0 12h-3',
    chevR: 'M9 6l6 6-6 6',
    chevD: 'M6 9l6 6 6-6',
    chevU: 'M6 15l6-6 6 6',
    info: C(12, 12, 9) + 'M12 11v6M12 7.5v.5',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    palette: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z' + C(7.5, 11, 1) + C(10, 7, 1) + C(15, 7.5, 1),
    volume: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
    mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
    display: C(12, 12, 4) + 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2',
    storage: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    key: C(7.5, 15.5, 4.5) + 'M10.7 12.3L20 3M17 6l3 3M14 9l2 2',
    language: 'M4 5h10M9 3v2M6 5c1 4 4 7 7 8M12 5c-1 4-4 7-7 8M13 21l4-10 4 10M14.5 18h5',
    accessibility: C(12, 4.5, 1.8) + 'M5 8l7 1.5L19 8M12 9.5V14l-3 7M12 14l3 7',
    sim: 'M7 3h7l5 5v13H7zM10 12h6v6h-6z',
    signal: 'M3 21h2v-4H3zM8 21h2v-8H8zM13 21h2V9h-2zM18 21h2V3h-2z',
    plane: 'M12 2l2 7 7 4v2l-7-2 -1 5 2 2v1l-3-1-3 1v-1l2-2-1-5-7 2v-2l7-4z',
    contract: 'M6 3h12v18H6zM9 7h6M9 11h6M9 15h3M14 17l3-3',
    crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z',
    ghost: 'M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2z' + C(9.5, 10.5, 1) + C(14.5, 10.5, 1),
    bat: 'M12 8c-1-1.5-1-3-1-3l-1 2H8L2 6c2 2 2 5 1 7 2-1 4 0 5 2 1-1 3-1 4 1 1-2 3-2 4-1 1-2 3-3 5-2-1-2-1-5 1-7l-6 1h-2l-1-2s0 1.5-1 3z',
    snake: 'M4 18c4 0 4-4 8-4s4 4 8 4M4 12c4 0 4-4 8-4s4 4 8 4M18 6h.01',
    bomb: C(10, 14, 7) + 'M14.5 9.5L17 7M17 4v1M20 7h-1M19 4.5l-1 1',
    flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
    blocks: 'M3 13h6v6H3zM9 13h6v6H9zM9 7h6v6H9zM15 13h6v6h-6z',
    tiles: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    planchette: 'M12 3c5 0 8 5 8 10 0 4-3 7-8 8-5-1-8-4-8-8 0-5 3-10 8-10z' + C(12, 11, 2.5),
    compass: C(12, 12, 9) + 'M15.5 8.5l-2 5-5 2 2-5z',
    sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
    sort: 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4',
    cast: 'M3 8V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6M3 12a7 7 0 0 1 7 7M3 16a3 3 0 0 1 3 3M3 19h.01',
    keypad: C(6, 5, 1) + C(12, 5, 1) + C(18, 5, 1) + C(6, 11, 1) + C(12, 11, 1) + C(18, 11, 1) + C(6, 17, 1) + C(12, 17, 1) + C(18, 17, 1) + C(12, 22, .5),
    speaker: 'M7 3h10v18H7z' + C(12, 14, 3) + 'M12 7h.01',
    hold: 'M8 5v14M16 5v14',
    merge: 'M6 3v6a6 6 0 0 0 6 6h6M15 12l3 3-3 3',
    backspace: 'M8 5h12v14H8l-6-7zM12 9l5 6M17 9l-5 6',
    history: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2',
    star2: 'M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.6 6.4 20l1.5-6.3L3 9.5 9.4 9z',
    wand: 'M4 20L16 8M14 4v2M20 10h-2M18 4l-1.5 1.5M19.5 6.5L18 8',
    text: 'M4 6V4h16v2M12 4v16M9 20h6',
    ear: 'M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0'
  };

  function icon(name, size, opts) {
    opts = opts || {};
    const artNames=['back','forward','close','plus','minus','check','search','menu','edit','trash','phone','message','camera','play','pause','gear','download','user','grid','home','lock','volume','info','refresh','send'];
    const artIndex=artNames.indexOf(name);
    if(artIndex>=0&&(size||24)>=18&&!opts.fill){
      const el=document.createElement('span');el.className='art-control';el.setAttribute('aria-hidden','true');
      el.style.width=(size||24)+'px';el.style.height=(size||24)+'px';el.style.flex='0 0 '+(size||24)+'px';el.style.minWidth=(size||24)+'px';el.style.maxWidth=(size||24)+'px';
      el.style.setProperty('--icon-x',(artIndex%5)*25+'%');el.style.setProperty('--icon-y',Math.floor(artIndex/5)*25+'%');
      return el;
    }
    const d = P[name] || name; // allow raw path data
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size || 24);
    svg.setAttribute('height', size || 24);
    svg.setAttribute('fill', opts.fill || 'none');
    svg.setAttribute('stroke', opts.stroke || 'currentColor');
    svg.setAttribute('stroke-width', opts.sw || 1.8);
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    return svg;
  }
  window.ICONS = P;
  window.icon = icon;
})();
