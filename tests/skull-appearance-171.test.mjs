import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDetailedBoneMaterial,installSkullGeometry} from '../skull-geometry.js';

class Material {
  constructor(options) {Object.assign(this,options); this.map=null;this.normalMap=null;this.vertexColors=false;}
  dispose(){this.disposed=true;}
}
class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  length(){return Math.hypot(this.x,this.y,this.z);}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
}
class Box3 {
  setFromObject(o){this.s=o.boundsSize??1;this.x=o.boundsX??0;return this;}
  getSize(v){v.x=this.s;v.y=v.z=0;return v;}
  getCenter(v){v.x=this.x;v.y=v.z=0;return v;}
}
class Matrix4 {
  copy(){return this;}
  invert(){return this;}
  multiply(){return this;}
  determinant(){return -1;}
}
const THREE={DoubleSide:'double',MeshStandardMaterial:Material,Vector3,Box3,Matrix4};
const originalGeometry={index:{count:300},attributes:{position:{count:300}}};
function detailedGeometry(){
  return {index:{count:900,getX:i=>i,setX(){},needsUpdate:false},attributes:{position:{count:900}},clone(){return detailedGeometry()},applyMatrix4(){},computeVertexNormals(){},computeBoundingBox(){},computeBoundingSphere(){},dispose(){}};
}

test('high-resolution skull materials have no inherited textures or vertex color requirements',()=>{
  const mat=createDetailedBoneMaterial(THREE);
  assert.equal(mat.side,'double');
  assert.equal(mat.vertexColors,false);
  assert.equal(mat.map,null);
  assert.equal(mat.roughness,0.88);
  assert.equal(mat.color,0xc6c5bf);
});
test('upgraded bone uses clean material while keeping its mesh identity and paint baseline in sync',()=>{
  const names=['Frontal bone','Occipital bone','Mandible','Ethmoid','Sphenoid bone','Vomer','Left parietal bone','Right parietal bone','Left temporal bone','Right temporal bone','Left nasal bone','Right nasal bone','Left zygomatic bone','Right zygomatic bone','Left maxilla','Right maxilla'];
  const bones=names.map(name=>{
    const material={map:'texture',vertexColors:true};
    const mesh={name,isMesh:true,material,userData:{},geometry:originalGeometry,matrixWorld:{},updateWorldMatrix(){},boundsSize:1};
    return {mesh,name,side:name.startsWith('Left ')?'left':name.startsWith('Right ')?'right':'midline',tissue:'bone',system:'skeletal',skull:true};
  });
  const details=names.map((name,i)=>({name:`FJ${6000+i}`,isMesh:true,geometry:detailedGeometry(),matrixWorld:{},updateWorldMatrix(){},boundsSize:1}));
  const root={traverse:fn=>details.forEach(fn),updateWorldMatrix(){}};
  const metadata={version:1,structures:names.map((name,i)=>({id:`FJ${6000+i}`,name,target:name,triangles:300}))};
  const sourceMaterial=bones[0].mesh.material;
  const paintBaseline=new Map();
  const stats=installSkullGeometry(THREE,root,metadata,bones,(s,material)=>paintBaseline.set(s.mesh,material));
  assert.equal(stats.upgraded,13);
  assert.equal(stats.skipped.filter(x=>x.includes('dental alignment')).length,3);
  assert.equal(bones[0].mesh.userData.originalSkullMaterial,sourceMaterial);
  assert.notEqual(bones[0].mesh.material,sourceMaterial);
  assert.equal(paintBaseline.get(bones[0].mesh),bones[0].mesh.material);
  assert.equal(bones[0].mesh.userData.originalSkullGeometry,originalGeometry);
  assert.equal(bones[0].mesh.userData.detailedSkull,true);
});
test('version and cache advance together for Chromebook PWA update',()=>{
  const root=new URL('../',import.meta.url);
  const app=readFileSync(new URL('app.js',root),'utf8');
  const sw=readFileSync(new URL('sw.js',root),'utf8');
  const version=JSON.parse(readFileSync(new URL('version.json',root),'utf8'));
  assert.match(app,/const APP_VERSION = '1\.8\.5'/);
  assert.match(sw,/anatomy-v1\.8\.5/);
  assert.equal(version.version,'1.8.5');
  assert.match(app,/materials\.set\(structure\.mesh,newMaterial\)/);
});
