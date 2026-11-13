/** Pure, non-mutating similarity registration. x is source, y is target. */
export function transformPoint(matrix,point){
  const [x,y,z]=point;
  return [matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],
          matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],
          matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]];
}
const sub=(a,b)=>a.map((n,i)=>n-b[i]);
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const norm=a=>Math.sqrt(dot(a,a));
function solve(pairs){
  if(pairs.length<3)throw Error('At least three matching landmarks are required.');
  const n=pairs.length, mx=[0,0,0],my=[0,0,0];
  for(const [x,y] of pairs)for(let i=0;i<3;i++){mx[i]+=x[i]/n;my[i]+=y[i]/n;}
  const s=Array.from({length:3},()=>[0,0,0]);let denom=0;
  for(const [x,y] of pairs){const a=sub(x,mx),b=sub(y,my);denom+=dot(a,a);for(let i=0;i<3;i++)for(let j=0;j<3;j++)s[i][j]+=a[i]*b[j];}
  if(denom<=1e-20)throw Error('Reference landmarks are degenerate.');
  const [xx,xy,xz]=s[0],[yx,yy,yz]=s[1],[zx,zy,zz]=s[2];
  const N=[
    [xx+yy+zz,yz-zy,zx-xz,xy-yx],
    [yz-zy,xx-yy-zz,xy+yx,zx+xz],
    [zx-xz,xy+yx,-xx+yy-zz,yz+zy],
    [xy-yx,zx+xz,yz+zy,-xx-yy+zz]
  ];
  const shift=Math.max(1,Math.max(...N.flat().map(Math.abs))*5);
  let q=[1,0,0,0];
  for(let j=0;j<160;j++){
    const next=N.map((row,i)=>dot(row,q)+shift*q[i]);const length=norm(next);
    if(length<1e-20)break;q=next.map(x=>x/length);
  }
  const [w,a,b,c]=q;
  const R=[
    [1-2*(b*b+c*c),2*(a*b-w*c),2*(a*c+w*b)],
    [2*(a*b+w*c),1-2*(a*a+c*c),2*(b*c-w*a)],
    [2*(a*c-w*b),2*(b*c+w*a),1-2*(a*a+b*b)]
  ];
  const rot=x=>R.map(row=>dot(row,x));
  let numerator=0;
  for(const [x,y] of pairs)numerator+=dot(rot(sub(x,mx)),sub(y,my));
  const scale=numerator/denom;
  if(!Number.isFinite(scale)||scale<=0)throw Error('Reference orientation or scale could not be resolved.');
  const t=sub(my,rot(mx).map(k=>scale*k));
  const matrix=[scale*R[0][0],scale*R[1][0],scale*R[2][0],0,
                scale*R[0][1],scale*R[1][1],scale*R[2][1],0,
                scale*R[0][2],scale*R[1][2],scale*R[2][2],0,
                t[0],t[1],t[2],1];
  const errors=pairs.map(([x,y])=>norm(sub(transformPoint(matrix,x),y)));
  const rms=Math.sqrt(errors.reduce((sum,v)=>sum+v*v,0)/errors.length);
  return {matrix,scale,rms,errors,landmarks:pairs.length};
}
export function fitSimilarity(pairs){
  if(!Array.isArray(pairs)||pairs.length<4)throw Error('At least four distinct bone matches are needed.');
  if(pairs.some(p=>p.length!==2||p.some(a=>!Array.isArray(a)||a.length!==3||a.some(v=>!Number.isFinite(v)))))throw Error('Invalid landmark coordinates.');
  // Outlier-resistant consensus: bad duplicate names must not skew the first fit.
  const candidates=[];
  try{candidates.push(solve(pairs));}catch{}
  const n=pairs.length;
  for(let i=0;i<Math.min(n,20);i++)for(const step of [1,2,3,5,7,11]){
    const ids=[0,1,2,3].map(k=>(i+k*step)%n);
    if(new Set(ids).size!==4)continue;
    try{candidates.push(solve(ids.map(j=>pairs[j])));}catch{}
  }
  if(!candidates.length)throw Error('Cannot resolve a non-degenerate reference coordinate frame.');
  const scored=candidates.map(result=>{
    const residuals=pairs.map(([x,y])=>norm(sub(transformPoint(result.matrix,x),y))).sort((a,b)=>a-b);
    return {result,median:residuals[Math.floor(residuals.length/2)]};
  }).sort((a,b)=>a.median-b.median);
  let best=scored[0].result;
  const targetCenter=[0,0,0];
  for(const [,y] of pairs)for(let i=0;i<3;i++)targetCenter[i]+=y[i]/n;
  const span=Math.sqrt(pairs.reduce((acc,[,y])=>acc+dot(sub(y,targetCenter),sub(y,targetCenter)),0)/n);
  for(let attempt=0;attempt<3;attempt++){
    const residuals=pairs.map(([x,y])=>norm(sub(transformPoint(best.matrix,x),y)));
    const sorted=residuals.slice().sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
    const threshold=Math.max(span*.025,median*3,1e-8);
    const inliers=pairs.filter((_,i)=>residuals[i]<=threshold);
    if(inliers.length<4)break;
    const next=solve(inliers);
    if(inliers.length===pairs.length){best=next;break;}
    best=next;
  }
  const residuals=pairs.map(([x,y])=>norm(sub(transformPoint(best.matrix,x),y)));
  const sorted=residuals.slice().sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
  const threshold=Math.max(span*.025,median*3,1e-8);
  const accepted=pairs.filter((_,i)=>residuals[i]<=threshold);
  if(accepted.length<4)throw Error('Insufficient matching bone landmarks after removing outliers.');
  const result=solve(accepted);
  return {...result,used:accepted.length,total:pairs.length};
}
