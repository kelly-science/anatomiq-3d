import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {fitSimilarity, transformPoint, estimateSurfaceDistance, distance} from './registration-math.mjs?rev=243r3';

const $=id=>document.getElementById(id);
const canvas=$('viewport'),stage=$('canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#101924');
scene.add(new THREE.HemisphereLight(0xeef6ff,0x263446,2));
const sun=new THREE.DirectionalLight(0xffeee0,2.5);sun.position.set(3,5,7);scene.add(sun);
const camera=new THREE.PerspectiveCamera(46,1,.001,5000);camera.position.set(0,0,3);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;
const sourceGroup=new THREE.Group();sourceGroup.matrixAutoUpdate=false;scene.add(sourceGroup);
const nativeGroup=new THREE.Group();scene.add(nativeGroup);
const markerGroup=new THREE.Group();scene.add(markerGroup);
const kinds=['lunate','pisiform','hamate'];
const sourceMat=new THREE.MeshStandardMaterial({color:0x55d4e2,roughness:.55,transparent:true,opacity:.56,depthWrite:false,side:THREE.DoubleSide});
const targetMat=new THREE.MeshStandardMaterial({color:0xffa64d,emissive:0x2d1200,emissiveIntensity:.27,roughness:.4,side:THREE.DoubleSide});
const nativeMat=new THREE.MeshStandardMaterial({color:0xf0f5f9,roughness:.65,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide});
const nativeContextMat=new THREE.MeshStandardMaterial({color:0xd1dce7,roughness:.65,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
const raycaster=new THREE.Raycaster(),cursor=new THREE.Vector2();
const coords=['x','y','z','rx','ry','rz','scale'];
const offsets={x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:100};
let native=null,allMeshes=[],data=[],src=new Map(),picked={lunate:null,pisiform:null,hamate:null};
let baseMatrix=null,registration=null,viewMode='source',activePick=null,loadSerial=0,notice='';
const displayModes=['source','native','compare','placed'];

for(const key of coords){
  const label=document.createElement('label');label.textContent=({x:'X',y:'Y',z:'Z',rx:'Rot X',ry:'Rot Y',rz:'Rot Z',scale:'Scale %'})[key];
  const inp=document.createElement('input');inp.type='number';inp.step=key==='scale'?'1':key.startsWith('r')?'1':'.001';inp.value=offsets[key];inp.dataset.offset=key;
  inp.addEventListener('input',()=>{offsets[key]=Number(inp.value);if(baseMatrix){if(viewMode==='source'||viewMode==='native')setView('compare');else applyMatrix();}});
  label.appendChild(inp);$('offsets').appendChild(label);
}
function msg(t){$('status').textContent=t;}
function nameOf(o){let p=o,parts=[];for(let i=0;i<3&&p;i++,p=p.parent)if(p.name)parts.push(p.name);return parts.join(' / ')||'(unnamed)';}
function sidePattern(side){return side==='left'?/(^|[^a-z])(left|l)([^a-z]|$)/i:/(^|[^a-z])(right|r)([^a-z]|$)/i;}
function nativeCandidates(){const re=sidePattern($('side').value);return allMeshes.filter(o=>re.test(nameOf(o))||!/(left|right)/i.test(nameOf(o)));}
function isCorrectPair(k,o){const n=nameOf(o);return new RegExp(k,'i').test(n)&&sidePattern($('side').value).test(n);}
function updateNativeVisibility(){
  const targets=new Set(Object.values(picked).filter(Boolean));
  for(const o of allMeshes){
    const n=nameOf(o);
    if(viewMode==='source'){o.visible=false;continue;}
    if(viewMode==='native'){
      o.visible=$('native-all').checked||/(lunate|pisiform|hamate|carpal|wrist|radius|ulna|metacarp|hand)/i.test(n)||targets.has(o);
    }else if(viewMode==='compare'){
      o.visible=targets.has(o)||($('context').checked&&/(lunate|pisiform|hamate|carpal|wrist|radius|ulna|metacarp|hand)/i.test(n));
    }else if(viewMode==='placed'){
      o.visible=targets.has(o)||/(lunate|pisiform|hamate|carpal|wrist|radius|ulna|metacarp|hand)/i.test(n);
    }
    o.material=targets.has(o)?nativeMat:nativeContextMat;
  }
}
function rebuildMenus(){
  const filter=$('native-filter').value.toLowerCase();const matches=nativeCandidates().filter(o=>nameOf(o).toLowerCase().includes(filter));
  for(const kind of kinds){
    const sel=$(`native-${kind}`),previous=picked[kind];sel.replaceChildren();
    const initial=document.createElement('option');initial.value='';initial.textContent=`Choose native ${kind} (${matches.length} meshes)`;sel.append(initial);
    for(const o of matches){const option=document.createElement('option');option.value=String(allMeshes.indexOf(o));option.textContent=nameOf(o).slice(0,125);sel.append(option);}
    sel.value=previous&&matches.includes(previous)?String(allMeshes.indexOf(previous)):'';
  }
}
function clearAlignment(){baseMatrix=null;registration=null;notice='Registration invalidated by reference change. Recalculate alignment.';setView('native',false);refresh();}
function rebuildLandmarks(){
  const parent=$('landmarks');parent.replaceChildren();
  for(const kind of kinds){
    const label=document.createElement('label');label.textContent=`AnatomIQ ${kind} (white target)`;
    const select=document.createElement('select');select.id=`native-${kind}`;
    select.addEventListener('change',()=>{picked[kind]=select.value!==''?allMeshes[Number(select.value)]:null;clearAlignment();rebuildMenus();});
    const b=document.createElement('button');b.textContent=`Pick ${kind} in 3D`;b.style.marginTop='5px';
    b.onclick=()=>{activePick=kind;setView('native');$('picking').textContent=`Click AnatomIQ's ${kind}, not a BodyParts3D reference`;};
    label.append(select,b);parent.appendChild(label);
  }
  rebuildMenus();
}
function selectByName(){
  const side=sidePattern($('side').value);
  for(const kind of kinds){
    const hits=allMeshes.filter(o=>new RegExp(kind,'i').test(nameOf(o))&&side.test(nameOf(o)));
    picked[kind]=hits.length===1?hits[0]:null;
  }
  clearAlignment();rebuildMenus();
  const missing=kinds.filter(k=>!picked[k]);if(missing.length)notice=`Unable to auto-identify uniquely: ${missing.join(', ')}. Choose the actual AnatomIQ mesh manually.`;
  refresh();
}
function readObj(text){
  const verts=[],indices=[];
  for(const line of text.split(/\r?\n/)){
    if(line.startsWith('v ')){const a=line.trim().split(/\s+/);if(a.length>=4)verts.push(Number(a[1]),Number(a[2]),Number(a[3]));}
    else if(line.startsWith('f ')){
      const a=line.trim().slice(2).split(/\s+/).map(x=>Number(x.split('/')[0]));const size=verts.length/3;
      const v=a.map(n=>n>0?n-1:size+n);for(let j=1;j<v.length-1;j++)indices.push(v[0],v[j],v[j+1]);
    }
  }
  if(verts.length<12||indices.length<12||verts.some(v=>!Number.isFinite(v)))throw Error('Invalid source OBJ');
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setIndex(indices);
  geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
async function loadSources(){
  const seq=++loadSerial;
  for(const m of sourceGroup.children)m.geometry?.dispose();sourceGroup.clear();src.clear();baseMatrix=null;registration=null;
  const side=$('side').value;
  for(const kind of ['triquetral',...kinds]){
    const entries=data.filter(r=>r.side===side&&r.kind===kind).sort((a,b)=>b.faces-a.faces);
    const chosen=kind==='triquetral'?entries.find(e=>e.id===$('candidate').value)||entries[0]:entries[0];
    if(!chosen)throw Error(`Missing BodyParts3D ${side} ${kind}`);
    const response=await fetch(chosen.url,{cache:'no-store'});if(!response.ok)throw Error(`Cannot load ${chosen.url}`);
    const geometry=readObj(await response.text());if(seq!==loadSerial){geometry.dispose();return;}
    const mesh=new THREE.Mesh(geometry,kind==='triquetral'?targetMat:sourceMat);mesh.name=chosen.name;mesh.userData.source=chosen;
    sourceGroup.add(mesh);src.set(kind,mesh);
  }
  sourceGroup.matrix.identity();sourceGroup.updateMatrixWorld(true);
  notice='BodyParts3D bones loaded. Choose all three matching white AnatomIQ carpals, then Calculate alignment.';
  setView('source');
}
function pickSide(){
  const side=$('side').value,cs=data.filter(r=>r.side===side&&r.kind==='triquetral').sort((a,b)=>b.faces-a.faces);
  $('candidate').replaceChildren();for(const r of cs){const o=document.createElement('option');o.value=r.id;o.textContent=`${r.id} · ${r.faces} faces`; $('candidate').append(o);}
  picked={lunate:null,pisiform:null,hamate:null};rebuildMenus();setView('source',false);loadSources().catch(e=>{console.error(e);msg(`Source load failed: ${e.message}`);});
}
function sourceCenter(kind){const mesh=src.get(kind);return mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).toArray();}
function nativeCenter(kind){const mesh=picked[kind];if(!mesh)throw Error(`Select AnatomIQ ${kind}`);return new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).toArray();}
function toMatrix(fit){
  const [w,x,y,z]=fit.quaternion;
  return new THREE.Matrix4().compose(new THREE.Vector3(...fit.translation),new THREE.Quaternion(x,y,z,w),new THREE.Vector3(fit.scale,fit.scale,fit.scale));
}
function sampleMesh(mesh,max=170,world=false){
  mesh.updateWorldMatrix(true,false);
  const pos=mesh.geometry.getAttribute('position');const size=Math.max(1,Math.ceil(pos.count/max));const points=[];
  for(let i=0;i<pos.count;i+=size){const p=new THREE.Vector3().fromBufferAttribute(pos,i);if(world)p.applyMatrix4(mesh.matrixWorld);points.push(p.toArray());}
  return points;
}
function fitDiagnostics(matrix){
  // Unlike centroid errors, this detects major shape/placement discrepancies.
  const fit={translation:[0,0,0],quaternion:[1,0,0,0],scale:1};
  const pos=new THREE.Vector3(),rot=new THREE.Quaternion(),s=new THREE.Vector3();matrix.decompose(pos,rot,s);
  fit.translation=pos.toArray();fit.quaternion=[rot.w,rot.x,rot.y,rot.z];fit.scale=s.x;
  const measures={};
  for(const k of kinds){
    const sourcePoints=sampleMesh(src.get(k));
    const targetPoints=sampleMesh(picked[k],170,true);
    const result=estimateSurfaceDistance(sourcePoints,targetPoints,fit);
    const nativeSize=new THREE.Box3().setFromObject(picked[k]).getSize(new THREE.Vector3()).length();
    const sourceCenterMapped=transformPoint(sourceCenter(k),fit),native=nativeCenter(k);
    measures[k]={centroidError:distance(sourceCenterMapped,native),surfaceMedian:result.median,surfaceP90:result.p90,normalizedSurfaceMedian:result.median/Math.max(nativeSize,1e-10),targetDiameter:nativeSize};
  }
  return measures;
}
function calculateAlignment(){
  for(const k of kinds){if(!picked[k])throw Error(`Select the AnatomIQ ${k}`);
    if(!isCorrectPair(k,picked[k]))throw Error(`Selected AnatomIQ ${k} name does not match the ${$('side').value} side: ${nameOf(picked[k])}`);
    if(!src.get(k))throw Error(`BodyParts3D ${k} has not loaded`);
  }
  const s=kinds.map(sourceCenter),t=kinds.map(nativeCenter);
  if(new Set(kinds.map(k=>picked[k])).size!==3)throw Error('Each reference must be a distinct AnatomIQ bone');
  const fit=fitSimilarity(s,t);
  baseMatrix=toMatrix(fit);
  registration={algorithm:'Horn proper least-squares 3-bone similarity',referenceOrder:[...kinds],centroidErrors:fit.errors,centroidRMS:fit.rms,scale:fit.scale,initialMatrixElements:baseMatrix.toArray(),referenceSurface:fitDiagnostics(baseMatrix)};
  for(const k of coords){offsets[k]=k==='scale'?100:0;}
  document.querySelectorAll('[data-offset]').forEach(e=>e.value=offsets[e.dataset.offset]);
  notice='3 matched BP3D reference bones → 3 white AnatomIQ carpals. Orange triquetrum inherits the SAME transform. Verify surface fit, not only center errors.';
  setView('compare');
}
function fitCost(metrics){return kinds.reduce((sum,k)=>sum+metrics[k].normalizedSurfaceMedian,0);}
function refineSurfaces(){
  if(!baseMatrix||!registration)throw Error('Calculate initial three-reference alignment first');
  // Reference-only rigid ICP. Each BP3D carpal matches its corresponding named
  // AnatomIQ carpal; the triquetrum gets exactly the same group transform.
  // No mirroring, no nonuniform scaling, and no independent candidate movement.
  const samples=kinds.map(kind=>({
    kind, source:sampleMesh(src.get(kind),160), target:sampleMesh(picked[kind],160,true),
    sourceCenter:sourceCenter(kind), targetCenter:nativeCenter(kind)
  }));
  let current=baseMatrix.clone(),metrics=fitDiagnostics(current),cost=fitCost(metrics),accepted=0;
  const largestTarget=Math.max(...kinds.map(k=>metrics[k].targetDiameter));
  for(let step=0;step<7;step++){
    const a=[],b=[];
    for(const group of samples){
      const mapped=group.source.map(p=>new THREE.Vector3(...p).applyMatrix4(current).toArray());
      const pairs=mapped.map((point,i)=>{
        let best=Infinity,target=null;
        for(const t of group.target){const d=(point[0]-t[0])**2+(point[1]-t[1])**2+(point[2]-t[2])**2;if(d<best){best=d;target=t;}}
        return {point,target,distance:best};
      }).sort((x,y)=>x.distance-y.distance);
      // Trim worst matches; preserve original three centroid anchors as guardrails.
      for(const pair of pairs.slice(0,Math.max(12,Math.floor(pairs.length*.78)))){a.push(pair.point);b.push(pair.target);}
      const centroid=new THREE.Vector3(...group.sourceCenter).applyMatrix4(current).toArray();
      for(let repeat=0;repeat<12;repeat++){a.push(centroid);b.push(group.targetCenter);}
    }
    const delta=fitSimilarity(a,b,{allowScale:false});
    const next=toMatrix(delta).multiply(current);
    const nextMetrics=fitDiagnostics(next),nextCost=fitCost(nextMetrics);
    const displaced=kinds.some(k=>nextMetrics[k].centroidError>Math.max(largestTarget*.16,metrics[k].centroidError*3));
    if(displaced||nextCost>=cost-0.0002)break;
    current=next;metrics=nextMetrics;cost=nextCost;accepted++;
  }
  if(accepted){
    registration.refinement={method:'Within-bone nearest-neighbor rigid surface fit; three named reference carpals only',iterations:accepted,beforeSurfaceCost:fitCost(registration.referenceSurface),afterSurfaceCost:cost};
    registration.referenceSurface=metrics;baseMatrix.copy(current);
    for(const k of coords)offsets[k]=k==='scale'?100:0;
    document.querySelectorAll('[data-offset]').forEach(e=>e.value=offsets[e.dataset.offset]);
    notice=`Surface refinement accepted ${accepted} guarded rigid steps. Inspect the white/cyan overlay again; matching centroids alone cannot prove a correct anatomical fit.`;
  }else notice='Surface refinement could not improve the three-reference fit safely. Kept original registration unchanged.';
  setView('compare');
}
function finalMatrix(){
  if(!baseMatrix)return null;
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(offsets.rx*Math.PI/180,offsets.ry*Math.PI/180,offsets.rz*Math.PI/180));
  const tweak=new THREE.Matrix4().compose(new THREE.Vector3(offsets.x,offsets.y,offsets.z),q,new THREE.Vector3(offsets.scale/100,offsets.scale/100,offsets.scale/100));
  return tweak.multiply(baseMatrix);
}
function applyMatrix(){
  const m=finalMatrix();if(!m)return;
  sourceGroup.matrix.copy(m);sourceGroup.updateMatrixWorld(true);
  drawMarkers();refresh();
}
function drawMarkers(){
  for(const marker of [...markerGroup.children]){marker.geometry?.dispose();marker.material?.dispose();}
  markerGroup.clear();if(viewMode!=='compare'||!baseMatrix||!$('markers').checked)return;
  const diag=kinds.map(k=>new THREE.Box3().setFromObject(picked[k]).getSize(new THREE.Vector3()).length());
  const dotSize=Math.max(.0001,Math.min(...diag)/30);
  for(const k of kinds){
    const a=new THREE.Vector3(...sourceCenter(k)).applyMatrix4(sourceGroup.matrix);
    const b=new THREE.Vector3(...nativeCenter(k));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:0xffda78,depthTest:false}));line.renderOrder=10;markerGroup.add(line);
    for(const [p,col] of [[a,0x36e8fa],[b,0xf2f5fc]]){
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(dotSize,10,8),new THREE.MeshBasicMaterial({color:col,depthTest:false}));sphere.position.copy(p);sphere.renderOrder=10;markerGroup.add(sphere);
    }
  }
}
function renderSources(){
  for(const [kind,m] of src){
    m.visible= viewMode==='source'?kind==='triquetral':viewMode==='compare'?(kind==='triquetral'||$('references').checked):viewMode==='placed'&&kind==='triquetral';
  }
  sourceGroup.visible=viewMode==='source'||viewMode==='compare'||viewMode==='placed';
}
function setView(mode,refocus=true){
  if((mode==='compare'||mode==='placed')&&!baseMatrix){notice='First select 3 matching AnatomIQ reference carpals and click Calculate alignment.';refresh();return false;}
  viewMode=mode;
  if(mode==='source'){sourceGroup.matrix.identity();sourceGroup.updateMatrixWorld(true);}else if(baseMatrix)applyMatrix();
  updateNativeVisibility();renderSources();drawMarkers();
  const labels={source:'RAW BODY PARTS 3D · UNREGISTERED',native:'WHITE ANATOMIQ REFERENCE BONES',compare:'3-BONE REFERENCE OVERLAY · UNVERIFIED',placed:'TRIQUETRUM PLACEMENT · UNVERIFIED'};
  const help={source:'Imported orange triquetrum only. In the BodyParts3D coordinate system; not aligned yet.',native:'Select AnatomIQ lunate, pisiform, hamate by name or click the corresponding existing white bones.',compare:'WHITE = three existing AnatomIQ targets; CYAN = three transformed BodyParts3D references; ORANGE = triquetrum with exactly the same transform.',placed:'Triquetrum transferred using the alignment calculated from all three reference pairs. Compare its placement against the existing white AnatomIQ wrist.'};
  $('view-state').textContent=labels[mode];$('view-explanation').textContent=help[mode];
  for(const name of displayModes){const button=$(`view-${name}`);button.disabled=(name==='compare'||name==='placed')&&!baseMatrix;button.setAttribute('aria-pressed',String(mode===name));}
  if(refocus)focus();refresh();return true;
}
function refresh(){
  const count=Object.values(picked).filter(Boolean).length;
  const candidate=src.get('triquetral')?.userData.source;
  const fit=registration;
  const adjustedMetrics=fit&&baseMatrix?fitDiagnostics(finalMatrix()):null;
  let out=`View: ${viewMode.toUpperCase()}\nBP3D triquetrum: ${candidate?.id||'—'} · ${candidate?.name||'not loaded'}\nAnatomIQ reference bones selected: ${count}/3\nRegistration: ${baseMatrix?'UNVERIFIED · REVIEW ONLY':'NOT YET COMPUTED'}`;
  if(fit){
    out+=`\nUniform source-to-native scale: ${fit.scale.toPrecision(5)}\nReference centroid RMS: ${fit.centroidRMS.toPrecision(4)} model units`;
    for(const k of kinds){const m=adjustedMetrics[k];out+=`\n${k}: centroid ${m.centroidError.toPrecision(3)}, median surface gap ${(m.normalizedSurfaceMedian*100).toFixed(1)}% of target diameter`;}
    if(kinds.some(k=>adjustedMetrics[k].normalizedSurfaceMedian>.18))out+='\nWARNING: Some reference bone surfaces differ substantially. Review correspondence, source mesh variants and anatomical pose.';
  }
  if(notice)out+='\n'+notice;
  msg(out);$('export').disabled=!baseMatrix;$('refine').disabled=!baseMatrix;
}
function focus(){
  const bounds=new THREE.Box3();sourceGroup.updateMatrixWorld(true);
  if(viewMode==='source'){const c=src.get('triquetral');if(c)bounds.expandByObject(c);}
  else if(viewMode==='compare'||viewMode==='placed'){
    for(const k of kinds){if(picked[k])bounds.expandByObject(picked[k]);if(viewMode==='compare'&&src.get(k))bounds.expandByObject(src.get(k));}
    if(src.get('triquetral'))bounds.expandByObject(src.get('triquetral'));
  }else{
    for(const k of kinds)if(picked[k])bounds.expandByObject(picked[k]);
    if(bounds.isEmpty())for(const m of allMeshes.filter(o=>o.visible).slice(0,160))bounds.expandByObject(m);
  }
  if(bounds.isEmpty())return;
  const center=bounds.getCenter(new THREE.Vector3()),radius=Math.max(bounds.getSize(new THREE.Vector3()).length()*.85,.025);
  controls.target.copy(center);camera.position.copy(center.clone().add(new THREE.Vector3(radius*.8,radius*.7,radius*1.5)));
  camera.near=Math.max(.000001,radius/1e4);camera.far=Math.max(3000,radius*70);camera.updateProjectionMatrix();controls.update();
}
function exportReview(){
  if(!baseMatrix||!registration)return;
  const candidate=src.get('triquetral').userData.source;
  const report={schema:'anatomiq-triquetrum-three-bone-registration-v2',status:'UNVERIFIED_PREVIEW_ONLY',publishApproved:false,
    side:$('side').value,algorithm:registration.algorithm,
    source:{dataset:'BodyParts3D 4.3',attribution:'© Database Center for Life Science (DBCLS)',license:'CC BY-SA 2.1 Japan — verify downstream obligations'},
    candidate:{fjId:candidate.id,fmaId:candidate.fma,sha256:candidate.sha256,originalObj:candidate.url},
    referenceBones:kinds.map(k=>({name:k,sourceMesh:src.get(k).userData.source,nativeName:nameOf(picked[k]),nativeMeshId:allMeshes.indexOf(picked[k])})),
    registration:{centroidRMS:registration.centroidRMS,centroidErrors:registration.centroidErrors,uniformScale:registration.scale,referenceSurface:registration.referenceSurface,
      initialMatrixElements:registration.initialMatrixElements,finalMatrixElements:finalMatrix().toArray(),finalReferenceSurface:fitDiagnostics(finalMatrix()),adjustments:{...offsets},refinement:registration.refinement||null,matrixConvention:'Three.js column-major, BP3D local/world source coordinates → AnatomIQ scene world coordinates'},
    warnings:['Surface distances compare subsampled vertices, not clinical validation.','All four BP3D bones inherit one transform; only triquetrum should be integrated after approval.','Check left/right handedness and bone intersections from multiple angles.','Mesh attribution/license obligations apply.']};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`anatomiq-triquetrum-${$('side').value}-three-bone-review.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),4000);
}
canvas.addEventListener('pointerdown',ev=>{
  if(!activePick)return;ev.preventDefault();ev.stopImmediatePropagation();
  const r=canvas.getBoundingClientRect();cursor.set((ev.clientX-r.left)/r.width*2-1,-((ev.clientY-r.top)/r.height*2-1));raycaster.setFromCamera(cursor,camera);
  const hits=raycaster.intersectObjects(allMeshes.filter(m=>m.visible),false);
  if(hits.length){picked[activePick]=hits[0].object;activePick=null;$('picking').textContent='';rebuildMenus();clearAlignment();}
},{capture:true});
for(const mode of displayModes)$(`view-${mode}`).addEventListener('click',()=>setView(mode));
$('native-filter').addEventListener('input',rebuildMenus);
$('side').addEventListener('change',pickSide);
$('candidate').addEventListener('change',()=>loadSources().catch(e=>msg(e.message)));
$('native-all').addEventListener('change',updateNativeVisibility);
$('context').addEventListener('change',updateNativeVisibility);
$('references').addEventListener('change',renderSources);
$('markers').addEventListener('change',drawMarkers);
$('auto').onclick=selectByName;
$('align').onclick=()=>{try{calculateAlignment();}catch(e){notice='Cannot align: '+e.message;refresh();}};
$('refine').onclick=()=>{try{refineSurfaces();}catch(e){notice='Surface refinement unavailable: '+e.message;refresh();}};
$('focus').onclick=focus;
$('reset').onclick=()=>{for(const k of coords)offsets[k]=k==='scale'?100:0;document.querySelectorAll('[data-offset]').forEach(e=>e.value=offsets[e.dataset.offset]);applyMatrix();};
$('export').onclick=exportReview;
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
async function init(){try{
  msg('Loading existing AnatomIQ skeleton and BodyParts3D candidate inventory…');
  const [j,model]=await Promise.all([
    fetch('./assets/index.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Run prepare.py first (assets/index.json missing)');return r.json();}),
    new GLTFLoader().loadAsync('../../models/ecorche.glb')
  ]);
  if(j.schema!==1||!Array.isArray(j.entries))throw Error('Unexpected source inventory');data=j.entries;
  native=model.scene;nativeGroup.add(native);native.updateMatrixWorld(true);
  native.traverse(o=>{if(!o.isMesh)return;allMeshes.push(o);o.material=nativeContextMat;});
  if(!allMeshes.length)throw Error('Existing AnatomIQ skeleton has no meshes');
  rebuildLandmarks();updateNativeVisibility();pickSide();
}catch(e){console.error(e);msg('Cannot open preview: '+e.message);}}
init();
