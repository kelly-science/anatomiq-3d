/* ANATOMIQ_GLOBAL_GEOMETRY_LIBRARY_232_20261026 — Open navigates to published lesson, not raw JSON. */
/* AnatomIQ Studio — optional read-only GitHub library and GitHub publish embeds.
 * No credentials are read, stored, or transmitted by this module.
 */
const PREF_KEY = 'anatomiq-github-library-source-v1';
const VIEWER_KEY = 'anatomiq-github-library-viewer-v1';
const $ = id => document.getElementById(id);

export function normalizeSource(owner, repo, branch='main') {
  owner = String(owner || '').trim();
  repo = String(repo || '').trim();
  branch = String(branch || 'main').trim();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(owner)) throw new Error('Enter a valid GitHub owner.');
  if (!/^[a-z0-9_.-]{1,100}$/i.test(repo) || repo==='.' || repo==='..' || repo.endsWith('.git')) throw new Error('Enter a valid GitHub repository.');
  if (!branch || branch.length>160 || !/^[a-z0-9._/-]+$/i.test(branch) || /(?:^|\/)\.|\.\.|\/\/|\/$|^\//.test(branch) || branch.endsWith('.lock')) throw new Error('Enter an existing publishing branch.');
  return {owner,repo,branch};
}

export function normalizeViewer(url) {
  let value;
  try { value = new URL(String(url || '').trim()); } catch { throw new Error('Enter the public AnatomIQ Studio viewer URL.'); }
  if (value.protocol !== 'https:' || !value.hostname || value.username || value.password) throw new Error('The viewer must use a public HTTPS URL.');
  value.hash=''; value.search='';
  if (!value.pathname.endsWith('/')) value.pathname += '/';
  return value.href;
}

export function buildStudentURL(viewer, {owner,repo,branch,slug}, embed=false) {
  const src = normalizeSource(owner, repo, branch);
  slug = String(slug||'');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61})?$/i.test(slug)) throw new Error('Invalid published lesson filename.');
  const url = new URL(normalizeViewer(viewer));
  if (embed) url.searchParams.set('embed','1');
  url.hash = `lesson=${src.owner}/${src.repo}/${slug.toLowerCase()}@${encodeURIComponent(src.branch)}`;
  return url.href;
}

export function iframeHTML(embedURL, title='AnatomIQ Studio lesson') {
  const url = new URL(embedURL);
  if (url.protocol !== 'https:' || !url.hostname || !url.hash.startsWith('#lesson=')) throw new Error('A valid published HTTPS lesson link is required.');
  const escape = value => String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<iframe src="${escape(url.href)}" title="${escape(title)}" width="100%" height="700" style="border:0;max-width:100%" allowfullscreen loading="lazy"></iframe>`;
}

export function selectLessonFiles(entries) {
  if (!Array.isArray(entries)) throw new Error('Unexpected GitHub directory response.');
  return entries.filter(item => item?.type==='file' && /^[a-z0-9](?:[a-z0-9-]{0,61})?\.json$/i.test(item.name||'') && /^lessons\/[a-z0-9-]+\.json$/i.test(item.path||'')).map(item => ({slug:item.name.slice(0,-5).toLowerCase(), name:item.name, path:item.path})).sort((a,b)=>a.slug.localeCompare(b.slug));
}

function storageRead(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storageWrite(key,value) { try { localStorage.setItem(key,value); } catch {} }
function element(tag,attrs={},text='') {
  const node=document.createElement(tag);
  for (const [key,value] of Object.entries(attrs)) {
    if (key==='className') node.className=value;
    else if (key==='type') node.type=value;
    else node.setAttribute(key,value);
  }
  if(text)node.textContent=text;
  return node;
}
async function copyValue(value,button) {
  try { await navigator.clipboard.writeText(value); button.textContent='Copied'; }
  catch { window.prompt('Copy this text:',value); }
}
function defaultViewer(){
  if (location.protocol==='https:' && !['localhost','127.0.0.1'].includes(location.hostname)) return new URL('./',location.href).href;
  return 'https://kelly-science.github.io/anatomiq-3d/';
}
function addGitHubLibrary(){
  const dialog=$('library-dialog'), toolbar=dialog?.querySelector('.library-toolbar');
  const count=$('library-count'), items=$('library-items'), summary=count?.closest('.library-summary');
  if(!dialog||!toolbar||!items||!summary||$('aiq-github-tabs'))return;
  const intro=dialog.querySelector('.dialog-header + p');
  const tabs=element('div',{id:'aiq-github-tabs',className:'aiq-github-tabs','role':'tablist','aria-label':'Lesson library source'});
  const localTab=element('button',{type:'button',className:'button small','role':'tab','aria-selected':'true'},'On This Device');
  const githubTab=element('button',{type:'button',className:'button small subtle','role':'tab','aria-selected':'false'},'GitHub Published');
  tabs.append(localTab,githubTab);
  (intro || toolbar).after(tabs);
  const localArea=element('div',{id:'aiq-local-library','role':'tabpanel'});
  const localFooter=items.nextElementSibling?.classList.contains('footnote')?items.nextElementSibling:null;
  toolbar.before(localArea);
  [toolbar,summary,items,localFooter].filter(Boolean).forEach(e=>localArea.append(e));
  const githubArea=element('div',{id:'aiq-github-library',className:'aiq-github-library','role':'tabpanel'});
  githubArea.hidden=true;
  const note=element('p',{className:'studio-hint'},'Read-only list of public lessons already published to GitHub. This does not sync or replace your local Scene Library.');
  const fields=element('div',{className:'aiq-github-fields'});
  const saved=(()=>{try{return JSON.parse(storageRead(PREF_KEY)||'null')||{};}catch{return {};}})();
  function labelled(label,value){const wrap=element('label',{},label), input=element('input',{className:'text-input',type:'text'});input.value=value||'';wrap.append(input);fields.append(wrap);return input;}
  const owner=labelled('GitHub owner',saved.owner||$('cloud-owner')?.value||'');
  const repo=labelled('Public lessons repository',saved.repo||$('cloud-repo')?.value||'');
  const branch=labelled('Branch',saved.branch||$('cloud-branch')?.value||'main');
  const viewer=labelled('Public AnatomIQ viewer URL',storageRead(VIEWER_KEY)||defaultViewer());
  const actions=element('div',{className:'aiq-github-actions'});
  const refresh=element('button',{type:'button',className:'button small'},'Refresh GitHub');
  const status=element('span',{className:'studio-hint','role':'status','aria-live':'polite'},'Enter the repository where you publish lesson JSON files.');
  const search=element('input',{className:'text-input',type:'search',placeholder:'Filter published lessons…','aria-label':'Filter GitHub lessons'});
  const list=element('div',{className:'aiq-github-list'});
  actions.append(refresh,status);githubArea.append(note,fields,actions,search,list);localArea.after(githubArea);
  let data=[], lastSource=null, requestId=0;
  function setTab(showGitHub){
    githubArea.hidden=!showGitHub;localArea.hidden=showGitHub;
    localTab.setAttribute('aria-selected',String(!showGitHub));githubTab.setAttribute('aria-selected',String(showGitHub));
    localTab.classList.toggle('subtle',showGitHub);githubTab.classList.toggle('subtle',!showGitHub);
    if(showGitHub) {
      if(!owner.value)owner.value=$('cloud-owner')?.value||'';
      if(!repo.value)repo.value=$('cloud-repo')?.value||'';
      if(!data.length && owner.value && repo.value) load();
    }
  }
  localTab.addEventListener('click',()=>setTab(false));githubTab.addEventListener('click',()=>setTab(true));
  function render(){
    list.replaceChildren();const q=search.value.trim().toLowerCase();const shown=data.filter(x=>x.slug.includes(q));
    if(!shown.length){list.append(element('p',{className:'studio-hint'},data.length?'No lessons match your search.':'No published lesson JSON files found.'));return;}
    for(const file of shown){
      const row=element('div',{className:'aiq-github-lesson'});
      const copy=element('div',{className:'aiq-github-lesson-name'});
      copy.append(element('strong',{},file.slug.replace(/-/g,' ')),element('small',{},file.path));
      const links=element('div',{className:'aiq-github-lesson-actions'});
      let url,embedded;
      try {url=buildStudentURL(viewer.value,{...lastSource,slug:file.slug});embedded=buildStudentURL(viewer.value,{...lastSource,slug:file.slug},true);}catch(e){status.textContent=e.message;return;}
      
      const copyLink=element('button',{type:'button',className:'button small subtle'},'Copy link');copyLink.addEventListener('click',()=>copyValue(url,copyLink));
      const copyFrame=element('button',{type:'button',className:'button small subtle'},'Copy iframe');copyFrame.addEventListener('click',()=>copyValue(iframeHTML(embedded,`AnatomIQ Studio — ${file.slug.replace(/-/g,' ')}`),copyFrame));
      
      const json=element('a',{href:url,className:'button small subtle','aria-label':`Open ${file.slug.replace(/-/g,' ')} lesson`},'Open');
      links.append(json,copyLink,copyFrame);row.append(copy,links);list.append(row);
    }
  }
  async function load(){
    const current=++requestId;data=[];list.replaceChildren();status.textContent='Checking GitHub…';refresh.disabled=true;
    try{
      const src=normalizeSource(owner.value,repo.value,branch.value),page=normalizeViewer(viewer.value);
      lastSource=src;
      storageWrite(PREF_KEY,JSON.stringify(src));storageWrite(VIEWER_KEY,page);
      const uri=`https://api.github.com/repos/${encodeURIComponent(src.owner)}/${encodeURIComponent(src.repo)}/contents/lessons?ref=${encodeURIComponent(src.branch)}`;
      const resp=await fetch(uri,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
      if(current!==requestId)return;
      if(resp.status===404){status.textContent='No public lessons/ folder found here. Check repository and branch.';render();return;}
      if(resp.status===403){throw new Error('GitHub API limit or permission error. Try again later.');}
      if(!resp.ok)throw new Error(`GitHub returned HTTP ${resp.status}.`);
      data=selectLessonFiles(await resp.json());
      status.textContent=`${data.length} published lesson${data.length===1?'':'s'} · ${src.owner}/${src.repo} @ ${src.branch}`;
      render();
    }catch(error){if(current===requestId){status.textContent=error.message||'Could not load GitHub lessons.';list.replaceChildren();}}
    finally{if(current===requestId)refresh.disabled=false;}
  }
  refresh.addEventListener('click',load);search.addEventListener('input',render);
  viewer.addEventListener('change',()=>{if(data.length)render();});
}
function addPublishIframe(){
  const results=$('cloud-publish-results'), source=$('cloud-embed-url');
  if(!results||!source||$('aiq-cloud-iframe-code'))return;
  const panel=element('div',{id:'aiq-cloud-iframe-panel'});
  const label=element('label',{className:'field-label',for:'aiq-cloud-iframe-code'},'HTML iframe embed code (Schoology / web pages)');
  const textarea=element('textarea',{id:'aiq-cloud-iframe-code',className:'share-url',rows:'3',readonly:'readonly','aria-label':'GitHub live lesson iframe code'});
  const actions=element('div',{className:'aiq-github-actions'});
  const copy=element('button',{type:'button',className:'button small'},'Copy iframe HTML');
  const preview=element('button',{type:'button',className:'button small subtle'},'Preview embedded view');
  const note=element('p',{className:'studio-hint'},'The embed points to the live GitHub lesson. Republish the same slug to update the lesson without changing your Schoology link. Schoology may block HTML iframes in its editor; use the embedded viewer URL as an external link when needed.');
  actions.append(copy,preview);panel.append(label,textarea,actions,note);results.append(panel);
  function update(){
    if(results.hidden)return;
    try {
      const raw=(source.value||$('cloud-student-url')?.value||'').trim();
      if(!raw){textarea.value='';return;}
      const url=new URL(raw);
      if(!url.searchParams.has('embed'))url.searchParams.set('embed','1');
      textarea.value=iframeHTML(url.href);
    } catch {textarea.value='';}
  }
  copy.addEventListener('click',()=>{update();if(textarea.value)copyValue(textarea.value,copy);});
  preview.addEventListener('click',()=>{update();if(!textarea.value)return;const url=new URL(source.value||$('cloud-student-url')?.value||'');url.searchParams.set('embed','1');window.open(url.href,'_blank','noopener,noreferrer');});
  new MutationObserver(update).observe(results,{attributes:true,attributeFilter:['hidden']});
  $('cloud-publish')?.addEventListener('click',()=>{setTimeout(update,0);setTimeout(update,300);});
  source.addEventListener('input',update);
  update();
}
export function initializeGitHubLibraryEmbed(){addGitHubLibrary();addPublishIframe();}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeGitHubLibraryEmbed,{once:true});
  else initializeGitHubLibraryEmbed();
}
