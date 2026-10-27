/* AnatomIQ 2.2.65c: selective detailed geometry, matched bone tones, on-demand performance audit.
   Original bones/IDs/materials/metadata stay in the scene. Any missing or
   unsafe asset falls back to the standard geometry. No changes to anatomy
   catalogue, lesson serialization, camera, overlays or carousel. */
export const SKELETAL_DETAIL_VERSION = '2.2.65c';
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
// Calculate a flat, light-responsive bone tint from the ORIGINAL mesh's UV samples.
// This avoids reusing incompatible UVs while retaining the old skeleton's actual
// bone tone, rather than arbitrarily tinting every replacement one ivory color.
const imageCache=new WeakMap();
function median(a){const s=a.slice().sort((a,b)=>a-b);return s[Math.floor(s.length/2)];}
export function estimateOriginalBoneTint(source,geometry,THREE){
  const mat=(Array.isArray(source)?source.find(m=>m?.map)||source[0]:source);
  const fallback=new THREE.Color(0xe7e2d8);
  if(!mat?.map?.image||!geometry?.attributes?.uv||typeof document==='undefined')return fallback;
  const tex=mat.map, img=tex.image, uv=geometry.attributes.uv;
  try{
    let cache=imageCache.get(tex);
    if(!cache){
      const canvas=document.createElement('canvas');
      const w=Math.max(1,Math.min(512,img.width||img.videoWidth||0));
      const h=Math.max(1,Math.min(512,img.height||img.videoHeight||0));
      if(!w||!h)throw Error('Bone texture not ready');
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0,w,h);
      cache={width:w,height:h,pixels:ctx.getImageData(0,0,w,h).data};
      imageCache.set(tex,cache);
    }
    const channels=[[],[],[]];
    // Sample deterministically from the bone's own original UV islands.
    // Color sampling is one-time at geometry activation, never per frame.
    const amount=Math.min(160,uv.count),stride=Math.max(1,Math.floor(uv.count/amount));
    const v=new THREE.Vector2();
    for(let i=0;i<uv.count;i+=stride){
      v.set(uv.getX(i),uv.getY(i));
      tex.transformUv?.(v);
      if(!Number.isFinite(v.x)||!Number.isFinite(v.y))continue;
      const x=Math.max(0,Math.min(cache.width-1,Math.floor(v.x*cache.width)));
      const y=Math.max(0,Math.min(cache.height-1,Math.floor((tex.flipY?1-v.y:v.y)*cache.height)));
      const k=(y*cache.width+x)*4, p=cache.pixels;
      if(p[k+3]<200||Math.max(p[k],p[k+1],p[k+2])<65)continue;
      for(let c=0;c<3;c++)channels[c].push(p[k+c]);
      if(channels[0].length>=160)break;
    }
    if(channels[0].length<8)return fallback;
    const tint=new THREE.Color().setRGB(median(channels[0])/255,median(channels[1])/255,median(channels[2])/255,THREE.SRGBColorSpace);
    if(mat.color?.isColor)tint.multiply(mat.color);
    return tint;
  }catch{return fallback;}
}
export function makeCompatibleBoneMaterial(source,THREE,tint=null){
  const convert=original=>{
    const material=original?.clone?original.clone():new THREE.MeshStandardMaterial();
    for(const key of ['map','normalMap','bumpMap','roughnessMap','metalnessMap','aoMap','lightMap','emissiveMap','alphaMap','displacementMap','specularMap','specularIntensityMap','specularColorMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap']){
      if(key in material)material[key]=null;
    }
    if('vertexColors' in material)material.vertexColors=false;
    if(material.color?.copy)material.color.copy(tint||new THREE.Color(0xe7e2d8));
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
  const detailedMaterials=new Map();
  let reportMetadata=null,lastProfile=null;
  try {if(storage.getItem(key)==='detailed')mode='detailed';}catch{}
  const status={version:SKELETAL_DETAIL_VERSION,mode:'standard',available:false,replacements:0,matched:0,error:null};
  function emit(){status.mode=mode;window.__AnatomIQSkeletalDetail={...status,apply,reset:()=>apply('standard'),audit,profileRender,downloadAudit};}
  async function prepare(){
    if(replacements)return replacements;
    if(pending)return pending;
    pending=(async()=>{
      const head=await fetch(REPORT_PATH,{cache:'no-cache'});
      if(!head.ok || /text\/html/i.test(head.headers.get('content-type')||''))throw Error('Detailed skeleton report not deployed');
      const report=await head.json();
      reportMetadata={accepted:report.accepted,excluded:report.excluded_replacements||[],originalGlbBytes:report.original_glb_bytes||null,prunedGlbBytes:report.pruned_glb_bytes||null};
      if(report.version!==SKELETAL_DETAIL_VERSION||!report.accepted)throw Error('Detailed skeleton report is missing or incompatible');
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
            const tint=estimateOriginalBoneTint(original.material,original.geometry,THREE);
            detailedMaterials.set(mesh,makeCompatibleBoneMaterial(original.material,THREE,tint));
          }
          mesh.geometry=geometry;
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
    return {version:'2.2.65c',timestamp:new Date().toISOString(),mode,enhancedBones:parts.length,
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
    const hint=document.createElement('p');hint.className='studio-hint';hint.textContent='Detailed upgrades verified vertebrae, pelvis and other bones; original skull, ribs and sternum stay in place. Color is sampled from the original bone textures.';
    select.addEventListener('change',async()=>{select.disabled=true;hint.textContent='Loading skeletal detail…';const ok=await apply(select.value);select.value=mode;select.disabled=false;hint.textContent=ok?(status.replacements+' enhanced bones ready; all other bones stay original.'):(status.error||'Using standard geometry.');});
    const auditButton=document.createElement('button');auditButton.type='button';auditButton.textContent='Export geometry audit';auditButton.addEventListener('click',downloadAudit);
    const profileButton=document.createElement('button');profileButton.type='button';profileButton.textContent='Record 5-second render sample';
    profileButton.addEventListener('click',async()=>{profileButton.disabled=true;hint.textContent='Rotate or zoom the model for 5 seconds…';await profileRender(5000);
      profileButton.disabled=false;hint.textContent='Sample recorded. Choose Export geometry audit to save the results.';});
    group.append(label,select,hint,auditButton,profileButton);
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
  return {apply,status};
}
