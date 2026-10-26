/** AnatomIQ 2.2.45 — left/right triquetra with nearby native-carpal PBR parity.
 * Positions were pre-registered against the three matching carpal pairs.
 * Only color + surface topology changes in this update; no alignment changes.
 */
export const TRIQUETRUM_EXTENSION_MARKER='ANATOMIQ_TRIQUETRUM_EXTENSION_245';
export const TRIQUETRUM_SIDES=['left','right'];
export function validateTriquetrumData(data){
  if(data?.schema!=='anatomiq-triquetrum-extension-1'||data.parts?.length!==2)throw Error('Triquetrum catalog is missing or invalid');
  for(let i=0;i<2;i++){
    const p=data.parts[i],side=TRIQUETRUM_SIDES[i],id=side==='left'?'FJ3285':'FJ3390';
    if(p.side!==side||p.sourceId!==id||!Array.isArray(p.positions)||!Array.isArray(p.indices)||p.positions.length<12||p.positions.length%3||p.indices.length<12||p.indices.length%3)throw Error(`Invalid ${side} triquetrum mesh`);
    if(p.positions.some(v=>!Number.isFinite(v))||p.indices.some(v=>!Number.isInteger(v)||v<0||v>=p.positions.length/3))throw Error(`Corrupted ${side} triquetrum geometry`);
    if(new Set(p.indices).size<4)throw Error('Degenerate triquetrum model');
  }
  return data;
}
/** Select a source-native Écorché wrist bone, not the imported BP3D references. */
export function findNativeWristReference(scene,side){
  const prefix=side.toLowerCase(),boneNames=['lunate','pisiform','hamate'];
  let match=null;
  scene?.traverse?.(mesh=>{
    if(match||!mesh?.isMesh||mesh.userData?.layer!=='skeleton'||mesh.userData?.sourceId)return;
    const name=String(mesh.userData?.name||mesh.name||'').toLowerCase().replace(/[_\s]+/g,' ');
    if(name.startsWith(prefix+' ')&&boneNames.some(b=>new RegExp('\\b'+b+'\\b').test(name)))match=mesh;
  });
  return match;
}
/**
 * Sample the source material and native vertex-color mean (if used by the GLB).
 * New BP3D bones have no Écorché per-vertex color attribute; bake a conservative
 * mean rather than setting vertexColors=true with no color buffer.
 */
export function carpalAppearance(THREE,mesh){
  const mats=Array.isArray(mesh?.material)?mesh.material:[mesh?.material];
  const material=mats.find(m=>m?.color?.isColor);
  if(!material)return null;
  const tint=material.color.clone();
  const attr=mesh.geometry?.getAttribute?.('color')||mesh.geometry?.attributes?.color;
  if(material.vertexColors&&attr?.count){
    const step=Math.max(1,Math.floor(attr.count/512));
    let r=0,g=0,b=0,count=0;
    for(let i=0;i<attr.count;i+=step){
      r+=attr.getX(i);g+=attr.getY(i);b+=attr.getZ(i);count++;
    }
    if(count){tint.r*=r/count;tint.g*=g/count;tint.b*=b/count;}
  }
  // Bone controller applies the approved microrelief and satin roughness once.
  return {color:tint,roughness:Math.min(1,(Number.isFinite(material.roughness)?material.roughness:0.32)+0.06),metalness:0};
}
export function createTriquetrumEntries(THREE,scene,data,finish,mode,boneController,materials){
  const parts=validateTriquetrumData(data).parts;
  const results=[];
  for(const p of parts){
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(p.positions,3));
    geom.setIndex(p.indices);
    geom.computeVertexNormals();geom.computeBoundingBox();geom.computeBoundingSphere();
    const name=p.side==='left'?'Left triquetrum':'Right triquetrum';
    const native=findNativeWristReference(scene,p.side);
    const reference=native?carpalAppearance(THREE,native):null;
    if(!reference)console.warn(`AnatomIQ: ${p.side} native carpal color reference unavailable; fallback material used.`);
    const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({
      color:reference?.color??0xb9b8b4,
      roughness:reference?.roughness??0.38,metalness:0,side:THREE.DoubleSide
    }));
    mesh.name=p.side==='left'?'Left_triquetrum':'Right_triquetrum';
    mesh.userData={name,side:p.side,tissue:'bone',layer:'skeleton',source:'BodyParts3D 4.3',sourceId:p.sourceId};
    mesh.castShadow=true;mesh.receiveShadow=true;
    finish(mesh.material,'skeletal',mode);
    const classic=mesh.material;
    boneController?.register(mesh,classic);
    materials.set(mesh,mesh.material);
    scene.add(mesh);
    results.push({mesh,name,side:p.side,tissue:'bone',system:'skeletal',layer:'triquetrum-extension',sourceName:p.sourceId,skull:false});
  }
  return results;
}
