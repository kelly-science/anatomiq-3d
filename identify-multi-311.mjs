/* ANATOMIQ_MULTI_IDENTIFY_311
 * Guided Identify: multiple visible structures, non-destructive picks, and
 * chapter-scoped wrong-selection attempts. Pure helpers; no DOM or renderer.
 */
export const DEFAULT_IDENTIFY_ATTEMPTS = 3;
export const MAX_IDENTIFY_TARGETS = 64;

export function validIdentifyTargets(ids) {
  return Array.isArray(ids) && ids.length >= 1 && ids.length <= MAX_IDENTIFY_TARGETS &&
    ids.every(id => Number.isInteger(id) && id >= 0 && id < 2000) &&
    new Set(ids).size === ids.length;
}
export function identifyProgress(activity, evidence = {}) {
  const targets = validIdentifyTargets(activity?.targetStructures) ? activity.targetStructures : [];
  const selected = new Set(Array.isArray(evidence?.identifiedIndices) ? evidence.identifiedIndices : []);
  const found = targets.filter(id => selected.has(id));
  const remaining = targets.filter(id => !selected.has(id));
  return {required: targets.length, completed: found.length, found, remaining, done: targets.length > 0 && remaining.length === 0};
}
export function identifyAttemptState(activity, evidence = {}) {
  const limit = Number.isInteger(activity?.attemptLimit) && activity.attemptLimit >= 0 && activity.attemptLimit <= 10
    ? activity.attemptLimit : DEFAULT_IDENTIFY_ATTEMPTS;
  const wrong = Number.isSafeInteger(evidence?.wrongAttempts) && evidence.wrongAttempts >= 0 ? evidence.wrongAttempts : 0;
  const progress = identifyProgress(activity, evidence);
  return {limit, used: wrong, remaining:limit ? Math.max(0,limit-wrong) : null,
    locked: limit > 0 && wrong >= limit && !progress.done && evidence?.done !== true,
    progress};
}
export function recordIdentifySelection(activity, previous, index, displayName = '') {
  const prior = previous && typeof previous === 'object' ? previous : {};
  const before = identifyAttemptState(activity, prior);
  if (before.locked || before.progress.done || !Number.isInteger(index) || index < 0)
    return {evidence:{...prior}, accepted:false, duplicate:false, blocked:true, done:before.progress.done};
  if (before.progress.found.includes(index))
    return {evidence:{...prior}, accepted:true, duplicate:true, blocked:false, done:false};
  const accepted = activity.targetStructures.includes(index);
  const wrong = before.used + (accepted ? 0 : 1);
  const identifiedIndices = accepted ? [...before.progress.found,index] : before.progress.found;
  const mistakes = accepted ? prior.mistakes : [
    ...(Array.isArray(prior.mistakes) ? prior.mistakes : []),
    {index,label:String(displayName||`Structure #${index}`).slice(0,96)}
  ].slice(-10);
  const evidence = {...prior,identifiedIndices,wrongAttempts:wrong,attempts:wrong+1,
    ...(accepted ? {} : {mistakes})};
  const done = identifyProgress(activity,evidence).done;
  return {evidence,accepted,duplicate:false,blocked:false,done};
}
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderIdentifyAttemptLedger(activity, evidence = {}) {
  const state=identifyAttemptState(activity,evidence);
  if(!state.limit && !state.used) return '';
  const size=state.limit || Math.min(10,Math.max(1,state.used));
  const mistakes=Array.isArray(evidence?.mistakes) ? evidence.mistakes : [];
  const cells=Array.from({length:size},(_,i)=>{
    const used=i<state.used;
    const mistake=mistakes[i]?.label || `Incorrect selection ${i+1}`;
    const label=used?mistake:`Available attempt ${i+1}`;
    return `<span class="anat303-attempt ${used?'is-used':'is-available'}" aria-label="${esc(label)}"><span class="anat303-x" aria-hidden="true">✕</span>${used?`<span>${esc(mistake)}</span>`:''}</span>`;
  }).join('');
  return `<div class="anat303-ledger" role="status" aria-live="polite"><div class="anat303-ledger-head"><strong>Incorrect attempts</strong><small>${state.limit?`${Math.min(state.used,state.limit)}/${state.limit}`:`${state.used} · Unlimited`}</small></div><div class="anat303-attempt-list">${cells}</div></div>`;
}
