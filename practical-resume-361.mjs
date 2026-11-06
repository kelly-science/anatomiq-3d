/* AnatomIQ Studio 2.2.146 — resumable Practical attempts.
 * Drafts are separate from finalized scores; server identity comes only from
 * the authenticated Google Apps Script portal. Never send an answer as a grade.
 */
export const DRAFT_SAVE='ANATOMIQ_PRACTICAL_DRAFT_SAVE_V1';
export const DRAFT_ACK='ANATOMIQ_PRACTICAL_DRAFT_ACK_V1';
export const READY='ANATOMIQ_PRACTICAL_READY_V1';
export const HELLO='ANATOMIQ_PRACTICAL_HELLO_V1';
const PREFIX='anatomiq-practical-draft-361:';
const MAX_AGE=21*24*60*60*1000;
const clean=v=>String(v??'').trim();
const validId=v=>typeof v==='string'&&/^[a-z0-9_-]{8,100}$/i.test(v);
const validChoice=v=>typeof v==='string'&&v.length<=140;
const validQuestion=q=>q&&typeof q==='object'&&Number.isInteger(q.chapter)&&q.chapter>=0&&q.chapter<12&&
  Number.isInteger(q.s)&&q.s>=0&&typeof q.key==='string'&&q.key.length<100&&
  Array.isArray(q.choices)&&q.choices.length>=2&&q.choices.length<=8&&q.choices.every(validChoice);
export function compactQuestions(questions){
  if(!Array.isArray(questions)||!questions.length||questions.length>100)throw Error('Invalid Practical questions');
  const out=questions.map(q=>({key:q.key,chapter:q.chapter,s:q.s,choices:[...q.choices]}));
  if(!out.every(validQuestion))throw Error('Invalid Practical question identifiers');
  return out;
}
export function validDraft(d){
  return Boolean(d&&typeof d==='object'&&d.version===1&&validId(d.attemptId)&&
   Number.isInteger(d.revision)&&d.revision>=0&&d.revision<=1000&&
   Array.isArray(d.questions)&&d.questions.length>=1&&d.questions.length<=100&&d.questions.every(validQuestion)&&
   Number.isInteger(d.index)&&d.index>=0&&d.index<d.questions.length&&
   Array.isArray(d.answers)&&d.answers.length===d.index&&d.answers.every(validChoice)&&
   (d.scope==='all'||Number.isInteger(d.scope)&&d.scope>=0&&d.scope<12)&&
   typeof d.lessonKey==='string'&&d.lessonKey.length>0&&d.lessonKey.length<=100&&
   typeof d.owner==='string'&&d.owner.length>0&&d.owner.length<=200&&
   Number.isFinite(d.savedAt));
}
export function makeDraft({state,lessonKey,owner,scope='all',revision=0,now=Date.now}){
  const d={version:1,attemptId:state.attemptId358,revision,questions:compactQuestions(state.questions),
    index:state.index,answers:[...state.answers],scope,lessonKey:clean(lessonKey),owner:clean(owner),savedAt:now()};
  if(!validDraft(d))throw Error('Cannot save incomplete Practical state');
  return d;
}
export function restoreQuestions(snapshot,candidates,normalizeName=s=>String(s||'').trim()){
  if(!validDraft(snapshot)||!Array.isArray(candidates))return null;
  const restored=[];
  for(const q of snapshot.questions){
    let source=null,match=null;
    for(const group of candidates){
      const variants=Array.isArray(group?.variants)&&group.variants.length?group.variants:[group];
      const found=variants.find(v=>v?.key===q.key&&v?.chapter===q.chapter&&v?.s===q.s);
      if(found){source=group;match=found;break;}
    }
    if(!match||!q.choices.some(c=>c.toLocaleLowerCase('en-US')===normalizeName(source.name).toLocaleLowerCase('en-US')))return null;
    restored.push({...match,name:normalizeName(source.name),memberKeys:source.memberKeys||[match.key],choices:[...q.choices]});
  }
  return restored;
}
export function createPracticalResume({win=window,doc=document,storage=localStorage,now=()=>Date.now(),lessonKey=()=>'',portal=()=>null,localStudent=()=>'ungraded'}={}){
  let remote=null,account=null,portalOrigin=null,current=null,saveSeq=0,ackSeq=0,onChange=()=>{};
  const key=(owner)=>PREFIX+clean(lessonKey())+':'+clean(owner).toLowerCase();
  const owner=()=>{const s=portal();return s?.email?('google:'+s.key+':'+s.email.toLowerCase()):'local:'+clean(localStudent()).toLowerCase();};
  const canCloud=()=>Boolean(portal()?.email&&portal()?.key&&portalOrigin&&win.parent!==win);
  function status(msg,warning=false){
    let el=doc?.getElementById('anat361-save-status');
    if(!el&&doc?.createElement){el=doc.createElement('div');el.id='anat361-save-status';el.setAttribute('role','status');
      el.style.cssText='font-size:12px;margin-top:8px;opacity:.85;';(doc.getElementById('practical-question-content')||doc.getElementById('practical-panel'))?.append(el);}
    if(el){el.textContent=msg;el.style.color=warning?'#ecb56d':'';}
    try{onChange(msg,warning);}catch{}
  }
  function fromLocal(){
    try{const d=JSON.parse(storage.getItem(key(owner()))||'null');return validDraft(d)&&d.lessonKey===clean(lessonKey())&&d.owner===owner()&&now()-d.savedAt<MAX_AGE?d:null;}catch{return null;}
  }
  function get(){
    const local=fromLocal();
    if(!canCloud())return local;
    if(remote&&validDraft(remote)&&remote.owner===owner()&&remote.lessonKey===clean(lessonKey())&&now()-remote.savedAt<MAX_AGE){
      if(local&&local.attemptId!==remote.attemptId)return remote; // School account owns the authoritative attempt.
      return !local||remote.revision>local.revision?remote:local;
    }
    return local;
  }
  function persist(d){
    if(!validDraft(d)||d.owner!==owner())throw Error('Practical identity changed; cannot save this attempt');
    storage.setItem(key(owner()),JSON.stringify(d));
    current=d;status(canCloud()?'Saved on this device · Syncing with school…':'Progress saved on this device');
    if(canCloud()){
      saveSeq=d.revision;win.parent.postMessage({type:DRAFT_SAVE,draft:d},portalOrigin);
    }
    return d;
  }
  function save(state,scope='all'){
    const prior=get();const revision=Math.max(prior?.revision||0,current?.revision||0,saveSeq||0)+1;
    const d=makeDraft({state,lessonKey:lessonKey(),owner:owner(),scope,revision,now});return persist(d);
  }
  function clear(){storage.removeItem(key(owner()));current=null;remote=null;status('');}
  function request(){
    if(canCloud())win.parent.postMessage({type:HELLO},portalOrigin);
  }
  function listener(ev){
    if(win.parent===win||ev.source!==win.parent||!ev.data||typeof ev.data!=='object')return;
    const v=ev.data;
    if(v.type===READY){
      if(!/^https:\/\/(?:script\.google\.com|script\.googleusercontent\.com)$/.test(ev.origin))return;
      // The existing bridge registers AFTER this listener. Read its verified
      // session after every listener has processed the same READY message.
      queueMicrotask(()=>{
        const s=portal();if(!s?.email||!s?.key||s.email.toLowerCase()!==String(v.email||'').toLowerCase()||s.key!==v.key)return;
        portalOrigin=ev.origin;account=s.email.toLowerCase();
        const d=v.draft;
        remote=validDraft(d)&&d.owner==='google:'+s.key+':'+s.email.toLowerCase()&&d.lessonKey===clean(lessonKey())?d:null;
      });
      return;
    }
    if(v.type===DRAFT_ACK&&portalOrigin&&ev.origin===portalOrigin){
      if(v.result?.stale){request();status('School has a newer checkpoint. This device remains saved.',true);}
      else if(v.result?.ok===true){ackSeq=Math.max(ackSeq,Number(v.result.revision)||0);
        if(current?.revision<=ackSeq)status('Progress saved to school');
      }else status('Saved on this device · School sync failed. Reopen the school link to retry.',true);
    }
  }
  if(win?.parent!==win){win.addEventListener('message',listener);}
  return {get,save,clear,persist,request,owner,status,onChange:cb=>{onChange=cb;},isCloud:canCloud};
}
