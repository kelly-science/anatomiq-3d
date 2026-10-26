/**
 * AnatomIQ wrist review — optimal proper (non-mirrored) similarity registration.
 * Independent of Three.js for repeatable offline tests.
 * World = scale * Rotation(source) + translation.
 * All source reference points MUST share the same BP3D coordinate system.
 */
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.sqrt(dot(a,a));
const avg=(points)=>points[0].map((_,i)=>points.reduce((n,p)=>n+p[i],0)/points.length);

function largestSymmetricEigenvector4(matrix){
  const a=matrix.map(row=>row.slice());
  const vectors=Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>+(i===j)));
  for(let iteration=0;iteration<96;iteration++){
    let p=0,q=1,big=0;
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      if(Math.abs(a[i][j])>big){big=Math.abs(a[i][j]);p=i;q=j;}
    }
    if(big<1e-13)break;
    const angle=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]);
    const c=Math.cos(angle),s=Math.sin(angle);
    const pp=a[p][p],qq=a[q][q],pq=a[p][q];
    a[p][p]=c*c*pp-2*s*c*pq+s*s*qq;
    a[q][q]=s*s*pp+2*s*c*pq+c*c*qq;
    a[p][q]=a[q][p]=0;
    for(let k=0;k<4;k++){
      if(k!==p&&k!==q){const kp=a[k][p],kq=a[k][q];a[k][p]=a[p][k]=c*kp-s*kq;a[k][q]=a[q][k]=s*kp+c*kq;}
      const vp=vectors[k][p],vq=vectors[k][q];vectors[k][p]=c*vp-s*vq;vectors[k][q]=s*vp+c*vq;
    }
  }
  let winner=0;for(let i=1;i<4;i++)if(a[i][i]>a[winner][winner])winner=i;
  const v=vectors.map(row=>row[winner]);const length=norm(v);
  return v.map(x=>x/length);
}
function rotate(v,q){
  const [w,x,y,z]=q;
  const t=[2*(y*v[2]-z*v[1]),2*(z*v[0]-x*v[2]),2*(x*v[1]-y*v[0])];
  return [v[0]+w*t[0]+(y*t[2]-z*t[1]),v[1]+w*t[1]+(z*t[0]-x*t[2]),v[2]+w*t[2]+(x*t[1]-y*t[0])];
}
function assertPoints(src,target){
  if(!Array.isArray(src)||!Array.isArray(target)||src.length!==target.length||src.length<3)throw Error('At least three paired references are required');
  for(const p of [...src,...target])if(!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v)))throw Error('Reference coordinates are incomplete');
  for(const points of [src,target]){
    let longest=0,maxArea=0;
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      longest=Math.max(longest,norm(sub(points[i],points[j])));
      for(let k=j+1;k<points.length;k++)maxArea=Math.max(maxArea,norm(cross(sub(points[j],points[i]),sub(points[k],points[i]))));
    }
    if(longest<=1e-12||maxArea/(longest*longest)<1e-5)throw Error('Lunate, pisiform and hamate reference centers are nearly collinear; cannot solve orientation reliably');
  }
}
/** Proper nonreflective least-squares similarity transform of paired centers/points. */
export function fitSimilarity(source,target,{allowScale=true}={}){
  assertPoints(source,target);
  const sc=avg(source),tc=avg(target),p=source.map(v=>sub(v,sc)),q=target.map(v=>sub(v,tc));
  let xx=0,xy=0,xz=0,yx=0,yy=0,yz=0,zx=0,zy=0,zz=0;
  for(let i=0;i<p.length;i++){
    const a=p[i],b=q[i];xx+=a[0]*b[0];xy+=a[0]*b[1];xz+=a[0]*b[2];yx+=a[1]*b[0];yy+=a[1]*b[1];yz+=a[1]*b[2];zx+=a[2]*b[0];zy+=a[2]*b[1];zz+=a[2]*b[2];
  }
  const n=[
    [xx+yy+zz, yz-zy,zx-xz,xy-yx],
    [yz-zy,xx-yy-zz,xy+yx,zx+xz],
    [zx-xz,xy+yx,-xx+yy-zz,yz+zy],
    [xy-yx,zx+xz,yz+zy,-xx-yy+zz]
  ];
  const quaternion=largestSymmetricEigenvector4(n);
  let numerator=0,denominator=0;
  for(let i=0;i<p.length;i++){numerator+=dot(q[i],rotate(p[i],quaternion));denominator+=dot(p[i],p[i]);}
  const scale=allowScale?numerator/denominator:1;
  if(!Number.isFinite(scale)||scale<=0)throw Error('Reference pairs imply an invalid or mirrored scale');
  const rotatedCenter=rotate(sc,quaternion).map(v=>v*scale);
  const translation=sub(tc,rotatedCenter);
  const transform={quaternion,scale,translation};
  const distances=source.map((point,i)=>norm(sub(transformPoint(point,transform),target[i])));
  const rms=Math.sqrt(distances.reduce((n,x)=>n+x*x,0)/distances.length);
  return {...transform,errors:distances,rms};
}
export function transformPoint(p,t){return add(rotate(p,t.quaternion).map(v=>v*t.scale),t.translation);}
export function distance(a,b){return norm(sub(a,b));}
export function estimateSurfaceDistance(sourceSample,targetSample,transform){
  if(!sourceSample.length||!targetSample.length)return null;
  const distances=[];
  for(const pt of sourceSample){const mapped=transformPoint(pt,transform);let best=Infinity;
    for(const t of targetSample){const d2=(mapped[0]-t[0])**2+(mapped[1]-t[1])**2+(mapped[2]-t[2])**2;if(d2<best)best=d2;}
    distances.push(Math.sqrt(best));
  }
  distances.sort((a,b)=>a-b);
  return {median:distances[Math.floor(distances.length/2)],p90:distances[Math.floor(distances.length*.9)],mean:distances.reduce((a,b)=>a+b,0)/distances.length,samples:distances.length};
}
