// AnatomIQ Guided Chapter Activities — local 2.2.69i pilot.
// ANATOMIQ_PAINTED_HOTSPOT_274 — painted multi-bone Label editor and preview-safe drafts.
// No network, analytics, authentication, or model changes.
import {INVESTIGATION_TYPES,INVESTIGATION_ROTATIONS,investigationRotation,validateInvestigation,relationshipPick,revealReady,relationshipReady,rotationSatisfied,paintedHotspotAccepted,labelReady,dissectionProgress,dissectReady} from './investigation-272.mjs?rev=271-hotspot-dissect-carry-278-local'; // ANATOMIQ_INVESTIGATIONS_272
import {migrateLabelPaint,validPaintRegion,addPaintPoint} from './painted-hotspot-274.mjs?rev=271-hotspot-dissect-carry-278-local';
import {hotspotAttemptState,validHotspotAttemptLimit,DEFAULT_NEW_HOTSPOT_ATTEMPTS,restartChapterAnswers} from './hotspot-attempts-277.mjs?rev=271-hotspot-dissect-carry-278-local'; // ANATOMIQ_HOTSPOT_FEEDBACK_277
import {inheritedDissectionIndices,dissectionEvidenceWithCarry} from './dissection-carry-278.mjs?rev=271-hotspot-dissect-carry-278-local'; // ANATOMIQ_DISSECTION_CARRY_278
export const GUIDED_MARKER = 'ANATOMIQ_GUIDED_ACTIVITIES_269J';
import {MUSCLE_GROUP_DEFS} from './muscle-groups-270.mjs?rev=270-native-muscles-local'; // ANATOMIQ_MUSCLE_NATIVE_270
const KNOWN_MUSCLE_GROUP_IDS=new Set(MUSCLE_GROUP_DEFS.map(g=>g.id));
export const GUIDED_TYPES = Object.freeze(['explore','identify','mc','reveal','relationship','label','dissect']);
const MAX_STEPS = 12;
// ANATOMIQ_GUIDED_IDENTIFY_VISIBLE_SEARCH_269J2: pure search helper (no render loop work).
export function searchIdentifyTargets(choices, query){
  const clean=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const term=clean(query);
  return term ? choices.filter(c=>clean(c.label).includes(term)) : choices.slice();
}

export const DEFAULT_ROTATION_DEGREES = 90;
export const ROTATION_CHOICES = Object.freeze([30,60,90,180,360]);
export function requiredRotation(activity){
  return ROTATION_CHOICES.includes(activity?.rotationDegrees) ? activity.rotationDegrees : DEFAULT_ROTATION_DEGREES;
}
// Measures deliberate OrbitControls camera travel around its current target.
// Camera/target translations (panning) and distance changes (zooming) do not count.
// A small angular noise floor avoids crediting rendering jitter. No Three.js dependency.
export function createRotationMeter(required=DEFAULT_ROTATION_DEGREES, initial=0){
  if(!Number.isFinite(required)||required<=0)throw Error('Invalid rotation requirement.');
  let travel=Number.isFinite(initial)?Math.max(0,Math.min(required,initial)):0;
  let active=false,last=null;
  const view=(camera,target)=>{
    if(!camera?.position||!target)return null;
    const x=camera.position.x-target.x,y=camera.position.y-target.y,z=camera.position.z-target.z;
    const size=Math.hypot(x,y,z);return size>1e-8&&Number.isFinite(size)?[x/size,y/size,z/size]:null;
  };
  return {
    begin(camera,target){active=true;last=view(camera,target);},
    change(camera,target){
      if(!active||travel>=required)return travel;
      const next=view(camera,target);if(!next)return travel;
      if(last){
        const dot=Math.max(-1,Math.min(1,last[0]*next[0]+last[1]*next[1]+last[2]*next[2]));
        const degrees=Math.acos(dot)*180/Math.PI;
        // Exclude teleport-like camera jumps, including chapter/camera resets.
        if(degrees>=0.015&&degrees<=35){travel=Math.min(required,travel+degrees);if(travel>=required-1e-6)travel=required;}
      }
      last=next;return travel;
    },
    end(){active=false;last=null;},
    get value(){return travel;},
    get unlocked(){return travel>=required-1e-6;},
    get active(){return active;}
  };
}

const FALLBACK = {free:false,chapters:[]};
const byId = id => document.getElementById(id);
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeText = (value,max,fallback='') => typeof value==='string' ? value.slice(0,max) : fallback;
const uid=()=>`act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
export function normalizeGuided(input, count){
  const src = input && typeof input==='object' && !Array.isArray(input) ? input : FALLBACK;
  return {free: src.free===true,
    chapters:Array.from({length:count},(_,i)=>Array.isArray(src.chapters?.[i])?
      src.chapters[i].map(x=>migrateLabelPaint(structuredClone(x))):[])};
}
export function validateGuided(input, count){
  if(input===undefined)return true;
  if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.free!=='boolean'
     ||!Array.isArray(input.chapters)||input.chapters.length!==count)throw Error('Invalid guided lesson settings.');
  const used=new Set();
  for(const [chapterIndex,steps] of input.chapters.entries()){
    if(!Array.isArray(steps)||steps.length>MAX_STEPS)throw Error('Each chapter supports up to 12 activities.');
    for(const [activityIndex,a] of steps.entries()){
      if(!a||typeof a!=='object'||!GUIDED_TYPES.includes(a.type)||typeof a.id!=='string'
         ||!/^act-[a-zA-Z0-9-]{4,80}$/.test(a.id)||used.has(a.id))throw Error('Invalid activity identity or type.');
      used.add(a.id);
      if(typeof a.title!=='string'||!a.title.trim()||a.title.length>120||
         typeof a.prompt!=='string'||!a.prompt.trim()||a.prompt.length>600||
         typeof a.hint!=='string'||a.hint.length>300||typeof a.feedback!=='string'||a.feedback.length>500)
         throw Error('Invalid activity instructions or feedback.');
      if(INVESTIGATION_TYPES.includes(a.type)){try{validateInvestigation(a); }
        catch(error){throw Error(`Chapter ${chapterIndex+1}, activity ${activityIndex+1} (${a.title||a.type}): ${error.message}`);}}
      if(a.type==='explore'){
        if(!['rotate','self'].includes(a.action))throw Error('Invalid explore action.');
        if(a.rotationDegrees!==undefined&&!ROTATION_CHOICES.includes(a.rotationDegrees))
          throw Error('Choose a valid Explore rotation requirement.');
      }
      if(a.type==='identify' && !(Number.isInteger(a.targetStructure)&&a.targetStructure>=0&&a.targetStructure<2000 &&
        (a.targetGroup===undefined||a.targetGroup===null||typeof a.targetGroup==='string'&&KNOWN_MUSCLE_GROUP_IDS.has(a.targetGroup)&&!a.targetLabel) &&
        (a.targetLabel===null||a.targetLabel===undefined||typeof a.targetLabel==='string'&&/^q-[0-9A-Za-z-]{4,62}$/.test(a.targetLabel))))
        throw Error('Choose a valid structure or teacher label for Identify.');
      if(a.type==='mc' && (!Array.isArray(a.options)||a.options.length<2||a.options.length>4||
          a.options.some(s=>typeof s!=='string'||!s.trim()||s.length>160)||
          !Number.isInteger(a.correct)||a.correct<0||a.correct>=a.options.length))
        throw Error('Multiple choice needs 2–4 answers and one correct selection.');
    }
  }
  return true;
}
export function progressKey(project){
  // Content-derived key: new/edited published lesson won't accidentally inherit old answers.
  const seed=JSON.stringify({t:project.t,guided:project.guided,
    chapters:project.chapters?.map(c=>({t:c.t,f:c.f,n:c.n,labels:c.labels?.map(l=>[l.qi,l.s,l.t])}))});
  let hash=2166136261;
  for(let i=0;i<seed.length;i++){hash^=seed.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return `anatomiq-guided-v1-${(hash>>>0).toString(36)}`;
}
function openDB(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined')return reject(Error('IndexedDB unavailable'));
    const request=indexedDB.open('AnatomIQ-Guided-Progress',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('progress'))request.result.createObjectStore('progress',{keyPath:'key'});};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
}
async function readProgress(key){
  let db;
  try{db=await openDB();return await new Promise((resolve,reject)=>{const req=db.transaction('progress','readonly').objectStore('progress').get(key);
    req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
  catch(error){console.warn('Guided progress storage unavailable:',error);return null;}
  finally{db?.close();}
}
async function writeProgress(record){
  let db;
  try{db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction('progress','readwrite');tx.objectStore('progress').put(record);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});return true;}
  catch(error){console.warn('Could not save guided progress:',error);return false;}
  finally{db?.close();}
}
async function removeProgress(key){
  let db;
  try{db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction('progress','readwrite');tx.objectStore('progress').delete(key);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});return true;}
  catch{return false;}finally{db?.close();}
}
function downloadCompletionPNG(name,title,chapters,done,total,firstTry){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=760;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable on this device.');
  const gradient=ctx.createLinearGradient(0,0,1200,760);gradient.addColorStop(0,'#0e1b29');gradient.addColorStop(1,'#1e3442');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,760);
  ctx.fillStyle='#76d9cc';ctx.fillRect(75,76,8,620);
  ctx.fillStyle='#f1f7fc';ctx.font='bold 39px system-ui, sans-serif';ctx.fillText('AnatomIQ Studio',110,145);
  ctx.font='bold 62px system-ui, sans-serif';ctx.fillText('LESSON COMPLETE',110,260);
  const wrap=(value,x,y,width,size,lineHeight)=>{
    ctx.font=`${size}px system-ui, sans-serif`;
    let line='',lines=0;for(const word of String(value).split(/\s+/)){
      const test=line?line+' '+word:word;if(ctx.measureText(test).width>width&&line){ctx.fillText(line,x,y+lines*lineHeight);lines++;line=word;}
      else line=test;if(lines>=3)break;}
    if(lines<4)ctx.fillText(line,x,y+lines*lineHeight);
  };
  ctx.font='30px system-ui, sans-serif';wrap(title,110,345,950,31,43);
  ctx.fillStyle='#bed0dd';ctx.font='27px system-ui, sans-serif';ctx.fillText(`Student: ${name}`,110,440);
  ctx.fillText(`Chapters: ${chapters}     Activities: ${done}/${total}`,110,510);
  ctx.fillText(`Correct on first attempt: ${firstTry}`,110,555);
  ctx.fillText(`Completed: ${new Date().toLocaleString()}`,110,612);
  ctx.font='20px system-ui, sans-serif';ctx.fillStyle='#97b0bf';
  ctx.fillText('Generated from locally saved activity results · Submit this PNG to Schoology',110,681);
  const anchor=document.createElement('a');anchor.download='AnatomIQ-Lesson-Complete.png';anchor.href=canvas.toDataURL('image/png');
  document.body.append(anchor);anchor.click();anchor.remove();
}

export function createGuidedLessons(api){
  let config=normalizeGuided(null,1),projectKey='',currentProject=null,studentProgress={answers:{},chapter:0},
    ready=false,storageOK=true,orbitMeter=null,orbitActivityId=null,orbitLastShown=-1,feedback='',feedbackGood=false,studentName='',
    teacherMounted=false,studentMounted=false,session=0,investigationCandidate=null,teacherHotspotId=null,paintPreviewId=null,studentHotspotArmed=false,dissectArmed=false; // ANATOMIQ_INVESTIGATIONS_273
  const teacherRoot=byId('anat-guided-teacher');const studentRoot=byId('anat-guided-student');
  const student=()=>!api.isTeacher();
  const steps=(chapter=api.getChapter())=>config.chapters[chapter]||[];
  const allSteps=()=>config.chapters.flat();
  const guided=()=>!config.free && allSteps().length>0;
  const answers=()=>studentProgress.answers||{};
  const completed=a=>!!answers()[a.id]?.done;
  const totals=()=>({total:allSteps().length,done:allSteps().filter(completed).length,
    firstTry:allSteps().filter(a=>answers()[a.id]?.done&&answers()[a.id]?.attempts===1).length});
  function touch(){if(!api.isTeacher())return;api.onTeacherChange();renderTeacher();}
  const teacherPaintActivity=()=>steps().find(step=>step.id===teacherHotspotId&&step.type==='label');
  function stopTeacherPaint(saveStroke=true){
    const wasPainting=!!teacherHotspotId;teacherHotspotId=null;
    if(wasPainting)api.setTeacherPaintMode?.(false);
    if(saveStroke){api.onTeacherChange();renderTeacher();}
  }
  function teacherPaintStatus(message){
    const a=teacherPaintActivity();
    if(!a)return;
    const el=byId('anat-paint-points-'+a.id);
    if(el)el.textContent=message;
  }
  function teacherPaintSample(index,worldPoint,normal=null){
    const a=teacherPaintActivity();
    if(!api.isTeacher()||!a||!worldPoint?.clone)return false;
    // The former getTargets() dropdown gate could silently reject valid surface
    // hits (including painted areas spanning several chapter bones). Instead,
    // check the actual visible chapter structure through the model API.
    if(api.canPaintStructure?.(index)===false){
      teacherPaintStatus('That structure is hidden or unavailable in this chapter. Reveal it and try again.');
      return false;
    }
    const p=api.getStructureLocalPoint?.(index,worldPoint);
    if(!p){teacherPaintStatus('Could not read this bone’s surface coordinates.');return false;}
    const previous=[...(a.paintRegions||[])].reverse().find(x=>x.s===index);
    const spacing=previous?api.getStructureWorldPaintDistance?.(index,previous.p,p):null;
    const result=addPaintPoint(a.paintRegions||[],index,p,a.brushMm||8,normal?.toArray?.()||null,spacing);
    if(result.added){
      a.paintRegions=result.regions;
      api.showTeacherPaintRegions?.(a.paintRegions);
      teacherPaintStatus(`RED PAINT ACTIVE — ${a.paintRegions.length} samples across ${new Set(a.paintRegions.map(s=>s.s)).size} structures`);
    }else if(result.reason==='limit'){
      teacherPaintStatus('Paint limit reached on this structure. Stop painting or clear this area.');
    }else if(result.reason==='invalid'){
      teacherPaintStatus('Paint not recorded: '+(result.detail||'Invalid surface sample.'));
    }
    return result.added||result.reason==='near';
  }
  function serialize(){const saved=structuredClone(config);validateGuided(saved,api.getChapters().length);return saved;}
  async function load(value,project){
    const thisSession=++session;
    stopTeacherPaint(false);api.clearTeacherPaintRegions?.();api.resetInvestigation?.();api.clearStudentHotspot?.();investigationCandidate=null;studentHotspotArmed=false;dissectArmed=false;
    config=normalizeGuided(value,api.getChapters().length);validateGuided(config,api.getChapters().length);
    currentProject=project;projectKey=progressKey({...project,guided:config});
    studentProgress={key:projectKey,answers:{},chapter:0,updatedAt:Date.now()};feedback='';resetOrbitMeter();ready=false;
    if(student()&&guided()){
      const recovered=await readProgress(projectKey);
      if(thisSession!==session)return;
      if(recovered?.answers&&typeof recovered.answers==='object')studentProgress={...studentProgress,...recovered,key:projectKey};
      for(const a of allSteps())if(!completed(a)&&studentProgress.answers[a.id]){
        const prior=studentProgress.answers[a.id];
        if(a.type==='reveal')studentProgress.answers[a.id]={...prior,actionDone:false,targetPicked:false};
        if(a.type==='label')studentProgress.answers[a.id]={...prior,hotspotCorrect:false};
        if(a.type==='dissect')studentProgress.answers[a.id]={...prior,hiddenIndices:[]};
      }
      storageOK=!!(await writeProgress(studentProgress));
    }
    if(thisSession!==session)return;ready=true;syncInheritedDissection();renderTeacher();renderStudent();
  }
  function onChapterChanged(){stopTeacherPaint(false);api.clearTeacherPaintRegions?.();api.resetInvestigation?.();api.clearStudentHotspot?.();api.clearTeacherHotspot?.();feedback='';resetOrbitMeter();
    if(student()&&ready&&guided()){studentProgress.chapter=api.getChapter();save();}
    syncInheritedDissection();renderTeacher();renderStudent();}
  function insertActivity(type){
    if(!api.isTeacher())return;
    const current=steps();if(current.length>=MAX_STEPS){api.notify('Maximum 12 activities per chapter.');return;}
    const base={id:uid(),type,title:type==='explore'?'Explore the anatomy':type==='identify'?'Identify the structure':'Check your understanding',
      prompt:type==='explore'?'Rotate the model and examine the structures.':type==='identify'?'Select the indicated structure on the model.':'Choose the correct answer.',
      hint:'',feedback:''};
    if(type==='explore'){base.action='rotate';base.rotationDegrees=DEFAULT_ROTATION_DEGREES;}
    if(type==='identify'){
      const visible=api.getTargets();
      const selectedKey='s:'+api.getSelectedStructure()?.index;
      const first=visible.find(c=>c.key===selectedKey)||visible.find(c=>c.key.startsWith('s:'))||visible[0];
      if(!first){api.notify('Show at least one anatomical structure in this chapter before adding Identify.');return;}
      const [kind,value]=first.key.split(':');
      base.targetStructure=kind==='s'?Number(value):api.getLabel(value)?.s;
      base.targetLabel=kind==='l'?value:null;
    }
    if(type==='mc'){base.options=['Option A','Option B','Option C','Option D'];base.correct=0;}
    if(INVESTIGATION_TYPES.includes(type)){
      const available=api.getTargets().filter(c=>c.key.startsWith('s:')).map(c=>Number(c.key.slice(2)));
      if(available.length<(type==='relationship'?2:1)){
        api.notify('Enable enough visible chapter structures before adding an investigation.');return;
      }
      base.rotationDegrees=30;
      if(type==='reveal'){
        base.title='Reveal & identify';base.prompt='Manipulate the skull to reveal and identify the specified structure.';
        base.targetStructure=available[0];base.targetLabel=null;
        base.action=available.length>=2?'hide':'isolate';
        base.obstructionStructure=available.find(n=>n!==base.targetStructure)??null;
      }else if(type==='relationship'){
        base.title='Find the anatomical relationship';base.prompt='Select the two bones that form the named relationship.';
        base.firstStructure=available[0];base.secondStructure=available[1];
      }else if(type==='label'){
        base.title='Place an anatomical hotspot';base.prompt='Inspect the model and place a 3D hotspot on the requested landmark.';
        base.paintRegions=[];base.brushMm=8;base.attemptLimit=DEFAULT_NEW_HOTSPOT_ATTEMPTS;
        base.rotationDegrees=0;
      }else if(type==='dissect'){
        base.title='Dissect to reveal anatomy';base.prompt='Use the Dissect tool to remove every required structure.';
        base.hideStructures=[available[0]];base.rotationDegrees=0;base.keepHiddenForNext=false;
      }
    }
    current.push(base);touch();
  }
  function update(i,key,value){const activity=steps()[i];if(!activity)return;activity[key]=value;api.onTeacherChange();}
  function renderTeacher(){
    if(!teacherRoot||!api.isTeacher())return;teacherMounted=true;api.clearTeacherHotspot?.();
    const free=teacherRoot.querySelector('#anat-ga-free');if(free)free.checked=config.free;
    const heading=teacherRoot.querySelector('#anat-ga-title');if(heading)heading.textContent=`Chapter ${api.getChapter()+1} activities`;
    const list=teacherRoot.querySelector('#anat-ga-list');if(!list)return;list.replaceChildren();
    for(const [i,a] of steps().entries()){
      const wrapper=document.createElement('section');wrapper.className='anat-ga-editor-item';
      const header=document.createElement('div');header.className='anat-ga-editor-header';
      header.innerHTML=`<strong>${i+1}. ${a.type==='mc'?'Multiple choice':a.type==='identify'?'Identify':a.type==='reveal'?'Reveal & Identify':a.type==='relationship'?'Relationships':a.type==='label'?'Label hotspot':a.type==='dissect'?'Dissect':'Explore'}</strong>`;
      for(const [label,delta] of [['↑',-1],['↓',1]]){
        const b=document.createElement('button');b.type='button';b.className='button small subtle';b.textContent=label;
        b.disabled=i+delta<0||i+delta>=steps().length;
        b.addEventListener('click',()=>{[steps()[i],steps()[i+delta]]=[steps()[i+delta],steps()[i]];touch();});header.append(b);
      }
      const remove=document.createElement('button');remove.type='button';remove.className='button small subtle';remove.textContent='×';remove.title='Remove activity';
      remove.addEventListener('click',()=>{steps().splice(i,1);touch();});header.append(remove);wrapper.append(header);
      const field=(title,key,multiline=false)=>{
        const label=document.createElement('label');label.className='anat-ga-field';label.textContent=title;
        const input=document.createElement(multiline?'textarea':'input');input.className='text-input';
        if(multiline)input.rows=2;input.maxLength=key==='prompt'?600:key==='title'?120:key==='hint'?300:500;input.value=a[key]||'';
        input.addEventListener('input',()=>update(i,key,input.value));label.append(input);wrapper.append(label);};
      field('Activity title','title');field('Instructions for students','prompt',true);
      if(a.type==='explore'){
        const label=document.createElement('label');label.className='anat-ga-field';label.textContent='Completion';
        const select=document.createElement('select');select.className='text-input';select.innerHTML='<option value="rotate">Require model rotation</option><option value="self">Student confirms exploration (no movement required)</option>';select.value=a.action;
        select.addEventListener('change',()=>{update(i,'action',select.value);renderTeacher();});label.append(select);wrapper.append(label);
        if(a.action==='rotate'){
          const amount=document.createElement('label');amount.className='anat-ga-field';amount.textContent='Required rotation before Continue';
          const choice=document.createElement('select');choice.className='text-input';
          for(const deg of ROTATION_CHOICES){const o=document.createElement('option');o.value=String(deg);o.textContent=deg+'° of rotation';choice.append(o);}
          choice.value=String(requiredRotation(a));
          choice.addEventListener('change',()=>update(i,'rotationDegrees',Number(choice.value)));
          amount.append(choice);wrapper.append(amount);
        }
      }else if(a.type==='identify'){
        const label=document.createElement('label');label.className='anat-ga-field';label.textContent='Correct target (visible in this chapter)';
        const search=document.createElement('input');search.className='text-input anat-ga-target-search';search.type='search';
        search.placeholder='Search visible structures or labels…';search.autocomplete='off';
        search.setAttribute('aria-label','Search visible Identify targets in this chapter');
        const select=document.createElement('select');select.className='text-input';select.setAttribute('aria-label','Correct Identify target');
        const status=document.createElement('small');status.className='anat-ga-target-status';status.setAttribute('role','status');
        const choices=api.getTargets();
        const redraw=()=>{
          const selectedKey=a.targetGroup?`g:${a.targetGroup}`:a.targetLabel?`l:${a.targetLabel}`:`s:${a.targetStructure}`;
          const selectedTarget=choices.find(c=>c.key===selectedKey);
          const matches=searchIdentifyTargets(choices,search.value);
          select.replaceChildren();
          const placeholder=document.createElement('option');placeholder.value='';placeholder.disabled=true;
          placeholder.textContent=choices.length?'Choose a visible target…':'No visible targets in this chapter';
          select.append(placeholder);
          // Keep an already-selected visible answer in view while searching, without changing it.
          const shown=selectedTarget&&!matches.some(c=>c.key===selectedKey)?[selectedTarget,...matches]:matches;
          for(const c of shown){const o=document.createElement('option');o.value=c.key;
            o.textContent=c.label+(c===selectedTarget&&!matches.includes(c)?' (current selection)':'');select.append(o);}
          select.value=selectedTarget?selectedKey:'';
          select.disabled=choices.length===0;
          if(!selectedTarget){
            status.textContent=choices.length?'Previous answer is hidden in this chapter. Select a visible target.':'No visible anatomy. Show a structure in this chapter first.';
            status.classList.add('anat-ga-target-warning');
          }else{
            status.textContent=`${matches.length} of ${choices.length} visible targets`;
            status.classList.remove('anat-ga-target-warning');
          }
        };
        search.addEventListener('input',redraw);
        select.addEventListener('change',()=>{
          const key=select.value;if(!key)return;
          const [kind,val]=key.split(':');
          if(kind==='s'){a.targetStructure=Number(val);a.targetLabel=null;a.targetGroup=null;}
          else if(kind==='g'){const group=api.getMuscleGroup(val);if(!group)return;a.targetStructure=group.members[0].index;a.targetLabel=null;a.targetGroup=val;}
          else {const labelData=api.getLabel(val);if(!labelData)return;a.targetStructure=labelData.s;a.targetLabel=val;a.targetGroup=null;}
          api.onTeacherChange();
          // Selection changed: refresh the visible choice list without rebuilding the editor.
          status.textContent='Target selected. '+choices.length+' visible targets in this chapter.';
          status.classList.remove('anat-ga-target-warning');
        });
        redraw();label.append(search,select,status);wrapper.append(label);
      }else if(INVESTIGATION_TYPES.includes(a.type)){
        const block=document.createElement('div');block.className='anat-ga-investigate-editor';
        const structureOptions=()=>api.getTargets().filter(c=>c.key.startsWith('s:'));
        const addPicker=(title,fieldKey,labels=false)=>{
          const label=document.createElement('label');label.className='anat-ga-field';label.textContent=title;
          const search=document.createElement('input');search.className='text-input';search.type='search';search.placeholder='Search chapter structures…';
          const select=document.createElement('select');select.className='text-input';
          const feedback=document.createElement('small');feedback.className='anat-ga-target-status';
          const options=labels?api.getTargets().filter(c=>c.key.startsWith('s:')||c.key.startsWith('l:')):structureOptions();
          const targetKey=()=>labels&&a.targetLabel?'l:'+a.targetLabel:'s:'+a[fieldKey];
          const fill=()=>{
            const chosen=targetKey(),query=search.value.toLowerCase().trim();
            const matches=options.filter(o=>o.label.toLowerCase().includes(query));
            const selected=options.find(o=>o.key===chosen);
            select.replaceChildren();
            const shown=selected&&!matches.includes(selected)?[selected,...matches]:matches;
            for(const opt of shown){const item=document.createElement('option');item.value=opt.key;item.textContent=opt.label;select.append(item);}
            select.value=selected?chosen:'';
            feedback.textContent=selected?`${matches.length} matching chapter targets`:'Selected structure is not visible in this chapter.';
          };
          select.addEventListener('change',()=>{
            const [kind,value]=select.value.split(':');
            if(kind==='s'){
              const chosen=Number(value);
              if(a.type==='relationship' && (fieldKey==='firstStructure'?chosen===a.secondStructure:chosen===a.firstStructure)){
                api.notify('Choose two different bones for a relationship.');fill();return;
              }
              if(a.type==='reveal' && (fieldKey==='obstructionStructure'?chosen===a.targetStructure:a.action==='hide'&&chosen===a.obstructionStructure)){
                api.notify('Target and obstruction must be different bones.');fill();return;
              }
              a[fieldKey]=chosen;if(labels)a.targetLabel=null;
              if(a.type==='label'){a.hotspot=null;teacherHotspotId=null;api.clearTeacherHotspot?.();}
            }
            else if(kind==='l'&&labels){const target=api.getLabel(value);if(!target)return;
              if(a.type==='reveal'&&a.action==='hide'&&target.s===a.obstructionStructure){api.notify('Target and obstruction must be different.');fill();return;}
              a[fieldKey]=target.s;a.targetLabel=value;}
            api.onTeacherChange();
          });
          search.addEventListener('input',fill);fill();label.append(search,select,feedback);block.append(label);
        };
        const addSelect=(title,values,initial,change)=>{
          const label=document.createElement('label');label.className='anat-ga-field';label.textContent=title;
          const choice=document.createElement('select');choice.className='text-input';
          for(const [value,text] of values){const opt=document.createElement('option');opt.value=value;opt.textContent=text;choice.append(opt);}
          choice.value=String(initial);choice.addEventListener('change',()=>change(choice.value));
          label.append(choice);block.append(label);
        };
        addSelect('Required real model rotation',INVESTIGATION_ROTATIONS.map(deg=>[String(deg),deg===0?'Off — no rotation required':deg+'°']),investigationRotation(a),v=>update(i,'rotationDegrees',Number(v)));
        if(a.type==='reveal'){
          addSelect('Required model action',[['hide','Hide an obstructing bone'],['isolate','Isolate the target bone']],a.action,v=>{
            if(v==='hide' && (!Number.isInteger(a.obstructionStructure)||a.obstructionStructure===a.targetStructure)){
              const alternate=structureOptions().find(c=>Number(c.key.slice(2))!==a.targetStructure);
              if(!alternate){api.notify('Show a second bone before using Hide mode.');renderTeacher();return;}
              a.obstructionStructure=Number(alternate.key.slice(2));
            }
            update(i,'action',v);renderTeacher();});
          addPicker('Bone or teacher marker to identify','targetStructure',true);
          if(a.action==='hide')addPicker('Bone students must hide first','obstructionStructure');
        }else if(a.type==='relationship'){
          addPicker('First bone in the relationship','firstStructure');
          addPicker('Second bone in the relationship','secondStructure');
        }else if(a.type==='label'){
          addSelect('Student hotspot attempt limit',
            [['0','Unlimited — no chapter restart'],...Array.from({length:10},(_,i)=>[String(i+1),`${i+1} attempt${i?'s':''}`])],
            a.attemptLimit??0, v=>update(i,'attemptLimit',Number(v)));
          const region=document.createElement('div');region.className='anat-investigation-teacher-set anat-paint-region';
          if(teacherHotspotId===a.id)region.classList.add('is-armed');
          const width=document.createElement('label');width.className='anat-ga-field';width.textContent='Paint brush radius (approx. mm)';
          const size=document.createElement('input');size.type='range';size.min='2';size.max='35';size.step='1';size.value=String(a.brushMm||8);
          const sizeValue=document.createElement('strong');sizeValue.textContent=size.value+' mm';
          size.addEventListener('input',()=>{a.brushMm=Number(size.value);sizeValue.textContent=size.value+' mm';api.onTeacherChange();});
          width.append(size,sizeValue);region.append(width);
          const controls=document.createElement('div');controls.className='anat-paint-actions';
          const paint=document.createElement('button');paint.type='button';paint.className='button primary small';
          paint.textContent=teacherHotspotId===a.id?'Stop painting':'Paint correct area';
          paint.addEventListener('click',()=>{
            const active=teacherHotspotId===a.id;stopTeacherPaint(false);
            paintPreviewId=a.id;
            if(!active){teacherHotspotId=a.id;api.setTeacherPaintMode?.(true);}
            renderTeacher();
            if(!active)teacherPaintStatus('RED BRUSH ON — drag across a visible 3D bone to paint the correct area.');
          });
          const clear=document.createElement('button');clear.type='button';clear.className='button small subtle';clear.textContent='Clear paint';
          clear.disabled=!a.paintRegions?.length;
          clear.addEventListener('click',()=>{a.paintRegions=[];paintPreviewId=a.id;api.showTeacherPaintRegions?.([]);touch();});
          const show=document.createElement('button');show.type='button';show.className='button small subtle';show.textContent='Show painted area';
          show.addEventListener('click',()=>{paintPreviewId=a.id;api.showTeacherPaintRegions?.(a.paintRegions||[]);});
          controls.append(paint,clear,show);region.append(controls);
          const note=document.createElement('small');note.id='anat-paint-points-'+a.id;
          const used=new Set((a.paintRegions||[]).map(s=>s.s)).size;
          note.textContent=(a.paintRegions?.length||0)?`RED PAINT SAVED — ${a.paintRegions.length} samples across ${used} structures`:
            'No target painted yet. Click Paint correct area, then drag across the visible skull. The area should turn RED.';
          region.append(note);
          if(teacherHotspotId===a.id){
            const tip=document.createElement('small');tip.textContent='RED BRUSH ON. Drag across visible skull bones; the painted area should appear immediately. Stop painting to orbit again.';
            region.append(tip);
          }
          block.append(region);
        }else if(a.type==='dissect'){
          const available=structureOptions();
          const title=document.createElement('strong');title.textContent='Structures students must dissect';block.append(title);
          const hint=document.createElement('small');hint.textContent='Select the exact structures. Every checked structure must be hidden for completion.';block.append(hint);
          const filter=document.createElement('input');filter.type='search';filter.className='text-input';filter.placeholder='Search chapter structures…';block.append(filter);
          const checks=document.createElement('div');checks.className='anat-investigate-teacher-checks';
          const count=document.createElement('small');
          const redraw=()=>{
            const query=filter.value.trim().toLowerCase();checks.replaceChildren();
            for(const item of available.filter(x=>x.label.toLowerCase().includes(query))){
              const idx=Number(item.key.slice(2));const row=document.createElement('label');
              const input=document.createElement('input');input.type='checkbox';input.checked=a.hideStructures.includes(idx);
              input.addEventListener('change',()=>{
                const next=new Set(a.hideStructures);
                if(input.checked){if(next.size>=64){api.notify('Maximum 64 structures per Dissect activity.');input.checked=false;return;}next.add(idx);}
                else next.delete(idx);
                if(next.size===0){api.notify('Choose at least one required structure.');input.checked=true;return;}
                a.hideStructures=[...next];api.onTeacherChange();
                count.textContent=`${a.hideStructures.length} required structures`;
              });row.append(input,document.createTextNode(item.label));checks.append(row);
            }
          };
          filter.addEventListener('input',redraw);redraw();
          count.textContent=`${a.hideStructures.length} required structures`;
          block.append(checks,count);
          // ANATOMIQ_DISSECTION_CARRY_278 — optional chapter-scoped retained dissection.
          const persist=document.createElement('label');persist.className='anat-ga-field anat-dissect-carry-field';
          const checkbox=document.createElement('input');checkbox.type='checkbox';
          checkbox.checked=a.keepHiddenForNext===true;
          checkbox.addEventListener('change',()=>update(i,'keepHiddenForNext',checkbox.checked));
          persist.append(checkbox,document.createTextNode(' Keep structures hidden for next activity'));
          block.append(persist);
          const missing=a.hideStructures.filter(idx=>!available.some(x=>x.key==='s:'+idx));
          if(missing.length){const warning=document.createElement('small');warning.textContent=missing.length+' previously selected structures are no longer visible in the chapter.';block.append(warning);}
        }
        wrapper.append(block);
      }else{
        for(let j=0;j<a.options.length;j++){
          const line=document.createElement('label');line.className='anat-ga-mc-choice';
          const radio=document.createElement('input');radio.type='radio';radio.name=`anat-ga-answer-${a.id}`;radio.checked=a.correct===j;
          radio.addEventListener('change',()=>update(i,'correct',j));
          const input=document.createElement('input');input.type='text';input.className='text-input';input.maxLength=160;input.value=a.options[j];
          input.addEventListener('input',()=>{a.options[j]=input.value;api.onTeacherChange();});
          line.append(radio,input);wrapper.append(line);
        }
        const controls=document.createElement('div');controls.className='anat-ga-buttons';
        for(const [title,delta] of [['+ Choice',1],['− Choice',-1]]){
          const b=document.createElement('button');b.type='button';b.className='button small subtle';b.textContent=title;
          b.disabled=delta===1?a.options.length>=4:a.options.length<=2;
          b.addEventListener('click',()=>{if(delta>0)a.options.push('New option');else {a.options.pop();a.correct=Math.min(a.correct,a.options.length-1);}touch();});controls.append(b);
        }
        wrapper.append(controls);
      }
      if(a.type!=='explore')field('Optional hint','hint',true);
      field('Feedback shown after completion','feedback',true);
      list.append(wrapper);
    }
    const preview=steps().find(a=>a.id===teacherHotspotId&&a.type==='label')||
      steps().find(a=>a.id===paintPreviewId&&a.type==='label');
    api.showTeacherPaintRegions?.(preview?.paintRegions||[]);
    const count=teacherRoot.querySelector('#anat-ga-count');if(count)count.textContent=`${steps().length} of ${MAX_STEPS} activities`;
  }
  function save(){if(!ready||!student()||!guided())return;studentProgress.updatedAt=Date.now();
    void writeProgress(studentProgress).then(ok=>{storageOK=ok;updateSavedIndicator();});}
  function updateSavedIndicator(){const el=byId('anat-ga-saved');if(el)el.textContent=storageOK?'Saved on this device':'Progress storage unavailable — finish in one session';}
  // ANATOMIQ_DISSECTION_CARRY_278 — derive inherited cuts from *completed* prior
  // Dissect activities only. In-progress cuts are never replayed from local storage.
  function inheritedHidden(){
    const active=currentActivity();
    return inheritedDissectionIndices(steps(),answers(),active?.id??null);
  }
  function dissectEvidence(activity){
    return dissectionEvidenceWithCarry(activity,answers()[activity.id],inheritedHidden());
  }
  function syncInheritedDissection(){
    if(!student()||!ready||!guided())return;
    api.setInvestigationHiddenIndices?.(inheritedHidden());
  }
  function complete(a,attempted=true){
    if(completed(a))return;
    // Keep the successful 3D check visible for the rest of the chapter.
    if(INVESTIGATION_TYPES.includes(a.type)){api.resetInvestigation?.();if(a.type!=='label')api.clearStudentHotspot?.();investigationCandidate=null;studentHotspotArmed=false;dissectArmed=false;}
    const old=answers()[a.id]||{};
    studentProgress.answers[a.id]={...old,done:true,attempts:Math.max(1,old.attempts||Number(attempted))};
    syncInheritedDissection();
    feedback=a.feedback||'Activity complete.';feedbackGood=true;resetOrbitMeter();save();renderStudent();
  }
  function fail(a){const old=answers()[a.id]||{};studentProgress.answers[a.id]={...old,done:false,attempts:(old.attempts||0)+1};
    feedback=a.hint?`Not quite. Hint: ${a.hint}`:'Not quite — try again.';feedbackGood=false;save();renderStudent();}
  function currentActivity(){return steps().find(a=>!completed(a));}
  function resetOrbitMeter(){orbitMeter?.end();orbitMeter=null;orbitActivityId=null;orbitLastShown=-1;investigationCandidate=null;studentHotspotArmed=false;dissectArmed=false;}
  function ensureOrbitMeter(activity){
    if(!activity||(activity.type!=='explore'&&INVESTIGATION_TYPES.includes(activity.type)&&investigationRotation(activity)===0)||
      (activity.type==='explore'&&activity.action!=='rotate')||
      (activity.type!=='explore'&&!INVESTIGATION_TYPES.includes(activity.type)))return null;
    if(orbitActivityId!==activity.id){
      resetOrbitMeter();orbitActivityId=activity.id;
      orbitMeter=createRotationMeter(activity.type==='explore'?requiredRotation(activity):investigationRotation(activity),answers()[activity.id]?.rotationProgressDeg||0);
    }
    return orbitMeter;
  }
  function recordRotation(activity,meter){
    if(!meter||!activity)return;
    const prior=answers()[activity.id]||{};
    studentProgress.answers[activity.id]={...prior,rotationProgressDeg:Math.round(meter.value*100)/100};
  }
  function refreshRotationUI(activity,meter){
    const degree=byId('anat-ga-rotation-degrees');
    const progress=byId('anat-ga-rotation-progress');
    const button=byId('anat-ga-explore');
    if(!degree||!progress||!button||!meter)return;
    const percent=Math.min(100,Math.floor(meter.value/requiredRotation(activity)*100));
    if(orbitLastShown!==percent){
      orbitLastShown=percent;
      degree.textContent=`${Math.floor(meter.value)}° / ${requiredRotation(activity)}°`;
      progress.style.width=percent+'%';
      progress.parentElement?.setAttribute('aria-valuenow',String(percent));
    }
    button.disabled=!meter.unlocked;
  }
  function onOrbitStart(){
    if(!student()||!ready||!guided()||api.isPractical())return;
    const activity=currentActivity(),meter=ensureOrbitMeter(activity);
    if(meter)meter.begin(api.getCamera(),api.getOrbitTarget());
  }
  function onOrbitChange(){
    if(!student()||!ready||!guided()||api.isPractical()||!orbitMeter?.active)return;
    const activity=currentActivity();
    if(!activity||activity.id!==orbitActivityId)return;
    const old=orbitMeter.value;
    orbitMeter.change(api.getCamera(),api.getOrbitTarget());
    if(orbitMeter.value===old)return;
    if(activity.type==='explore')refreshRotationUI(activity,orbitMeter);
    if(orbitMeter.unlocked){
      recordRotation(activity,orbitMeter);save();
      if(activity.type==='relationship'&&relationshipReady(activity,answers()[activity.id])){complete(activity);return;}
      if(activity.type==='reveal'&&revealReady(activity,answers()[activity.id])){complete(activity);return;}
      if(activity.type==='label'&&labelReady(activity,answers()[activity.id])){complete(activity);return;}
      if(activity.type==='dissect'&&dissectReady(activity,dissectEvidence(activity))){complete(activity);return;}
      if(INVESTIGATION_TYPES.includes(activity.type))renderStudent();
    }
  }
  function onOrbitEnd(){
    if(!orbitMeter?.active)return;
    const activity=currentActivity();
    if(activity?.id===orbitActivityId){recordRotation(activity,orbitMeter);save();}
    orbitMeter.end();
    if(activity&&INVESTIGATION_TYPES.includes(activity.type)){
      const evidence=answers()[activity.id];
      if((activity.type==='reveal'&&revealReady(activity,evidence))||
         (activity.type==='relationship'&&relationshipReady(activity,evidence))||
         (activity.type==='label'&&labelReady(activity,evidence))||
         (activity.type==='dissect'&&dissectReady(activity,dissectEvidence(activity)))){complete(activity);return;}
      renderStudent();
    }
  }
  function investigationTargetMatches(a,index,point){
    if(index!==a.targetStructure)return false;
    if(!a.targetLabel)return true;
    const anchor=api.getLabelAnchor(a.targetLabel);
    if(!anchor||!point||!api.getLabel(a.targetLabel))return false;
    const camera=api.getCamera(),rect=api.getCanvasRect();
    const a2=anchor.clone().project(camera),p2=point.clone().project(camera);
    return a2.z>=-1&&a2.z<=1&&Math.hypot((a2.x-p2.x)*rect.width/2,(a2.y-p2.y)*rect.height/2)<=44;
  }
  function handleInvestigationPick(a,index,point,normal=null){
    if(!Number.isInteger(index))return true;
    const prior=answers()[a.id]||{};
    if(a.type==='label'){
      const retry=hotspotAttemptState(a,prior);
      if(retry.locked)return true; // This chapter must be restarted first.
      if(prior.hotspotCorrect)return true; // Never overwrite an accepted green check.
      if(!a.paintRegions?.length){feedback='Teacher has not painted the target area yet.';feedbackGood=false;renderStudent();return true;}
      if(!studentHotspotArmed){feedback='Select Place 3D hotspot first.';feedbackGood=false;renderStudent();return true;}
      const good=!!point&&paintedHotspotAccepted(a,index,point.toArray(),sample=>api.getHotspotWorldPoint?.(sample),normal?.toArray?.()||null);
      api.showStudentHotspot?.(point,good);
      studentProgress.answers[a.id]={...prior,hotspotCorrect:good,attempts:(prior.attempts||0)+1};
      const state=hotspotAttemptState(a,studentProgress.answers[a.id]);
      if(!good){
        if(state.locked){studentHotspotArmed=false;feedback='';feedbackGood=false;}
        else {feedback=a.hint?`Incorrect location. Hint: ${a.hint}`:'Incorrect location — try another point on the model.';feedbackGood=false;}
        save();renderStudent();return true;
      }
      studentHotspotArmed=false;
      if(labelReady(a,answers()[a.id]))complete(a);
      else{feedback='Hotspot accepted. Complete the rotation requirement.';feedbackGood=true;save();renderStudent();}
      return true;
    }
    if(a.type==='dissect'){
      if(!dissectArmed){feedback='Turn on the Dissect tool before selecting structures.';feedbackGood=false;renderStudent();return true;}
      if(!a.hideStructures.includes(index)){
        feedback='This structure is not on the required dissection checklist.';feedbackGood=false;renderStudent();return true;
      }
      if((prior.hiddenIndices||[]).includes(index))return true;
      if(!api.investigationAction?.('hide',index)){
        feedback='This structure cannot be dissected in the current chapter view.';feedbackGood=false;renderStudent();return true;
      }
      const hiddenIndices=[...(prior.hiddenIndices||[]),index];
      studentProgress.answers[a.id]={...prior,hiddenIndices};
      if(dissectReady(a,dissectEvidence(a)))complete(a);
      else{const count=dissectionProgress(a,hiddenIndices);feedback=`${count.completed} dissected · ${count.remaining.length} remaining.`;feedbackGood=true;save();renderStudent();}
      return true;
    }
    if(a.type==='relationship'){
      const pick=relationshipPick(prior.selectedStructures||[],index,a.firstStructure,a.secondStructure);
      const attempts=(prior.attempts||0)+(pick.valid?0:1);
      studentProgress.answers[a.id]={...prior,selectedStructures:pick.selected,attempts};
      if(!pick.valid){failFromAlreadyIncremented(a);return true;}
      if(relationshipReady(a,answers()[a.id]))complete(a);
      else {feedback=pick.done?'Both bones found. Finish rotating to verify.':'Bone selected. Find its partner.';
        feedbackGood=true;save();renderStudent();}
      return true;
    }
    // Reveal: the first pick is the student's candidate for a physical hide/isolate action.
    if(!prior.actionDone){investigationCandidate=index;feedback='';renderStudent();return true;}
    const good=investigationTargetMatches(a,index,point);
    studentProgress.answers[a.id]={...prior,targetPicked:good,attempts:(prior.attempts||0)+(good?0:1)};
    if(!good){failFromAlreadyIncremented(a);return true;}
    if(revealReady(a,answers()[a.id]))complete(a);
    else{feedback='Correct location. Complete the required rotation.';feedbackGood=true;save();renderStudent();}
    return true;
  }
  function performInvestigationAction(a){
    if(a.type!=='reveal'||investigationCandidate===null)return;
    const target=investigationCandidate;
    if(a.action==='hide'&&target!==a.obstructionStructure){investigationCandidate=null;fail(a);return;}
    if(a.action==='isolate'&&target!==a.targetStructure){investigationCandidate=null;fail(a);return;}
    if(!api.investigationAction?.(a.action,target)){
      feedback='That structure cannot be manipulated in the current chapter.';
      feedbackGood=false;renderStudent();return;
    }
    const prev=answers()[a.id]||{};
    studentProgress.answers[a.id]={...prev,actionDone:true,actionIndex:target,targetPicked:false};
    investigationCandidate=null;feedback='Model changed. Now select the requested target on the 3D model.';
    feedbackGood=true;save();renderStudent();
  }
  // Brush strokes are handled on pointer drag by the 3D viewer (not its click-to-select handler).
  function handleTeacherHotspotPick(){return false;}
  function handlePick(index,point,normal=null){
    if(!student()||!ready||!guided()||api.isPractical())return false;
    const a=currentActivity();
    if(INVESTIGATION_TYPES.includes(a?.type))return handleInvestigationPick(a,index,point,normal);
    if(a?.type!=='identify')return false;
    // ANATOMIQ_MUSCLE_GROUPS_270_STAGE1: teacher-created multi-anchor labels
    // accept clicks on any original member mesh (not just the first anchor).
    const chosenLabel=a.targetLabel?api.getLabel(a.targetLabel):null;
    const groupAnchors=Array.isArray(chosenLabel?.g)&&chosenLabel.g.length?chosenLabel.g:null;
    const nativeGroup=a.targetGroup?api.getMuscleGroup(a.targetGroup):null;
    let valid=nativeGroup?nativeGroup.members.some(s=>s.index===index):
      groupAnchors?[chosenLabel.s,...groupAnchors.map(v=>v.s)].includes(index):index===a.targetStructure;
    if(valid&&a.targetLabel&&!groupAnchors){const label=api.getLabel(a.targetLabel);const anchor=api.getLabelAnchor(a.targetLabel);
      if(!label||!anchor||!point)valid=false;
      else {const camera=api.getCamera();const rect=api.getCanvasRect();
        const a2=anchor.clone().project(camera),p2=point.clone().project(camera);
        const dx=(a2.x-p2.x)*rect.width/2,dy=(a2.y-p2.y)*rect.height/2;
        valid=a2.z>=-1&&a2.z<=1&&Math.hypot(dx,dy)<=44;}
    }
    if(valid){studentProgress.answers[a.id]={...(answers()[a.id]||{}),attempts:((answers()[a.id]?.attempts)||0)+1};complete(a);}
    else fail(a);
    return true;
  }
  function canAdvance(target){if(!student()||!ready||!guided()||api.isPractical()||target<=api.getChapter())return true;
    const pendingLabel=currentActivity();
    if(pendingLabel?.type==='label'&&hotspotAttemptState(pendingLabel,answers()[pendingLabel.id]).locked){feedback='Restart this chapter before continuing.';renderStudent();return false;}
    const pending=Array.from({length:target-api.getChapter()},(_,i)=>api.getChapter()+i).find(ch=>(config.chapters[ch]||[]).some(a=>!completed(a)));
    if(pending!==undefined){feedback=`Complete chapter ${pending+1} activities before continuing.`;feedbackGood=false;renderStudent();return false;}
    return true;
  }
  function renderStudent(){
    if(!studentRoot||!student())return;studentMounted=true;
    const active=ready&&guided()&&!api.isPractical();studentRoot.hidden=!active;
    const identify=active&&(currentActivity()?.type==='identify'||INVESTIGATION_TYPES.includes(currentActivity()?.type));document.body.classList.toggle('anat-guided-identify',!!identify);
    if(!active)return;
    const {done,total,firstTry}=totals();const step=currentActivity();
    const completeAll=done===total;
    const header=`<div class="anat-ga-head"><strong>Guided Lesson</strong><span>${done}/${total} complete</span></div>`;
    let inner=header;
    if(completeAll){
      inner+=`<div class="anat-ga-complete"><h3>Lesson Complete!</h3><p>You've completed ${total} guided activities across ${api.getChapters().length} chapters.</p>
        <label class="anat-ga-field">Student name for Schoology image<input class="text-input" id="anat-ga-name" maxlength="70" autocomplete="name" placeholder="First and last name" value="${esc(studentName)}"></label>
        <button id="anat-ga-png" class="button primary full" type="button">Save completion PNG</button>
        <small>Upload the PNG to your Schoology assignment. The image records local completion, not a secured exam.</small></div>`;
    }else if(!step){
      inner+=`<h3>Chapter complete</h3><p>All activities in this chapter are finished.</p>`;
      if(api.getChapter()<api.getChapters().length-1)inner+='<button class="button primary full" id="anat-ga-next-chapter" type="button">Next chapter →</button>';
    }else{
      const index=steps().indexOf(step)+1;
      const lockedLabel=step.type==='label'&&hotspotAttemptState(step,answers()[step.id]).locked;
      if(lockedLabel){
        const limit=hotspotAttemptState(step,answers()[step.id]).limit;
        inner+=`<section class="anat-hotspot-lockout" role="alert" aria-live="assertive">
          <div class="anat-hotspot-lockout-glyph" aria-hidden="true">✕</div>
          <h3>Attempt limit reached</h3>
          <p>You used all ${limit} hotspot attempts. You must restart <strong>Chapter ${api.getChapter()+1}</strong> before trying again.</p>
          <p>All activities in this chapter will reset. Earlier chapters remain completed.</p>
          <button class="button primary full" id="anat-ga-restart-chapter" type="button">Restart Chapter ${api.getChapter()+1}</button></section>`;
      }else{
      inner+=`<div class="anat-ga-task"><small>Chapter ${api.getChapter()+1} · Activity ${index} of ${steps().length}</small><h3>${esc(step.title)}</h3>
      <p>${esc(step.prompt)}</p>`;
      if(step.type==='explore'){
        const meter=ensureOrbitMeter(step);
        if(meter){
          const needed=requiredRotation(step),percent=Math.min(100,Math.floor(meter.value/needed*100));
          inner+=`<p class="anat-ga-help">Rotate the 3D model at least ${needed}° to unlock Continue. Zooming and panning do not count.</p>
          <div class="anat-ga-rotation-track" role="progressbar" aria-label="Model rotation completed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
            <div id="anat-ga-rotation-progress" class="anat-ga-rotation-progress" style="width:${percent}%"></div></div>
          <p class="anat-ga-rotation-status" id="anat-ga-rotation-degrees">${Math.floor(meter.value)}° / ${needed}°</p>
          <button class="button primary full" type="button" id="anat-ga-explore" ${!meter.unlocked?'disabled':''}>Continue</button>`;
          orbitLastShown=percent;
        }else{
          inner+='<p class="anat-ga-help">Explore the anatomy, then continue when ready.</p><button class="button primary full" type="button" id="anat-ga-explore">Continue</button>';
        }
      }
      else if(INVESTIGATION_TYPES.includes(step.type)){
        const evidence=answers()[step.id]||{},meter=ensureOrbitMeter(step),angle=investigationRotation(step);
        const rotationDone=angle===0||!!meter?.unlocked;
        let checklist=`<div class="anat-investigate-progress">`;
        if(angle>0)checklist+=`<span class="${rotationDone?'done':''}">${rotationDone?'✓':'○'} Rotate model ${angle}° (${Math.floor(meter?.value||0)}°)</span>`;
        if(step.type==='reveal'){
          checklist+=`<span class="${evidence.actionDone?'done':''}">${evidence.actionDone?'✓':'○'} ${step.action==='hide'?'Hide the obstructing bone':'Isolate the target'}</span>
          <span class="${evidence.targetPicked?'done':''}">${evidence.targetPicked?'✓':'○'} Identify the target in 3D</span></div>`;
          const candidateReady=Number.isInteger(investigationCandidate);
          if(!evidence.actionDone)checklist+=`<p class="anat-investigate-small">Click a bone, then use the action button. Only model interactions count.</p>
            <div class="anat-investigate-action"><button class="button primary" id="anat-ga-model-action" ${candidateReady?'':'disabled'}>${step.action==='hide'?'Hide selected bone':'Isolate selected bone'}</button>
            <button class="button subtle" id="anat-ga-model-reset">Restore model</button></div>`;
          else checklist+=`<div class="anat-investigate-action"><button class="button subtle full" id="anat-ga-model-reset">Restore / retry</button></div>`;
        }else if(step.type==='relationship'){
          const selected=evidence.selectedStructures||[];
          checklist+=`<span class="${selected.length>=1?'done':''}">${selected.length>=1?'✓':'○'} First bone (${Math.min(2,selected.length)}/2)</span>
            <span class="${selected.length>=2?'done':''}">${selected.length>=2?'✓':'○'} Second related bone</span></div>
            <p class="anat-investigate-small">Select the two related bones directly on the 3D model.</p>`;
        }else if(step.type==='label'){
          const attempts=hotspotAttemptState(step,evidence);
          checklist+=`<span class="${evidence.hotspotCorrect?'done':''}">${evidence.hotspotCorrect?'✓':'○'} Place a hotspot within the correct 3D area</span></div>
            ${attempts.limit?`<div class="anat-hotspot-attempts" role="status"><strong>Hotspot attempts</strong><span>${attempts.used}/${attempts.limit} used · ${attempts.remaining} remaining</span></div>
              ${attempts.finalChance?'<div class="anat-hotspot-final-warning" role="alert">⚠ Final attempt! Another incorrect click will require you to restart this chapter.</div>':
                '<p class="anat-hotspot-limit-note">If you use every attempt, you must restart this chapter.</p>'}`:''}
            <p class="anat-hotspot-tip">${step.paintRegions?.length?'Inspect the model and place a hotspot where you believe the landmark is located.':'Teacher must paint a correct area before this can be completed.'}</p>
            <button class="button primary full" id="anat-ga-hotspot-arm" type="button" aria-pressed="${studentHotspotArmed}" ${step.paintRegions?.length?'':'disabled'}>${studentHotspotArmed?'Placing hotspot — click model':'Place 3D hotspot'}</button>`;
        }else if(step.type==='dissect'){
          const found=dissectionProgress(step,dissectEvidence(step).hiddenIndices);
          const pct=Math.floor(found.completed/found.required*100);
          const displayName=id=>api.getStructureName?.(id)||('Structure #'+id);
          checklist+=`<span class="${found.done?'done':''}">${found.done?'✓':'○'} Hide all required structures</span></div>
            ${step.keepHiddenForNext===true?'<p class="anat-dissect-carry-note">Completed dissection stays hidden for later activities in this chapter.</p>':''}
            <div class="anat-dissect-summary"><span>${found.completed} dissected</span><span>${found.remaining.length} remaining</span></div>
            <div class="anat-dissect-track" role="progressbar" aria-label="Structures dissected" aria-valuemin="0" aria-valuemax="${found.required}" aria-valuenow="${found.completed}"><span style="width:${pct}%"></span></div>
            <button class="button primary full anat-dissect-toggle" id="anat-ga-dissect-arm" type="button" aria-pressed="${dissectArmed}">${dissectArmed?'Dissect ON — click structures':'Dissect tool (Hide)'}</button>
            <p class="anat-investigate-small">Select the required structures directly in the 3D viewer to hide them. Unlisted structures do not count.</p>
            <div class="anat-dissect-list">${step.hideStructures.map(id=>`<span class="${found.remaining.includes(id)?'':'done'}">${found.remaining.includes(id)?'○':'✓'} ${esc(displayName(id))}</span>`).join('')}</div>
            <button class="button subtle full" id="anat-ga-model-reset" type="button">Restore dissection / retry</button>`;
        }
        inner+=checklist;
      }
      else if(step.type==='identify')inner+='<p class="anat-ga-help">Click the correct structure or landmark in the 3D viewer. Anatomical labels are temporarily hidden.</p>';
      else inner+=`<div class="anat-ga-choices">${step.options.map((o,i)=>`<button class="button subtle full" data-anat-choice="${i}" type="button">${esc(o)}</button>`).join('')}</div>`;
      inner+='</div>';
      } // end unlocked activity content
    }
    if(feedback)inner+=`<p class="anat-ga-feedback ${feedbackGood?'is-good':'is-error'}" role="status">${esc(feedback)}</p>`;
    if(studentProgress.chapter!==api.getChapter() && !completeAll && api.getChapters()[studentProgress.chapter])
      inner+=`<button class="button subtle full" id="anat-ga-resume" type="button">Resume chapter ${studentProgress.chapter+1}</button>`;
    inner+=`<div class="anat-ga-footer"><small id="anat-ga-saved">${storageOK?'Saved on this device':'Progress storage unavailable'}</small>
      <button type="button" id="anat-ga-reset" class="anat-ga-link">Restart lesson</button></div>`;
    studentRoot.innerHTML=inner;
    byId('anat-ga-explore')?.addEventListener('click',()=>{
      if(!step||step.type!=='explore'||completed(step))return;
      if(step.action==='rotate'&&!ensureOrbitMeter(step)?.unlocked)return;
      complete(step,false);
    });
    studentRoot.querySelectorAll('[data-anat-choice]').forEach(b=>b.addEventListener('click',()=>{
      if(!step||step.type!=='mc')return;const chosen=Number(b.dataset.anatChoice);
      studentProgress.answers[step.id]={...(answers()[step.id]||{}),attempts:(answers()[step.id]?.attempts||0)+1,lastChoice:chosen};
      if(chosen===step.correct)complete(step);else failFromAlreadyIncremented(step);
    }));
    byId('anat-ga-hotspot-arm')?.addEventListener('click',()=>{
      if(step?.type!=='label'||!step.paintRegions?.length||hotspotAttemptState(step,answers()[step.id]).locked||answers()[step.id]?.hotspotCorrect)return;
      studentHotspotArmed=!studentHotspotArmed;feedback='';renderStudent();
    });
    byId('anat-ga-dissect-arm')?.addEventListener('click',()=>{
      if(step?.type!=='dissect')return;
      dissectArmed=!dissectArmed;feedback='';renderStudent();
    });
    byId('anat-ga-model-action')?.addEventListener('click',()=>{if(step?.type==='reveal')performInvestigationAction(step);});
    byId('anat-ga-model-reset')?.addEventListener('click',()=>{
      api.resetInvestigation?.();investigationCandidate=null;
      if(step?.type==='reveal'){
        const prior=answers()[step.id]||{};
        studentProgress.answers[step.id]={...prior,actionDone:false,targetPicked:false};
      }
      if(step?.type==='dissect'){
        const prior=answers()[step.id]||{};
        studentProgress.answers[step.id]={...prior,hiddenIndices:[]};
      }
      syncInheritedDissection();
      api.clearStudentHotspot?.();
      feedback='Model restored. Earlier retained dissections remain hidden.';feedbackGood=true;save();renderStudent();
    });
    byId('anat-ga-restart-chapter')?.addEventListener('click',async()=>{
      const button=byId('anat-ga-restart-chapter');if(button){button.disabled=true;button.textContent='Restarting chapter…';}
      const chapter=api.getChapter();
      try{
        api.resetInvestigation?.();api.clearStudentHotspot?.();
        studentProgress.answers=restartChapterAnswers(answers(),steps(chapter));
        studentProgress.chapter=chapter;studentProgress.updatedAt=Date.now();
        // Persist cleared chapter answers before any scene restore can reload guided state.
        storageOK=await writeProgress(studentProgress);
        await api.resetChapterScene?.();
        syncInheritedDissection();
        feedback='Chapter restarted. Begin again with activity 1.';feedbackGood=true;
        resetOrbitMeter();save();renderStudent();
      }catch(error){
        feedback='Could not restore the original chapter model. Try again: '+String(error?.message||error);feedbackGood=false;renderStudent();
      }
    });
    byId('anat-ga-next-chapter')?.addEventListener('click' ,()=>api.goChapter(api.getChapter()+1));
    byId('anat-ga-resume')?.addEventListener('click',()=>api.goChapter(studentProgress.chapter));
    byId('anat-ga-name')?.addEventListener('input',e=>{studentName=e.target.value;});
    byId('anat-ga-png')?.addEventListener('click',()=>{
      const name=studentName.trim();if(!name){byId('anat-ga-name')?.focus();return api.notify('Enter a student name before saving the completion image.');}
      try{downloadCompletionPNG(name,api.getProjectTitle(),api.getChapters().length,done,total,firstTry);}
      catch(error){api.notify('Could not save PNG: '+error.message);}
    });
    byId('anat-ga-reset')?.addEventListener('click',async()=>{
      if(!window.confirm('Restart this lesson? This deletes locally saved activity answers for this lesson only.'))return;
      await removeProgress(projectKey);api.resetInvestigation?.();studentProgress={key:projectKey,answers:{},chapter:api.getChapter()};feedback='';resetOrbitMeter();save();renderStudent();
    });
  }
  function failFromAlreadyIncremented(a){feedback=a.hint?`Not quite. Hint: ${a.hint}`:'Not quite — try again.';feedbackGood=false;save();renderStudent();}
  function focusPanel(){studentRoot?.scrollIntoView({block:'nearest',behavior:'smooth'});}
  function bind(){
    if(teacherRoot){
      byId('anat-ga-free')?.addEventListener('change',e=>{config.free=e.target.checked;touch();});
      teacherRoot.querySelectorAll('[data-anat-add]').forEach(b=>b.addEventListener('click',()=>insertActivity(b.dataset.anatAdd)));
    }
  }
  bind();
  return {load,serialize,renderTeacher,renderStudent,onChapterChanged,handlePick,handleTeacherHotspotPick,teacherPaintSample,teacherPaintStatus,
    isTeacherPainting:()=>api.isTeacher()&&!!teacherHotspotId,stopTeacherPainting:()=>stopTeacherPaint(true),endTeacherPaintStroke:()=>{if(teacherHotspotId){api.onTeacherChange();renderTeacher();}},onOrbitStart,onOrbitChange,onOrbitEnd,canAdvance,focusPanel,
    addChapter(index,duplicate){config.chapters.splice(index+1,0,duplicate?structuredClone(config.chapters[index]).map(a=>({...a,id:uid()})):[]);touch();},
    moveChapter(index,delta){[config.chapters[index],config.chapters[index+delta]]=[config.chapters[index+delta],config.chapters[index]];touch();},
    deleteChapter(index){config.chapters.splice(index,1);touch();},
    resetTeacher(){config=normalizeGuided(null,api.getChapters().length);renderTeacher();},
    get config(){return config;}
  };
}
