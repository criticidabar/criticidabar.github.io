'use strict';

const W = 1080;
const H = 1350;
const SVG_NS = 'http://www.w3.org/2000/svg';
const COLORS = { orange:'#ff6f00', cream:'#fff6ea', blue:'#005c78', ink:'#111111', yellow:'#f4c430', white:'#ffffff' };
const DB_NAME = 'cdb-studio';
const DB_VERSION = 5;
const CURRENT_KEY = 'current';

const FAMILIES = {
  n: { label:'NUOVO CdB', variants:{
    copertina:{label:'Copertina diagonale',description:'Il nuovo stile blu e arancione con foto piena, etichetta e diagonali.',design:'new-cover'},
    corpo:{label:'Corpo editoriale',description:'Foto superiore, tag Critici da Bar e testo pulito su crema.',design:'new-body'},
    domanda:{label:'Domanda fumetto',description:'Grande fumetto arancione su fondo blu, pensato per le CTA.',design:'new-question'},
    finale:{label:'Finale diagonale',description:'Chiusura grafica blu e arancione con CTA e logo.',design:'new-final'}
  }},
  o: { label:'ORIGINALE', variants:{
    copertina:{label:'Copertina',description:'Foto piena, logo alto e titolo forte in basso.',design:'original-cover'},
    corpo:{label:'Corpo',description:'Foto piena con testo e accento arancione.',design:'original-body'},
    finale:{label:'Finale',description:'Chiusura scura con titolo arancione.',design:'original-final'}
  }},
  c: { label:'CLASSICO CdB', variants:{
    copertina:{label:'Copertina',description:'Crema, titolo centrale e foto ampia in basso.',design:'classic-cover'},
    corpo:{label:'Corpo',description:'Titolo pulito e immagine incorniciata.',design:'classic-body'},
    domanda:{label:'Domanda',description:'Domanda centrale con fumetto e foto ritagliata.',design:'classic-question'},
    finale:{label:'Finale',description:'Sfondo blu, CTA arancione e logo centrale.',design:'classic-final'}
  }},
  d: { label:'DISCLOSURE', variants:{
    hero:{label:'Hero',description:'Titolo editoriale sopra una foto a pieno formato.',design:'disclosure-hero'},
    editoriale:{label:'Editoriale',description:'Fascia scura, testo lungo e foto protagonista.',design:'disclosure-editorial'},
    domanda:{label:'Domanda / CTA',description:'Domanda chiara con foto e invito all’azione.',design:'disclosure-question'}
  }},
  r: { label:'RITORNI IN SALA', variants:{
    copertina:{label:'Copertina',description:'Foto piena e titolo cinematografico su fascia scura.',design:'returns-cover'},
    domanda_fumetto:{label:'Domanda + fumetto',description:'Foto superiore e grande fumetto arancione.',design:'returns-question'},
    scheda_dx:{label:'Scheda foto DX',description:'Testo a sinistra e fotografia a destra.',design:'returns-sheet-right'},
    scheda_sx:{label:'Scheda foto SX',description:'Fotografia a sinistra e testo a destra.',design:'returns-sheet-left'},
    fumettone:{label:'Fumettone',description:'Foto piena con grande pannello crema centrale.',design:'returns-big-bubble'},
    card_nere:{label:'Card nere',description:'Tre schede nere sovrapposte su fondo crema.',design:'returns-cards'},
    finale:{label:'Finale',description:'Domanda e CTA su fondo crema.',design:'returns-final'}
  }}
};

const DEFAULT_VARIANT = { n:'copertina', o:'copertina', c:'copertina', d:'hero', r:'copertina' };
const $ = id => document.getElementById(id);
const canvas = $('canvas');
const measureCanvas = document.createElement('canvas');
const measureCtx = measureCanvas.getContext('2d');

let project;
let currentIndex = 0;
let selected = 'title';
let activeTab = 'content';
let saveTimer = null;
let toastTimer = null;
let history = [];
let historyIndex = -1;
let imageLibrary = [];
let personalTemplates = [];
let logoData = '';
let initialized = false;
let searchResults = [];
const historyImagePool = new Map();
const pointers = new Map();
let gesture = null;
let lastTap = { time:0, key:'' };
let pendingImportImage = '';

function uid(){ return Math.random().toString(36).slice(2,10); }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
function esc(v=''){ return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function slug(v){ return String(v||'carosello').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'carosello'; }
function currentSlide(){ return project.slides[currentIndex]; }
function isFreeSelected(){return typeof selected==='string'&&selected.startsWith('free:');}
function isOverlaySelected(){return typeof selected==='string'&&selected.startsWith('overlay:');}
function isTextSelected(){return selected==='title'||selected==='subtitle'||isFreeSelected();}
function selectedFreeId(){return isFreeSelected()?selected.slice(5):'';}
function selectedOverlayId(){return isOverlaySelected()?selected.slice(8):'';}
function currentElement(){const slide=currentSlide();if(!slide)return null;if(isFreeSelected())return (slide.freeTexts||[]).find(x=>x.id===selectedFreeId())||null;if(isOverlaySelected())return (slide.overlays||[]).find(x=>x.id===selectedOverlayId())||null;return slide[selected]||null;}
function templateSpec(slide){ return FAMILIES[slide.family]?.variants?.[slide.variant] || FAMILIES.c.variants.copertina; }
function designOf(slide){ return templateSpec(slide).design; }
function transformDefaults(){ return {dx:0,dy:0,scale:1,rotation:0}; }
function normalizeFontName(value){const name=String(value||'').trim();if(!name)return 'Anton';if(/nickel\s*gothic/i.test(name))return 'Anton';return ['Anton','Anybody','Archivo','Saira'].includes(name)?name:'Anton';}
function normalizeTextStyle(value={}){const out={...value,font:normalizeFontName(value.font)};if(out.font==='Anton')out.weight=400;return out;}
function textDefaults(overrides={}){ return normalizeTextStyle({text:'',font:'Anton',size:88,weight:400,width:90,lineHeight:.94,color:COLORS.cream,align:null,maxWidth:null,...transformDefaults(),...overrides}); }
function freeTextDefaults(overrides={}){return normalizeTextStyle({id:uid(),x:540,y:675,text:'NUOVO TESTO',font:'Anton',size:72,weight:400,width:90,lineHeight:1,color:COLORS.orange,align:'center',maxWidth:820,...transformDefaults(),...overrides});}
function normalizeFreeText(value,index=0){const mapColor={'%%BLUE%%':COLORS.blue,'%%ORANGE%%':COLORS.orange,'%%CREAM%%':COLORS.cream};return freeTextDefaults({id:value?.id||uid(),text:value?.text??value?.t??'NUOVO TESTO',x:Number(value?.x??540),y:Number(value?.y??(600+index*90)),dx:Number(value?.dx||0),dy:Number(value?.dy||0),scale:Number(value?.scale??value?.s??1),rotation:Number(value?.rotation||0),size:Number(value?.size??value?.fs??72),color:mapColor[value?.color??value?.c]||value?.color||value?.c||COLORS.orange,font:normalizeFontName(value?.font||value?.f||'Anton'),weight:Number(value?.weight||400),width:Number(value?.width||90),lineHeight:Number(value?.lineHeight||1),align:value?.align||'center',maxWidth:Number(value?.maxWidth||820)});}
function overlayDefaults(overrides={}){return {id:uid(),src:'',name:'Foto libera',x:540,y:675,w:430,h:430,...transformDefaults(),...overrides};}
function normalizeOverlay(value,index=0){return overlayDefaults({id:value?.id||uid(),src:value?.src||value?.data||'',name:value?.name||value?.file||`Foto libera ${index+1}`,x:Number(value?.x??540),y:Number(value?.y??675),w:Number(value?.w??430),h:Number(value?.h??430),dx:Number(value?.dx||0),dy:Number(value?.dy||0),scale:Number(value?.scale??value?.s??1),rotation:Number(value?.rotation||0)});}

function defaultsFor(family,variant){
  const design = FAMILIES[family]?.variants?.[variant]?.design || 'classic-cover';
  const map = {
    'new-cover':{title:{size:96,color:COLORS.cream,width:90},subtitle:{size:44,weight:650,color:COLORS.cream,width:100,lineHeight:1.08}},
    'new-body':{title:{size:67,color:COLORS.blue,width:94},subtitle:{size:38,weight:520,color:COLORS.ink,width:100,lineHeight:1.16}},
    'new-question':{title:{size:104,color:COLORS.blue,width:88},subtitle:{size:48,weight:650,color:COLORS.cream,width:100,lineHeight:1.05}},
    'new-final':{title:{size:92,color:COLORS.cream,width:88},subtitle:{size:42,weight:720,color:COLORS.cream,width:100,lineHeight:1.08}},
    'original-cover':{title:{size:82,color:COLORS.cream,width:92},subtitle:{size:34,weight:600,color:COLORS.cream,width:100,lineHeight:1.1}},
    'original-body':{title:{size:76,color:COLORS.cream,width:92},subtitle:{size:36,weight:650,color:COLORS.orange,width:100,lineHeight:1.12}},
    'original-final':{title:{size:88,color:COLORS.orange,width:92},subtitle:{size:38,weight:650,color:COLORS.cream,width:100,lineHeight:1.1}},
    'classic-cover':{title:{size:88,color:COLORS.orange,width:92},subtitle:{size:36,weight:560,color:COLORS.blue,width:100,lineHeight:1.12}},
    'classic-body':{title:{size:70,color:COLORS.blue,width:94},subtitle:{size:36,weight:520,color:COLORS.ink,width:100,lineHeight:1.16}},
    'classic-question':{title:{size:84,color:COLORS.blue,width:90},subtitle:{size:36,weight:700,color:COLORS.blue,width:100,lineHeight:1.08}},
    'classic-final':{title:{size:90,color:COLORS.orange,width:92},subtitle:{size:40,weight:620,color:COLORS.cream,width:100,lineHeight:1.1}},
    'disclosure-hero':{title:{size:112,color:COLORS.orange,width:90},subtitle:{size:42,weight:680,color:COLORS.cream,width:100,lineHeight:1.06}},
    'disclosure-editorial':{title:{size:62,color:COLORS.orange,width:94},subtitle:{size:40,weight:500,color:COLORS.cream,width:100,lineHeight:1.16}},
    'disclosure-question':{title:{size:82,color:COLORS.orange,width:92},subtitle:{size:54,weight:850,color:COLORS.blue,width:92,lineHeight:1.04}},
    'returns-cover':{title:{size:92,color:COLORS.cream,width:92},subtitle:{size:46,weight:760,color:COLORS.yellow,width:100,lineHeight:1.05}},
    'returns-question':{title:{size:76,color:COLORS.cream,width:92},subtitle:{size:42,weight:680,color:COLORS.blue,width:92,lineHeight:1.12}},
    'returns-sheet-right':{title:{size:76,color:COLORS.orange,width:92},subtitle:{size:38,weight:540,color:COLORS.orange,width:100,lineHeight:1.16}},
    'returns-sheet-left':{title:{size:76,color:COLORS.orange,width:92},subtitle:{size:38,weight:540,color:COLORS.orange,width:100,lineHeight:1.16}},
    'returns-big-bubble':{title:{size:58,color:COLORS.yellow,width:92},subtitle:{size:38,weight:520,color:COLORS.blue,width:100,lineHeight:1.18}},
    'returns-cards':{title:{size:40,color:COLORS.yellow,width:92},subtitle:{size:32,weight:520,color:COLORS.white,width:100,lineHeight:1.18}},
    'returns-final':{title:{size:82,color:COLORS.orange,width:92},subtitle:{size:44,weight:680,color:COLORS.blue,width:100,lineHeight:1.1}}
  };
  return map[design] || map['classic-cover'];
}

function createSlide(family='c',variant='copertina'){
  const defs = defaultsFor(family,variant);
  return {
    id:uid(),family,variant,kicker:'',dateText:'',bubbleText:'',
    image:{src:'',...transformDefaults()},logo:{...transformDefaults()},freeTexts:[],overlays:[],
    title:textDefaults({text:'5 FILM CHE MERITAVANO MOLTO DI PIÙ',...defs.title}),
    subtitle:textDefaults({text:'Una selezione firmata Critici da Bar',...defs.subtitle})
  };
}

function newProject(){
  const a=createSlide('c','copertina');
  const b=createSlide('c','corpo'); b.title.text='UN FILM CHE NON HA AVUTO IL SUCCESSO CHE MERITAVA'; b.subtitle.text='Qui puoi inserire il testo della slide.';
  const c=createSlide('c','domanda'); c.title.text='E VOI CHE NE PENSATE?'; c.subtitle.text='Diteci la vostra nei commenti';
  return {version:'0.6.0',name:'Nuovo carosello',showNumbers:false,slides:[a,b,c]};
}

function normalizeSlide(value){
  let family=value?.family||'c'; let variant=value?.variant;
  if(!variant){
    const old=value?.type||'cover';
    variant = old==='body'?'corpo':old==='question'?'domanda':old==='final'?'finale':'copertina';
    if(!FAMILIES[family]?.variants?.[variant]){ family='c'; variant=old==='body'?'corpo':old==='question'?'domanda':old==='final'?'finale':'copertina'; }
  }
  if(!FAMILIES[family]) family='c';
  if(!FAMILIES[family].variants[variant]) variant=DEFAULT_VARIANT[family];
  const base=createSlide(family,variant);
  const freeSource=value?.freeTexts||value?.texts||[];
  const overlaySource=value?.overlays||[];
  return {...base,...value,family,variant,
    image:{...base.image,...(value?.image||{})},logo:{...base.logo,...(value?.logo||{})},
    title:normalizeTextStyle({...base.title,...(value?.title||{})}),subtitle:normalizeTextStyle({...base.subtitle,...(value?.subtitle||{})}),
    freeTexts:Array.isArray(freeSource)?freeSource.map(normalizeFreeText):[],
    overlays:Array.isArray(overlaySource)?overlaySource.map(normalizeOverlay):[]
  };
}

function migrateLegacyProject(parsed){
  if(parsed?.client?.st && Array.isArray(parsed.slides)){
    const st=parsed.client.st, order=parsed.client.order||parsed.slides.map((_,i)=>i);
    const slides=order.map(oldIndex=>{
      const source=parsed.slides[oldIndex]||{}; const old=st[String(oldIndex)]||st[oldIndex]||{};
      const fam=old.tpl?.f&&FAMILIES[old.tpl.f]?old.tpl.f:'c';
      const variant=old.tpl?.v&&FAMILIES[fam].variants[old.tpl.v]?old.tpl.v:(source.slideType==='cover'?'copertina':source.slideType==='end'?'finale':source.slideType==='question'?'domanda':'corpo');
      const s=createSlide(fam,FAMILIES[fam].variants[variant]?variant:DEFAULT_VARIANT[fam]);
      s.title.text=source.mainText||source.postTitle||s.title.text; s.subtitle.text=source.subText||'';
      s.kicker=source.kicker||source.postLabel||''; s.dateText=source.dateText||''; s.bubbleText=source.bubbleText||'';
      if(old.imgT) s.image={...s.image,dx:old.imgT.dx||0,dy:old.imgT.dy||0,scale:old.imgT.s||1};
      if(old.logoT) s.logo={...s.logo,dx:old.logoT.dx||0,dy:old.logoT.dy||0,scale:old.logoT.s||1};
      if(Array.isArray(old.texts))s.freeTexts=old.texts.map(normalizeFreeText);
      if(Array.isArray(old.overlays))s.overlays=old.overlays.map(normalizeOverlay);
      return s;
    });
    return {version:'0.6.0',name:parsed.slides[0]?.postTitle||'Progetto importato',showNumbers:Boolean(parsed.client.globalNum),slides};
  }
  return parsed;
}

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('projects')) db.createObjectStore('projects');
      if(!db.objectStoreNames.contains('images')) db.createObjectStore('images');
      if(!db.objectStoreNames.contains('templates')) db.createObjectStore('templates');
    };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function storeGet(store,key){ const db=await openDb(); return new Promise((resolve,reject)=>{const r=db.transaction(store,'readonly').objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); }
async function storePut(store,key,value){ const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);}); }
async function storeDelete(store,key){ const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);}); }
async function storeClear(store){ const db=await openDb(); return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);}); }
async function storeAll(store){ const db=await openDb(); return new Promise((resolve,reject)=>{const r=db.transaction(store,'readonly').objectStore(store).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);}); }

async function loadState(){
  try{
    let saved=await storeGet('projects',CURRENT_KEY);
    if(!saved) saved=newProject();
    saved=migrateLegacyProject(saved);
    saved.version='0.6.0';saved.slides=(saved.slides||[]).map(normalizeSlide);
    if(!saved.slides.length) saved.slides=[createSlide()];
    imageLibrary=await storeAll('images');
    personalTemplates=await storeAll('templates');
    return saved;
  }catch(error){ console.warn(error); return newProject(); }
}

function showToast(message){ const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300); }
function setStatus(message,kind=''){ const el=$('imageSearchStatus');el.textContent=message;el.className=`inline-status${kind?' '+kind:''}`; }
function markDirty(){ $('saveStatus').textContent='salvataggio…';clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await storePut('projects',CURRENT_KEY,deepClone(project));$('saveStatus').textContent='salvato sul dispositivo';}catch(e){console.error(e);$('saveStatus').textContent='errore salvataggio';}},350); }
function imageAssetKey(src){ let h=2166136261;const step=Math.max(1,Math.floor(src.length/2048));for(let i=0;i<src.length;i+=step){h^=src.charCodeAt(i);h=Math.imul(h,16777619);}return `asset:${src.length}:${(h>>>0).toString(36)}`; }
function snapshot(){ const p=deepClone(project);p.slides.forEach(s=>{if(s.image?.src?.startsWith('data:')){const k=imageAssetKey(s.image.src);historyImagePool.set(k,s.image.src);s.image.src=k;}(s.overlays||[]).forEach(ov=>{if(ov.src?.startsWith('data:')){const k=imageAssetKey(ov.src);historyImagePool.set(k,ov.src);ov.src=k;}});});return JSON.stringify(p); }
function fromSnapshot(raw){ const p=JSON.parse(raw);p.slides.forEach(s=>{if(s.image?.src?.startsWith('asset:'))s.image.src=historyImagePool.get(s.image.src)||'';(s.overlays||[]).forEach(ov=>{if(ov.src?.startsWith('asset:'))ov.src=historyImagePool.get(ov.src)||'';});});return p; }
function commitHistory(){ const s=snapshot();if(history[historyIndex]===s)return;history=history.slice(0,historyIndex+1);history.push(s);if(history.length>20)history.shift();historyIndex=history.length-1;updateUndoRedo();markDirty(); }
function restoreHistory(index){ if(index<0||index>=history.length)return;historyIndex=index;project=fromSnapshot(history[index]);currentIndex=clamp(currentIndex,0,project.slides.length-1);render();markDirty(); }
function updateUndoRedo(){ $('undoBtn').disabled=historyIndex<=0;$('redoBtn').disabled=historyIndex>=history.length-1; }

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
    'returns-final':{image:{x:0,y:0,w:0,h:0,cx:0,cy:0},title:{x:540,y:600,maxWidth:900,align:'center',cx:540,cy:700},subtitle:{x:540,y:1040,maxWidth:820,align:'center',cx:540,cy:1060},logo:{x:360,y:1100,w:360,h:257,cx:540,cy:1228}}
  };
  return layouts[d]||layouts['classic-cover'];
}

function layoutForElement(slide,key){if(key&&key.startsWith('free:')){const ft=(slide.freeTexts||[]).find(x=>x.id===key.slice(5));if(!ft)return null;return{x:ft.x,y:ft.y,maxWidth:ft.maxWidth||820,align:ft.align||'center',cx:ft.x,cy:ft.y};}if(key&&key.startsWith('overlay:')){const ov=(slide.overlays||[]).find(x=>x.id===key.slice(8));if(!ov)return null;return{x:ov.x-ov.w/2,y:ov.y-ov.h/2,w:ov.w,h:ov.h,cx:ov.x,cy:ov.y,rx:16};}const base={...(layoutFor(slide)[key]||{})};const el=slide[key];if(el?.align)base.align=el.align;if(Number.isFinite(el?.maxWidth)&&el.maxWidth>0)base.maxWidth=el.maxWidth;return base;}

function fontCss(style){const family=String(normalizeFontName(style.font)||'Anton').replace(/[\"']/g,'');return `font-family:'${family}',sans-serif;font-size:${style.size}px;font-weight:${style.weight};font-variation-settings:'wght' ${style.weight||700};`; }
function wrapLines(text,style,maxWidth){
  const paragraphs=String(text||'').split(/\n/);const out=[];const factor=(style.width||100)/100;const limit=maxWidth/Math.max(.2,factor);
  measureCtx.font=`${style.weight||400} ${style.size||60}px "${normalizeFontName(style.font)||'Anton'}"`;
  for(const p of paragraphs){ if(!p.trim()){out.push('');continue;}let line='';for(const word of p.trim().split(/\s+/)){const test=line?`${line} ${word}`:word;if(line&&measureCtx.measureText(test).width>limit){out.push(line);line=word;}else line=test;}if(line)out.push(line); }
  return out.length?out:[''];
}
function transformAttr(state,cx,cy,rotation=0){ return `translate(${state.dx||0} ${state.dy||0}) translate(${cx} ${cy}) rotate(${rotation||0}) scale(${state.scale||1}) translate(${-cx} ${-cy})`; }
function textSvg(key,style,layout){
  const lines=wrapLines(style.text,style,layout.maxWidth);const anchor=layout.align==='center'?'middle':layout.align==='right'?'end':'start';
  const tspans=lines.map((line,i)=>`<tspan x="${layout.x}" dy="${i===0?0:style.size*style.lineHeight}">${esc(line)}</tspan>`).join('');
  return `<g data-element="${key}" data-cx="${layout.cx}" data-cy="${layout.cy}" transform="${transformAttr(style,layout.cx,layout.cy,style.rotation||0)}"><g transform="translate(${layout.x} 0) scale(${(style.width||100)/100} 1) translate(${-layout.x} 0)"><text x="${layout.x}" y="${layout.y}" text-anchor="${anchor}" fill="${style.color}" style="${fontCss(style)}">${tspans}</text></g></g>`;
}
function imageSvg(slide,layout,clipId){
  if(!slide.image.src||!layout.w||!layout.h)return '';
  return `<g data-element="image" data-cx="${layout.cx}" data-cy="${layout.cy}" transform="${transformAttr(slide.image,layout.cx,layout.cy,(layout.rotation||0)+(slide.image.rotation||0))}"><image href="${esc(slide.image.src)}" x="${layout.x}" y="${layout.y}" width="${layout.w}" height="${layout.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/></g>`;
}
function logoSvg(slide,layout){
  if(!layout.w||!layout.h)return '';
  return `<g data-element="logo" data-cx="${layout.cx}" data-cy="${layout.cy}" transform="${transformAttr(slide.logo,layout.cx,layout.cy,slide.logo.rotation||0)}"><image href="${logoData||'assets/logo.png'}" x="${layout.x}" y="${layout.y}" width="${layout.w}" height="${layout.h}" preserveAspectRatio="xMidYMid meet"/></g>`;
}
function speechBubbleSvg(x,y,w,h,fill=COLORS.orange,shadow=COLORS.blue){ return `<rect x="${x+12}" y="${y+12}" width="${w}" height="${h}" rx="24" fill="${shadow}"/><polygon points="${x+65},${y+h-2} ${x+145},${y+h-2} ${x+82},${y+h+58}" fill="${fill}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${fill}"/>`; }
function questionSvg(cx,top){const x=cx-75,y=top;return `<rect x="${x+10}" y="${y+10}" width="150" height="130" rx="14" fill="${COLORS.blue}"/><polygon points="${x+40},${y+135} ${x+75},${y+135} ${x+52},${y+175}" fill="${COLORS.blue}"/><rect x="${x}" y="${y}" width="150" height="130" rx="14" fill="${COLORS.orange}"/><text x="${x+75}" y="${y+98}" text-anchor="middle" font-family="Arial" font-size="95" font-weight="900" fill="${COLORS.blue}">?</text>`;}
function baseAndOverlaySvg(slide){
  const d=designOf(slide);
  if(d==='new-cover') return `<defs><linearGradient id="ng${slide.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.blue}"/><stop offset="1" stop-color="#001b25"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#ng${slide.id})"/>`;
  if(d==='new-body') return `<rect width="1080" height="1350" fill="${COLORS.cream}"/>`;
  if(d==='new-question') return `<rect width="1080" height="1350" fill="${COLORS.blue}"/><circle cx="940" cy="140" r="245" fill="#064a61"/><circle cx="130" cy="1200" r="280" fill="#064a61"/>`;
  if(d==='new-final') return `<rect width="1080" height="1350" fill="${COLORS.orange}"/><path d="M0 0 H1080 V545 L0 710 Z" fill="${COLORS.blue}"/><path d="M0 890 L1080 735 V1350 H0 Z" fill="#003b4e"/><circle cx="930" cy="250" r="180" fill="#07475c" opacity=".75"/>`;
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
  if(slide.kicker && (d==='disclosure-hero'||d==='disclosure-editorial')) out+=`<text x="70" y="125" font-family="Archivo" font-size="36" font-weight="800" fill="${COLORS.cream}">${esc(slide.kicker.toUpperCase())}</text>`;
  if(slide.dateText && (d==='returns-sheet-right'||d==='returns-sheet-left')) out+=`<text x="${d==='returns-sheet-right'?62:555}" y="545" font-family="Archivo" font-size="34" font-weight="800" letter-spacing="4" fill="${COLORS.blue}">${esc(slide.dateText.toUpperCase())}</text>`;
  if(slide.bubbleText){
    if(d==='returns-cards') out+=`<text x="730" y="1110" text-anchor="middle" font-family="Archivo" font-size="32" font-weight="800" fill="${COLORS.orange}">${esc(slide.bubbleText.toUpperCase())}</text>`;
    else if(d==='returns-question') out+=`<text x="540" y="1240" text-anchor="middle" font-family="Archivo" font-size="30" font-weight="800" fill="${COLORS.blue}">${esc(slide.bubbleText.toUpperCase())}</text>`;
    else if(d.includes('question')) out+=`<text x="755" y="1200" text-anchor="middle" font-family="Archivo" font-size="28" font-weight="800" fill="${COLORS.blue}">${esc(slide.bubbleText.toUpperCase())}</text>`;
  }
  return out;
}
function numberSvg(slide){if(!project?.showNumbers)return '';const n=Math.max(1,project.slides.indexOf(slide)+1);return `<g aria-label="Slide ${n}"><rect x="36" y="1260" width="82" height="52" rx="26" fill="${COLORS.orange}"/><text x="77" y="1297" text-anchor="middle" font-family="Archivo" font-size="28" font-weight="850" fill="${COLORS.blue}">${n}</text></g>`;}
function buildSvg(slide,{suffix=''}={}){
  const layout=layoutFor(slide);const id=`c${slide.id}${suffix}`.replace(/[^a-zA-Z0-9]/g,'');const clipId=`clip${id}`;
  const free=(slide.freeTexts||[]).map(ft=>textSvg(`free:${ft.id}`,ft,layoutForElement(slide,`free:${ft.id}`))).join('');
  const overlays=(slide.overlays||[]).map(ov=>{const l=layoutForElement(slide,`overlay:${ov.id}`);return ov.src?`<g data-element="overlay:${ov.id}" data-cx="${l.cx}" data-cy="${l.cy}" transform="${transformAttr(ov,l.cx,l.cy,ov.rotation||0)}"><image href="${esc(ov.src)}" x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" preserveAspectRatio="xMidYMid slice"/></g>`:'';}).join('');
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 1080 1350" width="1080" height="1350"><defs><clipPath id="${clipId}"><rect x="${layout.image.x}" y="${layout.image.y}" width="${layout.image.w}" height="${layout.image.h}" rx="${layout.image.rx||0}"/></clipPath></defs>${baseAndOverlaySvg(slide)}${imageSvg(slide,layout.image,clipId)}${baseAndOverlayAfterImage(slide)}${auxiliarySvg(slide)}${overlays}${textSvg('title',slide.title,layoutForElement(slide,'title'))}${textSvg('subtitle',slide.subtitle,layoutForElement(slide,'subtitle'))}${free}${logoSvg(slide,layout.logo)}${numberSvg(slide)}</svg>`;
}
function baseAndOverlayAfterImage(slide){
  const d=designOf(slide);
  if(d==='new-cover') return `<rect width="1080" height="1350" fill="#001c27" opacity="${slide.image.src?'.38':'.16'}"/><path d="M-120 995 L1160 810 L1160 1430 L-120 1430 Z" fill="${COLORS.orange}"/><path d="M-90 1115 L1160 930 L1160 1008 L-90 1193 Z" fill="#1f27b8" opacity=".96"/><rect x="76" y="82" width="244" height="47" rx="24" fill="${COLORS.cream}"/><text x="198" y="114" text-anchor="middle" fill="#111" font-family="Arial,sans-serif" font-size="22" font-weight="800">CRITICI DA BAR</text>`;
  if(d==='new-body') return `<rect x="0" y="585" width="1080" height="56" fill="${COLORS.orange}"/><path d="M0 602 L1080 542 L1080 642 L0 642 Z" fill="${COLORS.blue}" opacity=".96"/><rect x="72" y="672" width="238" height="43" rx="21" fill="${COLORS.orange}"/><text x="191" y="701" text-anchor="middle" fill="#111" font-family="Arial,sans-serif" font-size="22" font-weight="800">CRITICI DA BAR</text>`;
  if(d==='new-question') return `<path d="M118 300 H962 Q1005 300 1005 343 V773 Q1005 816 962 816 H565 L442 942 L459 816 H118 Q75 816 75 773 V343 Q75 300 118 300 Z" fill="${COLORS.orange}" stroke="#1e25b8" stroke-width="12"/>`;
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

function renderCanvasOnly(){
  const svg=buildSvg(currentSlide(),{suffix:'main'});
  canvas.innerHTML=svg.replace(/^<svg[^>]*>|<\/svg>$/g,'');
  drawSelection();
}
function render(){
  renderCanvasOnly();renderFilmstrip();syncControls();renderVariantControls();renderImageLibrary();renderPersonalTemplates();renderFreeTextList();renderOverlayList();
  $('slideCounter').textContent=`${currentIndex+1} / ${project.slides.length}`;
  $('prevSlideBtn').disabled=currentIndex===0;$('nextSlideBtn').disabled=currentIndex===project.slides.length-1;
  $('deleteSlideBtn').disabled=project.slides.length===1;$('moveLeftBtn').disabled=currentIndex===0;$('moveRightBtn').disabled=currentIndex===project.slides.length-1;updateUndoRedo();
}
function renderFilmstrip(){
  const strip=$('filmstrip');strip.innerHTML='';
  project.slides.forEach((slide,index)=>{const b=document.createElement('button');b.className=`thumb${index===currentIndex?' active':''}`;b.type='button';b.innerHTML=`${buildSvg(slide,{suffix:`thumb${index}`})}<span class="thumb-number">${index+1}</span>`;b.addEventListener('click',()=>{currentIndex=index;selected='title';render();});strip.appendChild(b);});
  requestAnimationFrame(()=>strip.querySelector('.thumb.active')?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
}
function matrixPoint(matrix,x,y){const p=new DOMPoint(x,y).matrixTransform(matrix);return{x:p.x,y:p.y};}
function selectionBounds(){
  const target=canvas.querySelector(`[data-element="${selected}"]`);if(!target)return null;
  try{const rect=target.getBoundingClientRect();if(!rect.width&&!rect.height)return null;const a=screenToSvg(rect.left,rect.top),b=screenToSvg(rect.right,rect.bottom);return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};}catch(_){return null;}
}
function svgNode(name,attrs={}){const n=document.createElementNS(SVG_NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n;}
function drawSelection(){
  canvas.querySelector('#selectionLayer')?.remove();const b=selectionBounds();if(!b)return;
  const pad=18,x=b.x-pad,y=b.y-pad,w=Math.max(8,b.w+pad*2),h=Math.max(8,b.h+pad*2);
  const layer=svgNode('g',{id:'selectionLayer'});
  const move=svgNode('rect',{x,y,width:w,height:h,rx:12,fill:'transparent','pointer-events':'all',cursor:'move'});move.dataset.handle='move';layer.appendChild(move);
  layer.appendChild(svgNode('rect',{x,y,width:w,height:h,rx:12,fill:'none',stroke:COLORS.orange,'stroke-width':5,'stroke-dasharray':'14 10','pointer-events':'none','vector-effect':'non-scaling-stroke'}));
  const corners=[['nw',x,y,'nwse-resize'],['ne',x+w,y,'nesw-resize'],['se',x+w,y+h,'nwse-resize'],['sw',x,y+h,'nesw-resize']];
  for(const [corner,cx,cy,cursor] of corners){const handle=svgNode('circle',{cx,cy,r:30,fill:COLORS.orange,stroke:COLORS.cream,'stroke-width':7,'pointer-events':'all',cursor,'vector-effect':'non-scaling-stroke'});handle.dataset.handle='scale';handle.dataset.corner=corner;layer.appendChild(handle);}
  if(isTextSelected()){
    const widthHandle=svgNode('rect',{x:x+w-22,y:y+h/2-28,width:44,height:56,rx:12,fill:COLORS.blue,stroke:COLORS.cream,'stroke-width':6,'pointer-events':'all',cursor:'ew-resize','vector-effect':'non-scaling-stroke'});widthHandle.dataset.handle='width';layer.appendChild(widthHandle);
  }
  canvas.appendChild(layer);
}
function updateDomTransform(key){const g=canvas.querySelector(`[data-element="${key}"]`),el=currentElement();if(!g||!el)return;const cx=Number(g.dataset.cx),cy=Number(g.dataset.cy);const base=key==='image'?(layoutFor(currentSlide()).image.rotation||0):0;g.setAttribute('transform',transformAttr(el,cx,cy,base+(el.rotation||0)));drawSelection();}
function selectElement(key){if(!['image','title','subtitle','logo'].includes(key)&&!String(key).startsWith('free:')&&!String(key).startsWith('overlay:'))return;selected=key;drawSelection();syncControls();renderFreeTextList();renderOverlayList();}
function setTab(name){activeTab=name;document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));}
function syncControls(){
  const s=currentSlide();$('titleInput').value=s.title.text;$('subtitleInput').value=s.subtitle.text;$('kickerInput').value=s.kicker||'';$('dateInput').value=s.dateText||'';$('bubbleInput').value=s.bubbleText||'';$('projectNameInput').value=project.name||'Nuovo carosello';
  document.querySelectorAll('.element-bar button').forEach(b=>b.classList.toggle('active',b.dataset.select===selected));const el=currentElement(),isText=isTextSelected();
  ['fontSelect','sizeRange','weightRange','widthRange','lineRange','colorInput','alignSelect','textBoxWidthRange'].forEach(id=>{if($(id))$(id).disabled=!isText;});
  if(isText&&el){el.font=normalizeFontName(el.font);if(el.font==='Anton')el.weight=400;$('fontSelect').value=el.font;$('weightRange').disabled=el.font==='Anton';$('sizeRange').value=el.size;$('weightRange').value=el.weight;$('widthRange').value=el.width;$('lineRange').value=Math.round(el.lineHeight*100);$('colorInput').value=el.color;if($('alignSelect'))$('alignSelect').value=el.align||layoutForElement(s,selected)?.align||'left';if($('textBoxWidthRange'))$('textBoxWidthRange').value=Math.round(el.maxWidth||layoutForElement(s,selected)?.maxWidth||820);}
  $('scaleRange').value=Math.round((el?.scale||1)*100);$('rotationRange').value=Math.round(el?.rotation||0);$('sizeOut').textContent=isText?Math.round(el.size):'—';$('weightOut').textContent=isText?el.weight:'—';$('widthOut').textContent=isText?`${el.width}%`:'—';$('lineOut').textContent=isText?Number(el.lineHeight).toFixed(2):'—';$('scaleOut').textContent=`${Math.round((el?.scale||1)*100)}%`;$('rotationOut').textContent=`${Math.round(el?.rotation||0)}°`;if($('textBoxWidthOut'))$('textBoxWidthOut').textContent=isText?Math.round(el.maxWidth||layoutForElement(s,selected)?.maxWidth||820):'—';
}
function renderVariantControls(){
  const family=$('familySelect'),variant=$('variantSelect'),s=currentSlide();family.innerHTML=Object.entries(FAMILIES).map(([id,f])=>`<option value="${id}">${f.label}</option>`).join('');family.value=s.family;variant.innerHTML=Object.entries(FAMILIES[s.family].variants).map(([id,v])=>`<option value="${id}">${v.label}</option>`).join('');variant.value=s.variant;
  $('variantCards').innerHTML=Object.entries(FAMILIES[s.family].variants).map(([id,v])=>`<button class="variant-card${id===s.variant?' active':''}" type="button" data-variant="${id}"><strong>${v.label}</strong><span>${v.description}</span></button>`).join('');$('variantCards').querySelectorAll('[data-variant]').forEach(b=>b.addEventListener('click',()=>applyTemplate(s.family,b.dataset.variant)));
}
function applyTemplate(family,variant){
  if(!FAMILIES[family]?.variants?.[variant])return;const old=currentSlide(),fresh=createSlide(family,variant);fresh.id=old.id;fresh.image=old.image;fresh.logo=old.logo;fresh.title.text=old.title.text;fresh.subtitle.text=old.subtitle.text;fresh.kicker=old.kicker;fresh.dateText=old.dateText;fresh.bubbleText=old.bubbleText;fresh.freeTexts=deepClone(old.freeTexts||[]);fresh.overlays=deepClone(old.overlays||[]);fresh.title.font=normalizeFontName(old.title.font);fresh.subtitle.font=normalizeFontName(old.subtitle.font);if(fresh.title.font==='Anton')fresh.title.weight=400;if(fresh.subtitle.font==='Anton')fresh.subtitle.weight=400;project.slides[currentIndex]=fresh;selected='title';render();commitHistory();
}
function screenToSvg(clientX,clientY){const p=canvas.createSVGPoint();p.x=clientX;p.y=clientY;const m=canvas.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0};}
function selectionCenterScreen(){const b=selectionBounds();if(!b)return{x:0,y:0};const p=canvas.createSVGPoint();p.x=b.x+b.w/2;p.y=b.y+b.h/2;const m=canvas.getScreenCTM();return m?p.matrixTransform(m):{x:0,y:0};}
function pointerDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function textSemanticResizeStart(el){const layout=layoutForElement(currentSlide(),selected);return{size:el.size,maxWidth:el.maxWidth||layout?.maxWidth||820,scale:el.scale||1};}
function beginUniformResize(type='handle',pointerId=null){const el=currentElement();if(!el)return;const center=selectionCenterScreen();gesture={type,pointerId,center,startDistance:1,text:isTextSelected(),startScale:el.scale||1,...(isTextSelected()?textSemanticResizeStart(el):{})};}
function applyUniformRatio(ratio){const el=currentElement();if(!el||!gesture)return;ratio=clamp(ratio,.18,6);if(gesture.text){el.size=clamp(Math.round(gesture.size*ratio),16,260);el.maxWidth=clamp(Math.round(gesture.maxWidth*ratio),120,1080);renderCanvasOnly();}else{el.scale=clamp(gesture.startScale*ratio,.08,8);updateDomTransform(selected);}syncControls();}
function beginPinch(){const pts=[...pointers.values()];if(pts.length<2||!currentElement())return;beginUniformResize('pinch');gesture.startDistance=Math.max(1,pointerDistance(pts[0],pts[1]));}
canvas.addEventListener('pointerdown',event=>{
  event.preventDefault();canvas.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  const target=event.target.closest?.('[data-element]');if(target?.dataset.element)selectElement(target.dataset.element);
  if(pointers.size===2){beginPinch();return;}const el=currentElement();if(!el)return;const action=event.target.dataset.handle||'';
  if(action==='scale'){beginUniformResize('handle',event.pointerId);gesture.startDistance=Math.max(1,Math.hypot(event.clientX-gesture.center.x,event.clientY-gesture.center.y));}
  else if(action==='width'&&isTextSelected()){const p=screenToSvg(event.clientX,event.clientY),layout=layoutForElement(currentSlide(),selected);gesture={type:'width',pointerId:event.pointerId,startX:p.x,startWidth:el.maxWidth||layout?.maxWidth||820};}
  else gesture={type:'drag',pointerId:event.pointerId,last:screenToSvg(event.clientX,event.clientY)};
});
canvas.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;event.preventDefault();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const el=currentElement();if(!gesture||!el)return;
  if(pointers.size>=2){if(gesture.type!=='pinch')beginPinch();const pts=[...pointers.values()];applyUniformRatio(pointerDistance(pts[0],pts[1])/Math.max(1,gesture.startDistance));return;}
  if(gesture.type==='drag'&&gesture.pointerId===event.pointerId){const now=screenToSvg(event.clientX,event.clientY);el.dx+=now.x-gesture.last.x;el.dy+=now.y-gesture.last.y;gesture.last=now;updateDomTransform(selected);syncControls();}
  else if(gesture.type==='handle'&&gesture.pointerId===event.pointerId){const dist=Math.max(1,Math.hypot(event.clientX-gesture.center.x,event.clientY-gesture.center.y));applyUniformRatio(dist/gesture.startDistance);}
  else if(gesture.type==='width'&&gesture.pointerId===event.pointerId){const now=screenToSvg(event.clientX,event.clientY);el.maxWidth=clamp(Math.round(gesture.startWidth+(now.x-gesture.startX)*2),120,1080);renderCanvasOnly();syncControls();}
});
function endPointer(event){
  if(!pointers.has(event.pointerId))return;pointers.delete(event.pointerId);try{canvas.releasePointerCapture?.(event.pointerId);}catch(_){}
  const now=Date.now();if(pointers.size===0&&gesture?.type==='drag'&&now-lastTap.time<330&&lastTap.key===selected&&isTextSelected())openTextDialog();
  if(pointers.size===0){lastTap={time:now,key:selected};gesture=null;commitHistory();renderFilmstrip();}else if(pointers.size===1&&gesture?.type==='pinch'){const [id,p]=[...pointers.entries()][0];gesture={type:'drag',pointerId:id,last:screenToSvg(p.x,p.y)};}
}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',event=>{if(!event.altKey)return;event.preventDefault();const el=currentElement();if(!el)return;if(isTextSelected()){const layout=layoutForElement(currentSlide(),selected),ratio=event.deltaY<0?1.035:.965;el.size=clamp(Math.round(el.size*ratio),16,260);el.maxWidth=clamp(Math.round((el.maxWidth||layout?.maxWidth||820)*ratio),120,1080);renderCanvasOnly();}else{el.scale=clamp(el.scale*(event.deltaY<0?1.04:.96),.08,8);updateDomTransform(selected);}syncControls();markDirty();},{passive:false});
document.addEventListener('keydown',event=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.querySelector('dialog[open]'))return;const el=currentElement();if(!el)return;const step=event.shiftKey?10:1;if(event.key==='ArrowLeft'){el.dx-=step;}else if(event.key==='ArrowRight'){el.dx+=step;}else if(event.key==='ArrowUp'){el.dy-=step;}else if(event.key==='ArrowDown'){el.dy+=step;}else return;event.preventDefault();updateDomTransform(selected);syncControls();markDirty();});

function applyTextControl(key,value){if(!isTextSelected())return;const el=currentElement();if(!el)return;el[key]=value;if(isFreeSelected()&&(key==='align'||key==='maxWidth')){}renderCanvasOnly();syncControls();markDirty();}
function fitSelectedText(){
  if(!isTextSelected()){showToast('Seleziona prima un testo');return;}
  const style=currentElement(),layout=layoutForElement(currentSlide(),selected);const design=designOf(currentSlide());
  const limits={
    'original-cover':{title:330,subtitle:150},'original-body':{title:320,subtitle:160},'original-final':{title:330,subtitle:160},
    'classic-cover':{title:300,subtitle:110},'classic-body':{title:250,subtitle:140},'classic-question':{title:300,subtitle:110},'classic-final':{title:360,subtitle:140},
    'disclosure-hero':{title:430,subtitle:150},'disclosure-editorial':{title:240,subtitle:430},'disclosure-question':{title:230,subtitle:190},
    'returns-cover':{title:310,subtitle:120},'returns-question':{title:180,subtitle:310},'returns-sheet-right':{title:300,subtitle:380},'returns-sheet-left':{title:300,subtitle:380},
    'returns-big-bubble':{title:180,subtitle:470},'returns-cards':{title:170,subtitle:170},'returns-final':{title:300,subtitle:140}
  };
  const maxHeight=isFreeSelected()?500:(limits[design]?.[selected]||300);let size=style.size;
  while(size>18){const probe={...style,size};const lines=wrapLines(probe.text,probe,layout.maxWidth);if(lines.length*size*probe.lineHeight<=maxHeight)break;size-=2;}
  if(size===style.size)showToast('Il testo è già dentro l’area sicura');else{style.size=size;renderCanvasOnly();syncControls();commitHistory();renderFilmstrip();showToast(`Dimensione adattata a ${size}`);}
}
function openTextDialog(){
  if(!isTextSelected()){showToast('Seleziona un testo');return;}
  $('textDialogTitle').textContent=selected==='title'?'Modifica titolo':selected==='subtitle'?'Modifica testo':'Modifica testo libero';$('textDialogInput').value=currentElement().text;$('textDialog').showModal();setTimeout(()=>$('textDialogInput').focus(),60);
}

function addFreeText(text='NUOVO TESTO'){
  const ft=freeTextDefaults({text,x:540,y:675+(currentSlide().freeTexts?.length||0)*55});
  currentSlide().freeTexts=currentSlide().freeTexts||[];currentSlide().freeTexts.push(ft);selected=`free:${ft.id}`;render();commitHistory();setTab('content');openTextDialog();
}
function deleteSelectedElement(){let message='Elemento eliminato';if(isFreeSelected()){const id=selectedFreeId();currentSlide().freeTexts=(currentSlide().freeTexts||[]).filter(x=>x.id!==id);message='Testo libero eliminato';}else if(isOverlaySelected()){const id=selectedOverlayId();currentSlide().overlays=(currentSlide().overlays||[]).filter(x=>x.id!==id);message='Foto libera eliminata';}else return;selected='title';render();commitHistory();showToast(message);}
function deleteSelectedFreeText(){deleteSelectedElement();}
function renderFreeTextList(){const el=$('freeTextList');if(!el)return;const list=currentSlide()?.freeTexts||[];if(!list.length){el.innerHTML='<p class="panel-note">Nessun testo libero nella slide.</p>';return;}el.innerHTML=list.map(ft=>`<div class="free-text-item${selected===`free:${ft.id}`?' active':''}"><button type="button" data-free-select="${ft.id}">${esc(ft.text||'Testo libero')}</button><button type="button" data-free-edit="${ft.id}">Modifica</button><button type="button" data-free-delete="${ft.id}">×</button></div>`).join('');el.querySelectorAll('[data-free-select]').forEach(b=>b.addEventListener('click',()=>selectElement(`free:${b.dataset.freeSelect}`)));el.querySelectorAll('[data-free-edit]').forEach(b=>b.addEventListener('click',()=>{selectElement(`free:${b.dataset.freeEdit}`);openTextDialog();}));el.querySelectorAll('[data-free-delete]').forEach(b=>b.addEventListener('click',()=>{selected=`free:${b.dataset.freeDelete}`;deleteSelectedFreeText();}));}

async function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}
async function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}
async function prepareImageBlob(blob){
  const source=URL.createObjectURL(blob);try{const img=await loadImage(source);const maxSide=2400,ratio=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*ratio)),h=Math.max(1,Math.round(img.naturalHeight*ratio));const work=document.createElement('canvas');work.width=w;work.height=h;const ctx=work.getContext('2d');ctx.drawImage(img,0,0,w,h);const type=blob.type==='image/png'&&blob.size<1600000?'image/png':'image/jpeg';const out=await new Promise((resolve,reject)=>work.toBlob(b=>b?resolve(b):reject(new Error('Compressione fallita')),type,.9));return blobToDataUrl(out);}finally{URL.revokeObjectURL(source);}
}
async function prepareImageFile(file){return prepareImageBlob(file);}
async function saveImageLibrary(src,name='Immagine',source='caricamento'){
  const item={id:uid(),src,name:String(name||'Immagine').slice(0,100),source,createdAt:Date.now()};imageLibrary.unshift(item);await storePut('images',item.id,item);renderImageLibrary();return item;
}
function useImage(src){const s=currentSlide();s.image.src=src;s.image.dx=0;s.image.dy=0;s.image.scale=1;selected='image';render();commitHistory();showToast('Immagine inserita');}
function renderImageLibrary(){
  const el=$('imageLibrary');if(!el)return;if(!imageLibrary.length){el.innerHTML='<p class="panel-note">Nessuna immagine salvata.</p>';return;}
  el.innerHTML=imageLibrary.map(item=>`<button class="image-card" type="button" data-library-id="${item.id}" title="Usa ${esc(item.name)}"><img src="${item.src}" alt=""><span class="image-meta">${esc(item.name)}</span><span class="delete-image" data-delete-image="${item.id}" role="button" aria-label="Elimina">×</span></button>`).join('');
  el.querySelectorAll('[data-library-id]').forEach(card=>card.addEventListener('click',event=>{if(event.target.closest('[data-delete-image]'))return;const item=imageLibrary.find(x=>x.id===card.dataset.libraryId);if(item)useImage(item.src);}));
  el.querySelectorAll('[data-delete-image]').forEach(btn=>btn.addEventListener('click',async event=>{event.stopPropagation();const id=btn.dataset.deleteImage;imageLibrary=imageLibrary.filter(x=>x.id!==id);await storeDelete('images',id);renderImageLibrary();}));
}
function renderSearchResults(){
  const el=$('imageSearchResults');if(!searchResults.length){el.innerHTML='';return;}
  el.innerHTML=searchResults.map((r,i)=>`<button class="image-card" type="button" data-search-index="${i}" title="Importa ${esc(r.title)}"><img src="${esc(r.thumb)}" alt=""><span class="image-meta">${esc(r.title)}${r.width&&r.height?` · ${r.width}×${r.height}`:''}</span></button>`).join('');
  el.querySelectorAll('[data-search-index]').forEach(b=>b.addEventListener('click',()=>importSearchResult(Number(b.dataset.searchIndex))));
}
async function searchImages(){
  const q=$('imageSearchInput').value.trim();if(!q)return;setStatus('Ricerca in corso…');$('searchImagesBtn').disabled=true;searchResults=[];renderSearchResults();
  try{
    const url=new URL('https://commons.wikimedia.org/w/api.php');
    const params={action:'query',format:'json',origin:'*',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:'24',prop:'imageinfo',iiprop:'url|size|mime',iiurlwidth:'700'};Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
    const response=await fetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();
    const pages=Object.values(data.query?.pages||{});searchResults=pages.map(p=>{const info=p.imageinfo?.[0]||{};return{title:(p.title||'').replace(/^File:/,''),thumb:info.thumburl||info.url,url:info.url||info.thumburl,width:info.width,height:info.height,source:`https://commons.wikimedia.org/?curid=${p.pageid}`};}).filter(r=>r.thumb&&r.url);
    setStatus(searchResults.length?`${searchResults.length} risultati disponibili.`:'Nessun risultato.','success');renderSearchResults();
  }catch(error){console.error(error);setStatus('Ricerca non disponibile. Puoi usare Google Immagini o caricare un file.','error');}
  finally{$('searchImagesBtn').disabled=false;}
}
async function importSearchResult(index){
  const result=searchResults[index];if(!result)return;setStatus('Scarico e preparo l’immagine…');
  try{const response=await fetch(result.url,{mode:'cors'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const src=await prepareImageBlob(await response.blob());await saveImageLibrary(src,result.title,'Wikimedia Commons');useImage(src);setStatus('Immagine salvata nell’archivio.','success');}
  catch(error){console.error(error);setStatus('Il sito sorgente non consente il download diretto. Apri la fonte e salva l’immagine manualmente.','error');window.open(result.source,'_blank','noopener');}
}
async function importImageUrl(){
  const url=$('imageUrlInput').value.trim();if(!url)return;setStatus('Importazione URL…');
  try{const response=await fetch(url,{mode:'cors'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const src=await prepareImageBlob(await response.blob());await saveImageLibrary(src,new URL(url).pathname.split('/').pop()||'Immagine URL','URL');useImage(src);$('imageUrlInput').value='';setStatus('Immagine importata.','success');}
  catch(error){console.error(error);setStatus('Il server dell’immagine blocca l’importazione. Scaricala e usa “Carica dal telefono”.','error');}
}

function personalSnapshot(name){const s=currentSlide();return{id:uid(),name,createdAt:Date.now(),family:s.family,variant:s.variant,title:{...s.title,text:''},subtitle:{...s.subtitle,text:''},logo:{...s.logo},kicker:s.kicker,dateText:s.dateText,bubbleText:s.bubbleText,freeTexts:deepClone(s.freeTexts||[]),overlays:deepClone(s.overlays||[])};}
async function savePersonalTemplate(){const name=prompt('Nome del template personale:','Mio template');if(!name?.trim())return;const item=personalSnapshot(name.trim());personalTemplates.unshift(item);await storePut('templates',item.id,item);renderPersonalTemplates();showToast('Template personale salvato');}
function applyPersonalTemplate(item){const s=currentSlide(),titleText=s.title.text,subtitleText=s.subtitle.text,image=s.image,id=s.id;s.family=item.family;s.variant=item.variant;s.title={...s.title,...item.title,text:titleText};s.subtitle={...s.subtitle,...item.subtitle,text:subtitleText};s.logo={...s.logo,...item.logo};s.kicker=item.kicker||s.kicker;s.dateText=item.dateText||s.dateText;s.bubbleText=item.bubbleText||s.bubbleText;s.freeTexts=deepClone(item.freeTexts||s.freeTexts||[]);s.overlays=deepClone(item.overlays||s.overlays||[]);s.image=image;s.id=id;render();commitHistory();showToast('Template applicato');}
function renderPersonalTemplates(){const el=$('personalTemplates');if(!el)return;if(!personalTemplates.length){el.innerHTML='<p class="panel-note">Nessun template personale.</p>';return;}el.innerHTML=personalTemplates.map(t=>`<div class="personal-template"><div class="personal-info"><strong>${esc(t.name)}</strong><small>${esc(FAMILIES[t.family]?.label||'')} · ${esc(FAMILIES[t.family]?.variants?.[t.variant]?.label||'')}</small></div><button type="button" data-apply-template="${t.id}">Applica</button><button type="button" data-remove-template="${t.id}">×</button></div>`).join('');el.querySelectorAll('[data-apply-template]').forEach(b=>b.addEventListener('click',()=>{const t=personalTemplates.find(x=>x.id===b.dataset.applyTemplate);if(t)applyPersonalTemplate(t);}));el.querySelectorAll('[data-remove-template]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.removeTemplate;personalTemplates=personalTemplates.filter(x=>x.id!==id);await storeDelete('templates',id);renderPersonalTemplates();}));}

function roundedRectPath(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
function fillRect(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function drawSpeechBubble(ctx,x,y,w,h,fill=COLORS.orange,shadow=COLORS.blue){ctx.fillStyle=shadow;roundedRectPath(ctx,x+12,y+12,w,h,24);ctx.fill();ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x+65,y+h-2);ctx.lineTo(x+145,y+h-2);ctx.lineTo(x+82,y+h+58);ctx.closePath();ctx.fill();roundedRectPath(ctx,x,y,w,h,24);ctx.fill();}
function drawQuestion(ctx,cx,top){const x=cx-75,y=top;ctx.fillStyle=COLORS.blue;roundedRectPath(ctx,x+10,y+10,150,130,14);ctx.fill();ctx.beginPath();ctx.moveTo(x+40,y+135);ctx.lineTo(x+75,y+135);ctx.lineTo(x+52,y+175);ctx.closePath();ctx.fill();ctx.fillStyle=COLORS.orange;roundedRectPath(ctx,x,y,150,130,14);ctx.fill();ctx.fillStyle=COLORS.blue;ctx.font='900 95px Arial';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText('?',x+75,y+98);}
function coverDimensions(img,rect){const ir=img.naturalWidth/img.naturalHeight,rr=rect.w/rect.h;let dw,dh;if(ir>rr){dh=rect.h;dw=dh*ir;}else{dw=rect.w;dh=dw/ir;}return{dw,dh,x:rect.x+(rect.w-dw)/2,y:rect.y+(rect.h-dh)/2};}
function drawImageElement(ctx,img,rect,t){if(!rect.w||!rect.h)return;ctx.save();ctx.translate(t.dx||0,t.dy||0);ctx.translate(rect.cx,rect.cy);ctx.rotate(((rect.rotation||0)+(t.rotation||0))*Math.PI/180);ctx.scale(t.scale||1,t.scale||1);ctx.translate(-rect.cx,-rect.cy);roundedRectPath(ctx,rect.x,rect.y,rect.w,rect.h,rect.rx||0);ctx.clip();const d=coverDimensions(img,rect);ctx.drawImage(img,d.x,d.y,d.dw,d.dh);ctx.restore();}
function verticalGradient(ctx,y,h,from,to){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,from);g.addColorStop(1,to);ctx.fillStyle=g;ctx.fillRect(0,y,W,h);}
async function drawBackgroundCanvas(ctx,slide,layout){
  const d=designOf(slide);const img=slide.image.src?await loadImage(slide.image.src):null;
  if(d==='new-cover'){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,COLORS.blue);g.addColorStop(1,'#001b25');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);fillRect(ctx,slide.image.src?'rgba(0,28,39,.38)':'rgba(0,28,39,.16)',0,0,W,H);ctx.fillStyle=COLORS.orange;ctx.beginPath();ctx.moveTo(-120,995);ctx.lineTo(1160,810);ctx.lineTo(1160,1430);ctx.lineTo(-120,1430);ctx.closePath();ctx.fill();ctx.fillStyle='#1f27b8';ctx.globalAlpha=.96;ctx.beginPath();ctx.moveTo(-90,1115);ctx.lineTo(1160,930);ctx.lineTo(1160,1008);ctx.lineTo(-90,1193);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=COLORS.cream;roundedRectPath(ctx,76,82,244,47,24);ctx.fill();ctx.fillStyle='#111';ctx.font='800 22px Arial';ctx.textAlign='center';ctx.fillText('CRITICI DA BAR',198,114);return;}
  if(d==='new-body'){fillRect(ctx,COLORS.cream,0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);fillRect(ctx,COLORS.orange,0,585,W,56);ctx.fillStyle=COLORS.blue;ctx.globalAlpha=.96;ctx.beginPath();ctx.moveTo(0,602);ctx.lineTo(1080,542);ctx.lineTo(1080,642);ctx.lineTo(0,642);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=COLORS.orange;roundedRectPath(ctx,72,672,238,43,21);ctx.fill();ctx.fillStyle='#111';ctx.font='800 22px Arial';ctx.textAlign='center';ctx.fillText('CRITICI DA BAR',191,701);return;}
  if(d==='new-question'){fillRect(ctx,COLORS.blue,0,0,W,H);ctx.fillStyle='#064a61';ctx.beginPath();ctx.arc(940,140,245,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(130,1200,280,0,Math.PI*2);ctx.fill();ctx.fillStyle=COLORS.orange;ctx.strokeStyle='#1e25b8';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(118,300);ctx.lineTo(962,300);ctx.quadraticCurveTo(1005,300,1005,343);ctx.lineTo(1005,773);ctx.quadraticCurveTo(1005,816,962,816);ctx.lineTo(565,816);ctx.lineTo(442,942);ctx.lineTo(459,816);ctx.lineTo(118,816);ctx.quadraticCurveTo(75,816,75,773);ctx.lineTo(75,343);ctx.quadraticCurveTo(75,300,118,300);ctx.closePath();ctx.fill();ctx.stroke();return;}
  if(d==='new-final'){fillRect(ctx,COLORS.orange,0,0,W,H);ctx.fillStyle=COLORS.blue;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(1080,0);ctx.lineTo(1080,545);ctx.lineTo(0,710);ctx.closePath();ctx.fill();ctx.fillStyle='#003b4e';ctx.beginPath();ctx.moveTo(0,890);ctx.lineTo(1080,735);ctx.lineTo(1080,1350);ctx.lineTo(0,1350);ctx.closePath();ctx.fill();ctx.fillStyle='#07475c';ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(930,250,180,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;return;}
  if(d.startsWith('original-')){fillRect(ctx,'#202020',0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);verticalGradient(ctx,620,730,'rgba(0,0,0,0)','rgba(0,0,0,.96)');verticalGradient(ctx,0,230,'rgba(0,0,0,.58)','rgba(0,0,0,0)');return;}
  if(d==='classic-cover'){fillRect(ctx,COLORS.cream,0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);fillRect(ctx,COLORS.orange,0,790,W,25);return;}
  if(d==='classic-body'){fillRect(ctx,COLORS.cream,0,0,W,H);ctx.fillStyle='#999';roundedRectPath(ctx,40,850,1000,460,18);ctx.fill();if(img)drawImageElement(ctx,img,layout.image,slide.image);fillRect(ctx,COLORS.orange,40,832,1000,18);return;}
  if(d==='classic-question'){fillRect(ctx,COLORS.cream,0,0,W,H);drawQuestion(ctx,540,90);if(img)drawImageElement(ctx,img,layout.image,slide.image);drawSpeechBubble(ctx,500,1000,510,150);return;}
  if(d==='classic-final'){fillRect(ctx,COLORS.blue,0,0,W,H);ctx.fillStyle='#06475e';ctx.beginPath();ctx.arc(80,1230,260,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(1040,460,210,0,Math.PI*2);ctx.fill();return;}
  if(d==='disclosure-hero'){fillRect(ctx,'#1c1c1c',0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);fillRect(ctx,'rgba(0,0,0,.28)',0,0,W,H);fillRect(ctx,'rgba(0,0,0,.26)',0,0,W,680);return;}
  if(d==='disclosure-editorial'){fillRect(ctx,'#151515',0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);verticalGradient(ctx,0,760,'rgba(0,0,0,.92)','rgba(0,0,0,.35)');return;}
  if(d==='disclosure-question'){fillRect(ctx,COLORS.cream,0,0,W,H);drawQuestion(ctx,540,70);ctx.fillStyle=COLORS.blue;ctx.font='800 34px Arial';ctx.textAlign='center';ctx.fillText('SALVA IL CONTENUTO E CONDIVIDI',540,340);if(img)drawImageElement(ctx,img,layout.image,slide.image);drawSpeechBubble(ctx,500,1110,510,130);return;}
  if(d==='returns-cover'){fillRect(ctx,'#777',0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);verticalGradient(ctx,450,900,'rgba(0,0,0,.05)','rgba(0,0,0,.9)');return;}
  if(d==='returns-question'){fillRect(ctx,COLORS.cream,0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);verticalGradient(ctx,300,320,'rgba(0,0,0,0)','rgba(0,0,0,.86)');drawSpeechBubble(ctx,70,710,940,470,COLORS.orange,'#c45f10');return;}
  if(d==='returns-sheet-right'||d==='returns-sheet-left'){fillRect(ctx,COLORS.cream,0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);fillRect(ctx,COLORS.orange,d==='returns-sheet-right'?555:495,0,30,H);return;}
  if(d==='returns-big-bubble'){fillRect(ctx,'#222',0,0,W,H);if(img)drawImageElement(ctx,img,layout.image,slide.image);fillRect(ctx,'rgba(0,0,0,.3)',0,0,W,H);drawSpeechBubble(ctx,90,150,900,1030,COLORS.cream,'#d8cfa0');return;}
  if(d==='returns-cards'){fillRect(ctx,COLORS.cream,0,0,W,H);const cards=[[60,130],[250,540],[420,950]];cards.forEach(([x,y])=>{ctx.fillStyle=COLORS.yellow;roundedRectPath(ctx,x+6,y+8,620,330,24);ctx.fill();ctx.fillStyle='#1a1a1a';roundedRectPath(ctx,x,y,620,330,24);ctx.fill();});if(img)drawImageElement(ctx,img,layout.image,slide.image);return;}
  if(d==='returns-final'){fillRect(ctx,COLORS.cream,0,0,W,H);drawQuestion(ctx,540,170);return;}
  fillRect(ctx,COLORS.blue,0,0,W,H);
}
function drawTextCanvas(ctx,style,layout){const lines=wrapLines(style.text,style,layout.maxWidth);ctx.save();ctx.translate(style.dx||0,style.dy||0);ctx.translate(layout.cx,layout.cy);ctx.rotate((style.rotation||0)*Math.PI/180);ctx.scale(style.scale||1,style.scale||1);ctx.translate(-layout.cx,-layout.cy);ctx.translate(layout.x,0);ctx.scale((style.width||100)/100,1);ctx.translate(-layout.x,0);ctx.font=`${style.weight||400} ${style.size||60}px "${normalizeFontName(style.font)||'Anton'}"`;ctx.fillStyle=style.color;ctx.textAlign=layout.align;ctx.textBaseline='alphabetic';lines.forEach((line,i)=>ctx.fillText(line,layout.x,layout.y+i*style.size*style.lineHeight));ctx.restore();}
function drawAuxiliaryCanvas(ctx,slide){const d=designOf(slide);ctx.save();if(slide.kicker&&(d==='disclosure-hero'||d==='disclosure-editorial')){ctx.font='800 36px Archivo';ctx.fillStyle=COLORS.cream;ctx.textAlign='left';ctx.fillText(slide.kicker.toUpperCase(),70,125);}if(slide.dateText&&(d==='returns-sheet-right'||d==='returns-sheet-left')){ctx.font='800 34px Archivo';ctx.fillStyle=COLORS.blue;ctx.textAlign='left';ctx.fillText(slide.dateText.toUpperCase(),d==='returns-sheet-right'?62:555,545);}if(slide.bubbleText){ctx.font='800 30px Archivo';ctx.fillStyle=d==='returns-cards'?COLORS.orange:COLORS.blue;ctx.textAlign='center';if(d==='returns-cards')ctx.fillText(slide.bubbleText.toUpperCase(),730,1110);else if(d==='returns-question')ctx.fillText(slide.bubbleText.toUpperCase(),540,1240);else if(d.includes('question'))ctx.fillText(slide.bubbleText.toUpperCase(),755,1200);}ctx.restore();}
async function renderPngBlob(slide){
  await Promise.all([{name:'Anton',weight:400},{name:'Anybody',weight:800},{name:'Archivo',weight:800},{name:'Saira',weight:800}].map(f=>document.fonts?.load(`${f.weight} 90px "${f.name}"`).catch(()=>null))||[]);const out=document.createElement('canvas');out.width=W;out.height=H;const ctx=out.getContext('2d');const layout=layoutFor(slide);await drawBackgroundCanvas(ctx,slide,layout);drawAuxiliaryCanvas(ctx,slide);for(const ov of (slide.overlays||[])){if(!ov.src)continue;const img=await loadImage(ov.src);drawImageElement(ctx,img,layoutForElement(slide,`overlay:${ov.id}`),ov);}drawTextCanvas(ctx,slide.title,layoutForElement(slide,'title'));drawTextCanvas(ctx,slide.subtitle,layoutForElement(slide,'subtitle'));(slide.freeTexts||[]).forEach(ft=>drawTextCanvas(ctx,ft,layoutForElement(slide,`free:${ft.id}`)));const logo=await loadImage(logoData||'assets/logo.png');ctx.save();ctx.translate(slide.logo.dx||0,slide.logo.dy||0);ctx.translate(layout.logo.cx,layout.logo.cy);ctx.rotate((slide.logo.rotation||0)*Math.PI/180);ctx.scale(slide.logo.scale||1,slide.logo.scale||1);ctx.translate(-layout.logo.cx,-layout.logo.cy);ctx.drawImage(logo,layout.logo.x,layout.logo.y,layout.logo.w,layout.logo.h);ctx.restore();if(project.showNumbers){const n=Math.max(1,project.slides.indexOf(slide)+1);ctx.fillStyle=COLORS.orange;roundedRectPath(ctx,36,1260,82,52,26);ctx.fill();ctx.fillStyle=COLORS.blue;ctx.font='850 28px Archivo';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),77,1286);}return new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('PNG non creato')),'image/png'));
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1600);}
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255]);}function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
function concatArrays(parts){const len=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
async function makeZip(files){const enc=new TextEncoder(),local=[],central=[];let offset=0;for(const file of files){const name=enc.encode(file.name),data=new Uint8Array(await file.blob.arrayBuffer()),crc=crc32(data),lh=concatArrays([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name]);local.push(lh,data);const ch=concatArrays([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);central.push(ch);offset+=lh.length+data.length;}const cd=concatArrays(central),ld=concatArrays(local),end=concatArrays([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cd.length),u32(ld.length),u16(0)]);return new Blob([ld,cd,end],{type:'application/zip'});}

function setImportStatus(message,kind=''){const el=$('importStatus');if(!el)return;el.textContent=message;el.className=`inline-status${kind?' '+kind:''}`;}
function loadExternalScript(src,globalName){return new Promise((resolve,reject)=>{if(globalName&&window[globalName])return resolve(window[globalName]);const existing=document.querySelector(`script[data-cdb-src="${src}"]`);if(existing){existing.addEventListener('load',()=>resolve(globalName?window[globalName]:true),{once:true});existing.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.dataset.cdbSrc=src;s.onload=()=>resolve(globalName?window[globalName]:true);s.onerror=()=>reject(new Error('Risorsa esterna non disponibile'));document.head.appendChild(s);});}
function cleanImportedText(text){return String(text||'').replace(/\r/g,'').replace(/^Title:\s*/im,'').replace(/^URL Source:.*$/gim,'').replace(/^Published Time:.*$/gim,'').replace(/^Markdown Content:\s*/im,'').replace(/!\[[^\]]*\]\([^\)]+\)/g,'').replace(/\[[^\]]+\]\([^\)]+\)/g,m=>m.replace(/^\[/,'').replace(/\]\([^\)]+\)$/,'')).replace(/^#{1,6}\s*/gm,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function findFirstImageUrl(text){const md=String(text||'').match(/!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/i);if(md)return md[1];const raw=String(text||'').match(/https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)]*)?/i);return raw?.[0]||'';}
function titleFromImported(text,fallback='Nuovo carosello'){const lines=cleanImportedText(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);return (lines[0]||fallback).replace(/^[-*]\s*/,'').slice(0,120);}
async function readerFetch(url){const target=`https://r.jina.ai/${url}`;const response=await fetch(target,{headers:{Accept:'text/plain'},cache:'no-store'});if(!response.ok)throw new Error(`Lettore web: HTTP ${response.status}`);return response.text();}
async function tryImportUrl(url,type='article'){if(!/^https?:\/\//i.test(url))throw new Error('Inserisci un URL completo');setImportStatus(type==='instagram'?'Provo a leggere il post…':'Estraggo l’articolo…');const raw=await readerFetch(url);const image=findFirstImageUrl(raw);const cleaned=cleanImportedText(raw);$('importTextInput').value=cleaned;$('importTitleInput').value=titleFromImported(cleaned,type==='instagram'?'Post Instagram':'Articolo');pendingImportImage='';if(image){$('imageUrlInput').value=image;try{const response=await fetch(image);if(response.ok){pendingImportImage=await prepareImageFile(new File([await response.blob()],'copertina-importata',{type:response.headers.get('content-type')||'image/jpeg'}));await saveImageLibrary(pendingImportImage,'Copertina importata','Articolo');}}catch(_){}}setImportStatus('Testo estratto. Rivedilo e premi “Crea carosello dal testo”.','success');setTab('import');return cleaned;}
function splitTextChunks(text,mode='medium'){const cleaned=cleanImportedText(text);let blocks=cleaned.split(/\n\s*\n/).map(x=>x.trim()).filter(x=>x.length>30);if(blocks.length<2){const sentences=cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[cleaned];const max=mode==='short'?260:mode==='long'?520:380;blocks=[];let acc='';for(const s of sentences){if(acc&&`${acc} ${s}`.length>max){blocks.push(acc.trim());acc=s.trim();}else acc=`${acc} ${s}`.trim();}if(acc)blocks.push(acc);}const limit=mode==='short'?5:mode==='long'?12:8;return blocks.slice(0,limit);}
function finalVariantFor(family){return FAMILIES[family]?.variants?.finale?'finale':family==='d'?'domanda':'finale';}
function createCarouselFromText(text,title,family='c',mode='medium'){
  const chunks=splitTextChunks(text,mode);if(!chunks.length)throw new Error('Testo insufficiente');const cover=createSlide(family,DEFAULT_VARIANT[family]);cover.title.text=(title||titleFromImported(text)).toUpperCase();cover.subtitle.text='Critici da Bar';if(pendingImportImage)cover.image.src=pendingImportImage;const slides=[cover];chunks.forEach((chunk,i)=>{const s=createSlide(family,contentVariantFor(family));const first=(chunk.match(/^(.{25,100}?)(?:[.!?]|\n|$)/)||[])[1]||`PUNTO ${i+1}`;s.title.text=first.trim().toUpperCase();s.subtitle.text=chunk.trim();slides.push(s);});const end=createSlide(family,finalVariantFor(family));end.title.text='E VOI CHE NE PENSATE?';end.subtitle.text='Diteci la vostra nei commenti';slides.push(end);project={version:'0.6.0',name:title||titleFromImported(text),showNumbers:false,slides};currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();setTab('content');pendingImportImage='';showToast(`${slides.length} slide create`);
}
async function runOcrFiles(files){if(!files?.length)return;setImportStatus('Carico il motore OCR…');await loadExternalScript('https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js','Tesseract');const worker=await Tesseract.createWorker(['ita','eng'],1,{logger:m=>{if(m.status){const pct=Math.round((m.progress||0)*100);setImportStatus(`OCR: ${m.status} ${pct}%`);}}});const extracted=[];try{for(let i=0;i<files.length;i++){setImportStatus(`OCR immagine ${i+1}/${files.length}…`);const src=await prepareImageFile(files[i]);await saveImageLibrary(src,files[i].name,'OCR');const result=await worker.recognize(files[i]);extracted.push({text:(result.data.text||'').trim(),src,name:files[i].name});}}finally{await worker.terminate();}const combined=extracted.map(x=>x.text).filter(Boolean).join('\n\n');$('importTextInput').value=combined;if(!$('importTitleInput').value)$('importTitleInput').value=titleFromImported(combined,'Import OCR');setImportStatus(`OCR completato su ${files.length} immagini.`,'success');if(extracted.length){const family=$('importFamilySelect').value||'c';const slides=extracted.map((item,i)=>{const s=createSlide(family,i===0?DEFAULT_VARIANT[family]:contentVariantFor(family));s.image.src=item.src;const lines=item.text.split(/\n+/).map(x=>x.trim()).filter(Boolean);s.title.text=(lines.shift()||`SLIDE ${i+1}`).slice(0,120).toUpperCase();s.subtitle.text=lines.join(' ').slice(0,1200);return s;});project={version:'0.6.0',name:$('importTitleInput').value||'Import OCR',showNumbers:false,slides};currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();setTab('content');}}
async function exportFaithfulSvg(){const blob=await renderPngBlob(currentSlide());const data=await blobToDataUrl(blob);const svg=`<svg xmlns="${SVG_NS}" width="1080" height="1350" viewBox="0 0 1080 1350"><image href="${data}" width="1080" height="1350"/></svg>`;downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),`${slug(project.name)}-${currentIndex+1}-fedele.svg`);}
async function exportPdf(){if(!window.PDFLib)throw new Error('pdf-lib non disponibile');const pdf=await PDFLib.PDFDocument.create();for(let i=0;i<project.slides.length;i++){$('saveStatus').textContent=`PDF ${i+1}/${project.slides.length}`;const png=await renderPngBlob(project.slides[i]);const bytes=await png.arrayBuffer();const image=await pdf.embedPng(bytes);const page=pdf.addPage([W,H]);page.drawImage(image,{x:0,y:0,width:W,height:H});}const bytes=await pdf.save();downloadBlob(new Blob([bytes],{type:'application/pdf'}),`${slug(project.name)}.pdf`);$('saveStatus').textContent='salvato sul dispositivo';}

function contentVariantFor(family){return family==='n'?'corpo':family==='o'?'corpo':family==='c'?'corpo':family==='d'?'editoriale':'scheda_dx';}
function copyStyle(source,target){['font','size','weight','width','lineHeight','color','align','maxWidth'].forEach(k=>target[k]=source[k]);}

$('titleInput').addEventListener('input',e=>{currentSlide().title.text=e.target.value;renderCanvasOnly();markDirty();});
$('subtitleInput').addEventListener('input',e=>{currentSlide().subtitle.text=e.target.value;renderCanvasOnly();markDirty();});
$('kickerInput').addEventListener('input',e=>{currentSlide().kicker=e.target.value;renderCanvasOnly();markDirty();});
$('dateInput').addEventListener('input',e=>{currentSlide().dateText=e.target.value;renderCanvasOnly();markDirty();});
$('bubbleInput').addEventListener('input',e=>{currentSlide().bubbleText=e.target.value;renderCanvasOnly();markDirty();});
['titleInput','subtitleInput','kickerInput','dateInput','bubbleInput'].forEach(id=>$(id).addEventListener('change',()=>{commitHistory();renderFilmstrip();}));
$('fitTextBtn').addEventListener('click',fitSelectedText);$('fitTextStyleBtn').addEventListener('click',fitSelectedText);$('editSelectedTextBtn').addEventListener('click',openTextDialog);
$('textDialogSave').addEventListener('click',event=>{event.preventDefault();if(isTextSelected()&&currentElement()){currentElement().text=$('textDialogInput').value;render();commitHistory();}$('textDialog').close();});

$('fontSelect').addEventListener('change',e=>{const el=currentElement();if(!el)return;el.font=normalizeFontName(e.target.value);if(el.font==='Anton')el.weight=400;renderCanvasOnly();syncControls();markDirty();commitHistory();renderFilmstrip();});
$('colorInput').addEventListener('input',e=>applyTextControl('color',e.target.value));$('colorInput').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('sizeRange').addEventListener('input',e=>applyTextControl('size',Number(e.target.value)));$('sizeRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('weightRange').addEventListener('input',e=>applyTextControl('weight',Number(e.target.value)));$('weightRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('widthRange').addEventListener('input',e=>applyTextControl('width',Number(e.target.value)));$('widthRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('lineRange').addEventListener('input',e=>applyTextControl('lineHeight',Number(e.target.value)/100));$('lineRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('scaleRange').addEventListener('input',e=>{const el=currentElement();if(!el)return;el.scale=Number(e.target.value)/100;updateDomTransform(selected);syncControls();markDirty();});$('scaleRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('rotationRange').addEventListener('input',e=>{const el=currentElement();if(!el)return;el.rotation=Number(e.target.value);updateDomTransform(selected);syncControls();markDirty();});$('rotationRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('maxWidthRange').addEventListener('input',e=>applyTextControl('maxWidth',Number(e.target.value)));$('maxWidthRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('alignSelect').addEventListener('change',e=>{applyTextControl('align',e.target.value);commitHistory();renderFilmstrip();});
$('centerHBtn').addEventListener('click',()=>{const el=currentElement(),layout=layoutForElement(currentSlide(),selected);if(!el||!layout)return;el.dx=W/2-layout.cx;updateDomTransform(selected);syncControls();commitHistory();});
$('centerVBtn').addEventListener('click',()=>{const el=currentElement(),layout=layoutForElement(currentSlide(),selected);if(!el||!layout)return;el.dy=H/2-layout.cy;updateDomTransform(selected);syncControls();commitHistory();});
$('resetTransformBtn').addEventListener('click',()=>{const el=currentElement();if(!el)return;el.dx=0;el.dy=0;el.scale=1;el.rotation=0;render();commitHistory();});
$('applyStyleToTitlesBtn').addEventListener('click',()=>{if(selected!=='title'&&selected!=='subtitle'){showToast('Seleziona un testo');return;}project.slides.forEach(s=>copyStyle(currentElement(),s.title));render();commitHistory();showToast('Stile applicato a tutti i titoli');});
$('applyStyleToTextsBtn').addEventListener('click',()=>{if(selected!=='title'&&selected!=='subtitle'){showToast('Seleziona un testo');return;}project.slides.forEach(s=>copyStyle(currentElement(),s.subtitle));render();commitHistory();showToast('Stile applicato a tutti i testi');});

document.querySelectorAll('.element-bar button').forEach(b=>b.addEventListener('click',()=>selectElement(b.dataset.select)));
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
$('addFreeTextBtn').addEventListener('click',()=>addFreeText());$('addFreeTextQuickBtn').addEventListener('click',()=>addFreeText());$('deleteSelectedElementBtn').addEventListener('click',deleteSelectedElement);
$('prevSlideBtn').addEventListener('click',()=>{if(currentIndex>0){currentIndex--;selected='title';render();}});$('nextSlideBtn').addEventListener('click',()=>{if(currentIndex<project.slides.length-1){currentIndex++;selected='title';render();}});
$('addSlideBtn').addEventListener('click',()=>{const fam=currentSlide().family,variant=contentVariantFor(fam);project.slides.splice(currentIndex+1,0,createSlide(fam,variant));currentIndex++;selected='title';render();commitHistory();});
$('duplicateSlideBtn').addEventListener('click',()=>{const copy=deepClone(currentSlide());copy.id=uid();project.slides.splice(currentIndex+1,0,copy);currentIndex++;render();commitHistory();showToast('Slide duplicata');});
$('deleteSlideBtn').addEventListener('click',()=>{if(project.slides.length===1)return;project.slides.splice(currentIndex,1);currentIndex=Math.min(currentIndex,project.slides.length-1);render();commitHistory();});
$('moveLeftBtn').addEventListener('click',()=>{if(!currentIndex)return;[project.slides[currentIndex-1],project.slides[currentIndex]]=[project.slides[currentIndex],project.slides[currentIndex-1]];currentIndex--;render();commitHistory();});
$('moveRightBtn').addEventListener('click',()=>{if(currentIndex>=project.slides.length-1)return;[project.slides[currentIndex+1],project.slides[currentIndex]]=[project.slides[currentIndex],project.slides[currentIndex+1]];currentIndex++;render();commitHistory();});
$('familySelect').addEventListener('change',e=>applyTemplate(e.target.value,DEFAULT_VARIANT[e.target.value]));$('variantSelect').addEventListener('change',e=>applyTemplate(currentSlide().family,e.target.value));$('savePersonalTemplateBtn').addEventListener('click',savePersonalTemplate);

$('overlayInput')?.addEventListener('change',async e=>{try{await addOverlayFiles(e.target.files);}catch(err){console.error(err);showToast('Foto libera non caricata');}e.target.value='';});
$('showNumbersInput')?.addEventListener('change',e=>{project.showNumbers=e.target.checked;render();commitHistory();});
$('imageInput').addEventListener('change',async e=>{const files=[...(e.target.files||[])];if(!files.length)return;try{showToast('Preparo le immagini…');let first='';for(const file of files){const src=await prepareImageFile(file);await saveImageLibrary(src,file.name,'dispositivo');if(!first)first=src;}if(first)useImage(first);showToast(`${files.length} immagini aggiunte`);}catch(error){console.error(error);showToast('Immagine non leggibile');}e.target.value='';});
$('removeImageBtn').addEventListener('click',()=>{currentSlide().image.src='';render();commitHistory();});
$('searchImagesBtn').addEventListener('click',searchImages);$('imageSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchImages();}});
$('openGoogleImagesBtn').addEventListener('click',()=>{const q=$('imageSearchInput').value.trim();window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q||'cinema')}`,'_blank','noopener');});
$('importImageUrlBtn').addEventListener('click',importImageUrl);
$('clearLibraryBtn').addEventListener('click',async()=>{if(!imageLibrary.length)return;if(!confirm('Svuotare l’archivio immagini del dispositivo?'))return;imageLibrary=[];await storeClear('images');renderImageLibrary();});
$('extractArticleBtn').addEventListener('click',async()=>{try{await tryImportUrl($('articleUrlInput').value.trim(),'article');}catch(e){console.error(e);setImportStatus(`Estrazione non riuscita: ${e.message}. Incolla manualmente il testo.`,'error');}});
$('extractInstagramBtn').addEventListener('click',async()=>{try{await tryImportUrl($('instagramUrlInput').value.trim(),'instagram');}catch(e){console.error(e);setImportStatus('Instagram ha bloccato la lettura. Usa gli screenshot con OCR o incolla la caption.','error');}});
$('ocrImagesInput').addEventListener('change',async e=>{const files=[...(e.target.files||[])];try{await runOcrFiles(files);}catch(err){console.error(err);setImportStatus(`OCR non riuscito: ${err.message}`,'error');}e.target.value='';});
$('createFromTextBtn').addEventListener('click',()=>{try{createCarouselFromText($('importTextInput').value,$('importTitleInput').value.trim(),$('importFamilySelect').value,$('importLengthSelect').value);}catch(e){setImportStatus(e.message,'error');}});


$('undoBtn').addEventListener('click',()=>restoreHistory(historyIndex-1));$('redoBtn').addEventListener('click',()=>restoreHistory(historyIndex+1));
$('moreBtn').addEventListener('click',()=>$('projectDialog').showModal());$('projectNameInput').addEventListener('change',e=>{project.name=e.target.value.trim()||'Nuovo carosello';commitHistory();});
$('newProjectBtn').addEventListener('click',()=>{if(!confirm('Creare un nuovo progetto? Esporta la bozza se vuoi conservarne una copia.'))return;project=newProject();currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();$('projectDialog').close();});

$('exportPngBtn').addEventListener('click',async()=>{try{showToast('Creo il PNG…');const blob=await renderPngBlob(currentSlide());downloadBlob(blob,`${slug(project.name)}-${currentIndex+1}.png`);showToast('PNG pronto');}catch(e){console.error(e);showToast('Errore durante il PNG');}});
$('sharePngBtn').addEventListener('click',async()=>{try{const blob=await renderPngBlob(currentSlide()),file=new File([blob],`${slug(project.name)}-${currentIndex+1}.png`,{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:project.name});else{downloadBlob(blob,file.name);showToast('Condivisione non disponibile: PNG scaricato');}}catch(e){if(e.name!=='AbortError')showToast('Condivisione non riuscita');}});
$('exportSvgBtn').addEventListener('click',()=>{const svg=buildSvg(currentSlide(),{suffix:'export'});downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),`${slug(project.name)}-${currentIndex+1}.svg`);});
$('exportFaithfulSvgBtn').addEventListener('click',async()=>{try{showToast('Creo SVG fedele…');await exportFaithfulSvg();showToast('SVG fedele pronto');}catch(e){console.error(e);showToast('Errore SVG fedele');}});
$('exportPdfBtn').addEventListener('click',async()=>{try{showToast('Creo il PDF…');await exportPdf();showToast('PDF pronto');}catch(e){console.error(e);$('saveStatus').textContent='errore PDF';showToast('Errore durante il PDF');}});
$('exportAllBtn').addEventListener('click',async()=>{try{showToast('Creo il carosello…');const files=[];for(let i=0;i<project.slides.length;i++){$('saveStatus').textContent=`esporto ${i+1}/${project.slides.length}`;files.push({name:`${String(i+1).padStart(2,'0')}.png`,blob:await renderPngBlob(project.slides[i])});}downloadBlob(await makeZip(files),`${slug(project.name)}.zip`);$('saveStatus').textContent='salvato sul dispositivo';showToast('ZIP pronto');}catch(e){console.error(e);$('saveStatus').textContent='errore export';showToast('Errore durante lo ZIP');}});
$('exportProjectBtn').addEventListener('click',()=>downloadBlob(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${slug(project.name)}.cdb.json`));
$('projectInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{let parsed=migrateLegacyProject(JSON.parse(reader.result));if(!Array.isArray(parsed.slides)||!parsed.slides.length)throw new Error('Formato non valido');project={...parsed,version:'0.6.0',showNumbers:Boolean(parsed.showNumbers),slides:parsed.slides.map(normalizeSlide)};currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();showToast('Progetto aperto');}catch(error){console.error(error);showToast('File progetto non valido');}};reader.readAsText(file);e.target.value='';});

window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restoreHistory(historyIndex+(e.shiftKey?1:-1));}if(e.key==='Escape'&&$('textDialog').open)$('textDialog').close();});

async function fileToDataUrl(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error('Asset non disponibile');return blobToDataUrl(await response.blob());}
async function initialize(){
  if(initialized)return;initialized=true;
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js?v=0.6.0').then(r=>r.update()).catch(console.warn);
  try{logoData=await fileToDataUrl('assets/logo.png');}catch(e){console.warn(e);}
  project=await loadState();currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();setTab(activeTab);document.fonts?.ready.then(()=>render()).catch(()=>{});
}
window.addEventListener('cdb:unlock',initialize);function renderOverlayList(){const el=$('overlayList');if(!el)return;const list=currentSlide()?.overlays||[];if(!list.length){el.innerHTML='<p class="panel-note">Nessuna foto libera nella slide.</p>';return;}el.innerHTML=list.map(ov=>`<div class="free-text-item${selected===`overlay:${ov.id}`?' active':''}"><button type="button" data-overlay-select="${ov.id}">${esc(ov.name||'Foto libera')}</button><button type="button" data-overlay-delete="${ov.id}">×</button></div>`).join('');el.querySelectorAll('[data-overlay-select]').forEach(b=>b.addEventListener('click',()=>selectElement(`overlay:${b.dataset.overlaySelect}`)));el.querySelectorAll('[data-overlay-delete]').forEach(b=>b.addEventListener('click',()=>{selected=`overlay:${b.dataset.overlayDelete}`;deleteSelectedElement();}));}
async function addOverlayFiles(files){for(const file of [...(files||[])]){const src=await prepareImageFile(file);try{await saveImageLibrary(src,file.name,'Caricata');}catch(error){console.warn('Archivio immagini non disponibile',error);}const ov=overlayDefaults({src,name:file.name});currentSlide().overlays=currentSlide().overlays||[];currentSlide().overlays.push(ov);selected=`overlay:${ov.id}`;}render();commitHistory();}

