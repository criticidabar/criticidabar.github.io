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
  }},
  fd: { label:'FEDELE · CREMA & RITAGLI', variants:{
    copertina:{label:'Cover poster',description:'Poster pieno, titolo arancione e richiamo blu come nei caroselli Dune.',design:'faith-dune-cover'},
    citazione:{label:'Citazione + ritagli',description:'Sfondo crema, testo centrale e spazio per personaggi scontornati.',design:'faith-dune-quote'},
    immagine_alta:{label:'Foto alta + commento',description:'Fotogramma superiore, testo centrale e ritagli nella parte bassa.',design:'faith-dune-image-top'},
    finale:{label:'Domanda + CTA',description:'Chiusura crema con fumetto, invito ai commenti e personaggio in basso.',design:'faith-dune-final'}
  }},
  fr: { label:'FEDELE · RITORNI IN SALA', variants:{
    copertina:{label:'Cover calendario',description:'Immagine piena, logo alto e titolo da rubrica cinematografica.',design:'faith-returns-cover'},
    fumetto:{label:'Perché al cinema?',description:'Foto superiore e grande fumetto arancione nella metà bassa.',design:'faith-returns-bubble'},
    scheda:{label:'Scheda editoriale',description:'Testo a sinistra e collage o fotogramma a destra.',design:'faith-returns-split'},
    finale:{label:'Finale commenti',description:'Domanda centrale, freccia e CTA pulita su crema.',design:'faith-returns-final'}
  }},
  fs: { label:'FEDELE · DISCLOSURE', variants:{
    copertina:{label:'Cover atmosferica',description:'Foto a piena pagina, titolo arancione e logo in basso.',design:'faith-disclosure-cover'},
    editoriale:{label:'Editoriale atmosferico',description:'Fotogramma pieno con titolo arancione e testo bianco ad alta leggibilità.',design:'faith-disclosure-editorial'},
    finale:{label:'Finale uscita / CTA',description:'Sfondo crema, fumetto domanda, blocchi blu-arancio e ritaglio in basso.',design:'faith-disclosure-final'}
  }},
  fg: { label:'FEDELE · PORCO ROSSO / GHIBLI', variants:{
    copertina:{label:'Cover illustrata',description:'Fotogramma pieno, platea in basso e titolo turchese-arancione.',design:'faith-ghibli-cover'},
    storia:{label:'Storia + immagine alta',description:'Grande fotogramma superiore e commento editoriale nella fascia crema.',design:'faith-ghibli-story'},
    personaggio:{label:'Personaggio / citazione',description:'Fotogramma dominante e frase centrale con accento grafico.',design:'faith-ghibli-character'},
    finale:{label:'Finale uscita',description:'Domanda, data di uscita e spazio per un ritaglio illustrato.',design:'faith-ghibli-final'}
  }},
  fk: { label:'FEDELE · CAVALIERE DEI SETTE REGNI', variants:{
    copertina:{label:'Apertura recensione',description:'Sfondo crema, punteggio, platea e ritagli narrativi.',design:'faith-knight-cover'},
    racconto:{label:'Racconto di Westeros',description:'Titolo centrale, personaggi ai bordi e cinema in basso.',design:'faith-knight-story'},
    giudizio:{label:'Giudizio / voto',description:'Slide argomentativa con score, claim forte e ritagli.',design:'faith-knight-verdict'},
    finale:{label:'Finale community',description:'Domanda blu, voto e invito ai commenti.',design:'faith-knight-final'}
  }},
  fc: { label:'FEDELE · DIBATTITO CINEMA', variants:{
    copertina:{label:'Domanda di apertura',description:'Domanda blu, risposta arancione e platea cinematografica.',design:'faith-cinema-cover'},
    argomento:{label:'Argomento + ritaglio',description:'Claim centrale con spazio per un personaggio scontornato.',design:'faith-cinema-argument'},
    confronto:{label:'Confronto / tesi',description:'Alternanza blu-arancione e composizione più dinamica.',design:'faith-cinema-contrast'},
    finale:{label:'Finale condividi',description:'Doppia CTA per commentare e condividere.',design:'faith-cinema-final'}
  }},
  fm: { label:'FEDELE · MAD MAX', variants:{
    copertina:{label:'Cover notizia',description:'Foto piena, velatura scura e titolo da breaking news cinematografica.',design:'faith-madmax-cover'},
    editoriale:{label:'Editoriale personaggio',description:'Ritratto pieno, titolo bianco e richiamo arancione.',design:'faith-madmax-editorial'},
    panorama:{label:'Scenario / futuro',description:'Fotogramma panoramico con testo basso ad alta leggibilità.',design:'faith-madmax-landscape'},
    finale:{label:'Finale Furiosa',description:'Sfondo crema, domanda e grande ritaglio in basso.',design:'faith-madmax-final'}
  }}
};

const DEFAULT_VARIANT = { n:'copertina', o:'copertina', c:'copertina', d:'hero', r:'copertina', fd:'copertina', fr:'copertina', fs:'copertina', fg:'copertina', fk:'copertina', fc:'copertina', fm:'copertina' };
const $ = id => document.getElementById(id);
const canvas = $('canvas');
const measureCanvas = document.createElement('canvas');
const measureCtx = measureCanvas.getContext('2d');

let project;
let currentIndex = 0;
let selected = 'title';
let activeTab = 'import';
let advancedUi = localStorage.getItem('cdb-advanced-ui') === '1';
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
let elementClipboard = null;
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
let pendingEditorialOutline = null;
let editorialOutlineSignature = '';
const EDITORIAL_STOP_WORDS = new Set('a ad al allo ai agli alla alle anche ancora avere che chi ci con contro cosa cui da dal dalla dalle dei del della delle di e ed era essere fa fra gli ha hanno i il in io la le lo ma mi ne nei nel nella nelle non o per più poi quale quando quanto questa queste questi questo se senza si sia sono su sul sulla tra un una uno come dopo prima molto tutto tutti tutte ogni può possono perché mentre invece dove già solo stesso stessa degli delle loro suo sua suoi sue nel nello nelle sullo dagli dalle'.split(/\s+/));
const EDITORIAL_ROLE_LABELS={context:'Contesto',fact:'Punto chiave',detail:'Dettaglio',quote:'Citazione',impact:'Conseguenza',critique:'Lettura critica',conclusion:'Conclusione'};

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

const EDITABLE_TEMPLATE_DESIGNS=new Set(['new-cover','new-body','new-question','new-final','faith-dune-cover','faith-dune-quote','faith-dune-image-top','faith-dune-final','faith-returns-cover','faith-returns-bubble','faith-returns-split','faith-returns-final','faith-disclosure-cover','faith-disclosure-editorial','faith-disclosure-final','faith-ghibli-cover','faith-ghibli-story','faith-ghibli-character','faith-ghibli-final','faith-knight-cover','faith-knight-story','faith-knight-verdict','faith-knight-final','faith-cinema-cover','faith-cinema-argument','faith-cinema-contrast','faith-cinema-final','faith-madmax-cover','faith-madmax-editorial','faith-madmax-landscape','faith-madmax-final']);
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
  if(design==='faith-dune-cover')return[
    s({name:'Velatura poster',type:'rect',x:0,y:0,w:1080,h:1350,fill:'palette:ink',alpha:.20}),
    s({name:'Gradiente simulato basso',type:'rect',x:0,y:760,w:1080,h:590,fill:'palette:ink',alpha:.56}),
    s({name:'Linea blu titolo',type:'rect',x:78,y:1132,w:925,h:15,fill:'palette:background'}),
    s({name:'Firma editoriale',type:'label',x:76,y:64,w:420,h:34,fill:'palette:surface',text:'POWER OVER SPICE IS POWER OVER ALL',font:'Archivo',size:16,weight:700})
  ];
  if(design==='faith-dune-quote')return[
    s({name:'Fumetto citazione',type:'bubble',x:455,y:78,w:170,h:145,radius:20,fill:'palette:accent',stroke:'palette:background',strokeWidth:7,tail:.46,tailWidth:.18,tailHeight:.20}),
    s({name:'Punto domanda',type:'label',x:455,y:78,w:170,h:125,fill:'palette:background',text:'?',font:'Anton',size:92,weight:400}),
    s({name:'Freccia arancione',type:'polygon',x:805,y:1125,w:155,h:95,fill:'palette:accent',points:[[0,.25],[.62,.25],[.62,0],[1,.5],[.62,1],[.62,.75],[0,.75]]}),
    s({name:'Firma blu',type:'rect',x:380,y:1190,w:320,h:8,fill:'palette:background'})
  ];
  if(design==='faith-dune-image-top')return[
    s({name:'Separatore immagine',type:'rect',x:0,y:455,w:1080,h:22,fill:'palette:accent'}),
    s({name:'Freccia finale',type:'polygon',x:865,y:1150,w:135,h:80,fill:'palette:accent',points:[[0,.25],[.62,.25],[.62,0],[1,.5],[.62,1],[.62,.75],[0,.75]]}),
    s({name:'Accento blu',type:'rect',x:78,y:1118,w:610,h:10,fill:'palette:background'})
  ];
  if(design==='faith-dune-final')return[
    s({name:'Fumetto domanda',type:'bubble',x:455,y:75,w:170,h:145,radius:20,fill:'palette:accent',stroke:'palette:background',strokeWidth:8,tail:.42,tailWidth:.18,tailHeight:.20}),
    s({name:'Punto domanda',type:'label',x:455,y:76,w:170,h:123,fill:'palette:background',text:'?',font:'Anton',size:92,weight:400}),
    s({name:'Freccia CTA',type:'polygon',x:292,y:302,w:115,h:70,fill:'palette:accent',points:[[0,.25],[.62,.25],[.62,0],[1,.5],[.62,1],[.62,.75],[0,.75]]}),
    s({name:'Badge CTA',type:'rect',x:280,y:1035,w:455,h:105,radius:4,fill:'palette:background',stroke:'palette:accent',strokeWidth:8}),
    s({name:'Testo badge',type:'label',x:280,y:1035,w:455,h:105,fill:'palette:accent',text:'SCRIVI LA TUA AL BAR',font:'Anton',size:34,weight:400})
  ];
  if(design==='faith-returns-cover')return[
    s({name:'Velatura bassa',type:'rect',x:0,y:650,w:1080,h:700,fill:'palette:ink',alpha:.42}),
    s({name:'Fascia mese',type:'rect',x:260,y:535,w:560,h:70,radius:4,fill:'palette:surface',alpha:.92}),
    s({name:'Etichetta cinema',type:'label',x:260,y:535,w:560,h:70,fill:'palette:ink',text:'RITORNI IN SALA',font:'Anton',size:42,weight:400}),
    s({name:'Linea arancione',type:'rect',x:125,y:1125,w:830,h:13,fill:'palette:accent'})
  ];
  if(design==='faith-returns-bubble')return[
    s({name:'Velatura foto',type:'rect',x:0,y:300,w:1080,h:350,fill:'palette:ink',alpha:.34}),
    s({name:'Fumetto arancione',type:'bubble',x:82,y:720,w:916,h:460,radius:22,fill:'palette:accent',stroke:'palette:surface',strokeWidth:5,tail:.52,tailWidth:.16,tailHeight:.15}),
    s({name:'Barra blu',type:'rect',x:120,y:1090,w:840,h:14,fill:'palette:background'})
  ];
  if(design==='faith-returns-split')return[
    s({name:'Separatore verticale',type:'rect',x:525,y:0,w:22,h:1350,fill:'palette:accent'}),
    s({name:'Data editoriale',type:'label',x:55,y:78,w:420,h:68,fill:'palette:accent',text:'4–6 MAGGIO',font:'Anton',size:44,weight:400}),
    s({name:'Indicatore',type:'polygon',x:76,y:1160,w:115,h:68,fill:'palette:background',points:[[0,.2],[.65,.2],[.65,0],[1,.5],[.65,1],[.65,.8],[0,.8]]})
  ];
  if(design==='faith-returns-final')return[
    s({name:'Fumetto domanda',type:'bubble',x:455,y:95,w:170,h:145,radius:20,fill:'palette:accent',stroke:'palette:background',strokeWidth:8,tail:.44,tailWidth:.18,tailHeight:.20}),
    s({name:'Punto domanda',type:'label',x:455,y:95,w:170,h:123,fill:'palette:background',text:'?',font:'Anton',size:92,weight:400}),
    s({name:'Aereo di carta',type:'polygon',x:452,y:660,w:175,h:110,fill:'palette:ink',points:[[0,.52],[1,0],[.66,1],[.51,.62]]}),
    s({name:'Sottolineatura',type:'rect',x:260,y:1030,w:560,h:13,fill:'palette:accent'})
  ];
  if(design==='faith-disclosure-cover')return[
    s({name:'Velatura fredda',type:'rect',x:0,y:0,w:1080,h:1350,fill:'palette:surface',alpha:.08}),
    s({name:'Velatura titolo',type:'rect',x:45,y:85,w:850,h:430,fill:'palette:ink',alpha:.18}),
    s({name:'Linea arancione',type:'rect',x:55,y:445,w:650,h:13,fill:'palette:accent'})
  ];
  if(design==='faith-disclosure-editorial')return[
    s({name:'Velo leggibilità',type:'rect',x:0,y:0,w:1080,h:690,fill:'palette:ink',alpha:.46}),
    s({name:'Linea titolo',type:'rect',x:55,y:290,w:880,h:11,fill:'palette:accent'}),
    s({name:'Velo basso',type:'rect',x:0,y:1040,w:1080,h:310,fill:'palette:surface',alpha:.10})
  ];
  if(design==='faith-disclosure-final')return[
    s({name:'Fumetto domanda',type:'bubble',x:455,y:72,w:170,h:145,radius:20,fill:'palette:accent',stroke:'palette:background',strokeWidth:8,tail:.43,tailWidth:.18,tailHeight:.20}),
    s({name:'Punto domanda',type:'label',x:455,y:72,w:170,h:123,fill:'palette:background',text:'?',font:'Anton',size:92,weight:400}),
    s({name:'Freccia arancione',type:'polygon',x:290,y:288,w:120,h:75,fill:'palette:accent',points:[[0,.25],[.62,.25],[.62,0],[1,.5],[.62,1],[.62,.75],[0,.75]]}),
    s({name:'Badge uscita',type:'rect',x:310,y:945,w:460,h:135,radius:4,fill:'palette:background'}),
    s({name:'Testo uscita',type:'label',x:310,y:945,w:460,h:135,fill:'palette:accent',text:'AL CINEMA DAL 10 GIUGNO',font:'Anton',size:38,weight:400}),
    s({name:'Badge recensione',type:'rect',x:320,y:1130,w:440,h:95,radius:4,fill:'palette:accent',stroke:'palette:background',strokeWidth:8}),
    s({name:'Testo recensione',type:'label',x:320,y:1130,w:440,h:95,fill:'palette:background',text:'SEGUI LA RECENSIONE',font:'Anton',size:31,weight:400})
  ];
  if(design==='faith-ghibli-cover')return[
    s({name:'Velatura cinematografica',type:'rect',x:0,y:760,w:1080,h:590,fill:'palette:ink',alpha:.44}),
    s({name:'Platea',type:'polygon',x:0,y:1125,w:1080,h:225,fill:'palette:ink',alpha:.88,points:[[0,.32],[.16,.18],[.34,.27],[.52,.10],[.70,.25],[.87,.16],[1,.30],[1,1],[0,1]]}),
    s({name:'Linea turchese',type:'rect',x:105,y:1098,w:870,h:14,fill:'#38d7d0'}),
    s({name:'Freccia destra',type:'polygon',x:900,y:1215,w:105,h:70,fill:'palette:accent',points:[[0,.30],[.60,.30],[.60,0],[1,.50],[.60,1],[.60,.70],[0,.70]]})
  ];
  if(design==='faith-ghibli-story')return[
    s({name:'Separatore crema',type:'rect',x:0,y:630,w:1080,h:18,fill:'palette:accent'}),
    s({name:'Freccia rosa',type:'polygon',x:895,y:1190,w:115,h:76,fill:'#c2185b',points:[[0,.30],[.60,.30],[.60,0],[1,.50],[.60,1],[.60,.70],[0,.70]]}),
    s({name:'Firma blu',type:'label',x:635,y:675,w:365,h:40,fill:'palette:background',text:'IL CAPOLAVORO DI MIYAZAKI',font:'Anton',size:24,weight:400})
  ];
  if(design==='faith-ghibli-character')return[
    s({name:'Separatore immagine',type:'rect',x:0,y:720,w:1080,h:18,fill:'palette:accent'}),
    s({name:'Freccia rosa',type:'polygon',x:892,y:1192,w:118,h:78,fill:'#c2185b',points:[[0,.30],[.60,.30],[.60,0],[1,.50],[.60,1],[.60,.70],[0,.70]]}),
    s({name:'Accento blu',type:'rect',x:170,y:1160,w:650,h:10,fill:'palette:background'})
  ];
  if(design==='faith-ghibli-final')return[
    s({name:'Fumetto domanda',type:'bubble',x:455,y:80,w:170,h:145,radius:20,fill:'palette:accent',stroke:'palette:background',strokeWidth:8,tail:.43,tailWidth:.18,tailHeight:.20}),
    s({name:'Punto domanda',type:'label',x:455,y:80,w:170,h:123,fill:'palette:background',text:'?',font:'Anton',size:92,weight:400}),
    s({name:'Aereo di carta',type:'polygon',x:245,y:286,w:120,h:75,fill:'palette:accent',points:[[0,.30],[.60,.30],[.60,0],[1,.50],[.60,1],[.60,.70],[0,.70]]}),
    s({name:'Badge cinema',type:'rect',x:300,y:930,w:480,h:105,radius:4,fill:'palette:background',stroke:'palette:accent',strokeWidth:8}),
    s({name:'Testo cinema',type:'label',x:300,y:930,w:480,h:105,fill:'palette:accent',text:'AL CINEMA DAL 25 APRILE',font:'Anton',size:35,weight:400})
  ];
  if(design==='faith-knight-cover')return[
    s({name:'Punteggio',type:'label',x:855,y:42,w:160,h:70,fill:'palette:accent',text:'1/10',font:'Anton',size:43,weight:400}),
    s({name:'Platea cinema',type:'polygon',x:0,y:1045,w:1080,h:305,fill:'palette:ink',alpha:.92,points:[[0,.42],[.12,.28],[.24,.38],[.37,.20],[.50,.33],[.62,.15],[.75,.35],[.88,.22],[1,.38],[1,1],[0,1]]}),
    s({name:'Banner basso',type:'rect',x:0,y:1185,w:1080,h:105,fill:'palette:ink',alpha:.96}),
    s({name:'Testo banner',type:'label',x:70,y:1190,w:700,h:90,fill:'palette:surface',text:'RICOMINCIAMO',font:'Anton',size:42,weight:400}),
    s({name:'Freccia avanti',type:'polygon',x:850,y:1200,w:130,h:65,fill:'none',stroke:'palette:surface',strokeWidth:8,points:[[0,.25],[.62,.25],[.62,0],[1,.50],[.62,1],[.62,.75],[0,.75]]})
  ];
  if(design==='faith-knight-story')return[
    s({name:'Punteggio',type:'label',x:855,y:42,w:160,h:70,fill:'palette:accent',text:'2/10',font:'Anton',size:43,weight:400}),
    s({name:'Platea cinema',type:'polygon',x:0,y:1060,w:1080,h:290,fill:'palette:ink',alpha:.92,points:[[0,.42],[.12,.28],[.24,.38],[.37,.20],[.50,.33],[.62,.15],[.75,.35],[.88,.22],[1,.38],[1,1],[0,1]]}),
    s({name:'Freccia avanti',type:'polygon',x:875,y:1198,w:120,h:70,fill:'none',stroke:'palette:surface',strokeWidth:8,points:[[0,.25],[.62,.25],[.62,0],[1,.50],[.62,1],[.62,.75],[0,.75]]}),
    s({name:'Aeroplanino',type:'polygon',x:805,y:268,w:78,h:48,fill:'none',stroke:'palette:ink',strokeWidth:5,points:[[0,.50],[1,0],[.65,1],[.48,.62]]})
  ];
  if(design==='faith-knight-verdict')return[
    s({name:'Punteggio',type:'label',x:855,y:42,w:160,h:70,fill:'palette:accent',text:'8/10',font:'Anton',size:43,weight:400}),
    s({name:'Platea cinema',type:'polygon',x:0,y:1040,w:1080,h:310,fill:'palette:ink',alpha:.92,points:[[0,.42],[.12,.28],[.24,.38],[.37,.20],[.50,.33],[.62,.15],[.75,.35],[.88,.22],[1,.38],[1,1],[0,1]]}),
    s({name:'Sottolineatura',type:'rect',x:150,y:910,w:780,h:13,fill:'palette:background'}),
    s({name:'Freccia avanti',type:'polygon',x:875,y:1198,w:120,h:70,fill:'none',stroke:'palette:surface',strokeWidth:8,points:[[0,.25],[.62,.25],[.62,0],[1,.50],[.62,1],[.62,.75],[0,.75]]})
  ];
  if(design==='faith-knight-final')return[
    s({name:'Punteggio',type:'label',x:855,y:42,w:160,h:70,fill:'palette:accent',text:'9/10',font:'Anton',size:43,weight:400}),
    s({name:'Fumetto domanda',type:'bubble',x:455,y:70,w:170,h:145,radius:20,fill:'palette:accent',stroke:'palette:background',strokeWidth:8,tail:.43,tailWidth:.18,tailHeight:.20}),
    s({name:'Punto domanda',type:'label',x:455,y:70,w:170,h:123,fill:'palette:background',text:'?',font:'Anton',size:92,weight:400}),
    s({name:'Platea cinema',type:'polygon',x:0,y:1070,w:1080,h:280,fill:'palette:ink',alpha:.92,points:[[0,.42],[.12,.28],[.24,.38],[.37,.20],[.50,.33],[.62,.15],[.75,.35],[.88,.22],[1,.38],[1,1],[0,1]]}),
    s({name:'Firma',type:'label',x:665,y:1190,w:350,h:50,fill:'palette:background',text:'UN BARATTOLO, UNA STORIA',font:'Anton',size:22,weight:400})
  ];
  if(design==='faith-cinema-cover')return[
    s({name:'Numero pagina',type:'label',x:860,y:35,w:150,h:70,fill:'palette:accent',text:'1/6',font:'Anton',size:44,weight:400}),
    s({name:'Triangolo',type:'polygon',x:795,y:255,w:80,h:62,fill:'none',stroke:'palette:ink',strokeWidth:5,points:[[.5,0],[1,1],[0,1]]}),
    s({name:'Platea cinema',type:'polygon',x:0,y:900,w:1080,h:450,fill:'palette:ink',alpha:.96,points:[[0,.42],[.10,.25],[.22,.36],[.34,.19],[.46,.31],[.58,.15],[.70,.34],[.82,.21],[.93,.36],[1,.28],[1,1],[0,1]]}),
    s({name:'Freccia arancione',type:'polygon',x:835,y:1170,w:155,h:90,fill:'palette:accent',points:[[0,.30],[.60,.30],[.60,0],[1,.50],[.60,1],[.60,.70],[0,.70]]})
  ];
  if(design==='faith-cinema-argument')return[
    s({name:'Numero pagina',type:'label',x:860,y:35,w:150,h:70,fill:'palette:accent',text:'2/6',font:'Anton',size:44,weight:400}),
    s({name:'Platea cinema',type:'polygon',x:0,y:900,w:1080,h:450,fill:'palette:ink',alpha:.96,points:[[0,.42],[.10,.25],[.22,.36],[.34,.19],[.46,.31],[.58,.15],[.70,.34],[.82,.21],[.93,.36],[1,.28],[1,1],[0,1]]}),
    s({name:'Teschio decorativo',type:'label',x:810,y:290,w:100,h:70,fill:'palette:ink',text:'☠',font:'Arial',size:45,weight:800}),
    s({name:'Freccia puntinata',type:'label',x:820,y:1160,w:190,h:90,fill:'palette:accent',text:'···➜',font:'Anton',size:55,weight:400})
  ];
  if(design==='faith-cinema-contrast')return[
    s({name:'Numero pagina',type:'label',x:860,y:35,w:150,h:70,fill:'palette:accent',text:'3/6',font:'Anton',size:44,weight:400}),
    s({name:'Triangolo sinistro',type:'polygon',x:75,y:410,w:75,h:58,fill:'none',stroke:'palette:ink',strokeWidth:5,points:[[.5,0],[1,1],[0,1]]}),
    s({name:'Platea cinema',type:'polygon',x:0,y:900,w:1080,h:450,fill:'palette:ink',alpha:.96,points:[[0,.42],[.10,.25],[.22,.36],[.34,.19],[.46,.31],[.58,.15],[.70,.34],[.82,.21],[.93,.36],[1,.28],[1,1],[0,1]]}),
    s({name:'Freccia puntinata',type:'label',x:820,y:1160,w:190,h:90,fill:'palette:accent',text:'···➜',font:'Anton',size:55,weight:400})
  ];
  if(design==='faith-cinema-final')return[
    s({name:'Numero pagina',type:'label',x:860,y:35,w:150,h:70,fill:'palette:accent',text:'6/6',font:'Anton',size:44,weight:400}),
    s({name:'Aeroplanino',type:'polygon',x:110,y:500,w:90,h:58,fill:'palette:ink',points:[[0,.50],[1,0],[.65,1],[.48,.62]]}),
    s({name:'Triangolo destro',type:'polygon',x:880,y:360,w:75,h:58,fill:'none',stroke:'palette:ink',strokeWidth:5,points:[[.5,0],[1,1],[0,1]]}),
    s({name:'Platea cinema',type:'polygon',x:0,y:900,w:1080,h:450,fill:'palette:ink',alpha:.96,points:[[0,.42],[.10,.25],[.22,.36],[.34,.19],[.46,.31],[.58,.15],[.70,.34],[.82,.21],[.93,.36],[1,.28],[1,1],[0,1]]}),
    s({name:'Freccia arancione',type:'polygon',x:835,y:1170,w:155,h:90,fill:'palette:accent',points:[[0,.30],[.60,.30],[.60,0],[1,.50],[.60,1],[.60,.70],[0,.70]]})
  ];
  if(design==='faith-madmax-cover')return[
    s({name:'Velatura bassa',type:'rect',x:0,y:470,w:1080,h:880,fill:'palette:ink',alpha:.54}),
    s({name:'Barra arancione',type:'rect',x:120,y:1030,w:840,h:14,fill:'palette:accent'}),
    s({name:'Nota editoriale',type:'label',x:110,y:1110,w:860,h:55,fill:'palette:accent',text:'GEORGE MILLER PREPARA IL FUTURO DELLA SAGA',font:'Anton',size:24,weight:400})
  ];
  if(design==='faith-madmax-editorial')return[
    s({name:'Velatura centrale',type:'rect',x:0,y:420,w:1080,h:930,fill:'palette:ink',alpha:.58}),
    s({name:'Linea fuoco',type:'rect',x:120,y:1040,w:840,h:14,fill:'palette:accent'}),
    s({name:'Nota editoriale',type:'label',x:110,y:1120,w:860,h:55,fill:'palette:accent',text:'MAD MAX POTREBBE ESSERE VENDUTO DOPO L’ULTIMO CAPITOLO',font:'Anton',size:23,weight:400})
  ];
  if(design==='faith-madmax-landscape')return[
    s({name:'Velatura bassa',type:'rect',x:0,y:560,w:1080,h:790,fill:'palette:ink',alpha:.62}),
    s({name:'Linea arancione',type:'rect',x:120,y:1040,w:840,h:14,fill:'palette:accent'}),
    s({name:'Nota editoriale',type:'label',x:110,y:1120,w:860,h:55,fill:'palette:accent',text:'UNA SERIE TV NELL’UNIVERSO POST-APOCALITTICO?',font:'Anton',size:23,weight:400})
  ];
  if(design==='faith-madmax-final')return[
    s({name:'Fumetto domanda',type:'bubble',x:455,y:70,w:170,h:145,radius:20,fill:'palette:accent',stroke:'palette:background',strokeWidth:8,tail:.43,tailWidth:.18,tailHeight:.20}),
    s({name:'Punto domanda',type:'label',x:455,y:70,w:170,h:123,fill:'palette:background',text:'?',font:'Anton',size:92,weight:400}),
    s({name:'Aeroplanino',type:'polygon',x:455,y:285,w:115,h:75,fill:'palette:ink',points:[[0,.50],[1,0],[.65,1],[.48,.62]]}),
    s({name:'Badge',type:'rect',x:245,y:905,w:430,h:105,radius:4,fill:'palette:background',stroke:'palette:accent',strokeWidth:8}),
    s({name:'Testo badge',type:'label',x:245,y:905,w:430,h:105,fill:'palette:accent',text:'NON SVEGLIATEMI',font:'Anton',size:39,weight:400})
  ];
  return[];
}
function usesSeparatedTemplateShapes(slide){return EDITABLE_TEMPLATE_DESIGNS.has(designOf(slide))&&slide.templateShapeMode!=='legacy';}
function ensureTemplateShapes(slide){
  if(!Array.isArray(slide.templateShapes))slide.templateShapes=[];
  slide.templateShapes=slide.templateShapes.map(normalizeShape);
  if(usesSeparatedTemplateShapes(slide)&&!slide.templateShapes.length&&slide.templateShapesInitialized!==true)slide.templateShapes=templateShapeDefaults(designOf(slide));
  slide.templateShapesInitialized=true;
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
  const type=elementType(key),data=elementData(slide,key),locked=layerLocked(slide,key),template=type==='template';
  return {
    select:true,move:Boolean(data)&&!locked,resize:Boolean(data)&&!locked,rotate:Boolean(data)&&!locked,
    opacity:!template,reorder:layerCanReorder(key),duplicate:Boolean(data)&&(type==='text'||type==='shape'||(type==='image'&&key!=='image')),
    delete:Boolean(data)&&!template,editText:type==='text',editStyle:type==='text'||type==='shape'
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
    'returns-final':{title:{size:82,color:COLORS.orange,width:92},subtitle:{size:44,weight:680,color:COLORS.blue,width:100,lineHeight:1.1}},
    'faith-dune-cover':{title:{size:94,color:COLORS.orange,width:88,lineHeight:.88},subtitle:{size:39,weight:400,color:'#38d7d0',width:94,lineHeight:.98}},
    'faith-dune-quote':{title:{size:62,color:COLORS.orange,width:91,lineHeight:.94},subtitle:{size:43,weight:400,color:COLORS.blue,width:94,lineHeight:1.05}},
    'faith-dune-image-top':{title:{size:58,color:COLORS.orange,width:92,lineHeight:.96},subtitle:{size:40,weight:400,color:COLORS.blue,width:95,lineHeight:1.05}},
    'faith-dune-final':{title:{size:76,color:COLORS.orange,width:90,lineHeight:.92},subtitle:{size:51,weight:400,color:COLORS.blue,width:92,lineHeight:.98}},
    'faith-returns-cover':{title:{size:90,color:COLORS.orange,width:90,lineHeight:.90},subtitle:{size:47,weight:400,color:COLORS.cream,width:94,lineHeight:.98}},
    'faith-returns-bubble':{title:{size:67,color:COLORS.cream,width:92,lineHeight:.92},subtitle:{size:43,weight:400,color:COLORS.blue,width:94,lineHeight:1.04}},
    'faith-returns-split':{title:{size:57,color:COLORS.orange,width:91,lineHeight:.94},subtitle:{size:35,weight:400,color:COLORS.blue,width:94,lineHeight:1.07}},
    'faith-returns-final':{title:{size:76,color:COLORS.orange,width:90,lineHeight:.92},subtitle:{size:49,weight:400,color:COLORS.blue,width:92,lineHeight:1.0}},
    'faith-disclosure-cover':{title:{size:105,color:COLORS.orange,width:86,lineHeight:.86},subtitle:{size:36,weight:400,color:COLORS.orange,width:92,lineHeight:1.0}},
    'faith-disclosure-editorial':{title:{size:52,color:COLORS.orange,width:92,lineHeight:.96},subtitle:{size:37,weight:400,color:COLORS.cream,width:96,lineHeight:1.10}},
    'faith-disclosure-final':{title:{size:72,color:COLORS.orange,width:90,lineHeight:.93},subtitle:{size:48,weight:400,color:COLORS.blue,width:92,lineHeight:1.0}},
    'faith-ghibli-cover':{title:{size:80,color:COLORS.orange,width:90,lineHeight:.90},subtitle:{size:48,weight:400,color:'#38d7d0',width:92,lineHeight:.98}},
    'faith-ghibli-story':{title:{size:59,color:COLORS.orange,width:91,lineHeight:.94},subtitle:{size:29,weight:400,color:COLORS.blue,width:94,lineHeight:1.0}},
    'faith-ghibli-character':{title:{size:58,color:COLORS.orange,width:91,lineHeight:.94},subtitle:{size:35,weight:400,color:COLORS.blue,width:94,lineHeight:1.03}},
    'faith-ghibli-final':{title:{size:75,color:COLORS.orange,width:90,lineHeight:.92},subtitle:{size:49,weight:400,color:COLORS.blue,width:92,lineHeight:1.0}},
    'faith-knight-cover':{title:{size:65,color:COLORS.orange,width:90,lineHeight:.91},subtitle:{size:39,weight:400,color:COLORS.blue,width:92,lineHeight:.98}},
    'faith-knight-story':{title:{size:64,color:COLORS.orange,width:90,lineHeight:.91},subtitle:{size:39,weight:400,color:COLORS.blue,width:92,lineHeight:.98}},
    'faith-knight-verdict':{title:{size:61,color:COLORS.orange,width:90,lineHeight:.92},subtitle:{size:47,weight:400,color:COLORS.blue,width:92,lineHeight:.98}},
    'faith-knight-final':{title:{size:67,color:COLORS.blue,width:90,lineHeight:.92},subtitle:{size:48,weight:400,color:COLORS.orange,width:92,lineHeight:1.0}},
    'faith-cinema-cover':{title:{size:72,color:COLORS.blue,width:90,lineHeight:.92},subtitle:{size:54,weight:400,color:COLORS.orange,width:92,lineHeight:.98}},
    'faith-cinema-argument':{title:{size:63,color:COLORS.orange,width:90,lineHeight:.92},subtitle:{size:49,weight:400,color:COLORS.blue,width:92,lineHeight:.98}},
    'faith-cinema-contrast':{title:{size:62,color:COLORS.blue,width:90,lineHeight:.92},subtitle:{size:47,weight:400,color:COLORS.orange,width:92,lineHeight:.98}},
    'faith-cinema-final':{title:{size:58,color:COLORS.blue,width:90,lineHeight:.94},subtitle:{size:58,weight:400,color:COLORS.orange,width:92,lineHeight:.94}},
    'faith-madmax-cover':{title:{size:69,color:COLORS.cream,width:92,lineHeight:.91},subtitle:{size:40,weight:400,color:COLORS.orange,width:94,lineHeight:.98}},
    'faith-madmax-editorial':{title:{size:67,color:COLORS.cream,width:92,lineHeight:.91},subtitle:{size:38,weight:400,color:COLORS.orange,width:94,lineHeight:.98}},
    'faith-madmax-landscape':{title:{size:65,color:COLORS.cream,width:92,lineHeight:.92},subtitle:{size:38,weight:400,color:COLORS.orange,width:94,lineHeight:.98}},
    'faith-madmax-final':{title:{size:57,color:COLORS.orange,width:90,lineHeight:.94},subtitle:{size:48,weight:400,color:COLORS.blue,width:92,lineHeight:1.0}}
  };
  return map[design] || map['classic-cover'];
}

function defaultCopyForDesign(design){
  const map={
    'faith-dune-cover':['TRA I MIGLIORI FILM DI FANTASCIENZA DI SEMPRE','IL CINEMA CHE DIVENTA MITO'],
    'faith-dune-quote':['UN FILM CHE CONTINUA A FAR DISCUTERE','Una dichiarazione, un punto di vista e il contesto essenziale della storia.'],
    'faith-dune-image-top':['UN DETTAGLIO CHE CAMBIA TUTTO','Il commento resta breve, leggibile e accompagnato da un fotogramma forte.'],
    'faith-dune-final':['SIETE DELLO STESSO PARERE?','SCRIVETECELO NEI COMMENTI'],
    'faith-returns-cover':['RITORNI IN SALA','I FILM DA NON PERDERE QUESTO MESE'],
    'faith-returns-bubble':['PERCHÉ ANDARE AL CINEMA?','Il buio in sala, lo schermo enorme e una storia che merita di essere vissuta insieme.'],
    'faith-returns-split':['IL FILM DEL MESE','Una scheda rapida con data, trama e motivo per cui vale la pena vederlo.'],
    'faith-returns-final':['E TU COSA VAI A VEDERE?','SCRIVICELO NEI COMMENTI'],
    'faith-disclosure-cover':['DISCLOSURE DAY','DI COSA PARLA IL NUOVO FILM?'],
    'faith-disclosure-editorial':['SE SCOPRISSI CHE NON SIAMO SOLI?','Un testo editoriale chiaro, immerso nel fotogramma e leggibile anche da smartphone.'],
    'faith-disclosure-final':['ANDRAI A VEDERLO?','AL CINEMA DAL 10 GIUGNO'],
    'faith-ghibli-cover':['UN CAPOLAVORO DELLO STUDIO GHIBLI','TORNA AL CINEMA'],
    'faith-ghibli-story':['DOPO LA GRANDE GUERRA, L’EX ASSO DELL’AVIAZIONE ITALIANA VIVE COME CACCIATORE DI TAGLIE','L’AMBIGUITÀ È IL SUO FASCINO'],
    'faith-ghibli-character':['IN SEGUITO A UN MISTERIOSO INCIDENTE, ASSUME UN ASPETTO ANTROPOMORFO','IL NOME DI BATTAGLIA: PORCO ROSSO'],
    'faith-ghibli-final':['SÌ, MA QUANDO ESCE?','AL CINEMA SOLO IL 25 APRILE'],
    'faith-knight-cover':['AL TEMPO DEGLI ULTIMI...','CI ASPETTA ABBASTANZA SBAGLIATI SERIE'],
    'faith-knight-story':['AL TEMPO DI RE, INTRIGHI E DRAGHI...','LE STORIE DI WESTEROS SONO QUASI SEMPRE STATE FOCALIZZATE SULLA LOTTA AL POTERE'],
    'faith-knight-verdict':['A KNIGHT OF THE SEVEN KINGDOMS FA QUALCOSA DI DIVERSO','GUARDA WESTEROS DAL BASSO: UN CAVALIERE ERRANTE, UNO SCUDIERO'],
    'faith-knight-final':['UNA SCELTA DI REGIA GENIALE O SOLO UN ESPEDIENTE STILISTICO?','VOI COME L’AVETE VISSUTA?'],
    'faith-cinema-cover':['IL CINEMA È MORTO?','FORSE È SOLO IL PUBBLICO CHE È TROPPO PIGRO'],
    'faith-cinema-argument':['I FILM BRUTTI HANNO SUCCESSO PERCHÉ LI ANDIAMO A VEDERE','LA QUALITÀ NON È L’UNICA COSA CHE PREMIAMO'],
    'faith-cinema-contrast':['IL PROBLEMA NON È NETFLIX, È L’ATTENZIONE DI 8 SECONDI','IL CINEMA CAMBIA PERCHÉ CAMBIAMO NOI'],
    'faith-cinema-final':['SE NON SEI D’ACCORDO, SPIEGACELO NEI COMMENTI','SE SEI D’ACCORDO, CONDIVIDI'],
    'faith-madmax-cover':['MAD MAX POTREBBE ESSERE VENDUTO DOPO L’ULTIMO CAPITOLO','IL FUTURO DELLA SAGA È IN DISCUSSIONE'],
    'faith-madmax-editorial':['GEORGE MILLER STAREBBE CERCANDO FINANZIAMENTI A LOS ANGELES','PER UN ULTIMO FILM DI MAD MAX'],
    'faith-madmax-landscape':['OLTRE AL FILM, SAREBBE IN SVILUPPO ANCHE UNA SERIE TV','AMBIENTATA NELL’UNIVERSO POST-APOCALITTICO'],
    'faith-madmax-final':['QUALE SARÀ IL FUTURO DEL NOSTRO CARO E FOLLE MAX?','SCRIVETECI NEI COMMENTI']
  };return map[design]||['5 FILM CHE MERITAVANO MOLTO DI PIÙ','Una selezione firmata Critici da Bar'];
}
function createSlide(family='c',variant='copertina'){
  const defs = defaultsFor(family,variant);
  const design = FAMILIES[family]?.variants?.[variant]?.design || 'classic-cover';
  const copy=defaultCopyForDesign(design);
  const slide={
    id:uid(),family,variant,approved:false,kicker:'',dateText:'',bubbleText:'',imageQuery:'',imageSource:'',palette:paletteDefaults(),
    image:imageElementDefaults(),logo:{...transformDefaults()},number:{...transformDefaults()},freeTexts:[],overlays:[],templateShapeMode:EDITABLE_TEMPLATE_DESIGNS.has(design)?'separated':'legacy',templateShapes:templateShapeDefaults(design),layerOrder:[],layerState:{},layerSchemaVersion:LAYER_SCHEMA_VERSION,
    title:textDefaults({text:copy[0],...defs.title}),
    subtitle:textDefaults({text:copy[1],...defs.subtitle})
  };
  if(design==='faith-disclosure-cover')slide.kicker='SPIELBERG È TORNATO';
  if(design==='faith-disclosure-editorial')slide.kicker='SE SCOPRISSI CHE NON SIAMO SOLI?';
  if(design==='faith-returns-split')slide.dateText='4–6 MAGGIO';
  return ensureLayerModel(slide);
}

function newProject(){
  const a=createSlide('c','copertina');
  const b=createSlide('c','corpo'); b.title.text='UN FILM CHE NON HA AVUTO IL SUCCESSO CHE MERITAVA'; b.subtitle.text='Qui puoi inserire il testo della slide.';
  const c=createSlide('c','domanda'); c.title.text='E VOI CHE NE PENSATE?'; c.subtitle.text='Diteci la vostra nei commenti';
  return {version:'0.22.0',name:'Nuovo carosello',showNumbers:false,snapGuides:true,slides:[a,b,c]};
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
    return {version:'0.22.0',name:parsed.slides[0]?.postTitle||'Progetto importato',showNumbers:Boolean(parsed.client.globalNum),snapGuides:true,slides};
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
    saved.version='0.22.0';saved.slides=(saved.slides||[]).map(normalizeSlide);
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
function quickSlideReady(slide){
  const hasTitle=Boolean(String(slide?.title?.text||'').trim());
  const hasImage=Boolean(slide?.image?.src),needsImage=slideNeedsImage(slide);
  return {hasTitle,hasImage,needsImage,ready:hasTitle&&(!needsImage||hasImage)};
}

const DRAFT_ROLE_SUFFIX={cover:'official poster movie',context:'movie still context',fact:'official scene detail',detail:'behind the scenes practical effects',quote:'interview portrait',impact:'cinematic landscape consequence',critique:'film set editorial',conclusion:'cinema audience',final:'movie theater audience'};
function slideEditorialRole(slide,index,total){
  const raw=String(slide?.editorialRole||'').toLowerCase();
  if(index===0||raw.includes('cover'))return 'cover';
  if(index===total-1||/(end|final|cta)/.test(raw))return 'final';
  return EDITORIAL_ROLE_LABELS[raw]?raw:(raw==='content'?'detail':raw||'detail');
}
function draftTextBudget(role,key){
  if(role==='cover')return key==='title'?92:190;
  if(role==='final')return key==='title'?82:250;
  if(role==='quote')return key==='title'?112:290;
  if(role==='critique')return key==='title'?72:410;
  return key==='title'?76:440;
}
function draftTextHeightBudget(slide,key){
  const d=designOf(slide),role=slideEditorialRole(slide,project?.slides?.indexOf(slide)||0,project?.slides?.length||1);
  if(key==='title'){
    if(role==='cover'||/cover|hero/.test(d))return 380;
    if(role==='final'||/final|question|domanda/.test(d))return 330;
    return 285;
  }
  if(role==='cover'||/cover|hero/.test(d))return 190;
  if(role==='final'||/final|question|domanda/.test(d))return 270;
  return 460;
}
function autoFitTextModel(slide,key){
  const style=elementData(slide,key),layout=layoutForElement(slide,key);if(!style||!layout||!String(style.text||'').trim())return;
  const maxHeight=draftTextHeightBudget(slide,key);let size=Number(style.size||60),guard=0;
  while(size>18&&guard++<90){const probe={...style,size},lines=wrapLines(probe.text,probe,layout.maxWidth||probe.maxWidth||820),height=Math.max(size,((lines.length-1)*size*(probe.lineHeight||1))+size*1.08);if(height<=maxHeight)break;size-=2;}
  style.size=size;
}
function contentVariantsForFamily(family){
  const variants=Object.keys(FAMILIES[family]?.variants||{}),cover=DEFAULT_VARIANT[family],final=finalVariantFor(family);
  return variants.filter(v=>v!==cover&&v!==final);
}
function alternateDraftVariant(slide,index,slides){
  if(slide.templateLocked)return slide.variant;
  const role=slideEditorialRole(slide,index,slides.length);
  if(role==='cover')return DEFAULT_VARIANT[slide.family];
  if(role==='final')return finalVariantFor(slide.family);
  const candidates=contentVariantsForFamily(slide.family);if(!candidates.length)return slide.variant;
  let suggested=variantForEditorialRole(slide.family,role,`${slide.title?.text||''} ${slide.subtitle?.text||''}`,index,slides.length);
  if(!candidates.includes(suggested))suggested=candidates[0];
  const previous=slides[index-1]?.variant;
  if(previous===suggested&&candidates.length>1){const start=Math.max(0,candidates.indexOf(suggested));suggested=candidates[(start+1)%candidates.length];}
  return suggested;
}
function normalizeDraftText(slide,index,total,{rewrite=false}={}){
  const role=slideEditorialRole(slide,index,total),source=String(slide.editorialOriginal||slide.editorialSourceText||`${slide.title?.text||''}. ${slide.subtitle?.text||''}`).trim();
  if(rewrite&&source.length>35&&!['cover','final'].includes(role)){
    const tone=project?.editorial?.tone||'critical',density=project?.editorial?.density||'medium';
    slide.title.text=rewriteHeadline(source,role,tone,project?.name||'',true);
    slide.subtitle.text=rewriteBody(source,'synthetic',tone,density,role,true);
  }
  slide.title.text=trimAtBoundary(String(slide.title?.text||'').replace(/\s+/g,' ').trim(),draftTextBudget(role,'title')).toUpperCase();
  slide.subtitle.text=trimAtBoundary(String(slide.subtitle?.text||'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim(),draftTextBudget(role,'subtitle'));
  autoFitTextModel(slide,'title');autoFitTextModel(slide,'subtitle');
}
function uniqueDraftQueries(slides){
  const used=new Map();
  slides.forEach((slide,index)=>{
    const role=slideEditorialRole(slide,index,slides.length),base=String(slide.imageQueryBase||slide.imageQuery||buildSlideImageQuery(slide,index)).replace(/\s+/g,' ').trim(),key=base.toLowerCase();
    slide.imageQueryBase=base;const seen=used.get(key)||0;used.set(key,seen+1);
    slide.imageQuery=[base,DRAFT_ROLE_SUFFIX[role]||DRAFT_ROLE_SUFFIX.detail,seen?`variation ${seen+1}`:''].filter(Boolean).join(' ').replace(/\s+/g,' ').trim().slice(0,190);
  });
}
function dedupeDraftText(slides){
  const fallback={context:'ECCO DA DOVE PARTIAMO',fact:'IL DATO CHE CAMBIA TUTTO',detail:'IL DETTAGLIO CHE CONTA',quote:'PAROLE CHE PESANO',impact:'E QUESTO CAMBIA LE COSE',critique:'IL VERO PUNTO È UN ALTRO',conclusion:'COSA SIGNIFICA DAVVERO?'};
  slides.forEach((slide,index)=>{
    if(index===0||index===slides.length-1)return;const previous=slides[index-1],role=slideEditorialRole(slide,index,slides.length),source=String(slide.editorialOriginal||'').trim();
    if(jaccardText(slide.title?.text||'',previous?.title?.text||'')>.62){let candidate=source?rewriteHeadline(source,role,project?.editorial?.tone||'critical',project?.name||'',true):'';if(!candidate||jaccardText(candidate,previous?.title?.text||'')>.58)candidate=fallback[role]||`PUNTO ${index+1}`;slide.title.text=candidate.toUpperCase();}
    if(jaccardText(slide.subtitle?.text||'',previous?.subtitle?.text||'')>.68&&source){const clean=splitEditorialSentences(source).filter(sentence=>jaccardText(sentence,previous?.subtitle?.text||'')<.56);if(clean.length)slide.subtitle.text=trimAtBoundary(clean.slice(0,3).join(' '),draftTextBudget(role,'subtitle'));}
    autoFitTextModel(slide,'title');autoFitTextModel(slide,'subtitle');
  });
}
function draftSlideAssessment(slide,index,slides=project.slides){
  const role=slideEditorialRole(slide,index,slides.length),issues=[];let score=100;
  const title=String(slide.title?.text||'').trim(),body=String(slide.subtitle?.text||'').trim();
  if(!title){issues.push('titolo mancante');score-=45;}else if(title.length>draftTextBudget(role,'title')){issues.push('titolo lungo');score-=12;}
  if(body.length>draftTextBudget(role,'subtitle')){issues.push('testo lungo');score-=12;}
  if(index>0&&jaccardText(title,slides[index-1]?.title?.text||'')>.62){issues.push('titolo simile alla slide precedente');score-=14;}
  if(index>1&&jaccardText(body,slides[index-1]?.subtitle?.text||'')>.68){issues.push('contenuto ripetuto');score-=16;}
  if(slideNeedsImage(slide)&&!slide.image?.src){issues.push('immagine da scegliere');score-=18;}
  if(index>0&&slide.variant===slides[index-1]?.variant&&!['cover','final'].includes(role)){issues.push('layout ripetuto');score-=7;}
  if(!String(slide.imageQuery||'').trim()&&slideNeedsImage(slide)){issues.push('query immagine mancante');score-=8;}
  return{score:clamp(Math.round(score),0,100),issues,role};
}
function draftProjectAssessment(){
  const slides=project?.slides||[],items=slides.map((slide,index)=>draftSlideAssessment(slide,index,slides));
  const score=items.length?Math.round(items.reduce((sum,item)=>sum+item.score,0)/items.length):0;
  const issues=items.flatMap((item,index)=>item.issues.map(message=>({slideIndex:index,message})));
  return{score,items,issues};
}
function optimizeGeneratedProject({rewrite=false,commit=true,renderNow=true,toast=true}={}){
  if(!project?.slides?.length)return null;
  const slides=project.slides;
  slides.forEach((slide,index)=>{
    slide.editorialRole=slideEditorialRole(slide,index,slides.length);
    normalizeDraftText(slide,index,slides.length,{rewrite});
    const target=alternateDraftVariant(slide,index,slides);
    if(target&&target!==slide.variant){const old=slide,fresh=createSlide(old.family,target);fresh.id=old.id;fresh.title={...fresh.title,...old.title};fresh.subtitle={...fresh.subtitle,...old.subtitle};fresh.image=old.image;fresh.imageQuery=old.imageQuery;fresh.imageQueryBase=old.imageQueryBase;fresh.imageSource=old.imageSource||'';fresh.kicker=old.kicker||'';fresh.dateText=old.dateText||'';fresh.bubbleText=old.bubbleText||'';fresh.logo=old.logo;fresh.number=old.number;fresh.palette=old.palette;fresh.freeTexts=old.freeTexts||[];fresh.overlays=old.overlays||[];fresh.editorialRole=old.editorialRole;fresh.editorialSource=old.editorialSource;fresh.editorialOriginal=old.editorialOriginal;fresh.templateLocked=old.templateLocked;fresh.approved=false;slides[index]=fresh;autoFitTextModel(fresh,'title');autoFitTextModel(fresh,'subtitle');}
    else slide.approved=false;
  });
  dedupeDraftText(slides);uniqueDraftQueries(slides);project.automation={...(project.automation||{}),optimizedAt:new Date().toISOString(),optimizerVersion:'0.22'};
  const report=draftProjectAssessment();if(commit)commitHistory();if(renderNow)render();if(toast)showToast(`Bozza ottimizzata · qualità ${report.score}/100`);return report;
}
function improveCurrentSlideText(){
  const slide=currentSlide(),source=String(slide.editorialOriginal||`${slide.title?.text||''}. ${slide.subtitle?.text||''}`).trim();if(source.length<20){showToast('Non c’è abbastanza testo da migliorare');return;}
  const role=slideEditorialRole(slide,currentIndex,project.slides.length),tone=project?.editorial?.tone||'critical',density=project?.editorial?.density||'medium';
  slide.title.text=rewriteHeadline(source,role,tone,project.name,true);slide.subtitle.text=rewriteBody(source,'synthetic',tone,density,role,true);slide.approved=false;normalizeDraftText(slide,currentIndex,project.slides.length);slide.imageQueryBase=buildSlideImageQuery(slide,currentIndex);slide.imageQuery=slide.imageQueryBase;commitHistory();render();showToast('Testo reso più adatto al carosello');
}
function changeCurrentSlideLayout(){
  const slide=currentSlide(),candidates=contentVariantsForFamily(slide.family);if(!candidates.length){showToast('Nessun layout alternativo');return;}
  const role=slideEditorialRole(slide,currentIndex,project.slides.length);if(role==='cover'||role==='final'){showToast('Per cover e finale usa il selettore layout');return;}
  const start=Math.max(0,candidates.indexOf(slide.variant)),target=candidates[(start+1)%candidates.length];applyTemplate(slide.family,target);currentSlide().approved=false;autoFitTextModel(currentSlide(),'title');autoFitTextModel(currentSlide(),'subtitle');commitHistory();render();showToast(`Layout: ${FAMILIES[slide.family].variants[target].label}`);
}
function renderQuickPanel(){
  if(!$('quickTitleInput')||!project?.slides?.length)return;
  const slide=currentSlide(),status=quickSlideReady(slide),readyCount=project.slides.filter(s=>quickSlideReady(s).ready).length,approvedCount=project.slides.filter(s=>s.approved).length,total=project.slides.length;
  if(document.activeElement!==$('quickTitleInput'))$('quickTitleInput').value=slide.title?.text||'';
  if(document.activeElement!==$('quickSubtitleInput'))$('quickSubtitleInput').value=slide.subtitle?.text||'';
  if(document.activeElement!==$('quickImageQueryInput'))$('quickImageQueryInput').value=ensureSlideImageQuery(slide,currentIndex)||'';
  $('quickProjectName').textContent=project.name||'Nuovo carosello';
  $('quickSlideHeading').textContent=`Slide ${currentIndex+1} di ${total}`;
  $('quickProgressBar').style.width=`${total?Math.round(approvedCount/total*100):0}%`;
  $('quickProgressText').textContent=`${approvedCount} approvate · ${readyCount} complete su ${total}`;
  const draft=draftProjectAssessment(),draftBadge=$('draftScoreBadge'),draftCopy=$('draftScoreText'),currentDraft=draft.items[currentIndex];
  if(draftBadge){draftBadge.textContent=`${draft.score}/100`;draftBadge.className=`draft-score ${draft.score>=85?'good':draft.score>=68?'medium':'weak'}`;}
  if(draftCopy)draftCopy.textContent=draft.issues.length?`${draft.issues.length} aspetti da rifinire · prima priorità: slide ${draft.issues[0].slideIndex+1}, ${draft.issues[0].message}`:'Bozza coerente: puoi passare alla revisione finale.';
  const slideState=$('quickSlideState');
  slideState.textContent=slide.approved?'Approvata':status.ready?'Da approvare':status.hasTitle?'Manca immagine':'Manca titolo';
  slideState.className=`quick-state ${slide.approved?'ok':status.ready?'warning':status.hasTitle?'warning':''}`;
  $('quickImageState').textContent=status.hasImage?'Immagine inserita':status.needsImage?'Nessuna immagine':'Immagine facoltativa';
  const imageBadge=$('quickImageBadge');imageBadge.textContent=status.hasImage?'OK':status.needsImage?'Manca':'Facoltativa';imageBadge.className=`quick-state ${status.hasImage||!status.needsImage?'ok':''}`;
  const family=$('quickFamilySelect'),variant=$('quickVariantSelect');
  family.innerHTML=Object.entries(FAMILIES).map(([id,item])=>`<option value="${id}">${item.label}</option>`).join('');family.value=slide.family;
  const fam=FAMILIES[slide.family]||FAMILIES.c;variant.innerHTML=Object.entries(fam.variants).map(([id,item])=>`<option value="${id}">${item.label}</option>`).join('');variant.value=slide.variant;
  $('quickDeleteSlideBtn').disabled=project.slides.length===1;
  if($('approveSlideBtn')){$('approveSlideBtn').textContent=slide.approved?'Riapri slide':'Approva slide';$('approveSlideBtn').classList.toggle('approved',Boolean(slide.approved));$('approveSlideBtn').disabled=!slide.approved&&!status.ready;}
  if($('reviewCommandTitle'))$('reviewCommandTitle').textContent=slide.approved?'Slide approvata':status.ready?'Bozza pronta da approvare':'Completa ciò che manca';
  if($('reviewCommandText'))$('reviewCommandText').textContent=slide.approved?'Passa alla successiva oppure riaprila per modificarla.':status.ready?(currentDraft?.issues?.length?`Da rifinire: ${currentDraft.issues.join(' · ')}.`:'La slide è coerente: approvala e passa avanti.'):'Inserisci titolo e immagine, oppure rigenera la slide.';
}

function renderCanvasOnly(){
  const svg=buildSvg(currentSlide(),{suffix:'main'});
  canvas.innerHTML=svg.replace(/^<svg[^>]*>|<\/svg>$/g,'');
  drawSelection();
}
function render(){
  renderCanvasOnly();renderFilmstrip();syncControls();renderQuickPanel();syncCropControls();renderVariantControls();renderTemplateShapeEditor();renderImageLibrary();renderPersonalTemplates();renderFreeTextList();renderOverlayList();renderLayers();renderQualityPanel();updateQuickSelectionUI();updateUiMode();
  $('slideCounter').textContent=`${currentIndex+1} / ${project.slides.length}`;
  $('prevSlideBtn').disabled=currentIndex===0;$('nextSlideBtn').disabled=currentIndex===project.slides.length-1;
  $('deleteSlideBtn').disabled=project.slides.length===1;$('moveLeftBtn').disabled=currentIndex===0;$('moveRightBtn').disabled=currentIndex===project.slides.length-1;updateUndoRedo();
}
function renderFilmstrip(){
  const strip=$('filmstrip');strip.innerHTML='';
  project.slides.forEach((slide,index)=>{const b=document.createElement('button');b.className=`thumb${index===currentIndex?' active':''}${slide.approved?' approved':''}`;b.type='button';b.innerHTML=`${buildSvg(slide,{suffix:`thumb${index}`})}<span class="thumb-number">${index+1}</span>${slide.approved?'<span class="thumb-approved">✓</span>':''}${qualityBadgeHtml(index)}`;b.addEventListener('click',()=>{currentIndex=index;selected='title';render();});strip.appendChild(b);});
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
  canvas.querySelector('#selectionLayer')?.remove();if(!advancedUi&&!cropMode)return;const b=selectionBounds();if(!b)return;
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
function setTab(name){activeTab=name;document.body.classList.toggle('generator-mode',name==='import');document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));}
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
  ['layerFrontBtn','layerForwardBtn','layerBackwardBtn','layerBackBtn'].forEach(id=>{if($(id))$(id).disabled=!caps.reorder;});if($('duplicateElementBtn'))$('duplicateElementBtn').disabled=!caps.duplicate;if($('deleteSelectedElementBtn')){$('deleteSelectedElementBtn').disabled=!caps.delete;$('deleteSelectedElementBtn').textContent=caps.delete?(selected==='image'?'Rimuovi immagine':isFreeSelected()||isOverlaySelected()||isShapeSelected()?'Elimina elemento selezionato':'Nascondi elemento selezionato'):'Elemento non eliminabile';}updateClipboardButtons();
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

function selectedDisplayLabel(){const model=currentElementModel();return model?.label||'Nessun elemento';}
function updateUiMode(){document.body.classList.toggle('advanced-ui',advancedUi);const dock=$('advancedDock'),btn=$('uiModeBtn');if(dock)dock.hidden=!advancedUi;if(btn){btn.classList.toggle('active',advancedUi);btn.textContent=advancedUi?'Rapida':'Avanzate';btn.title=advancedUi?'Torna alla modalità rapida':'Mostra strumenti avanzati';}}
function quickColorForSelection(){const model=currentElementModel();if(model?.type==='text')return model.data?.color||COLORS.cream;if(model?.type==='shape'){const fill=model.data?.fill||COLORS.orange;return String(fill).startsWith('palette:')?paletteFor(currentSlide())[fill.split(':')[1]]:fill;}return ''}
function applyQuickColor(color){const model=currentElementModel();if(!model?.data)return;if(model.type==='text')model.data.color=color;else if(model.type==='shape')model.data.fill=color;else{showToast('Il colore rapido vale per testi e forme');return;}render();commitHistory();}
function nudgeSelectedSize(direction){const model=currentElementModel(),el=model?.data;if(!model||!el||!model.capabilities.resize)return;if(model.type==='text')el.size=clamp(Number(el.size||48)+direction*4,12,260);else el.scale=clamp(Number(el.scale||1)+direction*.06,.08,8);render();commitHistory();}
function toggleSelectedVisibility(){const model=currentElementModel();if(!model||model.type==='template')return;model.state.visible=!model.state.visible;render();commitHistory();}
function toggleSelectedLock(){const model=currentElementModel();if(!model||model.type==='template')return;model.state.locked=!model.state.locked;render();commitHistory();}
function updateQuickSelectionUI(){const model=currentElementModel(),label=selectedDisplayLabel();['quickSelectedLabel','refineSelectedLabel'].forEach(id=>{if($(id))$(id).textContent=label;});const canDelete=Boolean(model)&&model.type!=='template',canDuplicate=Boolean(model?.capabilities.duplicate);['quickDeleteBtn','quickRefineDeleteBtn'].forEach(id=>{if($(id))$(id).disabled=!canDelete;});['quickDuplicateBtn','quickRefineDuplicateBtn'].forEach(id=>{if($(id))$(id).disabled=!canDuplicate;});if($('quickEditBtn'))$('quickEditBtn').disabled=!model;if($('quickVisibilityBtn'))$('quickVisibilityBtn').textContent=model?.state.visible===false?'Mostra':'Nascondi';if($('quickLockBtn'))$('quickLockBtn').textContent=model?.state.locked?'Sblocca':'Blocca';const wrap=$('quickColorSwatches');if(wrap){const selectedColor=quickColorForSelection();wrap.innerHTML=swatchMarkup(selectedColor);wrap.querySelectorAll('[data-swatch]').forEach(b=>b.addEventListener('click',()=>applyQuickColor(b.dataset.swatch)));wrap.classList.toggle('disabled',!['text','shape'].includes(model?.type));}}

function renderVariantControls(){
  const family=$('familySelect'),variant=$('variantSelect'),s=currentSlide();family.innerHTML=Object.entries(FAMILIES).map(([id,f])=>`<option value="${id}">${f.label}</option>`).join('');family.value=s.family;variant.innerHTML=Object.entries(FAMILIES[s.family].variants).map(([id,v])=>`<option value="${id}">${v.label}</option>`).join('');variant.value=s.variant;
  $('variantCards').innerHTML=Object.entries(FAMILIES[s.family].variants).map(([id,v])=>`<button class="variant-card${id===s.variant?' active':''}" type="button" data-variant="${id}"><strong>${v.label}</strong><span>${v.description}</span></button>`).join('');$('variantCards').querySelectorAll('[data-variant]').forEach(b=>b.addEventListener('click',()=>applyTemplate(s.family,b.dataset.variant)));
}
function applyTemplate(family,variant){
  if(!FAMILIES[family]?.variants?.[variant])return;const old=currentSlide(),fresh=createSlide(family,variant);fresh.id=old.id;fresh.approved=Boolean(old.approved);fresh.image=old.image;fresh.imageQuery=old.imageQuery||buildSlideImageQuery(old,currentIndex);fresh.imageQueryBase=old.imageQueryBase||fresh.imageQuery;fresh.imageSource=old.imageSource||'';fresh.palette=normalizePalette(old.palette);fresh.logo=old.logo;fresh.number=old.number||fresh.number;fresh.title.text=old.title.text;fresh.subtitle.text=old.subtitle.text;fresh.kicker=old.kicker;fresh.dateText=old.dateText;fresh.bubbleText=old.bubbleText;fresh.editorialRole=old.editorialRole;fresh.editorialSource=old.editorialSource;fresh.editorialOriginal=old.editorialOriginal;fresh.templateLocked=old.templateLocked;fresh.freeTexts=deepClone(old.freeTexts||[]);fresh.overlays=deepClone(old.overlays||[]);fresh.layerOrder=[];fresh.layerState={};fresh.layerSchemaVersion=LAYER_SCHEMA_VERSION;ensureLayerModel(fresh);fresh.title.font=normalizeFontName(old.title.font);fresh.subtitle.font=normalizeFontName(old.subtitle.font);if(fresh.title.font==='Anton')fresh.title.weight=400;if(fresh.subtitle.font==='Anton')fresh.subtitle.weight=400;project.slides[currentIndex]=fresh;selected='title';render();commitHistory();
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
function dragSnapTargets(otherBounds=[]){const safe=54,x=[safe,W/2,W-safe],y=[safe,H/2,H-safe];for(const o of otherBounds){x.push(o.left,(o.left+o.right)/2,o.right);y.push(o.top,(o.top+o.bottom)/2,o.bottom);}return{x,y};}
function applyDragPosition(el,g,deltaX,deltaY,{disableSnap=false}={}){
  guideState=[];let dx=deltaX,dy=deltaY;
  if(g.axis==='x')dy=0;if(g.axis==='y')dx=0;
  if(project.snapGuides!==false&&!disableSnap&&g.startBounds){
    const threshold=12,b={x:g.startBounds.x+dx,y:g.startBounds.y+dy,w:g.startBounds.w,h:g.startBounds.h};const xp=[b.x,b.x+b.w/2,b.x+b.w],yp=[b.y,b.y+b.h/2,b.y+b.h];let bestX=null,bestY=null;
    for(const target of g.snapTargets.x)for(const p of xp){const d=target-p;if(Math.abs(d)<=threshold&&(!bestX||Math.abs(d)<Math.abs(bestX.d)))bestX={d,target};}
    for(const target of g.snapTargets.y)for(const p of yp){const d=target-p;if(Math.abs(d)<=threshold&&(!bestY||Math.abs(d)<Math.abs(bestY.d)))bestY={d,target};}
    if(bestX){dx+=bestX.d;guideState.push({axis:'x',value:bestX.target});}if(bestY){dy+=bestY.d;guideState.push({axis:'y',value:bestY.target});}
  }
  el.dx=g.startDx+dx;el.dy=g.startDy+dy;updateDomTransform(selected);syncControls();
}
function cropDragBy(dx,dy){const el=currentElement(),layout=layoutForElement(currentSlide(),selected),crop=selectedCrop();if(!el||!layout||!crop)return;const p=cropPlacement(el,layout);if(p.extraX>0)crop.x=clamp(crop.x+2*dx/p.extraX,-1,1);if(p.extraY>0)crop.y=clamp(crop.y+2*dy/p.extraY,-1,1);renderCanvasOnly();syncCropControls();markDirty();}
canvas.addEventListener('pointerdown',event=>{
  const handle=event.target.dataset.handle||'',hit=event.target.closest?.('[data-element]')?.dataset?.element||'';
  if(!handle&&!hit&&pointers.size===0)return;
  event.preventDefault();canvas.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(!handle&&event.altKey){cycleSelectionAt(event.clientX,event.clientY);return;}
  if(!handle&&hit&&hit!==selected&&(!hit.startsWith('shape:')||templateEditMode))selectElement(hit);
  const model=currentElementModel();if(pointers.size===2){if(model?.capabilities.resize||cropMode)beginPinch();return;}const el=model?.data;if(!model)return;const action=handle;
  const interactionTarget=Boolean(action)||Boolean(hit&&hit===selected);if(!interactionTarget)return;
  if(cropMode&&model.type==='image'&&el?.src&&(action==='crop'||hit===selected)){gesture={type:'crop-drag',pointerId:event.pointerId,last:screenToSvg(event.clientX,event.clientY),moved:false};$('stage')?.classList.add('dragging');return;}
  if(layerLocked(currentSlide(),selected)){showToast('Elemento bloccato');return;}
  if(action==='scale'){beginUniformResize('handle',event.pointerId);gesture.startDistance=Math.max(1,Math.hypot(event.clientX-gesture.center.x,event.clientY-gesture.center.y));gesture.moved=false;$('stage')?.classList.add('dragging');}
  else if(action==='width'&&isTextSelected()){const p=screenToSvg(event.clientX,event.clientY),layout=layoutForElement(currentSlide(),selected);gesture={type:'width',pointerId:event.pointerId,startX:p.x,startWidth:el.maxWidth||layout?.maxWidth||820,moved:false};$('stage')?.classList.add('dragging');}
  else if(action==='move'||hit===selected){const start=screenToSvg(event.clientX,event.clientY),startBounds=selectionBounds();gesture={type:'drag',pointerId:event.pointerId,start,startDx:Number(el.dx||0),startDy:Number(el.dy||0),startBounds,snapTargets:dragSnapTargets(otherElementBounds()),axis:null,moved:false};$('stage')?.classList.add('dragging');}
});
canvas.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;event.preventDefault();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const el=currentElement();if(!gesture||!el)return;
  if(pointers.size>=2){if(!['pinch','crop-pinch'].includes(gesture.type))beginPinch();const pts=[...pointers.values()];const ratio=pointerDistance(pts[0],pts[1])/Math.max(1,gesture.startDistance);gesture.moved=true;if(gesture.type==='crop-pinch'){selectedCrop().zoom=clamp(gesture.startZoom*ratio,1,5);renderCanvasOnly();syncCropControls();}else applyUniformRatio(ratio);return;}
  if(gesture.type==='crop-drag'&&gesture.pointerId===event.pointerId){const now=screenToSvg(event.clientX,event.clientY),dx=now.x-gesture.last.x,dy=now.y-gesture.last.y;if(Math.hypot(dx,dy)>.3)gesture.moved=true;cropDragBy(dx,dy);gesture.last=now;}
  else if(gesture.type==='drag'&&gesture.pointerId===event.pointerId){const now=screenToSvg(event.clientX,event.clientY),dx=now.x-gesture.start.x,dy=now.y-gesture.start.y;if(Math.hypot(dx,dy)>2)gesture.moved=true;if(event.shiftKey){if(!gesture.axis&&Math.hypot(dx,dy)>5)gesture.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';}else gesture.axis=null;applyDragPosition(el,gesture,dx,dy,{disableSnap:event.altKey});}
  else if(gesture.type==='handle'&&gesture.pointerId===event.pointerId){const dist=Math.max(1,Math.hypot(event.clientX-gesture.center.x,event.clientY-gesture.center.y));gesture.moved=true;applyUniformRatio(dist/gesture.startDistance);}
  else if(gesture.type==='width'&&gesture.pointerId===event.pointerId){const now=screenToSvg(event.clientX,event.clientY);gesture.moved=true;el.maxWidth=clamp(Math.round(gesture.startWidth+(now.x-gesture.startX)*2),120,1080);renderCanvasOnly();syncControls();}
});
function endPointer(event){
  if(!pointers.has(event.pointerId))return;const finished=gesture;pointers.delete(event.pointerId);try{canvas.releasePointerCapture?.(event.pointerId);}catch(_){}
  const now=Date.now();if(pointers.size===0&&finished?.type==='drag'&&!finished.moved&&now-lastTap.time<330&&lastTap.key===selected&&isTextSelected())openTextDialog();
  if(pointers.size===0){lastTap={time:now,key:selected};gesture=null;guideState=[];$('stage')?.classList.remove('dragging');if(finished?.moved)commitHistory();renderCanvasOnly();if(finished?.moved)renderFilmstrip();}
  else if(pointers.size===1&&['pinch','crop-pinch'].includes(gesture?.type)){const [id,p]=[...pointers.entries()][0],start=screenToSvg(p.x,p.y),model=currentElementModel(),el=model?.data;if(cropMode)gesture={type:'crop-drag',pointerId:id,last:start,moved:true};else if(el)gesture={type:'drag',pointerId:id,start,startDx:Number(el.dx||0),startDy:Number(el.dy||0),startBounds:selectionBounds(),snapTargets:dragSnapTargets(otherElementBounds()),axis:null,moved:true};else gesture=null;}
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
function nextVisibleElementKey(slide){
  ensureLayerModel(slide);return [...slide.layerOrder].reverse().find(key=>!key.startsWith('template:')&&layerVisible(slide,key)&&elementData(slide,key))||'title';
}
function deleteElementByKey(key,{silent=false}={}){
  const slide=currentSlide();if(!slide||!key){if(!silent)showToast('Seleziona prima un elemento');return false;}
  if(key===TEMPLATE_BACK_KEY||key===TEMPLATE_FRONT_KEY||key===TEMPLATE_AUX_KEY||key.startsWith('template:')){if(!silent)showToast('Il blocco base del template non si elimina');return false;}
  let removed=false,message='Elemento eliminato';
  if(key.startsWith('free:')){const id=key.slice(5),before=(slide.freeTexts||[]).length;slide.freeTexts=(slide.freeTexts||[]).filter(x=>x.id!==id);removed=slide.freeTexts.length<before;message='Testo eliminato';}
  else if(key.startsWith('overlay:')){const id=key.slice(8),before=(slide.overlays||[]).length;slide.overlays=(slide.overlays||[]).filter(x=>x.id!==id);removed=slide.overlays.length<before;message='Foto eliminata';}
  else if(key.startsWith('shape:')){const id=key.slice(6),before=(slide.templateShapes||[]).length;slide.templateShapes=(slide.templateShapes||[]).filter(x=>x.id!==id);slide.templateShapesInitialized=true;removed=slide.templateShapes.length<before;message='Forma eliminata';}
  else if(key==='image'){if(slide.image?.src){slide.image.src='';slide.imageSource='';slide.image.crop=cropDefaults();removed=true;message='Immagine rimossa';}}
  else if(['title','subtitle','logo','number'].includes(key)){const state=layerState(slide,key);state.visible=false;removed=true;message=`${layerLabel(slide,key)} nascosto`; }
  if(!removed){if(!silent)showToast('Questo elemento non può essere eliminato');return false;}
  slide.layerOrder=(slide.layerOrder||[]).filter(k=>k!==key);if(slide.layerState)delete slide.layerState[key];
  ensureLayerModel(slide);selected=nextVisibleElementKey(slide);render();commitHistory();if(!silent)showToast(`${message} · ⌘/Ctrl+Z per annullare`);return true;
}
function deleteSelectedElement(){return deleteElementByKey(selected);}
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
  return `<div class="layer-row${active}${hidden}" data-layer-select="${key}" data-layer-key="${key}" draggable="${canDrag?'true':'false'}"><span class="layer-grip" title="${canDrag?'Trascina per riordinare':'Ordine fisso'}">${canDrag?'⋮⋮':'•'}</span><span class="layer-type">${layerIcon(key)}</span><div class="layer-copy"><strong>${esc(layerLabel(slide,key))}</strong><small>${fixed?'Livello template bloccato':state.locked?'Posizione bloccata':'Modificabile'} · ${opacity}%</small></div><button type="button" data-layer-action="visibility" data-layer-key="${key}" title="Mostra/nascondi">${state.visible===false?'○':'◉'}</button><button type="button" data-layer-action="lock" data-layer-key="${key}" title="Blocca/sblocca posizione">${state.locked?'🔒':'🔓'}</button>${fixed?'':`<button type="button" class="layer-delete" data-layer-action="delete" data-layer-key="${key}" title="Rimuovi elemento">×</button>`}</div>`;
}
function handleLayerAction(action,key){const slide=currentSlide();if(!slide)return;const state=layerState(slide,key);if(action==='visibility'){state.visible=!state.visible;render();commitHistory();return;}if(action==='lock'){if(elementType(key)==='template'){showToast('I livelli del template restano bloccati');return;}state.locked=!state.locked;render();commitHistory();return;}if(action==='delete'){selectElement(key);deleteSelectedElement();}}
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

function clipboardPayloadForSelection(){
  const model=currentElementModel();if(!model||model.type==='template'||!model.data)return null;
  if(model.type==='image'&&!model.data.src)return null;
  return {version:1,key:selected,type:model.type,label:model.label,data:deepClone(model.data),layout:deepClone(model.layout),state:deepClone(model.state),src:selected==='logo'?(logoData||'assets/logo.png'):undefined};
}
function updateClipboardButtons(){
  const copyDisabled=!currentElementModel()||currentElementModel()?.type==='template';
  if($('copyElementBtn'))$('copyElementBtn').disabled=copyDisabled;
  if($('pasteElementBtn'))$('pasteElementBtn').disabled=!elementClipboard;
  if($('deleteLayerElementBtn'))$('deleteLayerElementBtn').disabled=!currentElementModel()?.capabilities.delete;
}
function copySelectedElement({cut=false}={}){
  const payload=clipboardPayloadForSelection();if(!payload){showToast('Seleziona un elemento copiabile');return false;}
  elementClipboard=payload;updateClipboardButtons();showToast(`${payload.label} ${cut?'tagliato':'copiato'}`);if(cut)deleteSelectedElement();return true;
}
async function pasteCopiedElement(){
  const clip=elementClipboard,slide=currentSlide();if(!clip||!slide){showToast('Nessun elemento copiato');return;}
  const offset=28;let newKey='';
  if(clip.type==='text'||clip.type==='number'){
    const source=clip.data,layout=clip.layout||{};const text=clip.key==='number'?String(source.text||currentIndex+1):String(source.text||'TESTO COPIATO');
    const copy=freeTextDefaults({...deepClone(source),id:uid(),text,x:Number(source.x??layout.x??layout.cx??540),y:Number(source.y??layout.y??layout.cy??675),maxWidth:Number(source.maxWidth||layout.maxWidth||820),dx:Number(source.dx||0)+offset,dy:Number(source.dy||0)+offset});
    slide.freeTexts.push(copy);newKey=`free:${copy.id}`;
  }else if(clip.type==='shape'){
    const source=clip.data;const copy=normalizeShape({...deepClone(source),id:uid(),name:`${source.name||'Forma'} copia`,dx:Number(source.dx||0)+offset,dy:Number(source.dy||0)+offset});
    slide.templateShapes.push(copy);newKey=`shape:${copy.id}`;templateEditMode=true;
  }else if(clip.type==='image'||clip.type==='logo'){
    const source=clip.data,layout=clip.layout||{};const src=clip.type==='logo'?clip.src:source.src;if(!src){showToast('L’immagine copiata non è più disponibile');return;}
    const copy=normalizeOverlay({id:uid(),src,name:`${clip.label||'Immagine'} copia`,x:Number(source.x??layout.cx??540),y:Number(source.y??layout.cy??675),w:Number(source.w??layout.w??430),h:Number(source.h??layout.h??430),dx:Number(source.dx||0)+offset,dy:Number(source.dy||0)+offset,scale:Number(source.scale||1),rotation:Number(source.rotation||0),crop:deepClone(source.crop||cropDefaults())});
    slide.overlays.push(copy);await hydrateImageMeta(copy);newKey=`overlay:${copy.id}`;
  }else {showToast('Questo elemento non può essere incollato');return;}
  ensureLayerModel(slide);const state=layerState(slide,newKey);state.visible=true;state.locked=false;state.opacity=clip.state?.opacity??1;selected=newKey;render();commitHistory();showToast('Elemento incollato');
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

let generatorSource='url';
function setGeneratorSource(source){
  generatorSource=['url','instagram','json','text'].includes(source)?source:'url';
  document.querySelectorAll('[data-generator-source]').forEach(button=>button.classList.toggle('active',button.dataset.generatorSource===generatorSource));
  document.querySelectorAll('[data-generator-panel]').forEach(panel=>{const active=panel.dataset.generatorPanel===generatorSource;panel.hidden=!active;panel.classList.toggle('active',active);});
  const labels={url:'Genera bozza dall’articolo',instagram:'Genera bozza da Instagram',json:'Genera bozza dal JSON',text:'Genera bozza dal testo'};
  if($('generatorRunBtn'))$('generatorRunBtn').textContent=labels[generatorSource];
}
function setGeneratorBusy(busy,message='Analizzo il contenuto…'){
  const button=$('generatorRunBtn'),progress=$('generatorProgress');if(button){button.disabled=busy;button.textContent=busy?'Sto creando la bozza…':({url:'Genera bozza dall’articolo',instagram:'Genera bozza da Instagram',json:'Genera bozza dal JSON',text:'Genera bozza dal testo'}[generatorSource]||'Genera bozza completa');}
  if(progress){progress.hidden=!busy;if($('generatorProgressText'))$('generatorProgressText').textContent=message;}
}
async function runAutomaticGenerator(){
  setGeneratorBusy(true);setImportStatus('Preparo una bozza completa…');
  try{
    if(generatorSource==='json'){
      const parsed=parseContentJsonText($('contentJsonTextarea')?.value||'');
      await activateContentJson(parsed,'json-incollato.json');
    }else if(generatorSource==='url'){
      const url=$('articleUrlInput')?.value.trim();if(!url)throw new Error('Incolla il link dell’articolo');
      setGeneratorBusy(true,'Estraggo e ripulisco l’articolo…');await tryImportUrl(url,'article');
      setGeneratorBusy(true,'Costruisco testi, sequenza e template…');await createCarouselFromText();
    }else if(generatorSource==='instagram'){
      const url=$('instagramUrlInput')?.value.trim();if(!url)throw new Error('Incolla il link Instagram oppure carica gli screenshot');
      setGeneratorBusy(true,'Provo a leggere il post Instagram…');await tryImportUrl(url,'instagram');
      setGeneratorBusy(true,'Adatto il contenuto al carosello…');await createCarouselFromText();
    }else{
      const text=$('importTextInput')?.value.trim();if(!text)throw new Error('Incolla il testo da trasformare');
      setGeneratorBusy(true,'Sintetizzo e organizzo il contenuto…');await createCarouselFromText();
    }
    project.slides.forEach(slide=>slide.approved=false);commitHistory();render();setTab('quick');
    setImportStatus(`Bozza pronta: ${project.slides.length} slide da rivedere.`,'success');showToast('Bozza completa pronta');
  }catch(error){console.error(error);const fallback=generatorSource==='instagram'?'Instagram ha bloccato la lettura. Carica gli screenshot e usa l’OCR.':(error.message||'Generazione non riuscita');setImportStatus(fallback,'error');showToast('Controlla la fonte inserita');}
  finally{setGeneratorBusy(false);}
}
function toggleSlideApproval(){const slide=currentSlide(),status=quickSlideReady(slide);if(!slide.approved&&!status.ready){showToast(status.hasTitle?'Inserisci prima l’immagine':'Completa prima il titolo');return;}slide.approved=!slide.approved;commitHistory();render();if(slide.approved&&currentIndex<project.slides.length-1){setTimeout(()=>{currentIndex++;selected='title';render();},130);}}
function approveAllSlides(){let approved=0;project.slides.forEach(slide=>{if(quickSlideReady(slide).ready){slide.approved=true;approved++;}});commitHistory();render();showToast(`${approved} slide approvate${approved<project.slides.length?' · completa le altre':''}`);}
async function regenerateCurrentSlide(){
  const slide=currentSlide(),family=slide.family,role=String(slide.editorialRole||'content').toLowerCase(),source=String(slide.editorialOriginal||'').trim();
  if(source.length>35&&!/(cover|end|final)/.test(role)){slide.title.text=rewriteHeadline(source,role,project?.editorial?.tone||'critical',project.name,true);slide.subtitle.text=rewriteBody(source,'synthetic',project?.editorial?.tone||'critical',project?.editorial?.density||'medium',role,true);}
  const variants=Object.keys(FAMILIES[family]?.variants||{});let target=slide.variant;
  if(role.includes('cover'))target=DEFAULT_VARIANT[family];
  else if(role.includes('end')||role.includes('final'))target=finalVariantFor(family);
  else{
    const suggested=smartContentVariantFor(family,`${slide.title?.text||''} ${slide.subtitle?.text||''}`,currentIndex,project.slides.length);
    const candidates=variants.filter(v=>v!==DEFAULT_VARIANT[family]&&v!==finalVariantFor(family));
    target=suggested!==slide.variant?suggested:(candidates[(Math.max(0,candidates.indexOf(slide.variant))+1)%Math.max(1,candidates.length)]||slide.variant);
  }
  applyTemplate(family,target);currentSlide().approved=false;normalizeDraftText(currentSlide(),currentIndex,project.slides.length);currentSlide().imageQueryBase=buildSlideImageQuery(currentSlide(),currentIndex);currentSlide().imageQuery=currentSlide().imageQueryBase;render();
  try{await proposeImageForSlide(currentSlide(),currentIndex,{replace:true,showResults:false});render();commitHistory();showToast('Slide rigenerata');}catch(_){commitHistory();showToast('Layout rigenerato; scegli l’immagine');}
}

function setImportStatus(message,kind=''){const el=$('importStatus');if(!el)return;el.textContent=message;el.className=`inline-status${kind?' '+kind:''}`;}
function loadExternalScript(src,globalName){return new Promise((resolve,reject)=>{if(globalName&&window[globalName])return resolve(window[globalName]);const existing=document.querySelector(`script[data-cdb-src="${src}"]`);if(existing){existing.addEventListener('load',()=>resolve(globalName?window[globalName]:true),{once:true});existing.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.dataset.cdbSrc=src;s.onload=()=>resolve(globalName?window[globalName]:true);s.onerror=()=>reject(new Error('Risorsa esterna non disponibile'));document.head.appendChild(s);});}
function cleanImportedText(text){
  const raw=String(text||'').replace(/\r/g,'').replace(/^Title:\s*/im,'').replace(/^URL Source:.*$/gim,'').replace(/^Published Time:.*$/gim,'').replace(/^Markdown Content:\s*/im,'').replace(/!\[[^\]]*\]\([^\)]+\)/g,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').replace(/^#{1,6}\s*/gm,'').replace(/[ \t]+\n/g,'\n');
  const boilerplate=/^(home|menu|cookie|privacy|pubblicità|advertisement|leggi anche|iscriviti|newsletter|seguici su|condividi|copyright|tutti i diritti riservati|accetta|rifiuta|gestisci preferenze|foto:|fonte:)\b/i;
  return raw.split('\n').map(x=>x.trim()).filter(line=>line&&!boilerplate.test(line)&&!/^https?:\/\//i.test(line)).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function findFirstImageUrl(text){const md=String(text||'').match(/!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/i);if(md)return md[1];const raw=String(text||'').match(/https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)]*)?/i);return raw?.[0]||'';}
function titleFromImported(text,fallback='Nuovo carosello'){const lines=cleanImportedText(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);return (lines[0]||fallback).replace(/^[-*]\s*/,'').slice(0,120);}
async function readerFetch(url){const target=`https://r.jina.ai/${url}`;const response=await fetch(target,{headers:{Accept:'text/plain'},cache:'no-store'});if(!response.ok)throw new Error(`Lettore web: HTTP ${response.status}`);return response.text();}
function editorialInputSignature(){return JSON.stringify({text:$('importTextInput')?.value||'',title:$('importTitleInput')?.value||'',family:$('importFamilySelect')?.value||'auto',density:$('importLengthSelect')?.value||'medium',mode:$('editorialModeSelect')?.value||'synthetic',tone:$('editorialToneSelect')?.value||'critical',slides:$('editorialSlideCountSelect')?.value||'auto',quotes:Boolean($('preserveQuotesCheckbox')?.checked)});}
function invalidateEditorialOutline(){if(!pendingEditorialOutline)return;editorialOutlineSignature='';const metrics=$('editorialOutlineMetrics');if(metrics&&!metrics.textContent.includes('da aggiornare'))metrics.textContent=`${metrics.textContent} · da aggiornare`;}
async function tryImportUrl(url,type='article'){
  if(!/^https?:\/\//i.test(url))throw new Error('Inserisci un URL completo');setImportStatus(type==='instagram'?'Provo a leggere il post…':'Estraggo l’articolo…');
  const raw=await readerFetch(url),image=findFirstImageUrl(raw),cleaned=cleanImportedText(raw);$('importTextInput').value=cleaned;$('importTitleInput').value=titleFromImported(cleaned,type==='instagram'?'Post Instagram':'Articolo');pendingImportImage='';
  if(image){$('imageUrlInput').value=image;try{const response=await fetch(image);if(response.ok){pendingImportImage=await prepareImageFile(new File([await response.blob()],'copertina-importata',{type:response.headers.get('content-type')||'image/jpeg'}));await saveImageLibrary(pendingImportImage,'Copertina importata','Articolo');}}catch(_){}}
  setTab('import');
  try{prepareEditorialOutline({silent:true});setImportStatus('Testo estratto e scaletta editoriale pronta. Rivedila oppure crea subito il carosello.','success');}catch(_){setImportStatus('Testo estratto. Rivedilo e prepara la scaletta.','success');}
  return cleaned;
}
function splitEditorialSentences(text){
  const cleaned=cleanImportedText(text).replace(/\n+/g,' '),matches=cleaned.match(/(?:[“"][^”"]+[”"]|[^.!?])+[.!?]+|.+$/g)||[];
  const seen=new Set(),out=[];
  for(let sentence of matches){sentence=sentence.replace(/\s+/g,' ').trim();if(sentence.length<24)continue;const key=sentence.toLowerCase().replace(/[^a-zà-ÿ0-9]+/g,' ').trim();if(seen.has(key))continue;seen.add(key);out.push(sentence);}
  return out;
}
function editorialTokens(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{3,}/g)?.filter(x=>!EDITORIAL_STOP_WORDS.has(x))||[];}
function jaccardText(a,b){const A=new Set(editorialTokens(a)),B=new Set(editorialTokens(b));if(!A.size||!B.size)return 0;let inter=0;for(const x of A)if(B.has(x))inter++;return inter/(A.size+B.size-inter);}
function splitTextChunks(text,mode='medium'){
  const cleaned=cleanImportedText(text);let blocks=cleaned.split(/\n\s*\n/).map(x=>x.trim()).filter(x=>x.length>30);
  if(blocks.length<2){const sentences=splitEditorialSentences(cleaned),max=mode==='short'?260:mode==='long'?520:380;blocks=[];let acc='';for(const s of sentences){if(acc&&`${acc} ${s}`.length>max){blocks.push(acc.trim());acc=s.trim();}else acc=`${acc} ${s}`.trim();}if(acc)blocks.push(acc);}
  const limit=mode==='short'?7:mode==='long'?14:10;return blocks.slice(0,limit);
}
function requestedEditorialTotal(text,raw){if(raw!=='auto'){const n=Number(raw);if(Number.isFinite(n))return clamp(n,5,11);}const length=cleanImportedText(text).length;return length<1100?5:length<2600?7:length<4800?9:11;}
function editorialRoles(count){const patterns={1:['fact'],2:['context','fact'],3:['context','fact','impact'],4:['context','fact','detail','impact'],5:['context','fact','detail','impact','critique'],6:['context','fact','detail','quote','impact','critique'],7:['context','fact','detail','quote','impact','critique','conclusion'],8:['context','fact','detail','detail','quote','impact','critique','conclusion'],9:['context','fact','detail','detail','quote','impact','critique','conclusion','conclusion']};return patterns[count]||patterns[7].slice(0,count);}
function conceptUnits(text){
  let blocks=cleanImportedText(text).split(/\n\s*\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>45);
  const sentences=splitEditorialSentences(text);
  if(blocks.length<3)blocks=sentences.map(x=>x.trim());
  const expanded=[];
  for(const block of blocks){if(block.length<650){expanded.push(block);continue;}const ss=splitEditorialSentences(block);let acc='';for(const s of ss){if(acc&&`${acc} ${s}`.length>460){expanded.push(acc);acc=s;}else acc=`${acc} ${s}`.trim();}if(acc)expanded.push(acc);}
  const dedup=[];for(const unit of expanded){if(!dedup.some(x=>jaccardText(x,unit)>.74))dedup.push(unit);}return dedup;
}
function scoreConcept(unit,index,title){
  const titleTokens=new Set(editorialTokens(title)),tokens=editorialTokens(unit);let score=Math.max(0,2-index*.08)+Math.min(2,unit.length/260);
  score+=tokens.filter(x=>titleTokens.has(x)).length*.8;if(/\d/.test(unit))score+=.5;if(/[“"]/.test(unit))score+=.55;if(/\b(?:annunc|conferm|dichiar|uscir|arriv|data|regist|protagon|success|problema|futuro|cambi|critica|recension)\w*/i.test(unit))score+=.7;
  if(/\b(?:cookie|newsletter|clicca|abbonati|leggi anche)\b/i.test(unit))score-=4;return score;
}
function selectEditorialConcepts(text,title,count){
  const units=conceptUnits(text);if(units.length<=count)return units;
  const ranked=units.map((unit,index)=>({unit,index,score:scoreConcept(unit,index,title)})).sort((a,b)=>b.score-a.score),selected=[];
  selected.push({unit:units[0],index:0,score:99});
  for(const candidate of ranked){if(selected.length>=count)break;if(selected.some(x=>x.index===candidate.index||jaccardText(x.unit,candidate.unit)>.58))continue;selected.push(candidate);}
  if(selected.length<count){for(let i=0;i<units.length&&selected.length<count;i++)if(!selected.some(x=>x.index===i))selected.push({unit:units[i],index:i,score:0});}
  return selected.sort((a,b)=>a.index-b.index).map(x=>x.unit);
}
function extractQuote(text){const m=String(text||'').match(/[“"]([^”"]{18,190})[”"]/);return m?.[1]?.trim()||'';}
function extractSpeaker(text){const m=String(text||'').match(/(?:secondo|ha dichiarato|ha spiegato|ha affermato|ha confermato)\s+([A-ZÀ-Ý][\wÀ-ÿ'’-]+(?:\s+[A-ZÀ-Ý][\wÀ-ÿ'’-]+){0,2})/);return m?.[1]||'';}
function stripAttribution(sentence){return String(sentence||'').replace(/^\s*(?:secondo quanto (?:riportato|dichiarato) da|stando a quanto riportato da|nel corso di un['’]intervista(?: concessa)? a|come spiegato da)\s+[^,]{2,80},?\s*/i,'').replace(/^\s*(?:secondo)\s+[^,]{2,70},\s*/i,'').replace(/^\s*[^,.]{2,70}\s+(?:ha dichiarato|ha spiegato|ha affermato|ha confermato|ha annunciato)\s+che\s+/i,'').trim();}
function cleanEditorialSentence(sentence){return stripAttribution(sentence).replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();}
function stripTrailingWeakWords(text){let out=String(text||'').trim();for(let i=0;i<3;i++)out=out.replace(/\s+\b(?:il|lo|la|i|gli|le|un|uno|una|di|del|dello|della|dei|degli|delle|che|e|ed|ma|per|con|senza|tra|fra)$/i,'').trim();return out;}
function trimAtBoundary(text,max){if(text.length<=max)return stripTrailingWeakWords(text);const cut=text.slice(0,max+1),at=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('; '),cut.lastIndexOf(': '),cut.lastIndexOf(', '),cut.lastIndexOf(' ')),out=cut.slice(0,at>max*.62?at:max).trim();return `${stripTrailingWeakWords(out)}…`;}
function compactCore(text,max=74){
  let s=cleanEditorialSentence(splitEditorialSentences(text)[0]||text).replace(/^(?:ma|però|tuttavia|inoltre|eppure)\s+/i,'').replace(/\s*\([^\)]{1,80}\)\s*/g,' ').trim();
  s=s.replace(/\b(?:in realtà|di fatto|a quanto pare|come sappiamo|vale la pena ricordare che)\b/gi,'').replace(/\s+/g,' ').trim();
  if(s.includes(':')&&s.indexOf(':')>28)s=s.split(':')[0];
  if(s.length>max){const clause=s.split(/\s+(?:ma|però|mentre|perché|poiché|anche se|senza)\s+/i)[0];s=clause.length>28?clause:s;}
  return trimAtBoundary(s,max).replace(/[.!?…]+$/,'');
}
function shortTopic(title){const words=String(title||'').replace(/[:|–—-].*$/,'').split(/\s+/).filter(w=>w.length>2&&!EDITORIAL_STOP_WORDS.has(w.toLowerCase()));return words.slice(0,5).join(' ')||'QUESTA STORIA';}
function removeTitleEcho(text,title){const blocks=cleanImportedText(text).split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);if(blocks.length>1&&(jaccardText(blocks[0],title)>.62||blocks[0].toLowerCase()===String(title||'').toLowerCase()))blocks.shift();return blocks.join('\n\n');}
function rewriteHeadline(source,role,tone,title,preserveQuotes){
  const quote=preserveQuotes?extractQuote(source):'',speaker=extractSpeaker(source),topic=shortTopic(title).toUpperCase(),lastName=value=>String(value||'').trim().split(/\s+/).pop();
  const praiseWork=String(source||'').match(/^([^,.]{2,55})\s+ha elogiato\s+il lavoro di\s+([^,.]{2,55})\s+sulla (?:saga|serie) di\s+([^,.]{2,55})/i);
  const praise=String(source||'').match(/^([^,.]{2,55})\s+ha elogiato\s+(?:il lavoro di\s+)?([^,.]{2,70})/i);
  let core=compactCore(source,74);
  if(praiseWork)core=`${lastName(praiseWork[1])} ELOGIA ${praiseWork[3]} DI ${lastName(praiseWork[2])}`;
  else if(praise)core=`${praise[1]} ELOGIA ${praise[2]}`;
  const strength=core.match(/^la forza (?:del|di questo) (film|progetto|racconto) sta (?:nel|nella) (.+)$/i);if(strength)core=`LA FORZA DEL ${strength[1].toUpperCase()}? ${trimAtBoundary(strength[2],48)}`;
  if(role==='quote'&&quote)return trimAtBoundary(`“${quote}”`,88).toUpperCase();
  if(role==='quote'&&speaker)return `${speaker.toUpperCase()} NON HA DUBBI`;
  let headline=core;
  if(role==='context'&&core.length>78)headline=`${topic}: IL PUNTO DI PARTENZA`;
  if(role==='detail'&&core.length>78)headline='IL DETTAGLIO CHE CONTA';
  if(role==='impact'&&core.length>78)headline='E QUESTO CAMBIA LE COSE';
  if(role==='critique')headline=core.length<=60?`IL PUNTO È: ${core}`:'IL VERO PUNTO È UN ALTRO';
  if(role==='conclusion')headline=core.length<=66?core:'COSA SIGNIFICA DAVVERO?';
  if(tone==='ironic'&&role==='detail'&&core.length>64)headline='SÌ, MA C’È UN DETTAGLIO';
  return trimAtBoundary(headline||'PUNTO CHIAVE',92).toUpperCase();
}
function rewriteBody(source,mode,tone,density,role,preserveQuotes){
  const max={short:245,medium:390,long:590}[density]||390;
  if(mode==='raw')return trimAtBoundary(String(source||'').replace(/\s+/g,' ').trim(),max);
  let sentences=splitEditorialSentences(source),quote=extractQuote(source);
  if(!preserveQuotes&&quote)sentences=sentences.map(s=>s.replace(/[“"][^”"]+[”"]/g,'').trim()).filter(Boolean);
  const wanted=density==='short'?2:density==='long'?4:3,clean=[];
  for(const sentence of sentences){const s=cleanEditorialSentence(sentence);if(s.length<18||clean.some(x=>jaccardText(x,s)>.72))continue;clean.push(s);if(clean.length>=wanted)break;}
  let body=(clean.join(' ')||cleanEditorialSentence(source));
  if(mode==='synthetic'){
    body=body.replace(/\b(?:è importante sottolineare che|bisogna sottolineare che|vale la pena notare che)\b/gi,'').replace(/\s+/g,' ').trim();
    if(tone==='critical'&&(role==='impact'||role==='critique')&&!/^il punto/i.test(body))body=`Il punto è questo: ${body.charAt(0).toLowerCase()}${body.slice(1)}`;
    if(tone==='ironic'&&role==='impact'&&!/non è un dettaglio/i.test(body))body=`${body} E no, non è un dettaglio.`;
  }
  return trimAtBoundary(body,max);
}
function coverSubtitleFor(family,tone){if(family==='fc')return 'UN DIBATTITO DA BAR';if(tone==='critical')return 'IL PUNTO, SENZA GIRI DI PAROLE';if(tone==='ironic')return 'SÌ, DOBBIAMO PARLARNE';return 'LA STORIA IN POCHE SLIDE';}
function contextualCta(family,title,tone){const base=smartCtaForFamily(family),topic=shortTopic(title).toUpperCase();if(tone==='critical')return [`E TU DA CHE PARTE STAI?`,`DICCI LA TUA SU ${trimAtBoundary(topic,34)}`];if(tone==='ironic')return [`OK, ADESSO TOCCA A VOI`,`COMMENTI APERTI. SENZA LANCIO DI BICCHIERI.`];return base;}
function variantForEditorialRole(family,role,text,index,total){if(role==='quote'&&family==='fd')return 'citazione';if(role==='impact'&&family==='fm')return 'panorama';if(role==='critique'&&family==='fc')return 'confronto';return smartContentVariantFor(family,text,index,total);}
function finalVariantFor(family){return FAMILIES[family]?.variants?.finale?'finale':family==='d'?'domanda':'finale';}
function autoFamilyForText(text,title=''){
  const raw=`${title} ${text}`.toLowerCase();const checks=[['fm',['mad max','furiosa','george miller','post-apocalitt','post apocalitt','wasteland']],['fg',['porco rosso','studio ghibli','miyazaki','anime','animazione giapponese']],['fk',['sette regni','seven kingdoms','westeros','cavaliere errante','game of thrones','dunk e egg','dunk and egg']],['fc',['cinema è morto','cinema e morto','netflix','streaming','pubblico pigro','film brutti','attenzione di','sale vuote']],['fs',['disclosure day','extraterrestr','alieni','ufo','non siamo soli','first encounter']],['fr',['ritorni in sala','film del mese','uscite al cinema','questo mese al cinema']],['fd',['dune','villeneuve','fantascienza','saga cinematografica']]];
  for(const [family,words] of checks)if(words.some(word=>raw.includes(word)))return family;if(/\b(recensione|voto|promosso|bocciato|serie tv)\b/.test(raw))return 'fk';if(/\b(cinema|film|regista|attore|attrice)\b/.test(raw))return 'fd';return 'n';
}
function smartContentVariantFor(family,chunk,index,total){const t=String(chunk||'').toLowerCase();if(family==='fg')return /(personaggio|protagonista|incidente|misterioso|nome|pilota)/.test(t)?'personaggio':'storia';if(family==='fk')return /(regia|scelta|voto|giudizio|espediente|riuscit|promoss|bocciat|diverso)/.test(t)?'giudizio':'racconto';if(family==='fc')return /(non è|non e|però|ma |attenzione|netflix|streaming|pubblico)/.test(t)?'confronto':'argomento';if(family==='fm')return /(futuro|serie tv|spin.?off|prequel|universo|post.?apocalitt)/.test(t)?'panorama':'editoriale';if(family==='fd')return /(dichiar|secondo|regista|attore|lodato|citazione)/.test(t)?'citazione':'immagine_alta';if(family==='fr')return /(perché|perche|cinema\?|sala)/.test(t)?'fumetto':'scheda';if(family==='fs')return 'editoriale';return contentVariantFor(family);}
function smartCtaForFamily(family){const map={fg:['SÌ, MA QUANDO ESCE?','AL CINEMA: SALVA LA DATA'],fk:['VOI COME L’AVETE VISSUTA?','SCRIVETECI NEI COMMENTI'],fc:['SE NON SEI D’ACCORDO, SPIEGACELO','SE SEI D’ACCORDO, CONDIVIDI'],fm:['QUALE SARÀ IL FUTURO DI MAD MAX?','SCRIVETECI NEI COMMENTI'],fr:['E TU COSA VAI A VEDERE?','SCRIVICELO NEI COMMENTI'],fs:['ANDRAI A VEDERLO?','DITECELO NEI COMMENTI']};return map[family]||['E VOI CHE NE PENSATE?','Diteci la vostra nei commenti'];}
function chunkHeadlineAndBody(chunk,index){const clean=String(chunk||'').trim(),match=clean.match(/^(.{25,115}?)(?:[.!?](?:\s|$)|\n|$)/),headline=(match?.[1]||`PUNTO ${index+1}`).trim();let body=clean.slice(match?.[0]?.length||0).trim();if(!body||body.length<28)body=clean;return{headline,body};}
function buildEditorialOutline({text,title,family='auto',density='medium',mode='synthetic',tone='critical',slideCount='auto',preserveQuotes=true}={}){
  text=cleanImportedText(text);title=(title||titleFromImported(text)).trim();text=removeTitleEcho(text,title);if(text.length<80)throw new Error('Testo insufficiente per una scaletta editoriale');
  const resolvedFamily=family==='auto'?autoFamilyForText(text,title):family;if(!FAMILIES[resolvedFamily])throw new Error('Famiglia non disponibile');
  const total=requestedEditorialTotal(text,slideCount),contentCount=Math.max(1,total-2),roles=editorialRoles(contentCount);
  let concepts=mode==='synthetic'?selectEditorialConcepts(text,title,contentCount):splitTextChunks(text,density).slice(0,contentCount);
  if(!concepts.length)throw new Error('Non riesco a individuare abbastanza contenuti');while(concepts.length<contentCount&&concepts.length){const longest=concepts.reduce((a,b)=>a.length>=b.length?a:b),sentences=splitEditorialSentences(longest);if(sentences.length<2)break;const idx=concepts.indexOf(longest),mid=Math.ceil(sentences.length/2);concepts.splice(idx,1,sentences.slice(0,mid).join(' '),sentences.slice(mid).join(' '));}
  concepts=concepts.slice(0,contentCount);const items=concepts.map((source,index)=>{const role=roles[index]||'detail';return{id:uid(),role,source,headline:mode==='raw'?chunkHeadlineAndBody(source,index).headline.toUpperCase():rewriteHeadline(source,role,tone,title,preserveQuotes),body:mode==='raw'?chunkHeadlineAndBody(source,index).body:rewriteBody(source,mode,tone,density,role,preserveQuotes),variant:variantForEditorialRole(resolvedFamily,role,source,index,concepts.length)};});
  const cta=contextualCta(resolvedFamily,title,tone);
  return{title,family:resolvedFamily,mode,tone,density,preserveQuotes,totalSlides:items.length+2,sourceChars:text.length,cover:{headline:title.toUpperCase(),body:coverSubtitleFor(resolvedFamily,tone),variant:DEFAULT_VARIANT[resolvedFamily]},items,final:{headline:cta[0],body:cta[1],variant:finalVariantFor(resolvedFamily)}};
}
function outlineVariantOptions(family,current){return Object.entries(FAMILIES[family]?.variants||{}).map(([key,v])=>`<option value="${esc(key)}"${key===current?' selected':''}>${esc(v.label)}</option>`).join('');}
function renderEditorialOutline(){
  const card=$('editorialOutlineCard'),list=$('editorialOutlineList'),o=pendingEditorialOutline;if(!card||!list||!o){if(card)card.hidden=true;return;}card.hidden=false;
  $('editorialOutlineMetrics').textContent=`${o.totalSlides} slide · ${FAMILIES[o.family].label} · ${o.mode==='synthetic'?'Sintetico CdB':o.mode==='faithful'?'Fedele':'Grezzo'} · ${o.sourceChars.toLocaleString('it-IT')} caratteri`;
  const row=(item,kind,index,label,klass='')=>`<article class="editorial-outline-item ${klass}" data-outline-kind="${kind}" data-outline-index="${index}"><div class="editorial-outline-item-head"><span class="editorial-role">${esc(label)}</span>${kind==='item'?`<div class="editorial-outline-order"><button type="button" data-outline-action="up" title="Sposta prima">↑</button><button type="button" data-outline-action="down" title="Sposta dopo">↓</button></div>`:''}</div><div class="editorial-outline-fields"><label class="field"><span>Titolo slide</span><input data-outline-field="headline" value="${esc(item.headline)}"></label><label class="field"><span>Testo</span><textarea data-outline-field="body">${esc(item.body)}</textarea></label><div class="editorial-outline-meta"><label class="field"><span>Template</span><select data-outline-field="variant">${outlineVariantOptions(o.family,item.variant)}</select></label>${kind==='item'?`<label class="field"><span>Funzione</span><select data-outline-field="role">${Object.entries(EDITORIAL_ROLE_LABELS).map(([k,v])=>`<option value="${k}"${item.role===k?' selected':''}>${v}</option>`).join('')}</select></label>`:'<span></span>'}</div></div>${item.source?`<p class="editorial-source-preview" title="Testo originale">Fonte: ${esc(item.source)}</p>`:''}</article>`;
  list.innerHTML=[row(o.cover,'cover',0,'Copertina','cover'),...o.items.map((item,i)=>row(item,'item',i,`${i+2} · ${EDITORIAL_ROLE_LABELS[item.role]||'Contenuto'}`)),row(o.final,'final',0,'Finale / CTA','final')].join('');
}
function syncEditorialOutlineField(target){if(!pendingEditorialOutline)return;const article=target.closest('.editorial-outline-item');if(!article)return;const kind=article.dataset.outlineKind,index=Number(article.dataset.outlineIndex||0),item=kind==='cover'?pendingEditorialOutline.cover:kind==='final'?pendingEditorialOutline.final:pendingEditorialOutline.items[index];if(item&&target.dataset.outlineField)item[target.dataset.outlineField]=target.value;}
function prepareEditorialOutline({silent=false}={}){const options={text:$('importTextInput').value,title:$('importTitleInput').value.trim(),family:$('importFamilySelect').value,density:$('importLengthSelect').value,mode:$('editorialModeSelect').value,tone:$('editorialToneSelect').value,slideCount:$('editorialSlideCountSelect').value,preserveQuotes:$('preserveQuotesCheckbox').checked};pendingEditorialOutline=buildEditorialOutline(options);editorialOutlineSignature=editorialInputSignature();renderEditorialOutline();if(!silent)setImportStatus(`Scaletta pronta: ${pendingEditorialOutline.totalSlides} slide. Puoi modificarla prima di creare il carosello.`,'success');return pendingEditorialOutline;}
async function createCarouselFromOutline(outline){
  if(!outline)throw new Error('Prepara prima una scaletta');const family=outline.family,cover=createSlide(family,outline.cover.variant||DEFAULT_VARIANT[family]);cover.title.text=outline.cover.headline;cover.subtitle.text=outline.cover.body;if(pendingImportImage)cover.image.src=pendingImportImage;const slides=[cover];
  outline.items.forEach((item,i)=>{const variant=FAMILIES[family].variants[item.variant]?item.variant:variantForEditorialRole(family,item.role,item.source,i,outline.items.length),s=createSlide(family,variant);s.title.text=item.headline.toUpperCase();s.subtitle.text=item.body;s.editorialRole=item.role;s.editorialSource='url-text';s.editorialOriginal=item.source;slides.push(s);});
  const end=createSlide(family,FAMILIES[family].variants[outline.final.variant]?outline.final.variant:finalVariantFor(family));end.title.text=outline.final.headline.toUpperCase();end.subtitle.text=outline.final.body;slides.push(end);
  project={version:'0.22.0',name:outline.title||'Nuovo carosello',showNumbers:false,snapGuides:true,editorial:{mode:outline.mode,tone:outline.tone,density:outline.density,createdAt:new Date().toISOString()},slides};slides.forEach((s,i)=>s.imageQuery=buildSlideImageQuery(s,i));await Promise.all(slides.map(s=>hydrateImageMeta(s.image)));currentIndex=0;selected='title';history=[];historyIndex=-1;optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});commitHistory();render();setTab('quick');pendingImportImage='';setImportStatus(`Bozza editoriale creata: ${slides.length} slide con ${FAMILIES[family].label}.`,'success');showToast(`${slides.length} slide · bozza editoriale`);if($('autoImageSuggestionsCheckbox')?.checked)setTimeout(()=>autoSuggestProjectImages({replace:false}),80);
}
async function createCarouselFromText(){let outline=pendingEditorialOutline;if(!outline||editorialOutlineSignature!==editorialInputSignature())outline=prepareEditorialOutline({silent:true});return createCarouselFromOutline(outline);}

const CONTENT_FAMILY_HINTS={
  'dibattito-cinema':'fc','cinema-debate':'fc','fc':'fc',
  'crema-ritagli':'fd','dune':'fd','fd':'fd',
  'ritorni-sala':'fr','fr':'fr',
  'disclosure':'fs','fs':'fs',
  'porco-rosso':'fg','ghibli':'fg','fg':'fg',
  'sette-regni':'fk','cavaliere-sette-regni':'fk','fk':'fk',
  'mad-max':'fm','fm':'fm',
  'nuovo-cdb':'n','n':'n','classico':'c','c':'c','originale':'o','o':'o'
};
function contentTextValue(value){if(typeof value==='string')return value;if(value&&typeof value==='object'&&typeof value.text==='string')return value.text;return '';}
function cleanContentJsonText(value){return contentTextValue(value).replace(/\s*\|\s*/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function contentFamilyFromHint(hint,fallbackText=''){
  const key=String(hint||'').trim().toLowerCase();
  if(CONTENT_FAMILY_HINTS[key]&&FAMILIES[CONTENT_FAMILY_HINTS[key]])return CONTENT_FAMILY_HINTS[key];
  const text=String(fallbackText||'').toLowerCase();
  if(/\b(ai|intelligenza artificiale|tecnologia|major|pubblico|streaming|netflix)\b/.test(text)||text.includes(' vs '))return 'fc';
  return autoFamilyForText(text,'')||'fc';
}
function normalizePastedJsonText(raw){
  let text=String(raw||'').replace(/^\uFEFF/,'').trim();
  const fenced=text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);if(fenced)text=fenced[1].trim();
  if(!text)return '';
  const firstArray=text.indexOf('['),firstObject=text.indexOf('{');
  const starts=[firstArray,firstObject].filter(i=>i>=0);const first=starts.length?Math.min(...starts):-1;
  const last=Math.max(text.lastIndexOf(']'),text.lastIndexOf('}'));
  if(first>0&&last>=first)text=text.slice(first,last+1).trim();
  return text;
}
function parseContentJsonText(raw){
  const text=normalizePastedJsonText(raw);if(!text)throw new Error('Incolla prima il JSON');
  let parsed;try{parsed=JSON.parse(text);}catch(error){const detail=error?.message?`: ${error.message}`:'';throw new Error(`JSON non valido${detail}`);}
  if(!isContentJsonPayload(parsed))throw new Error('Il contenuto non contiene slide riconoscibili');
  return parsed;
}
function setContentJsonStatus(message='',type=''){
  const status=$('contentJsonStatus');if(!status)return;status.textContent=message;status.className=`inline-status${type?` ${type}`:''}`;
}
function validatePastedContentJson({quiet=false}={}){
  const raw=$('contentJsonTextarea')?.value||'';if(!raw.trim()){if(!quiet)setContentJsonStatus('Incolla il JSON oppure carica un file.');return null;}
  try{const parsed=parseContentJsonText(raw),count=contentJsonSlides(parsed).length;setContentJsonStatus(`JSON valido · ${count} slide pronte`,'success');return parsed;}
  catch(error){if(!quiet)setContentJsonStatus(error.message||'JSON non valido','error');return null;}
}
async function importPastedContentJson(){
  try{const parsed=parseContentJsonText($('contentJsonTextarea')?.value||'');await activateContentJson(parsed,'json-incollato.json');}
  catch(error){console.error(error);setContentJsonStatus(`Importazione fallita: ${error.message||'formato non valido'}`,'error');showToast('Controlla il JSON incollato');}
}
function contentJsonSlides(parsed){return Array.isArray(parsed)?parsed:(Array.isArray(parsed?.slides)?parsed.slides:[]);}
function isContentJsonPayload(parsed){
  const slides=contentJsonSlides(parsed);if(!slides.length)return false;
  if(Array.isArray(parsed)||parsed?.importType==='content-json')return true;
  return slides.some(s=>s&&('slideType'in s||'mainText'in s||'subText'in s||'familyHint'in s||'templateHint'in s||'postLabel'in s));
}
function contentVariantFromHints(family,source,index,total){
  const role=String(source?.role||source?.slideType||(index===0?'cover':index===total-1?'end':'content')).toLowerCase();
  const hint=String(source?.templateHint||'').toLowerCase().replace(/[_\s]+/g,'-');
  if(role==='cover'||role==='copertina')return DEFAULT_VARIANT[family];
  if(role==='end'||role==='final'||role==='finale')return finalVariantFor(family);
  const maps={
    fc:{'argomento-ritaglio':'argomento','editorial':'argomento','editoriale':'argomento','argument':'argomento','argomento':'argomento','opinion':'confronto','parere':'confronto','confronto-tesi':'confronto','comparison':'confronto','confronto':'confronto'},
    fd:{'quote':'citazione','citazione':'citazione','editorial':'immagine_alta','editoriale':'immagine_alta','opinion':'citazione','comparison':'immagine_alta'},
    fs:{'editorial':'editoriale','editoriale':'editoriale','opinion':'editoriale','comparison':'editoriale'},
    fr:{'editorial':'scheda','editoriale':'scheda','comparison':'scheda','bubble':'fumetto','fumetto':'fumetto'},
    fg:{'editorial':'storia','editoriale':'storia','story':'storia','character':'personaggio','personaggio':'personaggio'},
    fk:{'editorial':'racconto','editoriale':'racconto','story':'racconto','verdict':'giudizio','opinion':'giudizio','parere':'giudizio'},
    fm:{'editorial':'editoriale','editoriale':'editoriale','landscape':'panorama','scenario':'panorama','future':'panorama'}
  };
  if(maps[family]?.[hint]&&FAMILIES[family].variants[maps[family][hint]])return maps[family][hint];
  const text=`${cleanContentJsonText(source?.mainText||source?.title)} ${cleanContentJsonText(source?.subText||source?.subtitle)}`;
  return smartContentVariantFor(family,text,index,total);
}
function contentJsonProject(parsed,fileName=''){
  const root=Array.isArray(parsed)?{slides:parsed}:parsed;
  const rawSlides=contentJsonSlides(parsed);if(!rawSlides.length)throw new Error('Nessuna slide nel JSON');
  const joined=rawSlides.map(s=>`${cleanContentJsonText(s.mainText||s.title)} ${cleanContentJsonText(s.subText||s.subtitle)}`).join(' ');
  const rootFamily=contentFamilyFromHint(root.preferredFamily||root.familyHint,joined);
  const slides=rawSlides.map((source,index)=>{
    const family=contentFamilyFromHint(source.familyHint||root.preferredFamily||root.familyHint,joined)||rootFamily;
    const variant=contentVariantFromHints(family,source,index,rawSlides.length);
    const slide=createSlide(family,FAMILIES[family]?.variants?.[variant]?variant:DEFAULT_VARIANT[family]);
    const title=cleanContentJsonText(source.mainText||source.title)||`SLIDE ${index+1}`;
    const subtitle=cleanContentJsonText(source.subText||source.subtitle);
    const label=cleanContentJsonText(source.postLabel||source.label||source.kicker);
    slide.title.text=title.toUpperCase();slide.subtitle.text=subtitle;slide.kicker=label;
    slide.imageQuery=String(source.imageQuery||source.image?.query||'').trim();slide.imageQueryBase=slide.imageQuery;
    const imageSrc=source.imageUrl||source.image?.src||'';if(imageSrc)slide.image.src=imageSrc;
    const explicitNumber=source.slideNumber||source.number?.text||'';if(explicitNumber)slide.number.text=String(explicitNumber);
    slide.editorialRole=String(source.role||source.slideType||'content');
    slide.editorialSource='content-json';slide.editorialOriginal=`${title}. ${subtitle}`.trim();slide.templateLocked=Boolean(source.templateHint||source.familyHint);
    if(label&&!['cover','end','final'].includes(String(source.slideType||source.role||'').toLowerCase())&&!['d','fs'].includes(family)){
      slide.freeTexts.push(freeTextDefaults({text:label.toUpperCase(),x:58,y:70,align:'left',maxWidth:570,size:27,color:slide.palette?.accent||COLORS.orange,lineHeight:1}));
    }
    ensureLayerModel(slide);ensureSlideImageQuery(slide,index);return slide;
  });
  const explicitNumbers=rawSlides.some(s=>Boolean(s.slideNumber||s.number?.enabled||s.number?.text));
  const fallbackName=(rawSlides.find(s=>s.postLabel)?.postLabel||cleanContentJsonText(rawSlides[0]?.mainText||rawSlides[0]?.title)||fileName.replace(/\.[^.]+$/,'')||'Carosello importato').slice(0,100);
  return {version:'0.22.0',name:String(root.name||root.title||fallbackName),showNumbers:explicitNumbers,snapGuides:true,contentImport:{format:Array.isArray(parsed)?'array':'content-json',importedAt:new Date().toISOString()},slides};
}
async function activateContentJson(parsed,fileName='contenuto.json'){
  project=contentJsonProject(parsed,fileName);currentIndex=0;selected='title';history=[];historyIndex=-1;optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});commitHistory();render();setTab('quick');
  const msg=`JSON importato: ${project.slides.length} slide · ${FAMILIES[project.slides[0].family]?.label||'template adattato'}`;
  if($('contentJsonStatus')){$('contentJsonStatus').textContent=msg;$('contentJsonStatus').className='inline-status success';}
  setImportStatus(msg,'success');showToast(`${project.slides.length} slide importate`);
  if($('autoImageSuggestionsCheckbox')?.checked)setTimeout(()=>autoSuggestProjectImages({replace:false}),120);
}

async function runOcrFiles(files){if(!files?.length)return;setImportStatus('Carico il motore OCR…');await loadExternalScript('https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js','Tesseract');const worker=await Tesseract.createWorker(['ita','eng'],1,{logger:m=>{if(m.status){const pct=Math.round((m.progress||0)*100);setImportStatus(`OCR: ${m.status} ${pct}%`);}}});const extracted=[];try{for(let i=0;i<files.length;i++){setImportStatus(`OCR immagine ${i+1}/${files.length}…`);const src=await prepareImageFile(files[i]);await saveImageLibrary(src,files[i].name,'OCR');const result=await worker.recognize(files[i]);extracted.push({text:(result.data.text||'').trim(),src,name:files[i].name});}}finally{await worker.terminate();}const combined=extracted.map(x=>x.text).filter(Boolean).join('\n\n');$('importTextInput').value=combined;if(!$('importTitleInput').value)$('importTitleInput').value=titleFromImported(combined,'Import OCR');setImportStatus(`OCR completato su ${files.length} immagini.`,'success');if(extracted.length){const selectedFamily=$('importFamilySelect').value||'auto',family=selectedFamily==='auto'?autoFamilyForText(combined,$('importTitleInput').value):selectedFamily;const slides=extracted.map((item,i)=>{const variant=i===0?DEFAULT_VARIANT[family]:smartContentVariantFor(family,item.text,i,extracted.length),s=createSlide(family,variant);s.image.src=item.src;const lines=item.text.split(/\n+/).map(x=>x.trim()).filter(Boolean);s.title.text=(lines.shift()||`SLIDE ${i+1}`).slice(0,120).toUpperCase();s.subtitle.text=lines.join(' ').slice(0,1200);return s;});project={version:'0.22.0',name:$('importTitleInput').value||'Import OCR',showNumbers:false,snapGuides:true,slides};slides.forEach((s,i)=>s.imageQuery=buildSlideImageQuery(s,i));await Promise.all(slides.map(s=>hydrateImageMeta(s.image)));currentIndex=0;selected='title';history=[];historyIndex=-1;optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});commitHistory();render();setTab('quick');}}
async function exportFaithfulSvg(){const blob=await renderPngBlob(currentSlide());const data=await blobToDataUrl(blob);const svg=`<svg xmlns="${SVG_NS}" width="1080" height="1350" viewBox="0 0 1080 1350"><image href="${data}" width="1080" height="1350"/></svg>`;downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),`${slug(project.name)}-${currentIndex+1}-fedele.svg`);}
async function exportPdf(){if(!window.PDFLib)throw new Error('pdf-lib non disponibile');const pdf=await PDFLib.PDFDocument.create();for(let i=0;i<project.slides.length;i++){$('saveStatus').textContent=`PDF ${i+1}/${project.slides.length}`;const png=await renderPngBlob(project.slides[i]);const bytes=await png.arrayBuffer();const image=await pdf.embedPng(bytes);const page=pdf.addPage([W,H]);page.drawImage(image,{x:0,y:0,width:W,height:H});}const bytes=await pdf.save();downloadBlob(new Blob([bytes],{type:'application/pdf'}),`${slug(project.name)}.pdf`);$('saveStatus').textContent='salvato sul dispositivo';}

function contentVariantFor(family){return family==='n'?'corpo':family==='o'?'corpo':family==='c'?'corpo':family==='d'?'editoriale':family==='fd'?'immagine_alta':family==='fr'?'scheda':family==='fs'?'editoriale':family==='fg'?'storia':family==='fk'?'racconto':family==='fc'?'argomento':family==='fm'?'editoriale':'scheda_dx';}
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
$('duplicateElementBtn')?.addEventListener('click',duplicateSelectedElement);$('copyElementBtn')?.addEventListener('click',()=>copySelectedElement());$('pasteElementBtn')?.addEventListener('click',pasteCopiedElement);$('deleteLayerElementBtn')?.addEventListener('click',deleteSelectedElement);
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
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));document.querySelectorAll('[data-open-advanced]').forEach(b=>b.addEventListener('click',()=>{advancedUi=true;localStorage.setItem('cdb-advanced-ui','1');updateUiMode();setTab(b.dataset.openAdvanced);}));
$('addFreeTextBtn').addEventListener('click',()=>addFreeText());$('addFreeTextQuickBtn').addEventListener('click',()=>addFreeText());$('deleteSelectedElementBtn').addEventListener('click',deleteSelectedElement);
$('uiModeBtn')?.addEventListener('click',()=>{advancedUi=!advancedUi;localStorage.setItem('cdb-advanced-ui',advancedUi?'1':'0');updateUiMode();if(!advancedUi&&['content','images','refine','style','layers','template'].includes(activeTab))setTab('quick');});$('quickDeleteBtn')?.addEventListener('click',deleteSelectedElement);$('quickRefineDeleteBtn')?.addEventListener('click',deleteSelectedElement);$('quickDuplicateBtn')?.addEventListener('click',duplicateSelectedElement);$('quickRefineDuplicateBtn')?.addEventListener('click',duplicateSelectedElement);$('quickEditBtn')?.addEventListener('click',()=>{if(isTextSelected())openTextDialog();else if(isImageSelected())setTab('images');else setTab('refine');});$('quickVisibilityBtn')?.addEventListener('click',toggleSelectedVisibility);$('quickLockBtn')?.addEventListener('click',toggleSelectedLock);$('quickSmallerBtn')?.addEventListener('click',()=>nudgeSelectedSize(-1));$('quickLargerBtn')?.addEventListener('click',()=>nudgeSelectedSize(1));$('quickCenterHBtn')?.addEventListener('click',()=>$('centerHBtn')?.click());$('quickCenterVBtn')?.addEventListener('click',()=>$('centerVBtn')?.click());$('quickFrontBtn')?.addEventListener('click',()=>moveLayer(selected,'front'));$('quickBackBtn')?.addEventListener('click',()=>moveLayer(selected,'back'));
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
$('searchImagesBtn').addEventListener('click',searchImages);$('imageSearchInput').addEventListener('input',e=>{currentSlide().imageQuery=e.target.value;currentSlide().imageQueryBase=e.target.value;currentSlide().approved=false;markDirty();});$('imageSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchImages();}});$('regenerateImageQueryBtn').addEventListener('click',()=>{currentSlide().imageQueryBase=buildSlideImageQuery(currentSlide(),currentIndex);currentSlide().imageQuery=currentSlide().imageQueryBase;$('imageSearchInput').value=currentSlide().imageQuery;searchImages();});$('suggestCurrentImageBtn').addEventListener('click',async()=>{try{setStatus('Cerco la proposta migliore…');const ok=await proposeImageForSlide(currentSlide(),currentIndex,{replace:true,showResults:true});if(ok){render();commitHistory();setStatus('Proposta inserita. Puoi sceglierne un’altra dai risultati.','success');showToast('Immagine proposta inserita');}else setStatus('Nessuna proposta importabile. Prova a modificare la query.','error');}catch(e){console.error(e);setStatus('Ricerca proposta non riuscita.','error');}});$('suggestAllImagesBtn').addEventListener('click',()=>autoSuggestProjectImages({replace:$('replaceSuggestedImagesCheckbox')?.checked}));
$('openGoogleImagesBtn').addEventListener('click',()=>{const q=$('imageSearchInput').value.trim();window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q||'cinema')}`,'_blank','noopener');});
$('importImageUrlBtn').addEventListener('click',importImageUrl);
$('clearLibraryBtn').addEventListener('click',async()=>{if(!imageLibrary.length)return;if(!confirm('Svuotare l’archivio immagini del dispositivo?'))return;imageLibrary=[];await storeClear('images');renderImageLibrary();});
document.querySelectorAll('[data-generator-source]').forEach(button=>button.addEventListener('click',()=>setGeneratorSource(button.dataset.generatorSource)));
$('generatorOptionsToggle')?.addEventListener('click',()=>{const body=$('generatorOptionsBody'),open=body?.hidden;if(body)body.hidden=!open;$('generatorOptionsToggle').textContent=open?'Nascondi opzioni':'Personalizza';});
$('generatorRunBtn')?.addEventListener('click',runAutomaticGenerator);
$('approveSlideBtn')?.addEventListener('click',toggleSlideApproval);
$('approveAllBtn')?.addEventListener('click',approveAllSlides);
$('regenerateSlideBtn')?.addEventListener('click',regenerateCurrentSlide);
$('improveSlideTextBtn')?.addEventListener('click',improveCurrentSlideText);
$('changeSlideLayoutBtn')?.addEventListener('click',changeCurrentSlideLayout);
$('optimizeDraftBtn')?.addEventListener('click',()=>optimizeGeneratedProject({rewrite:false}));
setGeneratorSource('url');
$('extractArticleBtn').addEventListener('click',async()=>{try{await tryImportUrl($('articleUrlInput').value.trim(),'article');}catch(e){console.error(e);setImportStatus(`Estrazione non riuscita: ${e.message}. Incolla manualmente il testo.`,'error');}});
$('extractInstagramBtn').addEventListener('click',async()=>{try{await tryImportUrl($('instagramUrlInput').value.trim(),'instagram');}catch(e){console.error(e);setImportStatus('Instagram ha bloccato la lettura. Usa gli screenshot con OCR o incolla la caption.','error');}});
$('ocrImagesInput').addEventListener('change',async e=>{const files=[...(e.target.files||[])];try{await runOcrFiles(files);}catch(err){console.error(err);setImportStatus(`OCR non riuscito: ${err.message}`,'error');}e.target.value='';});
$('prepareEditorialOutlineBtn').addEventListener('click',()=>{try{prepareEditorialOutline();}catch(e){setImportStatus(e.message,'error');}});
$('regenerateEditorialOutlineBtn').addEventListener('click',()=>{try{prepareEditorialOutline();}catch(e){setImportStatus(e.message,'error');}});
$('createFromTextBtn').addEventListener('click',async()=>{try{await createCarouselFromText();}catch(e){console.error(e);setImportStatus(e.message,'error');}});
$('editorialOutlineList').addEventListener('input',e=>syncEditorialOutlineField(e.target));
$('editorialOutlineList').addEventListener('change',e=>syncEditorialOutlineField(e.target));
$('editorialOutlineList').addEventListener('click',e=>{const b=e.target.closest('[data-outline-action]');if(!b||!pendingEditorialOutline)return;const article=b.closest('.editorial-outline-item'),index=Number(article?.dataset.outlineIndex||0),items=pendingEditorialOutline.items,delta=b.dataset.outlineAction==='up'?-1:1,next=index+delta;if(next<0||next>=items.length)return;[items[index],items[next]]=[items[next],items[index]];renderEditorialOutline();});
['importTextInput','importTitleInput','importFamilySelect','importLengthSelect','editorialModeSelect','editorialToneSelect','editorialSlideCountSelect','preserveQuotesCheckbox'].forEach(id=>$(id).addEventListener('input',invalidateEditorialOutline));



// Modalità rapida: un solo pannello per completare la slide corrente.
$('quickTitleInput')?.addEventListener('input',e=>{currentSlide().title.text=e.target.value;currentSlide().approved=false;renderCanvasOnly();renderQuickPanel();markDirty();});
$('quickSubtitleInput')?.addEventListener('input',e=>{currentSlide().subtitle.text=e.target.value;currentSlide().approved=false;renderCanvasOnly();renderQuickPanel();markDirty();});
['quickTitleInput','quickSubtitleInput'].forEach(id=>$(id)?.addEventListener('change',()=>{commitHistory();renderFilmstrip();renderQuickPanel();}));
$('quickFamilySelect')?.addEventListener('change',e=>{currentSlide().approved=false;applyTemplate(e.target.value,DEFAULT_VARIANT[e.target.value]);currentSlide().templateLocked=true;renderQuickPanel();});
$('quickVariantSelect')?.addEventListener('change',e=>{currentSlide().approved=false;applyTemplate(currentSlide().family,e.target.value);currentSlide().templateLocked=true;renderQuickPanel();});
$('quickImageQueryInput')?.addEventListener('input',e=>{currentSlide().imageQuery=e.target.value;currentSlide().imageQueryBase=e.target.value;currentSlide().approved=false;markDirty();});
$('quickImageQueryInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('quickOpenAlternativesBtn')?.click();}});
$('quickSuggestImageBtn')?.addEventListener('click',()=>{currentSlide().approved=false;$('suggestCurrentImageBtn')?.click();});
$('quickUploadImageBtn')?.addEventListener('click',()=>{currentSlide().approved=false;$('imageInput')?.click();});
$('quickOpenCropBtn')?.addEventListener('click',()=>{selectElement('image');setTab('images');setTimeout(()=>$('toggleCropBtn')?.click(),0);});
$('quickOpenAlternativesBtn')?.addEventListener('click',()=>{if($('imageSearchInput'))$('imageSearchInput').value=currentSlide().imageQuery||'';setTab('images');setTimeout(()=>$('searchImagesBtn')?.click(),0);});
$('quickDuplicateSlideBtn')?.addEventListener('click',()=>$('duplicateSlideBtn')?.click());
$('quickDeleteSlideBtn')?.addEventListener('click',()=>$('deleteSlideBtn')?.click());
$('quickAddSlideBtn')?.addEventListener('click',()=>$('addSlideBtn')?.click());
$('quickAdvancedBtn')?.addEventListener('click',()=>{advancedUi=true;localStorage.setItem('cdb-advanced-ui','1');updateUiMode();setTab('content');});
$('quickSuggestAllBtn')?.addEventListener('click',()=>$('suggestAllImagesBtn')?.click());
$('quickQualityBtn')?.addEventListener('click',()=>$('runQualityBtn')?.click());
$('quickExportBtn')?.addEventListener('click',()=>$('exportAllBtn')?.click());
$('quickGoImportBtn')?.addEventListener('click',()=>setTab('import'));

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
let contentJsonValidationTimer=null;
$('contentJsonTextarea')?.addEventListener('input',()=>{clearTimeout(contentJsonValidationTimer);contentJsonValidationTimer=setTimeout(()=>validatePastedContentJson(),260);});
$('contentJsonTextarea')?.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();importPastedContentJson();}});
$('importPastedJsonBtn')?.addEventListener('click',importPastedContentJson);
$('clearContentJsonBtn')?.addEventListener('click',()=>{if($('contentJsonTextarea'))$('contentJsonTextarea').value='';setContentJsonStatus('Area JSON svuotata.');$('contentJsonTextarea')?.focus();});
$('pasteContentJsonBtn')?.addEventListener('click',async()=>{
  try{
    if(!navigator.clipboard?.readText)throw new Error('Clipboard non disponibile');
    const text=await navigator.clipboard.readText();if(!text.trim())throw new Error('Gli appunti sono vuoti');
    $('contentJsonTextarea').value=text;validatePastedContentJson();showToast('JSON incollato dagli appunti');
  }catch(error){$('contentJsonTextarea')?.focus();setContentJsonStatus('Incolla manualmente nel riquadro: il browser non ha consentito l’accesso agli appunti.','error');}
});
$('contentJsonInput')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{const raw=String(reader.result||'');if($('contentJsonTextarea'))$('contentJsonTextarea').value=raw;const parsed=parseContentJsonText(raw);await activateContentJson(parsed,file.name);}catch(error){console.error(error);setContentJsonStatus(`Importazione fallita: ${error.message||'formato non valido'}`,'error');showToast('JSON contenuto non valido');}};reader.readAsText(file);e.target.value='';});

$('projectInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{const raw=JSON.parse(reader.result);if(isContentJsonPayload(raw)){await activateContentJson(raw,file.name);return;}let parsed=migrateLegacyProject(raw);if(!Array.isArray(parsed.slides)||!parsed.slides.length)throw new Error('Formato non valido');project={...parsed,version:'0.22.0',showNumbers:Boolean(parsed.showNumbers),snapGuides:parsed.snapGuides!==false,slides:parsed.slides.map(normalizeSlide)};project.slides.forEach((s,i)=>ensureSlideImageQuery(s,i));currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();showToast('Progetto aperto');}catch(error){console.error(error);showToast('File progetto non valido');}};reader.readAsText(file);e.target.value='';});

function isTextEditingTarget(target){return Boolean(target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)));}
window.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase(),mod=e.metaKey||e.ctrlKey,editing=isTextEditingTarget(e.target),dialogOpen=Boolean(document.querySelector('dialog[open]'));
  if(mod&&key==='z'&&!editing){e.preventDefault();restoreHistory(historyIndex+(e.shiftKey?1:-1));return;}
  if(((mod&&key==='y')||(mod&&e.shiftKey&&key==='z'))&&!editing){e.preventDefault();restoreHistory(historyIndex+1);return;}
  if(mod&&key==='c'&&!editing){e.preventDefault();copySelectedElement();return;}
  if(mod&&key==='x'&&!editing){e.preventDefault();copySelectedElement({cut:true});return;}
  if(mod&&key==='v'&&!editing){e.preventDefault();pasteCopiedElement();return;}
  if(mod&&key==='d'&&!editing){e.preventDefault();duplicateSelectedElement();return;}
  if((e.key==='Delete'||e.key==='Backspace')&&!editing&&!dialogOpen){e.preventDefault();deleteSelectedElement();return;}
  if(e.key==='Escape'){if(cropMode){setCropMode(false);return;}if($('textDialog').open)$('textDialog').close();}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!editing){const model=currentElementModel(),el=model?.data;if(!model?.capabilities.move||!el)return;e.preventDefault();const step=e.shiftKey?10:1;if(e.key==='ArrowLeft')el.dx-=step;if(e.key==='ArrowRight')el.dx+=step;if(e.key==='ArrowUp')el.dy-=step;if(e.key==='ArrowDown')el.dy+=step;renderCanvasOnly();syncControls();commitHistory();}
});

async function fileToDataUrl (path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error('Asset non disponibile');return blobToDataUrl(await response.blob());}
async function initialize(){
  if(initialized)return;initialized=true;
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js?v=0.22.0').then(r=>r.update()).catch(console.warn);
  try{logoData=await fileToDataUrl('assets/logo.png');}catch(e){console.warn(e);}
  project=await loadState();project.snapGuides=project.snapGuides!==false;templateEditMode=false;advancedUi=false;activeTab='import';tmdbKey=storageGet('cdb-tmdb-key');if($('tmdbApiKeyInput'))$('tmdbApiKeyInput').value=tmdbKey;for(const s of project.slides){hydrateImageMeta(s.image);for(const ov of s.overlays||[])hydrateImageMeta(ov);}currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();setTab(activeTab);document.fonts?.ready.then(()=>render()).catch(()=>{});
}
window.addEventListener('cdb:unlock',initialize);function renderOverlayList(){const el=$('overlayList');if(!el)return;const list=currentSlide()?.overlays||[];if(!list.length){el.innerHTML='<p class="panel-note">Nessuna foto libera nella slide.</p>';return;}el.innerHTML=list.map(ov=>`<div class="free-text-item${selected===`overlay:${ov.id}`?' active':''}"><button type="button" data-overlay-select="${ov.id}">${esc(ov.name||'Foto libera')}</button><button type="button" data-overlay-delete="${ov.id}">×</button></div>`).join('');el.querySelectorAll('[data-overlay-select]').forEach(b=>b.addEventListener('click',()=>selectElement(`overlay:${b.dataset.overlaySelect}`)));el.querySelectorAll('[data-overlay-delete]').forEach(b=>b.addEventListener('click',()=>{selected=`overlay:${b.dataset.overlayDelete}`;deleteSelectedElement();}));}
async function addOverlayFiles(files){for(const file of [...(files||[])]){const src=await prepareImageFile(file);try{await saveImageLibrary(src,file.name,'Caricata');}catch(error){console.warn('Archivio immagini non disponibile',error);}const ov=overlayDefaults({src,name:file.name});await hydrateImageMeta(ov);currentSlide().overlays=currentSlide().overlays||[];currentSlide().overlays.push(ov);ensureLayerModel(currentSlide());selected=`overlay:${ov.id}`;}render();commitHistory();}

