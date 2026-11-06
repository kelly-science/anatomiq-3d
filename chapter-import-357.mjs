/** AnatomIQ Studio 2.2.143 — Import Chapters dialog (Teacher Studio only). */
import {listLessons} from './library-store.js';
import {validateProject} from './scene-codec.js?rev=311-multi-identify&practical=336&presentation=355';
import {buildChapterImport,compatibleChapters,MAX_CHAPTERS_357} from './chapter-import-core-357.mjs?rev=357';

const $=id=>document.getElementById(id);
const sourceList=[];
const teacher=()=>!document.body.classList.contains('student-mode')&&!/^#(?:scene|lesson)=/.test(location.hash);
const bridge=()=>window.__AnatomIQWorkspaceBridge;
const toast=message=>{const node=$('app-toast');if(node){node.textContent=message;node.hidden=false;}else console.info(message);};
const el=(name,props={},text='')=>{const n=document.createElement(name);for(const[k,v]of Object.entries(props))n.setAttribute(k,v);if(text)n.textContent=text;return n;};
let modal,chooser,list,submit,placement,include,info,selectedSource='';
let selectedIndices=new Set();
function readOpenTabs(){
  try{
    const raw=JSON.parse(localStorage.getItem('anatomiq-teacher-workspace-tabs-v1')||'null');
    return (raw?.workspaces||[]).filter(w=>w.id!==raw.active&&w.state?.project?.v===2)
      .map(w=>({key:'tab:'+w.id,title:w.name||w.state.project.t,project:w.state.project,kind:'Open tab'}));
  }catch{return [];}
}
function current(){const b=bridge();if(!b?.ready?.())throw new Error('Teacher Studio is not ready.');return b.capture();}
function validSource(source,project){
  try{validateProject(source);return compatibleChapters(project,source);}catch{return false;}
}
function updateChoices(){
  const before=chooser.value;chooser.replaceChildren();
  for(const s of sourceList){const opt=el('option',{value:s.key},`${s.title} · ${s.kind}`);opt.disabled=!s.compatible;chooser.append(opt);}
  const chosen=sourceList.find(s=>s.key===before&&s.compatible)||sourceList.find(s=>s.compatible);
  selectedSource=chosen?.key||'';chooser.value=selectedSource;
  renderChapters();
}
function renderChapters(){
  selectedIndices=new Set();list.replaceChildren();
  const source=sourceList.find(s=>s.key===selectedSource);
  if(!source){info.textContent='No compatible local lesson found. Lessons must use the same anatomical structure index.';submit.disabled=true;return;}
  info.textContent=`${source.project.chapters.length} chapters available. Chapters retain their 3D scene, labels, paint and starting view.`;
  for(const [index,chapter]of source.project.chapters.entries()){
    const row=el('label',{class:'anat357-choice'}),check=el('input',{type:'checkbox',value:String(index)});
    const text=el('span',{},`${index+1}. ${chapter.t||'Untitled chapter'}`);
    check.addEventListener('change',()=>{if(check.checked)selectedIndices.add(index);else selectedIndices.delete(index);updateSubmit();});
    row.append(check,text);list.append(row);
  }
  updateSubmit();
}
function updateSubmit(){
  const source=sourceList.find(s=>s.key===selectedSource);
  let remaining=0;try{remaining=MAX_CHAPTERS_357-current().project.chapters.length;}catch{}
  const count=selectedIndices.size;
  submit.disabled=!source||!count||count>remaining;
  $('anat357-limit').textContent=count>remaining?`Only ${Math.max(0,remaining)} chapter slots remain.`:`${remaining} chapter slots available.`;
}
async function openDialog(){
  if(!teacher())return;
  let dest;
  try{dest=current().project;validateProject(dest);}catch(e){toast('Import unavailable: '+e.message);return;}
  sourceList.length=0;
  try{
    const library=await listLessons();
    sourceList.push(...library.filter(r=>r.project?.v===2).map(r=>({key:'lib:'+r.id,title:r.title,project:r.project,kind:'Scene Library'})));
  }catch(e){console.warn('Scene Library could not be read',e);}
  sourceList.push(...readOpenTabs());
  // Same named source may exist in an open tab and Library; they are deliberately
  // separate snapshots so unsaved changes in an open tab are still importable.
  for(const s of sourceList)s.compatible=validSource(s.project,dest);
  updateChoices();
  modal.hidden=false;chooser.focus();
}
async function applyImport(){
  const source=sourceList.find(s=>s.key===selectedSource);
  if(!source||!selectedIndices.size)return;
  submit.disabled=true;
  const b=bridge();
  let original;
  try{
    original=current();
    const project=original.project;
    // Current active chapter is read from the app's tab snapshot, if available;
    // otherwise the current project's saved start chapter is authoritative.
    const liveIndex=Number.isInteger(original.chapterIndex)?original.chapterIndex:
      Number.isInteger(original.currentChapter)?original.currentChapter:project.start;
    const indices=[...selectedIndices].sort((a,c)=>a-c);
    const imported=buildChapterImport(project,source.project,indices,{
      position:placement.value,afterIndex:liveIndex,
      withActivities:include.checked,validate:validateProject
    });
    const next=structuredClone(original);next.project=imported;
    // Mark as changed without altering the last successfully saved Library snapshot.
    // Keep libraryLessonId: Save to Library updates the destination, never the source.
    await b.activate(next);
    window.__AnatomIQWorkspaceTabs?.syncActive?.();
    modal.hidden=true;
    toast(`Imported ${indices.length} chapter${indices.length===1?'':'s'}. Save the destination lesson when ready.`);
  }catch(e){
    console.error('Chapter import failed',e);
    if(original){try{await b.activate(original);window.__AnatomIQWorkspaceTabs?.syncActive?.();}catch(restore){console.error('Could not restore lesson after import failure',restore);}}
    toast('Could not import chapters: '+e.message);
  }finally{updateSubmit();}
}
function install(){
  if($('anat357-import-chapters')||!teacher())return;
  const file=$('menu-file');if(!file)return;
  const trigger=el('button',{id:'anat357-import-chapters',type:'button',class:'menu-item',role:'menuitem'},'Import Chapters…');
  const before=$('import-project');file.insertBefore(trigger,before||null);
  trigger.addEventListener('click',()=>{file.hidden=true;void openDialog();});
  const add=$('add-chapter');
  if(add?.parentElement&&!$('anat357-import-chapters-inline')){
    const small=el('button',{id:'anat357-import-chapters-inline',type:'button',class:'button small subtle'},'Import Chapters…');
    add.parentElement.append(small);small.addEventListener('click',()=>void openDialog());
  }
  modal=el('div',{id:'anat357-import-dialog',class:'anat357-backdrop',role:'presentation'});modal.hidden=true;
  const panel=el('section',{class:'anat357-panel',role:'dialog','aria-modal':'true','aria-labelledby':'anat357-title'});
  const title=el('h2',{id:'anat357-title'},'Import Chapters');
  const close=el('button',{type:'button',class:'button small subtle'},'Cancel');close.addEventListener('click',()=>modal.hidden=true);
  const top=el('div',{class:'anat357-top'});top.append(title,close);
  const label=el('label',{},'Source lesson');chooser=el('select',{id:'anat357-source'});label.append(chooser);
  chooser.addEventListener('change',()=>{selectedSource=chooser.value;renderChapters();});
  info=el('p',{class:'anat357-help'});list=el('div',{class:'anat357-chapters'});
  const positionLabel=el('label',{},'Insert chapters');placement=el('select',{id:'anat357-position'});
  for(const [key,name]of [['end','At end of lesson'],['after','After current chapter']])placement.append(el('option',{value:key},name));
  positionLabel.append(placement);
  const activityLabel=el('label',{class:'anat357-check'});include=el('input',{type:'checkbox',id:'anat357-activities'});include.checked=true;
  activityLabel.append(include,document.createTextNode(' Include Guided activities'));
  submit=el('button',{type:'button',class:'button'},'Import Selected Chapters');submit.addEventListener('click',()=>void applyImport());
  const limit=el('p',{id:'anat357-limit',class:'anat357-help'});
  const actions=el('div',{class:'anat357-actions'});actions.append(limit,submit);
  panel.append(top,label,info,list,positionLabel,activityLabel,actions);modal.append(panel);document.body.append(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)modal.hidden=true;});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
