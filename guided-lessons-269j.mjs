// AnatomIQ Guided Chapter Activities — local 2.2.69i pilot.
// No network, analytics, authentication, or model changes.
export const GUIDED_MARKER = 'ANATOMIQ_GUIDED_ACTIVITIES_269J';
import {MUSCLE_GROUP_DEFS} from './muscle-groups-270.mjs?rev=270-native-muscles-local'; // ANATOMIQ_MUSCLE_NATIVE_270
const KNOWN_MUSCLE_GROUP_IDS=new Set(MUSCLE_GROUP_DEFS.map(g=>g.id));
export const GUIDED_TYPES = Object.freeze(['explore','identify','mc']);
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
      src.chapters[i].map(x=>structuredClone(x)):[])};
}
export function validateGuided(input, count){
  if(input===undefined)return true;
  if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.free!=='boolean'
     ||!Array.isArray(input.chapters)||input.chapters.length!==count)throw Error('Invalid guided lesson settings.');
  const used=new Set();
  for(const steps of input.chapters){
    if(!Array.isArray(steps)||steps.length>MAX_STEPS)throw Error('Each chapter supports up to 12 activities.');
    for(const a of steps){
      if(!a||typeof a!=='object'||!GUIDED_TYPES.includes(a.type)||typeof a.id!=='string'
         ||!/^act-[a-zA-Z0-9-]{4,80}$/.test(a.id)||used.has(a.id))throw Error('Invalid activity identity or type.');
      used.add(a.id);
      if(typeof a.title!=='string'||!a.title.trim()||a.title.length>120||
         typeof a.prompt!=='string'||!a.prompt.trim()||a.prompt.length>600||
         typeof a.hint!=='string'||a.hint.length>300||typeof a.feedback!=='string'||a.feedback.length>500)
         throw Error('Invalid activity instructions or feedback.');
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
    teacherMounted=false,studentMounted=false,session=0;
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
  function serialize(){const saved=structuredClone(config);validateGuided(saved,api.getChapters().length);return saved;}
  async function load(value,project){
    const thisSession=++session;
    config=normalizeGuided(value,api.getChapters().length);validateGuided(config,api.getChapters().length);
    currentProject=project;projectKey=progressKey({...project,guided:config});
    studentProgress={key:projectKey,answers:{},chapter:0,updatedAt:Date.now()};feedback='';resetOrbitMeter();ready=false;
    if(student()&&guided()){
      const recovered=await readProgress(projectKey);
      if(thisSession!==session)return;
      if(recovered?.answers&&typeof recovered.answers==='object')studentProgress={...studentProgress,...recovered,key:projectKey};
      storageOK=!!(await writeProgress(studentProgress));
    }
    if(thisSession!==session)return;ready=true;renderTeacher();renderStudent();
  }
  function onChapterChanged(){feedback='';resetOrbitMeter();
    if(student()&&ready&&guided()){studentProgress.chapter=api.getChapter();save();}
    renderTeacher();renderStudent();}
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
    current.push(base);touch();
  }
  function update(i,key,value){const activity=steps()[i];if(!activity)return;activity[key]=value;api.onTeacherChange();}
  function renderTeacher(){
    if(!teacherRoot||!api.isTeacher())return;teacherMounted=true;
    const free=teacherRoot.querySelector('#anat-ga-free');if(free)free.checked=config.free;
    const heading=teacherRoot.querySelector('#anat-ga-title');if(heading)heading.textContent=`Chapter ${api.getChapter()+1} activities`;
    const list=teacherRoot.querySelector('#anat-ga-list');if(!list)return;list.replaceChildren();
    for(const [i,a] of steps().entries()){
      const wrapper=document.createElement('section');wrapper.className='anat-ga-editor-item';
      const header=document.createElement('div');header.className='anat-ga-editor-header';
      header.innerHTML=`<strong>${i+1}. ${a.type==='mc'?'Multiple choice':a.type==='identify'?'Identify':'Explore'}</strong>`;
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
    const count=teacherRoot.querySelector('#anat-ga-count');if(count)count.textContent=`${steps().length} of ${MAX_STEPS} activities`;
  }
  function save(){if(!ready||!student()||!guided())return;studentProgress.updatedAt=Date.now();
    void writeProgress(studentProgress).then(ok=>{storageOK=ok;updateSavedIndicator();});}
  function updateSavedIndicator(){const el=byId('anat-ga-saved');if(el)el.textContent=storageOK?'Saved on this device':'Progress storage unavailable — finish in one session';}
  function complete(a,attempted=true){
    if(completed(a))return;
    const old=answers()[a.id]||{};
    studentProgress.answers[a.id]={...old,done:true,attempts:Math.max(1,old.attempts||Number(attempted))};
    feedback=a.feedback||'Activity complete.';feedbackGood=true;resetOrbitMeter();save();renderStudent();
  }
  function fail(a){const old=answers()[a.id]||{};studentProgress.answers[a.id]={...old,done:false,attempts:(old.attempts||0)+1};
    feedback=a.hint?`Not quite. Hint: ${a.hint}`:'Not quite — try again.';feedbackGood=false;save();renderStudent();}
  function currentActivity(){return steps().find(a=>!completed(a));}
  function resetOrbitMeter(){orbitMeter?.end();orbitMeter=null;orbitActivityId=null;orbitLastShown=-1;}
  function ensureOrbitMeter(activity){
    if(!activity||activity.type!=='explore'||activity.action!=='rotate')return null;
    if(orbitActivityId!==activity.id){
      resetOrbitMeter();orbitActivityId=activity.id;
      orbitMeter=createRotationMeter(requiredRotation(activity),answers()[activity.id]?.rotationProgressDeg||0);
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
    refreshRotationUI(activity,orbitMeter);
    if(orbitMeter.unlocked){recordRotation(activity,orbitMeter);save();}
  }
  function onOrbitEnd(){
    if(!orbitMeter?.active)return;
    const activity=currentActivity();
    if(activity?.id===orbitActivityId){recordRotation(activity,orbitMeter);save();}
    orbitMeter.end();
  }
  function handlePick(index,point){
    if(!student()||!ready||!guided()||api.isPractical())return false;
    const a=currentActivity();if(a?.type!=='identify')return false;
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
    const pending=Array.from({length:target-api.getChapter()},(_,i)=>api.getChapter()+i).find(ch=>(config.chapters[ch]||[]).some(a=>!completed(a)));
    if(pending!==undefined){feedback=`Complete chapter ${pending+1} activities before continuing.`;feedbackGood=false;renderStudent();return false;}
    return true;
  }
  function renderStudent(){
    if(!studentRoot||!student())return;studentMounted=true;
    const active=ready&&guided()&&!api.isPractical();studentRoot.hidden=!active;
    const identify=active&&currentActivity()?.type==='identify';document.body.classList.toggle('anat-guided-identify',!!identify);
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
      else if(step.type==='identify')inner+='<p class="anat-ga-help">Click the correct structure or landmark in the 3D viewer. Anatomical labels are temporarily hidden.</p>';
      else inner+=`<div class="anat-ga-choices">${step.options.map((o,i)=>`<button class="button subtle full" data-anat-choice="${i}" type="button">${esc(o)}</button>`).join('')}</div>`;
      inner+='</div>';
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
    byId('anat-ga-next-chapter')?.addEventListener('click',()=>api.goChapter(api.getChapter()+1));
    byId('anat-ga-resume')?.addEventListener('click',()=>api.goChapter(studentProgress.chapter));
    byId('anat-ga-name')?.addEventListener('input',e=>{studentName=e.target.value;});
    byId('anat-ga-png')?.addEventListener('click',()=>{
      const name=studentName.trim();if(!name){byId('anat-ga-name')?.focus();return api.notify('Enter a student name before saving the completion image.');}
      try{downloadCompletionPNG(name,api.getProjectTitle(),api.getChapters().length,done,total,firstTry);}
      catch(error){api.notify('Could not save PNG: '+error.message);}
    });
    byId('anat-ga-reset')?.addEventListener('click',async()=>{
      if(!window.confirm('Restart this lesson? This deletes locally saved activity answers for this lesson only.'))return;
      await removeProgress(projectKey);studentProgress={key:projectKey,answers:{},chapter:api.getChapter()};feedback='';resetOrbitMeter();save();renderStudent();
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
  return {load,serialize,renderTeacher,renderStudent,onChapterChanged,handlePick,onOrbitStart,onOrbitChange,onOrbitEnd,canAdvance,focusPanel,
    addChapter(index,duplicate){config.chapters.splice(index+1,0,duplicate?structuredClone(config.chapters[index]).map(a=>({...a,id:uid()})):[]);touch();},
    moveChapter(index,delta){[config.chapters[index],config.chapters[index+delta]]=[config.chapters[index+delta],config.chapters[index]];touch();},
    deleteChapter(index){config.chapters.splice(index,1);touch();},
    resetTeacher(){config=normalizeGuided(null,api.getChapters().length);renderTeacher();},
    get config(){return config;}
  };
}
