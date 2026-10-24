/** Geometry-independent helpers for AnatomIQ Smart Label Focus.
 * Camera direction always points FROM the anatomy TOWARD the camera.
 * No global state, meshes, or networking; safe to test in Node.
 */
function normalize(v) {
  const len=Math.hypot(v[0],v[1],v[2]);
  return len>1e-7?v.map(n=>n/len):null;
}
export function smartLabelFacing(anchor,bodyCenter,surfaceNormal=null) {
  const radial=normalize([anchor[0]-bodyCenter[0],0,anchor[2]-bodyCenter[2]]);
  let normal=Array.isArray(surfaceNormal)&&surfaceNormal.length===3 ? normalize(surfaceNormal) : null;
  if(normal) {
    // Source meshes may have inverted triangle winding. Prefer the normal
    // pointing outward from the anatomical center when it is unambiguous.
    if(radial && (normal[0]*radial[0]+normal[2]*radial[2]) < -0.18)
      normal=normal.map(n=>-n);
    const candidate=normalize([
      normal[0]*0.85+(radial?.[0]||0)*0.15,
      Math.max(-0.65,Math.min(0.65,normal[1]*0.5)),
      normal[2]*0.85+(radial?.[2]||0)*0.15
    ]);
    if(candidate)return candidate;
  }
  return radial || [0,0,1];
}
export function smartOrbitDirections(primary) {
  const radials=[0,Math.PI/9,-Math.PI/9,Math.PI/4,-Math.PI/4];
  return radials.map((angle,i)=>{
    const c=Math.cos(angle),s=Math.sin(angle);
    return normalize([
      primary[0]*c+primary[2]*s,
      primary[1]+(i===3?0.14:i===4?-0.14:0),
      primary[2]*c-primary[0]*s
    ]);
  });
}
