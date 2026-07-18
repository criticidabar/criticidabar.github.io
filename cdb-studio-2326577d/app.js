'use strict';

const W = 1080;
const H = 1350;
const SVG_NS = 'http://www.w3.org/2000/svg';
const COLORS = { orange:'#ff6f00', cream:'#fff6ea', blue:'#005c78', ink:'#111111', yellow:'#f4c430', white:'#ffffff' };
const BRAND_SWATCHES = [COLORS.orange,COLORS.cream,COLORS.blue,COLORS.white,COLORS.ink,COLORS.yellow,'#1f27b8'];
const IMAGE_STOP_WORDS = new Set('a ad al allo ai agli alla alle anche ancora avere che chi ci con contro cosa cui da dal dalla dalle dei del della delle di e ed era essere fa fra gli ha hanno i il in io la le lo ma mi ne nei nel nella nelle non o per più poi quale quando quanto questa queste questi questo se senza si sia sono su sul sulla tra un una uno voi come dopo prima molto tutto tutti tutte ogni può possono perché mentre invece dove'.split(/\s+/));
const DB_NAME = 'cdb-studio';
const DB_VERSION = 8;
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
let autoImageSearchRunning = false;
let paletteTarget = 'accent';
let cropMode = false;
let guideState = [];
let tmdbKey = '';
let selectionCycle = {x:0,y:0,keys:[],index:-1,time:0};
let qualityReport = null;
let pendingQualityExport = null;
let templateEditMode = false;

function uid(){ return Math.random().toString(36).slice(2,10); }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
function esc(v=''){ return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function slug(v){ return String(v||'carosello').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'carosello'; }
function currentSlide(){ return project.slides[currentIndex]; }
function isFreeSelected(){return typeof selected==='string'&&selected.startsWith('free:');}
function isOverlaySelected(){return typeof selected==='string'&&selected.startsWith('overlay:');}
function selectedFreeId(){return isFreeSelected()?selected.slice(5):'';}
function selectedOverlayId(){return isOverlaySelected()?selected.slice(8):'';}
function currentElementModel(){const slide=currentSlide();return slide?elementModel(slide,selected):null;}
function currentElement(){return currentElementModel()?.data||null;}
function isTextSelected(){return currentElementModel()?.type==='text';}
function templateSpec(slide){ return FAMILIES[slide.family]?.variants?.[slide.variant] || FAMILIES.c.variants.copertina; }
function designOf(slide){ return templateSpec(slide).design; }
function transformDefaults(){ return {dx:0,dy:0,scale:1,rotation:0}; }
function cropDefaults(overrides={}){return{mode:'cover',zoom:1,x:0,y:0,naturalW:0,naturalH:0,...overrides};}
function normalizeCrop(value={}){return{mode:value?.mode==='contain'?'contain':'cover',zoom:clamp(Number(value?.zoom??1),1,5),x:clamp(Number(value?.x??0),-1,1),y:clamp(Number(value?.y??0),-1,1),naturalW:Math.max(0,Number(value?.naturalW||value?.width||0)),naturalH:Math.max(0,Number(value?.naturalH||value?.height||0))};}
function imageElementDefaults(overrides={}){const crop=normalizeCrop(overrides.crop||{});return{src:'',...transformDefaults(),...overrides,crop};}
function isImageSelected(){return currentElementModel()?.type==='image';}
function selectedCrop(){const el=currentElement();return isImageSelected()&&el?(el.crop=normalizeCrop(el.crop||{})):null;}
function cropPlacement(state,rect){const crop=normalizeCrop(state?.crop||{}),nw=Math.max(1,crop.naturalW||rect.w||1),nh=Math.max(1,crop.naturalH||rect.h||1);const base=crop.mode==='contain'?Math.min(rect.w/nw,rect.h/nh):Math.max(rect.w/nw,rect.h/nh);const scale=base*crop.zoom,dw=nw*scale,dh=nh*scale,extraX=Math.max(0,dw-rect.w),extraY=Math.max(0,dh-rect.h);return{x:rect.x+(rect.w-dw)/2+crop.x*extraX/2,y:rect.y+(rect.h-dh)/2+crop.y*extraY/2,w:dw,h:dh,extraX,extraY,crop};}
async function hydrateImageMeta(target){if(!target?.src)return target;if(target.crop?.naturalW&&target.crop?.naturalH)return target;try{const img=await loadImage(target.src);target.crop=normalizeCrop({...target.crop,naturalW:img.naturalWidth,naturalH:img.naturalHeight});}catch(_){}return target;}
function resetCrop(target,mode='cover'){if(!target)return;target.crop=normalizeCrop({...target.crop,mode,zoom:1,x:0,y:0});}

function paletteDefaults(){return{background:COLORS.blue,accent:COLORS.orange,secondary:'#1f27b8',surface:COLORS.cream,ink:COLORS.ink};}
function normalizeHex(value,fallback){const v=String(value||'').trim();return /^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():fallback;}
function normalizePalette(value={}){const d=paletteDefaults();return{background:normalizeHex(value.background,d.background),accent:normalizeHex(value.accent,d.accent),secondary:normalizeHex(value.secondary,d.secondary),surface:normalizeHex(value.surface,d.surface),ink:normalizeHex(value.ink,d.ink)};}
function paletteFor(slide){slide.palette=normalizePalette(slide.palette);return slide.palette;}
function mixHex(a,b,amount=.5){const pa=parseInt(normalizeHex(a,'#000000').slice(1),16),pb=parseInt(normalizeHex(b,'#000000').slice(1),16),t=clamp(Number(amount)||0,0,1);const ar=(pa>>16)&255,ag=(pa>>8)&255,ab=pa&255,br=(pb>>16)&255,bg=(pb>>8)&255,bb=pb&255;return'#'+[Math.round(ar+(br-ar)*t),Math.round(ag+(bg-ag)*t),Math.round(ab+(bb-ab)*t)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function meaningfulImageWords(text,max=6){const clean=String(text||'').replace(/https?:\/\/\S+/g,' ').replace(/[^a-zA-ZÀ-ÿ0-9'’\- ]+/g,' ').split(/\s+/).map(x=>x.trim()).filter(Boolean);const out=[];for(const word of clean){const key=word.toLowerCase().replace(/[’']/g,'');if(key.length<3||IMAGE_STOP_WORDS.has(key)||/^\d+$/.test(key))continue;if(!out.some(x=>x.toLowerCase()===word.toLowerCase()))out.push(word);if(out.length>=max)break;}return out;}
function buildSlideImageQuery(slide,index=project?.slides?.indexOf(slide)||0){
  const topic=meaningfulImageWords(project?.name||'',5);const raw=`${slide.title?.text||''} ${slide.subtitle?.text||''}`;const lower=raw.toLowerCase();let context=[];
  const rules=[
    [['npc','abitant','doppiat','personagg','famiglia','flirt'],['characters','cast']],
    [['combatt','armi','nemic','battaglia','azione','magia'],['action','scene']],
    [['regista','director','autore'],['director','portrait']],
    [['attore','attrice','cast','interpreta'],['cast','portrait']],
    [['casa','affitto','inquilin','appartamento'],['house','scene']],
    [['negozio','merchant','attività','attivita'],['shop','scene']],
    [['crimin','taglia','guardie','polizia'],['crime','scene']],
    [['vestiti','acconciature','costumi','personalizzazione'],['costume','character']],
    [['open world','region','paesaggio','città','citta','mondo'],['landscape','scene']],
    [['musica','colonna sonora','soundtrack'],['music','scene']],
    [['finale','conclusione','ending'],['final scene']],
    [['videogioco','gameplay','controller'],['gameplay']],
    [['film','cinema','pellicola'],['movie','still']],
    [['serie','episodio','stagione'],['TV series','still']]
  ];
  for(const [need,add] of rules){if(need.some(x=>lower.includes(x))){context=add;break;}}
  const specific=meaningfulImageWords(`${slide.title?.text||''} ${slide.subtitle?.text||''}`,6);
  const type=designOf(slide).includes('cover')?'poster official':context.join(' ');
  return [...topic,...specific,type].filter(Boolean).join(' ').replace(/\s+/g,' ').trim().slice(0,180) || `cinema ${index+1}`;
}
function ensureSlideImageQuery(slide,index){if(!slide.imageQuery)slide.imageQuery=buildSlideImageQuery(slide,index);return slide.imageQuery;}

function normalizeFontName(value){const name=String(value||'').trim();if(!name)return 'Anton';if(/nickel\s*gothic/i.test(name))return 'Anton';return ['Anton','Anybody','Archivo','Saira'].includes(name)?name:'Anton';}
function normalizeTextStyle(value={}){const out={...value,font:normalizeFontName(value.font)};if(out.font==='Anton')out.weight=400;return out;}
function textDefaults(overrides={}){ return normalizeTextStyle({text:'',font:'Anton',size:88,weight:400,width:90,lineHeight:.94,color:COLORS.cream,align:null,maxWidth:null,...transformDefaults(),...overrides}); }
function freeTextDefaults(overrides={}){return normalizeTextStyle({id:uid(),x:540,y:675,text:'NUOVO TESTO',font:'Anton',size:72,weight:400,width:90,lineHeight:1,color:COLORS.orange,align:'center',maxWidth:820,...transformDefaults(),...overrides});}
function normalizeFreeText(value,index=0){const mapColor={'%%BLUE%%':COLORS.blue,'%%ORANGE%%':COLORS.orange,'%%CREAM%%':COLORS.cream};return freeTextDefaults({id:value?.id||uid(),text:value?.text??value?.t??'NUOVO TESTO',x:Number(value?.x??540),y:Number(value?.y??(600+index*90)),dx:Number(value?.dx||0),dy:Number(value?.dy||0),scale:Number(value?.scale??value?.s??1),rotation:Number(value?.rotation||0),size:Number(value?.size??value?.fs??72),color:mapColor[value?.color??value?.c]||value?.color||value?.c||COLORS.orange,font:normalizeFontName(value?.font||value?.f||'Anton'),weight:Number(value?.weight||400),width:Number(value?.width||90),lineHeight:Number(value?.lineHeight||1),align:value?.align||'center',maxWidth:Number(value?.maxWidth||820)});}
function overlayDefaults(overrides={}){const crop=normalizeCrop(overrides.crop||{});return {id:uid(),src:'',name:'Foto libera',x:540,y:675,w:430,h:430,...transformDefaults(),...overrides,crop};}
function normalizeOverlay(value,index=0){return overlayDefaults({id:value?.id||uid(),src:value?.src||value?.data||'',name:value?.name||value?.file||`Foto libera ${index+1}`,x:Number(value?.x??540),y:Number(value?.y??675),w:Number(value?.w??430),h:Number(value?.h??430),dx:Number(value?.dx||0),dy:Number(value?.dy||0),scale:Number(value?.scale??value?.s??1),rotation:Number(value?.rotation||0),crop:normalizeCrop(value?.crop||{})});}

const EDITABLE_TEMPLATE_DESIGNS=new Set(['new-cover','new-body','new-question','new-final']);
function shapeDefaults(overrides={}){return{id:uid(),name:'Forma',type:'rect',x:340,y:500,w:400,h:220,fill:'palette:accent',stroke:'none',strokeWidth:0,radius:20,alpha:1,text:'CRITICI DA BAR',font:'Archivo',size:28,weight:800,align:'center',points:[],tail:.42,tailWidth:.16,tailHeight:.18,...transformDefaults(),...overrides};}
function normalizeShape(value,index=0){const type=['rect','ellipse','polygon','bubble','label'].includes(value?.type)?value.type:'rect';return shapeDefaults({...value,id:value?.id||uid(),name:value?.name||`Forma ${index+1}`,type,x:Number(value?.x??340),y:Number(value?.y??500),w:Math.max(12,Number(value?.w??400)),h:Math.max(12,Number(value?.h??220)),fill:value?.fill||'palette:accent',stroke:value?.stroke||'none',strokeWidth:Math.max(0,Number(value?.strokeWidth||0)),radius:Math.max(0,Number(value?.radius||0)),alpha:clamp(Number(value?.alpha??1),0,1),size:Math.max(8,Number(value?.size||28)),weight:Math.max(100,Number(value?.weight||800)),points:Array.isArray(value?.points)?value.points:[]});}
function templateShapeDefaults(design){
  const s=shapeDefaults;
  if(design==='new-cover')return[
    s({name:'Velatura scura',type:'rect',x:0,y:0,w:1080,h:1350,fill:'palette:ink',stroke:'none',alpha:.38}),
    s({name:'Diagonale arancione',type:'polygon',x:-120,y:810,w:1280,h:620,fill:'palette:accent',points:[[0,.30],[1,0],[1,1],[0,1]]}),
    s({name:'Fascia secondaria',type:'polygon',x:-90,y:930,w:1250,h:263,fill:'palette:secondary',alpha:.96,points:[[0,.70],[1,0],[1,.30],[0,1]]}),
    s({name:'Etichetta crema',type:'rect',x:76,y:82,w:244,h:47,radius:24,fill:'palette:surface'}),
    s({name:'Testo etichetta',type:'label',x:76,y:82,w:244,h:47,fill:'palette:ink',text:'CRITICI DA BAR',font:'Archivo',size:22,weight:800})
  ];
  if(design==='new-body')return[
    s({name:'Barra arancione',type:'rect',x:0,y:585,w:1080,h:56,fill:'palette:accent'}),
    s({name:'Taglio secondario',type:'polygon',x:0,y:542,w:1080,h:100,fill:'palette:secondary',points:[[0,.60],[1,0],[1,1],[0,1]]}),
    s({name:'Etichetta arancione',type:'rect',x:72,y:672,w:238,h:43,radius:21,fill:'palette:accent'}),
    s({name:'Testo etichetta',type:'label',x:72,y:672,w:238,h:43,fill:'palette:ink',text:'CRITICI DA BAR',font:'Archivo',size:22,weight:800})
  ];
  if(design==='new-question')return[
    s({name:'Cerchio alto',type:'ellipse',x:695,y:-105,w:490,h:490,fill:'mix:background:ink:.18'}),
    s({name:'Cerchio basso',type:'ellipse',x:-150,y:920,w:560,h:560,fill:'mix:background:ink:.18'}),
    s({name:'Fumetto domanda',type:'bubble',x:75,y:300,w:930,h:642,radius:43,fill:'palette:accent',stroke:'palette:secondary',strokeWidth:12,tail:.43,tailWidth:.13,tailHeight:.20})
  ];
  if(design==='new-final')return[
    s({name:'Taglio superiore',type:'polygon',x:0,y:0,w:1080,h:710,fill:'palette:background',points:[[0,0],[1,0],[1,.77],[0,1]]}),
    s({name:'Taglio inferiore',type:'polygon',x:0,y:735,w:1080,h:615,fill:'mix:background:ink:.28',points:[[0,.25],[1,0],[1,1],[0,1]]}),
    s({name:'Cerchio decorativo',type:'ellipse',x:750,y:70,w:360,h:360,fill:'mix:background:surface:.12',alpha:.75})
  ];
  return[];
}
function usesSeparatedTemplateShapes(slide){return EDITABLE_TEMPLATE_DESIGNS.has(designOf(slide))&&slide.templateShapeMode!=='legacy';}
function ensureTemplateShapes(slide){
  if(!Array.isArray(slide.templateShapes))slide.templateShapes=[];
  slide.templateShapes=slide.templateShapes.map(normalizeShape);
  if(usesSeparatedTemplateShapes(slide)&&!slide.templateShapes.length)slide.templateShapes=templateShapeDefaults(designOf(slide));
  return slide.templateShapes;
}
function isShapeSelected(){return typeof selected==='string'&&selected.startsWith('shape:');}
function selectedShapeId(){return isShapeSelected()?selected.slice(6):'';}
function selectedShape(){return isShapeSelected()?(currentSlide()?.templateShapes||[]).find(x=>x.id===selectedShapeId())||null:null;}
function resolveShapePaint(slide,value){const p=paletteFor(slide),v=String(value||'none');if(v==='none')return'none';if(v.startsWith('palette:'))return p[v.slice(8)]||COLORS.orange;if(v.startsWith('mix:')){const [,a,b,t]=v.split(':');return mixHex(p[a]||COLORS.blue,p[b]||COLORS.ink,Number(t||.5));}return /^#[0-9a-f]{6}$/i.test(v)?v:'#ff6f00';}
function shapeElementKeys(slide){return ensureTemplateShapes(slide).map(x=>`shape:${x.id}`);}

const TEMPLATE_BACK_KEY='template:back';
const TEMPLATE_FRONT_KEY='template:front';
const TEMPLATE_AUX_KEY='template:aux';
const LAYER_SCHEMA_VERSION=3;

function elementData(slide,key){
  if(!slide||!key)return null;
  if(key==='image'||key==='title'||key==='subtitle'||key==='logo'||key==='number')return slide[key]||null;
  if(key.startsWith('shape:'))return (slide.templateShapes||[]).find(x=>x.id===key.slice(6))||null;
  if(key.startsWith('free:'))return (slide.freeTexts||[]).find(x=>x.id===key.slice(5))||null;
  if(key.startsWith('overlay:'))return (slide.overlays||[]).find(x=>x.id===key.slice(8))||null;
  return null;
}
function elementType(key){
  if(key==='title'||key==='subtitle'||key.startsWith('free:'))return 'text';
  if(key==='image'||key.startsWith('overlay:'))return 'image';
  if(key==='logo')return 'logo';
  if(key==='number')return 'number';
  if(key.startsWith('shape:'))return 'shape';
  if(key===TEMPLATE_BACK_KEY||key===TEMPLATE_FRONT_KEY||key===TEMPLATE_AUX_KEY)return 'template';
  return 'unknown';
}
function layerLabel(slide,key){
  if(key===TEMPLATE_BACK_KEY)return 'Sfondo template';
  if(key===TEMPLATE_FRONT_KEY)return usesSeparatedTemplateShapes(slide)?'Gruppo decorazioni originale (sostituito)':'Forme e decorazioni';
  if(key===TEMPLATE_AUX_KEY)return 'Etichette del template';
  if(key==='title')return 'Titolo';
  if(key==='subtitle')return 'Testo';
  if(key==='logo')return 'Logo';
  if(key==='number')return project?.showNumbers?'Numero slide':'Numero slide (disattivo)';
  if(key==='image')return 'Immagine principale';
  if(key.startsWith('shape:')){const item=(slide.templateShapes||[]).find(x=>x.id===key.slice(6));return item?.name||'Forma template';}
  if(key.startsWith('free:')){const item=(slide.freeTexts||[]).find(x=>x.id===key.slice(5));return (item?.text||'Testo libero').trim().slice(0,42)||'Testo libero';}
  if(key.startsWith('overlay:')){const item=(slide.overlays||[]).find(x=>x.id===key.slice(8));return item?.name||'Foto libera';}
  return key;
}
function dynamicElementKeys(slide){
  return [
    ...(slide.overlays||[]).map(x=>`overlay:${x.id}`),
    'title','subtitle',
    ...(slide.freeTexts||[]).map(x=>`free:${x.id}`),
    'logo','number'
  ];
}
function defaultLayerOrder(slide){return ['image',TEMPLATE_FRONT_KEY,...shapeElementKeys(slide),TEMPLATE_AUX_KEY,...dynamicElementKeys(slide)];}
function allElementKeys(slide){return [TEMPLATE_BACK_KEY,...defaultLayerOrder(slide)];}
function normalizeLayerStateValue(key,value={}){
  const state=value&&typeof value==='object'?value:{};const template=elementType(key)==='template';
  state.visible=state.visible!==false;state.locked=template?true:Boolean(state.locked);state.opacity=clamp(Number(state.opacity??1),0,1);return state;
}
function ensureLayerModel(slide){
  ensureTemplateShapes(slide);const valid=defaultLayerOrder(slide),validSet=new Set(valid),old=Array.isArray(slide.layerOrder)?slide.layerOrder:[];
  const oldDynamic=old.filter(key=>validSet.has(key)&&![TEMPLATE_FRONT_KEY,TEMPLATE_AUX_KEY].includes(key));
  const missingDynamic=valid.filter(key=>![TEMPLATE_FRONT_KEY,TEMPLATE_AUX_KEY].includes(key)&&!oldDynamic.includes(key));
  if(slide.layerSchemaVersion!==LAYER_SCHEMA_VERSION||!old.includes(TEMPLATE_FRONT_KEY)||!old.includes(TEMPLATE_AUX_KEY)){
    const previous=oldDynamic.filter(key=>key!=='image');
    const missing=missingDynamic.filter(key=>key!=='image'&&!previous.includes(key));
    slide.layerOrder=['image',TEMPLATE_FRONT_KEY,...shapeElementKeys(slide),TEMPLATE_AUX_KEY,...previous.filter(k=>!k.startsWith('shape:')),...missing.filter(k=>!k.startsWith('shape:'))];
  }else{
    const seen=new Set();
    slide.layerOrder=[...old,...valid].filter(key=>validSet.has(key)&&!seen.has(key)&&seen.add(key));
  }
  slide.layerSchemaVersion=LAYER_SCHEMA_VERSION;
  slide.layerState=slide.layerState&&typeof slide.layerState==='object'?slide.layerState:{};
  for(const key of allElementKeys(slide)){slide.layerState[key]=normalizeLayerStateValue(key,slide.layerState[key]);if(key.startsWith('shape:')&&slide.layerState[key]._shapeInit!==true){slide.layerState[key].locked=!templateEditMode;slide.layerState[key]._shapeInit=true;}}
  Object.keys(slide.layerState).forEach(key=>{if(!allElementKeys(slide).includes(key))delete slide.layerState[key];});
  return slide;
}
function layerState(slide,key){ensureLayerModel(slide);return slide.layerState[key]||(slide.layerState[key]=normalizeLayerStateValue(key));}
function layerVisible(slide,key){return layerState(slide,key).visible!==false;}
function layerLocked(slide,key){return Boolean(layerState(slide,key).locked);}
function layerOpacity(slide,key){return clamp(Number(layerState(slide,key).opacity??1),0,1);}
function layerCanReorder(key){return ![TEMPLATE_BACK_KEY,TEMPLATE_FRONT_KEY,TEMPLATE_AUX_KEY].includes(key);}
function elementCapabilities(slide,key){
  const type=elementType(key),data=elementData(slide,key),locked=layerLocked(slide,key);
  return {
    select:true,move:Boolean(data)&&!locked,resize:Boolean(data)&&!locked,rotate:Boolean(data)&&!locked,
    opacity:true,reorder:layerCanReorder(key),duplicate:['text','image','shape'].includes(type)&&key!=='image',
    delete:key.startsWith('free:')||key.startsWith('overlay:')||key.startsWith('shape:'),editText:type==='text',editStyle:type==='text'||type==='shape'
  };
}
function elementModel(slide,key){
  if(!slide||!allElementKeys(slide).includes(key))return null;
  return {key,type:elementType(key),label:layerLabel(slide,key),data:elementData(slide,key),layout:layoutForElement(slide,key),state:layerState(slide,key),capabilities:elementCapabilities(slide,key)};
}
function currentLayerLocked(){return Boolean(currentElementModel()?.state.locked);}
function currentLayerVisible(){return Boolean(currentElementModel()?.state.visible);}

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
  const design = FAMILIES[family]?.variants?.[variant]?.design || 'classic-cover';
  const slide={
    id:uid(),family,variant,kicker:'',dateText:'',bubbleText:'',imageQuery:'',imageSource:'',palette:paletteDefaults(),
    image:imageElementDefaults(),logo:{...transformDefaults()},number:{...transformDefaults()},freeTexts:[],overlays:[],templateShapeMode:EDITABLE_TEMPLATE_DESIGNS.has(design)?'separated':'legacy',templateShapes:templateShapeDefaults(design),layerOrder:[],layerState:{},layerSchemaVersion:LAYER_SCHEMA_VERSION,
    title:textDefaults({text:'5 FILM CHE MERITAVANO MOLTO DI PIÙ',...defs.title}),
    subtitle:textDefaults({text:'Una selezione firmata Critici da Bar',...defs.subtitle})
  };
  return ensureLayerModel(slide);
}

function newProject(){
  const a=createSlide('c','copertina');
  const b=createSlide('c','corpo'); b.title.text='UN FILM CHE NON HA AVUTO IL SUCCESSO CHE MERITAVA'; b.subtitle.text='Qui puoi inserire il testo della slide.';
  const c=createSlide('c','domanda'); c.title.text='E VOI CHE NE PENSATE?'; c.subtitle.text='Diteci la vostra nei commenti';
  return {version:'0.12.0',name:'Nuovo carosello',showNumbers:false,snapGuides:true,slides:[a,b,c]};
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
  const normalized={...base,...value,family,variant,palette:normalizePalette(value?.palette||base.palette),imageQuery:value?.imageQuery||'',imageSource:value?.imageSource||'',
    image:imageElementDefaults({...base.image,...(value?.image||{}),crop:normalizeCrop(value?.image?.crop||base.image.crop)}),logo:{...base.logo,...(value?.logo||{})},number:{...base.number,...(value?.number||{})},
    title:normalizeTextStyle({...base.title,...(value?.title||{})}),subtitle:normalizeTextStyle({...base.subtitle,...(value?.subtitle||{})}),
    freeTexts:Array.isArray(freeSource)?freeSource.map(normalizeFreeText):[],
    overlays:Array.isArray(overlaySource)?overlaySource.map(normalizeOverlay):[],
    templateShapeMode:value?.templateShapeMode||(EDITABLE_TEMPLATE_DESIGNS.has(designOf(base))?'separated':'legacy'),templateShapes:Array.isArray(value?.templateShapes)?value.templateShapes.map(normalizeShape):deepClone(base.templateShapes||[]),
    layerOrder:Array.isArray(value?.layerOrder)?[...value.layerOrder]:[],
    layerState:value?.layerState&&typeof value.layerState==='object'?deepClone(value.layerState):{},layerSchemaVersion:Number(value?.layerSchemaVersion||0)
  };
  return ensureLayerModel(normalized);
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
    return {version:'0.12.0',name:parsed.slides[0]?.postTitle||'Progetto importato',showNumbers:Boolean(parsed.client.globalNum),snapGuides:true,slides};
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
    saved.version='0.12.0';saved.slides=(saved.slides||[]).map(normalizeSlide);
    if(!saved.slides.length) saved.slides=[createSlide()];
    imageLibrary=await storeAll('images');
    personalTemplates=await storeAll('templates');
    return saved;
  }catch(error){ console.warn(error); return newProject(); }
}

function showToast(message){ const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300); }
function setStatus(message,kind=''){ const el=$('imageSearchStatus');el.textContent=message;el.className=`inline-status${kind?' '+kind:''}`; }
function markDirty(){ if(qualityReport&&!qualityReport.stale){qualityReport.stale=true;renderQualityPanel();} $('saveStatus').textContent='salvataggio…';clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await storePut('projects',CURRENT_KEY,deepClone(project));$('saveStatus').textContent='salvato sul dispositivo';}catch(e){console.error(e);$('saveStatus').textContent='errore salvataggio';}},350); }
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
function numberSvg(slide){if(!project?.showNumbers)return '';const n=Math.max(1,project.slides.indexOf(slide)+1),layout=layoutForElement(slide,'number');return `<g data-element="number" data-cx="${layout.cx}" data-cy="${layout.cy}" opacity="${layerOpacity(slide,'number')}" transform="${transformAttr(slide.number,layout.cx,layout.cy,slide.number.rotation||0)}" aria-label="Slide ${n}"><rect x="36" y="1260" width="82" height="52" rx="26" fill="${COLORS.orange}"/><text x="77" y="1297" text-anchor="middle" font-family="Archivo" font-size="28" font-weight="850" fill="${COLORS.blue}">${n}</text></g>`;}
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

function renderCanvasOnly(){
  const svg=buildSvg(currentSlide(),{suffix:'main'});
  canvas.innerHTML=svg.replace(/^<svg[^>]*>|<\/svg>$/g,'');
  drawSelection();
}
function render(){
  renderCanvasOnly();renderFilmstrip();syncControls();syncCropControls();renderVariantControls();renderTemplateShapeEditor();renderImageLibrary();renderPersonalTemplates();renderFreeTextList();renderOverlayList();renderLayers();renderQualityPanel();
  $('slideCounter').textContent=`${currentIndex+1} / ${project.slides.length}`;
  $('prevSlideBtn').disabled=currentIndex===0;$('nextSlideBtn').disabled=currentIndex===project.slides.length-1;
  $('deleteSlideBtn').disabled=project.slides.length===1;$('moveLeftBtn').disabled=currentIndex===0;$('moveRightBtn').disabled=currentIndex===project.slides.length-1;updateUndoRedo();
}
function renderFilmstrip(){
  const strip=$('filmstrip');strip.innerHTML='';
  project.slides.forEach((slide,index)=>{const b=document.createElement('button');b.className=`thumb${index===currentIndex?' active':''}`;b.type='button';b.innerHTML=`${buildSvg(slide,{suffix:`thumb${index}`})}<span class="thumb-number">${index+1}</span>${qualityBadgeHtml(index)}`;b.addEventListener('click',()=>{currentIndex=index;selected='title';render();});strip.appendChild(b);});
  requestAnimationFrame(()=>strip.querySelector('.thumb.active')?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
}
function matrixPoint(matrix,x,y){const p=new DOMPoint(x,y).matrixTransform(matrix);return{x:p.x,y:p.y};}
function transformedRectBounds(layout,state={},baseRotation=0){if(!layout?.w||!layout?.h)return null;const cx=layout.cx,cy=layout.cy,scale=state.scale||1,angle=((baseRotation||0)+(state.rotation||0))*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),dx=state.dx||0,dy=state.dy||0;const pts=[[layout.x,layout.y],[layout.x+layout.w,layout.y],[layout.x+layout.w,layout.y+layout.h],[layout.x,layout.y+layout.h]].map(([x,y])=>{const sx=(x-cx)*scale,sy=(y-cy)*scale;return{x:cx+dx+sx*cos-sy*sin,y:cy+dy+sx*sin+sy*cos};});const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
function selectionBounds(){
  const model=currentElementModel();if(!model)return null;
  if(['image','logo','number'].includes(model.type)){const base=selected==='image'?(model.layout?.rotation||0):0;return transformedRectBounds(model.layout,model.data||{},base);}
  const target=canvas.querySelector(`[data-element="${selected}"]`);if(!target)return null;
  try{const rect=target.getBoundingClientRect();if(!rect.width&&!rect.height)return null;const a=screenToSvg(rect.left,rect.top),b=screenToSvg(rect.right,rect.bottom);return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};}catch(_){return null;}
}
function svgNode(name,attrs={}){const n=document.createElementNS(SVG_NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n;}
function drawGuides(layer){for(const guide of guideState){if(guide.axis==='x')layer.appendChild(svgNode('line',{x1:guide.value,y1:0,x2:guide.value,y2:H,stroke:'#35d7ff','stroke-width':3,'stroke-dasharray':'10 8','pointer-events':'none','vector-effect':'non-scaling-stroke'}));else layer.appendChild(svgNode('line',{x1:0,y1:guide.value,x2:W,y2:guide.value,stroke:'#35d7ff','stroke-width':3,'stroke-dasharray':'10 8','pointer-events':'none','vector-effect':'non-scaling-stroke'}));}}
function drawSelection(){
  canvas.querySelector('#selectionLayer')?.remove();const b=selectionBounds();if(!b)return;
  const pad=18,x=b.x-pad,y=b.y-pad,w=Math.max(8,b.w+pad*2),h=Math.max(8,b.h+pad*2);
  const model=currentElementModel(),locked=Boolean(model?.state.locked),caps=model?.capabilities||{};
  const layer=svgNode('g',{id:'selectionLayer'});drawGuides(layer);
  const cropping=cropMode&&model?.type==='image'&&model?.data?.src;
  if(cropping){const move=svgNode('rect',{x,y,width:w,height:h,rx:12,fill:'transparent','pointer-events':'all',cursor:'grab'});move.dataset.handle='crop';layer.appendChild(move);}
  else if(caps.move){const move=svgNode('rect',{x,y,width:w,height:h,rx:12,fill:'transparent','pointer-events':'all',cursor:'move'});move.dataset.handle='move';layer.appendChild(move);}
  layer.appendChild(svgNode('rect',{x,y,width:w,height:h,rx:12,fill:'none',stroke:cropping?'#f4c430':locked?'#9b9b9b':COLORS.orange,'stroke-width':cropping?7:5,'stroke-dasharray':cropping?'20 10':'14 10','pointer-events':'none','vector-effect':'non-scaling-stroke'}));
  if(!cropping&&caps.resize){const corners=[['nw',x,y,'nwse-resize'],['ne',x+w,y,'nesw-resize'],['se',x+w,y+h,'nwse-resize'],['sw',x,y+h,'nesw-resize']];for(const [corner,cx,cy,cursor] of corners){const handle=svgNode('circle',{cx,cy,r:30,fill:COLORS.orange,stroke:COLORS.cream,'stroke-width':7,'pointer-events':'all',cursor,'vector-effect':'non-scaling-stroke'});handle.dataset.handle='scale';handle.dataset.corner=corner;layer.appendChild(handle);}}
  if(!cropping&&isTextSelected()&&caps.resize){const widthHandle=svgNode('rect',{x:x+w-22,y:y+h/2-28,width:44,height:56,rx:12,fill:locked?'#777':COLORS.blue,stroke:COLORS.cream,'stroke-width':6,'pointer-events':'all',cursor:'ew-resize','vector-effect':'non-scaling-stroke'});widthHandle.dataset.handle='width';layer.appendChild(widthHandle);}
  if(cropping){const tag=svgNode('g',{'pointer-events':'none'});tag.appendChild(svgNode('rect',{x:x+12,y:y+12,width:180,height:44,rx:20,fill:'#111',opacity:.86}));const tx=svgNode('text',{x:x+102,y:y+42,'text-anchor':'middle',fill:'#fff','font-size':22,'font-family':'Arial','font-weight':800});tx.textContent='RITAGLIO';tag.appendChild(tx);layer.appendChild(tag);}
  canvas.appendChild(layer);
}
function updateDomTransform(key){const g=canvas.querySelector(`[data-element="${key}"]`),model=currentElementModel(),el=model?.data;if(!g||!el)return;const cx=Number(g.dataset.cx),cy=Number(g.dataset.cy);const base=key==='image'?(layoutFor(currentSlide()).image.rotation||0):0;g.setAttribute('transform',transformAttr(el,cx,cy,base+(el.rotation||0)));drawSelection();}
function selectElement(key){const model=elementModel(currentSlide(),key);if(!model)return;if(cropMode&&model.type!=='image')cropMode=false;selected=key;drawSelection();syncControls();syncCropControls();renderTemplateShapeEditor();renderFreeTextList();renderOverlayList();renderLayers();}
function setTab(name){activeTab=name;document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));}
function elementAbsolutePosition(model){const layout=model?.layout,data=model?.data;if(!layout)return{x:W/2,y:H/2};return{x:Math.round(layout.cx+(data?.dx||0)),y:Math.round(layout.cy+(data?.dy||0))};}
function setElementAbsolutePosition(axis,value){const model=currentElementModel(),data=model?.data,layout=model?.layout;if(!data||!layout||!model.capabilities.move)return;const n=Number(value);if(!Number.isFinite(n))return;if(axis==='x')data.dx=n-layout.cx;else data.dy=n-layout.cy;updateDomTransform(selected);syncControls();markDirty();}
function updateLayerOpacity(value){const model=currentElementModel();if(!model)return;model.state.opacity=clamp(Number(value)/100,0,1);renderCanvasOnly();syncControls();markDirty();}
function syncControls(){
  const s=currentSlide();ensureSlideImageQuery(s,currentIndex);$('titleInput').value=s.title.text;$('subtitleInput').value=s.subtitle.text;$('kickerInput').value=s.kicker||'';$('dateInput').value=s.dateText||'';$('bubbleInput').value=s.bubbleText||'';$('projectNameInput').value=project.name||'Nuovo carosello';
  document.querySelectorAll('.element-bar button').forEach(b=>b.classList.toggle('active',b.dataset.select===selected));
  const model=currentElementModel(),el=model?.data,isText=model?.type==='text',caps=model?.capabilities||{},locked=Boolean(model?.state.locked);if(model?.type==='shape'&&!templateEditMode)model.state.locked=true;
  ['fontSelect','sizeRange','weightRange','widthRange','lineRange','colorInput','alignSelect','textBoxWidthRange','maxWidthRange'].forEach(id=>{if($(id))$(id).disabled=!isText;});
  ['scaleRange','rotationRange','centerHBtn','centerVBtn','resetTransformBtn','positionXInput','positionYInput'].forEach(id=>{if($(id))$(id).disabled=!caps.move;});
  if($('opacityRange'))$('opacityRange').disabled=!model;if($('showNumbersInput'))$('showNumbersInput').checked=Boolean(project.showNumbers);
  if($('layerSelectionState'))$('layerSelectionState').textContent=locked?'Posizione bloccata':model?.state.visible===false?'Elemento nascosto':'Visibile e modificabile';
  if($('imageSearchInput')&&document.activeElement!==$('imageSearchInput'))$('imageSearchInput').value=s.imageQuery||'';if($('snapGuidesInput'))$('snapGuidesInput').checked=project.snapGuides!==false;renderColorPalettes();syncCropControls();
  if(isText&&el){el.font=normalizeFontName(el.font);if(el.font==='Anton')el.weight=400;$('fontSelect').value=el.font;$('weightRange').disabled=el.font==='Anton';$('sizeRange').value=el.size;$('weightRange').value=el.weight;$('widthRange').value=el.width;$('lineRange').value=Math.round(el.lineHeight*100);$('colorInput').value=el.color;if($('alignSelect'))$('alignSelect').value=el.align||model.layout?.align||'left';if($('maxWidthRange'))$('maxWidthRange').value=Math.round(el.maxWidth||model.layout?.maxWidth||820);}
  $('scaleRange').value=Math.round((el?.scale||1)*100);$('rotationRange').value=Math.round(el?.rotation||0);$('sizeOut').textContent=isText?Math.round(el.size):'—';$('weightOut').textContent=isText?el.weight:'—';$('widthOut').textContent=isText?`${el.width}%`:'—';$('lineOut').textContent=isText?Number(el.lineHeight).toFixed(2):'—';$('scaleOut').textContent=`${Math.round((el?.scale||1)*100)}%`;$('rotationOut').textContent=`${Math.round(el?.rotation||0)}°`;if($('maxWidthOut'))$('maxWidthOut').textContent=isText?Math.round(el.maxWidth||model.layout?.maxWidth||820):'—';
  const pos=elementAbsolutePosition(model);if($('positionXInput'))$('positionXInput').value=pos.x;if($('positionYInput'))$('positionYInput').value=pos.y;if($('opacityRange'))$('opacityRange').value=Math.round((model?.state.opacity??1)*100);if($('opacityOut'))$('opacityOut').textContent=`${Math.round((model?.state.opacity??1)*100)}%`;
  ['layerFrontBtn','layerForwardBtn','layerBackwardBtn','layerBackBtn'].forEach(id=>{if($(id))$(id).disabled=!caps.reorder;});if($('duplicateElementBtn'))$('duplicateElementBtn').disabled=!caps.duplicate;if($('deleteSelectedElementBtn')){$('deleteSelectedElementBtn').disabled=!caps.delete;$('deleteSelectedElementBtn').textContent=caps.delete?'Elimina elemento selezionato':'Elemento non eliminabile';}
}

function swatchMarkup(selectedColor=''){return BRAND_SWATCHES.map(color=>`<button type="button" class="color-swatch${color.toLowerCase()===String(selectedColor).toLowerCase()?' active':''}" data-swatch="${color}" style="--swatch:${color}" aria-label="${color}" title="${color}"></button>`).join('');}
function renderColorPalettes(){
  const textWrap=$('textPaletteSwatches'),templateWrap=$('templatePaletteSwatches'),slide=currentSlide(),el=currentElement();
  if(textWrap)textWrap.innerHTML=swatchMarkup(isTextSelected()?el?.color:'');
  if(templateWrap){const p=paletteFor(slide);templateWrap.innerHTML=swatchMarkup(p[paletteTarget]);}
  if($('paletteTargetSelect'))$('paletteTargetSelect').value=paletteTarget;
  if($('paletteCustomInput'))$('paletteCustomInput').value=paletteFor(slide)[paletteTarget];
}
function applySelectedTextColor(color){const el=currentElement();if(!isTextSelected()||!el)return;el.color=normalizeHex(color,el.color||COLORS.cream);$('colorInput').value=el.color;render();commitHistory();}
function applyTemplatePaletteColor(color){const slide=currentSlide();slide.palette=normalizePalette(slide.palette);slide.palette[paletteTarget]=normalizeHex(color,slide.palette[paletteTarget]);render();commitHistory();}

function renderVariantControls(){
  const family=$('familySelect'),variant=$('variantSelect'),s=currentSlide();family.innerHTML=Object.entries(FAMILIES).map(([id,f])=>`<option value="${id}">${f.label}</option>`).join('');family.value=s.family;variant.innerHTML=Object.entries(FAMILIES[s.family].variants).map(([id,v])=>`<option value="${id}">${v.label}</option>`).join('');variant.value=s.variant;
  $('variantCards').innerHTML=Object.entries(FAMILIES[s.family].variants).map(([id,v])=>`<button class="variant-card${id===s.variant?' active':''}" type="button" data-variant="${id}"><strong>${v.label}</strong><span>${v.description}</span></button>`).join('');$('variantCards').querySelectorAll('[data-variant]').forEach(b=>b.addEventListener('click',()=>applyTemplate(s.family,b.dataset.variant)));
}
function applyTemplate(family,variant){
  if(!FAMILIES[family]?.variants?.[variant])return;const old=currentSlide(),fresh=createSlide(family,variant);fresh.id=old.id;fresh.image=old.image;fresh.imageQuery=old.imageQuery||buildSlideImageQuery(old,currentIndex);fresh.imageSource=old.imageSource||'';fresh.palette=normalizePalette(old.palette);fresh.logo=old.logo;fresh.number=old.number||fresh.number;fresh.title.text=old.title.text;fresh.subtitle.text=old.subtitle.text;fresh.kicker=old.kicker;fresh.dateText=old.dateText;fresh.bubbleText=old.bubbleText;fresh.freeTexts=deepClone(old.freeTexts||[]);fresh.overlays=deepClone(old.overlays||[]);fresh.layerOrder=[];fresh.layerState={};fresh.layerSchemaVersion=LAYER_SCHEMA_VERSION;ensureLayerModel(fresh);fresh.title.font=normalizeFontName(old.title.font);fresh.subtitle.font=normalizeFontName(old.subtitle.font);if(fresh.title.font==='Anton')fresh.title.weight=400;if(fresh.subtitle.font==='Anton')fresh.subtitle.weight=400;project.slides[currentIndex]=fresh;selected='title';render();commitHistory();
}
function screenToSvg(clientX,clientY){const p=canvas.createSVGPoint();p.x=clientX;p.y=clientY;const m=canvas.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0};}
function selectionCenterScreen(){const b=selectionBounds();if(!b)return{x:0,y:0};const p=canvas.createSVGPoint();p.x=b.x+b.w/2;p.y=b.y+b.h/2;const m=canvas.getScreenCTM();return m?p.matrixTransform(m):{x:0,y:0};}
function pointerDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function textSemanticResizeStart(el){return{startSize:el.size,startMaxWidth:el.maxWidth||layoutForElement(currentSlide(),selected)?.maxWidth||820,startTextScale:el.scale||1};}
function applyUniformRatio(ratio){const el=currentElement();if(!el)return;ratio=clamp(ratio,.12,8);if(gesture.text){el.size=clamp(Math.round(gesture.startSize*ratio),12,260);el.maxWidth=clamp(Math.round(gesture.startMaxWidth*ratio),120,1500);el.scale=gesture.startTextScale;}else el.scale=clamp(gesture.startScale*ratio,.08,8);renderCanvasOnly();syncControls();}
function beginUniformResize(type='handle',pointerId=null){const el=currentElement();if(!el)return;const center=selectionCenterScreen();gesture={type,pointerId,center,startDistance:1,text:isTextSelected(),startScale:el.scale||1,...(isTextSelected()?textSemanticResizeStart(el):{})};}
function beginPinch(){const pts=[...pointers.values()];if(pts.length<2||!currentElement())return;if(cropMode&&isImageSelected()){const crop=selectedCrop();gesture={type:'crop-pinch',startDistance:Math.max(1,pointerDistance(pts[0],pts[1])),startZoom:crop.zoom};return;}beginUniformResize('pinch');gesture.startDistance=Math.max(1,pointerDistance(pts[0],pts[1]));}
function selectableKeysAtPoint(x,y){const keys=[];for(const node of document.elementsFromPoint(x,y)){const group=node.closest?.('[data-element]');const key=group?.dataset?.element;if(key&&!key.startsWith('template:')&&elementModel(currentSlide(),key)&&!keys.includes(key)&&layerVisible(currentSlide(),key))keys.push(key);}return keys;}
function cycleSelectionAt(x,y){const now=Date.now(),keys=selectableKeysAtPoint(x,y);if(!keys.length)return false;const same=now-selectionCycle.time<900&&Math.hypot(x-selectionCycle.x,y-selectionCycle.y)<18&&keys.join('|')===selectionCycle.keys.join('|');selectionCycle={x,y,keys,index:same?(selectionCycle.index+1)%keys.length:0,time:now};selectElement(keys[selectionCycle.index]);return true;}
function otherElementBounds(){const out=[];canvas.querySelectorAll('[data-element]').forEach(node=>{const key=node.dataset.element;if(!key||key===selected||key.startsWith('template:')||node.closest('#selectionLayer'))return;try{const r=node.getBoundingClientRect(),a=screenToSvg(r.left,r.top),b=screenToSvg(r.right,r.bottom);if(Math.abs(b.x-a.x)>1&&Math.abs(b.y-a.y)>1)out.push({left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)});}catch(_){}});return out;}
function applyMagneticGuides(el){guideState=[];if(project.snapGuides===false)return;const b=selectionBounds();if(!b)return;const threshold=14,safe=54;const xTargets=[safe,W/2,W-safe],yTargets=[safe,H/2,H-safe];for(const o of otherElementBounds()){xTargets.push(o.left,(o.left+o.right)/2,o.right);yTargets.push(o.top,(o.top+o.bottom)/2,o.bottom);}const xp=[b.x,b.x+b.w/2,b.x+b.w],yp=[b.y,b.y+b.h/2,b.y+b.h];let bestX=null,bestY=null;for(const target of xTargets)for(const p of xp){const d=target-p;if(Math.abs(d)<=threshold&&(!bestX||Math.abs(d)<Math.abs(bestX.d)))bestX={d,target};}for(const target of yTargets)for(const p of yp){const d=target-p;if(Math.abs(d)<=threshold&&(!bestY||Math.abs(d)<Math.abs(bestY.d)))bestY={d,target};}if(bestX){el.dx+=bestX.d;guideState.push({axis:'x',value:bestX.target});}if(bestY){el.dy+=bestY.d;guideState.push({axis:'y',value:bestY.target});}if(bestX||bestY)updateDomTransform(selected);}
function cropDragBy(dx,dy){const el=currentElement(),layout=layoutForElement(currentSlide(),selected),crop=selectedCrop();if(!el||!layout||!crop)return;const p=cropPlacement(el,layout);if(p.extraX>0)crop.x=clamp(crop.x+2*dx/p.extraX,-1,1);if(p.extraY>0)crop.y=clamp(crop.y+2*dy/p.extraY,-1,1);renderCanvasOnly();syncCropControls();markDirty();}
canvas.addEventListener('pointerdown',event=>{
  event.preventDefault();canvas.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  const handle=event.target.dataset.handle||'';const hit=event.target.closest?.('[data-element]')?.dataset?.element;
  if(!handle&&event.altKey){cycleSelectionAt(event.clientX,event.clientY);return;}
  if(!handle&&hit&&hit!==selected&&(!hit.startsWith('shape:')||templateEditMode))selectElement(hit);
  const model=currentElementModel();if(pointers.size===2){if(model?.capabilities.resize||cropMode)beginPinch();return;}const el=model?.data;if(!model)return;const action=event.target.dataset.handle||'';
  if(cropMode&&model.type==='image'&&el?.src){gesture={type:'crop-drag',pointerId:event.pointerId,last:screenToSvg(event.clientX,event.clientY)};return;}
  if(!model.capabilities.move){if(model.state.locked)showToast('Posizione bloccata: sblocca il livello');return;}
  if(action==='scale'){beginUniformResize('handle',event.pointerId);gesture.startDistance=Math.max(1,Math.hypot(event.clientX-gesture.center.x,event.clientY-gesture.center.y));}
  else if(action==='width'&&isTextSelected()){const p=screenToSvg(event.clientX,event.clientY),layout=layoutForElement(currentSlide(),selected);gesture={type:'width',pointerId:event.pointerId,startX:p.x,startWidth:el.maxWidth||layout?.maxWidth||820};}
  else gesture={type:'drag',pointerId:event.pointerId,last:screenToSvg(event.clientX,event.clientY)};
});
canvas.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;event.preventDefault();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const el=currentElement();if(!gesture||!el)return;
  if(pointers.size>=2){if(!['pinch','crop-pinch'].includes(gesture.type))beginPinch();const pts=[...pointers.values()];const ratio=pointerDistance(pts[0],pts[1])/Math.max(1,gesture.startDistance);if(gesture.type==='crop-pinch'){selectedCrop().zoom=clamp(gesture.startZoom*ratio,1,5);renderCanvasOnly();syncCropControls();}else applyUniformRatio(ratio);return;}
  if(gesture.type==='crop-drag'&&gesture.pointerId===event.pointerId){const now=screenToSvg(event.clientX,event.clientY);cropDragBy(now.x-gesture.last.x,now.y-gesture.last.y);gesture.last=now;}
  else if(gesture.type==='drag'&&gesture.pointerId===event.pointerId){const now=screenToSvg(event.clientX,event.clientY);el.dx+=now.x-gesture.last.x;el.dy+=now.y-gesture.last.y;gesture.last=now;updateDomTransform(selected);applyMagneticGuides(el);syncControls();}
  else if(gesture.type==='handle'&&gesture.pointerId===event.pointerId){const dist=Math.max(1,Math.hypot(event.clientX-gesture.center.x,event.clientY-gesture.center.y));applyUniformRatio(dist/gesture.startDistance);}
  else if(gesture.type==='width'&&gesture.pointerId===event.pointerId){const now=screenToSvg(event.clientX,event.clientY);el.maxWidth=clamp(Math.round(gesture.startWidth+(now.x-gesture.startX)*2),120,1080);renderCanvasOnly();syncControls();}
});
function endPointer(event){
  if(!pointers.has(event.pointerId))return;pointers.delete(event.pointerId);try{canvas.releasePointerCapture?.(event.pointerId);}catch(_){}
  const now=Date.now();if(pointers.size===0&&gesture?.type==='drag'&&now-lastTap.time<330&&lastTap.key===selected&&isTextSelected())openTextDialog();
  if(pointers.size===0){lastTap={time:now,key:selected};gesture=null;guideState=[];commitHistory();renderCanvasOnly();renderFilmstrip();}else if(pointers.size===1&&['pinch','crop-pinch'].includes(gesture?.type)){const [id,p]=[...pointers.entries()][0];gesture={type:cropMode?'crop-drag':'drag',pointerId:id,last:screenToSvg(p.x,p.y)};}
}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',event=>{if(!cropMode||!isImageSelected())return;event.preventDefault();const crop=selectedCrop();crop.zoom=clamp(crop.zoom*(event.deltaY<0?1.06:.94),1,5);renderCanvasOnly();syncCropControls();markDirty();},{passive:false});
canvas.addEventListener('wheel',event=>{if(!event.altKey)return;event.preventDefault();const el=currentElement();if(!el)return;if(isTextSelected()){const layout=layoutForElement(currentSlide(),selected),ratio=event.deltaY<0?1.035:.965;el.size=clamp(Math.round(el.size*ratio),16,260);el.maxWidth=clamp(Math.round((el.maxWidth||layout?.maxWidth||820)*ratio),120,1080);renderCanvasOnly();}else{el.scale=clamp(el.scale*(event.deltaY<0?1.04:.96),.08,8);updateDomTransform(selected);}syncControls();markDirty();},{passive:false});
document.addEventListener('keydown',event=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.querySelector('dialog[open]'))return;const model=currentElementModel(),el=model?.data;if(!el||!model.capabilities.move)return;const step=event.shiftKey?10:1;if(event.key==='ArrowLeft'){el.dx-=step;}else if(event.key==='ArrowRight'){el.dx+=step;}else if(event.key==='ArrowUp'){el.dy-=step;}else if(event.key==='ArrowDown'){el.dy+=step;}else return;event.preventDefault();updateDomTransform(selected);syncControls();markDirty();});

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
  currentSlide().freeTexts=currentSlide().freeTexts||[];currentSlide().freeTexts.push(ft);ensureLayerModel(currentSlide());selected=`free:${ft.id}`;render();commitHistory();setTab('content');openTextDialog();
}
function deleteSelectedElement(){let message='Elemento eliminato';if(isFreeSelected()){const id=selectedFreeId();currentSlide().freeTexts=(currentSlide().freeTexts||[]).filter(x=>x.id!==id);message='Testo libero eliminato';}else if(isOverlaySelected()){const id=selectedOverlayId();currentSlide().overlays=(currentSlide().overlays||[]).filter(x=>x.id!==id);message='Foto libera eliminata';}else if(isShapeSelected()){const id=selectedShapeId();currentSlide().templateShapes=(currentSlide().templateShapes||[]).filter(x=>x.id!==id);message='Forma eliminata';}else return;ensureLayerModel(currentSlide());selected='title';render();commitHistory();showToast(message);}
function deleteSelectedFreeText(){deleteSelectedElement();}
function renderFreeTextList(){const el=$('freeTextList');if(!el)return;const list=currentSlide()?.freeTexts||[];if(!list.length){el.innerHTML='<p class="panel-note">Nessun testo libero nella slide.</p>';return;}el.innerHTML=list.map(ft=>`<div class="free-text-item${selected===`free:${ft.id}`?' active':''}"><button type="button" data-free-select="${ft.id}">${esc(ft.text||'Testo libero')}</button><button type="button" data-free-edit="${ft.id}">Modifica</button><button type="button" data-free-delete="${ft.id}">×</button></div>`).join('');el.querySelectorAll('[data-free-select]').forEach(b=>b.addEventListener('click',()=>selectElement(`free:${b.dataset.freeSelect}`)));el.querySelectorAll('[data-free-edit]').forEach(b=>b.addEventListener('click',()=>{selectElement(`free:${b.dataset.freeEdit}`);openTextDialog();}));el.querySelectorAll('[data-free-delete]').forEach(b=>b.addEventListener('click',()=>{selected=`free:${b.dataset.freeDelete}`;deleteSelectedFreeText();}));}


function renderLayers(){
  const list=$('layerList');if(!list||!currentSlide())return;const slide=currentSlide();ensureLayerModel(slide);const rows=[];
  rows.push(layerRowHtml(slide,TEMPLATE_BACK_KEY,layerState(slide,TEMPLATE_BACK_KEY),{fixed:true}));
  [...slide.layerOrder].reverse().forEach(key=>rows.push(layerRowHtml(slide,key,layerState(slide,key),{fixed:!layerCanReorder(key)})));
  list.innerHTML=rows.join('');
  list.querySelectorAll('[data-layer-select]').forEach(row=>row.addEventListener('click',event=>{if(event.target.closest('[data-layer-action]'))return;selectElement(row.dataset.layerSelect);}));
  list.querySelectorAll('[data-layer-action]').forEach(b=>b.addEventListener('click',event=>{event.stopPropagation();handleLayerAction(b.dataset.layerAction,b.dataset.layerKey);}));
  list.querySelectorAll('.layer-row').forEach(row=>{
    if(row.draggable)row.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',row.dataset.layerKey);row.classList.add('dragging');});
    row.addEventListener('dragend',()=>row.classList.remove('dragging'));
    row.addEventListener('dragover',e=>{const source=e.dataTransfer.types.includes('text/plain');if(!source)return;e.preventDefault();row.classList.add('drag-over');});
    row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));
    row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('drag-over');const source=e.dataTransfer.getData('text/plain'),target=row.dataset.layerKey;if(source&&target&&source!==target)reorderLayerBefore(source,target);});
  });
}
function layerIcon(key){const type=elementType(key);if(type==='text')return 'T';if(type==='logo')return '◆';if(type==='image')return '▧';if(type==='number')return '#';if(type==='shape')return '⬟';if(key===TEMPLATE_BACK_KEY)return '▨';if(key===TEMPLATE_FRONT_KEY)return '◇';if(key===TEMPLATE_AUX_KEY)return 'Aa';return '•';}
function layerRowHtml(slide,key,state,{fixed=false}={}){
  const active=selected===key?' active':'',hidden=state.visible===false?' hidden-layer':'',canDrag=!fixed&&layerCanReorder(key),opacity=Math.round((state.opacity??1)*100);
  return `<div class="layer-row${active}${hidden}" data-layer-select="${key}" data-layer-key="${key}" draggable="${canDrag?'true':'false'}"><span class="layer-grip" title="${canDrag?'Trascina per riordinare':'Ordine fisso'}">${canDrag?'⋮⋮':'•'}</span><span class="layer-type">${layerIcon(key)}</span><div class="layer-copy"><strong>${esc(layerLabel(slide,key))}</strong><small>${fixed?'Livello template bloccato':state.locked?'Posizione bloccata':'Modificabile'} · ${opacity}%</small></div><button type="button" data-layer-action="visibility" data-layer-key="${key}" title="Mostra/nascondi">${state.visible===false?'○':'◉'}</button><button type="button" data-layer-action="lock" data-layer-key="${key}" title="Blocca/sblocca posizione">${state.locked?'🔒':'🔓'}</button></div>`;
}
function handleLayerAction(action,key){const slide=currentSlide();if(!slide)return;const state=layerState(slide,key);if(action==='visibility'){state.visible=!state.visible;render();commitHistory();return;}if(action==='lock'){if(elementType(key)==='template'){showToast('I livelli del template restano bloccati');return;}state.locked=!state.locked;render();commitHistory();return;}}
function moveLayer(key,mode){const slide=currentSlide();ensureLayerModel(slide);if(!layerCanReorder(key))return;const order=slide.layerOrder,index=order.indexOf(key);if(index<0)return;let target=index;if(mode==='forward')target=Math.min(order.length-1,index+1);if(mode==='backward')target=Math.max(0,index-1);if(mode==='front')target=order.length-1;if(mode==='back')target=0;if(target===index)return;order.splice(index,1);order.splice(target,0,key);render();commitHistory();}
function reorderLayerBefore(source,target){const slide=currentSlide();ensureLayerModel(slide);if(!layerCanReorder(source)||source===target)return;const order=slide.layerOrder,from=order.indexOf(source);if(from<0)return;order.splice(from,1);const targetIndex=target===TEMPLATE_BACK_KEY?0:order.indexOf(target);const insert=targetIndex<0?order.length:targetIndex+1;order.splice(insert,0,source);render();commitHistory();}
function duplicateSelectedElement(){
  const slide=currentSlide();let newKey='';
  if(isFreeSelected()){const source=currentElement();const copy=normalizeFreeText({...deepClone(source),id:uid(),text:`${source.text} COPIA`,dx:(source.dx||0)+28,dy:(source.dy||0)+28});slide.freeTexts.push(copy);newKey=`free:${copy.id}`;}
  else if(isOverlaySelected()){const source=currentElement();const copy=normalizeOverlay({...deepClone(source),id:uid(),name:`${source.name||'Foto'} copia`,dx:(source.dx||0)+28,dy:(source.dy||0)+28});slide.overlays.push(copy);newKey=`overlay:${copy.id}`;}
  else if(selected==='title'||selected==='subtitle'){const source=currentElement(),layout=layoutForElement(slide,selected);const copy=freeTextDefaults({...deepClone(source),id:uid(),x:layout.x,y:layout.y,dx:(source.dx||0)+28,dy:(source.dy||0)+28,maxWidth:source.maxWidth||layout.maxWidth,text:source.text});slide.freeTexts.push(copy);newKey=`free:${copy.id}`;}
  else if(isShapeSelected()){const source=currentElement();const copy=normalizeShape({...deepClone(source),id:uid(),name:`${source.name||'Forma'} copia`,dx:(source.dx||0)+28,dy:(source.dy||0)+28});slide.templateShapes.push(copy);newKey=`shape:${copy.id}`;}
  else if(selected==='logo'){showToast('Il logo principale non si duplica');return;}
  else {showToast('Seleziona testo, foto o forma');return;}
  ensureLayerModel(slide);selected=newKey;render();commitHistory();showToast('Elemento duplicato');
}

async function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}
async function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}
async function prepareImageBlob(blob){
  const source=URL.createObjectURL(blob);try{const img=await loadImage(source);const maxSide=2400,ratio=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*ratio)),h=Math.max(1,Math.round(img.naturalHeight*ratio));const work=document.createElement('canvas');work.width=w;work.height=h;const ctx=work.getContext('2d');ctx.drawImage(img,0,0,w,h);const type=blob.type==='image/png'&&blob.size<1600000?'image/png':'image/jpeg';const out=await new Promise((resolve,reject)=>work.toBlob(b=>b?resolve(b):reject(new Error('Compressione fallita')),type,.9));return blobToDataUrl(out);}finally{URL.revokeObjectURL(source);}
}
async function prepareImageFile(file){return prepareImageBlob(file);}
async function saveImageLibrary(src,name='Immagine',source='caricamento'){
  const item={id:uid(),src,name:String(name||'Immagine').slice(0,100),source,createdAt:Date.now()};imageLibrary.unshift(item);await storePut('images',item.id,item);renderImageLibrary();return item;
}
function useImage(src){const s=currentSlide();s.image=imageElementDefaults({...s.image,src,dx:0,dy:0,scale:1,crop:normalizeCrop({...s.image.crop,mode:'cover',zoom:1,x:0,y:0})});layerState(s,'image').visible=true;selected='image';hydrateImageMeta(s.image).then(()=>render());render();commitHistory();showToast('Immagine inserita');}
function syncCropControls(){const el=currentElement(),crop=isImageSelected()&&el?.src?selectedCrop():null,enabled=Boolean(crop);if($('cropPanel'))$('cropPanel').classList.toggle('active',cropMode&&enabled);if($('stage'))$('stage').classList.toggle('crop-active',cropMode&&enabled);if($('cropTargetLabel'))$('cropTargetLabel').textContent=enabled?layerLabel(currentSlide(),selected):'Seleziona un’immagine';for(const id of ['toggleCropBtn','cropFillBtn','cropFitBtn','cropResetBtn','cropDoneBtn','cropZoomRange','cropXRange','cropYRange'])if($(id))$(id).disabled=!enabled;if(!crop)return;$('toggleCropBtn').textContent=cropMode?'Ritaglio attivo':'Ritaglia';$('cropZoomRange').value=Math.round(crop.zoom*100);$('cropXRange').value=Math.round(crop.x*100);$('cropYRange').value=Math.round(crop.y*100);$('cropZoomOut').textContent=`${Math.round(crop.zoom*100)}%`;$('cropXOut').textContent=Math.round(crop.x*100);$('cropYOut').textContent=Math.round(crop.y*100);}
function setCropMode(value){if(value&&!isImageSelected()){showToast('Seleziona prima un’immagine');return;}if(value&&!currentElement()?.src){showToast('Inserisci prima un’immagine');return;}cropMode=Boolean(value);guideState=[];drawSelection();syncCropControls();if(cropMode)setTab('images');}
function applyCropPreset(mode){const el=currentElement();if(!isImageSelected()||!el)return;resetCrop(el,mode);render();commitHistory();}
function applyCurrentStyleToSameRole(){if(!isTextSelected()){showToast('Seleziona un testo');return;}const source=currentElement(),role=selected==='title'?'title':selected==='subtitle'?'subtitle':'free';for(const s of project.slides){if(role==='title'||role==='subtitle')copyStyle(source,s[role]);else for(const ft of s.freeTexts||[])copyStyle(source,ft);}render();commitHistory();showToast('Stile applicato allo stesso ruolo');}
function applyLogoToAll(){const source=deepClone(currentSlide().logo);for(const s of project.slides)s.logo={...s.logo,...source};render();commitHistory();showToast('Logo uniformato su tutte le slide');}
function applyPaletteToAll(){const source=deepClone(paletteFor(currentSlide()));for(const s of project.slides)s.palette=deepClone(source);render();commitHistory();showToast('Palette applicata a tutto il carosello');}
function applyCropToAll(){if(!isImageSelected()){showToast('Seleziona un’immagine');return;}const source=deepClone(selectedCrop());for(const s of project.slides)if(s.image?.src)s.image.crop=deepClone(source);render();commitHistory();showToast('Ritaglio applicato alle immagini principali');}
function storageGet(key){try{return localStorage.getItem(key)||'';}catch(_){return'';}}
function storageSet(key,value){try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);}catch(_){}}
function tmdbAuthOptions(){const key=tmdbKey.trim();if(!key)return null;if(key.length>60)return{headers:{Authorization:`Bearer ${key}`,Accept:'application/json'}};return{apiKey:key,headers:{Accept:'application/json'}};}
async function tmdbFetch(path,params={}){const auth=tmdbAuthOptions();if(!auth)throw new Error('Configura prima la chiave TMDb');const url=new URL(`https://api.themoviedb.org/3/${path.replace(/^\//,'')}`);Object.entries({...params,language:'it-IT'}).forEach(([k,v])=>v!==undefined&&v!==null&&url.searchParams.set(k,String(v)));if(auth.apiKey)url.searchParams.set('api_key',auth.apiKey);const response=await fetch(url,{headers:auth.headers,cache:'no-store'});if(!response.ok)throw new Error(`TMDb HTTP ${response.status}`);return response.json();}
function tmdbTitle(item){return item.title||item.name||item.original_title||item.original_name||'TMDb';}
async function fetchTmdbResults(q,limit=24,slide=currentSlide()){
  const search=await tmdbFetch('search/multi',{query:q,include_adult:false,page:1});const type=$('tmdbImageType')?.value||'backdrop',items=[];
  for(const item of (search.results||[]).filter(x=>['movie','tv','person'].includes(x.media_type)).slice(0,5)){
    if(item.media_type==='person'){const path=item.profile_path;if(path)items.push({title:tmdbTitle(item),thumb:`https://image.tmdb.org/t/p/w500${path}`,url:`https://image.tmdb.org/t/p/original${path}`,width:500,height:750,source:`https://www.themoviedb.org/person/${item.id}`,provider:'TMDb',kind:'profile'});continue;}
    const endpoint=`${item.media_type}/${item.id}/images`;let images={};try{images=await tmdbFetch(endpoint,{include_image_language:'it,en,null'});}catch(_){images={};}
    const source=`https://www.themoviedb.org/${item.media_type==='movie'?'movie':'tv'}/${item.id}`;const groups=type==='poster'?images.posters:type==='logo'?images.logos:images.backdrops;const fallback=type==='poster'?item.poster_path:item.backdrop_path;
    for(const img of (groups||[]).slice(0,8)){const path=img.file_path;if(!path)continue;items.push({title:`${tmdbTitle(item)} · ${type}`,thumb:`https://image.tmdb.org/t/p/w500${path}`,url:`https://image.tmdb.org/t/p/original${path}`,width:img.width,height:img.height,source,provider:'TMDb',kind:type,score:(img.vote_average||0)+(img.width||0)/2000});}
    if(!items.some(x=>x.source===source)&&fallback)items.push({title:tmdbTitle(item),thumb:`https://image.tmdb.org/t/p/w500${fallback}`,url:`https://image.tmdb.org/t/p/original${fallback}`,source,provider:'TMDb',kind:type,score:1});
  }
  const target=layoutFor(slide)?.image||{w:1080,h:1350},targetRatio=(target.w||1080)/(target.h||1350);return items.map(r=>({...r,score:(r.score||0)-Math.abs(((r.width||target.w)/(r.height||target.h))-targetRatio)})).sort((a,b)=>b.score-a.score).slice(0,limit);
}
async function fetchSmartImageResults(q,limit=24,slide=currentSlide()){
  const source=$('imageSearchSource')?.value||'auto';if(source==='commons')return fetchImageResults(q,limit,slide);if(source==='tmdb')return fetchTmdbResults(q,limit,slide);
  if(tmdbKey){try{const tmdb=await fetchTmdbResults(q,limit,slide);if(tmdb.length)return tmdb;}catch(error){console.warn('TMDb non disponibile',error);}}
  return fetchImageResults(q,limit,slide);
}
function renderImageLibrary(){
  const el=$('imageLibrary');if(!el)return;if(!imageLibrary.length){el.innerHTML='<p class="panel-note">Nessuna immagine salvata.</p>';return;}
  el.innerHTML=imageLibrary.map(item=>`<button class="image-card" type="button" data-library-id="${item.id}" title="Usa ${esc(item.name)}"><img src="${item.src}" alt=""><span class="image-meta">${esc(item.name)}</span><span class="delete-image" data-delete-image="${item.id}" role="button" aria-label="Elimina">×</span></button>`).join('');
  el.querySelectorAll('[data-library-id]').forEach(card=>card.addEventListener('click',event=>{if(event.target.closest('[data-delete-image]'))return;const item=imageLibrary.find(x=>x.id===card.dataset.libraryId);if(item)useImage(item.src);}));
  el.querySelectorAll('[data-delete-image]').forEach(btn=>btn.addEventListener('click',async event=>{event.stopPropagation();const id=btn.dataset.deleteImage;imageLibrary=imageLibrary.filter(x=>x.id!==id);await storeDelete('images',id);renderImageLibrary();}));
}
function renderSearchResults(){
  const el=$('imageSearchResults');if(!searchResults.length){el.innerHTML='';return;}
  el.innerHTML=searchResults.map((r,i)=>`<button class="image-card" type="button" data-search-index="${i}" title="Importa ${esc(r.title)}"><img src="${esc(r.thumb)}" alt=""><span class="image-meta">${esc(r.title)}${r.provider?` · ${esc(r.provider)}`:''}${r.width&&r.height?` · ${r.width}×${r.height}`:''}</span></button>`).join('');
  el.querySelectorAll('[data-search-index]').forEach(b=>b.addEventListener('click',()=>importSearchResult(Number(b.dataset.searchIndex))));
}
async function fetchImageResults(q,limit=24,slide=currentSlide()){
  const url=new URL('https://commons.wikimedia.org/w/api.php');
  const params={action:'query',format:'json',origin:'*',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:String(limit),prop:'imageinfo',iiprop:'url|size|mime',iiurlwidth:'900'};Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();
  const target=layoutFor(slide)?.image||{w:1080,h:1350},targetRatio=(target.w||1080)/(target.h||1350);
  return Object.values(data.query?.pages||{}).map(p=>{const info=p.imageinfo?.[0]||{};const ratio=(info.width||1)/(info.height||1);const pixels=(info.width||0)*(info.height||0);return{title:(p.title||'').replace(/^File:/,''),thumb:info.thumburl||info.url,url:info.url||info.thumburl,width:info.width,height:info.height,mime:info.mime,source:`https://commons.wikimedia.org/?curid=${p.pageid}`,score:Math.log10(Math.max(1,pixels))-Math.abs(ratio-targetRatio)*.8};}).filter(r=>r.thumb&&r.url&&/^image\/(jpeg|png|webp)$/i.test(r.mime||'image/jpeg')&&(r.width||0)>=600&&(r.height||0)>=400).sort((a,b)=>b.score-a.score);
}
async function searchImages(){
  const q=$('imageSearchInput').value.trim();if(!q)return;const slide=currentSlide();slide.imageQuery=q;setStatus('Ricerca in corso…');$('searchImagesBtn').disabled=true;searchResults=[];renderSearchResults();
  try{searchResults=await fetchSmartImageResults(q,24,slide);setStatus(searchResults.length?`${searchResults.length} risultati per questa slide.`:'Nessun risultato. Prova a semplificare la query.','success');renderSearchResults();markDirty();}
  catch(error){console.error(error);setStatus('Ricerca non disponibile. Puoi usare Google Immagini o caricare un file.','error');}
  finally{$('searchImagesBtn').disabled=false;}
}
async function prepareSearchCandidate(result){const response=await fetch(result.url,{mode:'cors',cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return prepareImageBlob(await response.blob());}
async function proposeImageForSlide(slide,index,{replace=false,showResults=false}={}){
  if(slide.image.src&&!replace)return false;const q=ensureSlideImageQuery(slide,index);const results=await fetchSmartImageResults(q,16,slide);if(showResults&&slide===currentSlide()){searchResults=results;renderSearchResults();}
  for(const result of results.slice(0,5)){try{const src=await prepareSearchCandidate(result);slide.image=imageElementDefaults({...slide.image,src,dx:0,dy:0,scale:1,crop:cropDefaults()});slide.imageSource=result.source;await hydrateImageMeta(slide.image);return true;}catch(error){console.warn('Immagine proposta non importabile',result.url,error);}}
  return false;
}
async function autoSuggestProjectImages({replace=false}={}){
  if(autoImageSearchRunning)return;autoImageSearchRunning=true;const button=$('suggestAllImagesBtn');if(button)button.disabled=true;let found=0;
  try{
    for(let i=0;i<project.slides.length;i++){
      const slide=project.slides[i];ensureSlideImageQuery(slide,i);const isFinal=/final|domanda/i.test(slide.variant||'')&&i===project.slides.length-1;if(isFinal&&!slide.image.src)continue;
      setImportStatus(`Immagini proposte: slide ${i+1}/${project.slides.length}…`);setStatus(`Cerco per la slide ${i+1}: ${slide.imageQuery}`);
      try{if(await proposeImageForSlide(slide,i,{replace,showResults:i===currentIndex}))found++;}catch(error){console.warn(error);}
      if(i===currentIndex)renderCanvasOnly();markDirty();
    }
    render();commitHistory();setImportStatus(`${found} immagini proposte inserite. Puoi sostituirle dalla scheda Immagini.`,'success');setStatus(`${found} immagini proposte inserite.`,'success');showToast(`${found} immagini proposte`);
  }finally{autoImageSearchRunning=false;if(button)button.disabled=false;}
}
async function importSearchResult(index){
  const result=searchResults[index];if(!result)return;setStatus('Scarico e preparo l’immagine…');
  try{const src=await prepareSearchCandidate(result);await saveImageLibrary(src,result.title,'Wikimedia Commons');currentSlide().imageSource=result.source;useImage(src);setStatus('Immagine salvata nell’archivio.','success');}
  catch(error){console.error(error);setStatus('Il sito sorgente non consente il download diretto. Apri la fonte e salva l’immagine manualmente.','error');window.open(result.source,'_blank','noopener');}
}
async function importImageUrl(){
  const url=$('imageUrlInput').value.trim();if(!url)return;setStatus('Importazione URL…');
  try{const response=await fetch(url,{mode:'cors'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const src=await prepareImageBlob(await response.blob());await saveImageLibrary(src,new URL(url).pathname.split('/').pop()||'Immagine URL','URL');useImage(src);$('imageUrlInput').value='';setStatus('Immagine importata.','success');}
  catch(error){console.error(error);setStatus('Il server dell’immagine blocca l’importazione. Scaricala e usa “Carica dal telefono”.','error');}
}

function setTemplateEditMode(value){templateEditMode=Boolean(value);$('stage')?.classList.toggle('template-editing',templateEditMode);const slide=currentSlide();ensureLayerModel(slide);for(const key of shapeElementKeys(slide))layerState(slide,key).locked=!templateEditMode;if(!templateEditMode&&isShapeSelected())selected='title';render();showToast(templateEditMode?'Modifica forme attiva':'Forme protette');}
function addTemplateShape(type){const names={rect:'Rettangolo',ellipse:'Cerchio',bubble:'Fumetto',label:'Etichetta',polygon:'Diagonale'};const presets={rect:{x:340,y:520,w:400,h:220,radius:22,fill:'palette:accent'},ellipse:{x:390,y:500,w:300,h:300,fill:'palette:secondary'},bubble:{x:160,y:430,w:760,h:420,radius:38,fill:'palette:surface',stroke:'palette:accent',strokeWidth:8},label:{x:330,y:560,w:420,h:80,fill:'palette:ink',text:'NUOVA ETICHETTA',size:34},polygon:{x:100,y:500,w:880,h:260,fill:'palette:accent',points:[[0,.4],[1,0],[1,.6],[0,1]]}};const sh=shapeDefaults({name:names[type]||'Forma',type,...(presets[type]||presets.rect)});currentSlide().templateShapes.push(sh);ensureLayerModel(currentSlide());layerState(currentSlide(),`shape:${sh.id}`).locked=false;templateEditMode=true;selected=`shape:${sh.id}`;render();commitHistory();}
function resetBuiltInTemplateShapes(){const slide=currentSlide();if(!EDITABLE_TEMPLATE_DESIGNS.has(designOf(slide))){showToast('Questo template storico mantiene il blocco grafico originale');return;}if(!confirm('Ripristinare le forme originali di questo template?'))return;slide.templateShapeMode='separated';slide.templateShapes=templateShapeDefaults(designOf(slide));slide.layerOrder=[];slide.layerState={};ensureLayerModel(slide);templateEditMode=true;selected=shapeElementKeys(slide)[0]||'title';render();commitHistory();showToast('Forme originali ripristinate');}
function shapeFillUiValue(shape){return String(shape?.fill||'palette:accent');}
function renderTemplateShapeEditor(){$('stage')?.classList.toggle('template-editing',templateEditMode);const slide=currentSlide(),panel=$('templateShapeEditor'),notice=$('templateShapeNotice');if(!panel)return;ensureTemplateShapes(slide);$('templateEditModeInput').checked=templateEditMode;const shape=selectedShape();panel.classList.toggle('has-selection',Boolean(shape));$('shapeSelectionName').textContent=shape?shape.name:'Nessuna forma selezionata';if(notice)notice.textContent=EDITABLE_TEMPLATE_DESIGNS.has(designOf(slide))?'Le forme di questo template sono separate e modificabili.':'Il blocco grafico storico resta compatto; puoi aggiungere nuove forme e salvarle in un template personale.';for(const id of ['shapeNameInput','shapeFillSelect','shapeCustomColor','shapeStrokeColor','shapeStrokeWidthInput','shapeRadiusInput','shapeWidthInput','shapeHeightInput','shapeTextInput'])if($(id))$(id).disabled=!shape;if(!shape){for(const id of ['shapeNameInput','shapeStrokeWidthInput','shapeRadiusInput','shapeWidthInput','shapeHeightInput','shapeTextInput'])if($(id))$(id).value='';$('shapeTextField').hidden=true;$('shapeRadiusField').hidden=true;return;}$('shapeNameInput').value=shape.name||'Forma';$('shapeFillSelect').value=['palette:accent','palette:background','palette:secondary','palette:surface','palette:ink'].includes(shape.fill)?shape.fill:'custom';$('shapeCustomColor').value=/^#[0-9a-f]{6}$/i.test(shape.fill)?shape.fill:'#ff6f00';$('shapeStrokeColor').value=/^#[0-9a-f]{6}$/i.test(shape.stroke)?shape.stroke:'#005c78';$('shapeStrokeWidthInput').value=shape.strokeWidth||0;$('shapeRadiusInput').value=shape.radius||0;$('shapeWidthInput').value=Math.round(shape.w);$('shapeHeightInput').value=Math.round(shape.h);$('shapeTextInput').value=shape.text||'';$('shapeTextField').hidden=shape.type!=='label';$('shapeRadiusField').hidden=!['rect','bubble'].includes(shape.type);}
function updateSelectedShape(key,value){const shape=selectedShape();if(!shape)return;if(key==='name'||key==='text'||key==='fill'||key==='stroke')shape[key]=value;else if(key==='w'||key==='h'){const old=shape[key],next=Math.max(12,Number(value)||old),axis=key==='w'?'x':'y';shape[axis]-=(next-old)/2;shape[key]=next;}else shape[key]=Number(value)||0;renderCanvasOnly();renderLayers();renderTemplateShapeEditor();markDirty();}

function personalSnapshot(name){const s=currentSlide();return{id:uid(),name,createdAt:Date.now(),family:s.family,variant:s.variant,title:{...s.title,text:''},subtitle:{...s.subtitle,text:''},logo:{...s.logo},number:{...s.number},kicker:s.kicker,dateText:s.dateText,bubbleText:s.bubbleText,freeTexts:deepClone(s.freeTexts||[]),overlays:deepClone(s.overlays||[]),layerOrder:deepClone(s.layerOrder||[]),layerState:deepClone(s.layerState||{}),palette:deepClone(s.palette||paletteDefaults()),templateShapeMode:s.templateShapeMode,templateShapes:deepClone(s.templateShapes||[])};}
async function savePersonalTemplate(){const name=prompt('Nome del template personale:','Mio template');if(!name?.trim())return;const item=personalSnapshot(name.trim());personalTemplates.unshift(item);await storePut('templates',item.id,item);renderPersonalTemplates();showToast('Template personale salvato');}
function applyPersonalTemplate(item){const s=currentSlide(),titleText=s.title.text,subtitleText=s.subtitle.text,image=s.image,id=s.id;s.family=item.family;s.variant=item.variant;s.title={...s.title,...item.title,text:titleText};s.subtitle={...s.subtitle,...item.subtitle,text:subtitleText};s.logo={...s.logo,...item.logo};s.number={...s.number,...(item.number||{})};s.kicker=item.kicker||s.kicker;s.dateText=item.dateText||s.dateText;s.bubbleText=item.bubbleText||s.bubbleText;s.freeTexts=deepClone(item.freeTexts||s.freeTexts||[]);s.overlays=deepClone(item.overlays||s.overlays||[]);s.templateShapeMode=item.templateShapeMode||s.templateShapeMode;s.templateShapes=deepClone(item.templateShapes||s.templateShapes||[]);s.layerOrder=deepClone(item.layerOrder||s.layerOrder||[]);s.layerState=deepClone(item.layerState||s.layerState||{});s.palette=normalizePalette(item.palette||s.palette);ensureLayerModel(s);s.image=image;s.id=id;render();commitHistory();showToast('Template applicato');}
function renderPersonalTemplates(){const el=$('personalTemplates');if(!el)return;if(!personalTemplates.length){el.innerHTML='<p class="panel-note">Nessun template personale.</p>';return;}el.innerHTML=personalTemplates.map(t=>`<div class="personal-template"><div class="personal-info"><strong>${esc(t.name)}</strong><small>${esc(FAMILIES[t.family]?.label||'')} · ${esc(FAMILIES[t.family]?.variants?.[t.variant]?.label||'')}</small></div><button type="button" data-apply-template="${t.id}">Applica</button><button type="button" data-remove-template="${t.id}">×</button></div>`).join('');el.querySelectorAll('[data-apply-template]').forEach(b=>b.addEventListener('click',()=>{const t=personalTemplates.find(x=>x.id===b.dataset.applyTemplate);if(t)applyPersonalTemplate(t);}));el.querySelectorAll('[data-remove-template]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.removeTemplate;personalTemplates=personalTemplates.filter(x=>x.id!==id);await storeDelete('templates',id);renderPersonalTemplates();}));}

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
function drawAuxiliaryCanvas(ctx,slide){const d=designOf(slide);ctx.save();if(slide.kicker&&(d==='disclosure-hero'||d==='disclosure-editorial')){ctx.font='800 36px Archivo';ctx.fillStyle=COLORS.cream;ctx.textAlign='left';ctx.fillText(slide.kicker.toUpperCase(),70,125);}if(slide.dateText&&(d==='returns-sheet-right'||d==='returns-sheet-left')){ctx.font='800 34px Archivo';ctx.fillStyle=COLORS.blue;ctx.textAlign='left';ctx.fillText(slide.dateText.toUpperCase(),d==='returns-sheet-right'?62:555,545);}if(slide.bubbleText){ctx.font='800 30px Archivo';ctx.fillStyle=d==='returns-cards'?COLORS.orange:COLORS.blue;ctx.textAlign='center';if(d==='returns-cards')ctx.fillText(slide.bubbleText.toUpperCase(),730,1110);else if(d==='returns-question')ctx.fillText(slide.bubbleText.toUpperCase(),540,1240);else if(d.includes('question'))ctx.fillText(slide.bubbleText.toUpperCase(),755,1200);}ctx.restore();}
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
  else if(key==='number'&&project.showNumbers){const n=Math.max(1,project.slides.indexOf(slide)+1),layout=layoutForElement(slide,'number'),state=slide.number;ctx.save();ctx.translate(state.dx||0,state.dy||0);ctx.translate(layout.cx,layout.cy);ctx.rotate((state.rotation||0)*Math.PI/180);ctx.scale(state.scale||1,state.scale||1);ctx.translate(-layout.cx,-layout.cy);ctx.fillStyle=COLORS.orange;roundedRectPath(ctx,36,1260,82,52,26);ctx.fill();ctx.fillStyle=COLORS.blue;ctx.font='850 28px Archivo';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),77,1286);ctx.restore();}
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
  'new-cover':{title:420,subtitle:180},'new-body':{title:210,subtitle:300},'new-question':{title:350,subtitle:170},'new-final':{title:380,subtitle:170}
};
function qualityIssue(severity,slideIndex,key,title,message){return{id:uid(),severity,slideIndex,key,title,message};}
async function ensureExportFonts(){await Promise.all([{name:'Anton',weight:400},{name:'Anybody',weight:800},{name:'Archivo',weight:800},{name:'Saira',weight:800}].map(f=>document.fonts?.load(`${f.weight} 90px "${f.name}"`).catch(()=>null))||[]);}
function transformedBoxBounds(box,state,cx,cy,baseRotation=0){if(!box)return null;return transformedRectBounds({x:box.x,y:box.y,w:box.w,h:box.h,cx,cy},state,baseRotation);}
function textQualityMetrics(slide,key){const style=elementData(slide,key),layout=layoutForElement(slide,key);if(!style||!layout)return null;const lines=wrapLines(style.text,style,layout.maxWidth||style.maxWidth||820),factor=(style.width||100)/100;measureCtx.font=`${style.weight||400} ${style.size||60}px "${normalizeFontName(style.font)||'Anton'}"`;const widths=lines.map(line=>measureCtx.measureText(line||' ').width*factor),width=Math.max(4,...widths),height=Math.max(style.size,((lines.length-1)*style.size*style.lineHeight)+style.size*1.08);let x=layout.x;if(layout.align==='center')x-=width/2;else if(layout.align==='right')x-=width;const y=layout.y-style.size*.84;const bounds=transformedBoxBounds({x,y,w:width,h:height},style,layout.cx,layout.cy,0);return{lines,width,height,bounds,layout,style};}
function qualityBoundsForElement(slide,key){const type=elementType(key),data=elementData(slide,key),layout=layoutForElement(slide,key);if(type==='text')return textQualityMetrics(slide,key)?.bounds||null;if(['image','logo','number','shape'].includes(type)){const base=key==='image'?(layout?.rotation||0):0;return transformedRectBounds(layout,data||{},base);}return null;}
function imagePixelDensity(state,layout){if(!state?.src||!layout?.w||!layout?.h)return null;const crop=normalizeCrop(state.crop||{});if(!crop.naturalW||!crop.naturalH)return null;const p=cropPlacement(state,layout),outer=Math.max(.05,Number(state.scale||1));return Math.min(crop.naturalW/Math.max(1,p.w*outer),crop.naturalH/Math.max(1,p.h*outer));}
function boundsOutsideCanvas(b,tolerance=12){return b&&(b.x<-tolerance||b.y<-tolerance||b.x+b.w>W+tolerance||b.y+b.h>H+tolerance);}
function boundsNearSafeEdge(b){return b&&(b.x<QUALITY_SAFE_MARGIN||b.y<QUALITY_SAFE_MARGIN||b.x+b.w>W-QUALITY_SAFE_MARGIN||b.y+b.h>H-QUALITY_SAFE_MARGIN);}
function qualityFontLoaded(style){try{return document.fonts?.check(`${style.weight||400} 48px "${normalizeFontName(style.font)||'Anton'}"`)!==false;}catch(_){return true;}}
async function analyzeSlideQuality(slide,slideIndex){
  ensureLayerModel(slide);await hydrateImageMeta(slide.image);for(const ov of slide.overlays||[])await hydrateImageMeta(ov);const issues=[],slideNo=slideIndex+1;
  for(const key of ['title','subtitle',...(slide.freeTexts||[]).map(x=>`free:${x.id}`)]){
    const style=elementData(slide,key);if(!style)continue;const label=layerLabel(slide,key),text=String(style.text||'').trim(),state=layerState(slide,key);
    if(key==='title'&&!text)issues.push(qualityIssue('error',slideIndex,key,'Titolo mancante',`La slide ${slideNo} non ha un titolo.`));
    if(text&&state.visible===false)issues.push(qualityIssue('warning',slideIndex,key,`${label} nascosto`,`Il contenuto esiste ma il livello non è visibile.`));
    if(text&&layerOpacity(slide,key)<.35)issues.push(qualityIssue('warning',slideIndex,key,`${label} quasi trasparente`,`Opacità ${Math.round(layerOpacity(slide,key)*100)}%: potrebbe risultare illeggibile.`));
    if(text&&!qualityFontLoaded(style))issues.push(qualityIssue('warning',slideIndex,key,'Font non caricato',`${normalizeFontName(style.font)} non risulta disponibile nel browser.`));
    if(!text)continue;const metrics=textQualityMetrics(slide,key),b=metrics?.bounds;if(boundsOutsideCanvas(b))issues.push(qualityIssue('error',slideIndex,key,`${label} fuori dalla slide`,'Una parte del testo supera i bordi del formato 1080×1350.'));
    else if(boundsNearSafeEdge(b))issues.push(qualityIssue('warning',slideIndex,key,`${label} vicino al margine`,'Controlla che il testo non risulti troppo vicino al bordo su Instagram.'));
    const role=key==='title'?'title':key==='subtitle'?'subtitle':'free',limit=role==='free'?520:(QUALITY_TEXT_LIMITS[designOf(slide)]?.[role]||320),visualHeight=(metrics?.height||0)*(style.scale||1);
    if(visualHeight>limit*1.08)issues.push(qualityIssue('error',slideIndex,key,`${label} troppo lungo`,`Occupa circa ${Math.round(visualHeight)} px rispetto ai ${limit} px consigliati. Usa “Adatta testo” o riduci il contenuto.`));
    else if(visualHeight>limit*.92)issues.push(qualityIssue('warning',slideIndex,key,`${label} molto pieno`,'Il testo è vicino al limite previsto dal template.'));
    const visualSize=(style.size||0)*(style.scale||1);if((key==='title'&&visualSize<36)||(key!=='title'&&visualSize<24))issues.push(qualityIssue('warning',slideIndex,key,`${label} molto piccolo`,`Dimensione visiva circa ${Math.round(visualSize)} px.`));
  }
  const imageLayout=layoutForElement(slide,'image');if(imageLayout?.w>50&&imageLayout?.h>50&&layerVisible(slide,'image')){
    if(!slide.image?.src)issues.push(qualityIssue('warning',slideIndex,'image','Immagine principale assente','Il template prevede una fotografia, ma la slide è ancora vuota.'));
    else{const density=imagePixelDensity(slide.image,imageLayout);if(density!==null&&density<.48)issues.push(qualityIssue('error',slideIndex,'image','Immagine poco definita',`Densità stimata ${density.toFixed(2)}×: il PNG può apparire sgranato.`));else if(density!==null&&density<.78)issues.push(qualityIssue('warning',slideIndex,'image','Risoluzione immagine limitata',`Densità stimata ${density.toFixed(2)}× dopo il ritaglio.`));}
  }
  for(const ov of slide.overlays||[]){const key=`overlay:${ov.id}`,layout=layoutForElement(slide,key),b=qualityBoundsForElement(slide,key),density=imagePixelDensity(ov,layout);if(boundsOutsideCanvas(b))issues.push(qualityIssue('warning',slideIndex,key,'Foto libera oltre i bordi','Una parte della foto sovrapposta è fuori dalla slide.'));if(density!==null&&density<.55)issues.push(qualityIssue('warning',slideIndex,key,'Foto libera poco definita',`Densità stimata ${density.toFixed(2)}×.`));}
  const logoBounds=qualityBoundsForElement(slide,'logo');if(!layerVisible(slide,'logo')||layerOpacity(slide,'logo')<.15)issues.push(qualityIssue('warning',slideIndex,'logo','Logo non visibile','Il logo CdB è nascosto o quasi trasparente.'));else if(boundsOutsideCanvas(logoBounds))issues.push(qualityIssue('error',slideIndex,'logo','Logo fuori dalla slide','Riporta il logo dentro i bordi.'));
  return issues;
}
function projectQualityIssues(){const issues=[],imageMap=new Map();project.slides.forEach((slide,index)=>{if(slide.image?.src){const key=imageAssetKey(slide.image.src);const prev=imageMap.get(key)||[];prev.push(index);imageMap.set(key,prev);}});for(const indexes of imageMap.values())if(indexes.length>1)for(const index of indexes.slice(1))issues.push(qualityIssue('info',index,'image','Immagine ripetuta',`La stessa immagine compare anche nella slide ${indexes[0]+1}.`));const titleFonts=new Set(project.slides.map(s=>normalizeFontName(s.title?.font)).filter(Boolean));if(titleFonts.size>1)issues.push(qualityIssue('info',0,'title','Font dei titoli non uniforme',`Sono usati ${[...titleFonts].join(', ')}. Può essere voluto, ma controlla la coerenza.`));if(!project.name||project.name==='Nuovo carosello')issues.push(qualityIssue('info',0,'title','Nome progetto generico','Dai un nome riconoscibile al progetto prima del backup.'));return issues;}
function qualityCounts(report=qualityReport){const issues=report?.issues||[];return{error:issues.filter(x=>x.severity==='error').length,warning:issues.filter(x=>x.severity==='warning').length,info:issues.filter(x=>x.severity==='info').length};}
function qualityBadgeHtml(slideIndex){if(!qualityReport||qualityReport.stale)return'';const list=qualityReport.issues.filter(x=>x.slideIndex===slideIndex),errors=list.filter(x=>x.severity==='error').length,warnings=list.filter(x=>x.severity==='warning').length;if(errors)return`<span class="thumb-quality error" title="${errors} errori">${errors}</span>`;if(warnings)return`<span class="thumb-quality warning" title="${warnings} avvisi">${warnings}</span>`;return`<span class="thumb-quality ok" title="Slide controllata">✓</span>`;}
function renderQualityPanel(){const badge=$('qualityStatusBadge'),checked=$('qualityCheckedAt'),metrics=$('qualityMetrics'),list=$('qualityList'),first=$('fixFirstQualityBtn');if(!badge||!checked||!metrics||!list)return;if(!qualityReport){badge.className='quality-status neutral';badge.textContent='Da controllare';checked.textContent='Non ancora eseguito';metrics.innerHTML='<span>— errori</span><span>— avvisi</span><span>— note</span>';list.innerHTML='<p class="panel-note">Il controllo verifica testi, margini, risoluzione delle immagini, logo, livelli nascosti e coerenza del progetto.</p>';if(first)first.disabled=true;return;}const c=qualityCounts();checked.textContent=qualityReport.stale?'Modificato dopo l’ultimo controllo':`Controllato alle ${new Date(qualityReport.checkedAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`;badge.className=`quality-status ${qualityReport.stale?'stale':c.error?'error':c.warning?'warning':'ok'}`;badge.textContent=qualityReport.stale?'Da aggiornare':c.error?`${c.error} errori`:c.warning?`${c.warning} avvisi`:'Pronto';metrics.innerHTML=`<span>${c.error} errori</span><span>${c.warning} avvisi</span><span>${c.info} note</span>`;if(first)first.disabled=!qualityReport.issues.length;if(!qualityReport.issues.length){list.innerHTML='<div class="quality-empty">✓ Nessun problema rilevato. Il carosello è pronto per l’esportazione.</div>';return;}list.innerHTML=qualityReport.issues.map((issue,index)=>`<button class="quality-issue ${issue.severity}" type="button" data-quality-index="${index}"><span class="quality-icon">${issue.severity==='error'?'!':issue.severity==='warning'?'△':'i'}</span><span class="quality-copy"><strong>${esc(issue.title)}</strong><small>${esc(issue.message)}</small></span><span class="quality-slide-tag">S${issue.slideIndex+1}</span></button>`).join('');}
function jumpToQualityIssue(issue){if(!issue)return;currentIndex=clamp(issue.slideIndex,0,project.slides.length-1);const slide=currentSlide();if(issue.key&&elementModel(slide,issue.key))selected=issue.key;render();setTab(issue.key==='image'||String(issue.key).startsWith('overlay:')?'images':issue.key==='title'||issue.key==='subtitle'||String(issue.key).startsWith('free:')?'style':'layers');showToast(`Slide ${currentIndex+1}: ${issue.title}`);}
async function runQualityCheck({focusPanel=true}={}){try{if(focusPanel)setTab('export');$('runQualityBtn').disabled=true;$('runQualityBtn').textContent='Controllo…';await ensureExportFonts();const issues=[];for(let i=0;i<project.slides.length;i++){$('saveStatus').textContent=`controllo ${i+1}/${project.slides.length}`;issues.push(...await analyzeSlideQuality(project.slides[i],i));}issues.push(...projectQualityIssues());qualityReport={issues,checkedAt:Date.now(),stale:false};renderQualityPanel();renderFilmstrip();const c=qualityCounts();$('saveStatus').textContent='salvato sul dispositivo';showToast(c.error?`${c.error} errori da correggere`:c.warning?`${c.warning} avvisi da verificare`:'Carosello pronto');return qualityReport;}finally{if($('runQualityBtn')){$('runQualityBtn').disabled=false;$('runQualityBtn').textContent='Controlla carosello';}}}
function qualityReportText(report=qualityReport){if(!report)return'Controllo qualità non eseguito.';const c=qualityCounts(report),lines=[`CdB Studio — rapporto qualità`,`Progetto: ${project.name}`,`Data: ${new Date(report.checkedAt).toLocaleString('it-IT')}`,`Errori: ${c.error} | Avvisi: ${c.warning} | Note: ${c.info}`,''];for(const issue of report.issues)lines.push(`[${issue.severity.toUpperCase()}] Slide ${issue.slideIndex+1} — ${issue.title}: ${issue.message}`);if(!report.issues.length)lines.push('Nessun problema rilevato.');return lines.join('\n');}
function showQualityGuardDialog(report,label){const c=qualityCounts(report),dialog=$('qualityDialog');$('qualityDialogCopy').textContent=`Prima di ${label} sono stati trovati ${c.error} errori e ${c.warning} avvisi.`;$('qualityDialogMetrics').innerHTML=`<span>${c.error} errori</span><span>${c.warning} avvisi</span><span>${c.info} note</span>`;dialog.showModal();}
async function withQualityGuard(label,action){let report=qualityReport;if($('autoQualityInput')?.checked&&(!report||report.stale))report=await runQualityCheck({focusPanel:false});const c=qualityCounts(report);if(report&&(c.error||c.warning)) {pendingQualityExport=action;showQualityGuardDialog(report,label);return;}await action();}
async function exportCompletePackage(){let report=qualityReport;if(!report||report.stale)report=await runQualityCheck({focusPanel:false});const files=[];for(let i=0;i<project.slides.length;i++){const base=`${String(i+1).padStart(2,'0')}-${slug(project.slides[i].title?.text||`slide-${i+1}`).slice(0,44)}`;$('saveStatus').textContent=`pacchetto ${i+1}/${project.slides.length}`;files.push({name:`png/${base}.png`,blob:await renderPngBlob(project.slides[i])});files.push({name:`svg/${base}.svg`,blob:new Blob([buildSvg(project.slides[i],{suffix:`package${i}`})],{type:'image/svg+xml;charset=utf-8'})});}files.push({name:`${slug(project.name)}.cdb.json`,blob:new Blob([JSON.stringify(project,null,2)],{type:'application/json'})});files.push({name:'rapporto-qualita.txt',blob:new Blob([qualityReportText(report)],{type:'text/plain;charset=utf-8'})});files.push({name:'LEGGIMI.txt',blob:new Blob(['Cartella png: file pronti per la pubblicazione.\nCartella svg: versioni modificabili.\nIl file .cdb.json riapre il progetto in CdB Studio.\n'],{type:'text/plain;charset=utf-8'})});downloadBlob(await makeZip(files),`${slug(project.name)}-pacchetto.zip`);$('saveStatus').textContent='salvato sul dispositivo';}

async function renderPngBlob(slide){
  await Promise.all([{name:'Anton',weight:400},{name:'Anybody',weight:800},{name:'Archivo',weight:800},{name:'Saira',weight:800}].map(f=>document.fonts?.load(`${f.weight} 90px "${f.name}"`).catch(()=>null))||[]);
  ensureLayerModel(slide);const out=document.createElement('canvas');out.width=W;out.height=H;const ctx=out.getContext('2d');
  if(layerVisible(slide,TEMPLATE_BACK_KEY)){ctx.save();ctx.globalAlpha=layerOpacity(slide,TEMPLATE_BACK_KEY);drawTemplateBackCanvas(ctx,slide);ctx.restore();}
  for(const key of slide.layerOrder)await drawElementLayerCanvas(ctx,slide,key);
  return new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('PNG non creato')),'image/png'));
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
async function createCarouselFromText(text,title,family='c',mode='medium'){
  const chunks=splitTextChunks(text,mode);if(!chunks.length)throw new Error('Testo insufficiente');const cover=createSlide(family,DEFAULT_VARIANT[family]);cover.title.text=(title||titleFromImported(text)).toUpperCase();cover.subtitle.text='Critici da Bar';if(pendingImportImage)cover.image.src=pendingImportImage;const slides=[cover];chunks.forEach((chunk,i)=>{const s=createSlide(family,contentVariantFor(family));const first=(chunk.match(/^(.{25,100}?)(?:[.!?]|\n|$)/)||[])[1]||`PUNTO ${i+1}`;s.title.text=first.trim().toUpperCase();s.subtitle.text=chunk.trim();slides.push(s);});const end=createSlide(family,finalVariantFor(family));end.title.text='E VOI CHE NE PENSATE?';end.subtitle.text='Diteci la vostra nei commenti';slides.push(end);project={version:'0.12.0',name:title||titleFromImported(text),showNumbers:false,snapGuides:true,slides};slides.forEach((s,i)=>s.imageQuery=buildSlideImageQuery(s,i));await Promise.all(slides.map(s=>hydrateImageMeta(s.image)));currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();setTab('content');pendingImportImage='';showToast(`${slides.length} slide create`);if($('autoImageSuggestionsCheckbox')?.checked)setTimeout(()=>autoSuggestProjectImages({replace:false}),80);
}
async function runOcrFiles(files){if(!files?.length)return;setImportStatus('Carico il motore OCR…');await loadExternalScript('https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js','Tesseract');const worker=await Tesseract.createWorker(['ita','eng'],1,{logger:m=>{if(m.status){const pct=Math.round((m.progress||0)*100);setImportStatus(`OCR: ${m.status} ${pct}%`);}}});const extracted=[];try{for(let i=0;i<files.length;i++){setImportStatus(`OCR immagine ${i+1}/${files.length}…`);const src=await prepareImageFile(files[i]);await saveImageLibrary(src,files[i].name,'OCR');const result=await worker.recognize(files[i]);extracted.push({text:(result.data.text||'').trim(),src,name:files[i].name});}}finally{await worker.terminate();}const combined=extracted.map(x=>x.text).filter(Boolean).join('\n\n');$('importTextInput').value=combined;if(!$('importTitleInput').value)$('importTitleInput').value=titleFromImported(combined,'Import OCR');setImportStatus(`OCR completato su ${files.length} immagini.`,'success');if(extracted.length){const family=$('importFamilySelect').value||'c';const slides=extracted.map((item,i)=>{const s=createSlide(family,i===0?DEFAULT_VARIANT[family]:contentVariantFor(family));s.image.src=item.src;const lines=item.text.split(/\n+/).map(x=>x.trim()).filter(Boolean);s.title.text=(lines.shift()||`SLIDE ${i+1}`).slice(0,120).toUpperCase();s.subtitle.text=lines.join(' ').slice(0,1200);return s;});project={version:'0.12.0',name:$('importTitleInput').value||'Import OCR',showNumbers:false,snapGuides:true,slides};slides.forEach((s,i)=>s.imageQuery=buildSlideImageQuery(s,i));await Promise.all(slides.map(s=>hydrateImageMeta(s.image)));currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();setTab('content');}}
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
$('colorInput').addEventListener('input',e=>applyTextControl('color',e.target.value));$('colorInput').addEventListener('change',()=>{commitHistory();renderFilmstrip();renderColorPalettes();});$('textPaletteSwatches').addEventListener('click',e=>{const b=e.target.closest('[data-swatch]');if(b)applySelectedTextColor(b.dataset.swatch);});$('templatePaletteSwatches').addEventListener('click',e=>{const b=e.target.closest('[data-swatch]');if(b)applyTemplatePaletteColor(b.dataset.swatch);});$('paletteTargetSelect').addEventListener('change',e=>{paletteTarget=e.target.value;renderColorPalettes();});$('paletteCustomInput').addEventListener('input',e=>{currentSlide().palette=normalizePalette(currentSlide().palette);currentSlide().palette[paletteTarget]=e.target.value;renderCanvasOnly();renderFilmstrip();});$('paletteCustomInput').addEventListener('change',()=>commitHistory());$('resetPaletteBtn').addEventListener('click',()=>{currentSlide().palette=paletteDefaults();render();commitHistory();});
$('sizeRange').addEventListener('input',e=>applyTextControl('size',Number(e.target.value)));$('sizeRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('weightRange').addEventListener('input',e=>applyTextControl('weight',Number(e.target.value)));$('weightRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('widthRange').addEventListener('input',e=>applyTextControl('width',Number(e.target.value)));$('widthRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('lineRange').addEventListener('input',e=>applyTextControl('lineHeight',Number(e.target.value)/100));$('lineRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('layerForwardBtn')?.addEventListener('click',()=>moveLayer(selected,'forward'));
$('layerBackwardBtn')?.addEventListener('click',()=>moveLayer(selected,'backward'));
$('layerFrontBtn')?.addEventListener('click',()=>moveLayer(selected,'front'));
$('layerBackBtn')?.addEventListener('click',()=>moveLayer(selected,'back'));
$('duplicateElementBtn')?.addEventListener('click',duplicateSelectedElement);
$('scaleRange').addEventListener('input',e=>{const model=currentElementModel(),el=model?.data;if(!el||!model.capabilities.resize)return;el.scale=Number(e.target.value)/100;updateDomTransform(selected);syncControls();markDirty();});$('scaleRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('rotationRange').addEventListener('input',e=>{const model=currentElementModel(),el=model?.data;if(!el||!model.capabilities.rotate)return;el.rotation=Number(e.target.value);updateDomTransform(selected);syncControls();markDirty();});$('rotationRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('opacityRange')?.addEventListener('input',e=>updateLayerOpacity(e.target.value));$('opacityRange')?.addEventListener('change',()=>{commitHistory();renderFilmstrip();renderLayers();});
$('positionXInput')?.addEventListener('input',e=>setElementAbsolutePosition('x',e.target.value));$('positionXInput')?.addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('positionYInput')?.addEventListener('input',e=>setElementAbsolutePosition('y',e.target.value));$('positionYInput')?.addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('maxWidthRange').addEventListener('input',e=>applyTextControl('maxWidth',Number(e.target.value)));$('maxWidthRange').addEventListener('change',()=>{commitHistory();renderFilmstrip();});
$('alignSelect').addEventListener('change',e=>{applyTextControl('align',e.target.value);commitHistory();renderFilmstrip();});
$('centerHBtn').addEventListener('click',()=>{const model=currentElementModel(),el=model?.data,layout=model?.layout;if(!el||!layout||!model.capabilities.move)return;el.dx=W/2-layout.cx;updateDomTransform(selected);syncControls();commitHistory();});
$('centerVBtn').addEventListener('click',()=>{const model=currentElementModel(),el=model?.data,layout=model?.layout;if(!el||!layout||!model.capabilities.move)return;el.dy=H/2-layout.cy;updateDomTransform(selected);syncControls();commitHistory();});
$('resetTransformBtn').addEventListener('click',()=>{const model=currentElementModel(),el=model?.data;if(!el||!model.capabilities.move)return;el.dx=0;el.dy=0;el.scale=1;el.rotation=0;render();commitHistory();});
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
$('familySelect').addEventListener('change',e=>applyTemplate(e.target.value,DEFAULT_VARIANT[e.target.value]));$('variantSelect').addEventListener('change',e=>applyTemplate(currentSlide().family,e.target.value));$('savePersonalTemplateBtn').addEventListener('click',savePersonalTemplate);$('saveStructuralTemplateBtn')?.addEventListener('click',savePersonalTemplate);
$('templateEditModeInput')?.addEventListener('change',e=>setTemplateEditMode(e.target.checked));document.querySelectorAll('[data-add-shape]').forEach(b=>b.addEventListener('click',()=>addTemplateShape(b.dataset.addShape)));$('resetTemplateShapesBtn')?.addEventListener('click',resetBuiltInTemplateShapes);$('shapeNameInput')?.addEventListener('input',e=>updateSelectedShape('name',e.target.value));$('shapeNameInput')?.addEventListener('change',commitHistory);$('shapeFillSelect')?.addEventListener('change',e=>{if(e.target.value!=='custom'){updateSelectedShape('fill',e.target.value);commitHistory();}});$('shapeCustomColor')?.addEventListener('input',e=>updateSelectedShape('fill',e.target.value));$('shapeCustomColor')?.addEventListener('change',commitHistory);$('shapeStrokeColor')?.addEventListener('input',e=>updateSelectedShape('stroke',e.target.value));$('shapeStrokeColor')?.addEventListener('change',commitHistory);$('shapeStrokeWidthInput')?.addEventListener('input',e=>updateSelectedShape('strokeWidth',e.target.value));$('shapeStrokeWidthInput')?.addEventListener('change',commitHistory);$('shapeRadiusInput')?.addEventListener('input',e=>updateSelectedShape('radius',e.target.value));$('shapeRadiusInput')?.addEventListener('change',commitHistory);$('shapeWidthInput')?.addEventListener('input',e=>updateSelectedShape('w',e.target.value));$('shapeWidthInput')?.addEventListener('change',commitHistory);$('shapeHeightInput')?.addEventListener('input',e=>updateSelectedShape('h',e.target.value));$('shapeHeightInput')?.addEventListener('change',commitHistory);$('shapeTextInput')?.addEventListener('input',e=>updateSelectedShape('text',e.target.value));$('shapeTextInput')?.addEventListener('change',commitHistory);

$('overlayInput')?.addEventListener('change',async e=>{try{await addOverlayFiles(e.target.files);}catch(err){console.error(err);showToast('Foto libera non caricata');}e.target.value='';});
$('overlayInputSecondary')?.addEventListener('change',async e=>{try{await addOverlayFiles(e.target.files);}catch(err){console.error(err);showToast('Foto libera non caricata');}e.target.value='';});
$('toggleCropBtn')?.addEventListener('click',()=>setCropMode(!cropMode));$('cropDoneBtn')?.addEventListener('click',()=>setCropMode(false));$('cropFillBtn')?.addEventListener('click',()=>applyCropPreset('cover'));$('cropFitBtn')?.addEventListener('click',()=>applyCropPreset('contain'));$('cropResetBtn')?.addEventListener('click',()=>applyCropPreset('cover'));
$('cropZoomRange')?.addEventListener('input',e=>{const c=selectedCrop();if(!c)return;c.zoom=clamp(Number(e.target.value)/100,1,5);renderCanvasOnly();syncCropControls();markDirty();});$('cropZoomRange')?.addEventListener('change',commitHistory);
$('cropXRange')?.addEventListener('input',e=>{const c=selectedCrop();if(!c)return;c.x=clamp(Number(e.target.value)/100,-1,1);renderCanvasOnly();syncCropControls();markDirty();});$('cropXRange')?.addEventListener('change',commitHistory);
$('cropYRange')?.addEventListener('input',e=>{const c=selectedCrop();if(!c)return;c.y=clamp(Number(e.target.value)/100,-1,1);renderCanvasOnly();syncCropControls();markDirty();});$('cropYRange')?.addEventListener('change',commitHistory);
$('applyStyleSameRoleBtn')?.addEventListener('click',applyCurrentStyleToSameRole);$('applyLogoAllBtn')?.addEventListener('click',applyLogoToAll);$('applyPaletteAllBtn')?.addEventListener('click',applyPaletteToAll);$('applyImageCropAllBtn')?.addEventListener('click',applyCropToAll);
$('snapGuidesInput')?.addEventListener('change',e=>{project.snapGuides=e.target.checked;commitHistory();});$('cycleSelectionBtn')?.addEventListener('click',()=>{const keys=currentSlide().layerOrder.filter(k=>!k.startsWith('template:')&&layerVisible(currentSlide(),k));if(!keys.length)return;const i=keys.indexOf(selected);selectElement(keys[(i+1)%keys.length]);});
$('saveTmdbKeyBtn')?.addEventListener('click',()=>{tmdbKey=$('tmdbApiKeyInput').value.trim();storageSet('cdb-tmdb-key',tmdbKey);showToast(tmdbKey?'Chiave TMDb salvata sul dispositivo':'Inserisci una chiave');});$('clearTmdbKeyBtn')?.addEventListener('click',()=>{tmdbKey='';$('tmdbApiKeyInput').value='';storageSet('cdb-tmdb-key','');showToast('Chiave TMDb rimossa');});
$('showNumbersInput')?.addEventListener('change',e=>{project.showNumbers=e.target.checked;render();commitHistory();});
$('imageInput').addEventListener('change',async e=>{const files=[...(e.target.files||[])];if(!files.length)return;try{showToast('Preparo le immagini…');let first='';for(const file of files){const src=await prepareImageFile(file);await saveImageLibrary(src,file.name,'dispositivo');if(!first)first=src;}if(first)useImage(first);showToast(`${files.length} immagini aggiunte`);}catch(error){console.error(error);showToast('Immagine non leggibile');}e.target.value='';});
$('removeImageBtn').addEventListener('click',()=>{currentSlide().image.src='';layerState(currentSlide(),'image').visible=true;render();commitHistory();});
$('searchImagesBtn').addEventListener('click',searchImages);$('imageSearchInput').addEventListener('input',e=>{currentSlide().imageQuery=e.target.value;markDirty();});$('imageSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchImages();}});$('regenerateImageQueryBtn').addEventListener('click',()=>{currentSlide().imageQuery=buildSlideImageQuery(currentSlide(),currentIndex);$('imageSearchInput').value=currentSlide().imageQuery;searchImages();});$('suggestCurrentImageBtn').addEventListener('click',async()=>{try{setStatus('Cerco la proposta migliore…');const ok=await proposeImageForSlide(currentSlide(),currentIndex,{replace:true,showResults:true});if(ok){render();commitHistory();setStatus('Proposta inserita. Puoi sceglierne un’altra dai risultati.','success');showToast('Immagine proposta inserita');}else setStatus('Nessuna proposta importabile. Prova a modificare la query.','error');}catch(e){console.error(e);setStatus('Ricerca proposta non riuscita.','error');}});$('suggestAllImagesBtn').addEventListener('click',()=>autoSuggestProjectImages({replace:$('replaceSuggestedImagesCheckbox')?.checked}));
$('openGoogleImagesBtn').addEventListener('click',()=>{const q=$('imageSearchInput').value.trim();window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q||'cinema')}`,'_blank','noopener');});
$('importImageUrlBtn').addEventListener('click',importImageUrl);
$('clearLibraryBtn').addEventListener('click',async()=>{if(!imageLibrary.length)return;if(!confirm('Svuotare l’archivio immagini del dispositivo?'))return;imageLibrary=[];await storeClear('images');renderImageLibrary();});
$('extractArticleBtn').addEventListener('click',async()=>{try{await tryImportUrl($('articleUrlInput').value.trim(),'article');}catch(e){console.error(e);setImportStatus(`Estrazione non riuscita: ${e.message}. Incolla manualmente il testo.`,'error');}});
$('extractInstagramBtn').addEventListener('click',async()=>{try{await tryImportUrl($('instagramUrlInput').value.trim(),'instagram');}catch(e){console.error(e);setImportStatus('Instagram ha bloccato la lettura. Usa gli screenshot con OCR o incolla la caption.','error');}});
$('ocrImagesInput').addEventListener('change',async e=>{const files=[...(e.target.files||[])];try{await runOcrFiles(files);}catch(err){console.error(err);setImportStatus(`OCR non riuscito: ${err.message}`,'error');}e.target.value='';});
$('createFromTextBtn').addEventListener('click',async()=>{try{await createCarouselFromText($('importTextInput').value,$('importTitleInput').value.trim(),$('importFamilySelect').value,$('importLengthSelect').value);}catch(e){setImportStatus(e.message,'error');}});


$('undoBtn').addEventListener('click',()=>restoreHistory(historyIndex-1));$('redoBtn').addEventListener('click',()=>restoreHistory(historyIndex+1));
$('moreBtn').addEventListener('click',()=>$('projectDialog').showModal());$('projectNameInput').addEventListener('change',e=>{project.name=e.target.value.trim()||'Nuovo carosello';commitHistory();});
$('newProjectBtn').addEventListener('click',()=>{if(!confirm('Creare un nuovo progetto? Esporta la bozza se vuoi conservarne una copia.'))return;project=newProject();currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();$('projectDialog').close();});

$('exportPngBtn').addEventListener('click',()=>withQualityGuard('esportare il PNG',async()=>{try{showToast('Creo il PNG…');const blob=await renderPngBlob(currentSlide());downloadBlob(blob,`${slug(project.name)}-${currentIndex+1}.png`);showToast('PNG pronto');}catch(e){console.error(e);showToast('Errore durante il PNG');}}));
$('sharePngBtn').addEventListener('click',()=>withQualityGuard('condividere il PNG',async()=>{try{const blob=await renderPngBlob(currentSlide()),file=new File([blob],`${slug(project.name)}-${currentIndex+1}.png`,{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:project.name});else{downloadBlob(blob,file.name);showToast('Condivisione non disponibile: PNG scaricato');}}catch(e){if(e.name!=='AbortError')showToast('Condivisione non riuscita');}}));
$('exportSvgBtn').addEventListener('click',()=>withQualityGuard('esportare lo SVG',async()=>{const svg=buildSvg(currentSlide(),{suffix:'export'});downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),`${slug(project.name)}-${currentIndex+1}.svg`);}));
$('exportFaithfulSvgBtn').addEventListener('click',()=>withQualityGuard('esportare lo SVG fedele',async()=>{try{showToast('Creo SVG fedele…');await exportFaithfulSvg();showToast('SVG fedele pronto');}catch(e){console.error(e);showToast('Errore SVG fedele');}}));
$('exportPdfBtn').addEventListener('click',()=>withQualityGuard('esportare il PDF',async()=>{try{showToast('Creo il PDF…');await exportPdf();showToast('PDF pronto');}catch(e){console.error(e);$('saveStatus').textContent='errore PDF';showToast('Errore durante il PDF');}}));
$('exportAllBtn').addEventListener('click',()=>withQualityGuard('esportare il carosello',async()=>{try{showToast('Creo il carosello…');const files=[];for(let i=0;i<project.slides.length;i++){$('saveStatus').textContent=`esporto ${i+1}/${project.slides.length}`;const base=`${String(i+1).padStart(2,'0')}-${slug(project.slides[i].title?.text||`slide-${i+1}`).slice(0,44)}`;files.push({name:`${base}.png`,blob:await renderPngBlob(project.slides[i])});}downloadBlob(await makeZip(files),`${slug(project.name)}.zip`);$('saveStatus').textContent='salvato sul dispositivo';showToast('ZIP pronto');}catch(e){console.error(e);$('saveStatus').textContent='errore export';showToast('Errore durante lo ZIP');}}));
$('exportProjectBtn').addEventListener('click',()=>downloadBlob(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${slug(project.name)}.cdb.json`));
$('exportCompleteBtn')?.addEventListener('click',()=>withQualityGuard('creare il pacchetto completo',async()=>{try{showToast('Creo il pacchetto completo…');await exportCompletePackage();showToast('Pacchetto completo pronto');}catch(e){console.error(e);$('saveStatus').textContent='errore pacchetto';showToast('Errore durante il pacchetto');}}));
$('runQualityBtn')?.addEventListener('click',()=>runQualityCheck());
$('qualityList')?.addEventListener('click',event=>{const button=event.target.closest('[data-quality-index]');if(button&&qualityReport)jumpToQualityIssue(qualityReport.issues[Number(button.dataset.qualityIndex)]);});
$('fixFirstQualityBtn')?.addEventListener('click',()=>{if(qualityReport?.issues?.length)jumpToQualityIssue(qualityReport.issues.find(x=>x.severity==='error')||qualityReport.issues.find(x=>x.severity==='warning')||qualityReport.issues[0]);});
$('qualityFixDialogBtn')?.addEventListener('click',()=>{const issue=qualityReport?.issues?.find(x=>x.severity==='error')||qualityReport?.issues?.find(x=>x.severity==='warning')||qualityReport?.issues?.[0];$('qualityDialog').close();if(issue)jumpToQualityIssue(issue);});
$('qualityContinueBtn')?.addEventListener('click',async()=>{const action=pendingQualityExport;pendingQualityExport=null;$('qualityDialog').close();if(action)await action();});
$('projectInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{let parsed=migrateLegacyProject(JSON.parse(reader.result));if(!Array.isArray(parsed.slides)||!parsed.slides.length)throw new Error('Formato non valido');project={...parsed,version:'0.12.0',showNumbers:Boolean(parsed.showNumbers),snapGuides:parsed.snapGuides!==false,slides:parsed.slides.map(normalizeSlide)};project.slides.forEach((s,i)=>ensureSlideImageQuery(s,i));currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();showToast('Progetto aperto');}catch(error){console.error(error);showToast('File progetto non valido');}};reader.readAsText(file);e.target.value='';});

window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restoreHistory(historyIndex+(e.shiftKey?1:-1));return;}if(e.key==='Escape'){if(cropMode){setCropMode(false);return;}if($('textDialog').open)$('textDialog').close();}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){const model=currentElementModel(),el=model?.data;if(!model?.capabilities.move||!el)return;e.preventDefault();const step=e.shiftKey?10:1;if(e.key==='ArrowLeft')el.dx-=step;if(e.key==='ArrowRight')el.dx+=step;if(e.key==='ArrowUp')el.dy-=step;if(e.key==='ArrowDown')el.dy+=step;renderCanvasOnly();syncControls();commitHistory();}});

async function fileToDataUrl(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error('Asset non disponibile');return blobToDataUrl(await response.blob());}
async function initialize(){
  if(initialized)return;initialized=true;
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js?v=0.12.0').then(r=>r.update()).catch(console.warn);
  try{logoData=await fileToDataUrl('assets/logo.png');}catch(e){console.warn(e);}
  project=await loadState();project.snapGuides=project.snapGuides!==false;templateEditMode=false;tmdbKey=storageGet('cdb-tmdb-key');if($('tmdbApiKeyInput'))$('tmdbApiKeyInput').value=tmdbKey;for(const s of project.slides){hydrateImageMeta(s.image);for(const ov of s.overlays||[])hydrateImageMeta(ov);}currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();setTab(activeTab);document.fonts?.ready.then(()=>render()).catch(()=>{});
}
window.addEventListener('cdb:unlock',initialize);function renderOverlayList(){const el=$('overlayList');if(!el)return;const list=currentSlide()?.overlays||[];if(!list.length){el.innerHTML='<p class="panel-note">Nessuna foto libera nella slide.</p>';return;}el.innerHTML=list.map(ov=>`<div class="free-text-item${selected===`overlay:${ov.id}`?' active':''}"><button type="button" data-overlay-select="${ov.id}">${esc(ov.name||'Foto libera')}</button><button type="button" data-overlay-delete="${ov.id}">×</button></div>`).join('');el.querySelectorAll('[data-overlay-select]').forEach(b=>b.addEventListener('click',()=>selectElement(`overlay:${b.dataset.overlaySelect}`)));el.querySelectorAll('[data-overlay-delete]').forEach(b=>b.addEventListener('click',()=>{selected=`overlay:${b.dataset.overlayDelete}`;deleteSelectedElement();}));}
async function addOverlayFiles(files){for(const file of [...(files||[])]){const src=await prepareImageFile(file);try{await saveImageLibrary(src,file.name,'Caricata');}catch(error){console.warn('Archivio immagini non disponibile',error);}const ov=overlayDefaults({src,name:file.name});await hydrateImageMeta(ov);currentSlide().overlays=currentSlide().overlays||[];currentSlide().overlays.push(ov);ensureLayerModel(currentSlide());selected=`overlay:${ov.id}`;}render();commitHistory();}

