// ANATOMIQ_TF_ALIGNMENT_WORKBENCH_270 — reversible Écorché adjustment, no mesh reindexing.
export const ALIGNMENT_SCHEMA='anatomiq-muscle-alignment/v1';
export const MUSCLES=Object.freeze(['Left temporalis','Right temporalis','Left frontalis','Right frontalis']);
const MM_LIMIT=30;
const STORE_KEY='anatomiq-tf-workbench-preview-270-v1';
const MODEL_REFERENCE_MM=1700; // displayed mm are proportional to the original model height
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export function emptyAlignment(){
  return {schema:ALIGNMENT_SCHEMA,model:'ecorche.glb',units:'approx_mm_scaled_to_1700mm_body',offsets:Object.fromEntries(MUSCLES.map(name=>[name,[0,0,0]]))};
}
export function validateAlignment(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.schema!==ALIGNMENT_SCHEMA||value.model!=='ecorche.glb'||value.units!=='approx_mm_scaled_to_1700mm_body')throw new Error('Not a compatible Temporalis/Frontalis alignment file.');
  if(!value.offsets||typeof value.offsets!=='object'||Array.isArray(value.offsets))throw new Error('Missing muscle offsets.');
  const valid=new Set(MUSCLES);
  if(Object.keys(value.offsets).some(name=>!valid.has(name)))throw new Error('Unknown muscle target.');
  const result=emptyAlignment();
  for(const name of MUSCLES){
    const offsets=value.offsets[name];
    if(!Array.isArray(offsets)||offsets.length!==3||!offsets.every(n=>finite(n)&&Math.abs(n)<=MM_LIMIT))throw new Error('Invalid X/Y/Z offset for '+name+'.');
    result.offsets[name]=offsets.slice();
  }
  return result;
}
export function localDeltaFromWorld(parent,worldDelta,THREE){
  parent.updateWorldMatrix(true,false);
  const zero=new THREE.Vector3(0,0,0);
  const end=worldDelta.clone();
  parent.worldToLocal(zero);parent.worldToLocal(end);
  return end.sub(zero);
}
function text(tag,value,className){const el=document.createElement(tag);if(className)el.className=className;el.textContent=value;return el;}
function element(tag,className){const el=document.createElement(tag);if(className)el.className=className;return el;}
function button(title,handler,className=''){const el=text('button',title,'tfw-button '+className);el.type='button';el.addEventListener('click',handler);return el;}
function downloadJSON(payload){
  const blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  try{const a=document.createElement('a');a.href=url;a.download='muscle-alignment-270.json';a.style.display='none';document.body.append(a);a.click();a.remove();}
  finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
function serialize(value){return JSON.stringify(value);}

export async function initializeTemporalisFrontalisWorkbench({THREE,structures,sceneRoot,teacherMode,invalidate,focus,report}){
  // ANATOMIQ_TF_WORKBENCH_MENU_REPAIR_270: the menu is now static, never contingent on mesh readiness.
  const launch=teacherMode&&typeof document!=='undefined'?document.getElementById('tfw-open'):null;
  // ANATOMIQ_TF_WORKBENCH_ONDEMAND_REPAIR_270: the app owns both launchers,
  // including clicks before anatomy loading finishes. No generic fallback toast.
  const unavailable=(reason)=>{
    window.__AnatomIQTFOpen=null;
    window.__AnatomIQMuscleAlignmentStatus={ready:false,reason};
    if(launch){
      launch.title='Muscle alignment unavailable: '+reason;
      launch.onclick=()=>report?.('Muscle alignment unavailable: '+reason);
    }
    console.warn('AnatomIQ muscle alignment unavailable:',reason);
    return null;
  };
  if(!sceneRoot||!Array.isArray(structures)||!structures.length)return unavailable('The anatomy model has not loaded.');
  const targetEntries=new Map();
  for(const name of MUSCLES){
    const matches=structures.filter(s=>s.system==='muscular'&&s.mesh&&s.name.toLowerCase()===name.toLowerCase());
    if(matches.length!==1){
      console.warn('AnatomIQ alignment: exact source muscle unavailable',name,matches.length);
      return unavailable('Missing or duplicated source structure: '+name+' ('+matches.length+' matches).');
    }
    targetEntries.set(name,matches[0]);
  }
  // Each original mesh position is retained; effects are reapplied from baseline, never accumulated.
  const baselines=new Map([...targetEntries].map(([name,entry])=>[name,entry.mesh.position.clone()]));
  sceneRoot.updateWorldMatrix(true,true);
  const baseHeight=new THREE.Box3().setFromObject(sceneRoot).getSize(new THREE.Vector3()).y;
  if(!finite(baseHeight)||baseHeight<=0)return unavailable('Source model has an invalid body height.');
  const distancePerMM=baseHeight/MODEL_REFERENCE_MM;
  let published=emptyAlignment();
  try{
    const res=await fetch('./muscle-alignment-270.json?rev=270-tf-workbench-local',{cache:'no-cache'});
    if(res.ok)published=validateAlignment(await res.json());
    else console.warn('AnatomIQ: no published muscle alignment yet; using source geometry.');
  }catch(error){console.warn('AnatomIQ: alignment file unavailable; using unmodified source geometry.',error);}
  let alignment=published;
  let preview=false;
  if(teacherMode){
    try{const stored=localStorage.getItem(STORE_KEY);if(stored){alignment=validateAlignment(JSON.parse(stored));preview=true;}}
    catch(error){console.warn('Ignoring malformed local muscle alignment preview.',error);}
  }
  function apply(){
    for(const name of MUSCLES){
      const mesh=targetEntries.get(name).mesh;
      const original=baselines.get(name);
      const [x,y,z]=alignment.offsets[name];
      const delta=new THREE.Vector3(x,y,z).multiplyScalar(distancePerMM);
      mesh.position.copy(original).add(localDeltaFromWorld(mesh.parent,delta,THREE));
      mesh.updateWorldMatrix(true,false);
    }
    invalidate(3);
  }
  apply();
  window.__AnatomIQMuscleAlignmentStatus={ready:true,source:preview?'local preview':'published file',targets:MUSCLES.length,modelHeightUnits:baseHeight};
  if(!teacherMode)return;
  // Permanent Teacher Studio View-menu command is provided by index.html.
  // Reloading the anatomy must not duplicate the editor or lose the command.
  document.getElementById('tfw-panel')?.remove();
  let current=MUSCLES[0];
  let helper=null;
  if(!launch)return unavailable('The View menu command was not found; check index.html and browser cache.');
  launch.removeAttribute('title');
  // ANATOMIQ_TF_WORKBENCH_ONDEMAND_REPAIR_270: stable open function,
  // independent of DOM nodes replaced by the View-menu implementation.
  window.__AnatomIQTFOpen=()=>{panel.hidden=false;panel.focus();refresh();drawHelper();};
  launch.onclick=window.__AnatomIQTFOpen;
  const panel=element('section','tfw-panel');panel.id='tfw-panel';panel.hidden=true;panel.tabIndex=-1;panel.setAttribute('aria-label','Temporalis and Frontalis adjustment workbench');
  const header=element('div','tfw-header');
  const name=element('div');name.append(text('strong','Muscle Alignment Workbench'),text('small','Temporalis · Frontalis · 2.2.70'));
  const close=button('✕',()=>{panel.hidden=true;clearHelper();},'tfw-close');close.setAttribute('aria-label','Close muscle adjustment workbench');
  header.append(name,close);panel.append(header);
  panel.append(text('p','Move the original muscle meshes while viewing them against the detailed skull. Offsets are global, not chapter edits.','tfw-explain'));
  const selection=element('label','tfw-label');selection.append(text('span','Muscle / side'));
  const picker=element('select','tfw-picker');picker.setAttribute('aria-label','Select muscle and side');
  for(const item of MUSCLES){const option=element('option');option.value=item;option.textContent=item;picker.append(option);}
  selection.append(picker);panel.append(selection);
  const notice=text('div','LOCAL PREVIEW — not published','tfw-notice');panel.append(notice);
  const rows=[];
  for(const [i,axis] of ['X — Left / Right','Y — Up / Down','Z — Front / Back'].entries()){
    const row=element('div','tfw-axis');row.append(text('label',axis,'tfw-axis-name'));
    const controls=element('div','tfw-axis-controls');
    const minus=button('−',()=>nudge(-0.5), 'tfw-nudge');
    const slider=element('input','tfw-range');slider.type='range';slider.min=-MM_LIMIT;slider.max=MM_LIMIT;slider.step=.5;
    const numeric=element('input','tfw-number');numeric.type='number';numeric.min=-MM_LIMIT;numeric.max=MM_LIMIT;numeric.step=.5;numeric.setAttribute('aria-label',axis+' approximate millimetres');
    const plus=button('+',()=>nudge(0.5),'tfw-nudge');
    function set(value){
      if(!finite(value))return;
      value=Math.max(-MM_LIMIT,Math.min(MM_LIMIT,Math.round(value*2)/2));
      alignment.offsets[current][i]=value;
      try{localStorage.setItem(STORE_KEY,serialize(alignment));preview=true;}catch(error){console.warn('Unable to save local alignment preview.',error);}
      apply();notice.textContent='LOCAL PREVIEW — not published';slider.value=String(value);numeric.value=String(value);drawHelper();
    }
    function nudge(amount){set(alignment.offsets[current][i]+amount);}
    slider.addEventListener('input',()=>set(Number(slider.value)));
    numeric.addEventListener('change',()=>set(Number(numeric.value)));
    controls.append(minus,slider,numeric,plus);row.append(controls);rows.push({slider,numeric});panel.append(row);
  }
  panel.append(text('p','Units are approximate millimetres, scaled to the source model’s original body height. Adjust one side at a time.','tfw-small'));
  const actions=element('div','tfw-actions');
  actions.append(
    button('Focus skull + muscle',()=>focus?.([targetEntries.get(current)])),
    button('Reset selected',()=>{alignment.offsets[current]=[0,0,0];save();refresh();}),
    button('Reset all',()=>{alignment=emptyAlignment();save();refresh();}),
    button('Use published alignment',()=>{alignment=validateAlignment(published);try{localStorage.removeItem(STORE_KEY);}catch{}preview=false;apply();refresh();}),
    button('Export alignment JSON',()=>downloadJSON(alignment),'tfw-export')
  );panel.append(actions);
  const pickerImport=element('input','tfw-import-input');pickerImport.type='file';pickerImport.accept='.json,application/json';pickerImport.hidden=true;
  const importBtn=button('Import alignment JSON',()=>pickerImport.click());
  pickerImport.addEventListener('change',async()=>{
    const file=pickerImport.files?.[0];if(!file)return;
    try{alignment=validateAlignment(JSON.parse(await file.text()));save();refresh();report?.('Alignment imported for local preview.');}
    catch(error){report?.('Alignment import failed: '+error.message);}
    finally{pickerImport.value='';}
  });panel.append(importBtn,pickerImport);
  const status=text('p','Export the alignment JSON, then place it in the repository root to publish the approved offsets.','tfw-footnote');panel.append(status);
  document.body.append(panel);
  function drawHelper(){
    clearHelper();if(panel.hidden)return;
    const entry=targetEntries.get(current);
    helper=new THREE.BoxHelper(entry.mesh,0x66d6e9);helper.material.depthTest=false;
    helper.renderOrder=999;(sceneRoot.parent||sceneRoot).add(helper);helper.update();invalidate(2);
  }
  function clearHelper(){if(helper){helper.parent?.remove(helper);helper.geometry.dispose();helper.material.dispose();helper=null;invalidate(2);}}
  function save(){try{localStorage.setItem(STORE_KEY,serialize(alignment));preview=true;}catch{}apply();}
  function refresh(){
    picker.value=current;
    rows.forEach(({slider,numeric},i)=>{slider.value=String(alignment.offsets[current][i]);numeric.value=slider.value;});
    notice.textContent=preview?'LOCAL PREVIEW — not published':'PUBLISHED ALIGNMENT (or source defaults)';
    drawHelper();
  }
  picker.addEventListener('change',()=>{current=picker.value;refresh();});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){panel.hidden=true;clearHelper();}});
  // Make floating workbench draggable without losing access to the 3D model.
  header.addEventListener('pointerdown',event=>{
    if(event.target.closest('button')||event.button!==0)return;
    const rect=panel.getBoundingClientRect();
    panel.style.right='auto';panel.style.left=rect.left+'px';panel.style.top=rect.top+'px';
    const originX=event.clientX,originY=event.clientY,startX=rect.left,startY=rect.top;
    const move=e=>{panel.style.left=Math.max(4,Math.min(innerWidth-100,startX+e.clientX-originX))+'px';panel.style.top=Math.max(4,Math.min(innerHeight-65,startY+e.clientY-originY))+'px';};
    const end=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true});
  });
  refresh();
  return {getAlignment:()=>validateAlignment(alignment),getPublishedAlignment:()=>validateAlignment(published),open:()=>launch.click()};
}
