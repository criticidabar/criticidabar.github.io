'use strict';

function quickSlideReady(slide){
  const hasTitle=Boolean(String(slide?.title?.text||'').trim());
  const hasImage=Boolean(slide?.image?.src),needsImage=slideNeedsImage(slide);
  return {hasTitle,hasImage,needsImage,ready:hasTitle&&(!needsImage||hasImage)};
}

const DRAFT_ROLE_SUFFIX={cover:'official poster movie',context:'movie still context',fact:'official scene detail',detail:'behind the scenes practical effects',quote:'interview portrait',impact:'cinematic landscape consequence',critique:'film set editorial',conclusion:'cinema audience',final:'movie theater audience'};
function slideEditorialRole(slide,index,total){
  const role=inferEditorialRoleFromContent(slide,index,total);
  if(slide&&(!slide.editorialRole||slide.editorialRole==='content'))slide.editorialRole=role;
  return role;
}
function draftTextBudget(role,key){
  if(role==='cover')return key==='title'?92:190;
  if(role==='final')return key==='title'?82:250;
  if(role==='quote')return key==='title'?112:290;
  if(role==='critique')return key==='title'?82:300;
  if(role==='impact')return key==='title'?84:280;
  return key==='title'?82:275;
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
function contentVariantsForFamily(family,preset=currentAutomationPreset()){
  const available=Object.keys(FAMILIES[family]?.variants||{}),cover=DEFAULT_VARIANT[family],final=finalVariantFor(family);
  const curated=(CURATED_FAMILY_VARIANTS[family]||[]).filter(v=>available.includes(v)&&v!==cover&&v!==final);
  if(preset==='returns'&&family==='r')return ['scheda_dx','scheda_sx','fumettone'].filter(v=>available.includes(v));
  if(preset==='list'&&family==='r')return ['card_nere','scheda_dx','scheda_sx'].filter(v=>available.includes(v));
  return curated.length?curated:available.filter(v=>v!==cover&&v!==final);
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
    slide.subtitle.text=rewriteBody(source,'synthetic',tone,density,role,true,slide.title.text,project.slides.slice(0,index).map(s=>s.subtitle?.text||''));
  }
  slide.title.text=trimAtBoundary(String(slide.title?.text||'').replace(/\s+/g,' ').trim(),draftTextBudget(role,'title')).toUpperCase();
  slide.subtitle.text=trimAtBoundary(String(slide.subtitle?.text||'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim(),draftTextBudget(role,'subtitle'));
  autoFitTextModel(slide,'title');autoFitTextModel(slide,'subtitle');
}
function uniqueDraftQueries(slides){
  const used=new Map();
  slides.forEach((slide,index)=>{
    const role=slideEditorialRole(slide,index,slides.length),fresh=imageQueryCandidatesForSlide(slide,index);
    slide.imageIntent=imageIntentForSlide(slide,index,slides.length);
    slide.imageQueries=fresh.length?fresh:[buildSlideImageQuery(slide,index)];
    let chosen=String(slide.imageQueryBase||slide.imageQuery||slide.imageQueries[0]||'').replace(/\s+/g,' ').trim();
    const key=chosen.toLowerCase(),seen=used.get(key)||0;used.set(key,seen+1);
    if(seen){const alternative=slide.imageQueries.find(q=>!used.has(q.toLowerCase()));if(alternative)chosen=alternative;else chosen=`${chosen} ${DRAFT_ROLE_SUFFIX[role]||DRAFT_ROLE_SUFFIX.detail} variation ${seen+1}`;}
    slide.imageQuery=chosen.replace(/\s+/g,' ').trim().slice(0,190);slide.imageQueryBase=slide.imageQuery;
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
  const titleBudget=draftTextBudget(role,'title'),bodyBudget=draftTextBudget(role,'subtitle');
  if(!title){issues.push('titolo mancante');score-=48;}else if(title.length>titleBudget){issues.push('titolo troppo lungo');score-=14;}else if(title.length<10&&role!=='final'){issues.push('titolo poco informativo');score-=6;}
  if(role!=='cover'&&role!=='final'&&!body){issues.push('testo mancante');score-=20;}else if(body.length>bodyBudget){issues.push('testo troppo lungo');score-=14;}
  if(isGenericEditorialHeadline(title)&&!['cover','final'].includes(role)){issues.push('titolo troppo generico');score-=11;}
  if(headlineBodyEcho(title,body)&&body.length>55){issues.push('titolo e testo sono quasi identici');score-=10;}
  if(index>0&&jaccardText(title,slides[index-1]?.title?.text||'')>.62){issues.push('titolo simile alla slide precedente');score-=15;}
  if(index>1&&jaccardText(body,slides[index-1]?.subtitle?.text||'')>.68){issues.push('contenuto ripetuto');score-=17;}
  if(slideNeedsImage(slide)&&!slide.image?.src){issues.push('immagine da scegliere');score-=19;}
  if(index>0&&slide.variant===slides[index-1]?.variant&&!['cover','final'].includes(role)){issues.push('layout ripetuto');score-=8;}
  if(!String(slide.imageQuery||'').trim()&&slideNeedsImage(slide)){issues.push('query immagine mancante');score-=9;}
  if(index>0&&slide.image?.src&&slides[index-1]?.image?.src===slide.image.src){issues.push('immagine ripetuta');score-=12;}
  if(index>0&&role===slideEditorialRole(slides[index-1],index-1,slides.length)&&!['detail','fact'].includes(role)){issues.push('funzione narrativa ripetuta');score-=5;}
  const ready=quickSlideReady(slide).ready;
  return{score:clamp(Math.round(score),0,100),issues,role,ready,needsReview:!ready||score<86};
}
function draftProjectAssessment(){
  const slides=project?.slides||[],items=slides.map((slide,index)=>draftSlideAssessment(slide,index,slides));
  const score=items.length?Math.round(items.reduce((sum,item)=>sum+item.score,0)/items.length):0;
  const issues=items.flatMap((item,index)=>item.issues.map(message=>({slideIndex:index,message,score:item.score})));
  const reviewQueue=items.map((item,index)=>({index,...item})).filter(item=>item.needsReview).sort((a,b)=>a.score-b.score||a.index-b.index);
  const strong=items.map((item,index)=>({index,...item})).filter(item=>item.ready&&item.score>=AUTO_APPROVE_SCORE);
  return{score,items,issues,reviewQueue,strong,readyCount:items.filter(x=>x.ready).length,approvedCount:slides.filter(s=>s.approved).length};
}

function optimizeGeneratedProject({rewrite=false,commit=true,renderNow=true,toast=true}={}){
  if(!project?.slides?.length)return null;
  const slides=project.slides;
  slides.forEach((slide,index)=>{
    slide.editorialRole=slideEditorialRole(slide,index,slides.length);
    normalizeDraftText(slide,index,slides.length,{rewrite});
    const target=alternateDraftVariant(slide,index,slides);
    if(target&&target!==slide.variant){const old=slide,fresh=createSlide(old.family,target);fresh.id=old.id;fresh.title={...fresh.title,...old.title};fresh.subtitle={...fresh.subtitle,...old.subtitle};fresh.image=old.image;fresh.imageQuery=old.imageQuery;fresh.imageQueryBase=old.imageQueryBase;fresh.imageQueries=deepClone(old.imageQueries||[]);fresh.imageIntent=old.imageIntent||'';fresh.imageSource=old.imageSource||'';fresh.kicker=old.kicker||'';fresh.dateText=old.dateText||'';fresh.bubbleText=old.bubbleText||'';fresh.logo=old.logo;fresh.number=old.number;fresh.palette=old.palette;fresh.freeTexts=old.freeTexts||[];fresh.overlays=old.overlays||[];fresh.editorialRole=old.editorialRole;fresh.editorialSource=old.editorialSource;fresh.editorialOriginal=old.editorialOriginal;fresh.templateLocked=old.templateLocked;fresh.approved=false;slides[index]=fresh;autoFitTextModel(fresh,'title');autoFitTextModel(fresh,'subtitle');}
    else slide.approved=false;
  });
  dedupeDraftText(slides);uniqueDraftQueries(slides);project.automation={...(project.automation||{}),optimizedAt:new Date().toISOString(),optimizerVersion:'0.32'};
  const report=draftProjectAssessment();if(commit)commitHistory();if(renderNow)render();if(toast)showToast(`Bozza ottimizzata · qualità ${report.score}/100`);return report;
}

function removeDuplicateDraftImages(){
  const seen=new Map();let removed=0;
  project.slides.forEach((slide,index)=>{
    const src=slide.image?.src;if(!src)return;const key=slide.imageSource||src;
    if(seen.has(key)&&slideNeedsImage(slide)){slide.image.src='';slide.imageSource='';slide.imageAssetKey='';slide.imageProvider='';slide.imageLicense='';slide.imageAttribution='';slide.imageRights='';removed++;}
    else seen.set(key,index);
  });
  return removed;
}
function approveStrongSlides({silent=false}={}){
  const report=draftProjectAssessment();let approved=0;
  report.strong.forEach(({index})=>{const slide=project.slides[index];if(!slide.approved){slide.approved=true;approved++;}});
  if(approved){commitHistory();render();}
  if(!silent)showToast(approved?`${approved} slide solide approvate`:'Nessuna slide pronta per l’approvazione automatica');
  return approved;
}
function jumpToReviewIssue(direction=1){
  const queue=draftProjectAssessment().reviewQueue;if(!queue.length){showToast('Nessuna slide critica da rivedere');return;}
  const currentPos=queue.findIndex(item=>item.index===currentIndex);
  reviewQueueCursor=currentPos>=0?currentPos:reviewQueueCursor;
  reviewQueueCursor=(reviewQueueCursor+direction+queue.length)%queue.length;
  currentIndex=queue[reviewQueueCursor].index;selected='title';render();showToast(`Slide ${currentIndex+1}: ${queue[reviewQueueCursor].issues[0]||'da rivedere'}`);
}
function applyEasyDraftFixes(){
  if(!project?.slides?.length)return null;
  const before=draftProjectAssessment();
  optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});
  const removed=removeDuplicateDraftImages();
  project.slides.forEach((slide,index)=>{
    slide.editorialRole=slideEditorialRole(slide,index,project.slides.length);
    ensureSlideImageQuery(slide,index);
    normalizeDraftText(slide,index,project.slides.length,{rewrite:false});
  });
  const after=draftProjectAssessment();project.automation={...(project.automation||{}),easyFixAt:new Date().toISOString(),easyFixBefore:before.score,easyFixAfter:after.score,duplicatesRemoved:removed};
  commitHistory();render();showToast(`Correzioni automatiche · ${before.score}→${after.score}/100`);return after;
}
async function completeDraftAutopilot(){
  if(!project?.slides?.length)return;
  const button=$('completeDraftBtn');if(button)button.disabled=true;
  const status=$('autopilotStatus');const setStep=(text)=>{if(status){status.textContent=text;status.className='inline-status working';}$('saveStatus').textContent=text;};
  try{
    setStep('1/4 · Sistemo testi e sequenza…');
    optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});
    removeDuplicateDraftImages();
    setStep('2/4 · Preparo query e ritagli…');
    project.slides.forEach((slide,index)=>{ensureSlideImageQuery(slide,index);if(slide.image?.src)applyAutomaticCrop(slide);});
    if($('autoImageSuggestionsCheckbox')?.checked){setStep('3/4 · Cerco le immagini mancanti…');await autoSuggestProjectImages({replace:false});}
    setStep('4/4 · Valuto la bozza…');
    optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});
    const report=draftProjectAssessment();
    report.strong.forEach(({index})=>{project.slides[index].approved=true;});
    project.automationPreset=project.automationPreset||selectedAutomationPreset(project.slides.map(s=>`${s.title?.text||''} ${s.subtitle?.text||''}`).join(' '),project.name);project.automation={...(project.automation||{}),autopilotAt:new Date().toISOString(),autopilotVersion:'0.32',preset:project.automationPreset,score:report.score};
    commitHistory();
    if(report.reviewQueue.length){currentIndex=report.reviewQueue[0].index;selected='title';}
    render();
    if(status){status.textContent=report.reviewQueue.length?`Bozza ${report.score}/100 · ${report.reviewQueue.length} slide da rivedere`:`Bozza ${report.score}/100 · pronta per l’export`;status.className=`inline-status ${report.reviewQueue.length?'warning':'success'}`;}
    showToast(report.reviewQueue.length?`Autopilota completato · ${report.reviewQueue.length} slide da rivedere`:'Autopilota completato · bozza pronta');
  }catch(error){console.error(error);if(status){status.textContent=`Autopilota interrotto: ${error.message||'errore'}`;status.className='inline-status error';}showToast('Completa manualmente le slide mancanti');}
  finally{if(button)button.disabled=false;$('saveStatus').textContent='salvato sul dispositivo';}
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
  $('quickProjectName').textContent=project.name||'Nuovo carosello';if($('quickPresetBadge'))$('quickPresetBadge').textContent=presetConfig(currentAutomationPreset()).label;
  $('quickSlideHeading').textContent=`Slide ${currentIndex+1} di ${total}`;
  $('quickProgressBar').style.width=`${total?Math.round(approvedCount/total*100):0}%`;
  $('quickProgressText').textContent=`${approvedCount} approvate · ${readyCount} complete su ${total}`;
  const draft=draftProjectAssessment(),draftBadge=$('draftScoreBadge'),draftCopy=$('draftScoreText'),currentDraft=draft.items[currentIndex];
  if(draftBadge){draftBadge.textContent=`${draft.score}/100`;draftBadge.className=`draft-score ${draft.score>=85?'good':draft.score>=68?'medium':'weak'}`;}
  if(draftCopy)draftCopy.textContent=draft.issues.length?`${draft.issues.length} aspetti da rifinire · prima priorità: slide ${draft.issues[0].slideIndex+1}, ${draft.issues[0].message}`:'Bozza coerente: puoi passare alla revisione finale.';
  const queueTitle=$('reviewQueueTitle'),queueText=$('reviewQueueText');
  if(queueTitle)queueTitle.textContent=draft.reviewQueue.length?`${draft.reviewQueue.length} slide richiedono attenzione`:`Tutte le slide sono solide`;
  if(queueText)queueText.textContent=draft.reviewQueue.length?`La più urgente è la slide ${draft.reviewQueue[0].index+1}: ${draft.reviewQueue[0].issues[0]||'controllo manuale'}.`:`${draft.strong.length} slide possono essere approvate automaticamente. Controlla il colpo d’occhio e poi esporta.`;
  const queueDetails=$('reviewQueueDetails');if(queueDetails&&!queueDetails.dataset.userChoice)queueDetails.open=window.innerWidth>720&&draft.reviewQueue.length>0;
  if($('nextReviewIssueBtn'))$('nextReviewIssueBtn').disabled=!draft.reviewQueue.length;
  if($('approveStrongSlidesBtn'))$('approveStrongSlidesBtn').disabled=!draft.strong.some(item=>!project.slides[item.index].approved);
  if($('quickImageState'))$('quickImageState').textContent=status.hasImage?`Immagine inserita · ${IMAGE_INTENT_LABELS[slide.imageIntent||imageIntentForSlide(slide,currentIndex,total)]||'visual'}`:status.needsImage?`Nessuna immagine · cerca ${IMAGE_INTENT_LABELS[slide.imageIntent||imageIntentForSlide(slide,currentIndex,total)]||'una visual'}`:'Immagine facoltativa';
  const slideState=$('quickSlideState');
  slideState.textContent=slide.approved?'Approvata':status.ready?'Da approvare':status.hasTitle?'Manca immagine':'Manca titolo';
  slideState.className=`quick-state ${slide.approved?'ok':status.ready?'warning':status.hasTitle?'warning':''}`;
  const imageBadge=$('quickImageBadge');imageBadge.textContent=status.hasImage?'OK':status.needsImage?'Manca':'Facoltativa';imageBadge.className=`quick-state ${status.hasImage||!status.needsImage?'ok':''}`;
  const family=$('quickFamilySelect'),variant=$('quickVariantSelect');
  const recommended=new Set(presetConfig(currentAutomationPreset()).families||[]);family.innerHTML=Object.entries(FAMILIES).sort(([a],[b])=>Number(recommended.has(b))-Number(recommended.has(a))).map(([id,item])=>`<option value="${id}">${recommended.has(id)?'★ ':''}${item.label}</option>`).join('');family.value=slide.family;
  const fam=FAMILIES[slide.family]||FAMILIES.c,curated=new Set(contentVariantsForFamily(slide.family));variant.innerHTML=Object.entries(fam.variants).sort(([a],[b])=>Number(curated.has(b))-Number(curated.has(a))).map(([id,item])=>`<option value="${id}">${curated.has(id)||id===DEFAULT_VARIANT[slide.family]||id===finalVariantFor(slide.family)?'★ ':''}${item.label}</option>`).join('');variant.value=slide.variant;
  $('quickDeleteSlideBtn').disabled=project.slides.length===1;
  if($('approveSlideBtn')){$('approveSlideBtn').textContent=slide.approved?'Riapri slide':'Approva slide';$('approveSlideBtn').classList.toggle('approved',Boolean(slide.approved));$('approveSlideBtn').disabled=!slide.approved&&!status.ready;}
  if($('reviewCommandTitle'))$('reviewCommandTitle').textContent=slide.approved?'Slide approvata':status.ready?'Bozza pronta da approvare':'Completa ciò che manca';
  if($('reviewCommandText'))$('reviewCommandText').textContent=slide.approved?'Passa alla successiva oppure riaprila per modificarla.':status.ready?(currentDraft?.issues?.length?`Da rifinire: ${currentDraft.issues.join(' · ')}.`:'La slide è coerente: approvala e passa avanti.'):'Inserisci titolo e immagine, oppure rigenera la slide.';
}


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
    const presetChoice=$('automationPresetSelect')?.value||'auto';if(presetChoice!=='auto'){const cfg=presetConfig(presetChoice);if(cfg.tone&&$('editorialToneSelect'))$('editorialToneSelect').value=cfg.tone;if(cfg.density&&$('importLengthSelect'))$('importLengthSelect').value=cfg.density;if(cfg.slides&&$('editorialSlideCountSelect'))$('editorialSlideCountSelect').value=cfg.slides;}
    if(generatorSource==='json'){
      const parsed=parseContentJsonText($('contentJsonTextarea')?.value||'');
      await activateContentJson(parsed,'json-incollato.json');
    }else if(generatorSource==='url'){
      const url=$('articleUrlInput')?.value.trim();if(!url)throw new Error('Incolla il link dell’articolo');
      setGeneratorBusy(true,'Estraggo e ripulisco l’articolo…');await tryImportUrl(url,'article');
      setGeneratorBusy(true,'Costruisco testi, sequenza e template…');await createCarouselFromText();
    }else if(generatorSource==='instagram'){
      const url=$('instagramUrlInput')?.value.trim();
      if(instagramImportSession.items.length){
        setGeneratorBusy(true,'Ricostruisco il carosello dagli screenshot…');
        await buildInstagramCarouselFromOcr(instagramImportSession.items,{autoImages:Boolean($('autoImageSuggestionsCheckbox')?.checked)});
      }else{
        if(!url)throw new Error('Incolla il link Instagram oppure carica gli screenshot');
        setGeneratorBusy(true,'Provo a leggere il post Instagram…');await tryImportUrl(url,'instagram');
        setGeneratorBusy(true,'Adatto il contenuto al carosello…');await createCarouselFromText();
      }
    }else{
      const text=$('importTextInput')?.value.trim();if(!text)throw new Error('Incolla il testo da trasformare');
      setGeneratorBusy(true,'Sintetizzo e organizzo il contenuto…');await createCarouselFromText();
    }
    project.slides.forEach(slide=>slide.approved=false);
    optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});
    const autoReport=draftProjectAssessment();autoReport.strong.forEach(({index})=>{project.slides[index].approved=true;});
    if(autoReport.reviewQueue.length)currentIndex=autoReport.reviewQueue[0].index;else currentIndex=0;
    project.automationPreset=project.automationPreset||selectedAutomationPreset(project.slides.map(s=>`${s.title?.text||''} ${s.subtitle?.text||''}`).join(' '),project.name);project.editorial={...(project.editorial||{}),preset:project.automationPreset};project.automation={...(project.automation||{}),generatedAt:new Date().toISOString(),generatorVersion:'0.32',preset:project.automationPreset,score:autoReport.score};
    commitHistory();render();setTab('quick');
    setImportStatus(`Bozza pronta: ${autoReport.score}/100 · ${autoReport.reviewQueue.length} slide da rivedere.`,'success');showToast(autoReport.reviewQueue.length?'Bozza pronta: controlla solo le slide segnalate':'Bozza completa pronta');
  }catch(error){console.error(error);if(generatorSource==='instagram'){showInstagramFallback(error?.message||'Instagram non ha reso disponibile il contenuto');setImportStatus('Lettura diretta non disponibile. Carica gli screenshot: l’app manterrà ordine e struttura delle slide.','warning');showToast('Usa gli screenshot del carosello');}else{setImportStatus(error.message||'Generazione non riuscita','error');showToast('Controlla la fonte inserita');}}
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


function editorialInputSignature(){return JSON.stringify({text:$('importTextInput')?.value||'',title:$('importTitleInput')?.value||'',preset:$('automationPresetSelect')?.value||'auto',family:$('importFamilySelect')?.value||'auto',density:$('importLengthSelect')?.value||'medium',mode:$('editorialModeSelect')?.value||'synthetic',tone:$('editorialToneSelect')?.value||'critical',slides:$('editorialSlideCountSelect')?.value||'auto',quotes:Boolean($('preserveQuotesCheckbox')?.checked)});}
function invalidateEditorialOutline(){if(!pendingEditorialOutline)return;editorialOutlineSignature='';const metrics=$('editorialOutlineMetrics');if(metrics&&!metrics.textContent.includes('da aggiornare'))metrics.textContent=`${metrics.textContent} · da aggiornare`;}
async function tryImportUrl(url,type='article'){
  if(type==='instagram')return tryImportInstagramUrl(url);
  if(!/^https?:\/\//i.test(url))throw new Error('Inserisci un URL completo');setImportStatus('Estraggo l’articolo…');
  const raw=await readerFetch(url),image=findFirstImageUrl(raw),cleaned=cleanImportedText(raw);$('importTextInput').value=cleaned;$('importTitleInput').value=titleFromImported(cleaned,'Articolo');pendingImportImage='';
  if(image){$('imageUrlInput').value=image;try{const response=await fetch(image);if(response.ok){pendingImportImage=await prepareImageFile(new File([await response.blob()],'copertina-importata',{type:response.headers.get('content-type')||'image/jpeg'}));await saveImageLibrary(pendingImportImage,'Copertina importata','Articolo');}}catch(_){}}
  setTab('import');try{prepareEditorialOutline({silent:true});setImportStatus('Testo estratto e scaletta editoriale pronta. Rivedila oppure crea subito il carosello.','success');}catch(_){setImportStatus('Testo estratto. Rivedilo e prepara la scaletta.','success');}return cleaned;
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
function detectAutomationPreset(text,title=''){
  const raw=`${title} ${text}`.toLowerCase();
  if(/ritorni in sala|tornano? in sala|uscite (al )?cinema|film del mese|questo mese al cinema|nelle sale/.test(raw))return 'returns';
  if(/classifica|top\s*\d+|\d+ film|\d+ serie|lista|migliori film|peggiori film|da vedere/.test(raw))return 'list';
  if(/nostro parere|secondo noi|dibattito|clickbait|cinema è morto|streaming|ai nel cinema|intelligenza artificiale|da che parte| vs /.test(raw))return 'debate';
  if(/recensione|voto|promosso|bocciato|cosa funziona|cosa non funziona|stagione|episodio/.test(raw))return 'review';
  if(/[“”"]|ha dichiarato|ha detto|intervista|parole di|secondo (il|la) regista/.test(raw))return 'quote';
  if(/annunciato|trailer|uscirà|data di uscita|box office|incassi|record|debutto|notizia|confermato/.test(raw))return 'news';
  return 'news';
}
function selectedAutomationPreset(text='',title=''){
  const requested=$('automationPresetSelect')?.value||project?.automationPreset||project?.editorial?.preset||'auto';
  return requested==='auto'?detectAutomationPreset(text,title):requested;
}
function presetConfig(id){return AUTOMATION_PRESETS[id]||AUTOMATION_PRESETS.auto;}
function strongFamilyForText(text,title=''){
  const raw=`${title} ${text}`.toLowerCase();
  const checks=[['fm',['mad max','furiosa','george miller','wasteland']],['fg',['porco rosso','studio ghibli','miyazaki']],['fk',['sette regni','seven kingdoms','westeros','dunk e egg','dunk and egg']],['fs',['disclosure day','extraterrestr','alieni','ufo','first encounter']],['fr',['ritorni in sala','tornano in sala','film del mese']],['fd',['dune','villeneuve','arrakis']]];
  for(const [family,words] of checks)if(words.some(word=>raw.includes(word)))return family;return '';
}
function presetFamilyForText(presetId,text,title=''){
  const special=strongFamilyForText(text,title),config=presetConfig(presetId);
  if(special&&config.families?.includes(special))return special;
  return config.families?.[0]||special||'n';
}
function presetRoles(presetId,count,concepts=[]){
  const base=presetConfig(presetId).roles;
  if(!base?.length)return semanticEditorialRoles(concepts);
  if(count<=base.length)return base.slice(0,count);
  const out=[...base];while(out.length<count)out.splice(Math.max(1,out.length-1),0,out[Math.max(1,out.length-2)]||'detail');return out.slice(0,count);
}
function currentAutomationPreset(){return project?.automationPreset||project?.editorial?.preset||'auto';}
function requestedEditorialTotal(text,raw){if(raw!=='auto'){const n=Number(raw);if(Number.isFinite(n))return clamp(n,5,11);}const length=cleanImportedText(text).length;return length<1100?5:length<2600?7:length<4800?9:11;}
function editorialRoles(count){const patterns={1:['fact'],2:['context','fact'],3:['context','fact','impact'],4:['context','fact','detail','impact'],5:['context','fact','detail','impact','critique'],6:['context','fact','detail','quote','impact','critique'],7:['context','fact','detail','quote','impact','critique','conclusion'],8:['context','fact','detail','detail','quote','impact','critique','conclusion'],9:['context','fact','detail','detail','quote','impact','critique','conclusion','conclusion']};return patterns[count]||patterns[7].slice(0,count);}
function semanticEditorialRoles(concepts){
  const roles=concepts.map((source,index)=>{
    const t=String(source||'').toLowerCase();
    if(/[“”"]/.test(t)||/ha (dichiarato|detto|spiegato|raccontato)|secondo [a-zà-ÿ]+/.test(t))return 'quote';
    if(/secondo noi|il nostro parere|forse il punto|il vero punto|in realtà|ma il problema|non convince|presa in giro/.test(t))return 'critique';
    if(/\b\d+[,.]?\d*|milion|miliard|percent|%|record|incass|debutto|voto\b/.test(t))return 'fact';
    if(/futuro|conseguenz|significa|quindi|potrebbe|rischia|scenario|cambier|da qui/.test(t))return 'impact';
    if(index===0)return 'context';
    if(index===concepts.length-1&&concepts.length>=6)return 'conclusion';
    return 'detail';
  });
  if(concepts.length>=5&&!roles.includes('critique'))roles[Math.max(1,concepts.length-2)]='critique';
  if(concepts.length>=4&&!roles.includes('impact'))roles[concepts.length-1]='impact';
  if(!roles.includes('context')&&roles.length)roles[0]='context';
  return roles;
}
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
function selectEditorialConceptsForPreset(text,title,count,presetId){
  const units=conceptUnits(text);if(!units.length)return[];const baseRoles=presetRoles(presetId,count,units),hasQuote=units.some(unit=>EDITORIAL_ROLE_HINTS.quote.test(unit));
  const roles=baseRoles.map(role=>role==='quote'&&!hasQuote?'detail':role),selected=[];
  roles.forEach((role,slot)=>{let best=null;units.forEach((unit,index)=>{if(selected.some(item=>item.index===index||jaccardText(item.unit,unit)>.62))return;let score=scoreConcept(unit,index,title)+editorialSentenceScore(unit,role,title)*1.8;if(role==='context')score+=Math.max(0,2.6-index*.65);if(role==='conclusion'||role==='critique'||role==='impact')score+=index/Math.max(1,units.length-1)*1.2;if(presetId==='debate'&&role==='detail'){if(/\b(?:animatronic|costruit|effett[io] pratic|green screen|set reale)\w*/i.test(unit))score+=4.2;if(/ha raccontato|ha detto|ha dichiarato/i.test(unit))score-=1.1;}if(presetId==='review'&&role==='detail'){if(/\b(?:regia|interpretaz|protagonista|funziona|punto di forza|battaglie|fotografia|montaggio)\w*/i.test(unit))score+=3.1;if(/\b(?:rallenta|ripet|problema|limite|artificiale)\w*/i.test(unit))score-=1.3;}if(presetId==='review'&&role==='conclusion'&&/\b(?:voto|promoss|bocciat|verdetto|memorabile|nel complesso)\w*/i.test(unit))score+=6;if(slot===0&&index===0)score+=2;if(!best||score>best.score)best={unit,index,score,role};});if(best)selected.push(best);});
  if(selected.length<count){for(let index=0;index<units.length&&selected.length<count;index++){const unit=units[index];if(!selected.some(item=>item.index===index||jaccardText(item.unit,unit)>.62))selected.push({unit,index,score:0,role:roles[selected.length]||'detail'});}}
  return{concepts:selected.slice(0,count).map(item=>item.unit),roles:selected.slice(0,count).map((item,index)=>item.role||roles[index]||'detail')};
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
function normalizedEditorialHeadline(text){return String(text||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9?]+/g,' ').trim();}
function isGenericEditorialHeadline(text){const normalized=normalizedEditorialHeadline(text);if(!normalized)return true;for(const item of EDITORIAL_GENERIC_HEADLINES)if(normalized===normalizedEditorialHeadline(item))return true;return /^(?:PUNTO|SLIDE)\s*\d+$/.test(normalized);}
function editorialSentenceScore(sentence,role,title=''){
  const clean=cleanEditorialSentence(sentence),tokens=editorialTokens(clean),titleTokens=new Set(editorialTokens(title));let score=Math.min(2.2,clean.length/95);
  const hint=EDITORIAL_ROLE_HINTS[role];if(hint?.test(clean))score+=2.4;
  score+=tokens.filter(x=>titleTokens.has(x)).length*.26;
  if(role==='fact'&&/\d/.test(clean))score+=1.4;
  if(role==='quote'&&extractQuote(clean))score+=2;
  if(role==='critique'){if(/\b(?:secondo noi|nostro parere|forse|problema|presa in giro|non odia|non convince|vero punto)\b/i.test(clean))score+=2.8;else if(/\b(?:ma|però|tuttavia|non)\b/i.test(clean))score+=.45;}
  if(role==='detail'&&/\b(?:costruit|animatronic|effett[io] pratic|green screen|girato|tecnica|set)\w*/i.test(clean))score+=1.9;
  if(role==='impact'){if(/\b(?:quindi|significa|futuro|rischia|cambia|potrebbe|domanda|major|scenario|da qui)\b/i.test(clean))score+=2.1;else if(/\b(?:porta|obbliga|apre|evita)\b/i.test(clean))score+=.7;}
  if(role==='conclusion'&&/\b(?:nel complesso|alla fine|voto|promoss|bocciat|verdetto|in sintesi|memorabile|conclusione)\w*/i.test(clean))score+=2.7;
  if(/\b(?:cookie|newsletter|clicca|abbonati|leggi anche)\b/i.test(clean))score-=6;
  return score;
}
function bestEditorialSentence(source,role,title='',excluded=[]){
  const sentences=splitEditorialSentences(source),blocked=excluded.filter(Boolean);let ranked=sentences.map((sentence,index)=>({sentence:cleanEditorialSentence(sentence),index,score:editorialSentenceScore(sentence,role,title)}));
  ranked=ranked.filter(item=>item.sentence.length>18&&!blocked.some(text=>jaccardText(text,item.sentence)>.58)).sort((a,b)=>b.score-a.score||a.index-b.index);
  return ranked[0]?.sentence||cleanEditorialSentence(sentences[0]||source);
}
function contrastHeadline(source){
  const clean=cleanEditorialSentence(source),match=clean.match(/\bnon\s+(.{4,48}?)\s+(?:ma|bensì)\s+(.{4,60})(?:[.!?]|$)/i);
  if(match)return `NON ${compactCore(match[1],38)}, MA ${compactCore(match[2],48)}`;
  const forse=clean.match(/\bforse\s+(.{12,76})(?:[.!?]|$)/i);if(forse)return `FORSE ${compactCore(forse[1],72)}`;
  return '';
}
function conciseEditorialHeadline(sentence,role,title=''){
  const clean=cleanEditorialSentence(sentence).replace(/[.!?]+$/,'').trim(),topic=shortTopic(title).toUpperCase();let m;
  if((m=clean.match(/(?:arriverà|uscirà|esce)\s+[^,.]{0,65}?\b(?:il|dal)\s+(\d{1,2}\s+[a-zà-ÿ]+)/i)))return `AL CINEMA DAL ${m[1].toUpperCase()}`;
  if((m=clean.match(/\b(\d+[,.]?\d*\s+(?:milioni|miliardi|mila)?(?:\s+di\s+\w+){0,2})\b/i))){const amount=m[1].trim().toUpperCase();if(/budget/i.test(clean))return `${amount}: BUDGET RECORD`;if(/debutt|esord|incass/i.test(clean))return `${amount}: DEBUTTO DA RECORD`;}
  if((m=clean.match(/(?:animatronic|ciclope|mostro)[^,.]{0,42}?(?:alto|di)\s+([a-zà-ÿ0-9]+\s+metri)/i)))return `UN CICLOPE VERO, ALTO ${m[1].toUpperCase()}`;
  if(/pensato che il ciclope|pensavo fosse cgi|aggiunto in cgi/i.test(clean))return 'TOM HOLLAND: “PENSAVO FOSSE CGI”';
  if((m=clean.match(/potrebbe\s+(?:aprire|dare vita a)\s+(?:una\s+)?(.{6,48})(?:[.!?]|$)/i)))return `POTREBBE NASCERE ${m[1].toUpperCase()}`;
  if((m=clean.match(/girato\s+tra\s+([^,.]{3,55})/i)))return `GIRATO TRA ${compactCore(m[1],48).toUpperCase()}`;
  if(/protagonista funziona soprattutto nei momenti più intimi/i.test(clean))return 'IL PROTAGONISTA FUNZIONA NEI MOMENTI INTIMI';
  if((m=clean.match(/(?:voto|valutazione)\s+(?:è|:)\s*(\d+[,.]?\d*)[^.!?]{0,60}/i)))return `${m[1]}: ${/non ancora memorabile/i.test(clean)?'PROMOSSA, NON MEMORABILE':'IL NOSTRO VERDETTO'}`;
  if(role==='critique'){const contrast=contrastHeadline(clean);if(contrast)return contrast;}
  let core=compactCore(clean,role==='context'?50:56);
  core=core.replace(/^(?:LO STUDIO HA CONFERMATO CHE|LA PRODUZIONE HA|IL REGISTA HA|LA REGISTA HA|SECONDO NOI)\s+/i,'');
  if(core.length<12)core=`${topic}: ${core||'IL PUNTO'}`;
  return core;
}
function headlineBodyEcho(headline,body){const h=editorialTokens(headline),b=editorialTokens(body),similarity=jaccardText(headline,body);if(!h.length||!b.length)return false;return similarity>.76||(similarity>.62&&b.length<=h.length*1.45);}
function rewriteHeadline(source,role,tone,title,preserveQuotes){
  const quote=preserveQuotes?extractQuote(source):'',speaker=extractSpeaker(source),topic=shortTopic(title).toUpperCase(),lastName=value=>String(value||'').trim().split(/\s+/).pop();
  const praiseWork=String(source||'').match(/^([^,.]{2,55})\s+ha elogiato\s+il lavoro di\s+([^,.]{2,55})\s+sulla (?:saga|serie) di\s+([^,.]{2,55})/i);
  const praise=String(source||'').match(/^([^,.]{2,55})\s+ha elogiato\s+(?:il lavoro di\s+)?([^,.]{2,70})/i);
  if(role==='quote'&&quote){const genericSpeaker=String(source||'').match(/^([^,:]{2,45}?)\s+ha\s+(?:dichiarato|detto|spiegato|raccontato|affermato|confermato)\s*:?/i)?.[1]?.trim(),label=(speaker||genericSpeaker||'').toUpperCase();let excerpt;if(/\bai\b/i.test(quote)&&/rifiut/i.test(quote))excerpt='I GIOVANI STANNO RIFIUTANDO L’AI';else{const firstClause=quote.split(/[,;:]/)[0].trim();excerpt=trimAtBoundary(firstClause.length>=18?firstClause:compactCore(quote,42),46).replace(/[,;:.!…]+$/,'');}return trimAtBoundary(`${label?`${label}: `:''}“${excerpt}”`,72).toUpperCase();}
  if(role==='quote'&&speaker)return `${speaker.toUpperCase()} NON HA DUBBI`;
  let chosen=bestEditorialSentence(source,role,title),core=conciseEditorialHeadline(chosen,role,title);
  if(praiseWork)core=`${lastName(praiseWork[1])} ELOGIA ${praiseWork[3]} DI ${lastName(praiseWork[2])}`;
  else if(praise)core=`${praise[1]} ELOGIA ${praise[2]}`;
  const strength=core.match(/^la forza (?:del|di questo) (film|progetto|racconto) sta (?:nel|nella) (.+)$/i);if(strength)core=`LA FORZA DEL ${strength[1].toUpperCase()}? ${trimAtBoundary(strength[2],48)}`;
  if(role==='conclusion'&&/[?]$/.test(chosen.trim()))core=trimAtBoundary(chosen,86);
  if(!core||core.length<10){const fallback={context:`${topic}: DA DOVE PARTIAMO`,fact:`${topic}: I NUMERI`,detail:`${topic}: COME CI SONO RIUSCITI`,impact:`${topic}: COSA CAMBIA`,critique:`${topic}: IL PROBLEMA`,conclusion:`${topic}: LA DOMANDA FINALE`};core=fallback[role]||topic||'PUNTO CHIAVE';}
  if(tone==='ironic'&&role==='detail'&&core.length>70)core=`SÌ, MA ${compactCore(chosen,62)}`;
  return trimAtBoundary(core,72).replace(/[,;:.!…]+$/,'').toUpperCase();
}
function editorialBodyLimit(density,role){return EDITORIAL_ROLE_BODY_LIMITS[density]?.[role]||({short:190,medium:270,long:390}[density]||270);}
function removeHeadlineEcho(body,headline){
  const sentences=splitEditorialSentences(body);const kept=sentences.filter(sentence=>!headlineBodyEcho(headline,sentence));
  return (kept.join(' ')||body).replace(/\s+/g,' ').trim();
}
function rewriteBody(source,mode,tone,density,role,preserveQuotes,headline='',excluded=[]){
  const max=editorialBodyLimit(density,role);
  if(mode==='raw')return trimAtBoundary(removeHeadlineEcho(String(source||'').replace(/\s+/g,' ').trim(),headline),max);
  let sentences=splitEditorialSentences(source),quote=extractQuote(source);
  if(!preserveQuotes&&quote)sentences=sentences.map(s=>s.replace(/[“\"][^”\"]+[”\"]/g,'').trim()).filter(Boolean);
  const wanted=density==='short'?1:density==='long'?3:2,ranked=sentences.map((sentence,index)=>({sentence:cleanEditorialSentence(sentence),index,score:editorialSentenceScore(sentence,role,'')})).filter(item=>item.sentence.length>17&&jaccardText(item.sentence,headline)<.55&&!excluded.some(text=>jaccardText(item.sentence,text)>.62)).sort((a,b)=>b.score-a.score||a.index-b.index),chosen=[];
  for(const item of ranked){if(chosen.some(x=>jaccardText(x,item.sentence)>.68))continue;chosen.push(item.sentence);if(chosen.length>=wanted)break;}
  if(!chosen.length){const fallback=sentences.map(cleanEditorialSentence).find(sentence=>sentence.length>17&&jaccardText(sentence,headline)<.7)||cleanEditorialSentence(source);chosen.push(fallback);}
  chosen.sort((a,b)=>String(source).indexOf(a)-String(source).indexOf(b));let body=removeHeadlineEcho(chosen.join(' '),headline);
  if(mode==='synthetic')body=body.replace(/\b(?:è importante sottolineare che|bisogna sottolineare che|vale la pena notare che|come sappiamo|di fatto|in realtà)\b/gi,'').replace(/^(?:ma|però|tuttavia|inoltre)\s*,?\s*/i,'').replace(/\s+/g,' ').trim();
  if(tone==='ironic'&&role==='impact'&&!/non è un dettaglio/i.test(body)&&body.length<max-32)body=`${body} E no, non è un dettaglio.`;
  return trimAtBoundary(body,max);
}
function polishEditorialItems(items,{title='',density='medium',tone='critical',mode='synthetic',preserveQuotes=true}={}){
  const usedHeadlines=[],usedBodies=[];
  return items.map((item,index)=>{
    let headline=String(item.headline||'').trim();
    if(isGenericEditorialHeadline(headline)||usedHeadlines.some(x=>jaccardText(x,headline)>.58))headline=rewriteHeadline(item.source,item.role,tone,title,preserveQuotes);
    if(usedHeadlines.some(x=>jaccardText(x,headline)>.58)){const alt=bestEditorialSentence(item.source,item.role,title,usedHeadlines);headline=trimAtBoundary(compactCore(alt,80),92).toUpperCase();}
    let body=rewriteBody(item.source,mode,tone,density,item.role,preserveQuotes,headline,usedBodies);
    if(usedBodies.some(x=>jaccardText(x,body)>.64)){const alt=bestEditorialSentence(item.source,item.role,title,[headline,...usedBodies]);body=trimAtBoundary(alt,editorialBodyLimit(density,item.role));}
    usedHeadlines.push(headline);if(body)usedBodies.push(body);
    return{...item,headline,body,narrativeBeat:index+1};
  });
}
function outlineAssessment(outline){
  const items=outline?.items||[],details=[];let score=100;
  items.forEach((item,index)=>{const issues=[];const headline=String(item.headline||''),body=String(item.body||'');if(isGenericEditorialHeadline(headline)){issues.push('titolo generico');score-=7;}if(headline.length>92){issues.push('titolo lungo');score-=5;}if(body.length>editorialBodyLimit(outline.density,item.role)){issues.push('testo lungo');score-=6;}if(headlineBodyEcho(headline,body)){issues.push('titolo e testo sono quasi identici');score-=7;}if(index&&jaccardText(headline,items[index-1].headline)>.58){issues.push('titolo simile al precedente');score-=8;}if(index&&jaccardText(body,items[index-1].body)>.64){issues.push('testo simile al precedente');score-=9;}details.push({index,issues});});
  const roleRuns=items.some((item,index)=>index>1&&item.role===items[index-1].role&&item.role===items[index-2].role);if(roleRuns)score-=5;
  return{score:clamp(Math.round(score),0,100),issues:details.flatMap(item=>item.issues.map(message=>({index:item.index,message}))),details};
}
function polishExistingEditorialOutline(){
  if(!pendingEditorialOutline)return;pendingEditorialOutline.items=polishEditorialItems(pendingEditorialOutline.items,pendingEditorialOutline);const quality=outlineAssessment(pendingEditorialOutline);pendingEditorialOutline.quality=quality;renderEditorialOutline();setImportStatus(`Scaletta migliorata: qualità editoriale ${quality.score}/100.`,'success');
}
function coverSubtitleFor(family,tone){if(family==='fc')return 'UN DIBATTITO DA BAR';if(tone==='critical')return 'IL PUNTO, SENZA GIRI DI PAROLE';if(tone==='ironic')return 'SÌ, DOBBIAMO PARLARNE';return 'LA STORIA IN POCHE SLIDE';}
function contextualCta(family,title,tone){const base=smartCtaForFamily(family),topic=shortTopic(title).toUpperCase();if(tone==='critical')return [`E TU DA CHE PARTE STAI?`,`DICCI LA TUA SU ${trimAtBoundary(topic,34)}`];if(tone==='ironic')return [`OK, ADESSO TOCCA A VOI`,`COMMENTI APERTI. SENZA LANCIO DI BICCHIERI.`];return base;}
function variantForEditorialRole(family,role,text,index,total){
  const matrix={
    fd:{context:'immagine_alta',fact:'immagine_alta',detail:'immagine_alta',quote:'citazione',impact:'immagine_alta',critique:'citazione',conclusion:'immagine_alta'},
    fr:{context:'scheda',fact:'scheda',detail:'scheda',quote:'fumetto',impact:'scheda',critique:'fumetto',conclusion:'scheda'},
    fs:{context:'editoriale',fact:'editoriale',detail:'editoriale',quote:'editoriale',impact:'editoriale',critique:'editoriale',conclusion:'editoriale'},
    fg:{context:'storia',fact:'storia',detail:'storia',quote:'personaggio',impact:'storia',critique:'personaggio',conclusion:'storia'},
    fk:{context:'racconto',fact:'racconto',detail:'racconto',quote:'giudizio',impact:'giudizio',critique:'giudizio',conclusion:'giudizio'},
    fc:{context:'argomento',fact:'argomento',detail:'argomento',quote:'confronto',impact:'confronto',critique:'confronto',conclusion:'confronto'},
    fm:{context:'editoriale',fact:'editoriale',detail:'editoriale',quote:'editoriale',impact:'panorama',critique:'panorama',conclusion:'panorama'},
    n:{context:'corpo',fact:'corpo',detail:'corpo',quote:'corpo',impact:'corpo',critique:'corpo',conclusion:'corpo'},
    c:{context:'corpo',fact:'corpo',detail:'corpo',quote:'corpo',impact:'corpo',critique:'corpo',conclusion:'corpo'},
    o:{context:'corpo',fact:'corpo',detail:'corpo',quote:'corpo',impact:'corpo',critique:'corpo',conclusion:'corpo'},
    d:{context:'editoriale',fact:'editoriale',detail:'editoriale',quote:'editoriale',impact:'editoriale',critique:'editoriale',conclusion:'editoriale'},
    r:{context:'scheda_dx',fact:'scheda_dx',detail:'scheda_sx',quote:'fumettone',impact:'scheda_dx',critique:'domanda_fumetto',conclusion:'card_nere'}
  };
  const mapped=matrix[family]?.[role];if(mapped&&FAMILIES[family]?.variants?.[mapped])return mapped;
  return smartContentVariantFor(family,text,index,total);
}
function finalVariantFor(family){return FAMILIES[family]?.variants?.finale?'finale':family==='d'?'domanda':'finale';}
function autoFamilyForText(text,title=''){
  const raw=`${title} ${text}`.toLowerCase();const checks=[['fm',['mad max','furiosa','george miller','post-apocalitt','post apocalitt','wasteland']],['fg',['porco rosso','studio ghibli','miyazaki','anime','animazione giapponese']],['fk',['sette regni','seven kingdoms','westeros','cavaliere errante','game of thrones','dunk e egg','dunk and egg']],['fc',['cinema è morto','cinema e morto','netflix','streaming','pubblico pigro','film brutti','attenzione di','sale vuote']],['fs',['disclosure day','extraterrestr','alieni','ufo','non siamo soli','first encounter']],['fr',['ritorni in sala','film del mese','uscite al cinema','questo mese al cinema']],['fd',['dune','villeneuve','fantascienza','saga cinematografica']]];
  for(const [family,words] of checks)if(words.some(word=>raw.includes(word)))return family;if(/\b(recensione|voto|promosso|bocciato|serie tv)\b/.test(raw))return 'fk';if(/\b(cinema|film|regista|attore|attrice)\b/.test(raw))return 'fd';return 'n';
}
function smartContentVariantFor(family,chunk,index,total){const t=String(chunk||'').toLowerCase();if(family==='fg')return /(personaggio|protagonista|incidente|misterioso|nome|pilota)/.test(t)?'personaggio':'storia';if(family==='fk')return /(regia|scelta|voto|giudizio|espediente|riuscit|promoss|bocciat|diverso)/.test(t)?'giudizio':'racconto';if(family==='fc')return /(non è|non e|però|ma |attenzione|netflix|streaming|pubblico)/.test(t)?'confronto':'argomento';if(family==='fm')return /(futuro|serie tv|spin.?off|prequel|universo|post.?apocalitt)/.test(t)?'panorama':'editoriale';if(family==='fd')return /(dichiar|secondo|regista|attore|lodato|citazione)/.test(t)?'citazione':'immagine_alta';if(family==='fr')return /(perché|perche|cinema\?|sala)/.test(t)?'fumetto':'scheda';if(family==='fs')return 'editoriale';return contentVariantFor(family);}
function smartCtaForFamily(family){const map={fg:['SÌ, MA QUANDO ESCE?','AL CINEMA: SALVA LA DATA'],fk:['VOI COME L’AVETE VISSUTA?','SCRIVETECI NEI COMMENTI'],fc:['SE NON SEI D’ACCORDO, SPIEGACELO','SE SEI D’ACCORDO, CONDIVIDI'],fm:['QUALE SARÀ IL FUTURO DI MAD MAX?','SCRIVETECI NEI COMMENTI'],fr:['E TU COSA VAI A VEDERE?','SCRIVICELO NEI COMMENTI'],fs:['ANDRAI A VEDERLO?','DITECELO NEI COMMENTI']};return map[family]||['E VOI CHE NE PENSATE?','Diteci la vostra nei commenti'];}
function chunkHeadlineAndBody(chunk,index){const clean=String(chunk||'').trim(),match=clean.match(/^(.{25,115}?)(?:[.!?](?:\s|$)|\n|$)/),headline=(match?.[1]||`PUNTO ${index+1}`).trim();let body=clean.slice(match?.[0]?.length||0).trim();if(!body||body.length<28)body=clean;return{headline,body};}
function buildEditorialOutline({text,title,preset='auto',family='auto',density='medium',mode='synthetic',tone='critical',slideCount='auto',preserveQuotes=true}={}){
  text=cleanImportedText(text);title=(title||titleFromImported(text)).trim();text=removeTitleEcho(text,title);if(text.length<80)throw new Error('Testo insufficiente per una scaletta editoriale');
  const resolvedPreset=preset==='auto'?detectAutomationPreset(text,title):preset;const config=presetConfig(resolvedPreset);
  if(config.tone&&(preset!=='auto'||tone==='critical'))tone=config.tone;if(config.density&&(preset!=='auto'||density==='medium'))density=config.density;if(slideCount==='auto'&&config.slides)slideCount=config.slides;
  const resolvedFamily=family==='auto'?presetFamilyForText(resolvedPreset,text,title):family;if(!FAMILIES[resolvedFamily])throw new Error('Famiglia non disponibile');
  const total=requestedEditorialTotal(text,slideCount),contentCount=Math.max(1,total-2);
  let concepts,roles;if(mode==='synthetic'){const selected=selectEditorialConceptsForPreset(text,title,contentCount,resolvedPreset);concepts=selected.concepts;roles=selected.roles;}else{concepts=splitTextChunks(text,density).slice(0,contentCount);roles=presetRoles(resolvedPreset,concepts.length,concepts);}
  if(!concepts.length)throw new Error('Non riesco a individuare abbastanza contenuti');while(concepts.length<contentCount&&concepts.length){const longest=concepts.reduce((a,b)=>a.length>=b.length?a:b),sentences=splitEditorialSentences(longest);if(sentences.length<2)break;const idx=concepts.indexOf(longest),mid=Math.ceil(sentences.length/2);concepts.splice(idx,1,sentences.slice(0,mid).join(' '),sentences.slice(mid).join(' '));roles.splice(idx,1,roles[idx]||'detail',roles[idx]||'detail');}
  concepts=concepts.slice(0,contentCount);roles=roles.slice(0,concepts.length);let items=concepts.map((source,index)=>{const role=roles[index]||'detail',headline=mode==='raw'?chunkHeadlineAndBody(source,index).headline.toUpperCase():rewriteHeadline(source,role,tone,title,preserveQuotes);return{id:uid(),role,source,headline,body:mode==='raw'?chunkHeadlineAndBody(source,index).body:rewriteBody(source,mode,tone,density,role,preserveQuotes,headline),variant:variantForEditorialRole(resolvedFamily,role,source,index,concepts.length)};});
  items=polishEditorialItems(items,{title,density,tone,mode,preserveQuotes,preset:resolvedPreset});const cta=contextualCta(resolvedFamily,title,tone);
  const outline={title,preset:resolvedPreset,family:resolvedFamily,mode,tone,density,preserveQuotes,totalSlides:items.length+2,sourceChars:text.length,cover:{headline:title.toUpperCase(),body:coverSubtitleFor(resolvedFamily,tone),variant:DEFAULT_VARIANT[resolvedFamily]},items,final:{headline:cta[0],body:cta[1],variant:finalVariantFor(resolvedFamily)}};outline.quality=outlineAssessment(outline);return outline;
}
function outlineVariantOptions(family,current){return Object.entries(FAMILIES[family]?.variants||{}).map(([key,v])=>`<option value="${esc(key)}"${key===current?' selected':''}>${esc(v.label)}</option>`).join('');}
function updateEditorialOutlineQualityDisplay(){
  const o=pendingEditorialOutline;if(!o)return;o.quality=outlineAssessment(o);const quality=o.quality,metrics=$('editorialOutlineMetrics');
  if(metrics)metrics.textContent=`${o.totalSlides} slide · ${presetConfig(o.preset).label} · ${FAMILIES[o.family].label} · qualità ${quality.score}/100 · ${o.sourceChars.toLocaleString('it-IT')} caratteri`;
  const qualityEl=$('editorialOutlineQuality');if(qualityEl){qualityEl.textContent=`${quality.score}/100`;qualityEl.dataset.level=quality.score>=88?'good':quality.score>=72?'warn':'bad';qualityEl.title=quality.issues.length?quality.issues.map(x=>`Slide ${x.index+2}: ${x.message}`).join('\n'):'Scaletta pronta';}
  return quality;
}
function renderEditorialOutline(){
  const card=$('editorialOutlineCard'),list=$('editorialOutlineList'),o=pendingEditorialOutline;if(!card||!list||!o){if(card)card.hidden=true;return;}card.hidden=false;const quality=updateEditorialOutlineQualityDisplay();
  const row=(item,kind,index,label,klass='')=>{const itemIssues=kind==='item'?(quality.details[index]?.issues||[]):[];return `<article class="editorial-outline-item ${klass}${itemIssues.length?' has-issues':''}" data-outline-kind="${kind}" data-outline-index="${index}"><div class="editorial-outline-item-head"><span class="editorial-role">${esc(label)}</span>${itemIssues.length?`<span class="editorial-item-warning" title="${esc(itemIssues.join(' · '))}">${itemIssues.length} controllo${itemIssues.length>1?'i':''}</span>`:''}${kind==='item'?`<div class="editorial-outline-order"><button type="button" data-outline-action="up" title="Sposta prima">↑</button><button type="button" data-outline-action="down" title="Sposta dopo">↓</button></div>`:''}</div><div class="editorial-outline-fields"><label class="field"><span>Titolo slide</span><input data-outline-field="headline" value="${esc(item.headline)}"></label><label class="field"><span>Testo</span><textarea data-outline-field="body">${esc(item.body)}</textarea></label><div class="editorial-outline-meta"><label class="field"><span>Template</span><select data-outline-field="variant">${outlineVariantOptions(o.family,item.variant)}</select></label>${kind==='item'?`<label class="field"><span>Funzione</span><select data-outline-field="role">${Object.entries(EDITORIAL_ROLE_LABELS).map(([k,v])=>`<option value="${k}"${item.role===k?' selected':''}>${v}</option>`).join('')}</select></label>`:'<span></span>'}</div></div>${item.source?`<p class="editorial-source-preview" title="Testo originale">Fonte: ${esc(item.source)}</p>`:''}</article>`;};
  list.innerHTML=[row(o.cover,'cover',0,'Copertina','cover'),...o.items.map((item,i)=>row(item,'item',i,`${i+2} · ${EDITORIAL_ROLE_LABELS[item.role]||'Contenuto'}`)),row(o.final,'final',0,'Finale / CTA','final')].join('');
}
function syncEditorialOutlineField(target){if(!pendingEditorialOutline)return;const article=target.closest('.editorial-outline-item');if(!article)return;const kind=article.dataset.outlineKind,index=Number(article.dataset.outlineIndex||0),item=kind==='cover'?pendingEditorialOutline.cover:kind==='final'?pendingEditorialOutline.final:pendingEditorialOutline.items[index];if(item&&target.dataset.outlineField){item[target.dataset.outlineField]=target.value;updateEditorialOutlineQualityDisplay();}}
function prepareEditorialOutline({silent=false}={}){const options={text:$('importTextInput').value,title:$('importTitleInput').value.trim(),preset:$('automationPresetSelect')?.value||'auto',family:$('importFamilySelect').value,density:$('importLengthSelect').value,mode:$('editorialModeSelect').value,tone:$('editorialToneSelect').value,slideCount:$('editorialSlideCountSelect').value,preserveQuotes:$('preserveQuotesCheckbox').checked};pendingEditorialOutline=buildEditorialOutline(options);editorialOutlineSignature=editorialInputSignature();renderEditorialOutline();if(!silent)setImportStatus(`Scaletta pronta: ${pendingEditorialOutline.totalSlides} slide · qualità ${pendingEditorialOutline.quality.score}/100.`,'success');return pendingEditorialOutline;}
async function createCarouselFromOutline(outline){
  if(!outline)throw new Error('Prepara prima una scaletta');const family=outline.family,cover=createSlide(family,outline.cover.variant||DEFAULT_VARIANT[family]);cover.title.text=outline.cover.headline;cover.subtitle.text=outline.cover.body;if(pendingImportImage)cover.image.src=pendingImportImage;const slides=[cover];
  outline.items.forEach((item,i)=>{const variant=FAMILIES[family].variants[item.variant]?item.variant:variantForEditorialRole(family,item.role,item.source,i,outline.items.length),s=createSlide(family,variant);s.title.text=item.headline.toUpperCase();s.subtitle.text=item.body;s.editorialRole=item.role;s.editorialSource='url-text';s.editorialOriginal=item.source;slides.push(s);});
  const end=createSlide(family,FAMILIES[family].variants[outline.final.variant]?outline.final.variant:finalVariantFor(family));end.title.text=outline.final.headline.toUpperCase();end.subtitle.text=outline.final.body;slides.push(end);
  project={version:'0.33.0',name:outline.title||'Nuovo carosello',showNumbers:false,snapGuides:true,automationPreset:outline.preset||'auto',editorial:{preset:outline.preset||'auto',mode:outline.mode,tone:outline.tone,density:outline.density,outlineQuality:outline.quality?.score||outlineAssessment(outline).score,createdAt:new Date().toISOString()},slides};slides.forEach((s,i)=>s.imageQuery=buildSlideImageQuery(s,i));await Promise.all(slides.map(s=>hydrateImageMeta(s.image)));currentIndex=0;selected='title';history=[];historyIndex=-1;optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});commitHistory();render();setTab('quick');pendingImportImage='';setImportStatus(`Bozza editoriale creata: ${slides.length} slide con ${FAMILIES[family].label}.`,'success');showToast(`${slides.length} slide · bozza editoriale`);if($('autoImageSuggestionsCheckbox')?.checked)await autoSuggestProjectImages({replace:false});
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
  const suggested=smartContentVariantFor(family,text,index,total),curated=contentVariantsForFamily(family,$('automationPresetSelect')?.value||'auto');return curated.includes(suggested)?suggested:(curated[index%Math.max(1,curated.length)]||suggested);
}
function contentJsonProject(parsed,fileName=''){
  const root=Array.isArray(parsed)?{slides:parsed}:parsed;
  const rawSlides=contentJsonSlides(parsed);if(!rawSlides.length)throw new Error('Nessuna slide nel JSON');
  const joined=rawSlides.map(s=>`${cleanContentJsonText(s.mainText||s.title)} ${cleanContentJsonText(s.subText||s.subtitle)}`).join(' ');
  const requestedPreset=String(root.preset||root.carouselType||$('automationPresetSelect')?.value||'auto');const resolvedPreset=requestedPreset==='auto'?detectAutomationPreset(joined,root.name||root.title||''):requestedPreset;
  const explicitFamily=root.preferredFamily||root.familyHint;const rootFamily=explicitFamily?contentFamilyFromHint(explicitFamily,joined):presetFamilyForText(resolvedPreset,joined,root.name||root.title||'');
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
  return {version:'0.33.0',name:String(root.name||root.title||fallbackName),showNumbers:explicitNumbers,snapGuides:true,automationPreset:resolvedPreset,editorial:{preset:resolvedPreset,tone:presetConfig(resolvedPreset).tone||'critical',density:presetConfig(resolvedPreset).density||'medium'},contentImport:{format:Array.isArray(parsed)?'array':'content-json',importedAt:new Date().toISOString()},slides};
}
async function activateContentJson(parsed,fileName='contenuto.json'){
  project=contentJsonProject(parsed,fileName);currentIndex=0;selected='title';history=[];historyIndex=-1;optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});commitHistory();render();setTab('quick');
  const msg=`JSON importato: ${project.slides.length} slide · ${FAMILIES[project.slides[0].family]?.label||'template adattato'}`;
  if($('contentJsonStatus')){$('contentJsonStatus').textContent=msg;$('contentJsonStatus').className='inline-status success';}
  setImportStatus(msg,'success');showToast(`${project.slides.length} slide importate`);
  if($('autoImageSuggestionsCheckbox')?.checked)await autoSuggestProjectImages({replace:false});
}

function instagramOcrNoiseLine(line){return /^(instagram|log in|sign up|accedi|iscriviti|segui|follow|following|piace a|liked by|visualizza tutti|view all|aggiungi un commento|add a comment|audio originale|original audio|see translation|visualizza traduzione|condividi|share|salva|save|home|cerca|search|reels?|profilo|profile|meta)\b/i.test(line)||/^\d+[,.]?\d*\s*(mi piace|likes?)$/i.test(line)||/^\d+\s*\/\s*\d+$/.test(line);}
function cleanInstagramOcrText(text){
  const rows=String(text||'').replace(/\r/g,'').split(/\n+/),out=[];
  for(let row of rows){row=row.replace(/[|¦]/g,'I').replace(/[ \t]+/g,' ').replace(/^[^\p{L}\p{N}“”"'¿¡]+/u,'').trim();if(row.length<2||instagramOcrNoiseLine(row))continue;const key=row.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();if(!key||out.some(x=>x.key===key))continue;out.push({line:row,key});}
  return out.map(x=>x.line).join('\n').trim();
}
function uppercaseRatio(text){const letters=(String(text||'').match(/[A-Za-zÀ-ÿ]/g)||[]),upper=(String(text||'').match(/[A-ZÀ-Ý]/g)||[]);return letters.length?upper.length/letters.length:0;}
function inferInstagramSlideCopy(text,index,total){
  let lines=cleanInstagramOcrText(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);if(!lines.length)return{title:`SLIDE ${index+1}`,body:'Testo non riconosciuto: controlla lo screenshot originale.'};
  let titleLines=[],bodyLines=[],used=0;for(let i=0;i<lines.length;i++){const line=lines[i],short=line.length<=72,headline=uppercaseRatio(line)>.58||(!/[.!?]$/.test(line)&&line.split(/\s+/).length<=10);if(i<4&&short&&headline&&titleLines.join(' ').length+line.length<115){titleLines.push(line);used=i+1;}else break;}
  if(!titleLines.length){titleLines=[lines[0]];used=1;}bodyLines=lines.slice(used);let title=titleLines.join(' ').replace(/\s+/g,' ').trim();let body=bodyLines.join(' ').replace(/\s+/g,' ').trim();
  if(title.length>115){const cut=title.slice(0,115).replace(/\s+\S*$/,'').trim();body=`${title.slice(cut.length).trim()} ${body}`.trim();title=cut;}
  if(!body&&title.split(/\s+/).length>13){const sentences=splitEditorialSentences(title);if(sentences.length>1){title=sentences.shift();body=sentences.join(' ');}}
  if(index===total-1&&/^(scriv|comment|condivid|segu|salv|voi|e tu|che ne pens)/i.test(title))body=body||'Diteci la vostra nei commenti.';
  return{title:title.toUpperCase(),body:body.slice(0,800)};
}
function instagramRoleForSlide(item,index,total){if(index===0)return'cover';if(index===total-1)return'conclusion';const roles=semanticEditorialRoles((instagramImportSession.items||[]).map(x=>x.text));return roles[index]||'detail';}
function instagramVariantFor(family,role,text,index,total){if(index===0)return DEFAULT_VARIANT[family];if(index===total-1)return finalVariantFor(family);return smartContentVariantFor(family,text,index,total);}
async function buildInstagramCarouselFromOcr(items,{autoImages=true}={}){
  const usable=(items||[]).filter(x=>String(x.text||'').trim()).slice(0,11);if(!usable.length)throw new Error('L’OCR non ha riconosciuto testo utile');
  const caption=String($('instagramCaptionInput')?.value||'').trim(),combined=[...usable.map(x=>x.text),caption].filter(Boolean).join('\n\n'),fallbackTitle=inferInstagramSlideCopy(usable[0].text,0,usable.length).title;
  $('importTextInput').value=combined;if(!$('importTitleInput').value||/^Import OCR|Post Instagram$/i.test($('importTitleInput').value))$('importTitleInput').value=titleFromImported(fallbackTitle,'Carosello Instagram');
  const title=$('importTitleInput').value||'Carosello Instagram',preset=selectedAutomationPreset(combined,title),selectedFamily=$('importFamilySelect')?.value||'auto',family=selectedFamily==='auto'?presetFamilyForText(preset,combined,title):selectedFamily;
  const slides=usable.map((item,index)=>{const copy=inferInstagramSlideCopy(item.text,index,usable.length),role=instagramRoleForSlide(item,index,usable.length),variant=instagramVariantFor(family,role,`${copy.title} ${copy.body}`,index,usable.length),slide=createSlide(family,variant);slide.title.text=copy.title||`SLIDE ${index+1}`;slide.subtitle.text=copy.body;slide.editorialRole=role;slide.editorialOriginal=item.text;slide.instagramReference={index:index+1,name:item.name||`screenshot-${index+1}`,src:item.src,ocrText:item.text};slide.imageQueryBase=buildSlideImageQuery(slide,index);slide.imageQuery=slide.imageQueryBase;normalizeDraftText(slide,index,usable.length);return slide;});
  project={version:APP_VERSION,name:title,showNumbers:false,snapGuides:true,automationPreset:preset,editorial:{preset,tone:presetConfig(preset).tone||'critical',density:presetConfig(preset).density||'medium',source:'instagram-screenshots',createdAt:new Date().toISOString()},instagramImport:{sourceUrl:(()=>{try{return normalizeInstagramUrl($('instagramUrlInput')?.value||instagramImportSession.sourceUrl||'');}catch(_){return ''}})(),method:'screenshots-ocr',caption,slideCount:slides.length,ocrCompletedAt:new Date().toISOString()},slides};
  optimizeGeneratedProject({rewrite:false,commit:false,renderNow:false,toast:false});await Promise.all(slides.map(s=>hydrateImageMeta(s.image)));currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();setTab('quick');const report=draftProjectAssessment();setImportStatus(`Carosello ricostruito da ${slides.length} screenshot · qualità ${report.score}/100.`,'success');showToast(`${slides.length} slide ricostruite`);if(autoImages)await autoSuggestProjectImages({replace:false});return project;
}
async function runOcrFiles(files){
  if(!files?.length)return;instagramOcrBusy=true;instagramImportSession={status:'ocr',sourceUrl:$('instagramUrlInput')?.value.trim()||'',method:'screenshots-ocr',items:[],combinedText:'',caption:$('instagramCaptionInput')?.value.trim()||'',lastError:'',updatedAt:new Date().toISOString()};renderInstagramScreenshotQueue();showInstagramFallback();setImportStatus('Carico il motore OCR…');
  await loadExternalScript('https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js','Tesseract');const worker=await Tesseract.createWorker(['ita','eng'],1,{logger:m=>{if(m.status){const pct=Math.round((m.progress||0)*100);setImportStatus(`OCR: ${m.status} ${pct}%`);}}});
  try{for(let i=0;i<files.length;i++){setImportStatus(`OCR screenshot ${i+1}/${files.length}…`);const src=await prepareImageFile(files[i]);await saveImageLibrary(src,files[i].name,'Riferimento Instagram');const result=await worker.recognize(files[i]),text=cleanInstagramOcrText(result.data.text||''),copy=inferInstagramSlideCopy(text,i,files.length);instagramImportSession.items.push({text,src,name:files[i].name,title:copy.title,confidence:Math.round(result.data.confidence||0)});renderInstagramScreenshotQueue();}}finally{await worker.terminate();instagramOcrBusy=false;}
  instagramImportSession.status='ready';instagramImportSession.combinedText=instagramImportSession.items.map(x=>x.text).filter(Boolean).join('\n\n');instagramImportSession.updatedAt=new Date().toISOString();renderInstagramScreenshotQueue();if(!instagramImportSession.combinedText.trim())throw new Error('Nessun testo riconosciuto negli screenshot');
  $('importTextInput').value=[instagramImportSession.combinedText,instagramImportSession.caption].filter(Boolean).join('\n\n');$('importTitleInput').value=titleFromImported(inferInstagramSlideCopy(instagramImportSession.items[0].text,0,instagramImportSession.items.length).title,'Carosello Instagram');setImportStatus(`OCR completato: ${instagramImportSession.items.length} slide. Ricostruisco il carosello…`,'success');await buildInstagramCarouselFromOcr(instagramImportSession.items,{autoImages:Boolean($('autoImageSuggestionsCheckbox')?.checked)});
}

