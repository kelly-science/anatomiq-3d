import {isVertebra,refineVertebraGeometry,SURFACE_MODES} from './bone-smoothing-265e.mjs';
/* AnatomIQ 2.2.65e: selective detailed geometry, calibrated bone tone, on-demand performance audit.
   Original bones/IDs/materials/metadata stay in the scene. Any missing or
   unsafe asset falls back to the standard geometry. No changes to anatomy
   catalogue, lesson serialization, camera, overlays or carousel. */
export const SKELETAL_DETAIL_VERSION = '2.2.65e';
export const SURFACE_STORAGE_KEY='anatomiq-vertebra-surface-265e';
const DETAIL_ASSET_VERSION='2.2.65c'; // 2.2.65d changes materials only; asset/report unchanged
export const BONE_TONE_KEY='anatomiq-detailed-bone-tone-265d';
// Starting calibration: deliberately darker/warmer than the prior white 2.2.65c tint.
// Adjust once in Settings against the unchanged skull; stays device-local.
export const DEFAULT_DETAILED_BONE_TONE='#c2b6a5';
export function normalizeBoneTone(value){return /^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toLowerCase():DEFAULT_DETAILED_BONE_TONE;}
export const STORAGE_KEY = 'anatomiq-skeletal-detail-265';
const GLB_PATH = './models/skeletal-detailed-265c.glb?rev=265c';
const REPORT_PATH = './models/skeletal-detailed-265c-report.json?rev=265c';
export function normName(name){return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
// Keep original rib cage, sternum and skull until their alignments are approved.
export function excludedDetailedRegion(name){
  const n=normName(name);
  if(/\b(rib|ribs|sternum|manubrium|xiphoid)\b/.test(n))return 'rib cage / sternum';
  if(/\b(frontal|parietal|temporal|occipital|ethmoid|sphenoid|lacrimal|nasal|palatine|zygomatic|maxilla|mandible|vomer|concha)\b/.test(n))return 'skull';
  return null;
}
export function triangleCount(geometry){
  if(!geometry?.attributes?.position)return 0;
  return Math.floor((geometry.index?.count??geometry.attributes.position.count)/3);
}
export function geometryBytes(geometry){
  if(!geometry)return 0;
  let bytes=geometry.index?.array?.byteLength||0;
  for(const attr of Object.values(geometry.attributes||{}))bytes+=attr?.array?.byteLength||0;
  return bytes;
}
export function checkDetailCompatibility(structures,report){
  const byName=new Map();
  for(const entry of structures){
    if(entry.system!=='skeletal'||String(entry.tissue||'bone')!=='bone'||!entry.mesh?.geometry)continue;
    const key=normName(entry.name);
    if(byName.has(key))byName.set(key,null);else byName.set(key,entry);
  }
  const entries=[];
  for(const row of report?.rows||[]){
    if(row.status!=='accepted'||excludedDetailedRegion(row.name))continue;
    const target=byName.get(normName(row.name));
    if(target && Number.isFinite(row.old_triangles)){
      const triangles=Math.floor((target.mesh.geometry.index?.count??target.mesh.geometry.attributes.position.count)/3);
      if(triangles===row.old_triangles)entries.push({row,target});
    }
  }
  return entries;
}
// The Écorché source and the replacement have unrelated UV layouts. Sampling
// an old mesh's atlas produces inconsistent near-white tints and can fail on
// canvas/image readiness. Use one editable diffuse bone tone for every new
// skeletal mesh. Keep ALL original materials/maps for Standard and excluded bones.
export function makeCompatibleBoneMaterial(source,THREE,tint=null){
  const convert=original=>{
    const material=original?.clone?original.clone():new THREE.MeshStandardMaterial();
    for(const key of ['map','normalMap','bumpMap','roughnessMap','metalnessMap','aoMap','lightMap','emissiveMap','alphaMap','displacementMap','specularMap','specularIntensityMap','specularColorMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap']){
      if(key in material)material[key]=null;
    }
    if('vertexColors' in material)material.vertexColors=false;
    if(material.color?.copy)material.color.copy(tint||new THREE.Color(DEFAULT_DETAILED_BONE_TONE));
    if('metalness' in material)material.metalness=0;
    if('roughness' in material)material.roughness=0.42;
    if(material.emissive?.set)material.emissive.set(0x000000);
    if('emissiveIntensity' in material)material.emissiveIntensity=0;
    if('transparent' in material)material.transparent=false;
    if('opacity' in material)material.opacity=1;
    if('alphaTest' in material)material.alphaTest=0;
    if('displacementScale' in material)material.displacementScale=0;
    if('wireframe' in material)material.wireframe=false;
    material.needsUpdate=true;
    return material;
  };
  return Array.isArray(source)?source.map(convert):convert(source);
}

export function validateReplacementGeometry(candidate){
  const pos=candidate?.getAttribute?.('position')||candidate?.attributes?.position;
  if(!pos||pos.itemSize!==3||pos.count<3)return false;
  let normals=candidate.getAttribute?.('normal')||candidate.attributes?.normal;
  if(!normals||normals.itemSize!==3||normals.count!==pos.count){
    candidate.deleteAttribute?.('normal');
    candidate.computeVertexNormals?.();
    normals=candidate.getAttribute?.('normal')||candidate.attributes?.normal;
  }
  if(!normals||normals.count!==pos.count)return false;
  candidate.computeBoundingBox?.();candidate.computeBoundingSphere?.();
  return true;
}

export function installSkeletalGeometryUpgrade(structures,THREE,{invalidate=()=>{},storage=window.localStorage,loaderFactory,teacherMode=true,pilot=null,boneAppearanceController=null,materials=null,refreshAppearance=()=>{},renderer=null}={}){
  const key=STORAGE_KEY;
  let mode='standard',originals=new Map(), replacements=null, pending=null, busy=false;
  let boneTone=DEFAULT_DETAILED_BONE_TONE;
  try{boneTone=normalizeBoneTone(storage.getItem(BONE_TONE_KEY));}catch{}
  const detailedMaterials=new Map();
  const surfaceVariants=new WeakMap();
  let surfaceMode='original';
  try{const value=storage.getItem(SURFACE_STORAGE_KEY);if(SURFACE_MODES.includes(value))surfaceMode=value;}catch{}
  function surfaceFor(name,geometry){
    if(surfaceMode==='original'||!isVertebra(name))return geometry;
    let cached=surfaceVariants.get(geometry);
    if(!cached){cached=new Map();surfaceVariants.set(geometry,cached)}
    if(!cached.has(surfaceMode)){
      try{cached.set(surfaceMode,refineVertebraGeometry(geometry,surfaceMode));}
      catch(error){console.warn('AnatomIQ vertebra surface fallback:',name,error);cached.set(surfaceMode,geometry)}
    }
    return cached.get(surfaceMode);
  }
  function setSurfaceMode(value){
    if(!SURFACE_MODES.includes(value))return false;
    surfaceMode=value;
    try{storage.setItem(SURFACE_STORAGE_KEY,value);}catch{}
    if(mode==='detailed')for(const {entry,geometry} of replacements||[]){entry.mesh.geometry=surfaceFor(entry.name,geometry)}
    invalidate(3);emit();return true;
  }

  let reportMetadata=null,lastProfile=null;
  try {if(storage.getItem(key)==='detailed')mode='detailed';}catch{}
  const status={version:SKELETAL_DETAIL_VERSION,mode:'standard',available:false,replacements:0,matched:0,error:null};
  function emit(){status.mode=mode;window.__AnatomIQSkeletalDetail={...status,boneTone,surfaceMode,apply,setBoneTone,setSurfaceMode,resetBoneTone:()=>setBoneTone(DEFAULT_DETAILED_BONE_TONE),reset:()=>apply('standard'),audit,profileRender,downloadAudit};}
  async function prepare(){
    if(replacements)return replacements;
    if(pending)return pending;
    pending=(async()=>{
      const head=await fetch(REPORT_PATH,{cache:'no-cache'});
      if(!head.ok || /text\/html/i.test(head.headers.get('content-type')||''))throw Error('Detailed skeleton report not deployed');
      const report=await head.json();
      reportMetadata={accepted:report.accepted,excluded:report.excluded_replacements||[],originalGlbBytes:report.original_glb_bytes||null,prunedGlbBytes:report.pruned_glb_bytes||null};
      if(report.version!==DETAIL_ASSET_VERSION||!report.accepted)throw Error('Detailed skeleton report is missing or incompatible');
      const compatible=checkDetailCompatibility(structures,report);
      if(!compatible.length)throw Error('No skeletal parts matched detailed manifest');
      const loader=loaderFactory ? loaderFactory() : new (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader();
      const loaded=await new Promise((resolve,reject)=>loader.load(GLB_PATH,resolve,undefined,reject));
      const fromGLB=new Map();
      loaded.scene.traverse(object=>{if(object.isMesh){const n=normName(object.userData?.name||object.name);if(fromGLB.has(n))fromGLB.set(n,null);else fromGLB.set(n,object.geometry);}});
      const accepted=[];
      for(const {row,target} of compatible){
        if(excludedDetailedRegion(row.name))continue;
        const candidate=fromGLB.get(normName(row.name));
        if(!validateReplacementGeometry(candidate))continue;
        const faceCount=Math.floor((candidate.index?.count??candidate.attributes.position.count)/3);
        if(faceCount!==row.source_triangles)continue;
        const sourceBox=new THREE.Box3().setFromBufferAttribute(candidate.attributes.position);
        const targetBox=new THREE.Box3().setFromBufferAttribute(target.mesh.geometry.attributes.position);
        const srcSize=sourceBox.getSize(new THREE.Vector3());const dstSize=targetBox.getSize(new THREE.Vector3());
        if(dstSize.length()===0||Math.abs(srcSize.length()/dstSize.length()-1)>.15)continue;
        accepted.push({entry:target,geometry:candidate});
      }
      if(!accepted.length)throw Error('All detailed bones failed runtime topology/bounds checks');
      replacements=accepted;status.replacements=accepted.length;status.matched=compatible.length;status.available=true;
      return replacements;
    })();
    try{return await pending;}catch(e){pending=null;throw e;}
  }
  // The bone appearance controller owns the Classic/Natural material variants.
  // Refresh its registry as well as AnatomIQ's painted-material base cache, so
  // later changes to bone appearance and teacher paint do not resurrect bad UVs.
  function updateMaterial(entry,baseMaterial){
    const mesh=entry.mesh;
    if(boneAppearanceController?.register){
      boneAppearanceController.register(mesh,baseMaterial,{force:true});
    }else mesh.material=baseMaterial;
    materials?.set?.(mesh,mesh.material);
    refreshAppearance(entry);
  }
  function setBoneTone(value){
    boneTone=normalizeBoneTone(value);
    try{storage.setItem(BONE_TONE_KEY,boneTone);}catch{}
    // Rebuild variants rather than editing only the classic material: the
    // Natural Bone appearance controller caches its own shader-bearing clone.
    for(const [mesh,original] of originals){
      const fresh=makeCompatibleBoneMaterial(original.material,THREE,new THREE.Color(boneTone));
      detailedMaterials.set(mesh,fresh);
      if(mode==='detailed')updateMaterial(original.entry,fresh);
    }
    const picker=typeof document==='undefined'?null:document.getElementById('aiq-detailed-tone-265d');
    if(picker)picker.value=boneTone;
    invalidate(3);emit();return boneTone;
  }
  function restoreOriginals(){
    for(const [mesh,original] of originals){
      mesh.geometry=original.geometry;
      updateMaterial(original.entry,original.material);
    }
  }
  async function apply(next){
    if(busy)return false;
    if(next===mode && (next!=='detailed'||replacements))return true;
    busy=true;
    try{
      if(next==='detailed'){
        if(pilot?.apply)pilot.apply('standard');
        const assets=await prepare();
        for(const {entry,geometry} of assets){
          const mesh=entry.mesh;
          if(!originals.has(mesh)){
            const classic=boneAppearanceController?.classicFor?.(mesh) || materials?.get?.(mesh) || mesh.material;
            originals.set(mesh,{entry,geometry:mesh.geometry,material:classic});
          }
          const original=originals.get(mesh);
          if(!detailedMaterials.has(mesh)){
            detailedMaterials.set(mesh,makeCompatibleBoneMaterial(original.material,THREE,new THREE.Color(boneTone)));
          }
          mesh.geometry=surfaceFor(entry.name,geometry);
          updateMaterial(entry,detailedMaterials.get(mesh));
        }
        mode='detailed';
      }else{
        restoreOriginals();
        mode='standard';
      }
      try{storage.setItem(key,mode);}catch{}
      status.error=null;invalidate(3);emit();return true;
    }catch(e){
      restoreOriginals();
      mode='standard';status.error=String(e?.message||e);console.warn('AnatomIQ skeletal detail:',status.error);
      invalidate(3);emit();return false;
    }finally{busy=false;}
  }
  function audit(){
    const parts=(replacements||[]).map(({entry,geometry})=>{
      const old=originals.get(entry.mesh)?.geometry||entry.mesh.geometry;
      return {name:entry.name,oldTriangles:triangleCount(old),detailedTriangles:triangleCount(geometry),
        additionalTriangles:triangleCount(geometry)-triangleCount(old),
        oldGeometryBytes:geometryBytes(old),detailedGeometryBytes:geometryBytes(geometry),
        visible:entry.mesh.visible,castShadow:!!entry.mesh.castShadow};
    });
    return {version:'2.2.65e',boneTone,surfaceMode,smoothedVertebrae:parts.filter(p=>isVertebra(p.name)).length,timestamp:new Date().toISOString(),mode,enhancedBones:parts.length,
      excluded:reportMetadata?.excluded||[],originalAssetBytes:reportMetadata?.originalGlbBytes||null,
      detailedAssetBytes:reportMetadata?.prunedGlbBytes||null,
      activeDetailedTriangles:parts.reduce((s,p)=>s+p.detailedTriangles,0),
      originalEquivalentTriangles:parts.reduce((s,p)=>s+p.oldTriangles,0),
      estimatedAdditionalGeometryBytes:parts.reduce((s,p)=>s+p.detailedGeometryBytes-p.oldGeometryBytes,0),
      activeShadowCasters:parts.filter(p=>p.visible&&p.castShadow).length,
      shaderPipeline:'Natural bone shader and dynamic shadow depth pass may multiply detail cost; label raycasting uses exact mesh triangles.',
      note:'Geometry memory is an estimate. CPU render-submit times are NOT GPU timings; WebGL renderer counters can vary by viewport/visibility.',
      renderer:renderer?{shadowsEnabled:!!renderer.shadowMap?.enabled, geometries:renderer.info?.memory?.geometries??null,
        textures:renderer.info?.memory?.textures??null, currentCalls:renderer.info?.render?.calls??null,
        currentTriangles:renderer.info?.render?.triangles??null,pixelRatio:renderer.getPixelRatio?.()??null}:null,
      lastProfile,labelPerformance:window.__AnatomIQLabelPerf?.report?.()||null,parts};
  }
  async function profileRender(durationMs=5000){
    if(!renderer||typeof renderer.render!=='function')return {error:'Renderer profiler unavailable'};
    if(profileRender.running)return {error:'Profiler already active'};
    profileRender.running=true;
    const original=renderer.render,samples=[];
    try{
      renderer.render=function(...args){
        const start=performance.now();
        try{return original.apply(this,args);}finally{
          samples.push({cpuSubmitMs:performance.now()-start,calls:renderer.info?.render?.calls??null,
            triangles:renderer.info?.render?.triangles??null});
        }
      };
      await new Promise(resolve=>setTimeout(resolve,Math.max(1000,Math.min(10000,durationMs))));
    }finally{renderer.render=original;profileRender.running=false;}
    const times=samples.map(s=>s.cpuSubmitMs).sort((a,b)=>a-b);
    lastProfile={renderCalls:samples.length,recordingMs:durationMs,
      medianCpuSubmitMs:times.length?+times[Math.floor(times.length/2)].toFixed(2):null,
      p95CpuSubmitMs:times.length?+times[Math.min(times.length-1,Math.floor(times.length*.95))].toFixed(2):null,
      maxTrianglesPerRender:samples.length?Math.max(...samples.map(s=>s.triangles||0)):null,
      maxDrawCallsPerRender:samples.length?Math.max(...samples.map(s=>s.calls||0)):null,
      caution:samples.length?'CPU submission only. GPU time, FPS, raycasting and shadow-map pass cannot be isolated here.':'No render calls captured; rotate/zoom while measuring.'};
    emit();return lastProfile;
  }
  function downloadAudit(){
    const json=JSON.stringify(audit(),null,2)+'\n';
    const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='AnatomIQ-Skeletal-Performance-265c.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function ui(){
    if(document.getElementById('aiq-skeletal-detail-265'))return;
    const previous=document.getElementById('aiq-vertebra-264');
    if(previous)previous.hidden=true;
    const anchor=document.getElementById('aiq-global-geometry-group')||document.getElementById('settings-skull-geometry')?.closest('.render-settings-group')||previous;
    if(!anchor)return;
    const group=document.createElement('section');group.id='aiq-skeletal-detail-265';group.className='render-settings-group';
    const label=document.createElement('label');label.htmlFor='aiq-skeletal-mode-265';label.textContent='Skeletal geometry';
    const select=document.createElement('select');select.id='aiq-skeletal-mode-265';select.className='text-input';
    for(const [value,name] of [['standard','Standard — original skeleton'],['detailed','Detailed — registered full-source bones']]){
      const opt=document.createElement('option');opt.value=value;opt.textContent=name;select.add(opt);
    }
    select.value=mode;
    const hint=document.createElement('p');hint.className='studio-hint';hint.textContent='Detailed upgrades verified bones. Skull, ribs and sternum remain original. Adjust the new bones to match the original bone tone.';
    select.addEventListener('change',async()=>{select.disabled=true;hint.textContent='Loading skeletal detail…';const ok=await apply(select.value);select.value=mode;select.disabled=false;hint.textContent=ok?(status.replacements+' enhanced bones ready; all other bones stay original.'):(status.error||'Using standard geometry.');});
    const auditButton=document.createElement('button');auditButton.type='button';auditButton.textContent='Export geometry audit';auditButton.addEventListener('click',downloadAudit);
    const profileButton=document.createElement('button');profileButton.type='button';profileButton.textContent='Record 5-second render sample';
    profileButton.addEventListener('click',async()=>{profileButton.disabled=true;hint.textContent='Rotate or zoom the model for 5 seconds…';await profileRender(5000);
      profileButton.disabled=false;hint.textContent='Sample recorded. Choose Export geometry audit to save the results.';});
    const toneLabel=document.createElement('label');toneLabel.htmlFor='aiq-detailed-tone-265d';toneLabel.textContent='Detailed bone color';
    const tonePicker=document.createElement('input');tonePicker.type='color';tonePicker.id='aiq-detailed-tone-265d';tonePicker.value=boneTone;
    tonePicker.title='Choose a bone tone to match the original AnatomIQ skull and rib cage';
    tonePicker.addEventListener('change',()=>setBoneTone(tonePicker.value));
    const toneReset=document.createElement('button');toneReset.type='button';toneReset.textContent='Reset bone color';
    toneReset.addEventListener('click',()=>setBoneTone(DEFAULT_DETAILED_BONE_TONE));
    const toneHint=document.createElement('p');toneHint.className='studio-hint';
    toneHint.textContent='Adjusts the diffuse color of new bones only. Lighting, shadows, original skull/ribs/sternum, saved lessons and bone painting remain unchanged.';
    const surfaceLabel=document.createElement('label');surfaceLabel.htmlFor='aiq-vertebra-surface-265e';surfaceLabel.textContent='Detailed vertebra surface';
    const surfaceSelect=document.createElement('select');surfaceSelect.id='aiq-vertebra-surface-265e';surfaceSelect.className='text-input';
    for(const [value,name] of [['original','Original — unchanged'],['normals','Smooth shading — same geometry'],['gentle','Gentle surface smoothing — same triangles']]){
      const opt=document.createElement('option');opt.value=value;opt.textContent=name;surfaceSelect.add(opt);
    }
    surfaceSelect.value=surfaceMode;
    const surfaceHint=document.createElement('p');surfaceHint.className='studio-hint';
    surfaceHint.textContent='Experimental: only vertebrae change. No extra triangles, draw calls, or per-frame smoothing. Gentle mode shifts vertices at most 0.35% of each bone’s size; verify anatomical landmarks and label anchors.';
    surfaceSelect.addEventListener('change',()=>{setSurfaceMode(surfaceSelect.value);hint.textContent='Vertebra surface updated. Rotate and compare while profiling.';});
    group.append(label,select,hint,surfaceLabel,surfaceSelect,surfaceHint,toneLabel,tonePicker,toneReset,toneHint,auditButton,profileButton);
    if(previous)previous.after(group);else anchor.after(group);
  }
  emit();
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui,{once:true});else ui();
  }
  // A saved local preference may be missing assets offline. Failure always restores originals.
  if(mode==='detailed'){
    mode='standard';apply('detailed').then(()=>{const select=document.getElementById('aiq-skeletal-mode-265');if(select)select.value=mode;});
  }
  return {apply,setBoneTone,setSurfaceMode,status};
}
