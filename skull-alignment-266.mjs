/* AnatomIQ 2.2.66: reversible, local teacher skull alignment workbench.
 * The original THREE.Mesh identities, selection, labels, visibility and base GLB
 * remain unchanged. Only mesh.geometry + material are swapped while previewing.
 * Approved manual placements are stored device-locally; export for baking later.
 */
export const SKULL_VERSION='2.2.66';
export const SKULL_STORAGE='anatomiq-skull-alignment-review-266';
export const SKULL_ASSET='./models/skull-aligned-266.glb?rev=266';
export const SKULL_REPORT='./models/skull-aligned-266-report.json?rev=266';
export const skullKey=n=>String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
export const skullRegion=n=>/\b(frontal|parietal|temporal|occipital|ethmoid|sphenoid|lacrimal|nasal|palatine|zygomatic|maxilla|mandible|vomer|concha)\b/i.test(String(n||''));
const defaults=()=>({tx:0,ty:0,tz:0,rx:0,ry:0,rz:0,approved:false,disabled:false});
const bounded=(x,bound)=>Number.isFinite(Number(x))?Math.max(-bound,Math.min(bound,Number(x))):0;
export function normalizeAdjustment(x={}) {return {tx:bounded(x.tx,12),ty:bounded(x.ty,12),tz:bounded(x.tz,12),rx:bounded(x.rx,8),ry:bounded(x.ry,8),rz:bounded(x.rz,8),approved:x.approved===true,disabled:x.disabled===true};}
export function matchingSkullTargets(structures,report){
 const map=new Map();
 for(const s of structures){
  if(s.system!=='skeletal'||!s.mesh?.geometry||!skullRegion(s.name))continue;
  const k=skullKey(s.name);if(map.has(k))map.set(k,null);else map.set(k,s);
 }
 return (report?.rows||[]).filter(r=>['auto','review'].includes(r.status)).map(row=>({row,target:map.get(skullKey(row.name))})).filter(({row,target})=>target&&Number.isFinite(row.old_triangles)&&Math.floor((target.mesh.geometry.index?.count??target.mesh.geometry.attributes.position.count)/3)===row.old_triangles);
}
function reportDownload(filename,body){
 const url=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function createSkullAlignmentWorkbench(structures,THREE,{invalidate=()=>{},storage=window.localStorage,loaderFactory,materialFactory,applyMaterial,originalMaterialFor,getTone=()=> '#c2b6a5',teacherMode=true}={}){
 let selected='',ready=null,loading=null,active=false,mode='standard',error=null;
 let state={enabled:false,overrides:{}};
 try{const saved=JSON.parse(storage.getItem(SKULL_STORAGE)||'null');if(saved&&saved.version===SKULL_VERSION){state.enabled=saved.enabled===true;for(const [k,v] of Object.entries(saved.overrides||{}))state.overrides[skullKey(k)]=normalizeAdjustment(v);}}catch{}
 const originals=new Map(); // target mesh -> exact original geometry/material
 const materials=new Map();
 const status={version:SKULL_VERSION,mode:'standard',enabled:state.enabled,loaded:false,candidates:0,applied:0,error:null};
 const persist=()=>{try{storage.setItem(SKULL_STORAGE,JSON.stringify({version:SKULL_VERSION,enabled:state.enabled,overrides:state.overrides}));}catch{}};
 const override=k=>state.overrides[k]||defaults();
 const compatible=(record,entry)=>{
  const geometry=entry.geometry;
  const p=geometry?.getAttribute?.('position');
  if(!p||p.itemSize!==3||p.count<3)return false;
  geometry.computeBoundingBox?.(); geometry.computeBoundingSphere?.();
  if(!geometry.getAttribute('normal'))geometry.computeVertexNormals?.();
  const o=new THREE.Box3().setFromBufferAttribute(record.target.mesh.geometry.attributes.position);
  const s=new THREE.Box3().setFromBufferAttribute(p);
  const a=o.getSize(new THREE.Vector3()).length(),b=s.getSize(new THREE.Vector3()).length();
  return a>0&&b>0&&Math.abs(a/b-1)<.21;
 };
 async function prepare(){
  if(ready)return ready;if(loading)return loading;
  loading=(async()=>{
   const resp=await fetch(SKULL_REPORT,{cache:'no-cache'});
   if(!resp.ok||/text\/html/i.test(resp.headers.get('content-type')||''))throw Error('Skull registration report not deployed');
   const report=await resp.json();
   if(report.version!==SKULL_VERSION||!report.candidate_count||!Array.isArray(report.rows))throw Error('Invalid skull registration report');
   const matches=matchingSkullTargets(structures,report);
   if(!matches.length)throw Error('No matching original skull meshes (names or triangle counts differ)');
   const loader=loaderFactory?loaderFactory():new (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader();
   const gltf=await new Promise((resolve,reject)=>loader.load(SKULL_ASSET,resolve,undefined,reject));
   const nodes=new Map();gltf.scene.traverse(obj=>{if(!obj.isMesh)return;const k=skullKey(obj.userData?.name||obj.name);if(nodes.has(k))nodes.set(k,null);else nodes.set(k,obj.geometry)});
   const candidates=[];
   for(const record of matches){
    const geometry=nodes.get(skullKey(record.row.name));
    if(!geometry||Math.floor((geometry.index?.count??geometry.attributes.position.count)/3)!==record.row.source_triangles)continue;
    const item={...record,geometry};
    if(compatible(record,item))candidates.push(item);
   }
   if(!candidates.length)throw Error('Skull geometry failed runtime compatibility');
   ready={report,candidates};status.loaded=true;status.candidates=candidates.length;
   if(!selected)selected=skullKey(candidates[0].row.name);
   return ready;
  })();
  try{return await loading;}catch(e){loading=null;throw e}
 }
 function replacementGeometry(item){
  const adj=override(skullKey(item.row.name));
  if(!['tx','ty','tz','rx','ry','rz'].some(k=>adj[k]))return item.geometry;
  const geometry=item.geometry.clone();
  geometry.computeBoundingBox();const center=geometry.boundingBox.getCenter(new THREE.Vector3());
  const rotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(adj.rx*Math.PI/180,adj.ry*Math.PI/180,adj.rz*Math.PI/180,'XYZ'));
  const transform=new THREE.Matrix4().makeTranslation(adj.tx/1000,adj.ty/1000,adj.tz/1000)
    .multiply(new THREE.Matrix4().makeTranslation(center.x,center.y,center.z))
    .multiply(rotation).multiply(new THREE.Matrix4().makeTranslation(-center.x,-center.y,-center.z));
  geometry.applyMatrix4(transform);return geometry;
 }
 function restore(){for(const [mesh,orig] of originals){mesh.geometry=orig.geometry;applyMaterial(orig.entry,orig.material);}status.applied=0;active=false;}
 function snapshot(item){const mesh=item.target.mesh;if(!originals.has(mesh)){const material=originalMaterialFor?.(mesh)||mesh.material;originals.set(mesh,{entry:item.target,geometry:mesh.geometry,material});}}
 function refresh(){
  if(!ready)return;
  restore();
  if(!state.enabled||mode!=='detailed'){invalidate(3);return}
  let count=0;
  for(const item of ready.candidates){
   const key=skullKey(item.row.name),adj=override(key);
   if(adj.disabled||(item.row.status==='review'&&!adj.approved))continue;
   snapshot(item);
   const original=originals.get(item.target.mesh);
   const material=materialFactory(original.material,THREE,new THREE.Color(getTone()));
   materials.set(item.target.mesh,material);
   item.target.mesh.geometry=replacementGeometry(item);
   applyMaterial(item.target,material);
   count++;
  }
  status.applied=count;active=count>0;invalidate(3);
 }
 async function sync(nextMode){
  mode=nextMode;status.mode=mode;
  if(mode!=='detailed'||!state.enabled){restore();invalidate(3);draw();return true}
  try{await prepare();refresh();error=null;status.error=null;draw();return true}
  catch(e){restore();error=String(e?.message||e);status.error=error;draw();console.warn('AnatomIQ skull preview:',error);return false}
 }
 async function setEnabled(next){state.enabled=next===true;status.enabled=state.enabled;persist();return sync(mode)}
 function setBoneTone(){if(ready&&state.enabled&&mode==='detailed')refresh()}
 function setAdjustment(key,change){const k=skullKey(key);if(!k||!ready?.candidates.some(c=>skullKey(c.row.name)===k))return false;
  state.overrides[k]=normalizeAdjustment({...override(k),...change});persist();refresh();draw();return true;
 }
 function audit(){return {version:SKULL_VERSION,mode,enabled:state.enabled,applied:status.applied,report:ready?.report||null,adjustments:state.overrides,error};}
 function exportReview(){reportDownload('AnatomIQ-Skull-Alignment-266-Review.json',audit())}
 function control(tag,props={}){const el=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='text')el.textContent=v;else el[k]=v}return el}
 function draw(){
  if(!teacherMode||typeof document==='undefined')return;
  const panel=document.getElementById('aiq-skull-alignment-266');if(!panel)return;
  const hint=panel.querySelector('[data-skull-hint]');
  if(hint)hint.textContent=error|| (ready?`${status.applied} preview bones active; ${ready.report.candidate_count} available (${ready.report.review_candidates} require approval). Original AnatomIQ skull restored when switched off.`:'Loads when enabled. Skull edits are device-local until exported and baked into an asset.');
  const select=panel.querySelector('[data-skull-select]');if(!select)return;
  const candidates=ready?.candidates||[];
  select.replaceChildren();
  for(const c of candidates){const key=skullKey(c.row.name);select.add(new Option(`${c.row.name} — ${c.row.status==='review'?'needs review':`p95 ${c.row.alignment_p95_mm}mm`}`,key))}
  if(!candidates.length)select.add(new Option('Enable preview to load candidates',''));
  if(!candidates.some(c=>skullKey(c.row.name)===selected)&&candidates.length)selected=skullKey(candidates[0].row.name);
  select.value=selected;
  const candidate=candidates.find(c=>skullKey(c.row.name)===selected),adj=override(selected);
  const editor=panel.querySelector('[data-skull-editor]');editor.hidden=!candidate;
  if(!candidate)return;
  for(const key of ['tx','ty','tz','rx','ry','rz']){const input=editor.querySelector(`[data-skull-${key}]`);if(input)input.value=adj[key]}
  const approve=editor.querySelector('[data-skull-approve]');approve.checked=candidate.row.status==='auto'||adj.approved;approve.disabled=candidate.row.status==='auto';
  editor.querySelector('[data-skull-disable]').checked=adj.disabled;
 }
 function ui(){
  if(!teacherMode||typeof document==='undefined'||document.getElementById('aiq-skull-alignment-266'))return;
  const root=document.getElementById('aiq-skeletal-detail-265');if(!root)return;
  const section=control('section',{id:'aiq-skull-alignment-266',className:'render-settings-group'});
  section.append(control('h4',{text:'Skull Alignment Workbench · Experimental'}));
  const enable=control('label'),checkbox=control('input',{type:'checkbox',checked:state.enabled});enable.append(checkbox,document.createTextNode(' Preview aligned BodyParts3D skull bones'));section.append(enable);
  const hint=control('p',{className:'studio-hint'});hint.dataset.skullHint='';section.append(hint);
  const select=control('select',{className:'text-input'});select.dataset.skullSelect='';section.append(select);
  const editor=control('div');editor.dataset.skullEditor='';
  for(const [name,title,step] of [['tx','Move X (mm)',.25],['ty','Move Y (mm)',.25],['tz','Move Z (mm)',.25],['rx','Rotate X (°)',.25],['ry','Rotate Y (°)',.25],['rz','Rotate Z (°)',.25]]){
   const label=control('label',{text:title}),field=control('input',{type:'number',step,min:name[0]==='t'?-12:-8,max:name[0]==='t'?12:8});field.setAttribute('data-skull-'+name,'');
   label.append(field);editor.append(label);
   field.addEventListener('change',()=>setAdjustment(selected,{[name]:Number(field.value)}));
  }
  const approved=control('input',{type:'checkbox'});approved.dataset.skullApprove='';approved.setAttribute('data-skull-approve','');const approvalLabel=control('label');approvalLabel.append(approved,document.createTextNode(' Approve review-needed bone'));editor.append(approvalLabel);
  approved.addEventListener('change',()=>setAdjustment(selected,{approved:approved.checked}));
  const disabled=control('input',{type:'checkbox'});disabled.dataset.skullDisable='';disabled.setAttribute('data-skull-disable','');const disableLabel=control('label');disableLabel.append(disabled,document.createTextNode(' Use original AnatomIQ bone'));editor.append(disableLabel);
  disabled.addEventListener('change',()=>setAdjustment(selected,{disabled:disabled.checked}));
  const reset=control('button',{type:'button',text:'Reset selected bone offset'});reset.addEventListener('click',()=>setAdjustment(selected,{...defaults()}));editor.append(reset);
  section.append(editor);
  const exportButton=control('button',{type:'button',text:'Export skull alignment report + offsets'});exportButton.addEventListener('click',exportReview);section.append(exportButton);
  root.after(section);
  checkbox.addEventListener('change',async()=>{checkbox.disabled=true;await setEnabled(checkbox.checked);checkbox.disabled=false;checkbox.checked=state.enabled;});
  select.addEventListener('change',()=>{selected=select.value;draw()});
  draw();
 }
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui,{once:true});else queueMicrotask(ui)}
 return {sync,setEnabled,setBoneTone,setAdjustment,audit,exportReview,status};
}
