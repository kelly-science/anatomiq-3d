/* AnatomIQ 2.2.145 — Practical cloud bridge, v360.
 * The Apps Script portal verifies the Google account; this module never accepts
 * an email from the student as authentication and never sends scores to arbitrary embeds.
 * Scores remain client-reported. See PracticalCloud.gs for security limitations.
 */
const HELLO='ANATOMIQ_PRACTICAL_HELLO_V1';
const READY='ANATOMIQ_PRACTICAL_READY_V1';
const SUBMIT='ANATOMIQ_PRACTICAL_SUBMIT_V1';
const ACK='ANATOMIQ_PRACTICAL_ACK_V1';
const PENDING_PREFIX='anatomiq-practical-cloud-pending-v1:';
const NAME_PREFIX='anatomiq-practical-cloud-name-v1:';
const MAX_PENDING_AGE=7*24*60*60*1000;
const safeString=(value,n)=>String(value??'').trim().slice(0,n);
const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
export function trustedPortalOrigin(source){
  try{
    const u=new URL(String(source||''));
    return u.protocol==='https:'&&(
      u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'
    )?u.origin:null;
  }catch{return null;}
}
export function cleanChapters(value){
  if(!Array.isArray(value)||value.length<1||value.length>12||value.some(x=>!Number.isInteger(x)||x<0||x>=12))return null;
  const sorted=[...new Set(value)].sort((a,b)=>a-b);
  return sorted.length===value.length?sorted:null;
}
export function createCloudPayload({questions,answers,result,attemptId,studentName,normalizeAnswer=(s)=>String(s??'').trim().toLocaleLowerCase('en-US')}){
  if(!Array.isArray(questions)||!Array.isArray(answers)||!result||questions.length<1||questions.length>100||questions.length!==answers.length)
    throw new Error('Practical questions and answers are incomplete.');
  const id=safeString(attemptId,101),name=safeString(studentName,71);
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(id)||!name)throw new Error('Missing Practical attempt identity or student name.');
  const entries=questions.map((q,i)=>{
    const chapter=q?.chapter;
    if(!Number.isInteger(chapter)||chapter<0||chapter>=12)throw new Error('Invalid Practical question chapter.');
    const answer=safeString(answers[i],140),correct=safeString(q?.name,140);
    if(!correct)throw new Error('A Practical question is missing its correct answer.');
    return {chapter,kind:q.type==='label'?'label':'structure',target:correct,chosen:answer,isCorrect:normalizeAnswer(answer)===normalizeAnswer(correct)};
  });
  const computed=entries.filter(q=>q.isCorrect).length;
  if(result.correct!==computed||result.total!==entries.length)throw new Error('Practical score and answer details disagree.');
  return {attemptId:id,studentName:name,correct:computed,total:entries.length,answers:entries};
}
export function createPracticalCloudBridge({win=window,doc=document,storage=localStorage,lessonKey=()=>'',now=()=>Date.now(),setTimeoutFn=setTimeout,clearTimeoutFn=clearTimeout}={}){
  let origin=trustedPortalOrigin(doc?.referrer),ready=null,submitting=false,timeout=null,listening=false;
  let banner=null,area=null,statusText=null,retryButton=null,resolvePending=null,onConfirmation=null;
  const key=()=>{if(!ready?.email)return null;let h=2166136261;for(const ch of ready.email){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return PENDING_PREFIX+safeString(lessonKey(),100)+':'+(h>>>0).toString(36);};
  const emit=(message)=>{if(!origin||win.parent===win||typeof win.parent?.postMessage!=='function')return false;win.parent.postMessage(message,origin);return true;};
  function getPending(){
    if(!key())return null;
    try{
      const p=JSON.parse(storage.getItem(key())||'null');
      if(!p||!p.payload||!Number.isFinite(p.savedAt)||now()-p.savedAt>MAX_PENDING_AGE)return null;
      if(!/^[a-f0-9]{32}$/.test(p.assessmentKey||''))return null;
      return p;
    }catch{return null;}
  }
  function savePending(p){if(!key())throw new Error('School account is not verified.');storage.setItem(key(),JSON.stringify(p));}
  function removePending(){if(key())storage.removeItem(key());}
  function ui(){
    if(!doc?.createElement)return;
    const host=doc.getElementById('practical-results');
    if(!host)return;
    area=doc.getElementById('anat360-cloud-status');
    if(!area){area=doc.createElement('div');area.id='anat360-cloud-status';area.className='anat360-cloud-status';area.style.cssText='margin:12px 0;padding:13px 16px;border:1px solid var(--panel-border,#55717a);border-radius:12px;background:var(--panel-bg,rgba(80,150,140,.10));';
      statusText=doc.createElement('p');statusText.setAttribute('role','status');
      retryButton=doc.createElement('button');retryButton.type='button';retryButton.textContent='Retry submission';retryButton.hidden=true;retryButton.style.cssText='padding:8px 14px;border-radius:8px;cursor:pointer;';
      retryButton.addEventListener('click',()=>{void retry();});area.append(statusText,retryButton);host.append(area);
    }else{statusText=area.querySelector('p');retryButton=area.querySelector('button');}
  }
  function status(msg,canRetry=false){ui();if(statusText)statusText.textContent=msg;if(retryButton)retryButton.hidden=!canRetry;}
  function pendingBanner(){
    if(!doc?.body)return;
    if(!banner){banner=doc.createElement('div');banner.id='anat360-pending-notice';banner.className='anat360-pending-notice';banner.style.cssText='position:fixed;z-index:99999;right:16px;bottom:16px;max-width:390px;padding:14px;border:1px solid #7bc7bb;border-radius:12px;background:#18343b;color:white;box-shadow:0 6px 25px #0006;display:flex;gap:10px;align-items:center;flex-wrap:wrap;';
      const txt=doc.createElement('span');txt.textContent='An earlier graded Practical has not been confirmed by the school server.';
      const b=doc.createElement('button');b.type='button';b.textContent='Retry previous submission';b.addEventListener('click',()=>void retry());
      b.style.cssText='padding:8px;border-radius:7px;cursor:pointer';banner.append(txt,b);doc.body.append(banner);
    }
    const pending=getPending();banner.hidden=!ready||!pending||pending.assessmentKey!==ready.key;banner.style.display=banner.hidden?'none':'flex';
  }
  function listener(event){
    if(!origin||event.origin!==origin||event.source!==win.parent||!event.data||typeof event.data!=='object')return;
    const message=event.data;
    if(message.type===READY){
      const chapters=cleanChapters(message.chapters),keyValue=String(message.key||'');
      const email=String(message.email||'').trim().toLowerCase();
      if(!/^[a-f0-9]{32}$/.test(keyValue)||!chapters||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof message.canStart!=='boolean'||typeof message.allowRetakes!=='boolean')return;
      ready={key:keyValue,email,chapters,canStart:message.canStart,allowRetakes:message.allowRetakes};
      pendingBanner();
      return;
    }
    if(message.type!==ACK)return;
    const pending=getPending();
    if(!pending||!ready||pending.assessmentKey!==ready.key||pending.payload.attemptId!==message.attemptId)return;
    if(timeout!==null){clearTimeoutFn(timeout);timeout=null;}
    submitting=false;
    if(message.result?.ok===true){
      removePending();status('Practical result saved to your school account.');
      if(!ready.allowRetakes)ready.canStart=false;
      try{onConfirmation?.(message.result);}catch(error){console.warn('Practical confirmation callback:',error);}
    }else status('School submission failed: '+safeString(message.error||'Could not confirm the result.',250),true);
    pendingBanner();
    if(resolvePending){resolvePending(message.result?.ok===true);resolvePending=null;}
  }
  function start(){
    if(!origin||win.parent===win)return false;
    if(!listening){win.addEventListener('message',listener);listening=true;}
    emit({type:HELLO});return true;
  }
  function confirmName(promptFn=win.prompt?.bind(win)){
    if(!ready?.email||typeof promptFn!=='function')return null;
    const nameKey=NAME_PREFIX+ready.email;let prior='';
    try{prior=safeString(storage.getItem(nameKey),70);}catch{}
    const answer=promptFn('Confirm your name for this school Practical ('+ready.email+').',prior);
    if(answer===null)return null;const name=safeString(answer,70).replace(/\s+/g,' ');
    if(!name)return null;try{storage.setItem(nameKey,name);}catch{}return name;
  }
  function check(chapters){
    if(!origin||win.parent===win)return {ok:false,message:'Open the school-authenticated Practical link, not the ordinary student lesson link.'};
    if(!ready){start();return {ok:false,message:'Checking school sign-in. Try starting again after the school portal confirms your session.'};}
    const chosen=cleanChapters(chapters);
    if(!chosen||!equal(chosen,ready.chapters))return {ok:false,message:'The school Practical chapter selection differs from this lesson. Ask your teacher to republish the assessment.'};
    if(getPending())return {ok:false,message:'An earlier Practical submission is pending. Retry that submission before beginning another attempt.'};
    if(!ready.canStart)return {ok:false,message:'This school Practical is already submitted. Your teacher has not enabled a retake.'};
    return {ok:true};
  }
  function attempt(payload){
    if(!ready)return Promise.resolve(false);
    const p={assessmentKey:ready.key,payload,savedAt:now()};
    try{savePending(p);}catch(error){status('Could not store the unsent Practical on this device: '+String(error.message||error));return Promise.resolve(false);}
    return retry();
  }
  function retry(){
    const p=getPending();
    if(!ready||!p||p.assessmentKey!==ready.key){status('Open the original signed-in school Practical link to retry this submission.',true);return Promise.resolve(false);}
    if(submitting)return Promise.resolve(false);
    submitting=true;status('Submitting Practical result to school…');pendingBanner();
    return new Promise(resolve=>{
      resolvePending=resolve;
      if(!emit({type:SUBMIT,result:p.payload})){
        submitting=false;resolvePending=null;status('School portal unavailable. Retry from the school link.',true);resolve(false);return;
      }
      timeout=setTimeoutFn(()=>{timeout=null;submitting=false;resolvePending=null;status('No confirmation from school. Your result is saved on this device; retry submission.',true);resolve(false);},18000);
    });
  }
  function close(){
    if(listening){win.removeEventListener('message',listener);listening=false;}
    if(timeout!==null){clearTimeoutFn(timeout);timeout=null;}
    if(resolvePending){resolvePending(false);resolvePending=null;}
    submitting=false;
  }
  return {start,check,attempt,retry,close,getPending,showPending:pendingBanner,status,confirmName,session:()=>ready,onConfirmed:(callback)=>{onConfirmation=callback;}};
}
