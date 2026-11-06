/* AnatomIQ 2.2.144 — local graded Practical support.
 * Local results are a convenience copy on this browser, NOT an authenticated gradebook.
 * No cloud submission is performed; a separate validated Apps Script endpoint is required.
 */
const KEY_PREFIX='anatomiq-practical-assess-v1:';
const NAME_PREFIX='anatomiq-practical-name-v1:';
const boundInt=(value,max)=>Number.isInteger(value)&&value>=0&&value<max;
export function assessmentChapters(config,total=12){
  const upper=Math.max(0,Math.min(12,total));
  const possible=Array.isArray(config?.chapters)?config.chapters.filter(i=>boundInt(i,upper)):Array.from({length:upper},(_,i)=>i);
  if(config?.graded!==true)return [...new Set(possible)].sort((a,b)=>a-b);
  const selected=Array.isArray(config.assessmentChapters)?config.assessmentChapters:possible;
  return [...new Set(selected.filter(i=>possible.includes(i)))].sort((a,b)=>a-b);
}
export function normalizeAssessment(input,total=12){
  const source=input&&typeof input==='object'?input:{};
  const graded=source.graded===true;
  return {
    graded,
    assessmentChapters:graded?assessmentChapters({...source,graded:true},total):null,
    studentChoice:graded&&source.studentChoice===true,
    allowRetakes:graded&&source.allowRetakes===true,
    tracking:'local' // Google is not available until a validated server backend is connected.
  };
}
export function assessmentLessonKey(){
  // Use the published lesson URL, including its lesson ID, but never upload it.
  const identity=location.hash.match(/^#(?:lesson|scene)=/) ? location.hash : 'local:'+location.pathname;
  let x=2166136261;
  for(let i=0;i<identity.length;i++){x^=identity.charCodeAt(i);x=Math.imul(x,16777619);}
  return (x>>>0).toString(36);
}
export function safeStudentName(raw){return String(raw??'').trim().replace(/\s+/g,' ').slice(0,70);}
export function requestGradedStudentName(lessonKey=assessmentLessonKey(),storage=localStorage,promptFn=prompt){
  const key=NAME_PREFIX+lessonKey;
  let current='';try{current=safeStudentName(storage.getItem(key));}catch{}
  if(current)return current;
  const entered=promptFn('Graded Practical: enter your full name before starting. Your results will be saved on this device.', '');
  if(entered===null)return null;
  const name=safeStudentName(entered);
  if(!name)return null;
  storage.setItem(key,name);
  return name;
}
export function localAssessmentHistory(lessonKey=assessmentLessonKey(),storage=localStorage){
  try{
    const list=JSON.parse(storage.getItem(KEY_PREFIX+lessonKey)||'[]');
    return Array.isArray(list)?list.filter(r=>r&&typeof r==='object').slice(-100):[];
  }catch{return [];}
}
export function hasLocalGradedAttempt(name,lessonKey=assessmentLessonKey(),storage=localStorage){
  return localAssessmentHistory(lessonKey,storage).some(r=>r.student===name);
}
export function recordLocalGradedAttempt({result,answers=[],questions=[],name,chapters=[],attemptId,lessonKey=assessmentLessonKey(),storage=localStorage,now=()=>new Date().toISOString()}){
  if(!result||!Number.isInteger(result.total)||result.total<1||!Number.isInteger(result.correct)||result.correct<0||result.correct>result.total)
    throw new Error('Graded result is incomplete.');
  const student=safeStudentName(name);
  if(!student)throw new Error('Student name is required to save a graded Practical.');
  if(typeof attemptId!=='string'||attemptId.length<8||attemptId.length>100)throw new Error('Invalid assessment attempt ID.');
  const prior=localAssessmentHistory(lessonKey,storage);
  const repeated=prior.find(r=>r.attemptId===attemptId);
  if(repeated)return repeated; // do not double-grade repeated click events
  const details=questions.map((q,i)=>({
    target:String(q?.name||q?.correct||'').slice(0,120),
    chapter:Number.isInteger(q?.chapter)?q.chapter:null,
    answer:String(answers[i]??'').slice(0,120)
  })).slice(0,60);
  const record={version:1,attemptId,student,submittedAt:now(),chapters:[...chapters],
    correct:result.correct,total:result.total,percent:Math.round(result.correct/result.total*100),
    attempt:prior.filter(r=>r.student===student).length+1,answers:details};
  const next=[...prior,record].slice(-100);
  storage.setItem(KEY_PREFIX+lessonKey,JSON.stringify(next));
  return record;
}
