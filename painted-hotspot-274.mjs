// ANATOMIQ_PAINTED_HOTSPOT_274
// Surface samples are stored in original-mesh local coordinates. Nothing modifies GLBs.
export const MAX_PAINT_POINTS=96;
export const MAX_PAINT_PER_STRUCTURE=32;
export const MIN_BRUSH_MM=2;
export const MAX_BRUSH_MM=35;
export const WORLD_UNITS_PER_APPROX_MM=0.001006058824;
// ANATOMIQ_PAINT_COORDINATE_FIX_276 — Native skull geometry can use large
// model-local coordinates even though its rendered world size is ~0.2 units.
// This cap is a corruption guard, NOT a world-space anatomical size limit.
export const MAX_PAINT_STRUCTURE_INDEX=100000;
export const MAX_PAINT_COORDINATE=1e9;
export const validStructure=s=>Number.isSafeInteger(s)&&s>=0&&s<MAX_PAINT_STRUCTURE_INDEX;
export const validTriplet=p=>Array.isArray(p)&&p.length===3&&p.every(x=>Number.isFinite(x)&&Math.abs(x)<MAX_PAINT_COORDINATE);
export const validBrush=r=>Number.isFinite(r)&&r>=MIN_BRUSH_MM&&r<=MAX_BRUSH_MM;
export function validPaintSample(s){return !!s&&validStructure(s.s)&&validTriplet(s.p)&&validBrush(s.r)&&(s.n===undefined||validTriplet(s.n));}
export function validPaintRegion(regions){return Array.isArray(regions)&&regions.length<=MAX_PAINT_POINTS&&regions.every(validPaintSample)&&new Set(regions.map(s=>s.s)).size<=12&&regions.every(p=>regions.filter(q=>q.s===p.s).length<=MAX_PAINT_PER_STRUCTURE);}
export function migrateLabelPaint(activity){
  if(activity?.type!=='label')return activity;
  const a={...activity};
  if(!Array.isArray(a.paintRegions)){
    const old=a.hotspot;
    a.paintRegions=old&&validStructure(old.s)&&validTriplet(old.p)?
      [{s:old.s,p:[...old.p],r:validBrush(a.radiusMm)?a.radiusMm:20}]:[];
  }
  if(!validBrush(a.brushMm))a.brushMm=8;
  if(!Number.isFinite(a.rotationDegrees))a.rotationDegrees=0;
  // Old target and radius are no longer required; discard obsolete spherical answer.
  delete a.hotspot;delete a.targetStructure;delete a.radiusMm;
  return a;
}
export function addPaintPoint(regions,s,p,r,n=null,worldSpacing=null){
  // Return an actionable reason without exposing raw model coordinates to users.
  if(!Array.isArray(regions)||!validPaintRegion(regions))
    return {regions,added:false,reason:'invalid',detail:'Existing paint data is malformed; try Clear paint, then repaint.'};
  if(!validStructure(s))
    return {regions,added:false,reason:'invalid',detail:'The selected structure has an invalid anatomy index.'};
  if(!validTriplet(p))
    return {regions,added:false,reason:'invalid',detail:'The selected surface has invalid or non-finite model coordinates.'};
  if(!validBrush(r))
    return {regions,added:false,reason:'invalid',detail:'Set the brush radius between 2 and 35 mm.'};
  if(regions.length>=MAX_PAINT_POINTS||regions.filter(x=>x.s===s).length>=MAX_PAINT_PER_STRUCTURE)
    return {regions,added:false,reason:'limit'};
  const previous=[...regions].reverse().find(x=>x.s===s);
  // Don't flood lessons with points during a slow pointer drag.
  // Mesh-local distances are not millimeters on scaled skull GLBs.
  // Use model-world spacing when supplied by the caller; keep the legacy local
  // fallback for older callers that don't provide it.
  const gap=previous?((Number.isFinite(worldSpacing)&&worldSpacing>=0)?worldSpacing:Math.hypot(...p.map((v,i)=>v-previous.p[i]))):Infinity;
  if(previous&&gap<Math.min(previous.r,r)*WORLD_UNITS_PER_APPROX_MM*0.36)
    return {regions,added:false,reason:'near'};
  return {regions:[...regions,{s,p:[...p].map(n=>Math.round(n*1e6)/1e6),r,...(validTriplet(n)?{n:[...n]}:{})}],added:true,reason:'added'};
}
export function paintedHitAccepted(regions,index,clickedWorld,resolveWorld,units=WORLD_UNITS_PER_APPROX_MM,clickedNormal=null){
  if(!validStructure(index)||!validTriplet(clickedWorld)||!Array.isArray(regions)||typeof resolveWorld!=='function'||!Number.isFinite(units)||units<=0)return false;
  return regions.some(sample=>{
    if(!validPaintSample(sample)||sample.s!==index)return false;
    if(sample.n&&validTriplet(clickedNormal)){
      const d=sample.n.reduce((t,n,i)=>t+n*clickedNormal[i],0);
      if(d<0.25)return false;
    }
    const center=resolveWorld(sample);
    return validTriplet(center)&&Math.hypot(...clickedWorld.map((v,i)=>v-center[i]))<=sample.r*units+1e-9;
  });
}

// A painted overlay on the *original triangular surface*: no spheres, no model copies saved.
// Only teachers see it. A high-contrast red feathered shader mask creates a brush-stroke appearance.
export function createPaintOverlayLayer(THREE,getMesh){
  const overlays=new Map();
  const vertex=`varying vec3 vWorld;varying vec3 vFaceNormal;void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;vFaceNormal=normalize(normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
  const fragment=`precision highp float;varying vec3 vWorld;varying vec3 vFaceNormal;uniform vec3 uPoints[32];uniform vec3 uNormals[32];uniform float uRadius[32];uniform int uCount;void main(){float a=0.0;for(int i=0;i<32;i++){if(i>=uCount)break;float n=length(uNormals[i]);if(n>0.1&&dot(normalize(vFaceNormal),normalize(uNormals[i]))<0.25)continue;float d=distance(vWorld,uPoints[i]);float r=max(0.000001,uRadius[i]);a=max(a,1.0-smoothstep(r*0.78,r,d));}if(a<0.015)discard;gl_FragColor=vec4(1.0,0.055,0.085,0.94*a);}`;
  function remove(index){const overlay=overlays.get(index);if(!overlay)return;overlay.parent?.remove(overlay);overlay.material.dispose();overlays.delete(index);}
  function clear(){for(const index of [...overlays.keys()])remove(index);}
  function show(samples){
    if(!Array.isArray(samples)||!samples.length){clear();return;}
    const groups=new Map();
    for(const sample of samples){if(!validPaintSample(sample))continue;const group=groups.get(sample.s)||[];
      if(group.length<MAX_PAINT_PER_STRUCTURE){group.push(sample);groups.set(sample.s,group);}}
    for(const index of [...overlays.keys()])if(!groups.has(index))remove(index);
    for(const [index,group] of groups){const mesh=getMesh(index);if(!mesh?.geometry)continue;
      let overlay=overlays.get(index);
      if(overlay?.parent!==mesh){remove(index);overlay=null;}
      if(!overlay){
        const points=Array.from({length:MAX_PAINT_PER_STRUCTURE},()=>new THREE.Vector3());
        const normals=Array.from({length:MAX_PAINT_PER_STRUCTURE},()=>new THREE.Vector3());
        const radii=new Float32Array(MAX_PAINT_PER_STRUCTURE);
        const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,
          uniforms:{uPoints:{value:points},uNormals:{value:normals},uRadius:{value:radii},uCount:{value:0}},
          transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,
          polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
        overlay=new THREE.Mesh(mesh.geometry,material);
        overlay.name='Teacher painted hotspot overlay';overlay.frustumCulled=mesh.frustumCulled;
        overlay.renderOrder=(mesh.renderOrder||0)+1;mesh.add(overlay);overlays.set(index,overlay);
      }
      const uniforms=overlay.material.uniforms;
      mesh.updateWorldMatrix(true,false);
      group.forEach((s,i)=>{uniforms.uPoints.value[i].set(...s.p).applyMatrix4(mesh.matrixWorld);uniforms.uNormals.value[i].set(...(s.n||[0,0,0]));uniforms.uRadius.value[i]=s.r*WORLD_UNITS_PER_APPROX_MM;});
      uniforms.uCount.value=group.length;
    }
  }
  return {show,clear,get size(){return overlays.size;}};
}
