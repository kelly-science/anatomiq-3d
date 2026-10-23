/** Anatomy Studio 1.8.4 — scene-aware model planning.
 * Reads the existing unmodified scene/project format before 3D downloads.
 * Model availability and geometry quality are deliberately device-local.
 */
export function chapterAssets(chapter){
  if(!chapter || chapter.v!==1)throw new Error('Invalid anatomy chapter');
  const digestive=chapter.dg===true || chapter.m==='digestive';
  return {
    base:true,
    legacyDigestive:digestive && chapter.hd!==true,
    detailedDigestive:digestive && chapter.hd===true,
    cardiovascular:chapter.cv===true,
    skull:chapter.sb!==false && (chapter.m==='skull'||chapter.m==='skeleton'||chapter.m==='systems')
  };
}
export function projectChapters(project){
  return project.v===1?[project]:project.chapters;
}
export function assetsForProject(project){
  const needs={base:true,legacyDigestive:false,detailedDigestive:false,cardiovascular:false,skull:false};
  for(const chapter of projectChapters(project)){
    const assets=chapterAssets(chapter);
    for(const [key,value] of Object.entries(assets))needs[key] ||= value;
  }
  return needs;
}
export function offlineLessonFiles(project,{digestiveGeometry='standard',cardioGeometry='standard',skullGeometry='standard'}={}){
  const needed=assetsForProject(project);
  const files=[];
  if(needed.legacyDigestive)files.push('models/anatomy-organs.glb','vendor/three/examples/jsm/loaders/DRACOLoader.js','vendor/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm','vendor/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js');
  if(needed.detailedDigestive)files.push('models/digestive-structures.json',`models/digestive-${digestiveGeometry==='detailed'?'detailed':'standard'}.glb`);
  if(needed.cardiovascular)files.push('models/cardiovascular-structures.json',`models/cardiovascular-${cardioGeometry==='detailed'?'detailed':'standard'}.glb`);
  if(needed.skull && skullGeometry==='detailed')files.push('models/skull-structures.json','models/skull-detailed.glb');
  return [...new Set(files)];
}
/** The original three-organ mesh IDs are fixed in the 1.2 asset. If a custom
 * legacy GLB diverges, loader fallback verifies against the actual geometry. */
export const LEGACY_DIGESTIVE_MESH_NAMES=Object.freeze([
  'liver__FMA7197','stomach__FMA7148','intestines__FMA7206'
]);
