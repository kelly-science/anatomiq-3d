/* AnatomIQ 2.2.65e — optional offline-style one-time smoothing of detailed vertebrae.
 * Geometry remains indexed, same triangle count, name and structure identifiers.
 * This runs only when a teacher changes the Surface Smoothing preference or
 * first enables Detailed geometry; NEVER in the animation/render loop.
 */
export const SURFACE_MODES = ['original','normals','gentle'];
export function isVertebra(name){return /\b(vertebra|atlas|axis)\b/i.test(String(name||''));}
const normalize=(x,y,z)=>{const m=Math.hypot(x,y,z)||1;return [x/m,y/m,z/m]};
export function refineVertebraGeometry(source,mode='normals'){
  if(mode==='original')return source;
  if(!SURFACE_MODES.includes(mode))throw Error('Unsupported skeletal smoothing mode');
  const position=source?.getAttribute?.('position');
  if(!position||position.itemSize!==3||position.count<3)throw Error('Invalid bone positions');
  const n=position.count,idx=source.index?.array;
  if(!idx||idx.length%3||idx.length<3)throw Error('Indexed bone geometry required');
  const geometry=source.clone();
  const coords=new Float64Array(n*3);
  let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<n;i++){
    const xyz=[position.getX(i),position.getY(i),position.getZ(i)];
    for(let k=0;k<3;k++){
      if(!Number.isFinite(xyz[k]))throw Error('Nonfinite vertex');
      coords[i*3+k]=xyz[k];min[k]=Math.min(min[k],xyz[k]);max[k]=Math.max(max[k],xyz[k]);
    }
  }
  const diag=Math.hypot(...min.map((v,k)=>max[k]-v));
  if(!(diag>0))throw Error('Zero-size bone');
  // Merge only mathematically coincident positions; this smooths across source
  // UV seams without collapsing geometry or changing original triangle indices.
  const tol=Math.max(diag*1e-7,1e-10),groups=new Map(),ids=new Int32Array(n),members=[];
  for(let i=0;i<n;i++){
    const key=[0,1,2].map(k=>Math.round(coords[i*3+k]/tol)).join(',');
    let group=groups.get(key);
    if(group===undefined){group=members.length;groups.set(key,group);members.push([])}
    members[group].push(i);ids[i]=group;
  }
  const count=members.length;
  let points=new Float64Array(count*3);
  for(let g=0;g<count;g++){
    for(const i of members[g])for(let k=0;k<3;k++)points[g*3+k]+=coords[i*3+k];
    for(let k=0;k<3;k++)points[g*3+k]/=members[g].length;
  }
  if(mode==='gentle'){
    const neighbors=Array.from({length:count},()=>new Set());
    const edges=new Map();
    function edge(a,b){if(a===b)return;const key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);neighbors[a].add(b);neighbors[b].add(a)}
    for(let i=0;i<idx.length;i+=3){
      const a=ids[idx[i]],b=ids[idx[i+1]],c=ids[idx[i+2]];
      edge(a,b);edge(b,c);edge(c,a);
    }
    const frozen=new Uint8Array(count);
    // Boundary vertices are pinned to protect open rims/foramina.
    for(const [edgeName,times] of edges){if(times===1){const [a,b]=edgeName.split(':').map(Number);frozen[a]=frozen[b]=1}}
    function pass(src,factor){
      const out=src.slice();
      for(let g=0;g<count;g++){
        const nn=neighbors[g];if(frozen[g]||nn.size<3)continue;
        let x=0,y=0,z=0;for(const j of nn){x+=src[j*3];y+=src[j*3+1];z+=src[j*3+2]}
        out[g*3]+=factor*(x/nn.size-src[g*3]);
        out[g*3+1]+=factor*(y/nn.size-src[g*3+1]);
        out[g*3+2]+=factor*(z/nn.size-src[g*3+2]);
      }
      return out;
    }
    // Single low-strength Taubin pair prevents most shrinkage. Displacement
    // clamped to 0.35% of local bone diagonal (not body diagonal).
    const a=pass(points,.31),b=pass(a,-.32),cap=diag*.0035;
    for(let g=0;g<count;g++){
      const dx=b[g*3]-points[g*3],dy=b[g*3+1]-points[g*3+1],dz=b[g*3+2]-points[g*3+2];
      const dist=Math.hypot(dx,dy,dz),scale=dist>cap?cap/dist:1;
      for(let k=0;k<3;k++)points[g*3+k]+=(b[g*3+k]-points[g*3+k])*scale;
    }
    const target=geometry.getAttribute('position');
    for(let i=0;i<n;i++){const g=ids[i];target.setXYZ(i,points[g*3],points[g*3+1],points[g*3+2])}
    target.needsUpdate=true;
  }
  // Surface area-weighted normals, shared across UV split vertices. Old hard
  // normals receive a 15% contribution to protect sharp anatomical contours.
  const totals=new Float64Array(count*3);
  for(let i=0;i<idx.length;i+=3){
    const a=ids[idx[i]],b=ids[idx[i+1]],c=ids[idx[i+2]];
    const ax=points[a*3],ay=points[a*3+1],az=points[a*3+2];
    const ux=points[b*3]-ax,uy=points[b*3+1]-ay,uz=points[b*3+2]-az;
    const vx=points[c*3]-ax,vy=points[c*3+1]-ay,vz=points[c*3+2]-az;
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    for(const g of [a,b,c]){totals[g*3]+=nx;totals[g*3+1]+=ny;totals[g*3+2]+=nz}
  }
  const attr=geometry.getAttribute('normal');
  if(!attr||attr.count!==n||attr.itemSize!==3)throw Error('Detailed bone lacks per-vertex normals');
  const old=source.getAttribute('normal');
  for(let i=0;i<n;i++){
    const g=ids[i],v=normalize(totals[g*3],totals[g*3+1],totals[g*3+2]);
    const mixed=normalize(.85*v[0]+.15*old.getX(i),.85*v[1]+.15*old.getY(i),.85*v[2]+.15*old.getZ(i));
    attr.setXYZ(i,...mixed);
  }
  attr.needsUpdate=true;
  geometry.computeBoundingBox?.();geometry.computeBoundingSphere?.();
  geometry.userData={...geometry.userData,anatomiqSurfaceSmooth:mode};
  return geometry;
}
