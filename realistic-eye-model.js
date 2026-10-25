// AnatomIQ Studio 2.2.15: source-backed textured external eyes.
// Source: Alexander Antipov, Realistic Human Eye, CC BY 4.0.
// The four original Écorché cornea/sclera MESH OBJECTS remain the selectable
// lesson/annotation anchors. Only their render geometries/materials change.

const FRONT_FROM_ASSET=[0,0,1]; // Verified against the uploaded GLB's iris UVs.
const GLOBE_DIAMETER_MULTIPLIER=0.98; // Fit original source-native sclera bounds.
const FRONT_POSITION_FRACTION=0.0; // Optional tiny correction along corneal axis.

function role(entry){
  const name=String(entry.name||entry.mesh?.name||'').toLowerCase();
  if(/sclera/.test(name))return 'sclera';
  if(/cornea/.test(name))return 'cornea';
  return '';
}
function side(entry){
  const label=`${entry.side||''} ${entry.name||''}`.toLowerCase();
  if(/\bleft\b/.test(label))return 'left';
  if(/\bright\b/.test(label))return 'right';
  return '';
}
function makePairs(entries){
  if(entries.length!==4)throw new Error(`Expected exactly four source-native eye anchors; found ${entries.length}`);
  const pairs=new Map();
  for(const entry of entries){
    const s=side(entry),r=role(entry);
    if(!s||!r)throw new Error(`Cannot identify eye anchor '${entry.name}' (${entry.side})`);
    if(!pairs.has(s))pairs.set(s,{});
    if(pairs.get(s)[r])throw new Error(`Duplicate ${s} ${r} eye anchor`);
    pairs.get(s)[r]=entry;
  }
  for(const s of ['left','right']){
    if(!pairs.get(s)?.sclera||!pairs.get(s)?.cornea)throw new Error(`Missing ${s} cornea or sclera anchor`);
  }
  return pairs;
}
function convertGeometry(THREE,srcMesh,targetMesh,sourceCenter,targetCenter,rotation,scale){
  // srcMesh's authored model transforms are preserved. The eye's original
  // world-space location (approximately -0.83,+0.95,+0.26) is NOT reused.
  // Instead, transform its globe center into the *existing* AnatomIQ eye.
  const toWorld=new THREE.Matrix4().makeTranslation(targetCenter.x,targetCenter.y,targetCenter.z)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(rotation))
    .multiply(new THREE.Matrix4().makeScale(scale,scale,scale))
    .multiply(new THREE.Matrix4().makeTranslation(-sourceCenter.x,-sourceCenter.y,-sourceCenter.z))
    .multiply(srcMesh.matrixWorld);
  const intoAnchor=targetMesh.matrixWorld.clone().invert().multiply(toWorld);
  const geometry=srcMesh.geometry.clone();
  geometry.applyMatrix4(intoAnchor);
  geometry.computeBoundingSphere();
  return geometry;
}

export async function installRealisticEyeSurfaces(THREE,loadGLB,eyeEntries,materials){
  // Fail-safe: anything unexpected leaves every original eye mesh untouched.
  const pairs=makePairs(eyeEntries);
  const gltf=await loadGLB();
  gltf.scene.updateMatrixWorld(true);
  const meshes=[];gltf.scene.traverse(obj=>{if(obj.isMesh)meshes.push(obj);});
  if(meshes.length!==2)throw new Error(`Eye GLB should contain two meshes; found ${meshes.length}`);
  const textured=meshes.find(m=>m.material?.map);
  const transparent=meshes.find(m=>m!==textured);
  if(!textured || !transparent || !textured.geometry.attributes.uv || !textured.material.map){
    throw new Error('The imported eye is missing its textured globe, clear shell, or UV map.');
  }
  const globeBox=new THREE.Box3().setFromObject(textured);
  const globeCenter=globeBox.getCenter(new THREE.Vector3());
  const sourceDiameter=globeBox.getSize(new THREE.Vector3()).length() / Math.sqrt(3);
  if(!Number.isFinite(sourceDiameter)||sourceDiameter<1e-5)throw new Error('Invalid imported eye dimensions');
  const replacements=[];
  for(const [s,group] of pairs){
    const nativeGlobe=group.sclera.mesh, nativeCornea=group.cornea.mesh;
    nativeGlobe.updateWorldMatrix(true,false);
    nativeCornea.updateWorldMatrix(true,false);
    const nativeBox=new THREE.Box3().setFromObject(nativeGlobe);
    const nativeDiameter=nativeBox.getSize(new THREE.Vector3()).length()/Math.sqrt(3);
    const nativeCenter=nativeBox.getCenter(new THREE.Vector3());
    const corneaCenter=new THREE.Box3().setFromObject(nativeCornea).getCenter(new THREE.Vector3());
    if(!Number.isFinite(nativeDiameter)||nativeDiameter<1e-5)throw new Error(`Invalid native ${s} eye size`);
    let anterior=corneaCenter.clone().sub(nativeCenter);
    // The native cornea should be offset toward the front of the eyeball.
    // If the source offers no reliable offset, preserve the Écorché +Z framing.
    if(anterior.length()<nativeDiameter*0.025)anterior.set(0,0,1);
    else anterior.normalize();
    const rotation=new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(...FRONT_FROM_ASSET),anterior);
    const scale=(nativeDiameter/sourceDiameter)*GLOBE_DIAMETER_MULTIPLIER;
    const targetCenter=nativeCenter.addScaledVector(anterior,nativeDiameter*FRONT_POSITION_FRACTION);
    const coreGeometry=convertGeometry(THREE,textured,nativeGlobe,globeCenter,targetCenter,rotation,scale);
    const shellGeometry=convertGeometry(THREE,transparent,nativeCornea,globeCenter,targetCenter,rotation,scale);
    // A wet tear-film appearance: highlights respond to existing Studio lights.
    // The texture provides tiny vessels and iris detail; highlights are not painted.
    const coreMaterial=new THREE.MeshPhysicalMaterial({
      color:0xffffff,map:textured.material.map,
      normalMap:textured.material.normalMap||null,
      metalness:0,roughness:0.29,clearcoat:0.72,clearcoatRoughness:0.10,
      transparent:false,depthWrite:true,side:THREE.FrontSide
    });
    const shellMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,
      roughness:0.018,clearcoat:1,clearcoatRoughness:0.009,ior:1.38,
      transparent:true,opacity:0.16,depthWrite:false,side:THREE.FrontSide});
    replacements.push({entry:group.sclera,geometry:coreGeometry,material:coreMaterial});
    replacements.push({entry:group.cornea,geometry:shellGeometry,material:shellMaterial});
  }
  // Commit the four updates in-place. Catalog entries, selectable mesh
  // references, metadata, annotation indices and saved visibility all survive.
  for(const {entry,geometry,material} of replacements){
    entry.mesh.geometry=geometry;
    entry.mesh.material=material;
    materials.set(entry.mesh,material);
  }
  return {
    loaded:true,meshes:replacements.length,eyes:2,
    triangles:meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0),
    texture:`${textured.material.map.image?.width||1024}×${textured.material.map.image?.height||1024}`,
    source:'Alexander Antipov · Realistic Human Eye · CC BY 4.0'
  };
}
