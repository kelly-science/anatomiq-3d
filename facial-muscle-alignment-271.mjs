// AnatomIQ 2.2.71 — approved facial muscle positions and rotations.
// Derived from the teacher's 2026-10-30 standalone facial alignment export.
// The JSON companion keeps the full original measurement and provenance record.
// No GLB edits, no structural index changes, and no document/lesson changes.
export const APPROVED_POSE=Object.freeze({"schema":"anatomiq-facial-alignment-workbench/v2","model":"ecorche.glb","sourceModelUrl":"/models/ecorche.glb","worldUnitsPerApproxMm":0.001006058824,"bodyHeightModelUnits":1.7103,"rotationConvention":"Local mesh XYZ Euler degrees; postmultiply original local quaternion; rotate about source mesh geometry bounding-box center (not mesh origin)","translationSpace":"world XYZ; applied after rotation","offsets":{"Left temporalis":[0.5,0,0],"Right temporalis":[-3,0,0],"Left frontalis":[0,0,0],"Right frontalis":[0,0,1],"Left nasalis":[0,0,0],"Right nasalis":[-2,0,0]},"rotationsDeg":{"Left temporalis":[0,-1,-2.5],"Right temporalis":[0,0,1.5],"Left frontalis":[0,0,0],"Right frontalis":[0,2,0],"Left nasalis":[4,-1,0],"Right nasalis":[0,0,0]},"baseWorldPivots":{"Left temporalis":[0.0573,1.6073,0.02305],"Right temporalis":[-0.0573,1.6073,0.02305],"Left frontalis":[0.0292,1.64245,0.08265],"Right frontalis":[-0.0292,1.64245,0.08265],"Left nasalis":[0.0082,1.5862,0.1059],"Right nasalis":[-0.0082,1.5862,0.1059]}});
const TARGET_NAMES=Object.freeze(Object.keys(APPROVED_POSE.offsets));
const MODEL_REFERENCE_MM=1700;
const processed=new WeakSet();
const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
function pointError(a,b){return a.distanceTo(b);}
function asVec(THREE,xyz){return new THREE.Vector3(...xyz);}
function worldToParentDelta(parent,worldDelta,THREE){
  // Use two points so parent translation cancels; supports non-identity transforms.
  parent.updateWorldMatrix(true,false);
  const start=new THREE.Vector3(0,0,0),finish=worldDelta.clone();
  parent.worldToLocal(start);parent.worldToLocal(finish);
  return finish.sub(start);
}
export function applyApprovedFacialAlignment(root,THREE){
  if(!root?.traverse||!THREE?.Vector3||!THREE?.Quaternion||!THREE?.Euler||!THREE?.Box3)
    throw new Error('Facial alignment requires a loaded Three.js scene.');
  if(processed.has(root))return {applied:6,alreadyApplied:true,version:'2.2.71'};
  const candidates=new Map(TARGET_NAMES.map(name=>[name,[]]));
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const layer=String(mesh.userData?.layer||'').toLowerCase();
    if(layer!=='superficial muscles'&&layer!=='deep muscles')return;
    const name=String(mesh.userData?.name||mesh.name||'').trim();
    if(candidates.has(name))candidates.get(name).push(mesh);
  });
  const problems=TARGET_NAMES.filter(name=>candidates.get(name).length!==1);
  if(problems.length)return {applied:0,reason:'Expected one source mesh each: '+problems.map(name=>name+' ('+candidates.get(name).length+')').join(', ')};
  root.updateWorldMatrix(true,true);
  const height=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y;
  if(!finite(height)||height<=0||Math.abs(height-APPROVED_POSE.bodyHeightModelUnits)>APPROVED_POSE.bodyHeightModelUnits*.02)
    return {applied:0,reason:'Source GLB body height is not compatible with the approved facial alignment.',height};
  const entries=[];
  for(const name of TARGET_NAMES){
    const mesh=candidates.get(name)[0];
    if(!mesh.parent||!mesh.geometry?.computeBoundingBox||!mesh.position||!mesh.quaternion)
      return {applied:0,reason:'Source mesh lacks a compatible transform: '+name};
    mesh.geometry.computeBoundingBox();
    if(!mesh.geometry.boundingBox)return {applied:0,reason:'Source mesh bounding box unavailable: '+name};
    const localPivot=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
    const baselinePivot=mesh.localToWorld(localPivot.clone());
    const expected=asVec(THREE,APPROVED_POSE.baseWorldPivots[name]);
    if(pointError(baselinePivot,expected)>.0075)
      return {applied:0,reason:'Source geometry has a different pivot for '+name};
    entries.push({name,mesh,localPivot,baselinePivot,originalPosition:mesh.position.clone(),originalQuaternion:mesh.quaternion.clone()});
  }
  // Preflight complete: apply only when all six source meshes match.
  for(const entry of entries){
    const {name,mesh,localPivot,baselinePivot,originalPosition,originalQuaternion}=entry;
    const radians=APPROVED_POSE.rotationsDeg[name].map(degrees=>degrees*Math.PI/180);
    const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...radians,'XYZ'));
    mesh.position.copy(originalPosition);
    mesh.quaternion.copy(originalQuaternion).multiply(rotation);
    mesh.updateWorldMatrix(true,false);
    const actualPivot=mesh.localToWorld(localPivot.clone());
    const desiredPivot=baselinePivot.clone().add(asVec(THREE,APPROVED_POSE.offsets[name]).multiplyScalar(height/MODEL_REFERENCE_MM));
    mesh.position.add(worldToParentDelta(mesh.parent,desiredPivot.sub(actualPivot),THREE));
    mesh.updateWorldMatrix(true,false);
  }
  processed.add(root);
  return {applied:entries.length,version:'2.2.71',source:'approved standalone workbench export',height};
}

