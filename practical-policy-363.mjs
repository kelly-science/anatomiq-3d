/* AnatomIQ 2.2.148 · Practical-only presentation and one scoped question source.
 * Pure helpers keep teacher preview and student attempts on the same eligibility rules.
 */
export function isPracticalOnly363(config,isTeacher=false){
  return !isTeacher && config?.on===true && config?.practicalOnly===true;
}
export function scopedPracticalCandidates363(allCandidates,assessmentConfig,chapters,scope,filterPracticalPool){
  if(!Array.isArray(allCandidates)||!Array.isArray(chapters)||!assessmentConfig||typeof filterPracticalPool!=='function')
    throw new Error('Practical questions are not ready.');
  // Filter ALWAYS: the original code skipped this when no chapterRules were present,
  // which let chapters not selected for a graded assessment leak into the question pool.
  return filterPracticalPool(allCandidates,assessmentConfig,chapters,scope);
}
export function draftMatchesEligible363(draft,eligible){
  if(!draft)return true;
  if(!Array.isArray(draft.questions)||!Array.isArray(eligible))return false;
  const keys=new Set(eligible.flatMap(g=>
    (Array.isArray(g?.variants)&&g.variants.length?g.variants:[g]).map(v=>`${v?.chapter}:${v?.key}:${v?.s}`)));
  return draft.questions.every(q=>keys.has(`${q?.chapter}:${q?.key}:${q?.s}`));
}
