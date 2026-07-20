'use strict';

async function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Il file non è un’immagine valida o il browser non può leggerlo.'));img.src=src;});}
async function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Il browser non riesce a leggere il file immagine.'));r.readAsDataURL(blob);});}
async function prepareImageBlob(blob){
  if(blob?.type&&!blob.type.startsWith('image/'))throw new Error(`Il file ricevuto è ${blob.type}, non un’immagine. Scegli un file JPG, PNG o WebP.`);const source=URL.createObjectURL(blob);try{const img=await loadImage(source);const maxSide=2400,ratio=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*ratio)),h=Math.max(1,Math.round(img.naturalHeight*ratio));const work=document.createElement('canvas');work.width=w;work.height=h;const ctx=work.getContext('2d');ctx.drawImage(img,0,0,w,h);const type=blob.type==='image/png'&&blob.size<1600000?'image/png':'image/jpeg';const out=await new Promise((resolve,reject)=>work.toBlob(b=>b?resolve(b):reject(new Error('Compressione fallita')),type,.9));return blobToDataUrl(out);}finally{URL.revokeObjectURL(source);}
}
async function prepareImageFile(file){return prepareImageBlob(file);}
async function saveImageLibrary(src,name='Immagine',source='caricamento'){
  const item={id:uid(),src,name:String(name||'Immagine').slice(0,100),source,createdAt:Date.now()};imageLibrary.unshift(item);await storePut('images',item.id,item);renderImageLibrary();return item;
}
function useImage(src,{result=null,preserveCrop=true}={}){const s=currentSlide(),hadImage=Boolean(s.image?.src),previousCrop=deepClone(s.image?.crop||cropDefaults()),crop=hadImage&&preserveCrop?normalizeCrop({...previousCrop,naturalW:0,naturalH:0}):cropDefaults();s.image=imageElementDefaults({...s.image,src,dx:0,dy:0,scale:1,crop});if(result)assignImageMetadata(s,result);else{s.imageAssetKey=imageAssetKey(src);s.imageSource='';s.imageProvider='Caricamento';s.imageLicense='';s.imageAttribution='';s.imageSourceTitle='';s.imageRights='Fonte da verificare';}layerState(s,'image').visible=true;selected='image';hydrateImageMeta(s.image).then(()=>{if(!hadImage||!preserveCrop)applyAutomaticCrop(s);render();});render();commitHistory();showToast(hadImage&&preserveCrop?'Immagine sostituita mantenendo il ritaglio':'Immagine inserita');}
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
function tmdbSearchCandidates(q=''){
  const noise=/\b(official|movie|film|cinema|poster|still|scene|cinematic|backdrop|background|portrait|interview|cast|director|actor|actress|profile|behind|the|scenes|practical|effects?|set|animatronic|crowd|audience|theater|theatre|logo|title|key|art|editorial|landscape)\b/gi;
  const clean=String(q||'').replace(noise,' ').replace(/[^a-zA-ZÀ-ÿ0-9'’ -]+/g,' ').replace(/\s+/g,' ').trim(),words=clean.split(/\s+/).filter(Boolean),projectClean=String(project?.name||'').replace(/\b(vs|contro|recensione|review|carosello|post|ai|cgi)\b/gi,' ').replace(/[^a-zA-ZÀ-ÿ0-9'’ -]+/g,' ').replace(/\s+/g,' ').trim();
  const candidates=[clean,words.slice(0,3).join(' '),words.slice(0,2).join(' '),projectClean,projectClean.split(/\s+/).slice(0,3).join(' ')].map(x=>x.trim()).filter(x=>x.length>1);
  return [...new Set(candidates.map(x=>x.toLowerCase()))].map(lower=>candidates.find(x=>x.toLowerCase()===lower)).slice(0,5);
}
async function fetchTmdbResults(q,limit=24,slide=currentSlide()){
  let search={results:[]};for(const candidate of tmdbSearchCandidates(q)){try{const found=await tmdbFetch('search/multi',{query:candidate,include_adult:false,page:1});if((found.results||[]).length){search=found;break;}}catch(error){console.warn('TMDb query fallita',candidate,error);}}
  const intent=slide?.imageIntent||imageIntentForSlide(slide,Math.max(0,project?.slides?.indexOf(slide)||0),project?.slides?.length||1),type=intent==='poster'?'poster':intent==='logo'?'logo':intent==='profile'?'profile':($('tmdbImageType')?.value||'backdrop'),items=[];
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
  el.innerHTML=searchResults.map((r,i)=>{const rights=resultRightsInfo(r),duplicate=usedProjectImageKeys(currentSlide()).has(resultAssetKey(r));return`<button class="image-card search-result-card${duplicate?' is-duplicate':''}" type="button" data-search-index="${i}" title="Importa ${esc(r.title)}"><img src="${esc(r.thumb)}" alt=""><span class="image-rights ${rights.level}">${duplicate?'Già usata':esc(rights.label)}</span><span class="image-meta"><strong>${esc(r.title)}</strong><small>${r.provider?esc(r.provider):'Fonte esterna'}${r.width&&r.height?` · ${r.width}×${r.height}`:''}</small></span></button>`;}).join('');
  el.querySelectorAll('[data-search-index]').forEach(b=>b.addEventListener('click',()=>importSearchResult(Number(b.dataset.searchIndex))));
}
function renderCurrentImageSource(){const el=$('currentImageSourceCard');if(!el)return;const slide=currentSlide();if(!slide?.image?.src){el.hidden=true;el.innerHTML='';return;}const rights={label:slide.imageRights||'Fonte da verificare',level:/più semplice/i.test(slide.imageRights||'')?'ok':/attribuzione/i.test(slide.imageRights||'')?'attribution':/diritti/i.test(slide.imageRights||'')?'warning':'review'},source=slide.imageSource?`<a href="${esc(slide.imageSource)}" target="_blank" rel="noopener">Apri fonte ↗</a>`:'<span>Fonte non registrata</span>';el.hidden=false;el.innerHTML=`<div><small>Immagine corrente</small><strong>${esc(slide.imageSourceTitle||slide.imageProvider||'Immagine caricata')}</strong><span>${esc(slide.imageProvider||'Caricamento')}${slide.imageLicense?` · ${esc(slide.imageLicense)}`:''}</span></div><div class="current-source-actions"><span class="source-risk ${rights.level}">${esc(rights.label)}</span>${source}</div>`;}
async function fetchImageResults(q,limit=24,slide=currentSlide()){
  const url=new URL('https://commons.wikimedia.org/w/api.php');
  const params={action:'query',format:'json',origin:'*',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:String(limit),prop:'imageinfo',iiprop:'url|size|mime|extmetadata',iiurlwidth:'900'};Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();
  const target=layoutFor(slide)?.image||{w:1080,h:1350},targetRatio=(target.w||1080)/(target.h||1350);
  return Object.values(data.query?.pages||{}).map(p=>{const info=p.imageinfo?.[0]||{},meta=info.extmetadata||{},ratio=(info.width||1)/(info.height||1),pixels=(info.width||0)*(info.height||0),license=plainMetadata(meta.LicenseShortName?.value||meta.UsageTerms?.value||''),artist=plainMetadata(meta.Artist?.value||meta.Credit?.value||'');return{title:(p.title||'').replace(/^File:/,''),thumb:info.thumburl||info.url,url:info.url||info.thumburl,width:info.width,height:info.height,mime:info.mime,source:`https://commons.wikimedia.org/?curid=${p.pageid}`,provider:'Wikimedia Commons',license,artist,attribution:artist,kind:'commons',score:Math.log10(Math.max(1,pixels))-Math.abs(ratio-targetRatio)*.8};}).filter(r=>r.thumb&&r.url&&/^image\/(jpeg|png|webp)$/i.test(r.mime||'image/jpeg')&&(r.width||0)>=600&&(r.height||0)>=400).sort((a,b)=>b.score-a.score);
}
async function searchImages(){
  const q=$('imageSearchInput').value.trim();if(!q)return;const slide=currentSlide();slide.imageQuery=q;setStatus('Ricerca in corso…');$('searchImagesBtn').disabled=true;searchResults=[];renderSearchResults();
  try{const raw=await fetchSmartImageResults(q,32,slide);searchResults=rankImageResults(raw,slide,q,{excludeUsed:false}).slice(0,24);setStatus(searchResults.length?`${searchResults.length} alternative ordinate per pertinenza${avoidDuplicateImages?' · duplicati segnalati':''}.`:'Nessun risultato. Prova a semplificare la query.','success');renderSearchResults();markDirty();}
  catch(error){console.error(error);setStatus('Ricerca non disponibile. Puoi usare Google Immagini o caricare un file.','error');}
  finally{$('searchImagesBtn').disabled=false;}
}
async function prepareSearchCandidate(result){const controller=new AbortController(),response=await withTimeout(fetch(result.url,{mode:'cors',cache:'no-store',signal:controller.signal}),15000,'Download immagine',controller);if(!response.ok)throw new Error(`Immagine non disponibile (HTTP ${response.status}). Prova un’altra fonte.`);return prepareImageBlob(await response.blob());}
async function proposeImageForSlide(slide,index,{replace=false,showResults=false}={}){
  if(slide.image.src&&!replace)return false;ensureSlideImageQuery(slide,index);
  const queries=[slide.imageQuery,...(slide.imageQueries||[])].filter(Boolean).filter((q,i,a)=>a.indexOf(q)===i).slice(0,3),hadImage=Boolean(slide.image?.src),previousCrop=deepClone(slide.image?.crop||cropDefaults());let lastResults=[];
  for(const q of queries){
    let raw=[];try{raw=cautiousImageMode?await fetchImageResults(q,24,slide):await fetchSmartImageResults(q,24,slide);}catch(error){console.warn('Ricerca immagine fallita',q,error);continue;}
    const results=rankImageResults(raw,slide,q,{excludeUsed:avoidDuplicateImages});if(results.length)lastResults=results;
    for(const result of results.slice(0,8)){try{const src=await prepareSearchCandidate(result),crop=hadImage&&replace?normalizeCrop({...previousCrop,naturalW:0,naturalH:0}):cropDefaults();slide.image=imageElementDefaults({...slide.image,src,dx:0,dy:0,scale:1,crop});assignImageMetadata(slide,result);slide.imageQuery=q;slide.imageQueryBase=q;await hydrateImageMeta(slide.image);if(!(hadImage&&replace))applyAutomaticCrop(slide);if(showResults&&slide===currentSlide()){searchResults=results;renderSearchResults();}return true;}catch(error){console.warn('Immagine proposta non importabile',result.url,error);}}
  }
  if(showResults&&slide===currentSlide()){searchResults=lastResults;renderSearchResults();}
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
  const result=searchResults[index];if(!result)return;const duplicateIndex=(project.slides||[]).findIndex(slide=>slide!==currentSlide()&&slideAssetKey(slide)===resultAssetKey(result));if(duplicateIndex>=0&&avoidDuplicateImages&&!confirm(`Questa immagine è già usata nella slide ${duplicateIndex+1}. Usarla comunque?`))return;setStatus('Scarico e preparo l’immagine…');
  try{const src=await prepareSearchCandidate(result);await saveImageLibrary(src,result.title,result.provider||'Ricerca');useImage(src,{result,preserveCrop:true});setStatus(`Immagine inserita · ${resultRightsInfo(result).label}.`,'success');}
  catch(error){console.error(error);setStatus('Il sito sorgente non consente il download diretto. Apri la fonte e salva l’immagine manualmente.','error');window.open(result.source,'_blank','noopener');}
}
async function importImageUrl(){
  const url=$('imageUrlInput').value.trim();if(!url)return;setStatus('Importazione URL…');
  try{const response=await fetch(url,{mode:'cors'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const src=await prepareImageBlob(await response.blob());await saveImageLibrary(src,new URL(url).pathname.split('/').pop()||'Immagine URL','URL');useImage(src);$('imageUrlInput').value='';setStatus('Immagine importata.','success');}
  catch(error){diagnosticLog('warn','image-url',error.message||'Importazione immagine non riuscita',error);setStatus(`${error.message||'Importazione non riuscita'} Se l’URL è corretto, scarica il file e usa “Carica dal telefono”.`,'error');}
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


function setImportStatus(message,kind=''){const el=$('importStatus');if(!el)return;el.textContent=message;el.className=`inline-status${kind?' '+kind:''}`;}
function cleanImportedText(text){
  const raw=String(text||'').replace(/\r/g,'').replace(/^Title:\s*/im,'').replace(/^URL Source:.*$/gim,'').replace(/^Published Time:.*$/gim,'').replace(/^Markdown Content:\s*/im,'').replace(/!\[[^\]]*\]\([^\)]+\)/g,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').replace(/^#{1,6}\s*/gm,'').replace(/[ \t]+\n/g,'\n');
  const boilerplate=/^(home|menu|cookie|privacy|pubblicità|advertisement|leggi anche|iscriviti|newsletter|seguici su|condividi|copyright|tutti i diritti riservati|accetta|rifiuta|gestisci preferenze|foto:|fonte:)\b/i;
  return raw.split('\n').map(x=>x.trim()).filter(line=>line&&!boilerplate.test(line)&&!/^https?:\/\//i.test(line)).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function findFirstImageUrl(text){const md=String(text||'').match(/!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/i);if(md)return md[1];const raw=String(text||'').match(/https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)]*)?/i);return raw?.[0]||'';}
function titleFromImported(text,fallback='Nuovo carosello'){const lines=cleanImportedText(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);return (lines[0]||fallback).replace(/^[-*]\s*/,'').slice(0,120);}
async function readerFetch(url){const target=`https://r.jina.ai/${url}`;const response=await fetch(target,{headers:{Accept:'text/plain'},cache:'no-store'});if(!response.ok)throw new Error(`Lettore web: HTTP ${response.status}`);return response.text();}
function normalizeInstagramUrl(value){
  let raw=String(value||'').trim();if(!raw)return '';
  if(!/^https?:\/\//i.test(raw))raw=`https://${raw.replace(/^\/+/, '')}`;
  let parsed;try{parsed=new URL(raw);}catch(_){throw new Error('Link Instagram non valido');}
  if(!/(^|\.)instagram\.com$/i.test(parsed.hostname))throw new Error('Inserisci un link instagram.com');
  const match=parsed.pathname.match(/^\/(p|reel|tv)\/([^\/\?#]+)/i);if(!match)throw new Error('Il link deve puntare a un post, Reel o carosello');
  return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
}
function instagramReaderCandidates(url){const normalized=normalizeInstagramUrl(url);return[normalized,`${normalized}embed/captioned/`,`${normalized}embed/`];}
function instagramContentScore(raw,cleaned){
  const source=String(raw||''),text=String(cleaned||'');let score=Math.min(45,Math.round(text.length/45));
  if(/#[\p{L}\p{N}_]+/u.test(text))score+=8;if(/@[\p{L}\p{N}_.]+/u.test(text))score+=5;if(/[.!?]/.test(text))score+=5;
  if(/instagram|post|reel|carousel/i.test(source))score+=3;if(findFirstImageUrl(source))score+=8;
  if(/log in|sign up|pagina non disponibile|page isn't available|sorry, this page|accetta.*cookie/i.test(text))score-=35;
  if(text.length<80)score-=30;return score;
}
function cleanInstagramImportedText(text){
  const raw=cleanImportedText(text);const noise=[
    /^instagram$/i,/^log in$/i,/^sign up$/i,/^accedi$/i,/^iscriviti$/i,/^follow$/i,/^segui$/i,/^following$/i,/^segui già$/i,
    /^view (all )?\d* comments?$/i,/^visualizza tutti i \d* commenti$/i,/^add a comment/i,/^aggiungi un commento/i,/^liked by/i,/^piace a/i,
    /^\d+[,.]?\d*\s*(likes?|mi piace)$/i,/^(audio originale|original audio)$/i,/^suggested posts?$/i,/^post suggeriti$/i,/^meta$/i,
    /^\d+\s*(secondi|minuti|ore|giorni|settimane|mesi|anni|seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s*(fa|ago)?$/i,
    /^(share|condividi|save|salva|more|altro)$/i,/^see translation$/i,/^visualizza traduzione$/i,/^open app$/i,/^apri l'app$/i,
    /^\d+\s*\/\s*\d+$/,/^[♡♥♧♢◇○●•…]+$/
  ];
  const out=[];for(let line of raw.split('\n')){line=line.replace(/^[|Il1!·•\s]{1,3}(?=[A-ZÀ-Ý])/,'').replace(/\s+/g,' ').trim();if(!line||noise.some(rx=>rx.test(line)))continue;if(/^@[\w.]+$/.test(line)&&out.length===0)continue;const key=line.toLowerCase().replace(/[^a-zà-ÿ0-9]+/g,' ').trim();if(!key||out.some(x=>x.key===key))continue;out.push({line,key});}
  return out.map(x=>x.line).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function extractImageUrls(text){
  const source=String(text||''),urls=[];for(const match of source.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/gi))urls.push(match[1]);for(const match of source.matchAll(/https?:\/\/[^\s\)"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)"']*)?/gi))urls.push(match[0]);
  return [...new Set(urls.map(x=>x.replace(/&amp;/g,'&')))].filter(x=>!/(profile|avatar|favicon|icon)/i.test(x));
}
function showInstagramFallback(reason=''){const panel=$('instagramFallbackPanel');if(panel)panel.hidden=false;const status=$('instagramDirectStatus');if(status){status.textContent=reason?`Lettura diretta non riuscita: ${reason}`:'Carica gli screenshot del post.';status.className='instagram-direct-status warning';}const input=$('ocrImagesInput');setTimeout(()=>input?.focus(),50);}
function hideInstagramFallback(){const status=$('instagramDirectStatus');if(status){status.textContent='';status.className='instagram-direct-status';}}
function renderInstagramScreenshotQueue(){
  const root=$('instagramScreenshotQueue'),summary=$('instagramScreenshotSummary');if(!root)return;root.innerHTML='';const items=instagramImportSession.items||[];
  if(summary)summary.textContent=instagramOcrBusy?'OCR in corso…':items.length?`${items.length} screenshot letti · ordine conservato`:'Nessuno screenshot caricato';
  items.forEach((item,index)=>{const card=document.createElement('article');card.className='instagram-shot-card';card.dataset.instagramShot=String(index);card.innerHTML=`<img src="${esc(item.src||'')}" alt="Screenshot ${index+1}"><div><small>Slide ${index+1}</small><strong>${esc(item.title||item.name||`Screenshot ${index+1}`)}</strong><span>${esc((item.text||'Testo non riconosciuto').slice(0,120))}</span></div><div class="instagram-shot-actions"><button type="button" data-shot-action="up" aria-label="Sposta su">↑</button><button type="button" data-shot-action="down" aria-label="Sposta giù">↓</button><button type="button" data-shot-action="remove" aria-label="Rimuovi">×</button></div>`;root.appendChild(card);});
}
async function tryImportInstagramUrl(url){
  const normalized=normalizeInstagramUrl(url);let best=null,lastError=null;setImportStatus('Provo più modalità di lettura Instagram…');
  for(const candidate of instagramReaderCandidates(normalized)){try{const raw=await readerFetch(candidate),cleaned=cleanInstagramImportedText(raw),score=instagramContentScore(raw,cleaned),images=extractImageUrls(raw);if(!best||score>best.score)best={candidate,raw,cleaned,score,images};if(score>=28&&cleaned.length>=100)break;}catch(error){lastError=error;}}
  if(!best||best.score<18||best.cleaned.length<60){instagramImportSession={...instagramImportSession,status:'fallback',sourceUrl:normalized,method:'link-blocked',lastError:lastError?.message||'contenuto non leggibile',updatedAt:new Date().toISOString()};showInstagramFallback(instagramImportSession.lastError);throw new Error('Instagram non espone testo sufficiente al lettore esterno');}
  $('importTextInput').value=best.cleaned;const title=titleFromImported(best.cleaned,'Post Instagram');$('importTitleInput').value=title;pendingImportImage='';
  const image=best.images[0]||'';if(image){$('imageUrlInput').value=image;try{const response=await fetch(image,{cache:'no-store'});if(response.ok){pendingImportImage=await prepareImageFile(new File([await response.blob()],'copertina-instagram',{type:response.headers.get('content-type')||'image/jpeg'}));await saveImageLibrary(pendingImportImage,'Copertina Instagram','Instagram');}}catch(_){}}
  instagramImportSession={status:'ready',sourceUrl:normalized,method:'direct-link',items:[],combinedText:best.cleaned,caption:'',lastError:'',updatedAt:new Date().toISOString()};hideInstagramFallback();setTab('import');
  try{prepareEditorialOutline({silent:true});setImportStatus('Post letto. Scaletta pronta: puoi generare il carosello.','success');}catch(_){setImportStatus('Post letto. Controlla il testo e genera il carosello.','success');}
  return best.cleaned;
}
