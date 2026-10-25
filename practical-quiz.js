/* AnatomIQ 2.2.16 — deterministic eligibility, randomized practicals.
   Pure JavaScript: no Three.js dependency and no student network requests. */
export const PRACTICAL_DEFAULTS=Object.freeze({on:false,count:15,off:[]});
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
const normalizedName=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
/* One structure question per anatomy ID. Labels have teacher-stable qi identifiers. */
export function practicalCandidates(chapters,structures){
  if(!Array.isArray(chapters)||!Array.isArray(structures))return [];
  const found=[],seenStructure=new Set(),seenLabels=new Set();
  chapters.forEach((chapter,ci)=>{
    const isVisible=visibleBits(chapter?.b,chapter?.n);
    if(!isVisible)return;
    for(let i=0;i<Math.min(chapter.n,structures.length);i++){
      if(!isVisible(i))continue;
      const s=structures[i];const name=String(s?.name||'').trim();
      if(!name||!s||!Number.isInteger(s.index)||s.index!==i)continue;
      if(!seenStructure.has(i)){
        found.push({key:`s:${i}`,type:'structure',s:i,chapter:ci,name,
          system:s.system||'',tissue:s.tissue||'',side:s.side||''});
        seenStructure.add(i);
      }
    }
    for(const label of (chapter.labels||[])){
      if(!label||!Number.isInteger(label.s)||label.s<0||label.s>=structures.length||label.s>=chapter.n||!isVisible(label.s))continue;
      const s=structures[label.s];const name=String(label.t||'').trim();
      if(!s||!name||!label.qi||!/^q-[0-9A-Za-z-]{4,62}$/.test(label.qi))continue;
      const key='l:'+label.qi;
      // A duplicated identical question has one answer, not two attempts.
      const signature=`${label.s}:${normalizedName(name)}`;
      if(seenLabels.has(signature))continue;
      seenLabels.add(signature);
      found.push({key,type:'label',s:label.s,chapter:ci,name,
        system:s.system||'',tissue:s.tissue||'',side:s.side||'',anchor:Array.isArray(label.p)?label.p:null});
    }
  });
  return found;
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
  for(let i=arr.length-1;i>0;i--){const j=Math.max(0,Math.min(i,randomIndex(i+1)));[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
}
export function practicalAttempt(candidates,structures,config,randomIndex=randomInteger){
  const cfg=normalPractical(config);const off=new Set(cfg.off);
  const eligible=candidates.filter(c=>!off.has(c.key));
  const chosen=shuffled(eligible,randomIndex).slice(0,Math.min(cfg.count,eligible.length));
  const namedCatalog=[...eligible,...structures.map((s,i)=>({s:i,name:s?.name||'',system:s?.system||'',tissue:s?.tissue||'',side:s?.side||''}))]
    .filter(s=>String(s.name||'').trim());
  return chosen.map(target=>{
    const answer=normalizedName(target.name);
    const pool=namedCatalog.filter(s=>normalizedName(s.name)!==answer);
    const ranked=shuffled(pool,randomIndex).sort((a,b)=>{
      const rank=s=>Number(s.system===target.system)*4+Number(s.tissue===target.tissue)*3+Number(s.side===target.side);
      return rank(b)-rank(a);
    });
    const unique=new Set([answer]),wrong=[];
    for(const p of ranked){const name=normalizedName(p.name);if(!name||unique.has(name))continue;
      unique.add(name);wrong.push(p.name.trim());if(wrong.length===3)break;
    }
    return {...target,choices:shuffled([target.name,...wrong],randomIndex)};
  }).filter(q=>q.choices.length>=2);
}
export function gradePractical(questions,answers){
  const missed=[];let correct=0;
  questions.forEach((q,i)=>{
    if(normalizedName(answers[i])===normalizedName(q.name))correct++;
    else missed.push({name:q.name,answer:answers[i]||'(no answer)',chapter:q.chapter+1,type:q.type});
  });
  return {correct,total:questions.length,percent:questions.length?Math.round(correct/questions.length*100):0,missed};
}
