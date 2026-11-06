/** AnatomIQ 2.2.143 — side-effect-free chapter import engine.
 * Never writes to IndexedDB, current workspace, or source project.
 */
export const IMPORT_MARKER_357 = 'ANATOMIQ_CHAPTER_IMPORT_357';
export const MAX_CHAPTERS_357 = 12;
const clone = value => structuredClone(value);
const defaultId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || (Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))}`;

export function compatibleChapters(destination, source) {
  if (!destination?.chapters?.length || !source?.chapters?.length) return false;
  const reference=destination.chapters[0];
  return source.chapters.every(c=>c && c.n===reference.n && c.f===reference.f);
}

function remapImported(chapter, activities, used, idFactory) {
  const scene=clone(chapter), steps=clone(activities || []);
  const labelMap=new Map();
  for (const label of scene.labels || []) {
    // No source-specific quiz identity may collide with a destination label.
    if (label.qi) {
      const old=label.qi;
      const next=idFactory('q');
      if(!/^q-[0-9A-Za-z-]{4,62}$/.test(next) || used.has(next)) throw new Error('Could not create a unique imported label ID.');
      used.add(next); label.qi=next; labelMap.set(old,next);
    }
  }
  for (const step of steps) {
    const next=idFactory('act');
    if(!/^act-[a-zA-Z0-9-]{4,80}$/.test(next) || used.has(next)) throw new Error('Could not create a unique imported activity ID.');
    used.add(next); step.id=next;
    // Remap only exact label-ID references, never teacher-authored prose/answers.
    if (typeof step.targetLabel==='string' && labelMap.has(step.targetLabel)) step.targetLabel=labelMap.get(step.targetLabel);
    // Future schema may introduce nested targetLabel/labelId refs. Remap only keys
    // identifying an annotation and values matching an actual copied label.
    const visit=(obj)=>{
      if(!obj||typeof obj!=='object') return;
      for (const [key,value] of Object.entries(obj)) {
        if (['targetLabel','labelId','labelQi'].includes(key)&&typeof value==='string'&&labelMap.has(value))obj[key]=labelMap.get(value);
        else if(value&&typeof value==='object')visit(value);
      }
    };
    visit(step);
  }
  return {scene,steps};
}

/** Returns a fully new project or throws; neither input may be modified. */
export function buildChapterImport(destination,source,selectedIndices,{position='end',afterIndex=0,withActivities=true,idFactory=defaultId,validate}={}){
  if(destination?.v!==2||source?.v!==2)throw new Error('Chapter importing requires modern AnatomIQ lessons.');
  if(!compatibleChapters(destination,source))throw new Error('The source lesson uses a different anatomical structure index. Import is not safe for this model.');
  if(!Array.isArray(selectedIndices)||!selectedIndices.length||new Set(selectedIndices).size!==selectedIndices.length||
    selectedIndices.some(i=>!Number.isInteger(i)||i<0||i>=source.chapters.length))throw new Error('Select one or more valid chapters.');
  if(destination.chapters.length+selectedIndices.length>MAX_CHAPTERS_357)throw new Error(`Lessons support no more than ${MAX_CHAPTERS_357} chapters.`);
  if(!['end','after'].includes(position))throw new Error('Invalid chapter insertion point.');
  if(position==='after' && (!Number.isInteger(afterIndex)||afterIndex<0||afterIndex>=destination.chapters.length))throw new Error('Invalid current chapter.');
  const dest=clone(destination);
  const oldLength=dest.chapters.length;
  const insertAt=position==='end'?oldLength:afterIndex+1;
  const originalGuided=dest.guided && typeof dest.guided==='object'?clone(dest.guided):{free:false,chapters:Array.from({length:oldLength},()=>[])};
  while(originalGuided.chapters.length<oldLength)originalGuided.chapters.push([]);
  const used=new Set();
  for(const c of dest.chapters)for(const l of c.labels||[])if(l.qi)used.add(l.qi);
  for(const steps of originalGuided.chapters)for(const a of steps||[])if(a.id)used.add(a.id);
  const newChapters=[],newActivities=[];
  for (const index of selectedIndices) {
    const result=remapImported(source.chapters[index],withActivities?source.guided?.chapters?.[index]:[],used,idFactory);
    newChapters.push(result.scene);newActivities.push(result.steps);
  }
  dest.chapters.splice(insertAt,0,...newChapters);
  originalGuided.chapters.splice(insertAt,0,...newActivities);
  dest.guided=originalGuided;
  // Preserve the *same* starting chapter; inserting ahead shifts its index.
  if(dest.start>=insertAt)dest.start+=newChapters.length;
  if(dest.practical){
    if(Array.isArray(dest.practical.chapters))dest.practical.chapters=dest.practical.chapters.map(i=>i>=insertAt?i+newChapters.length:i);
    if(Array.isArray(dest.practical.chapterRules)){
      const rules=dest.practical.chapterRules;
      // Existing chapter rules are indexed by chapter; null means no override.
      while(rules.length<oldLength)rules.push(null);
      rules.splice(insertAt,0,...newChapters.map(()=>null));
    }
  }
  if(validate) validate(dest);
  return dest;
}
