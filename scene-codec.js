/* Versioned, server-free student scene links. No user information is sent to a server. */
export const SCENE_VERSION = 1;
const MAX_FRAGMENT = 24000;
const MAX_JSON_BYTES = 160000;
export const MAX_CHAPTERS = 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal:true});

export function bytesToURL(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function urlToBytes(s) {
  if (typeof s !== 'string' || !/^[\w-]+$/.test(s) || s.length > MAX_FRAGMENT) throw new Error('Invalid or oversized scene link.');
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
export function hashForStructures(keys) {
  // Fingerprint detects renamed/reordered anatomy geometry before restoring a visibility bitmap.
  let hash = 2166136261;
  for (const char of keys.join('\n')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
export function makeVisibilityBits(visible) {
  const bytes = new Uint8Array(Math.ceil(visible.length / 8));
  visible.forEach((on, i) => { if (on) bytes[i >>> 3] |= (1 << (i & 7)); });
  return bytesToURL(bytes);
}
export function readVisibilityBits(bits, count) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 2000) throw new Error('Scene bone count is invalid.');
  const bytes = urlToBytes(bits);
  if (bytes.length !== Math.ceil(count / 8)) throw new Error('Scene visibility data is incomplete.');
  return Array.from({length: count}, (_, i) => Boolean(bytes[i >>> 3] & (1 << (i & 7))));
}
const boundedText = (value, length) => typeof value === 'string' && value.trim().length > 0 && value.length <= length;
const num = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 10000000;
const vector = (arr, n) => Array.isArray(arr) && arr.length === n && arr.every(num);
export function validateScene(scene) {
  if (!scene || typeof scene !== 'object' || Array.isArray(scene) || scene.v !== 1) throw new Error('This scene format is unsupported.');
  if (!['skull', 'skeleton', 'muscular', 'digestive', 'systems'].includes(scene.m)) throw new Error('Invalid anatomical mode.');
  if (!Number.isInteger(scene.n) || scene.n < 1 || scene.n > 2000) throw new Error('Invalid model size.');
  if (typeof scene.f !== 'string' || !/^[0-9a-z]{1,16}$/.test(scene.f)) throw new Error('Invalid model fingerprint.');
  readVisibilityBits(scene.b, scene.n);
  if(scene.ey!==undefined&&typeof scene.ey!=='boolean')throw new Error('Invalid eye layer setting.');
  if(scene.ci!==undefined && typeof scene.ci!=='boolean')throw new Error('Invalid Connective visibility migration marker.');
  if (!boundedText(scene.t, 90)) throw new Error('A scene title is required (90 characters maximum).');
  if (!['shown', 'reveal', 'hidden'].includes(scene.lm)) throw new Error('Invalid label visibility.');
  if (typeof scene.x !== 'boolean' || typeof scene.te !== 'boolean' || typeof scene.ca !== 'boolean') throw new Error('Invalid student permissions.');
  for(const prop of ['sb','dm','sm','dg','hd','cv','rs','nv','ur','ly','cn','cm'])if(scene[prop]!==undefined&&typeof scene[prop]!=='boolean')throw new Error('Invalid anatomical system layer setting.');
  if((scene.m==='muscular'||scene.m==='systems') && !['sb','dm','sm'].every(k=>typeof scene[k]==='boolean'))throw new Error('Muscle scenes require explicit layer settings.');
  if(scene.m==='digestive' && scene.dg!==true)throw new Error('Digestive scenes require the digestive organ layer.');
  if(scene.ro!==undefined&&(!num(scene.ro)||scene.ro<0.12||scene.ro>1))throw new Error('Invalid lung opacity setting.');
  if (!vector(scene.cam, 6)) throw new Error('Invalid saved camera position.');
  if (!Array.isArray(scene.labels) || scene.labels.length > 64) throw new Error('Too many labels (maximum 64).');
  for (const label of scene.labels) {
    if (!label || !Number.isInteger(label.s) || label.s < 0 || label.s >= scene.n ||
        !vector(label.p, 3) || !boundedText(label.t, 100) ||
        !num(label.dx) || !num(label.dy) || Math.abs(label.dx) > 500 || Math.abs(label.dy) > 500) {
      throw new Error('A label contains invalid placement or text.');
    }
  }
  // ANATOMIQ_SINGLE_GROUP_LABEL_260: one callout may point at multiple structures.
  // The original s/p pair remains the primary anchor for old lessons and focus.
  for(const label of scene.labels){
    if(label.g!==undefined){
      if(!Array.isArray(label.g)||label.g.length<1||label.g.length>63)throw new Error('Group labels need 2–64 structures.');
      if(!Number.isInteger(label.gn)||label.gn<1||label.gn>9999)throw new Error('Invalid group label number.');
      const members=new Set([label.s]);
      for(const anchor of label.g){
        if(!anchor||!Number.isInteger(anchor.s)||anchor.s<0||anchor.s>=scene.n||
          !vector(anchor.p,3)||members.has(anchor.s)||
          (anchor.ln!==undefined&&(!vector(anchor.ln,3)||Math.hypot(...anchor.ln)<0.1)))
          throw new Error('Invalid group label structure or anchor.');
        members.add(anchor.s);
      }
    }else if(label.gn!==undefined)throw new Error('Invalid group label number without group anchors.');
  }
  // ANATOMIQ_MUSCLE_NATIVE_270: optional stable catalog identity for multi-anchor labels.
  for(const label of scene.labels)if(label.mg!==undefined && (!label.g||typeof label.mg!=='string'||!(/^[a-z0-9-]{4,65}$/.test(label.mg))))throw new Error('Invalid whole-muscle label identity.');
  for(const label of scene.labels)if(label.qi!==undefined && (typeof label.qi!=='string'||!/^q-[0-9A-Za-z-]{4,62}$/.test(label.qi)))throw new Error('Invalid quiz label ID.');
  // Optional label study notes/photos and per-chapter faded structure IDs.
  for(const label of scene.labels){
    if(label.d!==undefined && (typeof label.d!=='string'||label.d.length>1200))throw new Error('Label description is too long.');
    if(label.u!==undefined && (typeof label.u!=='string'||label.u.length>500||
      (label.u && !/^(https:\/\/|\.\/|media\/|images\/)/i.test(label.u))))
      throw new Error('Photo must be an HTTPS URL or repository image path.');
  }
  // Optional camera-facing surface normal and teacher-authored focus frame.
  for(const label of scene.labels){
    if(label.ln!==undefined && (!vector(label.ln,3) || Math.hypot(...label.ln)<0.1))
      throw new Error('Invalid label surface normal.');
    if(label.fv!==undefined && (!vector(label.fv,3)||Math.hypot(...label.fv)<0.1))
      throw new Error('Invalid label focus direction.');
    if(label.fd!==undefined && (!num(label.fd)||label.fd<0.03||label.fd>1000))
      throw new Error('Invalid label focus distance.');
    if(label.ft!==undefined && (!vector(label.ft,3)||label.fv===undefined))
      throw new Error('Invalid label custom focus target.');
    if((label.fv===undefined)!==(label.fd===undefined))
      throw new Error('Label focus direction and distance must be saved together.');
  }
  if(scene.fa!==undefined && (!Array.isArray(scene.fa)||scene.fa.length>scene.n||
     scene.fa.some(i=>!Number.isInteger(i)||i<0||i>=scene.n)||
     new Set(scene.fa).size!==scene.fa.length))throw new Error('Invalid faded structure list.');
  // Optional per-chapter Location & Notes overrides, indexed to original anatomical IDs.
  if(scene.sd!==undefined){
    if(!Array.isArray(scene.sd)||scene.sd.length>scene.n)throw new Error('Invalid structure details.');
    const seen=new Set();
    for(const item of scene.sd){
      if(!Array.isArray(item)||item.length!==3||!Number.isInteger(item[0])||item[0]<0||item[0]>=scene.n||seen.has(item[0])||typeof item[1]!=='string'||item[1].length>1200||typeof item[2]!=='string'||item[2].length>2000)throw new Error('Invalid chapter structure details.');
      seen.add(item[0]);
    }
  }
  // Optional sparse list of colors, by stable bone index. Absent for older shared links.
  if (scene.pc !== undefined) {
    if (!Array.isArray(scene.pc) || scene.pc.length > scene.n) throw new Error('Invalid bone paint list.');
    const used = new Set();
    for (const item of scene.pc) {
      if (!Array.isArray(item) || item.length !== 2 || !Number.isInteger(item[0]) ||
          item[0] < 0 || item[0] >= scene.n || used.has(item[0]) ||
          typeof item[1] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(item[1])) {
        throw new Error('Invalid bone paint entry.');
      }
      used.add(item[0]);
    }
  }
  if (encoder.encode(JSON.stringify(scene)).length > MAX_JSON_BYTES) throw new Error('Scene exceeds the size limit.');
  return scene;
}
/** Publish permissions on the whole lesson. Omitted for older links (their original behavior is preserved). */
export const STUDY_PERMISSIONS = Object.freeze({ss:true,st:true,sn:true,sl:true,ll:true,ex:true,ot:true});
export const EXAM_PERMISSIONS = Object.freeze({ss:false,st:false,sn:false,sl:false,ll:false,ex:false,ot:false});
export function validatePermissions(p){
  if(!p || typeof p!=='object' || Array.isArray(p) ||
    (!['ss','st','sn','sl','ex'].every(key=>typeof p[key]==='boolean') ||
      (p.ot!==undefined && typeof p.ot!=='boolean') ||
      (p.ll!==undefined && typeof p.ll!=='boolean'))) // optional for older lessons
    throw new Error('Invalid student publishing permissions.');
  return p;
}
/** Projects contain one or more complete scene snapshots; old v1 single-scene links remain valid. */
// ANATOMIQ_GUIDED_ACTIVITIES_269J — import-time shape validation also covers student links.
import {validateGuided} from './guided-lessons-269j.mjs?rev=270-guided-controls';
export function validateProject(project) {
  if (project?.v === 1) return validateScene(project);
  if (!project || typeof project !== 'object' || Array.isArray(project) || project.v !== 2) throw new Error('This project format is unsupported.');
  if (project.sp !== undefined) validatePermissions(project.sp);
  validateGuided(project.guided,project.chapters?.length);
  if(project.practical!==undefined){const p=project.practical;
    if(!p||typeof p!=='object'||typeof p.on!=='boolean'||!Number.isInteger(p.count)||p.count<1||p.count>60||
      !Array.isArray(p.off)||p.off.length>3000||p.off.some(k=>typeof k!=='string'||k.length>90))throw new Error('Invalid practical configuration.');
    // 2.2.49: optional Practical chapter selection (legacy projects omit it).
    if(p.chapters!==undefined&&p.chapters!==null&&(!Array.isArray(p.chapters)||p.chapters.length>MAX_CHAPTERS||p.chapters.some(i=>!Number.isInteger(i)||i<0||i>=project.chapters?.length)||new Set(p.chapters).size!==p.chapters.length))throw new Error('Invalid practical chapter selection.');
  }
  if (!boundedText(project.t, 90)) throw new Error('A project title is required (90 characters maximum).');
  if (!Array.isArray(project.chapters) || !project.chapters.length || project.chapters.length > MAX_CHAPTERS) throw new Error(`A project must contain 1–${MAX_CHAPTERS} chapters.`);
  if (!Number.isInteger(project.start) || project.start < 0 || project.start >= project.chapters.length) throw new Error('Invalid starting chapter.');
  let labels = 0;
  let fingerprint = '';
  let count = 0;
  for (const chapter of project.chapters) {
    validateScene(chapter);
    labels += chapter.labels.length;
    if (labels > 240) throw new Error('Maximum 240 annotations across all chapters.');
    if (!fingerprint) { fingerprint = chapter.f; count = chapter.n; }
    if (chapter.f !== fingerprint || chapter.n !== count) throw new Error('Chapters must reference the same 3D model.');
  }
  if (encoder.encode(JSON.stringify(project)).length > MAX_JSON_BYTES) throw new Error('Project exceeds the size limit.');
  return project;
}
async function compress(source) {
  if (typeof CompressionStream === 'undefined') return {prefix:'j',bytes:source};
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream('gzip'));
  return {prefix:'g',bytes:new Uint8Array(await new Response(stream).arrayBuffer())};
}
async function decompress(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This device cannot open compressed scene links.');
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks=[]; let count=0;
  while (true) {
    const {done,value}=await reader.read();
    if (done) break;
    count+=value.length;
    if (count > MAX_JSON_BYTES) { await reader.cancel(); throw new Error('Scene is too large.'); }
    chunks.push(value);
  }
  const result=new Uint8Array(count); let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
  return result;
}
export async function encodeScene(scene) {
  validateProject(scene);
  const {prefix,bytes} = await compress(encoder.encode(JSON.stringify(scene)));
  const result=prefix+bytesToURL(bytes);
  if (result.length > MAX_FRAGMENT) throw new Error('Scene is too large for a shareable link. Export a JSON backup instead.');
  return result;
}
export async function decodeScene(fragment) {
  if (!fragment || fragment.length > MAX_FRAGMENT || !['g', 'j'].includes(fragment[0])) throw new Error('Invalid scene link.');
  const bytes=urlToBytes(fragment.slice(1));
  const raw=fragment[0] === 'g' ? await decompress(bytes) : bytes;
  if (raw.length > MAX_JSON_BYTES) throw new Error('Scene is too large.');
  let scene;
  try {scene=JSON.parse(decoder.decode(raw));} catch {throw new Error('Could not read scene configuration.');}
  return validateProject(scene);
}
