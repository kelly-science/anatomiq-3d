/* AnatomIQ 2.2.65b: opt-in, aligned full-source skeletal geometry + material-safe swap.
   Original bones/IDs/materials/metadata stay in the scene. Any missing or
   unsafe asset falls back to the standard geometry. No changes to anatomy
   catalogue, lesson serialization, camera, overlays or carousel. */
export const SKELETAL_DETAIL_VERSION = '2.2.65'; // Asset manifest stays 2.2.65
export const STORAGE_KEY = 'anatomiq-skeletal-detail-265';
const GLB_PATH = './models/skeletal-detailed-265.glb?rev=265';
const REPORT_PATH = './models/skeletal-detailed-265-report.json?rev=265';
export function normName(name){return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
export function checkDetailCompatibility(structures,report){
  const byName=new Map();
  for(const entry of structures){
    if(entry.system!=='skeletal'||String(entry.tissue||'bone')!=='bone'||!entry.mesh?.geometry)continue;
    const key=normName(entry.name);
    if(byName.has(key))byName.set(key,null);else byName.set(key,entry);
  }
  const entries=[];
  for(const row of report?.rows||[]){
    if(row.status!=='accepted')continue;
    const target=byName.get(normName(row.name));
    if(target && Number.isFinite(row.old_triangles)){
      const triangles=Math.floor((target.mesh.geometry.index?.count??target.mesh.geometry.attributes.position.count)/3);
      if(triangles===row.old_triangles)entries.push({row,target});
    }
  }
  return entries;
}
// The full-resolution source uses different vertex topology and UV islands.
// Reusing the old ecorche texture on the new vertices can sample flat gray
// atlas areas. Only detailed bones receive a map-free, ivory, light-responsive
// material; Standard retains every original texture and material unchanged.
export function makeCompatibleBoneMaterial(source,THREE){
  const convert=original=>{
    if(!original?.clone)return new THREE.MeshStandardMaterial({color:0xece6da,roughness:0.38,metalness:0});
    const material=original.clone();
    for(const key of ['map','normalMap','bumpMap','roughnessMap','metalnessMap','aoMap','lightMap','emissiveMap','alphaMap','displacementMap','specularMap','specularIntensityMap','specularColorMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap']){
      if(key in material)material[key]=null;
    }
    if('vertexColors' in material)material.vertexColors=false;
    if(material.color?.set)material.color.set(0xece6da);
    if('metalness' in material)material.metalness=0;
    if('roughness' in material)material.roughness=0.38;
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

export function installSkeletalGeometryUpgrade(structures,THREE,{invalidate=()=>{},storage=window.localStorage,loaderFactory,teacherMode=true,pilot=null,boneAppearanceController=null,materials=null,refreshAppearance=()=>{}}={}){
  const key=STORAGE_KEY;
  let mode='standard',originals=new Map(), replacements=null, pending=null, busy=false;
  const detailedMaterials=new Map();
  try {if(storage.getItem(key)==='detailed')mode='detailed';}catch{}
  const status={version:SKELETAL_DETAIL_VERSION,mode:'standard',available:false,replacements:0,matched:0,error:null};
  function emit(){status.mode=mode;window.__AnatomIQSkeletalDetail={...status,apply,reset:()=>apply('standard')};}
  async function prepare(){
    if(replacements)return replacements;
    if(pending)return pending;
    pending=(async()=>{
      const head=await fetch(REPORT_PATH,{cache:'no-cache'});
      if(!head.ok || /text\/html/i.test(head.headers.get('content-type')||''))throw Error('Detailed skeleton report not deployed');
      const report=await head.json();
      if(report.version!==SKELETAL_DETAIL_VERSION||!report.accepted)throw Error('Detailed skeleton report is missing or incompatible');
      const compatible=checkDetailCompatibility(structures,report);
      if(!compatible.length)throw Error('No skeletal parts matched detailed manifest');
      const loader=loaderFactory ? loaderFactory() : new (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader();
      const loaded=await new Promise((resolve,reject)=>loader.load(GLB_PATH,resolve,undefined,reject));
      const fromGLB=new Map();
      loaded.scene.traverse(object=>{if(object.isMesh){const n=normName(object.userData?.name||object.name);if(fromGLB.has(n))fromGLB.set(n,null);else fromGLB.set(n,object.geometry);}});
      const accepted=[];
      for(const {row,target} of compatible){
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
          if(!detailedMaterials.has(mesh))detailedMaterials.set(mesh,makeCompatibleBoneMaterial(original.material,THREE));
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
    const hint=document.createElement('p');hint.className='studio-hint';hint.textContent='Detailed uses registered bones with texture-safe ivory shading. Unmatched bones stay standard. Original textures return in Standard mode.';
    select.addEventListener('change',async()=>{select.disabled=true;hint.textContent='Loading skeletal detail…';const ok=await apply(select.value);select.value=mode;select.disabled=false;hint.textContent=ok?(status.replacements+' enhanced bones ready; all other bones stay original.'):(status.error||'Using standard geometry.');});
    group.append(label,select,hint);
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
