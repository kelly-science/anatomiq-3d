import {matchedSkullGeometry,adequateSkullReplacement} from './skeletal-detail.js';

/** Install detailed triangles directly into the *existing* skeleton meshes.
 * This leaves scene index, raycasts, paint maps and label local anchor space intact.
 * No additional structure objects are inserted into the scene catalogue.
 */
export function installSkullGeometry(THREE,skullScene,manifest,structures){
  const result=matchedSkullGeometry(skullScene,manifest,structures);
  const stats={total:manifest.structures.length,matched:result.matched.length,upgraded:0,
               skipped:[],unmatched:result.unmatched};
  skullScene.updateWorldMatrix(true,true);
  for(const item of result.matched){
    const original=item.original.mesh,detail=item.detail;
    try{
      const originalFaces=original.geometry.index ? original.geometry.index.count/3 : original.geometry.attributes.position.count/3;
      const detailedFaces=detail.geometry.index ? detail.geometry.index.count/3 : detail.geometry.attributes.position.count/3;
      if(!adequateSkullReplacement(originalFaces,detailedFaces)){
        stats.skipped.push(`${item.metadata.target}: source isn't more detailed`);continue;
      }
      original.updateWorldMatrix(true,false);detail.updateWorldMatrix(true,false);
      const before=new THREE.Box3().setFromObject(original),after=new THREE.Box3().setFromObject(detail);
      const sizeOld=before.getSize(new THREE.Vector3()).length(),sizeNew=after.getSize(new THREE.Vector3()).length();
      const distance=before.getCenter(new THREE.Vector3()).distanceTo(after.getCenter(new THREE.Vector3()));
      if(!Number.isFinite(distance)||!Number.isFinite(sizeNew)||sizeNew<0.4*sizeOld||sizeNew>2.5*sizeOld||distance>Math.max(0.055,0.65*sizeOld)){
        stats.skipped.push(`${item.metadata.target}: alignment could not be verified`);continue;
      }
      const matrix=new THREE.Matrix4().copy(original.matrixWorld).invert().multiply(detail.matrixWorld);
      let geometry=detail.geometry.clone();
      geometry.applyMatrix4(matrix);
      // Correct winding when reflected through the BodyParts3D A/P axis.
      if(matrix.determinant()<0){
        if(geometry.index){
          const idx=geometry.index;
          for(let i=0;i+2<idx.count;i+=3){const a=idx.getX(i+1);idx.setX(i+1,idx.getX(i+2));idx.setX(i+2,a);}
          idx.needsUpdate=true;
        }else{
          for(const attr of Object.values(geometry.attributes)){
            for(let i=0;i+2<attr.count;i+=3){
              for(let j=0;j<attr.itemSize;j++){
                const v=attr.getComponent(i+1,j);
                attr.setComponent(i+1,j,attr.getComponent(i+2,j));
                attr.setComponent(i+2,j,v);
              }
            }
            attr.needsUpdate=true;
          }
        }
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      // The old geometry remains available for this browser session, and is not
      // disposed here because existing in-flight operations may still reference it.
      original.userData.originalSkullGeometry=original.geometry;
      original.geometry=geometry;
      stats.upgraded++;
    }catch(error){stats.skipped.push(`${item.metadata.target}: ${error.message}`);}
  }
  return stats;
}
