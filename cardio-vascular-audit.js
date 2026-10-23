/* Anatomy Studio 1.8.3 — local teacher review of verified provider meshes.
   A class-core name match DOES NOT establish visual/anatomical continuity.
   These notes never enter a student scene or alter its mesh/visibility data. */
import {CARDIO_CLASS_CORE,curriculumMatches} from './cardio-class-core.js';
export const CARDIO_REVIEW_KEY = 'anatomy-studio-cardio-review-v1';
export const LABEL_ONLY_TARGETS = Object.freeze(['chordae-tendineae','right-auricle','left-auricle']);
const LABEL_SET=new Set(LABEL_ONLY_TARGETS);
const trunkRules=Object.freeze({
 'radial-arteries':/\b(?:trunk (?:proper )?of |(?:left|right) )?(?:left |right )?radial artery\b/i,
 'ulnar-arteries':/\b(?:trunk (?:proper )?of |(?:left|right) )?(?:left |right )?ulnar artery\b/i,
 'hepatic-veins':/\b(?:trunk (?:proper )?of )?(?:left|right|middle) hepatic vein\b/i,
 'vertebral-veins':/\b(?:left|right) vertebral vein\b/i,
 'external-jugular-veins':/\b(?:left|right) external jugular vein\b/i,
 'lumbar-veins':/\b(?:left|right) (?:ascending )?lumbar vein\b/i,
});
const excludes=/\b(?:nerve|lymphatic|ligament)\b/i;
const bareSuffix=/(?:^|\s)(?:branch|tributary|division)\s+of\s+/i;
function isTrunkEvidence(id,name){
  const r=trunkRules[id];if(!r)return true;
  // A radial carpal branch does not represent the radial arterial trunk.
  return r.test(name)&&!bareSuffix.test(name)&&!/\b(?:carpal|collateral|segmental|digital) branch\b/i.test(name);
}
export function auditCardiovascular(entries,review={}){
 const byID=new Map(CARDIO_CLASS_CORE.targets.map(t=>[t.id,[]]));
 for(const s of entries||[]){if(excludes.test(s.name||''))continue;
  for(const t of curriculumMatches(s))byID.get(t.id).push({id:s.sourceName||s.id||'',name:s.name});
 }
 const targets=CARDIO_CLASS_CORE.targets.map(t=>{
  const meshes=byID.get(t.id),sides={left:[],right:[],other:[]};
  for(const m of meshes){const lower=m.name.toLowerCase();const side=/\bleft\b/.test(lower)?'left':/\bright\b/.test(lower)?'right':'other';sides[side].push(m);}
  const trunk=t.id in trunkRules;
  const main=meshes.filter(m=>isTrunkEvidence(t.id,m.name));
  const mainSides={left:main.filter(m=>/\bleft\b/i.test(m.name)),right:main.filter(m=>/\bright\b/i.test(m.name))};
  const bilateral=t.bilateral && t.group!=='heart';
  const incompleteSide=bilateral&&(!mainSides.left.length||!mainSides.right.length);
  const needsTrunk=trunk&&!main.length;
  const assumedPartial=t.quality!=='full';
  const machineStatus=!meshes.length?'missing':assumedPartial||incompleteSide||needsTrunk?'partial':'represented';
  const evidence= !meshes.length?'No named mesh in installed model'
    : needsTrunk?'Only smaller branches/tributaries identified; no major named trunk'
    : incompleteSide?`Needs ${!mainSides.left.length?'left':''}${!mainSides.left.length&&!mainSides.right.length?' and ':''}${!mainSides.right.length?'right':''} principal segment verification`
    : assumedPartial?'Components/walls only; verify visually':'Name matches on both sides (when applicable); geometry still unverified';
  const signature=meshes.map(m=>m.id).sort().join('|');
  const r=review[t.id]||{};
  const reviewed=(r.signature===signature&&['verified','incomplete','incorrect'].includes(r.status))?r.status:'unreviewed';
  return {id:t.id,name:t.name,group:t.group,priority:t.priority,bilateral:t.bilateral,meshes,sides,signature,
    status:machineStatus,evidence,reviewed,note:String(r.note||''),labelOnly:LABEL_SET.has(t.id),
    mainTrunkIds:main.map(m=>m.id)};
 });
 return {meshCount:entries?.length||0,required:targets.length,targets,
   represented:targets.filter(t=>t.status==='represented').length,
   partial:targets.filter(t=>t.status==='partial').length,
   missing:targets.filter(t=>t.status==='missing').length,
   pending:targets.filter(t=>!t.labelOnly&&t.reviewed==='unreviewed').length,
   labelOnly:targets.filter(t=>t.labelOnly).length};
}
export function saveCardioReview(state,storage){
 const cleaned={};for(const [id,r] of Object.entries(state||{})){
  if(!CARDIO_CLASS_CORE.targets.some(t=>t.id===id))continue;
  cleaned[id]={status:['verified','incomplete','incorrect'].includes(r.status)?r.status:'unreviewed',note:String(r.note||'').slice(0,1200),signature:String(r.signature||'').slice(0,4096)};
 }
 storage.setItem(CARDIO_REVIEW_KEY,JSON.stringify({schema:1,records:cleaned}));return cleaned;
}
export function loadCardioReview(storage){
 try{const data=JSON.parse(storage.getItem(CARDIO_REVIEW_KEY)||'null');return data?.schema===1&&data.records&&typeof data.records==='object'&&!Array.isArray(data.records)?data.records:{};}catch{return {};}
}
export function cardioAuditExport(entries,review){
 const result=auditCardiovascular(entries,review);
 return JSON.stringify({schema:'anatomy-studio-cardio-audit-v1',version:'1.8.3',generatedAt:new Date().toISOString(),
  warning:'Name matches and teacher flags do not prove vessel continuity. Label-only targets intentionally excluded from required geometry.',
  ...result,targets:result.targets.map(({sides,...t})=>({...t,sides:{left:sides.left.map(m=>m.id),right:sides.right.map(m=>m.id),other:sides.other.map(m=>m.id)}}))},null,2)+'\n';
}
