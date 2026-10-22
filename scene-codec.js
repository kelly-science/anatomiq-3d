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
  if (!boundedText(scene.t, 90)) throw new Error('A scene title is required (90 characters maximum).');
  if (!['shown', 'reveal', 'hidden'].includes(scene.lm)) throw new Error('Invalid label visibility.');
  if (typeof scene.x !== 'boolean' || typeof scene.te !== 'boolean' || typeof scene.ca !== 'boolean') throw new Error('Invalid student permissions.');
  for(const prop of ['sb','dm','sm','dg'])if(scene[prop]!==undefined&&typeof scene[prop]!=='boolean')throw new Error('Invalid anatomical system layer setting.');
  if((scene.m==='muscular'||scene.m==='systems') && !['sb','dm','sm'].every(k=>typeof scene[k]==='boolean'))throw new Error('Muscle scenes require explicit layer settings.');
  if(scene.m==='digestive' && scene.dg!==true)throw new Error('Digestive scenes require the digestive organ layer.');
  if (!vector(scene.cam, 6)) throw new Error('Invalid saved camera position.');
  if (!Array.isArray(scene.labels) || scene.labels.length > 64) throw new Error('Too many labels (maximum 64).');
  for (const label of scene.labels) {
    if (!label || !Number.isInteger(label.s) || label.s < 0 || label.s >= scene.n ||
        !vector(label.p, 3) || !boundedText(label.t, 100) ||
        !num(label.dx) || !num(label.dy) || Math.abs(label.dx) > 500 || Math.abs(label.dy) > 500) {
      throw new Error('A label contains invalid placement or text.');
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
export const STUDY_PERMISSIONS = Object.freeze({ss:true,st:true,sn:true,sl:true,ex:true});
export const EXAM_PERMISSIONS = Object.freeze({ss:false,st:false,sn:false,sl:false,ex:false});
export function validatePermissions(p){
  if(!p || typeof p!=='object' || Array.isArray(p) ||
    !['ss','st','sn','sl','ex'].every(key=>typeof p[key]==='boolean'))
    throw new Error('Invalid student publishing permissions.');
  return p;
}
/** Projects contain one or more complete scene snapshots; old v1 single-scene links remain valid. */
export function validateProject(project) {
  if (project?.v === 1) return validateScene(project);
  if (!project || typeof project !== 'object' || Array.isArray(project) || project.v !== 2) throw new Error('This project format is unsupported.');
  if (project.sp !== undefined) validatePermissions(project.sp);
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
