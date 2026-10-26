/** AnatomIQ 2.2.44 — append-only, registered BodyParts3D triquetra.
 * Model vertices are pre-transformed into the same scene/world frame as Écorché.
 * No runtime registration, remote downloads, or existing model replacements.
 */
export const TRIQUETRUM_EXTENSION_MARKER='ANATOMIQ_TRIQUETRUM_EXTENSION_244';
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
export function createTriquetrumEntries(THREE,scene,data,finish,mode,boneController,materials){
  const parts=validateTriquetrumData(data).parts;
  const results=[];
  for(const p of parts){
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(p.positions,3));
    geom.setIndex(p.indices);geom.computeVertexNormals();geom.computeBoundingBox();geom.computeBoundingSphere();
    const name=p.side==='left'?'Left triquetrum':'Right triquetrum';
    const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:0xf3f1eb,roughness:0.38,metalness:0,side:THREE.DoubleSide}));
    mesh.name=p.side==='left'?'Left_triquetrum':'Right_triquetrum';
    mesh.userData={name,side:p.side,tissue:'bone',layer:'skeleton',source:'BodyParts3D 4.3',sourceId:p.sourceId};
    mesh.castShadow=true;mesh.receiveShadow=true;
    // Preserve original PBR finish and use the approved Natural Bone microrelief shader.
    finish(mesh.material,'skeletal',mode);
    const classic=mesh.material;
    boneController?.register(mesh,classic);
    materials.set(mesh,mesh.material);
    scene.add(mesh);
    results.push({mesh,name,side:p.side,tissue:'bone',system:'skeletal',layer:'triquetrum-extension',sourceName:p.sourceId,skull:false});
  }
  return results;
}
