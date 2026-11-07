/* AnatomIQ 2.2.151 · Practical startup and distractor scope.
   Only teacher-selected, chapter-eligible targets may appear in answer choices. */
export function scopedDistractorPool364(fullPool,scopedConfig,chapters,filterPracticalPool){
  if(!Array.isArray(fullPool)||!Array.isArray(chapters)||typeof filterPracticalPool!=='function')
    throw new Error('Practical distractor catalog is not ready.');
  const selected=Array.isArray(scopedConfig?.chapters)?scopedConfig.chapters:[];
  if(!selected.length)return [];
  const context={...(scopedConfig||{}),chapters:selected}; // ANATOMIQ_STRICT_DISTRACTORS_366 preserve chapterRules and exclusions
  return filterPracticalPool(fullPool,context,chapters,{chapters:selected});
}
export function practicalReadiness364({practicalOnly,sceneReady,schoolRequired,schoolVerified,active}={}){
  if(!practicalOnly||active)return 'inactive';
  if(!sceneReady)return 'model';
  if(schoolRequired&&!schoolVerified)return 'school';
  return 'ready';
}
// A regular HTML form works in cross-origin School Apps Script iframes, where
// window.prompt() may be blocked without a direct user gesture.
export function requestPracticalName364({doc=document,win=window,email='',lessonKey='',school=false}={}){
  const key='anatomiq-practical-start-name-364:'+encodeURIComponent(email||'local')+':'+encodeURIComponent(lessonKey);
  let remembered='';try{remembered=String(win.localStorage.getItem(key)||'').slice(0,70);}catch{}
  return new Promise(resolve=>{
    const backdrop=doc.createElement('div');backdrop.id='anat364-name-dialog';
    backdrop.style.cssText='position:fixed;inset:0;z-index:999999;display:grid;place-items:center;padding:18px;background:rgba(7,20,28,.83)';
    const form=doc.createElement('form');form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');
    form.setAttribute('aria-label','Confirm Practical student name');
    form.style.cssText='background:#17323b;color:#f3fffd;border:1px solid #71ada7;border-radius:15px;padding:24px;max-width:410px;width:100%;font:15px system-ui;box-shadow:0 20px 65px #0008';
    const heading=doc.createElement('h2');heading.textContent='Begin graded Practical';heading.style.cssText='margin:0 0 11px;font:700 22px system-ui';
    const details=doc.createElement('p');details.textContent=school&&email?'School account verified: '+email:'Enter your name to identify this device’s graded Practical attempt.';details.style.cssText='margin:0 0 15px;line-height:1.5';
    const label=doc.createElement('label');label.textContent='Student name';label.style.display='block';
    const input=doc.createElement('input');input.type='text';input.required=true;input.maxLength=70;input.autocomplete='name';input.value=remembered;
    input.style.cssText='display:block;width:100%;box-sizing:border-box;margin:7px 0 14px;padding:11px;background:#0d242c;border:1px solid #83b3b0;color:white;border-radius:9px;font:inherit';
    const status=doc.createElement('p');status.style.cssText='min-height:15px;color:#ffcebd;font-size:13px';status.setAttribute('role','alert');
    const btn=doc.createElement('button');btn.type='submit';btn.textContent='Start Practical';btn.style.cssText='background:#8cdbca;color:#093536;border:0;border-radius:9px;padding:11px 16px;font:700 15px system-ui;cursor:pointer';
    label.append(input);form.append(heading,details,label,status,btn);backdrop.append(form);doc.body.append(backdrop);
    // Assessment remains locked until the learner explicitly confirms.
    form.addEventListener('submit',ev=>{
      ev.preventDefault();const name=input.value.trim().replace(/\s+/g,' ');
      if(name.length<2||name.length>70||/[\x00-\x1f\x7f]/.test(name)){status.textContent='Enter your full name (2–70 characters).';return;}
      try{win.localStorage.setItem(key,name);}catch{}
      backdrop.remove();resolve(name);
    });
    input.focus();input.select();
  });
}
export function showPracticalProblem364(message,{doc=document,retry=null,detail=''}={}){
  let root=doc.getElementById('anat364-start-status');
  if(!root){root=doc.createElement('aside');root.id='anat364-start-status';root.setAttribute('role','status');
    root.style.cssText='position:fixed;z-index:999998;left:50%;top:50%;transform:translate(-50%,-50%);max-width:min(440px,calc(100vw - 32px));width:100%;box-sizing:border-box;padding:22px;border-radius:15px;border:1px solid #80aeb1;background:#183039;color:white;box-shadow:0 16px 48px #0009;font:15px/1.5 system-ui';
    doc.body.append(root);}
  root.replaceChildren();
  const title=doc.createElement('h2');title.textContent='Practical not started';title.style.cssText='font:700 21px system-ui;margin:0 0 8px';
  const p=doc.createElement('p');p.textContent=String(message||'The assessment is not ready.');p.style.margin='0 0 10px';root.append(title,p);
  if(detail){const note=doc.createElement('p');note.textContent=String(detail);note.style.cssText='font-size:12px;opacity:.85';root.append(note);}
  if(typeof retry==='function'){
    const b=doc.createElement('button');b.type='button';b.textContent='Try starting Practical again';b.style.cssText='border:0;border-radius:9px;background:#8bdbcb;color:#103338;padding:10px 15px;font:700 14px system-ui;cursor:pointer';
    b.addEventListener('click',()=>{root.remove();retry();});root.append(b);
  }
}
export function clearPracticalProblem364(doc=document){doc.getElementById('anat364-start-status')?.remove();}
