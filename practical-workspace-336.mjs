import {schoolScriptURL,validatePracticalPublication,validateSchoolPublicationAck} from './practical-publish-362.mjs?rev=362'; // ANATOMIQ_PRACTICAL_STUDIO_PUBLISH_362
/* ANATOMIQ_PRACTICAL_WORKSPACE_336
 * Teacher full-page editor + chapter-specific Practical eligibility.
 * This module does not change the saved 3D visibility bitmaps.
 */
const SOURCES=new Set(['auto','labels','structures','all','custom']);
const KEY=/^(s:\d{1,5}|l:[0-9A-Za-z-]{6,64})$/;
const clone=value=>JSON.parse(JSON.stringify(value));

export function normalizeChapterRules(value,count=12){
  if(!Array.isArray(value))return null;
  return Array.from({length:Math.min(12,Math.max(0,count))},(_,index)=>{
    const raw=value[index];
    if(!raw||typeof raw!=='object'||!SOURCES.has(raw.source))return null;
    return {source:raw.source,keys:Array.isArray(raw.keys)?[...new Set(raw.keys.filter(k=>typeof k==='string'&&KEY.test(k)))].slice(0,2000):[]};
  });
}
export function remapChapterRules(rules,op,index,step=0,duplicate=false){
  if(!Array.isArray(rules))return null;
  const out=clone(rules);
  if(op==='insert')out.splice(index+1,0,duplicate?clone(out[index]??{source:'auto',keys:[]}):{source:'auto',keys:[]});
  if(op==='delete')out.splice(index,1);
  if(op==='move'){
    const next=index+step;
    if(next>=0&&next<out.length)[out[index],out[next]]=[out[next],out[index]];
  }
  return out.slice(0,12);
}
export function filterPracticalPool(pool,config,chapters,scope={}){
  if(!Array.isArray(pool))return [];
  const chosen=Array.isArray(scope?.chapters)?new Set(scope.chapters):null;
  const included=Array.isArray(config?.chapters)?new Set(config.chapters):null;
  const oldExcluded=new Set(Array.isArray(config?.off)?config.off:[]);
  const rules=normalizeChapterRules(config?.chapterRules,chapters?.length??12);
  return pool.map(group=>{
    const variants=(Array.isArray(group.variants)&&group.variants.length?group.variants:[group]).filter(v=>{
      const chapter=v.chapter;
      if(!Number.isInteger(chapter)||chapter<0||chapter>=chapters.length)return false;
      if(chosen&&!chosen.has(chapter))return false;
      if(included&&!included.has(chapter))return false;
      const rule=rules?.[chapter];
      if(!rule)return !oldExcluded.has(v.key); // Old lessons retain their exact question exclusions.
      switch(rule.source){
        case 'labels':return v.type==='label';
        case 'structures':return v.type==='structure';
        case 'all':return true;
        case 'custom':return rule.keys.includes(v.key);
        case 'auto':return (chapters[chapter]?.labels?.length>0)?v.type==='label':v.type==='structure';
        default:return false;
      }
    });
    if(!variants.length)return null;
    return {...group,key:variants[0].key,type:variants[0].type,
      memberKeys:[...new Set(variants.map(v=>v.key))],variants,
      chapters:[...new Set(variants.map(v=>v.chapter))]};
  }).filter(Boolean);
}

function element(tag,cls,text){
  const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
}
function button(label,cls='',onClick){const el=element('button',cls,label);el.type='button';if(onClick)el.addEventListener('click',onClick);return el;}
function labelControl(title,control){const outer=element('label','anat336-field');outer.append(element('span','anat336-field-label',title),control);return outer;}
const matching=(group,query)=>`${group.name||''} ${group.system||''} ${group.tissue||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());

export function createPracticalWorkspace({trigger,getChapters,getPool,getConfig,saveConfig,getLessonTitle,publishPractical}){
  let publishState362=null;
  window.addEventListener('message',event=>{
    const state=publishState362;
    if(!state?.requestId||!state?.scriptUrl||state.url)return;
    const result=validateSchoolPublicationAck(event,state.requestId,state.scriptUrl);
    if(!result)return;
    state.url=result.url;state.busy=false;
    state.message=result.existing?'Existing school Practical registration confirmed.':'School Practical registered. Copy the student link below.';
    if(tab==='publish'&&draft)render();
  }); // ANATOMIQ_PRACTICAL_STUDIO_PUBLISH_362
  if(!trigger||typeof getChapters!=='function'||typeof saveConfig!=='function')throw new Error('Practical workspace requires teacher menu and lesson callbacks.');
  let draft=null,initial='',selected=0,tab='questions',query='',returnFocus=null,dialogOpen=false,poolCache=[];
  const root=element('section','anat336-workspace');root.id='anat336-workspace';root.hidden=true;
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Practical setup');
  root.innerHTML=`
    <header class="anat336-header">
      <button type="button" id="anat336-back" class="anat336-back" aria-label="Back to Studio">← <span>Back to Studio</span></button>
      <div class="anat336-header-title"><strong>Practical setup</strong><small id="anat336-lesson"></small></div>
      <div class="anat336-header-actions"><span id="anat336-save-state" aria-live="polite"></span><button type="button" class="anat336-button primary" id="anat336-save">Save changes</button></div>
    </header>
    <div class="anat336-content">
      <aside class="anat336-sidebar" aria-label="Practical chapters">
        <div class="anat336-sidebar-label">CHAPTERS</div><div id="anat336-chapters" class="anat336-chapters"></div>
        <div class="anat336-aside-note">Question eligibility is independent of which structures are visible in the 3D scene.</div>
      </aside>
      <main class="anat336-main">
        <div class="anat336-intro"><h1 id="anat336-heading">Chapter settings</h1><p id="anat336-subheading"></p></div>
        <nav class="anat336-tabs" aria-label="Practical settings sections">
          <button type="button" data-tab="questions">Questions</button><button type="button" data-tab="presentation">Presentation</button><button type="button" data-tab="assessment">Assessment</button><button type="button" data-tab="preview">Preview</button><button type="button" data-tab="publish">Publish</button>
        </nav>
        <div id="anat336-editor" class="anat336-editor"></div>
      </main>
      <aside class="anat336-inspector" aria-label="Practical question summary"><div class="anat336-summary"><span class="anat336-eyebrow">QUESTION POOL</span><strong id="anat336-total">0</strong><span id="anat336-total-label">eligible questions</span><div id="anat336-chapter-summaries"></div><p>Model visibility is never changed by these settings.</p></div></aside>
    </div>
    <div class="anat336-confirm" id="anat336-confirm" hidden><div class="anat336-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="anat336-confirm-title"><h2 id="anat336-confirm-title">Unsaved practical changes</h2><p>Save your practical setup before returning to Studio?</p><div><button type="button" data-confirm="cancel">Cancel</button><button type="button" data-confirm="discard">Discard</button><button type="button" class="primary" data-confirm="save">Save changes</button></div></div></div>`;
  document.body.append(root);
  const $=id=>root.querySelector('#'+id);
  const chapters=()=>getChapters()||[];
  const getRule=()=>draft.chapterRules?.[selected]??null;
  const dirty=()=>JSON.stringify(draft)!==initial;
  const setRule=(rule)=>{draft.chapterRules??=Array.from({length:chapters().length},()=>null);draft.chapterRules[selected]=rule;render();};
  const getSummary=(n)=>filterPracticalPool(poolCache,draft,chapters(),{chapters:[n]});
  function markState(){ $('anat336-save-state').textContent=dirty()?'Unsaved changes':'All changes saved';$('anat336-save').disabled=!dirty(); }
  function renderSidebar(){
    const area=$('anat336-chapters');area.replaceChildren();
    chapters().forEach((ch,i)=>{
      const row=button(`${i+1}. ${ch.t||'Untitled chapter'}`,'anat336-chapter'+(selected===i?' active':''),()=>{selected=i;query='';render();});
      row.setAttribute('aria-current',selected===i?'true':'false');
      row.append(element('small','',`${getSummary(i).length} questions`));area.append(row);
    });
  }
  function renderSummary(){
    const list=$('anat336-chapter-summaries');list.replaceChildren();
    let total=0;chapters().forEach((ch,i)=>{const n=getSummary(i).length;total+=n;const row=element('div','anat336-summary-row');row.append(element('span','',`${i+1}. ${ch.t}`),element('strong','',String(n)));list.append(row);});
    $('anat336-total').textContent=String(total);$('anat336-total-label').textContent='chapter-eligible answers (before answer deduplication)';
  }
  function textRow(head,help){const el=element('div','anat336-block-heading');el.append(element('h2','',head),element('p','',help));return el;}
  function renderQuestions(){
    const pane=$('anat336-editor');pane.replaceChildren();
    const settings=element('div','anat336-panel');
    const enabled=element('input');enabled.type='checkbox';enabled.checked=draft.on;enabled.addEventListener('change',()=>{draft.on=enabled.checked;render();});
    const enabledRow=element('label','anat336-toggle');enabledRow.append(enabled,element('span','','Enable student practical'));settings.append(enabledRow);
    const included=element('input');included.type='checkbox';included.checked=!Array.isArray(draft.chapters)||draft.chapters.includes(selected);
    included.addEventListener('change',()=>{
      const allowed=new Set(Array.isArray(draft.chapters)?draft.chapters:chapters().map((_,i)=>i));
      if(included.checked)allowed.add(selected);else allowed.delete(selected);
      draft.chapters=allowed.size===chapters().length?null:[...allowed].sort((a,b)=>a-b);render();
    });
    const includedRow=element('label','anat336-toggle');includedRow.append(included,element('span','','Include this chapter in the practical'));settings.append(includedRow);
    const count=element('input','anat336-input');count.type='number';count.min='1';count.max='60';count.value=draft.count;count.addEventListener('change',()=>{draft.count=Math.max(1,Math.min(60,Math.floor(Number(count.value)||15)));render();});
    settings.append(labelControl('Questions per attempt (across selected chapters)',count));
    pane.append(settings);
    pane.append(textRow('Question source','Choose what can be asked in this chapter. Visible anatomy is unchanged.'));
    const sourcePanel=element('div','anat336-panel anat336-sources');
    const choices=[['auto','Recommended: teacher labels when present; otherwise bones/structures'],['labels','Teacher labels only'],['structures','Anatomical structures only'],['all','All visible structures and teacher labels'],['custom','Custom question selection'],['legacy','Use old lesson-wide exclusions']];
    for(const [key,title] of choices){
      const row=element('label','anat336-radio'),input=element('input');input.type='radio';input.name='anat336-source';input.value=key;input.checked=(getRule()?.source||'legacy')===key;
      input.addEventListener('change',()=>{if(!input.checked)return;
        let keys=[];
        if(key==='custom'){
          const prev=getRule();keys=prev?.source==='custom'?prev.keys:
            getSummary(selected).flatMap(g=>g.variants.filter(v=>v.chapter===selected).map(v=>v.key));
        }
        setRule(key==='legacy'?null:{source:key,keys:[...new Set(keys)]});
      });row.append(input,element('span','',title));sourcePanel.append(row);
    }
    pane.append(sourcePanel);
    pane.append(textRow('Testable targets',getRule()?.source==='custom'?'Select or deselect the exact questions for this chapter.':'Preview the available targets. Select Custom question selection to edit individual questions.'));
    const search=element('input','anat336-input anat336-search');search.type='search';search.placeholder='Search anatomical structures and teacher labels';search.value=query;
    search.addEventListener('input',()=>{query=search.value;renderTargets();});
    pane.append(search);
    const bulk=element('div','anat336-bulk');bulk.id='anat336-bulk';pane.append(bulk);
    const targetList=element('div','anat336-targets');targetList.id='anat336-targets';pane.append(targetList);
    renderTargets();
  }
  function renderTargets(){
    const list=$('anat336-targets'),bulk=$('anat336-bulk');if(!list||!bulk)return;
    list.replaceChildren();bulk.replaceChildren();
    const allowedKeys=new Set(getSummary(selected).flatMap(g=>g.variants.map(v=>`${v.chapter}:${v.key}`)));
    const candidates=poolCache.flatMap(g=>{
      const variants=(g.variants||[g]).filter(v=>v.chapter===selected);
      return variants.length?[{...g,variants}]:[];
    }).filter(g=>matching(g,query));
    const custom=getRule()?.source==='custom';
    if(custom){
      const apply=(yes)=>{
        const keys=new Set(getRule().keys);
        for(const g of candidates)for(const v of g.variants){if(yes)keys.add(v.key);else keys.delete(v.key);}
        setRule({source:'custom',keys:[...keys]});
      };
      bulk.append(button('Select matching','anat336-button',()=>apply(true)),button('Deselect matching','anat336-button',()=>apply(false)));
    }
    for(const type of ['structure','label']){
      const group=candidates.filter(g=>g.variants.some(v=>v.type===type));if(!group.length)continue;
      const section=element('section','anat336-target-group');
      section.append(element('h3','',type==='label'?'Teacher labels':'Anatomical structures'));
      for(const g of group.slice(0,500)){
        const row=element('label','anat336-target'),box=element('input');box.type='checkbox';box.disabled=!custom;
        const relevant=g.variants.filter(v=>v.type===type);
        box.checked=custom?relevant.some(v=>getRule().keys.includes(v.key)):
          relevant.some(v=>allowedKeys.has(`${v.chapter}:${v.key}`));
        box.addEventListener('change',()=>{
          const keys=new Set(getRule().keys);
          for(const v of relevant){if(box.checked)keys.add(v.key);else keys.delete(v.key);}
          setRule({source:'custom',keys:[...keys]});
        });
        const copy=element('span','anat336-target-copy');copy.append(element('strong','',g.name),element('small','',g.system||'Anatomy'));
        row.append(box,copy);section.append(row);
      }
      list.append(section);
    }
    if(!list.children.length)list.append(element('p','anat336-empty','No matching targets in this chapter.'));
    if(candidates.length>500)list.append(element('small','anat336-empty','Use search to narrow the list.'));
  }
  function renderPresentation(){
    const pane=$('anat336-editor');pane.replaceChildren();pane.append(textRow('Question presentation','These options apply to the whole practical, regardless of chapter.'));
    const settings=element('div','anat336-panel');const modes=[['question-label','Question label with connector'],['yellow-dot','Yellow target dot']];
    for(const [value,label] of modes){const row=element('label','anat336-radio'),radio=element('input');radio.type='radio';radio.name='anat336-markers';radio.value=value;radio.checked=(draft.markerStyle||'question-label')===value;
      radio.addEventListener('change',()=>{draft.markerStyle=value;render();});row.append(radio,element('span','',label));settings.append(row);}
    settings.append(element('p','anat336-help','Whole-structure questions highlight the target bone. The selected marker style is used for teacher-authored labels.'));
    pane.append(settings);
  }
  // ANATOMIQ_GRADED_PRACTICAL_358 — teacher-owned graded assessment settings.
  function renderAssessment(){
    const pane=$('anat336-editor');pane.replaceChildren();
    pane.append(textRow('Graded assessment','Graded mode uses the teacher-selected chapters. Existing ungraded Practicals keep student chapter selection.'));
    const area=element('div','anat336-panel');
    const graded=element('input');graded.type='checkbox';graded.checked=draft.graded===true;
    graded.addEventListener('change',()=>{
      draft.graded=graded.checked;
      if(draft.graded){draft.on=true;const available=chapters().map((_,i)=>i).filter(i=>!Array.isArray(draft.chapters)||draft.chapters.includes(i));
        if(!Array.isArray(draft.assessmentChapters)||!draft.assessmentChapters.length)draft.assessmentChapters=available;}
      render();
    });
    const gradedRow=element('label','anat336-toggle');gradedRow.append(graded,element('span','','Graded Practical'));area.append(gradedRow);
    if(draft.graded){
      area.append(element('h3','','Chapters included in this assessment'));
      const permitted=chapters().map((_,i)=>i).filter(i=>!Array.isArray(draft.chapters)||draft.chapters.includes(i));
      const selectedSet=new Set(Array.isArray(draft.assessmentChapters)?draft.assessmentChapters:permitted);
      for(const i of permitted){
        const checkbox=element('input');checkbox.type='checkbox';checkbox.checked=selectedSet.has(i);
        checkbox.addEventListener('change',()=>{const next=new Set(selectedSet);if(checkbox.checked)next.add(i);else next.delete(i);
          if(!next.size){checkbox.checked=true;return;}draft.assessmentChapters=[...next].sort((a,b)=>a-b);render();});
        const row=element('label','anat336-toggle');row.append(checkbox,element('span','',`${i+1}. ${chapters()[i].t||'Untitled chapter'}`));area.append(row);
      }
      if(!permitted.length)area.append(element('p','anat336-help','Enable at least one chapter under Questions before grading.'));
      const choice=element('input');choice.type='checkbox';choice.checked=draft.studentChoice===true;
      choice.addEventListener('change',()=>{draft.studentChoice=choice.checked;render();});
      const choiceRow=element('label','anat336-toggle');choiceRow.append(choice,element('span','','Allow students to choose among these chapters (off = one combined test)'));area.append(choiceRow);
      const retake=element('input');retake.type='checkbox';retake.checked=draft.allowRetakes===true;
      retake.addEventListener('change',()=>{draft.allowRetakes=retake.checked;render();});
      const retakeRow=element('label','anat336-toggle');retakeRow.append(retake,element('span','','Allow additional local attempts'));area.append(retakeRow);
      area.append(element('p','anat336-help','Local results are retained in each student browser; they are not an authenticated school gradebook.'));
    }
    const only=document.createElement('input');only.type='checkbox';only.checked=draft.practicalOnly===true;
    only.addEventListener('change',()=>{
      draft.practicalOnly=only.checked;
      if(only.checked){draft.on=true;draft.studentChoice=false;}
      render();
    });
    const onlyRow=element('label','anat336-toggle');
    onlyRow.append(only,element('span','','Practical Only · Start immediately; hide all other chapters'));
    area.append(onlyRow);
    area.append(element('p','anat336-help','Students open directly into the combined Practical. Chapter navigation, normal exploration, and Exit are disabled. Google-tracked tests wait for the school account to be verified.'));
    pane.append(area);
  }
  // ANATOMIQ_PRACTICAL_CLOUD_360 // ANATOMIQ_PRACTICAL_ONLY_363 — a registered school link is the only Google tracking route.
  // ANATOMIQ_PRACTICAL_STUDIO_PUBLISH_362 — Studio owns Practical publication.
  // The Apps Script dashboard is for results and managing already-published tests.
  function renderPublish(){
    const pane=$('anat336-editor');pane.replaceChildren();
    pane.append(textRow('Publish Practical','Configure assessment tracking here. School publishing automatically registers the test after its lesson is published to GitHub.'));
    const area=element('div','anat336-panel');
    area.append(element('h3','','Results destination'));
    const chooser=element('select');chooser.setAttribute('aria-label','Practical tracking destination');
    for(const [value,name] of [['local','Local device'],['google','Google Apps Script · school account']]){
      const opt=element('option','',name);opt.value=value;chooser.append(opt);
    }
    chooser.value=draft.tracking==='google'?'google':'local';chooser.disabled=draft.graded!==true;
    chooser.addEventListener('change',()=>{draft.tracking=chooser.value;publishState362=null;render();});
    area.append(labelControl('Results tracking',chooser));
    if(draft.graded!==true){
      area.append(element('p','anat336-help','First enable Graded Practical on the Assessment tab.'));
    }else if(chooser.value==='local'){
      area.append(element('p','anat336-help','Local results stay on the student device. Save your changes, then use the normal lesson publishing workflow if you want a student link.'));
    }else{
      const intro=element('p','anat336-help','AnatomIQ will save the Practical, publish the lesson with your existing GitHub connection, and open the authenticated school registration page. You do not need to publish again in the Results dashboard.');area.append(intro);
      const entry=element('input');entry.type='url';entry.placeholder='https://script.google.com/macros/s/.../exec';
      entry.setAttribute('aria-label','School Apps Script Web app URL');
      try{entry.value=localStorage.getItem('anatomiq-practical-teacher-script-360')||'';}catch{}
      area.append(labelControl('School Apps Script Web app URL',entry));
      const publish=element('button','anat336-button primary','Publish Graded Practical');publish.type='button';
      publish.disabled=publishState362?.busy===true;
      const state=element('p','anat336-help');state.setAttribute('role','status');
      state.textContent=publishState362?.message||'A GitHub publishing connection is required. Set it up once through File → Publish if you have not connected yet.';
      publish.addEventListener('click',async()=>{
        if(publishState362?.busy)return;
        let script;
        try{script=schoolScriptURL(entry.value);validatePracticalPublication(draft);}
        catch(error){state.textContent=error.message;return;}
        try{localStorage.setItem('anatomiq-practical-teacher-script-360',script);}catch{}
        if(!save())return;
        // Created per click, then stored before the browser opens the portal.
        const requestId='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,19);
        publishState362={requestId,scriptUrl:script,busy:true,message:'Publishing lesson to GitHub…',url:null};
        publish.disabled=true;state.textContent=publishState362.message;
        try{
          const result=await publishPractical({config:clone(draft),title:getLessonTitle?.()||'AnatomIQ Practical',scriptUrl:script,requestId});
          if(!result){publishState362.message='Publication cancelled. No school assessment registered.';}
          else{publishState362.registrationUrl=result.registrationUrl;
            if(!publishState362.url)publishState362.message='GitHub lesson published. The school registration window is confirming your teacher account. Copy the student link there after confirmation.';}
        }catch(error){publishState362.message='Publication not completed: '+(error?.message||String(error));}
        finally{publishState362.busy=false;render();}
      });
      area.append(publish,state);
      if(publishState362?.registrationUrl&&!publishState362.url){
        const retry=element('a','anat336-button','Open school registration window');retry.href=publishState362.registrationUrl;
        retry.target='_blank';retry.rel='noopener';area.append(retry);
      }
      if(publishState362?.url){
        area.append(element('h3','','School student link — ready to share'));
        const resultInput=element('input');resultInput.readOnly=true;resultInput.value=publishState362.url;
        resultInput.setAttribute('aria-label','School Practical student link');area.append(resultInput);
        const copy=element('button','anat336-button','Copy student link');copy.type='button';
        copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(resultInput.value);state.textContent='Student link copied.';}
          catch{resultInput.select();state.textContent='Select and copy the student link.';}});area.append(copy);
      }
      area.append(element('p','anat336-help','Use the school link—not the ordinary GitHub link—for graded submissions. The school verifies each student account; answer scoring is still performed by the browser.'));
    }
    pane.append(area);
  }
  function renderPreview(){
    const pane=$('anat336-editor');pane.replaceChildren();pane.append(textRow('Question-pool preview','This is the exact eligible question pool before randomized selection; it does not launch student mode.'));
    const groups=getSummary(selected);const grid=element('div','anat336-preview-grid');
    if(!groups.length)grid.append(element('p','anat336-empty','No eligible targets. Choose another question source or enable the chapter.'));
    groups.forEach((g,i)=>{
      const card=element('article','anat336-preview-card');card.append(element('small','',`QUESTION TARGET ${i+1} · ${g.variants[0].type==='label'?'TEACHER LABEL':'STRUCTURE'}`));
      card.append(element('strong','',g.name));card.append(element('span','',`Chapter ${selected+1} · ${g.system||'Anatomy'}`));grid.append(card);
    });pane.append(grid);
    pane.append(element('p','anat336-help',`${groups.length} eligible answers in this chapter; each student attempt uses up to ${draft.count} questions across the selected chapters.`));
  }
  function render(){
    if(!draft)return;
    selected=Math.min(selected,Math.max(0,chapters().length-1));
    $('anat336-lesson').textContent=getLessonTitle?.()||'Teacher Studio';
    $('anat336-heading').textContent=`Chapter ${selected+1} · ${chapters()[selected]?.t||'Untitled chapter'}`;
    $('anat336-subheading').textContent='Choose testable structures independently of the anatomical scene.';
    root.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));});
    renderSidebar();renderSummary();
    if(tab==='presentation')renderPresentation();else if(tab==='assessment')renderAssessment();else if(tab==='publish')renderPublish();else if(tab==='preview')renderPreview();else renderQuestions();
    markState();
  }
  function save(){
    try{if(draft.graded){const allowed=chapters().map((_,i)=>i).filter(i=>!Array.isArray(draft.chapters)||draft.chapters.includes(i));const selected=Array.isArray(draft.assessmentChapters)?draft.assessmentChapters:allowed;const valid=[...new Set(selected.filter(i=>allowed.includes(i)))];if(!valid.length)throw new Error('Select at least one enabled chapter for this graded Practical.');draft.assessmentChapters=valid;}saveConfig(clone(draft));initial=JSON.stringify(draft);markState();return true;}
    catch(error){$('anat336-save-state').textContent=`Could not save: ${error.message}`;return false;}
  }
  function close(){dialogOpen=false;$('anat336-confirm').hidden=true;root.hidden=true;document.body.classList.remove('anat336-open');draft=null;returnFocus?.focus?.();}
  function requestClose(){if(!dirty()){close();return;}dialogOpen=true;$('anat336-confirm').hidden=false;root.querySelector('[data-confirm="cancel"]').focus();}
  root.querySelector('#anat336-back').addEventListener('click',requestClose);
  root.querySelector('#anat336-save').addEventListener('click',save);
  root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render();}));
  root.querySelectorAll('[data-confirm]').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.confirm==='cancel'){$('anat336-confirm').hidden=true;dialogOpen=false;return;}
    if(b.dataset.confirm==='save'&&!save())return;
    close();
  }));
  const moveToFullscreenHost=()=>{
    if(root.hidden)return;
    const host=document.fullscreenElement||document.webkitFullscreenElement||document.body;
    if(!host.contains(root))host.append(root);
  };
  document.addEventListener('fullscreenchange',moveToFullscreenHost);
  document.addEventListener('webkitfullscreenchange',moveToFullscreenHost);
  root.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(dialogOpen){$('anat336-confirm').hidden=true;dialogOpen=false;}else requestClose();}
  });
  // ANATOMIQ_PRACTICAL_LAUNCH_337 — explicit error feedback. A failed launch
  // must not look like a dead menu command on a managed Chromebook.
  function reportLaunchError(error){
    console.error('[AnatomIQ Practical setup] Could not open',error);
    let notice=document.getElementById('anat336-launch-error');
    if(!notice){
      notice=document.createElement('div');notice.id='anat336-launch-error';
      notice.setAttribute('role','alert');notice.setAttribute('aria-live','assertive');
      document.body.append(notice);
    }
    notice.textContent='Practical setup could not open: '+(error?.message||String(error));
    Object.assign(notice.style,{
      position:'fixed',right:'18px',bottom:'24px',maxWidth:'min(520px,calc(100vw - 36px))',
      padding:'16px 20px',zIndex:'2147483647',borderRadius:'9px',
      background:'#a92b32',color:'#fff',font:'600 14px/1.4 sans-serif',
      boxShadow:'0 10px 30px #0007',pointerEvents:'none'
    });
    clearTimeout(reportLaunchError.timer);
    reportLaunchError.timer=setTimeout(()=>notice.remove(),9000);
  }
  const open=()=>{
    if(root.hidden===false)return;
    try{
      const available=chapters();
      if(!Array.isArray(available)||!available.length)
        throw new Error('No lesson chapters are ready. Finish loading the lesson and try again.');
      returnFocus=document.activeElement;selected=0;tab='questions';query='';
      const current=getConfig();
      if(!current||typeof current!=='object')throw new Error('Practical configuration is unavailable.');
      initial=JSON.stringify(current);
      draft=clone(current);
      poolCache=getPool();
      if(!Array.isArray(poolCache))throw new Error('Practical question pool is unavailable.');
      // Editor-only recommendation. Existing lessons are not migrated until Save.
      if(!Array.isArray(draft.chapterRules))draft.chapterRules=available.map(()=>({source:'auto',keys:[]}));
      else draft.chapterRules=normalizeChapterRules(draft.chapterRules,available.length);
      root.hidden=false;document.body.classList.add('anat336-open');
      const fs=document.fullscreenElement||document.webkitFullscreenElement;
      if(fs&&!fs.contains(root))fs.append(root);else if(!document.body.contains(root))document.body.append(root);
      render();$('anat336-back').focus();
      document.getElementById('anat336-launch-error')?.remove();
    }catch(error){
      root.hidden=true;document.body.classList.remove('anat336-open');
      draft=null;reportLaunchError(error);
    }
  };
  // Capture on the stable menu bar, not only the individual button: previous
  // menu integrations may reconstruct their descendants while open. Allow the
  // existing menu handler to close first, then show the full-page workspace.
  const menuBar=document.getElementById('studio-menubar');
  if(menuBar){
    menuBar.addEventListener('click',event=>{
      if(!event.target.closest?.('#anat336-practical-setup'))return;
      event.preventDefault();
      queueMicrotask(open);
    },true);
    menuBar.addEventListener('pointerup',event=>{
      if(event.pointerType!=='touch'||!event.target.closest?.('#anat336-practical-setup'))return;
      queueMicrotask(open);
    },true);
  }else{
    trigger.addEventListener('click',event=>{event.preventDefault();queueMicrotask(open);});
  }
  window.addEventListener('beforeunload',e=>{if(!root.hidden&&draft&&dirty()){e.preventDefault();e.returnValue='';}});
  return {open,close,isOpen:()=>!root.hidden};
}
