// AnatomIQ Studio 2.2.38 — conservative, exact-hit accelerated label occlusion.
// The hierarchy contains ONLY world-space bounds. Final decisions still use
// THREE.Raycaster.intersectObject on original visible meshes (no proxy anatomy).

const EPS = 1e-7;

export function segmentIntersectsBox(ray,box){
  // Clip against the raycaster's exact [near,far] interval. Unlike
  // Ray.intersectBox(), this safely handles a camera inside the box.
  const p=ray.ray.origin,d=ray.ray.direction;
  let lo=ray.near||0,hi=ray.far;
  for(const a of ['x','y','z']){
    const v=d[a];
    if(Math.abs(v)<1e-12){if(p[a]<box.min[a]-EPS||p[a]>box.max[a]+EPS)return false;continue;}
    let t1=(box.min[a]-EPS-p[a])/v,t2=(box.max[a]+EPS-p[a])/v;
    if(t1>t2){const t=t1;t1=t2;t2=t;}
    lo=Math.max(lo,t1);hi=Math.min(hi,t2);
    if(hi<lo)return false;
  }
  return true;
}

function dynamicMesh(mesh){
  return !mesh?.isMesh || !mesh.geometry || mesh.isSkinnedMesh || mesh.isInstancedMesh ||
    !!mesh.morphTargetInfluences?.length ||
    !!mesh.geometry.morphAttributes?.position?.length;
}

function conservativeBounds(THREE,mesh){
  const geo=mesh.geometry;
  // An already computed mesh-local box is preferable; do not force thousands
  // of vertices through a new box computation during a camera gesture.
  if(geo.boundingBox && !geo.boundingBox.isEmpty()){
    return geo.boundingBox.clone().applyMatrix4(mesh.matrixWorld).expandByScalar(EPS);
  }
  if(!geo.boundingSphere)geo.computeBoundingSphere?.();
  const sphere=geo.boundingSphere;
  if(!sphere || sphere.isEmpty())return null;
  const world=sphere.clone().applyMatrix4(mesh.matrixWorld);
  return new THREE.Box3().setFromCenterAndSize(world.center,new THREE.Vector3(2*world.radius,2*world.radius,2*world.radius)).expandByScalar(EPS);
}

function boundsUnion(THREE,entries){
  const box=new THREE.Box3();
  box.makeEmpty();
  for(const e of entries)box.union(e.box);
  return box;
}

function nodeFor(THREE,entries){
  if(!entries.length)return null;
  const box=boundsUnion(THREE,entries);
  if(entries.length<=4)return {box,entries,left:null,right:null};
  const size=box.getSize(new THREE.Vector3());
  const axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
  entries.sort((a,b)=>(a.box.min[axis]+a.box.max[axis])-(b.box.min[axis]+b.box.max[axis]));
  const mid=Math.floor(entries.length/2);
  return {box,entries:null,left:nodeFor(THREE,entries.slice(0,mid)),right:nodeFor(THREE,entries.slice(mid))};
}

export function createOcclusionIndex(THREE){
  let root=null,uncullable=[],cached=[],states=[];
  let exactTests=0,boundsTests=0,builds=0;
  const hits=[];
  function validCache(meshes){
    if(meshes.length!==cached.length)return false;
    for(let i=0;i<meshes.length;i++){
      const m=meshes[i],s=states[i];
      if(m!==cached[i]||m.geometry!==s.geometry||m.geometry?.attributes?.position?.version!==s.positionVersion)return false;
      const world=m.matrixWorld?.elements;
      if(!world||world.length!==16)return false;
      for(let j=0;j<16;j++)if(world[j]!==s.matrix[j])return false;
    }
    return true;
  }
  return {
    update(meshes){
      if(validCache(meshes))return;
      const entries=[];uncullable=[];
      cached=meshes.slice();states=[];
      for(const m of meshes){
        states.push({geometry:m.geometry,positionVersion:m.geometry?.attributes?.position?.version,
          matrix:Array.from(m.matrixWorld?.elements||[])});
        try{
          const box=dynamicMesh(m)?null:conservativeBounds(THREE,m);
          if(box&&[box.min.x,box.min.y,box.min.z,box.max.x,box.max.y,box.max.z].every(Number.isFinite))entries.push({mesh:m,box});
          else uncullable.push(m);
        }catch{uncullable.push(m);} // Never lose a potential occluder.
      }
      root=nodeFor(THREE,entries);builds++;
    },
    isOccluded(raycaster){
      exactTests=0;boundsTests=0;
      function precise(mesh){
        // Mirror Three.js Raycaster's layer filter and original intersection API.
        if(!raycaster.layers.test(mesh.layers))return false;
        exactTests++;
        hits.length=0;
        return raycaster.intersectObject(mesh,false,hits).length>0;
      }
      // Unbounded/deformable structures always retain the original exact test.
      for(const m of uncullable)if(precise(m))return true;
      if(!root)return false;
      const stack=[root];
      while(stack.length){
        const node=stack.pop();boundsTests++;
        if(!segmentIntersectsBox(raycaster,node.box))continue;
        if(node.entries){
          for(const e of node.entries){
            boundsTests++;
            if(segmentIntersectsBox(raycaster,e.box)&&precise(e.mesh))return true;
          }
        }else{
          if(node.left)stack.push(node.left);
          if(node.right)stack.push(node.right);
        }
      }
      return false;
    },
    stats(){return {indexedMeshes:cached.length-uncullable.length,uncullableMeshes:uncullable.length,builds,exactTests,boundsTests};}
  };
}
