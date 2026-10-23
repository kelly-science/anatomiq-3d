/** Anatomy Studio 1.7: optional high-detail skull geometry.
 * Replaces the geometry of existing Écorché mesh objects, never their identity,
 * material, index, transform, or label anchors.
 */
const ID=/^FJ\d+[A-Z]?$/;
const normalize = value=>String(value||'').toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
export function skullKey(name,side=''){
  let n=normalize(name);
  // Some libraries store laterality in the name, while Écorché stores it in userData.side.
  let suffix='';
  if(n.startsWith('left ')){suffix='left';n=n.slice(5);}
  else if(n.startsWith('right ')){suffix='right';n=n.slice(6);}
  if(!suffix&&['left','right'].includes(normalize(side)))suffix=normalize(side);
  // The FMA catalogue alternates e.g. "ethmoid" and "ethmoid bone".
  n=n.replace(/\s+bone$/,'').trim();
  return `${suffix}|${n}`;
}
export function validateSkullManifest(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.structures)||raw.structures.length<12||raw.structures.length>70)
    throw new Error('Invalid high-resolution skull metadata.');
  const ids=new Set(),targets=new Set();
  for(const s of raw.structures){
    if(!ID.test(s.id)||typeof s.name!=='string'||typeof s.target!=='string'||!s.target.trim()||!Number.isInteger(s.triangles)||s.triangles<5)
      throw new Error('Invalid skull structure metadata.');
    if(ids.has(s.id)||targets.has(skullKey(s.target)))throw new Error('Duplicate skull structure identifier or target.');
    ids.add(s.id);targets.add(skullKey(s.target));
  }
  return raw;
}
export function matchedSkullGeometry(root,manifest,existing){
  const metadata=validateSkullManifest(manifest),byId=new Map();
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    const id=/(?:^|[^\w])(FJ\d+[A-Z]?)(?:$|[^\w])/.exec(obj.name||'')?.[1];
    if(!id||byId.has(id))throw new Error('Unexpected or duplicate skull mesh: '+obj.name);
    byId.set(id,obj);
  });
  if(byId.size!==metadata.structures.length)throw new Error('Skull geometry/metadata count mismatch.');
  const old=new Map();
  for(const s of existing){
    if(s.system!=='skeletal'||s.tissue!=='bone'||!s.skull)continue;
    const key=skullKey(s.name,s.side);
    if(old.has(key))old.set(key,null); // Ambiguous bone: never guess a target.
    else old.set(key,s);
  }
  const matched=[],unmatched=[];
  for(const item of metadata.structures){
    const replacement=byId.get(item.id);
    if(!replacement)throw new Error('Skull mesh missing from GLB: '+item.id);
    const original=old.get(skullKey(item.target));
    if(original?.mesh?.isMesh)matched.push({original,detail:replacement,metadata:item});
    else unmatched.push(item.target);
  }
  return {matched,unmatched};
}
export function adequateSkullReplacement(oldFaces,newFaces){
  // Never replace a detailed Écorché bone with geometry of lower or equal resolution.
  return Number.isFinite(oldFaces)&&Number.isFinite(newFaces)&&newFaces>oldFaces*1.08;
}
