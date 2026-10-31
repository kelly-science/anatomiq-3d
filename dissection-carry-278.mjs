// ANATOMIQ_DISSECTION_CARRY_278 — chapter-scoped persistence of teacher-approved dissection.
// Never changes saved chapter visibility or source mesh indices.
export function inheritedDissectionIndices(chapterSteps, answers, beforeActivityId = null) {
  if (!Array.isArray(chapterSteps) || !answers || typeof answers !== 'object') return [];
  const hidden = new Set();
  for (const a of chapterSteps) {
    if (beforeActivityId != null && a?.id === beforeActivityId) break;
    if (a?.type !== 'dissect' || a.keepHiddenForNext !== true || !answers[a.id]?.done) continue;
    const verified = new Set(Array.isArray(answers[a.id]?.hiddenIndices) ? answers[a.id].hiddenIndices : []);
    for (const index of a.hideStructures || []) {
      if (Number.isSafeInteger(index) && index >= 0 && verified.has(index)) hidden.add(index);
    }
  }
  return [...hidden];
}
export function dissectionEvidenceWithCarry(activity, ownEvidence, inherited) {
  const own = ownEvidence && typeof ownEvidence === 'object' ? ownEvidence : {};
  const required = new Set(Array.isArray(activity?.hideStructures) ? activity.hideStructures : []);
  const selected = new Set(Array.isArray(own.hiddenIndices) ? own.hiddenIndices : []);
  for (const index of inherited || []) if (required.has(index)) selected.add(index);
  return {...own, hiddenIndices: [...selected]};
}
