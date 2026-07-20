'use strict';

function layoutFor(slide){
  const d=designOf(slide);
  const layouts={
    'new-cover':{image:{x:0,y:0,w:W,h:H,cx:540,cy:675},title:{x:76,y:420,maxWidth:925,align:'left',cx:540,cy:610},subtitle:{x:82,y:947,maxWidth:680,align:'left',cx:420,cy:980},logo:{x:652,y:1048,w:330,h:235,cx:817,cy:1165}},
    'new-body':{image:{x:0,y:0,w:W,h:610,cx:540,cy:305},title:{x:72,y:738,maxWidth:936,align:'left',cx:540,cy:825},subtitle:{x:72,y:952,maxWidth:936,align:'left',cx:540,cy:1060},logo:{x:735,y:1190,w:270,h:192,cx:870,cy:1286}},
    'new-question':{image:{x:0,y:0,w:0,h:0,cx:0,cy:0},title:{x:540,y:545,maxWidth:790,align:'center',cx:540,cy:610},subtitle:{x:540,y:895,maxWidth:820,align:'center',cx:540,cy:920},logo:{x:362,y:1080,w:356,h:254,cx:540,cy:1207}},
    'new-final':{image:{x:0,y:0,w:0,h:0,cx:0,cy:0},title:{x:86,y:430,maxWidth:890,align:'left',cx:540,cy:610},subtitle:{x:88,y:965,maxWidth:700,align:'left',cx:440,cy:990},logo:{x:600,y:1015,w:385,h:274,cx:792,cy:1152}},
    'original-cover':{image:{x:0,y:0,w:W,h:H,cx:540,cy:675},title:{x:540,y:880,maxWidth:920,align:'center',cx:540,cy:980},subtitle:{x:540,y:1190,maxWidth:820,align:'center',cx:540,cy:1210},logo:{x:360,y:45,w:360,h:257,cx:540,cy:174}},
    'original-body':{image:{x:0,y:0,w:W,h:H,cx:540,cy:675},title:{x:540,y:835,maxWidth:920,align:'center',cx:540,cy:940},subtitle:{x:540,y:1160,maxWidth:830,align:'center',cx:540,cy:1190},logo:{x:365,y:48,w:350,h:250,cx:540,cy:173}},
    'original-final':{image:{x:0,y:0,w:W,h:H,cx:540,cy:675},title:{x:540,y:835,maxWidth:920,align:'center',cx:540,cy:940},subtitle:{x:540,y:1160,maxWidth:830,align:'center',cx:540,cy:1190},logo:{x:365,y:48,w:350,h:250,cx:540,cy:173}},
    'classic-cover':{image:{x:0,y:810,w:W,h:540,cx:540,cy:1080},title:{x:540,y:330,maxWidth:920,align:'center',cx:540,cy:460},subtitle:{x:540,y:670,maxWidth:820,align:'center',cx:540,cy:690},logo:{x:355,y:40,w:370,h:264,cx:540,cy:172}},
    'classic-body':{image:{x:40,y:850,w:1000,h:460,cx:540,cy:1080,rx:18},title:{x:540,y:340,maxWidth:900,align:'center',cx:540,cy:480},subtitle:{x:540,y:680,maxWidth:850,align:'center',cx:540,cy:700},logo:{x:365,y:35,w:350,h:250,cx:540,cy:160}},
    'classic-question':{image:{x:70,y:875,w:380,h:395,cx:260,cy:1072,rotation:-4},title:{x:540,y:440,maxWidth:850,align:'center',cx:540,cy:560},subtitle:{x:750,y:1110,maxWidth:430,align:'center',cx:750,cy:1130},logo:{x:740,y:1180,w:245,h:175,cx:862,cy:1267}},
    'classic-final':{image:{x:0,y:0,w:0,h:0,cx:0,cy:0},title:{x:540,y:500,maxWidth:900,align:'center',cx:540,cy:650},subtitle:{x:540,y:990,maxWidth:820,align:'center',cx:540,cy:1010},logo:{x:345,y:40,w:390,h:278,cx:540,cy:179}},
    'disclosure-hero':{image:{x:0,y:0,w:W,h:H,cx:540,cy:675},title:{x:70,y:265,maxWidth:900,align:'left',cx:480,cy:450},subtitle:{x:72,y:760,maxWidth:850,align:'left',cx:480,cy:790},logo:{x:640,y:1045,w:390,h:278,cx:835,cy:1184}},
    'disclosure-editorial':{image:{x:0,y:0,w:W,h:H,cx:540,cy:675},title:{x:70,y:180,maxWidth:930,align:'left',cx:500,cy:300},subtitle:{x:70,y:480,maxWidth:930,align:'left',cx:500,cy:650},logo:{x:650,y:1050,w:380,h:271,cx:840,cy:1185}},
    'disclosure-question':{image:{x:50,y:870,w:380,h:410,cx:240,cy:1075,rotation:-4},title:{x:540,y:500,maxWidth:900,align:'center',cx:540,cy:600},subtitle:{x:540,y:790,maxWidth:850,align:'center',cx:540,cy:860},logo:{x:710,y:1110,w:300,h:214,cx:860,cy:1217}},
    'returns-cover':{image:{x:0,y:0,w:W,h:H,cx:540,cy:675},title:{x:540,y:760,maxWidth:920,align:'center',cx:540,cy:900},subtitle:{x:540,y:1120,maxWidth:850,align:'center',cx:540,cy:1150},logo:{x:355,y:40,w:370,h:264,cx:540,cy:172}},
    'returns-question':{image:{x:0,y:0,w:W,h:620,cx:540,cy:310},title:{x:540,y:420,maxWidth:880,align:'center',cx:540,cy:470},subtitle:{x:540,y:820,maxWidth:800,align:'center',cx:540,cy:960},logo:{x:750,y:1125,w:260,h:185,cx:880,cy:1217}},
    'returns-sheet-right':{image:{x:585,y:0,w:495,h:H,cx:832,cy:675},title:{x:62,y:190,maxWidth:470,align:'left',cx:290,cy:360},subtitle:{x:62,y:620,maxWidth:470,align:'left',cx:290,cy:770},logo:{x:70,y:1085,w:340,h:242,cx:240,cy:1206}},
    'returns-sheet-left':{image:{x:0,y:0,w:495,h:H,cx:247,cy:675},title:{x:555,y:190,maxWidth:470,align:'left',cx:790,cy:360},subtitle:{x:555,y:620,maxWidth:470,align:'left',cx:790,cy:770},logo:{x:650,y:1085,w:340,h:242,cx:820,cy:1206}},
    'returns-big-bubble':{image:{x:0,y:0,w:W,h:H,cx:540,cy:675},title:{x:540,y:310,maxWidth:800,align:'center',cx:540,cy:420},subtitle:{x:540,y:620,maxWidth:780,align:'center',cx:540,cy:800},logo:{x:720,y:1110,w:270,h:193,cx:855,cy:1206}},
    'returns-cards':{image:{x:720,y:40,w:300,h:270,cx:870,cy:175,rotation:5},title:{x:370,y:245,maxWidth:520,align:'center',cx:370,cy:300},subtitle:{x:560,y:655,maxWidth:520,align:'center',cx:560,cy:720},logo:{x:705,y:1110,w:270,h:193,cx:840,cy:1206}},
    'returns-final':{image:{x:0,y:0,w:0,h:0,cx:0,cy:0},title:{x:540,y:600,maxWidth:900,align:'center',cx:540,cy:700},subtitle:{x:540,y:1040,maxWidth:820,align:'center',cx:540,cy:1060},logo:{x:360,y:1100,w:360,h:257,cx:540,cy:1228}},
    'faith-dune-cover':{image:{x:0,y:0,w:1080,h:1350,cx:540,cy:675},title:{x:540,y:1060,maxWidth:930,align:'center',cx:540,cy:1070},subtitle:{x:540,y:900,maxWidth:900,align:'center',cx:540,cy:910},logo:{x:394,y:235,w:292,h:208,cx:540,cy:339}},
    'faith-dune-quote':{image:{x:0,y:850,w:390,h:500,cx:195,cy:1100,rx:0},title:{x:540,y:330,maxWidth:845,align:'center',cx:540,cy:400},subtitle:{x:540,y:650,maxWidth:760,align:'center',cx:540,cy:720},logo:{x:815,y:1090,w:225,h:160,cx:927,cy:1170}},
    'faith-dune-image-top':{image:{x:0,y:0,w:1080,h:455,cx:540,cy:228},title:{x:540,y:610,maxWidth:860,align:'center',cx:540,cy:650},subtitle:{x:540,y:820,maxWidth:820,align:'center',cx:540,cy:900},logo:{x:55,y:1135,w:235,h:168,cx:172,cy:1219}},
    'faith-dune-final':{image:{x:690,y:930,w:390,h:420,cx:885,cy:1140},title:{x:540,y:490,maxWidth:860,align:'center',cx:540,cy:550},subtitle:{x:540,y:760,maxWidth:820,align:'center',cx:540,cy:820},logo:{x:68,y:1100,w:245,h:175,cx:190,cy:1188}},
    'faith-returns-cover':{image:{x:0,y:0,w:1080,h:1350,cx:540,cy:675},title:{x:540,y:790,maxWidth:900,align:'center',cx:540,cy:850},subtitle:{x:540,y:1020,maxWidth:860,align:'center',cx:540,cy:1060},logo:{x:385,y:65,w:310,h:221,cx:540,cy:176}},
    'faith-returns-bubble':{image:{x:0,y:0,w:1080,h:650,cx:540,cy:325},title:{x:540,y:475,maxWidth:880,align:'center',cx:540,cy:510},subtitle:{x:540,y:860,maxWidth:780,align:'center',cx:540,cy:930},logo:{x:400,y:55,w:280,h:200,cx:540,cy:155}},
    'faith-returns-split':{image:{x:547,y:0,w:533,h:1350,cx:813,cy:675},title:{x:265,y:290,maxWidth:430,align:'center',cx:265,cy:350},subtitle:{x:265,y:610,maxWidth:430,align:'center',cx:265,cy:760},logo:{x:65,y:1080,w:300,h:214,cx:215,cy:1187}},
    'faith-returns-final':{image:{x:0,y:0,w:0,h:0,cx:0,cy:0},title:{x:540,y:470,maxWidth:860,align:'center',cx:540,cy:530},subtitle:{x:540,y:840,maxWidth:820,align:'center',cx:540,cy:900},logo:{x:390,y:1080,w:300,h:214,cx:540,cy:1187}},
    'faith-disclosure-cover':{image:{x:0,y:0,w:1080,h:1350,cx:540,cy:675},title:{x:60,y:285,maxWidth:820,align:'left',cx:445,cy:365},subtitle:{x:62,y:505,maxWidth:760,align:'left',cx:430,cy:550},logo:{x:760,y:1090,w:270,h:193,cx:895,cy:1187}},
    'faith-disclosure-editorial':{image:{x:0,y:0,w:1080,h:1350,cx:540,cy:675},title:{x:58,y:175,maxWidth:930,align:'left',cx:510,cy:245},subtitle:{x:58,y:390,maxWidth:900,align:'left',cx:500,cy:620},logo:{x:760,y:1090,w:270,h:193,cx:895,cy:1187}},
    'faith-disclosure-final':{image:{x:0,y:905,w:355,h:445,cx:178,cy:1128},title:{x:540,y:450,maxWidth:850,align:'center',cx:540,cy:510},subtitle:{x:540,y:735,maxWidth:820,align:'center',cx:540,cy:790},logo:{x:805,y:1110,w:225,h:160,cx:918,cy:1190}},
    'faith-ghibli-cover':{image:{x:0,y:0,w:1080,h:1350,cx:540,cy:675},title:{x:540,y:870,maxWidth:900,align:'center',cx:540,cy:940},subtitle:{x:540,y:755,maxWidth:860,align:'center',cx:540,cy:780},logo:{x:385,y:70,w:310,h:221,cx:540,cy:180}},
    'faith-ghibli-story':{image:{x:0,y:0,w:1080,h:630,cx:540,cy:315},title:{x:540,y:790,maxWidth:860,align:'center',cx:540,cy:850},subtitle:{x:820,y:1090,maxWidth:360,align:'center',cx:820,cy:1110},logo:{x:55,y:1120,w:235,h:168,cx:172,cy:1204}},
    'faith-ghibli-character':{image:{x:0,y:0,w:1080,h:720,cx:540,cy:360},title:{x:540,y:855,maxWidth:850,align:'center',cx:540,cy:910},subtitle:{x:540,y:1090,maxWidth:780,align:'center',cx:540,cy:1130},logo:{x:55,y:1135,w:225,h:160,cx:168,cy:1215}},
    'faith-ghibli-final':{image:{x:720,y:1060,w:360,h:290,cx:900,cy:1205},title:{x:540,y:470,maxWidth:860,align:'center',cx:540,cy:530},subtitle:{x:540,y:750,maxWidth:820,align:'center',cx:540,cy:810},logo:{x:70,y:1080,w:235,h:168,cx:188,cy:1164}},
    'faith-knight-cover':{image:{x:80,y:795,w:920,h:380,cx:540,cy:985},title:{x:540,y:315,maxWidth:880,align:'center',cx:540,cy:390},subtitle:{x:540,y:640,maxWidth:820,align:'center',cx:540,cy:685},logo:{x:385,y:60,w:310,h:221,cx:540,cy:170}},
    'faith-knight-story':{image:{x:80,y:795,w:920,h:380,cx:540,cy:985},title:{x:540,y:300,maxWidth:880,align:'center',cx:540,cy:380},subtitle:{x:540,y:595,maxWidth:820,align:'center',cx:540,cy:680},logo:{x:385,y:55,w:310,h:221,cx:540,cy:166}},
    'faith-knight-verdict':{image:{x:80,y:825,w:920,h:350,cx:540,cy:1000},title:{x:540,y:300,maxWidth:870,align:'center',cx:540,cy:370},subtitle:{x:540,y:610,maxWidth:820,align:'center',cx:540,cy:690},logo:{x:385,y:55,w:310,h:221,cx:540,cy:166}},
    'faith-knight-final':{image:{x:70,y:875,w:940,h:300,cx:540,cy:1025},title:{x:540,y:365,maxWidth:860,align:'center',cx:540,cy:430},subtitle:{x:540,y:700,maxWidth:820,align:'center',cx:540,cy:760},logo:{x:385,y:55,w:310,h:221,cx:540,cy:166}},
    'faith-cinema-cover':{image:{x:0,y:900,w:1080,h:450,cx:540,cy:1125},title:{x:540,y:340,maxWidth:850,align:'center',cx:540,cy:410},subtitle:{x:540,y:630,maxWidth:790,align:'center',cx:540,cy:690},logo:{x:430,y:62,w:220,h:157,cx:540,cy:140}},
    'faith-cinema-argument':{image:{x:0,y:900,w:1080,h:450,cx:540,cy:1125},title:{x:600,y:340,maxWidth:770,align:'center',cx:600,cy:420},subtitle:{x:600,y:650,maxWidth:760,align:'center',cx:600,cy:700},logo:{x:430,y:62,w:220,h:157,cx:540,cy:140}},
    'faith-cinema-contrast':{image:{x:0,y:900,w:1080,h:450,cx:540,cy:1125},title:{x:540,y:330,maxWidth:820,align:'center',cx:540,cy:420},subtitle:{x:540,y:650,maxWidth:790,align:'center',cx:540,cy:705},logo:{x:430,y:62,w:220,h:157,cx:540,cy:140}},
    'faith-cinema-final':{image:{x:0,y:900,w:1080,h:450,cx:540,cy:1125},title:{x:540,y:355,maxWidth:830,align:'center',cx:540,cy:430},subtitle:{x:540,y:650,maxWidth:820,align:'center',cx:540,cy:720},logo:{x:430,y:62,w:220,h:157,cx:540,cy:140}},
    'faith-madmax-cover':{image:{x:0,y:0,w:1080,h:1350,cx:540,cy:675},title:{x:540,y:610,maxWidth:900,align:'center',cx:540,cy:720},subtitle:{x:540,y:950,maxWidth:820,align:'center',cx:540,cy:990},logo:{x:730,y:170,w:260,h:185,cx:860,cy:263}},
    'faith-madmax-editorial':{image:{x:0,y:0,w:1080,h:1350,cx:540,cy:675},title:{x:540,y:570,maxWidth:900,align:'center',cx:540,cy:680},subtitle:{x:540,y:930,maxWidth:820,align:'center',cx:540,cy:975},logo:{x:730,y:160,w:260,h:185,cx:860,cy:253}},
    'faith-madmax-landscape':{image:{x:0,y:0,w:1080,h:1350,cx:540,cy:675},title:{x:540,y:650,maxWidth:900,align:'center',cx:540,cy:760},subtitle:{x:540,y:960,maxWidth:820,align:'center',cx:540,cy:1005},logo:{x:730,y:155,w:260,h:185,cx:860,cy:248}},
    'faith-madmax-final':{image:{x:650,y:900,w:430,h:450,cx:865,cy:1125},title:{x:540,y:400,maxWidth:800,align:'center',cx:540,cy:470},subtitle:{x:540,y:670,maxWidth:820,align:'center',cx:540,cy:735},logo:{x:80,y:1020,w:230,h:164,cx:195,cy:1102}}
  };
  return layouts[d]||layouts['classic-cover'];
}

function layoutForElement(slide,key){
  if(key===TEMPLATE_BACK_KEY||key===TEMPLATE_FRONT_KEY||key===TEMPLATE_AUX_KEY)return{x:0,y:0,w:W,h:H,cx:W/2,cy:H/2};
  if(key&&key.startsWith('shape:')){const sh=(slide.templateShapes||[]).find(x=>x.id===key.slice(6));if(!sh)return null;return{x:sh.x,y:sh.y,w:sh.w,h:sh.h,cx:sh.x+sh.w/2,cy:sh.y+sh.h/2};}
  if(key==='number')return{x:36,y:1260,w:82,h:52,cx:77,cy:1286};
  if(key&&key.startsWith('free:')){const ft=(slide.freeTexts||[]).find(x=>x.id===key.slice(5));if(!ft)return null;return{x:ft.x,y:ft.y,maxWidth:ft.maxWidth||820,align:ft.align||'center',cx:ft.x,cy:ft.y};}
  if(key&&key.startsWith('overlay:')){const ov=(slide.overlays||[]).find(x=>x.id===key.slice(8));if(!ov)return null;return{x:ov.x-ov.w/2,y:ov.y-ov.h/2,w:ov.w,h:ov.h,cx:ov.x,cy:ov.y,rx:16};}
  const base={...(layoutFor(slide)[key]||{})};const el=slide[key];if(el?.align)base.align=el.align;if(Number.isFinite(el?.maxWidth)&&el.maxWidth>0)base.maxWidth=el.maxWidth;return base;
}

function fontCss(style){const family=String(normalizeFontName(style.font)||'Anton').replace(/[\"']/g,'');return `font-family:'${family}',sans-serif;font-size:${style.size}px;font-weight:${style.weight};font-variation-settings:'wght' ${style.weight||700};`; }
function wrapLines(text,style,maxWidth){
  const paragraphs=String(text||'').split(/\n/);const out=[];const factor=(style.width||100)/100;const limit=maxWidth/Math.max(.2,factor);
  measureCtx.font=`${style.weight||400} ${style.size||60}px "${normalizeFontName(style.font)||'Anton'}"`;
  for(const p of paragraphs){ if(!p.trim()){out.push('');continue;}let line='';for(const word of p.trim().split(/\s+/)){const test=line?`${line} ${word}`:word;if(line&&measureCtx.measureText(test).width>limit){out.push(line);line=word;}else line=test;}if(line)out.push(line); }
  return out.length?out:[''];
}
function transformAttr(state,cx,cy,rotation=0){ return `translate(${state.dx||0} ${state.dy||0}) translate(${cx} ${cy}) rotate(${rotation||0}) scale(${state.scale||1}) translate(${-cx} ${-cy})`; }
function textSvg(slide,key,style,layout){
  if(!layout)return '';
  const lines=wrapLines(style.text,style,layout.maxWidth);const anchor=layout.align==='center'?'middle':layout.align==='right'?'end':'start';
  const tspans=lines.map((line,i)=>`<tspan x="${layout.x}" dy="${i===0?0:style.size*style.lineHeight}">${esc(line)}</tspan>`).join('');
  return `<g data-element="${key}" data-cx="${layout.cx}" data-cy="${layout.cy}" opacity="${layerOpacity(slide,key)}" transform="${transformAttr(style,layout.cx,layout.cy,style.rotation||0)}"><g transform="translate(${layout.x} 0) scale(${(style.width||100)/100} 1) translate(${-layout.x} 0)"><text x="${layout.x}" y="${layout.y}" text-anchor="${anchor}" fill="${style.color}" style="${fontCss(style)}">${tspans}</text></g></g>`;
}
function imageSvg(slide,layout,clipId){
  if(!slide.image.src||!layout.w||!layout.h)return '';
  const p=cropPlacement(slide.image,layout);
  return `<g data-element="image" data-cx="${layout.cx}" data-cy="${layout.cy}" opacity="${layerOpacity(slide,'image')}" transform="${transformAttr(slide.image,layout.cx,layout.cy,(layout.rotation||0)+(slide.image.rotation||0))}"><image href="${esc(slide.image.src)}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="none" clip-path="url(#${clipId})"/></g>`;
}
function logoSvg(slide,layout){
  if(!layout.w||!layout.h)return '';
  return `<g data-element="logo" data-cx="${layout.cx}" data-cy="${layout.cy}" opacity="${layerOpacity(slide,'logo')}" transform="${transformAttr(slide.logo,layout.cx,layout.cy,slide.logo.rotation||0)}"><image href="${logoData||'assets/logo.png'}" x="${layout.x}" y="${layout.y}" width="${layout.w}" height="${layout.h}" preserveAspectRatio="xMidYMid meet"/></g>`;
}
function speechBubbleSvg(x,y,w,h,fill=COLORS.orange,shadow=COLORS.blue){ return `<rect x="${x+12}" y="${y+12}" width="${w}" height="${h}" rx="24" fill="${shadow}"/><polygon points="${x+65},${y+h-2} ${x+145},${y+h-2} ${x+82},${y+h+58}" fill="${fill}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${fill}"/>`; }
function questionSvg(cx,top){const x=cx-75,y=top;return `<rect x="${x+10}" y="${y+10}" width="150" height="130" rx="14" fill="${COLORS.blue}"/><polygon points="${x+40},${y+135} ${x+75},${y+135} ${x+52},${y+175}" fill="${COLORS.blue}"/><rect x="${x}" y="${y}" width="150" height="130" rx="14" fill="${COLORS.orange}"/><text x="${x+75}" y="${y+98}" text-anchor="middle" font-family="Arial" font-size="95" font-weight="900" fill="${COLORS.blue}">?</text>`;}
function baseAndOverlaySvg(slide){
  const d=designOf(slide),p=paletteFor(slide);
  if(d==='new-cover') return `<defs><linearGradient id="ng${slide.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.background}"/><stop offset="1" stop-color="${mixHex(p.background,COLORS.ink,.68)}"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#ng${slide.id})"/>`;
  if(d==='new-body') return `<rect width="1080" height="1350" fill="${p.surface}"/>`;
  if(d==='new-question') return usesSeparatedTemplateShapes(slide)?`<rect width="1080" height="1350" fill="${p.background}"/>`:`<rect width="1080" height="1350" fill="${p.background}"/><circle cx="940" cy="140" r="245" fill="${mixHex(p.background,p.ink,.18)}"/><circle cx="130" cy="1200" r="280" fill="${mixHex(p.background,p.ink,.18)}"/>`;
  if(d==='new-final') return usesSeparatedTemplateShapes(slide)?`<rect width="1080" height="1350" fill="${p.accent}"/>`:`<rect width="1080" height="1350" fill="${p.accent}"/><path d="M0 0 H1080 V545 L0 710 Z" fill="${p.background}"/><path d="M0 890 L1080 735 V1350 H0 Z" fill="${mixHex(p.background,p.ink,.28)}"/><circle cx="930" cy="250" r="180" fill="${mixHex(p.background,p.surface,.12)}" opacity=".75"/>`;
  if(['faith-dune-quote','faith-dune-image-top','faith-dune-final','faith-returns-split','faith-returns-final','faith-disclosure-final','faith-ghibli-story','faith-ghibli-character','faith-ghibli-final','faith-knight-cover','faith-knight-story','faith-knight-verdict','faith-knight-final','faith-cinema-cover','faith-cinema-argument','faith-cinema-contrast','faith-cinema-final','faith-madmax-final'].includes(d)) return `<rect width="1080" height="1350" fill="${p.surface}"/>`;
  if(['faith-dune-cover','faith-returns-cover','faith-returns-bubble','faith-disclosure-cover','faith-disclosure-editorial','faith-ghibli-cover','faith-madmax-cover','faith-madmax-editorial','faith-madmax-landscape'].includes(d)) return `<rect width="1080" height="1350" fill="${mixHex(p.background,p.ink,.76)}"/>`;
  if(d.startsWith('original-')) return `<rect width="1080" height="1350" fill="#202020"/>`;
  if(d==='classic-cover'||d==='classic-body'||d==='classic-question'||d==='disclosure-question'||d==='returns-question'||d==='returns-sheet-right'||d==='returns-sheet-left'||d==='returns-cards'||d==='returns-final') return `<rect width="1080" height="1350" fill="${COLORS.cream}"/>`;
  if(d==='classic-final') return `<rect width="1080" height="1350" fill="${COLORS.blue}"/><circle cx="80" cy="1230" r="260" fill="#06475e"/><circle cx="1040" cy="460" r="210" fill="#06475e"/>`;
  if(d==='disclosure-hero') return `<rect width="1080" height="1350" fill="#1c1c1c"/>`;
  if(d==='disclosure-editorial') return `<rect width="1080" height="1350" fill="#151515"/>`;
  if(d==='returns-cover') return `<rect width="1080" height="1350" fill="#777"/>`;
  if(d==='returns-big-bubble') return `<rect width="1080" height="1350" fill="#222"/>`;
  return `<rect width="1080" height="1350" fill="${COLORS.blue}"/>`;
}
function auxiliarySvg(slide){
  const d=designOf(slide);let out='';
  if(slide.kicker && (d==='disclosure-hero'||d==='disclosure-editorial'||d==='faith-disclosure-cover'||d==='faith-disclosure-editorial')) out+=`<text x="70" y="125" font-family="Archivo" font-size="36" font-weight="800" fill="${COLORS.cream}">${esc(slide.kicker.toUpperCase())}</text>`;
  if(slide.dateText && (d==='returns-sheet-right'||d==='returns-sheet-left'||d==='faith-returns-split')) out+=`<text x="${d==='returns-sheet-right'?62:d==='faith-returns-split'?55:555}" y="545" font-family="Archivo" font-size="34" font-weight="800" letter-spacing="4" fill="${COLORS.blue}">${esc(slide.dateText.toUpperCase())}</text>`;
  if(slide.bubbleText){
    if(d==='returns-cards') out+=`<text x="730" y="1110" text-anchor="middle" font-family="Archivo" font-size="32" font-weight="800" fill="${COLORS.orange}">${esc(slide.bubbleText.toUpperCase())}</text>`;
    else if(d==='returns-question') out+=`<text x="540" y="1240" text-anchor="middle" font-family="Archivo" font-size="30" font-weight="800" fill="${COLORS.blue}">${esc(slide.bubbleText.toUpperCase())}</text>`;
    else if(d.includes('question')) out+=`<text x="755" y="1200" text-anchor="middle" font-family="Archivo" font-size="28" font-weight="800" fill="${COLORS.blue}">${esc(slide.bubbleText.toUpperCase())}</text>`;
  }
  return out;
}
function numberSvg(slide){if(!project?.showNumbers)return '';const n=Math.max(1,project.slides.indexOf(slide)+1),numberText=String(slide.number?.text||n),wide=numberText.length>1,w=wide?104:82,cx=36+w/2,layout={...layoutForElement(slide,'number'),w,cx};return `<g data-element="number" data-cx="${layout.cx}" data-cy="${layout.cy}" opacity="${layerOpacity(slide,'number')}" transform="${transformAttr(slide.number,layout.cx,layout.cy,slide.number.rotation||0)}" aria-label="Slide ${numberText}"><rect x="36" y="1260" width="${w}" height="52" rx="26" fill="${COLORS.orange}"/><text x="${cx}" y="1297" text-anchor="middle" font-family="Archivo" font-size="${wide?25:28}" font-weight="850" fill="${COLORS.blue}">${esc(numberText)}</text></g>`;}
function overlaySvg(slide,key,id){const ov=(slide.overlays||[]).find(x=>`overlay:${x.id}`===key);if(!ov?.src)return '';const l=layoutForElement(slide,key),clip=`ovclip${id}${ov.id}`.replace(/[^a-zA-Z0-9]/g,''),p=cropPlacement(ov,l);return `<g data-element="${key}" data-cx="${l.cx}" data-cy="${l.cy}" opacity="${layerOpacity(slide,key)}" transform="${transformAttr(ov,l.cx,l.cy,ov.rotation||0)}"><defs><clipPath id="${clip}"><rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="${l.rx||0}"/></clipPath></defs><image href="${esc(ov.src)}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="none" clip-path="url(#${clip})"/></g>`;}
function shapePolygonPoints(shape){const pts=shape.points?.length?shape.points:[[0,0],[1,0],[1,1],[0,1]];return pts.map(([px,py])=>`${shape.x+px*shape.w},${shape.y+py*shape.h}`).join(' ');}
function bubblePath(shape){const{x,y,w,h}=shape,r=Math.min(shape.radius||32,w/4,h/4),tailW=w*clamp(shape.tailWidth||.16,.06,.4),tailH=h*clamp(shape.tailHeight||.18,.05,.35),tailX=x+w*clamp(shape.tail||.42,.12,.82);return`M ${x+r} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h-tailH-r} Q ${x+w} ${y+h-tailH} ${x+w-r} ${y+h-tailH} H ${tailX+tailW/2} L ${tailX-tailW/2} ${y+h} L ${tailX-tailW*.18} ${y+h-tailH} H ${x+r} Q ${x} ${y+h-tailH} ${x} ${y+h-tailH-r} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;}
function shapeSvg(slide,key){const sh=elementData(slide,key),l=layoutForElement(slide,key);if(!sh||!l)return'';const fill=resolveShapePaint(slide,sh.fill),stroke=resolveShapePaint(slide,sh.stroke),common=`fill="${fill}" stroke="${stroke}" stroke-width="${sh.strokeWidth||0}"`;let body='';if(sh.type==='rect')body=`<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}" rx="${sh.radius||0}" ${common}/>`;else if(sh.type==='ellipse')body=`<ellipse cx="${sh.x+sh.w/2}" cy="${sh.y+sh.h/2}" rx="${sh.w/2}" ry="${sh.h/2}" ${common}/>`;else if(sh.type==='polygon')body=`<polygon points="${shapePolygonPoints(sh)}" ${common}/>`;else if(sh.type==='bubble')body=`<path d="${bubblePath(sh)}" ${common}/>`;else if(sh.type==='label')body=`<text x="${sh.x+sh.w/2}" y="${sh.y+sh.h/2+sh.size*.34}" text-anchor="middle" fill="${fill}" font-family="${esc(sh.font||'Archivo')}" font-size="${sh.size||28}" font-weight="${sh.weight||800}">${esc(sh.text||'ETICHETTA')}</text>`;return`<g data-element="${key}" data-cx="${l.cx}" data-cy="${l.cy}" opacity="${layerOpacity(slide,key)*(sh.alpha??1)}" pointer-events="${templateEditMode?'all':'none'}" transform="${transformAttr(sh,l.cx,l.cy,sh.rotation||0)}">${body}</g>`;}
function renderElementLayerSvg(slide,key,clipId,id){
  if(!layerVisible(slide,key))return '';
  if(key==='image')return imageSvg(slide,layoutForElement(slide,'image'),clipId);
  if(key.startsWith('shape:'))return shapeSvg(slide,key);
  if(key===TEMPLATE_FRONT_KEY)return `<g data-element="${key}" data-cx="540" data-cy="675" opacity="${layerOpacity(slide,key)}">${baseAndOverlayAfterImage(slide)}</g>`;
  if(key===TEMPLATE_AUX_KEY)return `<g data-element="${key}" data-cx="540" data-cy="675" opacity="${layerOpacity(slide,key)}">${auxiliarySvg(slide)}</g>`;
  if(key==='title')return textSvg(slide,'title',slide.title,layoutForElement(slide,'title'));
  if(key==='subtitle')return textSvg(slide,'subtitle',slide.subtitle,layoutForElement(slide,'subtitle'));
  if(key==='logo')return logoSvg(slide,layoutFor(slide).logo);
  if(key==='number')return numberSvg(slide);
  if(key.startsWith('free:')){const ft=(slide.freeTexts||[]).find(x=>`free:${x.id}`===key);return ft?textSvg(slide,key,ft,layoutForElement(slide,key)):'';}
  if(key.startsWith('overlay:'))return overlaySvg(slide,key,id);
  return '';
}
function buildSvg(slide,{suffix=''}={}){
  ensureLayerModel(slide);const layout=layoutFor(slide);const id=`c${slide.id}${suffix}`.replace(/[^a-zA-Z0-9]/g,'');const clipId=`clip${id}`;
  const back=layerVisible(slide,TEMPLATE_BACK_KEY)?`<g data-element="${TEMPLATE_BACK_KEY}" data-cx="540" data-cy="675" opacity="${layerOpacity(slide,TEMPLATE_BACK_KEY)}">${baseAndOverlaySvg(slide)}</g>`:'';
  const stack=slide.layerOrder.map(key=>renderElementLayerSvg(slide,key,clipId,id)).join('');
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 1080 1350" width="1080" height="1350"><defs><clipPath id="${clipId}"><rect x="${layout.image.x}" y="${layout.image.y}" width="${layout.image.w}" height="${layout.image.h}" rx="${layout.image.rx||0}"/></clipPath></defs>${back}${stack}</svg>`;
}
function baseAndOverlayAfterImage(slide){
  const d=designOf(slide),p=paletteFor(slide);if(usesSeparatedTemplateShapes(slide))return '';
  if(d==='new-cover') return `<rect width="1080" height="1350" fill="${mixHex(p.background,p.ink,.7)}" opacity="${slide.image.src?'.38':'.16'}"/><path d="M-120 995 L1160 810 L1160 1430 L-120 1430 Z" fill="${p.accent}"/><path d="M-90 1115 L1160 930 L1160 1008 L-90 1193 Z" fill="${p.secondary}" opacity=".96"/><rect x="76" y="82" width="244" height="47" rx="24" fill="${p.surface}"/><text x="198" y="114" text-anchor="middle" fill="${p.ink}" font-family="Arial,sans-serif" font-size="22" font-weight="800">CRITICI DA BAR</text>`;
  if(d==='new-body') return `<rect x="0" y="585" width="1080" height="56" fill="${p.accent}"/><path d="M0 602 L1080 542 L1080 642 L0 642 Z" fill="${p.secondary}" opacity=".96"/><rect x="72" y="672" width="238" height="43" rx="21" fill="${p.accent}"/><text x="191" y="701" text-anchor="middle" fill="${p.ink}" font-family="Arial,sans-serif" font-size="22" font-weight="800">CRITICI DA BAR</text>`;
  if(d==='new-question') return `<path d="M118 300 H962 Q1005 300 1005 343 V773 Q1005 816 962 816 H565 L442 942 L459 816 H118 Q75 816 75 773 V343 Q75 300 118 300 Z" fill="${p.accent}" stroke="${p.secondary}" stroke-width="12"/>`;
  if(d==='new-final') return '';
  if(d.startsWith('original-')) return `<defs><linearGradient id="ob${slide.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".96"/></linearGradient><linearGradient id="ot${slide.id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".58"/></linearGradient></defs><rect y="620" width="1080" height="730" fill="url(#ob${slide.id})"/><rect width="1080" height="230" fill="url(#ot${slide.id})"/>`;
  if(d==='classic-cover') return `<rect y="790" width="1080" height="25" fill="${COLORS.orange}"/>`;
  if(d==='classic-body') return `<rect x="40" y="832" width="1000" height="18" fill="${COLORS.orange}"/>`;
  if(d==='classic-question') return `${questionSvg(540,90)}${speechBubbleSvg(500,1000,510,150)}`;
  if(d==='disclosure-hero') return `<rect width="1080" height="1350" fill="#000" opacity=".28"/><rect width="1080" height="680" fill="#000" opacity=".26"/>`;
  if(d==='disclosure-editorial') return `<defs><linearGradient id="de${slide.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".92"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs><rect width="1080" height="760" fill="url(#de${slide.id})"/>`;
  if(d==='disclosure-question') return `${questionSvg(540,70)}<text x="540" y="340" text-anchor="middle" font-family="Arial" font-size="34" font-weight="800" fill="${COLORS.blue}">SALVA IL CONTENUTO E CONDIVIDI</text>${speechBubbleSvg(500,1110,510,130)}`;
  if(d==='returns-cover') return `<defs><linearGradient id="rc${slide.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></linearGradient></defs><rect y="450" width="1080" height="900" fill="url(#rc${slide.id})"/>`;
  if(d==='returns-question') return `<defs><linearGradient id="rq${slide.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".86"/></linearGradient></defs><rect y="300" width="1080" height="320" fill="url(#rq${slide.id})"/>${speechBubbleSvg(70,710,940,470,COLORS.orange,'#c45f10')}`;
  if(d==='returns-sheet-right'||d==='returns-sheet-left') return `<rect x="${d==='returns-sheet-right'?555:495}" width="30" height="1350" fill="${COLORS.orange}"/>`;
  if(d==='returns-big-bubble') return `<rect width="1080" height="1350" fill="#000" opacity=".3"/>${speechBubbleSvg(90,150,900,1030,COLORS.cream,'#d8cfa0')}`;
  if(d==='returns-cards') return `<rect x="66" y="138" width="620" height="330" rx="24" fill="${COLORS.yellow}"/><rect x="60" y="130" width="620" height="330" rx="24" fill="#1a1a1a"/><rect x="256" y="548" width="620" height="330" rx="24" fill="${COLORS.yellow}"/><rect x="250" y="540" width="620" height="330" rx="24" fill="#1a1a1a"/><rect x="426" y="958" width="620" height="330" rx="24" fill="${COLORS.yellow}"/><rect x="420" y="950" width="620" height="330" rx="24" fill="#1a1a1a"/>`;
  if(d==='returns-final') return `${questionSvg(540,170)}`;
  return '';
}


function slideNeedsImage(slide){const design=designOf(slide);return !/(final|question|domanda|cta)/i.test(design);}

function roundedRectPath(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
function fillRect(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function drawSpeechBubble(ctx,x,y,w,h,fill=COLORS.orange,shadow=COLORS.blue){ctx.fillStyle=shadow;roundedRectPath(ctx,x+12,y+12,w,h,24);ctx.fill();ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x+65,y+h-2);ctx.lineTo(x+145,y+h-2);ctx.lineTo(x+82,y+h+58);ctx.closePath();ctx.fill();roundedRectPath(ctx,x,y,w,h,24);ctx.fill();}
function drawQuestion(ctx,cx,top){const x=cx-75,y=top;ctx.fillStyle=COLORS.blue;roundedRectPath(ctx,x+10,y+10,150,130,14);ctx.fill();ctx.beginPath();ctx.moveTo(x+40,y+135);ctx.lineTo(x+75,y+135);ctx.lineTo(x+52,y+175);ctx.closePath();ctx.fill();ctx.fillStyle=COLORS.orange;roundedRectPath(ctx,x,y,150,130,14);ctx.fill();ctx.fillStyle=COLORS.blue;ctx.font='900 95px Arial';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText('?',x+75,y+98);}
function drawImageElement(ctx,img,rect,t){if(!rect.w||!rect.h)return;t.crop=normalizeCrop({...t.crop,naturalW:t.crop?.naturalW||img.naturalWidth,naturalH:t.crop?.naturalH||img.naturalHeight});const d=cropPlacement(t,rect);ctx.save();ctx.translate(t.dx||0,t.dy||0);ctx.translate(rect.cx,rect.cy);ctx.rotate(((rect.rotation||0)+(t.rotation||0))*Math.PI/180);ctx.scale(t.scale||1,t.scale||1);ctx.translate(-rect.cx,-rect.cy);roundedRectPath(ctx,rect.x,rect.y,rect.w,rect.h,rect.rx||0);ctx.clip();ctx.drawImage(img,d.x,d.y,d.w,d.h);ctx.restore();}
function verticalGradient(ctx,y,h,from,to){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,from);g.addColorStop(1,to);ctx.fillStyle=g;ctx.fillRect(0,y,W,h);}
function drawTemplateBackCanvas(ctx,slide){
  const d=designOf(slide),p=paletteFor(slide);
  if(d==='new-cover'){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,p.background);g.addColorStop(1,mixHex(p.background,p.ink,.68));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);return;}
  if(d==='new-body'){fillRect(ctx,p.surface,0,0,W,H);return;}
  if(d==='new-question'){fillRect(ctx,p.background,0,0,W,H);if(!usesSeparatedTemplateShapes(slide)){ctx.fillStyle=mixHex(p.background,p.ink,.18);ctx.beginPath();ctx.arc(940,140,245,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(130,1200,280,0,Math.PI*2);ctx.fill();}return;}
  if(d==='new-final'){fillRect(ctx,p.accent,0,0,W,H);if(!usesSeparatedTemplateShapes(slide)){ctx.fillStyle=p.background;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(1080,0);ctx.lineTo(1080,545);ctx.lineTo(0,710);ctx.closePath();ctx.fill();ctx.fillStyle=mixHex(p.background,p.ink,.28);ctx.beginPath();ctx.moveTo(0,890);ctx.lineTo(1080,735);ctx.lineTo(1080,1350);ctx.lineTo(0,1350);ctx.closePath();ctx.fill();ctx.fillStyle=mixHex(p.background,p.surface,.12);ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(930,250,180,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}return;}
  if(['faith-dune-quote','faith-dune-image-top','faith-dune-final','faith-returns-split','faith-returns-final','faith-disclosure-final','faith-ghibli-story','faith-ghibli-character','faith-ghibli-final','faith-knight-cover','faith-knight-story','faith-knight-verdict','faith-knight-final','faith-cinema-cover','faith-cinema-argument','faith-cinema-contrast','faith-cinema-final','faith-madmax-final'].includes(d))return fillRect(ctx,p.surface,0,0,W,H);
  if(['faith-dune-cover','faith-returns-cover','faith-returns-bubble','faith-disclosure-cover','faith-disclosure-editorial','faith-ghibli-cover','faith-madmax-cover','faith-madmax-editorial','faith-madmax-landscape'].includes(d))return fillRect(ctx,mixHex(p.background,p.ink,.76),0,0,W,H);
  if(d.startsWith('original-'))return fillRect(ctx,'#202020',0,0,W,H);
  if(['classic-cover','classic-body','classic-question','disclosure-question','returns-question','returns-sheet-right','returns-sheet-left','returns-cards','returns-final'].includes(d))return fillRect(ctx,COLORS.cream,0,0,W,H);
  if(d==='classic-final'){fillRect(ctx,COLORS.blue,0,0,W,H);ctx.fillStyle='#06475e';ctx.beginPath();ctx.arc(80,1230,260,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(1040,460,210,0,Math.PI*2);ctx.fill();return;}
  if(d==='disclosure-hero')return fillRect(ctx,'#1c1c1c',0,0,W,H);if(d==='disclosure-editorial')return fillRect(ctx,'#151515',0,0,W,H);if(d==='returns-cover')return fillRect(ctx,'#777',0,0,W,H);if(d==='returns-big-bubble')return fillRect(ctx,'#222',0,0,W,H);fillRect(ctx,COLORS.blue,0,0,W,H);
}
function drawTemplateFrontCanvas(ctx,slide){
  const d=designOf(slide),p=paletteFor(slide);if(usesSeparatedTemplateShapes(slide))return;
  if(d==='new-cover'){fillRect(ctx,slide.image.src?mixHex(p.background,p.ink,.7)+'61':mixHex(p.background,p.ink,.7)+'29',0,0,W,H);ctx.fillStyle=p.accent;ctx.beginPath();ctx.moveTo(-120,995);ctx.lineTo(1160,810);ctx.lineTo(1160,1430);ctx.lineTo(-120,1430);ctx.closePath();ctx.fill();ctx.fillStyle=p.secondary;ctx.globalAlpha=.96;ctx.beginPath();ctx.moveTo(-90,1115);ctx.lineTo(1160,930);ctx.lineTo(1160,1008);ctx.lineTo(-90,1193);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=p.surface;roundedRectPath(ctx,76,82,244,47,24);ctx.fill();ctx.fillStyle=p.ink;ctx.font='800 22px Arial';ctx.textAlign='center';ctx.fillText('CRITICI DA BAR',198,114);return;}
  if(d==='new-body'){fillRect(ctx,p.accent,0,585,W,56);ctx.fillStyle=p.secondary;ctx.globalAlpha=.96;ctx.beginPath();ctx.moveTo(0,602);ctx.lineTo(1080,542);ctx.lineTo(1080,642);ctx.lineTo(0,642);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=p.accent;roundedRectPath(ctx,72,672,238,43,21);ctx.fill();ctx.fillStyle=p.ink;ctx.font='800 22px Arial';ctx.textAlign='center';ctx.fillText('CRITICI DA BAR',191,701);return;}
  if(d==='new-question'){ctx.fillStyle=p.accent;ctx.strokeStyle=p.secondary;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(118,300);ctx.lineTo(962,300);ctx.quadraticCurveTo(1005,300,1005,343);ctx.lineTo(1005,773);ctx.quadraticCurveTo(1005,816,962,816);ctx.lineTo(565,816);ctx.lineTo(442,942);ctx.lineTo(459,816);ctx.lineTo(118,816);ctx.quadraticCurveTo(75,816,75,773);ctx.lineTo(75,343);ctx.quadraticCurveTo(75,300,118,300);ctx.closePath();ctx.fill();ctx.stroke();return;}
  if(d==='new-final')return;
  if(d.startsWith('original-')){verticalGradient(ctx,620,730,'rgba(0,0,0,0)','rgba(0,0,0,.96)');verticalGradient(ctx,0,230,'rgba(0,0,0,.58)','rgba(0,0,0,0)');return;}
  if(d==='classic-cover')return fillRect(ctx,COLORS.orange,0,790,W,25);
  if(d==='classic-body')return fillRect(ctx,COLORS.orange,40,832,1000,18);
  if(d==='classic-question'){drawQuestion(ctx,540,90);drawSpeechBubble(ctx,500,1000,510,150);return;}
  if(d==='disclosure-hero'){fillRect(ctx,'rgba(0,0,0,.28)',0,0,W,H);fillRect(ctx,'rgba(0,0,0,.26)',0,0,W,680);return;}
  if(d==='disclosure-editorial'){verticalGradient(ctx,0,760,'rgba(0,0,0,.92)','rgba(0,0,0,.35)');return;}
  if(d==='disclosure-question'){drawQuestion(ctx,540,70);ctx.fillStyle=COLORS.blue;ctx.font='800 34px Arial';ctx.textAlign='center';ctx.fillText('SALVA IL CONTENUTO E CONDIVIDI',540,340);drawSpeechBubble(ctx,500,1110,510,130);return;}
  if(d==='returns-cover'){verticalGradient(ctx,450,900,'rgba(0,0,0,.05)','rgba(0,0,0,.9)');return;}
  if(d==='returns-question'){verticalGradient(ctx,300,320,'rgba(0,0,0,0)','rgba(0,0,0,.86)');drawSpeechBubble(ctx,70,710,940,470,COLORS.orange,'#c45f10');return;}
  if(d==='returns-sheet-right'||d==='returns-sheet-left'){fillRect(ctx,COLORS.orange,d==='returns-sheet-right'?555:495,0,30,H);return;}
  if(d==='returns-big-bubble'){fillRect(ctx,'rgba(0,0,0,.3)',0,0,W,H);drawSpeechBubble(ctx,90,150,900,1030,COLORS.cream,'#d8cfa0');return;}
  if(d==='returns-cards'){const cards=[[60,130],[250,540],[420,950]];cards.forEach(([x,y])=>{ctx.fillStyle=COLORS.yellow;roundedRectPath(ctx,x+6,y+8,620,330,24);ctx.fill();ctx.fillStyle='#1a1a1a';roundedRectPath(ctx,x,y,620,330,24);ctx.fill();});return;}
  if(d==='returns-final')drawQuestion(ctx,540,170);
}
function drawTextCanvas(ctx,style,layout){const lines=wrapLines(style.text,style,layout.maxWidth);ctx.save();ctx.translate(style.dx||0,style.dy||0);ctx.translate(layout.cx,layout.cy);ctx.rotate((style.rotation||0)*Math.PI/180);ctx.scale(style.scale||1,style.scale||1);ctx.translate(-layout.cx,-layout.cy);ctx.translate(layout.x,0);ctx.scale((style.width||100)/100,1);ctx.translate(-layout.x,0);ctx.font=`${style.weight||400} ${style.size||60}px "${normalizeFontName(style.font)||'Anton'}"`;ctx.fillStyle=style.color;ctx.textAlign=layout.align;ctx.textBaseline='alphabetic';lines.forEach((line,i)=>ctx.fillText(line,layout.x,layout.y+i*style.size*style.lineHeight));ctx.restore();}
function drawLogoElementCanvas(ctx,img,layout,state){ctx.save();ctx.translate(state.dx||0,state.dy||0);ctx.translate(layout.cx,layout.cy);ctx.rotate((state.rotation||0)*Math.PI/180);ctx.scale(state.scale||1,state.scale||1);ctx.translate(-layout.cx,-layout.cy);ctx.drawImage(img,layout.x,layout.y,layout.w,layout.h);ctx.restore();}
function drawAuxiliaryCanvas(ctx,slide){const d=designOf(slide);ctx.save();if(slide.kicker&&(d==='disclosure-hero'||d==='disclosure-editorial'||d==='faith-disclosure-cover'||d==='faith-disclosure-editorial')){ctx.font='800 36px Archivo';ctx.fillStyle=COLORS.cream;ctx.textAlign='left';ctx.fillText(slide.kicker.toUpperCase(),70,125);}if(slide.dateText&&(d==='returns-sheet-right'||d==='returns-sheet-left'||d==='faith-returns-split')){ctx.font='800 34px Archivo';ctx.fillStyle=COLORS.blue;ctx.textAlign='left';ctx.fillText(slide.dateText.toUpperCase(),d==='returns-sheet-right'?62:d==='faith-returns-split'?55:555,545);}if(slide.bubbleText){ctx.font='800 30px Archivo';ctx.fillStyle=d==='returns-cards'?COLORS.orange:COLORS.blue;ctx.textAlign='center';if(d==='returns-cards')ctx.fillText(slide.bubbleText.toUpperCase(),730,1110);else if(d==='returns-question')ctx.fillText(slide.bubbleText.toUpperCase(),540,1240);else if(d.includes('question'))ctx.fillText(slide.bubbleText.toUpperCase(),755,1200);}ctx.restore();}
function drawShapeCanvas(ctx,slide,key){const sh=elementData(slide,key),l=layoutForElement(slide,key);if(!sh||!l)return;ctx.save();ctx.globalAlpha*=sh.alpha??1;ctx.translate(sh.dx||0,sh.dy||0);ctx.translate(l.cx,l.cy);ctx.rotate((sh.rotation||0)*Math.PI/180);ctx.scale(sh.scale||1,sh.scale||1);ctx.translate(-l.cx,-l.cy);ctx.fillStyle=resolveShapePaint(slide,sh.fill);ctx.strokeStyle=resolveShapePaint(slide,sh.stroke);ctx.lineWidth=sh.strokeWidth||0;if(sh.type==='rect'){roundedRectPath(ctx,sh.x,sh.y,sh.w,sh.h,sh.radius||0);ctx.fill();if(sh.stroke!=='none'&&sh.strokeWidth)ctx.stroke();}else if(sh.type==='ellipse'){ctx.beginPath();ctx.ellipse(sh.x+sh.w/2,sh.y+sh.h/2,sh.w/2,sh.h/2,0,0,Math.PI*2);ctx.fill();if(sh.stroke!=='none'&&sh.strokeWidth)ctx.stroke();}else if(sh.type==='polygon'){const pts=sh.points?.length?sh.points:[[0,0],[1,0],[1,1],[0,1]];ctx.beginPath();pts.forEach(([px,py],i)=>{const x=sh.x+px*sh.w,y=sh.y+py*sh.h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();if(sh.stroke!=='none'&&sh.strokeWidth)ctx.stroke();}else if(sh.type==='bubble'){const path=new Path2D(bubblePath(sh));ctx.fill(path);if(sh.stroke!=='none'&&sh.strokeWidth)ctx.stroke(path);}else if(sh.type==='label'){ctx.font=`${sh.weight||800} ${sh.size||28}px "${sh.font||'Archivo'}"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sh.text||'ETICHETTA',sh.x+sh.w/2,sh.y+sh.h/2);}ctx.restore();}
async function drawElementLayerCanvas(ctx,slide,key){
  if(!layerVisible(slide,key))return;ctx.save();ctx.globalAlpha*=layerOpacity(slide,key);
  if(key==='image'&&slide.image.src){const img=await loadImage(slide.image.src);drawImageElement(ctx,img,layoutForElement(slide,'image'),slide.image);}
  else if(key.startsWith('shape:'))drawShapeCanvas(ctx,slide,key);
  else if(key===TEMPLATE_FRONT_KEY)drawTemplateFrontCanvas(ctx,slide);
  else if(key===TEMPLATE_AUX_KEY)drawAuxiliaryCanvas(ctx,slide);
  else if(key==='title')drawTextCanvas(ctx,slide.title,layoutForElement(slide,'title'));
  else if(key==='subtitle')drawTextCanvas(ctx,slide.subtitle,layoutForElement(slide,'subtitle'));
  else if(key==='logo'){const logo=await loadImage(logoData||'assets/logo.png');drawLogoElementCanvas(ctx,logo,layoutForElement(slide,'logo'),slide.logo);}
  else if(key==='number'&&project.showNumbers){const n=Math.max(1,project.slides.indexOf(slide)+1),numberText=String(slide.number?.text||n),wide=numberText.length>1,w=wide?104:82,cx=36+w/2,layout={...layoutForElement(slide,'number'),w,cx},state=slide.number;ctx.save();ctx.translate(state.dx||0,state.dy||0);ctx.translate(layout.cx,layout.cy);ctx.rotate((state.rotation||0)*Math.PI/180);ctx.scale(state.scale||1,state.scale||1);ctx.translate(-layout.cx,-layout.cy);ctx.fillStyle=COLORS.orange;roundedRectPath(ctx,36,1260,w,52,26);ctx.fill();ctx.fillStyle=COLORS.blue;ctx.font=`850 ${wide?25:28}px Archivo`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(numberText,cx,1286);ctx.restore();}
  else if(key.startsWith('free:')){const ft=elementData(slide,key);if(ft)drawTextCanvas(ctx,ft,layoutForElement(slide,key));}
  else if(key.startsWith('overlay:')){const ov=elementData(slide,key);if(ov?.src){const img=await loadImage(ov.src);drawImageElement(ctx,img,layoutForElement(slide,key),ov);}}
  ctx.restore();
}
const QUALITY_SAFE_MARGIN=54;
const QUALITY_TEXT_LIMITS={
  'original-cover':{title:330,subtitle:150},'original-body':{title:320,subtitle:160},'original-final':{title:330,subtitle:160},
  'classic-cover':{title:300,subtitle:110},'classic-body':{title:250,subtitle:140},'classic-question':{title:300,subtitle:110},'classic-final':{title:360,subtitle:140},
  'disclosure-hero':{title:430,subtitle:150},'disclosure-editorial':{title:240,subtitle:430},'disclosure-question':{title:230,subtitle:190},
  'returns-cover':{title:310,subtitle:120},'returns-question':{title:180,subtitle:310},'returns-sheet-right':{title:300,subtitle:380},'returns-sheet-left':{title:300,subtitle:380},
  'returns-big-bubble':{title:180,subtitle:470},'returns-cards':{title:170,subtitle:170},'returns-final':{title:300,subtitle:140},
  'new-cover':{title:420,subtitle:180},'new-body':{title:210,subtitle:300},'new-question':{title:350,subtitle:170},'new-final':{title:380,subtitle:170},
  'faith-dune-cover':{title:330,subtitle:120},'faith-dune-quote':{title:260,subtitle:310},'faith-dune-image-top':{title:210,subtitle:300},'faith-dune-final':{title:250,subtitle:180},
  'faith-returns-cover':{title:270,subtitle:150},'faith-returns-bubble':{title:170,subtitle:290},'faith-returns-split':{title:240,subtitle:430},'faith-returns-final':{title:250,subtitle:180},
  'faith-disclosure-cover':{title:300,subtitle:120},'faith-disclosure-editorial':{title:170,subtitle:460},'faith-disclosure-final':{title:250,subtitle:180},
  'faith-ghibli-cover':{title:300,subtitle:130},'faith-ghibli-story':{title:260,subtitle:90},'faith-ghibli-character':{title:250,subtitle:140},'faith-ghibli-final':{title:240,subtitle:180},
  'faith-knight-cover':{title:270,subtitle:150},'faith-knight-story':{title:260,subtitle:270},'faith-knight-verdict':{title:250,subtitle:260},'faith-knight-final':{title:250,subtitle:180},
  'faith-cinema-cover':{title:240,subtitle:170},'faith-cinema-argument':{title:260,subtitle:190},'faith-cinema-contrast':{title:250,subtitle:190},'faith-cinema-final':{title:230,subtitle:220},
  'faith-madmax-cover':{title:320,subtitle:150},'faith-madmax-editorial':{title:320,subtitle:150},'faith-madmax-landscape':{title:310,subtitle:150},'faith-madmax-final':{title:230,subtitle:180}
};

