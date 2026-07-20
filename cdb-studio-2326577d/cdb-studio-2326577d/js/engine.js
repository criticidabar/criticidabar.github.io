'use strict';

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
function applyAutomaticCrop(slide){
  if(!slide?.image?.src)return;const intent=slide.imageIntent||'backdrop';let zoom=1,x=0,y=0,mode='cover';
  if(intent==='profile'){zoom=1.08;y=.32;}
  else if(intent==='poster'){zoom=1.02;y=.06;}
  else if(intent==='behind'){zoom=1.04;y=.02;}
  else if(intent==='audience'){zoom=1.05;y=-.08;}
  else if(intent==='logo'){mode='contain';zoom=1;}
  slide.image.crop=normalizeCrop({...slide.image.crop,mode,zoom,x,y});
}

function paletteDefaults(){return{background:COLORS.blue,accent:COLORS.orange,secondary:'#1f27b8',surface:COLORS.cream,ink:COLORS.ink};}
function normalizeHex(value,fallback){const v=String(value||'').trim();return /^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():fallback;}
function normalizePalette(value={}){const d=paletteDefaults();return{background:normalizeHex(value.background,d.background),accent:normalizeHex(value.accent,d.accent),secondary:normalizeHex(value.secondary,d.secondary),surface:normalizeHex(value.surface,d.surface),ink:normalizeHex(value.ink,d.ink)};}
function paletteFor(slide){slide.palette=normalizePalette(slide.palette);return slide.palette;}
function mixHex(a,b,amount=.5){const pa=parseInt(normalizeHex(a,'#000000').slice(1),16),pb=parseInt(normalizeHex(b,'#000000').slice(1),16),t=clamp(Number(amount)||0,0,1);const ar=(pa>>16)&255,ag=(pa>>8)&255,ab=pa&255,br=(pb>>16)&255,bg=(pb>>8)&255,bb=pb&255;return'#'+[Math.round(ar+(br-ar)*t),Math.round(ag+(bg-ag)*t),Math.round(ab+(bb-ab)*t)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function meaningfulImageWords(text,max=6){const clean=String(text||'').replace(/https?:\/\/\S+/g,' ').replace(/[^a-zA-ZÀ-ÿ0-9'’\- ]+/g,' ').split(/\s+/).map(x=>x.trim()).filter(Boolean);const out=[];for(const word of clean){const key=word.toLowerCase().replace(/[’']/g,'');if(key.length<3||IMAGE_STOP_WORDS.has(key)||/^\d+$/.test(key))continue;if(!out.some(x=>x.toLowerCase()===word.toLowerCase()))out.push(word);if(out.length>=max)break;}return out;}
function inferEditorialRoleFromContent(slide,index,total){
  if(index===0)return 'cover';
  if(index===total-1)return 'final';
  const raw=String(slide?.editorialRole||'').toLowerCase().trim();
  if(EDITORIAL_ROLE_LABELS[raw])return raw;
  if(/cover|copertina/.test(raw))return 'cover';
  if(/end|final|cta/.test(raw))return 'final';
  const title=String(slide?.title?.text||'').toLowerCase(),body=String(slide?.subtitle?.text||'').toLowerCase(),text=`${title} ${body}`;
  if(/[“”"]/.test(text)||/ha (detto|dichiarato|spiegato|raccontato)|secondo [a-zà-ÿ]+|parole di|intervista/.test(text))return 'quote';
  if(/il nostro parere|secondo noi|per noi|forse il punto|il vero punto|in realtà|ma il problema|presa in giro|non convince/.test(text))return 'critique';
  if(/\b(\d+[,.]?\d*|milion|miliard|percent|%|box office|incassi|record|debutto|voto)\b/.test(text))return 'fact';
  if(/futuro|conseguenz|cambia tutto|significa|quindi|per questo|da qui|potrebbe|rischia|scenario|major/.test(text))return 'impact';
  if(index===1||/contesto|prima di tutto|partiamo|origine|da dove|cos'è|cosa sappiamo/.test(text))return 'context';
  return 'detail';
}
function imageIntentForSlide(slide,index,total){
  const role=inferEditorialRoleFromContent(slide,index,total),text=`${slide?.title?.text||''} ${slide?.subtitle?.text||''}`.toLowerCase(),design=designOf(slide);
  if(role==='cover'||/cover|hero/.test(design))return 'poster';
  if(role==='quote'||/regista|attore|attrice|intervista|dichiar/.test(text))return 'profile';
  if(/dietro le quinte|set|animatronic|effetti pratici|practical|green screen|costumi|trucco/.test(text))return 'behind';
  if(role==='final'||/pubblico|sala|box office|commenti|spettatori/.test(text))return 'audience';
  if(/logo|titolo ufficiale/.test(text))return 'logo';
  return 'backdrop';
}
function imageQueryCandidatesForSlide(slide,index=project?.slides?.indexOf(slide)||0){
  const total=project?.slides?.length||1,role=inferEditorialRoleFromContent(slide,index,total),intent=imageIntentForSlide(slide,index,total);
  const topic=meaningfulImageWords(project?.name||'',6),specific=meaningfulImageWords(`${slide?.title?.text||''} ${slide?.subtitle?.text||''}`,7);
  const intentTerms={poster:['official poster','movie poster'],backdrop:['movie still','cinematic scene'],profile:['interview portrait','cast portrait'],behind:['behind the scenes','practical effects set'],audience:['movie theater audience','cinema crowd'],logo:['official title logo','transparent logo']}[intent]||['movie still'];
  const roleTerms={cover:['official','key art'],context:['establishing scene'],fact:['official still'],detail:['detail scene'],quote:['interview'],impact:['cinematic landscape'],critique:['editorial film still'],conclusion:['cinema audience'],final:['movie theater']}[role]||[];
  const base=[...topic,...specific].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  const candidates=[
    [base,intentTerms[0],roleTerms[0]].filter(Boolean).join(' '),
    [base,intentTerms[1]||intentTerms[0],roleTerms[1]].filter(Boolean).join(' '),
    [...topic,intent==='profile'?'director cast portrait':intent==='behind'?'film set behind the scenes':'official cinematic still'].filter(Boolean).join(' ')
  ].map(q=>q.replace(/\s+/g,' ').trim().slice(0,190)).filter(Boolean);
  return [...new Set(candidates.map(q=>q.toLowerCase()))].map(lower=>candidates.find(q=>q.toLowerCase()===lower)).slice(0,3);
}
function buildSlideImageQuery(slide,index=project?.slides?.indexOf(slide)||0){
  return imageQueryCandidatesForSlide(slide,index)[0]||`cinema ${index+1}`;
}
function ensureSlideImageQuery(slide,index){
  const candidates=imageQueryCandidatesForSlide(slide,index);
  slide.imageIntent=slide.imageIntent||imageIntentForSlide(slide,index,project?.slides?.length||1);
  slide.imageQueries=Array.isArray(slide.imageQueries)&&slide.imageQueries.length?slide.imageQueries:candidates;
  if(!slide.imageQuery)slide.imageQuery=slide.imageQueries[0]||buildSlideImageQuery(slide,index);
  if(!slide.imageQueryBase)slide.imageQueryBase=slide.imageQuery;
  return slide.imageQuery;
}
function cycleSlideImageQuery(slide,index){
  ensureSlideImageQuery(slide,index);const list=slide.imageQueries||[];if(list.length<2)return slide.imageQuery;
  const current=Math.max(0,list.findIndex(q=>q===slide.imageQuery));slide.imageQuery=list[(current+1)%list.length];slide.imageQueryBase=slide.imageQuery;return slide.imageQuery;
}

function plainMetadata(value=''){const box=document.createElement('div');box.innerHTML=String(value||'');return (box.textContent||box.innerText||'').replace(/\s+/g,' ').trim();}
function normalizedImageUrl(url=''){try{const parsed=new URL(url,location.href);parsed.hash='';parsed.search='';return parsed.href.replace('/t/p/w500/','/t/p/original/');}catch(_){return String(url||'').split(/[?#]/)[0];}}
function resultAssetKey(result={}){return result.assetKey||`remote:${normalizedImageUrl(result.url||result.thumb||'')}`;}
function slideAssetKey(slide={}){return slide.imageAssetKey||((slide.image?.src)?imageAssetKey(slide.image.src):'');}
function usedProjectImageKeys(excludeSlide=null){const set=new Set();for(const slide of project?.slides||[]){if(slide===excludeSlide||!slide.image?.src)continue;const key=slideAssetKey(slide);if(key)set.add(key);}return set;}
function resultRightsInfo(result={}){
  const provider=String(result.provider||'').toLowerCase(),license=String(result.license||'').trim(),low=license.toLowerCase();
  if(provider==='tmdb')return{level:'warning',label:'Diritti da verificare',detail:'Materiale promozionale o editoriale: TMDb non concede automaticamente il diritto di ripubblicazione.'};
  if(provider.includes('wikimedia')){
    if(/public domain|pubblico dominio|cc0/.test(low))return{level:'ok',label:'Uso più semplice',detail:license||'Pubblico dominio / CC0: conserva comunque fonte e autore.'};
    if(/cc by|creative commons attribution/.test(low))return{level:'attribution',label:'Attribuzione richiesta',detail:license||'Creative Commons con attribuzione.'};
    return{level:'review',label:'Licenza da verificare',detail:license||'Controlla la pagina della fonte prima della pubblicazione.'};
  }
  return{level:'review',label:'Fonte da verificare',detail:'Immagine caricata o importata: verifica sempre provenienza e permessi.'};
}
function assignImageMetadata(slide,result={}){
  slide.imageAssetKey=resultAssetKey(result);
  slide.imageSource=result.source||slide.imageSource||'';
  slide.imageProvider=result.provider||slide.imageProvider||'';
  slide.imageLicense=result.license||'';
  slide.imageAttribution=result.attribution||result.artist||'';
  slide.imageSourceTitle=result.title||'';
  slide.imageRights=resultRightsInfo(result).label;
}
function imageResultRelevance(result,slide,query,usedKeys=new Set()){
  const intent=slide?.imageIntent||imageIntentForSlide(slide,Math.max(0,project?.slides?.indexOf(slide)||0),project?.slides?.length||1);
  const title=String(result.title||'').toLowerCase(),words=meaningfulImageWords(query,8).map(x=>x.toLowerCase());
  let score=Number(result.score||0);
  score+=Math.min(2.4,words.filter(w=>title.includes(w)).length*.45);
  if(result.kind===intent)score+=1.25;
  if(intent==='behind'&&/behind|set|practical|effect|animatronic/.test(title))score+=1.1;
  if(intent==='profile'&&/portrait|interview|cast|person/.test(`${title} ${result.kind||''}`))score+=.8;
  if((result.width||0)>=1600)score+=.45;if((result.height||0)>=900)score+=.25;
  if(usedKeys.has(resultAssetKey(result)))score-=100;
  return score;
}
function rankImageResults(results,slide,query,{excludeUsed=false}={}){
  const used=excludeUsed?usedProjectImageKeys(slide):new Set(),seen=new Set();
  return (results||[]).filter(result=>{
    const key=resultAssetKey(result);if(!key||seen.has(key))return false;seen.add(key);return !(excludeUsed&&used.has(key));
  }).map(result=>({...result,assetKey:resultAssetKey(result),usedElsewhere:usedProjectImageKeys(slide).has(resultAssetKey(result)),rankScore:imageResultRelevance(result,slide,query,used)})).sort((a,b)=>b.rankScore-a.rankScore);
}
function imageSourcesReport(){
  const lines=[`CdB Studio — fonti immagini`,`Progetto: ${project.name}`,''];
  project.slides.forEach((slide,index)=>{
    lines.push(`Slide ${index+1}: ${slide.title?.text||'Senza titolo'}`);
    if(!slide.image?.src){lines.push('  Nessuna immagine principale.','');return;}
    lines.push(`  Provider: ${slide.imageProvider||'non registrato'}`);
    lines.push(`  Fonte: ${slide.imageSource||'non registrata'}`);
    lines.push(`  Licenza: ${slide.imageLicense||'da verificare'}`);
    if(slide.imageAttribution)lines.push(`  Attribuzione: ${slide.imageAttribution}`);
    lines.push(`  Stato: ${slide.imageRights||'da verificare'}`,'');
  });
  lines.push('Nota: questo rapporto aiuta a tracciare le fonti, ma non costituisce una verifica legale dei diritti.');
  return lines.join('\n');
}

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
    id:uid(),family,variant,approved:false,kicker:'',dateText:'',bubbleText:'',imageQuery:'',imageSource:'',imageAssetKey:'',imageProvider:'',imageLicense:'',imageAttribution:'',imageSourceTitle:'',imageRights:'',palette:paletteDefaults(),
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
  return {version:'0.33.0',name:'Nuovo carosello',showNumbers:false,snapGuides:true,automationPreset:'auto',editorial:{preset:'auto'},slides:[a,b,c]};
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
    return {version:'0.33.0',name:parsed.slides[0]?.postTitle||'Progetto importato',showNumbers:Boolean(parsed.client.globalNum),snapGuides:true,slides};
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
    saved.version='0.33.0';saved.slides=(saved.slides||[]).map(normalizeSlide);
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
function snapshot(){ const p=deepClone(project);p.slides.forEach(s=>{if(s.image?.src?.startsWith('data:')){const k=imageAssetKey(s.image.src);historyImagePool.set(k,s.image.src);s.image.src=k;}(s.overlays||[]).forEach(ov=>{if(ov.src?.startsWith('data:')){const k=imageAssetKey(ov.src);historyImagePool.set(k,ov.src);ov.src=k;}});if(s.instagramReference?.src?.startsWith('data:')){const k=imageAssetKey(s.instagramReference.src);historyImagePool.set(k,s.instagramReference.src);s.instagramReference.src=k;}});return JSON.stringify(p); }
function fromSnapshot(raw){ const p=JSON.parse(raw);p.slides.forEach(s=>{if(s.image?.src?.startsWith('asset:'))s.image.src=historyImagePool.get(s.image.src)||'';(s.overlays||[]).forEach(ov=>{if(ov.src?.startsWith('asset:'))ov.src=historyImagePool.get(ov.src)||'';});if(s.instagramReference?.src?.startsWith('asset:'))s.instagramReference.src=historyImagePool.get(s.instagramReference.src)||'';});return p; }
function commitHistory(){ const s=snapshot();if(history[historyIndex]===s)return;history=history.slice(0,historyIndex+1);history.push(s);if(history.length>20)history.shift();historyIndex=history.length-1;updateUndoRedo();markDirty(); }
function restoreHistory(index){ if(index<0||index>=history.length)return;historyIndex=index;project=fromSnapshot(history[index]);currentIndex=clamp(currentIndex,0,project.slides.length-1);render();markDirty(); }
function updateUndoRedo(){ $('undoBtn').disabled=historyIndex<=0;$('redoBtn').disabled=historyIndex>=history.length-1; }


