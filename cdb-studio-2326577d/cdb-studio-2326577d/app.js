'use strict';




function renderCanvasOnly(){
  const svg=buildSvg(currentSlide(),{suffix:'main'});
  canvas.innerHTML=svg.replace(/^<svg[^>]*>|<\/svg>$/g,'');
  drawSelection();
}
function render({filmstrip=true,collections=true}={}){
  renderCanvasOnly();if(filmstrip)renderFilmstrip();syncControls();renderQuickPanel();syncCropControls();renderVariantControls();renderTemplateShapeEditor();if(collections){renderImageLibrary();renderPersonalTemplates();}renderCurrentImageSource();renderFreeTextList();renderOverlayList();renderLayers();renderQualityPanel();updateQuickSelectionUI();updateUiMode();
  $('slideCounter').textContent=`${currentIndex+1} / ${project.slides.length}`;
  $('prevSlideBtn').disabled=currentIndex===0;$('nextSlideBtn').disabled=currentIndex===project.slides.length-1;
  $('deleteSlideBtn').disabled=project.slides.length===1;$('moveLeftBtn').disabled=currentIndex===0;$('moveRightBtn').disabled=currentIndex===project.slides.length-1;updateUndoRedo();
}
function renderFilmstrip(){
  const strip=$('filmstrip'),existing=[...strip.children];
  project.slides.forEach((slide,index)=>{const signature=JSON.stringify([slide.id,slide.family,slide.variant,slide.approved,slide.title,slide.subtitle,slideAssetKey(slide),slide.image?.crop,slide.palette,slide.layerOrder,slide.layerState,slide.freeTexts,slide.overlays,qualityBadgeHtml(index)]);let b=existing[index];if(!b||b.dataset.slideId!==slide.id){b=document.createElement('button');b.type='button';b.addEventListener('click',()=>{currentIndex=project.slides.findIndex(item=>item.id===b.dataset.slideId);selected='title';render({collections:false});});if(existing[index])strip.insertBefore(b,existing[index]);else strip.appendChild(b);}b.dataset.slideId=slide.id;b.className=`thumb${index===currentIndex?' active':''}${slide.approved?' approved':''}`;if(b.dataset.signature!==signature){b.innerHTML=`${buildSvg(slide,{suffix:`thumb${slide.id}`})}<span class="thumb-number">${index+1}</span>${slide.approved?'<span class="thumb-approved">✓</span>':''}${qualityBadgeHtml(index)}`;b.dataset.signature=signature;}});
  while(strip.children.length>project.slides.length)strip.lastElementChild.remove();
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
function setTab(name,{scrollTop=false}={}){
  activeTab=name;
  document.body.classList.toggle('generator-mode',name==='import');
  document.body.dataset.activeTab=name;
  document.querySelectorAll('[data-tab]').forEach(button=>{
    const active=button.dataset.tab===name;
    button.classList.toggle('active',active);
    if(button.closest('.workflow-tabs')){
      if(active)button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    }
  });
  document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.id===`tab-${name}`));
  if(['import','quick','export'].includes(name))storageSet('cdb-workspace-tab',name);
  updateUiMode();
  if(scrollTop)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
}
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
function updateUiMode(){
  document.body.classList.toggle('advanced-ui',advancedUi);
  const dock=$('advancedDock'),btn=$('uiModeBtn');
  const editorVisible=['quick','content','images','refine','style','layers','template'].includes(activeTab);
  if(dock)dock.hidden=!advancedUi||!editorVisible;
  if(btn){
    btn.classList.toggle('active',advancedUi);
    btn.textContent=advancedUi?'Rapida':'Avanzate';
    btn.title=advancedUi?'Torna alla modalità rapida':'Mostra strumenti avanzati';
    btn.setAttribute('aria-pressed',advancedUi?'true':'false');
  }
}
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
  else if(key==='image'){if(slide.image?.src){slide.image.src='';slide.imageSource='';slide.imageAssetKey='';slide.imageProvider='';slide.imageLicense='';slide.imageAttribution='';slide.imageRights='';slide.image.crop=cropDefaults();removed=true;message='Immagine rimossa';}}
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
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab,{scrollTop:Boolean(button.closest('.workflow-tabs'))})));document.querySelectorAll('[data-open-advanced]').forEach(button=>button.addEventListener('click',()=>{advancedUi=true;localStorage.setItem('cdb-advanced-ui','1');updateUiMode();setTab(button.dataset.openAdvanced);}));$('reviewQueueDetails')?.addEventListener('toggle',event=>{if(event.isTrusted)event.currentTarget.dataset.userChoice='1';});
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
$('avoidDuplicateImagesCheckbox')?.addEventListener('change',e=>{avoidDuplicateImages=e.target.checked;storageSet('cdb-avoid-duplicate-images',avoidDuplicateImages?'1':'0');renderSearchResults();showToast(avoidDuplicateImages?'Duplicati evitati nell’automatismo':'Duplicati consentiti');});$('cautiousImageModeCheckbox')?.addEventListener('change',e=>{cautiousImageMode=e.target.checked;storageSet('cdb-cautious-image-mode',cautiousImageMode?'1':'0');showToast(cautiousImageMode?'Modalità prudente: solo Commons':'Ricerca automatica completa');});
$('showNumbersInput')?.addEventListener('change',e=>{project.showNumbers=e.target.checked;render();commitHistory();});
$('imageInput').addEventListener('change',async e=>{const files=[...(e.target.files||[])];if(!files.length)return;try{showToast('Preparo le immagini…');let first='';for(const file of files){const src=await prepareImageFile(file);await saveImageLibrary(src,file.name,'dispositivo');if(!first)first=src;}if(first)useImage(first);showToast(`${files.length} immagini aggiunte`);}catch(error){console.error(error);showToast('Immagine non leggibile');}e.target.value='';});
$('removeImageBtn').addEventListener('click',()=>{const slide=currentSlide();slide.image.src='';slide.imageSource='';slide.imageAssetKey='';slide.imageProvider='';slide.imageLicense='';slide.imageAttribution='';slide.imageRights='';layerState(slide,'image').visible=true;render();commitHistory();});
$('searchImagesBtn').addEventListener('click',searchImages);$('imageSearchInput').addEventListener('input',e=>{currentSlide().imageQuery=e.target.value;currentSlide().imageQueryBase=e.target.value;currentSlide().approved=false;markDirty();});$('imageSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchImages();}});$('regenerateImageQueryBtn').addEventListener('click',()=>{currentSlide().imageQueryBase=buildSlideImageQuery(currentSlide(),currentIndex);currentSlide().imageQuery=currentSlide().imageQueryBase;$('imageSearchInput').value=currentSlide().imageQuery;searchImages();});$('suggestCurrentImageBtn').addEventListener('click',async()=>{try{setStatus('Cerco la proposta migliore…');const ok=await proposeImageForSlide(currentSlide(),currentIndex,{replace:true,showResults:true});if(ok){render();commitHistory();setStatus('Proposta inserita. Puoi sceglierne un’altra dai risultati.','success');showToast('Immagine proposta inserita');}else setStatus('Nessuna proposta importabile. Prova a modificare la query.','error');}catch(e){console.error(e);setStatus('Ricerca proposta non riuscita.','error');}});$('suggestAllImagesBtn').addEventListener('click',()=>autoSuggestProjectImages({replace:$('replaceSuggestedImagesCheckbox')?.checked}));
$('openGoogleImagesBtn').addEventListener('click',()=>{const q=$('imageSearchInput').value.trim();window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q||'cinema')}`,'_blank','noopener');});
$('importImageUrlBtn').addEventListener('click',importImageUrl);
$('clearLibraryBtn').addEventListener('click',async()=>{if(!imageLibrary.length)return;if(!confirm('Svuotare l’archivio immagini del dispositivo?'))return;imageLibrary=[];await storeClear('images');renderImageLibrary();});
$('automationPresetSelect')?.addEventListener('change',event=>{const preset=presetConfig(event.target.value);if($('automationPresetHelp'))$('automationPresetHelp').textContent=preset.description;invalidateEditorialOutline();});
document.querySelectorAll('[data-generator-source]').forEach(button=>button.addEventListener('click',()=>setGeneratorSource(button.dataset.generatorSource)));
$('generatorOptionsToggle')?.addEventListener('click',()=>{const body=$('generatorOptionsBody'),open=body?.hidden;if(body)body.hidden=!open;$('generatorOptionsToggle').textContent=open?'Nascondi opzioni':'Personalizza';});
$('generatorRunBtn')?.addEventListener('click',runAutomaticGenerator);
$('automationPresetSelect')?.dispatchEvent(new Event('change'));
$('approveSlideBtn')?.addEventListener('click',toggleSlideApproval);
$('approveAllBtn')?.addEventListener('click',approveAllSlides);
$('regenerateSlideBtn')?.addEventListener('click',regenerateCurrentSlide);
$('improveSlideTextBtn')?.addEventListener('click',improveCurrentSlideText);
$('changeSlideLayoutBtn')?.addEventListener('click',changeCurrentSlideLayout);
$('optimizeDraftBtn')?.addEventListener('click',()=>optimizeGeneratedProject({rewrite:false}));
$('completeDraftBtn')?.addEventListener('click',completeDraftAutopilot);
$('approveStrongSlidesBtn')?.addEventListener('click',()=>approveStrongSlides());
$('nextReviewIssueBtn')?.addEventListener('click',()=>jumpToReviewIssue(1));
$('easyFixDraftBtn')?.addEventListener('click',applyEasyDraftFixes);
setGeneratorSource('url');
$('extractArticleBtn').addEventListener('click',async()=>{try{await tryImportUrl($('articleUrlInput').value.trim(),'article');}catch(e){console.error(e);setImportStatus(`Estrazione non riuscita: ${e.message}. Incolla manualmente il testo.`,'error');}});
$('extractInstagramBtn').addEventListener('click',async()=>{try{await tryImportUrl($('instagramUrlInput').value.trim(),'instagram');}catch(e){console.error(e);showInstagramFallback(e.message);setImportStatus('Lettura diretta non disponibile. Carica gli screenshot o incolla la caption.','warning');}});
$('ocrImagesInput').addEventListener('change',async e=>{const files=[...(e.target.files||[])];try{await runOcrFiles(files);}catch(err){console.error(err);instagramOcrBusy=false;renderInstagramScreenshotQueue();setImportStatus(`OCR non riuscito: ${err.message}`,'error');}e.target.value='';});
$('clearInstagramScreenshotsBtn')?.addEventListener('click',()=>{instagramImportSession={status:'idle',sourceUrl:$('instagramUrlInput')?.value.trim()||'',method:'',items:[],combinedText:'',caption:'',lastError:'',updatedAt:new Date().toISOString()};renderInstagramScreenshotQueue();setImportStatus('Screenshot rimossi.','');});
$('instagramCaptionInput')?.addEventListener('input',e=>{instagramImportSession.caption=e.target.value;});
$('instagramScreenshotQueue')?.addEventListener('click',event=>{const button=event.target.closest('[data-shot-action]'),card=event.target.closest('[data-instagram-shot]');if(!button||!card)return;const index=Number(card.dataset.instagramShot),items=instagramImportSession.items,action=button.dataset.shotAction;if(action==='remove')items.splice(index,1);else{const next=action==='up'?index-1:index+1;if(next>=0&&next<items.length)[items[index],items[next]]=[items[next],items[index]];}instagramImportSession.combinedText=items.map(x=>x.text).join('\n\n');renderInstagramScreenshotQueue();});
$('prepareEditorialOutlineBtn').addEventListener('click',()=>{try{prepareEditorialOutline();}catch(e){setImportStatus(e.message,'error');}});
$('regenerateEditorialOutlineBtn').addEventListener('click',()=>{try{prepareEditorialOutline();}catch(e){setImportStatus(e.message,'error');}});
$('polishEditorialOutlineBtn')?.addEventListener('click',()=>{try{polishExistingEditorialOutline();}catch(e){setImportStatus(e.message,'error');}});
$('createFromTextBtn').addEventListener('click',async()=>{try{await createCarouselFromText();}catch(e){console.error(e);setImportStatus(e.message,'error');}});
$('editorialOutlineList').addEventListener('input',e=>syncEditorialOutlineField(e.target));
$('editorialOutlineList').addEventListener('change',e=>syncEditorialOutlineField(e.target));
$('editorialOutlineList').addEventListener('click',e=>{const b=e.target.closest('[data-outline-action]');if(!b||!pendingEditorialOutline)return;const article=b.closest('.editorial-outline-item'),index=Number(article?.dataset.outlineIndex||0),items=pendingEditorialOutline.items,delta=b.dataset.outlineAction==='up'?-1:1,next=index+delta;if(next<0||next>=items.length)return;[items[index],items[next]]=[items[next],items[index]];renderEditorialOutline();});
['importTextInput','importTitleInput','importFamilySelect','importLengthSelect','editorialModeSelect','editorialToneSelect','editorialSlideCountSelect','preserveQuotesCheckbox'].forEach(id=>$(id).addEventListener('input',invalidateEditorialOutline));



// Modalità rapida: un solo pannello per completare la slide corrente.
const renderQuickFilmstrip=debounce(()=>renderFilmstrip(),220);
const renderQuickText=throttle(()=>{renderCanvasOnly();renderQuickPanel();markDirty();renderQuickFilmstrip();},70);
$('quickTitleInput')?.addEventListener('input',e=>{currentSlide().title.text=e.target.value;currentSlide().approved=false;renderQuickText();});
$('quickSubtitleInput')?.addEventListener('input',e=>{currentSlide().subtitle.text=e.target.value;currentSlide().approved=false;renderQuickText();});
['quickTitleInput','quickSubtitleInput'].forEach(id=>$(id)?.addEventListener('change',()=>{commitHistory();renderFilmstrip();renderQuickPanel();}));
$('quickFamilySelect')?.addEventListener('change',e=>{currentSlide().approved=false;applyTemplate(e.target.value,DEFAULT_VARIANT[e.target.value]);currentSlide().templateLocked=true;renderQuickPanel();});
$('quickVariantSelect')?.addEventListener('change',e=>{currentSlide().approved=false;applyTemplate(currentSlide().family,e.target.value);currentSlide().templateLocked=true;renderQuickPanel();});
$('quickImageQueryInput')?.addEventListener('input',e=>{currentSlide().imageQuery=e.target.value;currentSlide().imageQueryBase=e.target.value;currentSlide().approved=false;markDirty();});
$('quickImageQueryInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('quickOpenAlternativesBtn')?.click();}});
$('quickSuggestImageBtn')?.addEventListener('click',()=>{currentSlide().approved=false;$('suggestCurrentImageBtn')?.click();});
$('quickNextQueryBtn')?.addEventListener('click',()=>{const query=cycleSlideImageQuery(currentSlide(),currentIndex);if($('quickImageQueryInput'))$('quickImageQueryInput').value=query;if($('imageSearchInput'))$('imageSearchInput').value=query;currentSlide().approved=false;markDirty();showToast('Ricerca alternativa pronta');});
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

function guardedOperation(key,label,buttons,action,fallback){return safeAsync(key,()=>runExclusive(key,{buttons,label},action),{fallback});}

$('exportPngBtn').addEventListener('click',()=>withQualityGuard('esportare il PNG',()=>guardedOperation('export-png','Esportazione PNG',[$('exportPngBtn')],async()=>{showToast('Creo il PNG…');const blob=await renderPngBlob(currentSlide());downloadBlob(blob,`${slug(project.name)}-${currentIndex+1}.png`);showToast('PNG pronto');},'PNG non creato. Controlla l’immagine della slide e riprova.')));
$('sharePngBtn').addEventListener('click',()=>withQualityGuard('condividere il PNG',async()=>{try{const blob=await renderPngBlob(currentSlide()),file=new File([blob],`${slug(project.name)}-${currentIndex+1}.png`,{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:project.name});else{downloadBlob(blob,file.name);showToast('Condivisione non disponibile: PNG scaricato');}}catch(e){if(e.name!=='AbortError')showToast('Condivisione non riuscita');}}));
$('exportSvgBtn').addEventListener('click',()=>withQualityGuard('esportare lo SVG',()=>guardedOperation('export-svg','Esportazione SVG',[$('exportSvgBtn')],async()=>{const svg=buildSvg(currentSlide(),{suffix:'export'});downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),`${slug(project.name)}-${currentIndex+1}.svg`);showToast('SVG pronto');},'SVG non creato. Riprova dopo aver ricaricato l’app.')));
$('exportFaithfulSvgBtn').addEventListener('click',()=>withQualityGuard('esportare lo SVG fedele',async()=>{try{showToast('Creo SVG fedele…');await exportFaithfulSvg();showToast('SVG fedele pronto');}catch(e){console.error(e);showToast('Errore SVG fedele');}}));
$('exportPdfBtn').addEventListener('click',()=>withQualityGuard('esportare il PDF',()=>safeAsync('export-pdf',()=>runExclusive('export-pdf',{buttons:[$('exportPdfBtn')],label:'Esportazione PDF'},async()=>{showToast('Carico il motore PDF…');await exportPdf();showToast('PDF pronto');}),{fallback:'PDF non creato. Riprova con meno slide o immagini più leggere.'})));
$('exportAllBtn').addEventListener('click',()=>withQualityGuard('esportare il carosello',()=>guardedOperation('export-zip','Esportazione ZIP',[$('exportAllBtn'),$('quickExportBtn')],async()=>{showToast('Creo il carosello…');const failures=await exportCarouselZip();showToast(failures.length?`ZIP pronto · ${failures.length} slide saltate`:'ZIP pronto');},'ZIP non creato. Riduci le immagini pesanti e riprova.')));
$('exportProjectBtn').addEventListener('click',()=>safeAsync('project-save',()=>runExclusive('project-save',{buttons:[$('exportProjectBtn'),$('shareProjectBtn')],label:'Salvataggio progetto'},()=>savePortableProject()),{fallback:'Progetto non salvato. Controlla lo spazio disponibile.'}));
$('shareProjectBtn')?.addEventListener('click',()=>safeAsync('project-share',()=>runExclusive('project-share',{buttons:[$('exportProjectBtn'),$('shareProjectBtn')],label:'Condivisione progetto'},()=>savePortableProject({share:true})),{fallback:'Condivisione non riuscita. Usa “Salva progetto portatile”.'}));
$('exportLightProjectBtn')?.addEventListener('click',()=>{downloadBlob(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${slug(project.name)}.cdb.json`);projectTransferStatus('Copia JSON leggera salvata: le immagini online potrebbero non essere disponibili su un altro dispositivo.','warning');});
$('exportCompleteBtn')?.addEventListener('click',()=>withQualityGuard('creare il pacchetto completo',()=>guardedOperation('export-package','Creazione pacchetto completo',[$('exportCompleteBtn')],async()=>{showToast('Creo il pacchetto completo…');await exportCompletePackage();showToast('Pacchetto completo pronto');},'Pacchetto non creato. Riduci le immagini pesanti e riprova.')));
$('runQualityBtn')?.addEventListener('click',()=>runQualityCheck());
$('qualityList')?.addEventListener('click',event=>{const button=event.target.closest('[data-quality-index]');if(button&&qualityReport)jumpToQualityIssue(qualityReport.issues[Number(button.dataset.qualityIndex)]);});
$('fixFirstQualityBtn')?.addEventListener('click',()=>{if(qualityReport?.issues?.length)jumpToQualityIssue(qualityReport.issues.find(x=>x.severity==='error')||qualityReport.issues.find(x=>x.severity==='warning')||qualityReport.issues[0]);});
$('qualityFixDialogBtn')?.addEventListener('click',()=>{const issue=qualityReport?.issues?.find(x=>x.severity==='error')||qualityReport?.issues?.find(x=>x.severity==='warning')||qualityReport?.issues?.[0];$('qualityDialog').close();if(issue)jumpToQualityIssue(issue);});
$('qualityContinueBtn')?.addEventListener('click',async()=>{const action=pendingQualityExport;pendingQualityExport=null;$('qualityDialog').close();if(action)await action();});
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

$('runDiagnosticsBtn')?.addEventListener('click',runDiagnostics);
$('copyDiagnosticsBtn')?.addEventListener('click',copyDiagnosticsReport);
$('downloadDiagnosticsBtn')?.addEventListener('click',downloadDiagnosticsReport);
$('refreshAppCacheBtn')?.addEventListener('click',refreshAppCache);

$('projectInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{await importProjectFile(file);}catch(error){console.error(error);projectTransferStatus(`Apertura fallita: ${error?.message||'file non valido'}`,'error');showToast('File progetto non valido');}finally{e.target.value='';}});



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
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js?v=0.33.0').then(r=>r.update()).catch(error=>diagnosticLog('warn','service-worker','Registrazione non riuscita',error));
  try{logoData=await fileToDataUrl('assets/logo.png');}catch(e){console.warn(e);}
  project=await loadState();project.snapGuides=project.snapGuides!==false;templateEditMode=false;advancedUi=false;activeTab=['import','quick','export'].includes(storageGet('cdb-workspace-tab'))?storageGet('cdb-workspace-tab'):'import';tmdbKey=storageGet('cdb-tmdb-key');avoidDuplicateImages=storageGet('cdb-avoid-duplicate-images')!=='0';cautiousImageMode=storageGet('cdb-cautious-image-mode')==='1';if($('tmdbApiKeyInput'))$('tmdbApiKeyInput').value=tmdbKey;if($('avoidDuplicateImagesCheckbox'))$('avoidDuplicateImagesCheckbox').checked=avoidDuplicateImages;if($('cautiousImageModeCheckbox'))$('cautiousImageModeCheckbox').checked=cautiousImageMode;for(const s of project.slides){hydrateImageMeta(s.image).catch(error=>diagnosticLog('warn','image','Metadati immagine non disponibili',error));for(const ov of s.overlays||[])hydrateImageMeta(ov).catch(error=>diagnosticLog('warn','image','Metadati overlay non disponibili',error));}currentIndex=0;selected='title';history=[];historyIndex=-1;commitHistory();render();renderDiagnosticsPanel();setTab(activeTab);document.fonts?.ready.then(()=>render({collections:false})).catch(error=>diagnosticLog('warn','fonts','Font non completamente disponibili',error));
}
window.addEventListener('cdb:unlock',initialize);function renderOverlayList(){const el=$('overlayList');if(!el)return;const list=currentSlide()?.overlays||[];if(!list.length){el.innerHTML='<p class="panel-note">Nessuna foto libera nella slide.</p>';return;}el.innerHTML=list.map(ov=>`<div class="free-text-item${selected===`overlay:${ov.id}`?' active':''}"><button type="button" data-overlay-select="${ov.id}">${esc(ov.name||'Foto libera')}</button><button type="button" data-overlay-delete="${ov.id}">×</button></div>`).join('');el.querySelectorAll('[data-overlay-select]').forEach(b=>b.addEventListener('click',()=>selectElement(`overlay:${b.dataset.overlaySelect}`)));el.querySelectorAll('[data-overlay-delete]').forEach(b=>b.addEventListener('click',()=>{selected=`overlay:${b.dataset.overlayDelete}`;deleteSelectedElement();}));}
async function addOverlayFiles(files){for(const file of [...(files||[])]){const src=await prepareImageFile(file);try{await saveImageLibrary(src,file.name,'Caricata');}catch(error){console.warn('Archivio immagini non disponibile',error);}const ov=overlayDefaults({src,name:file.name});await hydrateImageMeta(ov);currentSlide().overlays=currentSlide().overlays||[];currentSlide().overlays.push(ov);ensureLayerModel(currentSlide());selected=`overlay:${ov.id}`;}render();commitHistory();}
