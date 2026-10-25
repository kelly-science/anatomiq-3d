/* AnatomIQ 2.2.16b — side-neutral practical identification.
   A single anatomical answer can reference multiple original mesh/label IDs.
   No changes to saved anatomy IDs, chapters, or project schema. */
export const PRACTICAL_DEFAULTS = Object.freeze({on:false,count:15,off:[]});
export function normalPractical(value){
  if(!value||typeof value!=='object')return {on:false,count:15,off:[]};
  return {on:value.on===true,count:Math.max(1,Math.min(60,Number.isInteger(value.count)?value.count:15)),
    off:Array.isArray(value.off)?[...new Set(value.off.filter(v=>typeof v==='string'&&/^(s:\d{1,5}|l:[0-9A-Za-z-]{6,64})$/.test(v)))].slice(0,3000):[]};
}
export function newPracticalLabelId(){
  return 'q-'+(globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`);
}
function visibleBits(encoded,count){
  try{
    if(typeof encoded!=='string'||!Number.isInteger(count)||count<1||count>2000)return null;
    const b64=encoded.replace(/-/g,'+').replace(/_/g,'/');
    const decoded=atob(b64.padEnd(Math.ceil(b64.length/4)*4,'='));
    if(decoded.length!==Math.ceil(count/8))return null;
    return i=>Boolean(decoded.charCodeAt(i>>>3)&(1<<(i&7)));
  }catch{return null;}
}
const normalizedName=v=>String(v||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');

/* Strip ONLY left/right identifiers at the beginning or end, rather than
   modifying anatomical terms such as 'lateral' or numeric vertebra labels.
   Examples: Left temporal, temporal (right), Right humerus, Femur - left. */
export function practicalAnswerName(value){
  const original=String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();
  if(!original)return '';
  let name=original;
  name=name.replace(/^(?:left|right)(?:\s+|[\s]*[-–—:]\s*)/i,'');
  name=name.replace(/\s*\((?:left|right)\)\s*$/i,'');
  name=name.replace(/\s*\[(?:left|right)\]\s*$/i,'');
  name=name.replace(/\s*[,;:/–—-]\s*(?:left|right)\s*$/i,'');
  name=name.trim().replace(/^[,;:\s-]+|[,;:\s-]+$/g,'');
  if(!name)return original;
  return name.replace(/^[a-z]/,c=>c.toUpperCase());
}

/* Original anatomical identity is retained in each variant; matching answers
   are grouped for the teacher pool and each new student attempt. */
export function practicalCandidates(chapters,structures){
  if(!Array.isArray(chapters)||!Array.isArray(structures))return [];
  const raw=[],seenStructure=new Set(),seenLabels=new Set();
  chapters.forEach((chapter,ci)=>{
    const isVisible=visibleBits(chapter?.b,chapter?.n);
    if(!isVisible)return;
    for(let i=0;i<Math.min(chapter.n,structures.length);i++){
      if(!isVisible(i))continue;
      const s=structures[i];const name=String(s?.name||'').trim();
      if(!name||!s||!Number.isInteger(s.index)||s.index!==i)continue;
      if(!seenStructure.has(i)){
        raw.push({key:`s:${i}`,type:'structure',s:i,chapter:ci,name,
          system:s.system||'',tissue:s.tissue||'',side:s.side||''});
        seenStructure.add(i);
      }
    }
    for(const label of (chapter.labels||[])){
      if(!label||!Number.isInteger(label.s)||label.s<0||label.s>=structures.length||label.s>=chapter.n||!isVisible(label.s))continue;
      const s=structures[label.s];const name=String(label.t||'').trim();
      if(!s||!name||!label.qi||!/^q-[0-9A-Za-z-]{4,62}$/.test(label.qi))continue;
      const key='l:'+label.qi;
      const signature=`${label.s}:${normalizedName(name)}`;
      if(seenLabels.has(signature))continue;
      seenLabels.add(signature);
      raw.push({key,type:'label',s:label.s,chapter:ci,name,
        system:s.system||'',tissue:s.tissue||'',side:s.side||'',anchor:Array.isArray(label.p)?label.p:null});
    }
  });
  const byAnswer=new Map();
  for(const candidate of raw){
    const name=practicalAnswerName(candidate.name);
    const answerKey=normalizedName(name);
    if(!answerKey)continue;
    let group=byAnswer.get(answerKey);
    if(!group){
      group={...candidate,name,memberKeys:[],variants:[],chapters:[]};
      byAnswer.set(answerKey,group);
    }
    group.memberKeys.push(candidate.key);
    group.variants.push(candidate);
    if(!group.chapters.includes(candidate.chapter))group.chapters.push(candidate.chapter);
  }
  return [...byAnswer.values()];
}
function randomInteger(bound){
  if(bound<=1)return 0;
  if(globalThis.crypto?.getRandomValues){
    const limit=Math.floor(4294967296/bound)*bound;
    const buf=new Uint32Array(1);let n;
    do{globalThis.crypto.getRandomValues(buf);n=buf[0];}while(n>=limit);
    return n%bound;
  }
  return Math.floor(Math.random()*bound);
}
export function shuffled(items,randomIndex=randomInteger){
  const arr=[...items];
  for(let i=arr.length-1;i>0;i--){
    const j=Math.max(0,Math.min(i,randomIndex(i+1)));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
const variantsFor=q=>Array.isArray(q.variants)&&q.variants.length?q.variants:[q];
const keysFor=q=>Array.isArray(q.memberKeys)&&q.memberKeys.length?q.memberKeys:[q.key];
export function practicalAttempt(candidates,structures,config,randomIndex=randomInteger){
  const cfg=normalPractical(config),off=new Set(cfg.off);
  const eligible=candidates.map(group=>{
    const variants=variantsFor(group).filter(v=>!off.has(v.key));
    return variants.length?{group,variants}:null;
  }).filter(Boolean);
  const selected=shuffled(eligible,randomIndex).slice(0,Math.min(cfg.count,eligible.length));
  const catalog=[...candidates.map(c=>({name:c.name,system:c.system,tissue:c.tissue})),
    ...structures.map(s=>({name:practicalAnswerName(s?.name),system:s?.system||'',tissue:s?.tissue||''}))]
    .filter(s=>normalizedName(s.name));
  return selected.map(({group,variants})=>{
    const representative=shuffled(variants,randomIndex)[0];
    const answer=normalizedName(group.name);
    const pool=catalog.filter(s=>normalizedName(practicalAnswerName(s.name))!==answer);
    const ranked=shuffled(pool,randomIndex).sort((a,b)=>{
      const rank=s=>Number(s.system===representative.system)*4+Number(s.tissue===representative.tissue)*3;
      return rank(b)-rank(a);
    });
    const unique=new Set([answer]),wrong=[];
    for(const p of ranked){
      const name=practicalAnswerName(p.name),key=normalizedName(name);
      if(!key||unique.has(key))continue;
      unique.add(key);wrong.push(name);
      if(wrong.length===3)break;
    }
    // The question's original mesh/anchor is preserved, despite the common answer.
    return {...representative,name:group.name,memberKeys:keysFor(group),
      choices:shuffled([group.name,...wrong],randomIndex)};
  }).filter(q=>q.choices.length>=2);
}
export function gradePractical(questions,answers){
  const missed=[];let correct=0;
  questions.forEach((q,i)=>{
    if(normalizedName(practicalAnswerName(answers[i]))===normalizedName(practicalAnswerName(q.name)))correct++;
    else missed.push({name:q.name,answer:answers[i]||'(no answer)',chapter:q.chapter+1,type:q.type});
  });
  return {correct,total:questions.length,percent:questions.length?Math.round(correct/questions.length*100):0,missed};
}
