/* AnatomIQ 2.2.64 — reversible, device-only vertebra surface pilot.
 * IMPORTANT: This subdivides and smooths the existing Écorché surface. It is NOT
 * a replacement high-resolution anatomical scan and adds no new landmarks.
 * Reuses original Three.js Mesh object/metadata/IDs/materials so lesson indices,
 * labels, paint and raycasting stay attached to the same structure.
 */
export const PILOT_VERSION = '2.2.64';
export const PILOT_KEY = 'anatomiq-vertebra-surface-264';
export const PILOT_TYPES = ['Atlas (C1)', 'Axis (C2)', 'Thoracic vertebra', 'Lumbar vertebra'];
const TRIANGLE_LIMIT = 22000;  // caps ~88k output triangles PER target
const VERTEX_LIMIT = 360000;  // caps output GPU/upload & CPU memory
const POS_SMOOTH = 0.12;      // mild relaxation to reduce blocky contours

export function classifyVertebra(name) {
  const s=String(name||'').trim().toLowerCase();
  if (/\batlas\b|\bfirst cervical vertebra\b|\bc\s*[- ]?1\b/.test(s)) return 'Atlas (C1)';
  if (/\baxis\b|\bsecond cervical vertebra\b|\bc\s*[- ]?2\b/.test(s)) return 'Axis (C2)';
  if (/\bthoracic\b|\bt\s*[- ]?\d{1,2}\b/.test(s)) return 'Thoracic vertebra';
  if (/\blumbar\b|\bl\s*[- ]?\d\b/.test(s)) return 'Lumbar vertebra';
  return null;
}
function preferredVertebra(entry,type) {
  const n=String(entry.name||'').toLowerCase();
  if (type==='Thoracic vertebra') return /\bt\s*[- ]?6\b|\b(?:sixth|6th) thoracic\b|\bthoracic.*\b6\b/.test(n)?20:/\bt\s*[- ]?5\b|\b(?:fifth|5th) thoracic\b/.test(n)?10:1;
  if (type==='Lumbar vertebra') return /\bl\s*[- ]?3\b|\b(?:third|3rd) lumbar\b|\blumbar.*\b3\b/.test(n)?20:1;
  return 5;
}
export function choosePilotStructures(structures) {
  const candidates=structures.filter(s=>s && s.system==='skeletal' && (s.tissue||'bone')==='bone' && s.mesh?.isMesh && s.mesh?.geometry?.attributes?.position);
  return PILOT_TYPES.map(type=>{
    const picks=candidates.filter(s=>classifyVertebra(s.name)===type);
    picks.sort((a,b)=>preferredVertebra(b,type)-preferredVertebra(a,type) || a.name.localeCompare(b.name));
    return {type,structure:picks[0]||null};
  });
}
function triangleCount(geometry) {const n=geometry.index?.count ?? geometry.attributes.position.count;return Number.isFinite(n)?Math.floor(n/3):0;}
function finite3(v){return v.length===3 && v.every(Number.isFinite);}
const hashPair=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const add3=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const subtract3=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function normalize3(v){const d=Math.hypot(v[0],v[1],v[2])||1;return v.map(x=>x/d);}
function mix3(a,b,t){return [a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t];}
/** Single subdivision with restrained vertex relaxation. Never changes mesh object. */
export function refineVertebraGeometry(geometry,THREE) {
  if (!geometry?.isBufferGeometry) throw new Error('A BufferGeometry is required.');
  const position=geometry.getAttribute('position');
  if (!position || position.itemSize!==3) throw new Error('Invalid position attribute.');
  if (geometry.morphAttributes && Object.values(geometry.morphAttributes).some(x=>x.length))throw new Error('Morph-target geometry is not supported');
  if (geometry.getAttribute('skinIndex')||geometry.getAttribute('skinWeight'))throw new Error('Skinned anatomy cannot be subdivided in this pilot');
  const faces=triangleCount(geometry);
  if (!faces || faces>TRIANGLE_LIMIT || faces*12>VERTEX_LIMIT)throw new Error(`Triangle budget exceeded (${faces}, maximum ${TRIANGLE_LIMIT})`);
  const index=geometry.index;
  if ((index?.count??position.count)!==faces*3)throw new Error('Unexpected untriangulated data');
  const sourceAt=(i)=>index ? index.getX(i) : i;
  const orig=new Array(faces*3), vertices=[], keys=new Map(), neighbours=[], edges=new Map();
  // Weld coincident positions only for neighborhood/normal computations. Retain
  // UV/colors separately per triangle to prevent seams from being erased.
  let maxDimension=1;
  geometry.computeBoundingBox();
  if (geometry.boundingBox){const b=geometry.boundingBox;maxDimension=Math.max(0.0001,b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z);}
  const tolerance=Math.max(1e-8,maxDimension*1e-6);
  for (let i=0;i<faces*3;i++){
    const at=sourceAt(i),p=[position.getX(at),position.getY(at),position.getZ(at)];
    if(!finite3(p))throw new Error('Nonfinite vertex');
    const key=p.map(x=>Math.round(x/tolerance)).join(':');
    let id=keys.get(key);
    if(id===undefined){id=vertices.length;keys.set(key,id);vertices.push(p);neighbours.push(new Set());}
    orig[i]={id,at};
  }
  for(let t=0;t<faces;t++){
    const [a,b,c]=orig.slice(t*3,t*3+3).map(x=>x.id);
    if(a===b||b===c||c===a)continue;
    for(const [v,w,opposite] of [[a,b,c],[b,c,a],[c,a,b]]){
      neighbours[v].add(w);neighbours[w].add(v);
      const k=hashPair(v,w);if(!edges.has(k))edges.set(k,{a:Math.min(v,w),b:Math.max(v,w),opposites:[]});
      if(edges.get(k).opposites.length<3)edges.get(k).opposites.push(opposite);
    }
  }
  const relaxed=vertices.map((p,i)=>{
    const near=[...neighbours[i]];
    if(near.length<3)return p;
    const avg=[0,0,0];for(const id of near)for(let k=0;k<3;k++)avg[k]+=vertices[id][k]/near.length;
    return mix3(p,avg,POS_SMOOTH);
  });
  const edgePoint=new Map();
  for(const [key,e] of edges){
    const m=mix3(vertices[e.a],vertices[e.b],0.5);
    if(e.opposites.length===2){
      // Mild 4-point stencil; keeps the anatomy closely tied to the source.
      const o=mix3(vertices[e.opposites[0]],vertices[e.opposites[1]],0.5);
      edgePoint.set(key,mix3(m,o,0.08));
    }else edgePoint.set(key,m);
  }
  const fields=['uv','uv1','color'].filter(field=>geometry.getAttribute(field));
  const out={position:[],normal:[]};for(const field of fields)out[field]=[];
  const faceIndices=[];const normals=new Map();
  const triangles=[[0,3,5],[3,1,4],[5,4,2],[3,4,5]];
  const nAttributes=Object.fromEntries(fields.map(name=>[name,geometry.getAttribute(name)]));
  for(let t=0;t<faces;t++){
    const corners=orig.slice(t*3,t*3+3);const [a,b,c]=corners.map(x=>x.id);
    const ab=hashPair(a,b),bc=hashPair(b,c),ca=hashPair(c,a);
    const verts=[relaxed[a],relaxed[b],relaxed[c],edgePoint.get(ab),edgePoint.get(bc),edgePoint.get(ca)];
    if(verts.slice(3).some(x=>!x))throw new Error('Bad triangle topology');
    const ids=[`v${a}`,`v${b}`,`v${c}`,`e${ab}`,`e${bc}`,`e${ca}`];
    const attrs={};
    for(const field of fields){
      const att=nAttributes[field],size=att.itemSize;
      if(size<2||size>4)throw new Error(`Unsupported ${field} attribute size`);
      const p=corners.map(x=>Array.from({length:size},(_,k)=>att.getComponent(x.at,k)));
      attrs[field]=[...p,[...p[0]].map((v,i)=>(v+p[1][i])*0.5),[...p[1]].map((v,i)=>(v+p[2][i])*0.5),[...p[2]].map((v,i)=>(v+p[0][i])*0.5)];
    }
    for(const tri of triangles){
      const p0=verts[tri[0]],p1=verts[tri[1]],p2=verts[tri[2]];
      const faceNormal=cross3(subtract3(p1,p0),subtract3(p2,p0));
      for(const k of tri){
        const p=verts[k],key=ids[k];out.position.push(...p);faceIndices.push(key);
        const acc=normals.get(key)||[0,0,0];normals.set(key,add3(acc,faceNormal));
        for(const field of fields)out[field].push(...attrs[field][k]);
      }
    }
  }
  if(out.position.length !== faces*12*3)throw new Error('Unexpected triangle count');
  for(const id of faceIndices)out.normal.push(...normalize3(normals.get(id)||[0,0,1]));
  const enhanced=new THREE.BufferGeometry();
  for(const [field,array] of Object.entries(out)){
    const size=field==='position'||field==='normal'?3:nAttributes[field].itemSize;
    if(!array.every(Number.isFinite))throw new Error(`${field} contains invalid values`);
    enhanced.setAttribute(field,new THREE.Float32BufferAttribute(new Float32Array(array),size));
  }
  // Every source triangle maps to 4 triangles / 12 vertices; material slots are preserved.
  for(const group of (geometry.groups||[])){
    if(group.start%3 || group.count%3)throw new Error('Non-triangular material group');
    enhanced.addGroup(group.start*4,group.count*4,group.materialIndex);
  }
  enhanced.computeBoundingBox();enhanced.computeBoundingSphere();
  enhanced.userData={...geometry.userData,anatomiqVertebraPilot:'subdivided-surface-v1'};
  return enhanced;
}
function statusObject(rows){return {version:PILOT_VERSION,method:'Reversible geometry subdivision — NOT source scan replacement',rows:rows.map(({type,structure,initial,error,enhanced})=>({type,name:structure?.name||null,index:structure?.index??null,beforeTriangles:initial?triangleCount(initial):null,afterTriangles:enhanced?triangleCount(enhanced):null,status:error||(!structure?'not found':enhanced?'ready':'not processed')}))};}
export function installVertebraPilot(structures,THREE,{invalidate=()=>{},storage=globalThis.localStorage,teacherMode=true}={}){
  const targets=choosePilotStructures(structures);
  const rows=targets.map(({type,structure})=>({type,structure,initial:structure?.mesh?.geometry||null,enhanced:null,error:null}));
  let mode='standard';
  try{mode=storage.getItem(PILOT_KEY)==='preview'?'preview':'standard';}catch{}
  let busy=false;
  const emit=()=>{const data=statusObject(rows);if(typeof window!=='undefined')window.__AnatomIQVertebraPilot=Object.freeze({...data,getReport:()=>statusObject(rows)});return data;};
  function apply(next){
    if(busy)return false;
    busy=true;
    try{
      const desired=next==='preview'?'preview':'standard';
      for(const row of rows){
        if(!row.structure||!row.initial)continue;
        const mesh=row.structure.mesh;
        if(mesh.geometry!==row.initial && mesh.geometry!==row.enhanced){row.error='Geometry was replaced elsewhere; pilot skipped';continue;}
        if(desired==='preview' && !row.enhanced){
          try{row.enhanced=refineVertebraGeometry(row.initial,THREE);}
          catch(e){row.error=String(e.message||e);console.warn('Vertebra pilot:',row.type,row.error);continue;}
        }
        mesh.geometry=(desired==='preview'&&row.enhanced)?row.enhanced:row.initial;
      }
      mode=desired;
      try{storage.setItem(PILOT_KEY,mode);}catch{}
      invalidate(3);emit();return true;
    }finally{busy=false;}
  }
  function downloadReport(){
    const report=JSON.stringify({...emit(),date:new Date().toISOString()},null,2);
    const blob=new Blob([report],{type:'application/json'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='AnatomIQ-Vertebra-Pilot-264-Report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function buildControl(){
    if(typeof document==='undefined'||document.getElementById('aiq-vertebra-264'))return;
    const anchor=document.getElementById('aiq-global-geometry-group')||document.getElementById('settings-skull-geometry')?.closest('.render-settings-group');
    if(!anchor)return;
    const group=document.createElement('section');group.id='aiq-vertebra-264';group.className='render-settings-group';
    const label=document.createElement('label');label.htmlFor='aiq-vertebra-264-mode';label.textContent='Vertebra surface detail (experimental)';
    const select=document.createElement('select');select.className='text-input';select.id='aiq-vertebra-264-mode';
    for(const [value,title] of [['standard','Original geometry'],['preview','Smooth vertebra pilot (4 selected bones)']]){
      const o=document.createElement('option');o.value=value;o.textContent=title;select.append(o);
    }
    select.value=mode;
    select.addEventListener('change',()=>{apply(select.value);if(mode==='preview'&&!rows.some(r=>r.enhanced))console.warn('No pilot vertebrae were enhanced; see report.');});
    const note=document.createElement('p');note.className='studio-hint';note.textContent='Opt-in device preview: atlas, axis, one thoracic and one lumbar vertebra. Uses the original meshes with one added subdivision level. Preserves labels and saved scenes. Not a replacement anatomical scan; original is always available.';
    const report=document.createElement('button');report.type='button';report.className='button subtle';report.textContent='Download vertebra polygon report';report.addEventListener('click',downloadReport);
    group.append(label,select,note,report);anchor.after(group);
  }
  emit();
  if(mode==='preview')apply('preview');
  // Keep implementation bounded to existing skeletal geometry; no new mesh IDs.
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildControl,{once:true});
    else buildControl();
  }
  console.info('AnatomIQ vertebra pilot',emit());
  return {apply,report:()=>statusObject(rows),rows};
}
