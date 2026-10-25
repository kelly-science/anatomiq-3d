/** AnatomIQ Studio 2.2.6 — static, teacher-owned GitHub lesson publishing.
 * Fine-grained personal access tokens are ONLY accepted as function arguments.
 * Never put authentication in URLs, localStorage, Cache Storage or student files.
 */
import {validateProject} from './scene-codec.js';

export const PUBLIC_LESSON_CACHE='anatomiq-public-lessons-v1';
const API='https://api.github.com';
const RAW='https://raw.githubusercontent.com';
const MAX_JSON=160_000;

export function normalizeSlug(value){
  const slug=String(value||'').trim().toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,62).replace(/-+$/,'');
  if(!slug)throw new Error('Enter a lesson URL name containing letters or numbers.');
  return slug;
}
function accountPart(value,kind){
  const s=String(value||'').trim();
  if(kind==='owner' && (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(s)))throw new Error('Enter a valid GitHub owner (username or organization).');
  if(kind==='repo' && (!/^[a-z0-9_.-]{1,100}$/i.test(s)||s==='.'||s==='..'||s.endsWith('.git')))throw new Error('Enter a valid repository name.');
  return s;
}
export function normalizeRepo(owner,repo,branch='main'){
  owner=accountPart(owner,'owner');repo=accountPart(repo,'repo');
  branch=String(branch||'').trim();
  if(!branch || branch.length>160 || !/^[a-z0-9._/-]+$/i.test(branch) || /(?:^|\/)\.|\.\.|\/\/|\/\.$|\/$|^\//.test(branch) || branch.endsWith('.lock'))
    throw new Error('Enter a valid existing Git branch name.');
  return {owner,repo,branch};
}
export function lessonRef(owner,repo,branch,slug){
  const r=normalizeRepo(owner,repo,branch);return {...r,slug:normalizeSlug(slug)};
}
export function lessonPath(ref){return `lessons/${ref.slug}.json`;}
export function encodePublicReference(ref){
  const p=lessonRef(ref.owner,ref.repo,ref.branch,ref.slug);
  return `${p.owner}/${p.repo}/${p.slug}@${encodeURIComponent(p.branch)}`;
}
export function parsePublicReference(hash){
  if(!hash.startsWith('#lesson='))throw new Error('Not a live lesson URL.');
  const segment=hash.slice('#lesson='.length);
  if(segment.length>480 || !segment.includes('@'))throw new Error('Invalid live lesson reference.');
  const at=segment.lastIndexOf('@'), path=segment.slice(0,at).split('/');
  if(path.length!==3)throw new Error('Live lesson URL needs owner/repository/lesson.');
  let branch;
  try{branch=decodeURIComponent(segment.slice(at+1));}catch{throw new Error('Invalid branch encoding in lesson URL.');}
  const r=lessonRef(path[0],path[1],branch,path[2]);
  if(encodePublicReference(r)!==segment)throw new Error('Malformed live lesson URL.');
  return r;
}
export function studentLink(base,ref,{embed=false}={}){
  const url=new URL(base);
  url.hash='lesson='+encodePublicReference(ref);url.search='';
  if(embed)url.searchParams.set('embed','1');
  return url.href;
}
export function rawLessonURL(ref){
  const r=lessonRef(ref.owner,ref.repo,ref.branch,ref.slug);
  return `${RAW}/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/${r.branch.split('/').map(encodeURIComponent).join('/')}/${lessonPath(r)}`;
}
export function resolveLessonMedia(ref,source){
  if(typeof source!=='string')return '';
  // Fully qualified HTTPS image links can be hosted anywhere.
  if(/^https:\/\//i.test(source))return source;
  const path=source.replace(/^\.\//,'');
  if(!/^(?:media|images)\/[a-z0-9_.\/-]+$/i.test(path)||path.split('/').includes('..'))return '';
  const r=lessonRef(ref.owner,ref.repo,ref.branch,ref.slug);
  return `${RAW}/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/${r.branch.split('/').map(encodeURIComponent).join('/')}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
export function contentsEndpoint(ref){
  const r=lessonRef(ref.owner,ref.repo,ref.branch,ref.slug);
  return `${API}/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/contents/${lessonPath(r)}`;
}
function apiHeaders(token){
  if(typeof token!=='string'||!token.trim())throw new Error('Connect GitHub before publishing.');
  return {'Accept':'application/vnd.github+json','Authorization':`Bearer ${token.trim()}`,'X-GitHub-Api-Version':'2022-11-28'};
}
async function apiJSON(response,what){
  let json={};try{json=await response.json();}catch{}
  if(!response.ok){
    const helpful=response.status===401?'Token invalid or expired.':response.status===403?'Permission denied or API rate-limited. Check Contents: Read and write and the selected repository.':response.status===404?'Repository, branch, or file not found (or token has no access).':response.status===409?'GitHub rejected a conflicting edit. Refresh and publish again.':String(json?.message||response.statusText||response.status);
    throw new Error(`${what}: ${helpful}`);
  }
  return json;
}
export async function verifyPublishingRepository({owner,repo,token,fetchFn=fetch}){
  owner=accountPart(owner,'owner');repo=accountPart(repo,'repo');
  const response=await fetchFn(`${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,{headers:apiHeaders(token),cache:'no-store'});
  const json=await apiJSON(response,'Could not connect to GitHub');
  if(json.private!==false)throw new Error('This repository is private. Student lessons require a public repository.');
  const result=normalizeRepo(owner,repo,json.default_branch);
  return {...result,fullName:json.full_name||`${owner}/${repo}`};
}
function utf8Base64(text){
  const bytes=new TextEncoder().encode(text);let binary='';
  // Small chunks avoid call-stack overflows and preserve unicode labels.
  for(let i=0;i<bytes.length;i+=8192){binary+=String.fromCharCode(...bytes.slice(i,i+8192));}
  return btoa(binary);
}
export async function publishToGitHub({ref,token,project,confirmOverwrite=async()=>false,fetchFn=fetch}){
  const data=validateProject(structuredClone(project));
  const r=lessonRef(ref.owner,ref.repo,ref.branch,ref.slug);
  const json=JSON.stringify(data,null,2)+'\n';
  if(new TextEncoder().encode(json).length>MAX_JSON)throw new Error('Lesson JSON exceeds 160 KB. Reduce large descriptions before publishing.');
  const uri=contentsEndpoint(r),header=apiHeaders(token);
  // Fetch the current SHA. This protects against overwriting concurrent edits.
  const currentRes=await fetchFn(`${uri}?ref=${encodeURIComponent(r.branch)}`,{headers:header,cache:'no-store'});
  let sha;
  if(currentRes.status===404){
    // Ensure 404 means the *file* is absent, not a wrong repository or branch.
    const branchRes=await fetchFn(`${API}/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/branches/${encodeURIComponent(r.branch)}`,{headers:header,cache:'no-store'});
    await apiJSON(branchRes,'Cannot find publishing branch');
  }else{
    const current=await apiJSON(currentRes,'Cannot inspect lesson file');
    if(current.type!=='file'||typeof current.sha!=='string')throw new Error('This URL is not a normal GitHub file.');
    if(!await confirmOverwrite(r))return {cancelled:true};
    sha=current.sha;
  }
  const body={message:`AnatomIQ Studio: ${sha?'Update':'Publish'} ${data.t}`,content:utf8Base64(json),branch:r.branch};
  if(sha)body.sha=sha;
  const result=await apiJSON(await fetchFn(uri,{method:'PUT',headers:{...header,'Content-Type':'application/json'},body:JSON.stringify(body)}),'GitHub publish failed');
  if(!result.commit?.sha)throw new Error('GitHub did not confirm the publication commit.');
  return {cancelled:false,updated:Boolean(sha),commit:result.commit.sha,ref:r};
}
export async function fetchPublicLesson(ref,{fetchFn=fetch,cacheStorage=globalThis.caches}={}){
  const r=lessonRef(ref.owner,ref.repo,ref.branch,ref.slug);
  const url=rawLessonURL(r);
  let cache;
  try{cache=await cacheStorage?.open(PUBLIC_LESSON_CACHE);}catch{}
  try{
    // Unique query ensures CDN/browser stale copies cannot hide an updated lesson.
    const res=await fetchFn(`${url}?anatomiq=${Date.now()}`,{cache:'no-store',credentials:'omit',redirect:'follow'});
    if(!res.ok)throw new Error(res.status===404?'This lesson has not been published, is private, or the URL is incorrect.':`HTTP ${res.status}`);
    const text=await res.text();
    if(new TextEncoder().encode(text).length>MAX_JSON)throw new Error('Published lesson exceeds 160 KB.');
    const project=validateProject(JSON.parse(text));
    try{await cache?.put(url,new Response(text,{headers:{'Content-Type':'application/json'}}));}catch{}
    return {project,offline:false};
  }catch(error){
    const old=await cache?.match(url);
    if(!old)throw new Error(`Could not retrieve GitHub lesson: ${error.message}. Connect to the internet to load it for the first time.`);
    const project=validateProject(await old.json());
    return {project,offline:true};
  }
}
