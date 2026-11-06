/* AnatomIQ 2.2.147 — teacher-only, no-credential Practical publication handoff.
 * Publishes the lesson through the app's existing GitHub connection, then opens
 * an authenticated Apps Script teacher page to register the Practical.
 * No direct cross-origin fetch or student-submitted teacher credentials.
 */
export const PRACTICAL_PUBLISHED_362='ANATOMIQ_PRACTICAL_PUBLISHED_V1';
const APP_ORIGIN='https://kelly-science.github.io';
const MAX_TOKEN=3600;
export function schoolScriptURL(input){
  let u;
  try{u=new URL(String(input||'').trim());}catch{throw new Error('Enter the Apps Script Web app /exec URL.');}
  // Google Workspace can issue either standard or /a/macros/domain/... links.
  if(u.protocol!=='https:'||u.hostname!=='script.google.com'||
    !/^\/(?:macros\/s|a\/macros\/[A-Za-z0-9.-]+\/s)\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname))
    throw new Error('Use your school Apps Script Web app URL ending in /exec.');
  u.search='';u.hash='';return u.toString();
}
export function validatePracticalPublication(config){
  if(!config||typeof config!=='object'||config.graded!==true||config.tracking!=='google')
    throw new Error('Choose Graded Practical and Google Apps Script tracking first.');
  const chapters=Array.isArray(config.assessmentChapters)?config.assessmentChapters:[];
  if(chapters.length<1||chapters.length>12||new Set(chapters).size!==chapters.length||
    chapters.some(n=>!Number.isInteger(n)||n<0||n>11))
    throw new Error('Select at least one valid assessment chapter.');
  if(typeof config.allowRetakes!=='boolean')throw new Error('Retake configuration is missing.');
  return {chapters:[...chapters].sort((a,b)=>a-b),allowRetakes:config.allowRetakes};
}
export function makePracticalPublication(input){
  const {lessonUrl,title,chapters,allowRetakes,requestId,origin}=input||{};
  if(typeof lessonUrl!=='string'||!/^https:\/\/kelly-science\.github\.io\/anatomiq-3d\/(?:index\.html)?(?:\?[^#]*)?#lesson=[^#\s]+$/.test(lessonUrl))
    throw new Error('Publish the lesson to the authorized GitHub Pages location.');
  if(typeof title!=='string'||!title.trim()||title.length>120)throw new Error('A Practical title is required.');
  if(!Array.isArray(chapters)||chapters.length<1||chapters.length>12||new Set(chapters).size!==chapters.length||chapters.some(n=>!Number.isInteger(n)||n<0||n>11))
    throw new Error('Assessment chapters are invalid.');
  if(typeof allowRetakes!=='boolean'||typeof requestId!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(requestId))throw new Error('Assessment publication ID is invalid.');
  if(typeof origin!=='string'||!(origin===APP_ORIGIN||/^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}$/.test(origin)))
    throw new Error('Unrecognized publishing origin.');
  return {lessonUrl,title:title.trim(),chapters:[...chapters].sort((a,b)=>a-b),allowRetakes,requestId,origin};
}
export function packPracticalPublication(input){
  const data=makePracticalPublication(input);
  const bytes=new TextEncoder().encode(JSON.stringify(data));
  if(bytes.length>2400)throw new Error('Assessment publication data is too large.');
  let bin='';for(const byte of bytes)bin+=String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function unpackPracticalPublication(token){
  if(typeof token!=='string'||token.length<12||token.length>MAX_TOKEN||!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('Invalid Practical publication payload.');
  const raw=atob(token.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-token.length%4)%4));
  const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,ch=>ch.charCodeAt(0))));
  return makePracticalPublication(result);
}
export function practicalRegistrationURL(script,input){
  const url=new URL(schoolScriptURL(script));
  url.searchParams.set('view','publish-practical');
  url.searchParams.set('payload',packPracticalPublication(input));
  return url.toString();
}
export function validateSchoolPublicationAck(event,requestId,expectedOrigin){
  if(!event||!event.data||event.data.type!==PRACTICAL_PUBLISHED_362||event.data.requestId!==requestId)return null;
  let sender;try{sender=new URL(event.origin);}catch{return null;}
  // Apps Script HTML runs in Google's sandboxed iframe, often on a per-script
  // subdomain of script.googleusercontent.com. Do not trust arbitrary Google sites.
  if(sender.protocol!=='https:'||!(sender.hostname==='script.google.com'||sender.hostname==='script.googleusercontent.com'||/^[a-z0-9-]+-script\.googleusercontent\.com$/.test(sender.hostname)))return null;
  let u;
  try{u=new URL(event.data.url);}catch{return null;}
  // The only acceptable student links are our own school deployment.
  let expected;try{expected=new URL(schoolScriptURL(expectedOrigin));}catch{return null;}
  if(u.origin!==expected.origin||u.pathname!==expected.pathname||u.searchParams.get('view')!=='practical'||
    !/^[a-f0-9]{32}$/.test(u.searchParams.get('key')||''))return null;
  return {url:u.toString(),key:u.searchParams.get('key'),existing:event.data.existing===true};
}
