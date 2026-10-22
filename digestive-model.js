/* BodyParts3D 3.0 major digestive organs, CC BY-SA 2.1 Japan.
   Organs are a separate Draco GLB, kept separate from the Écorché model.
   Source frame: measured BodyParts3D scan, approximately 6.72 scan units tall.
   Registration is approximate, with no alteration to the skeletal model. */
const SOURCE_SKIN = Object.freeze({minY:-3.534865,maxY:3.183290,depth:0.4});
const ID_NAMES = Object.freeze({liver:'Liver',stomach:'Stomach',intestines:'Intestines'});
const IDS = Object.keys(ID_NAMES);
export function digestiveMeshEntries(root) {
  const entries=[];
  root.traverse(obj=>{
    if(!obj.isMesh)return;
    const match=/^(liver|stomach|intestines)__([a-z]+\d+)$/i.exec(obj.name||'');
    if(!match){obj.visible=false;return;}
    const id=match[1].toLowerCase(),fma=match[2].toUpperCase();
    entries.push({mesh:obj,name:ID_NAMES[id],sourceName:obj.name,
      side:'midline',tissue:'organ',system:'digestive',layer:'digestive',organId:id,fma});
  });
  const groups=new Set(entries.map(e=>e.organId));
  for(const id of IDS)if(!groups.has(id))throw new Error(`Digestive asset missing required organ: ${id}`);
  // When an organ consists of several separate meshes, keep a stable readable name.
  const counts={};for(const e of entries)counts[e.organId]=(counts[e.organId]||0)+1;
  const seq={};for(const e of entries)if(counts[e.organId]>1){seq[e.organId]=(seq[e.organId]||0)+1;e.name+=` · part ${seq[e.organId]}`;}
  return entries.sort((a,b)=>[a.organId,a.sourceName].join('|').localeCompare([b.organId,b.sourceName].join('|')));
}
export function sourceRegistration(bodyBounds) {
  // The BodyParts3D organ GLB and associated skin share scan coordinates.
  // Scale to the height of the existing human figure; align midline and soles.
  const height=bodyBounds.max.y-bodyBounds.min.y;
  if(!Number.isFinite(height)||height<1||height>3)throw new Error('Unexpected skeleton dimensions for organ registration.');
  const scale=height/(SOURCE_SKIN.maxY-SOURCE_SKIN.minY);
  return {scale,x:(bodyBounds.min.x+bodyBounds.max.x)*0.5,
    y:bodyBounds.min.y-SOURCE_SKIN.minY*scale,
    z:(bodyBounds.min.z+bodyBounds.max.z)*0.5-SOURCE_SKIN.depth*scale};
}
