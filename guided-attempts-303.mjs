/* AnatomIQ Guided Attempts 303 — chapter-local errors and compact attempt ledger.
 * Pure, dependency-free helpers; no DOM access and no network operations.
 */
export const DEFAULT_DISSECTION_MISTAKES = 3;
export const MAX_GUIDED_ATTEMPT_SLOTS = 10;

export function dissectMistakeState(activity, evidence = {}) {
  // Older dissect lessons receive a three-mistake limit when opened using
  // Guided Access; no previous correct dissection evidence is discarded.
  const raw = activity?.attemptLimit;
  const limit = Number.isInteger(raw) && raw >= 0 && raw <= 10 ? raw : DEFAULT_DISSECTION_MISTAKES;
  const mistakes = Array.isArray(evidence?.mistakes)
    ? evidence.mistakes.filter(x => x && Number.isInteger(x.index) && x.index >= 0
      && typeof x.label === 'string').slice(-10)
    : [];
  const used = Math.max(mistakes.length, Number.isSafeInteger(evidence?.mistakeCount) ? evidence.mistakeCount : 0);
  return { limit, used, remaining:limit ? Math.max(0,limit-used) : null,
    locked:limit > 0 && used >= limit && evidence?.done !== true, mistakes };
}

export function recordDissectionMistake(activity, prior, index, name) {
  if (!Number.isInteger(index) || index < 0) return {...prior};
  const before = dissectMistakeState(activity, prior);
  if (before.locked) return {...prior};
  const label = String(name || `Structure ${index}`).replace(/\s+bone$/i, '').slice(0,96);
  const next = {...(prior || {}), mistakes:[...before.mistakes,{index,label}].slice(-10),
    mistakeCount:before.used + 1,
    attempts:(Number.isSafeInteger(prior?.attempts) && prior.attempts>=0 ? prior.attempts : 0)+1};
  return next;
}

function html(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function renderAttemptLedger(activity, evidence = {}) {
  if (!activity || !['dissect','label'].includes(activity.type)) return '';
  const dissect = activity.type === 'dissect';
  const dis = dissect ? dissectMistakeState(activity,evidence) : null;
  // Label attempts are counted by the existing 277 state machine, including
  // legacy unlimited configurations. This helper only presents the values.
  const limit = dissect ? dis.limit : (Number.isInteger(activity.attemptLimit) && activity.attemptLimit>=0 && activity.attemptLimit<=10 ? activity.attemptLimit : 0);
  const used = dissect ? dis.used : (Number.isSafeInteger(evidence?.attempts) && evidence.attempts>=0 ? evidence.attempts : 0);
  if (dissect && !used) return '';
  if (!used && limit===0) return '';
  const title=dissect?'Mistakes':'Attempts';
  const visible=Math.min(MAX_GUIDED_ATTEMPT_SLOTS,limit || Math.max(1,used));
  let slots='';
  for(let i=0;i<visible;i++) {
    const wasUsed=i<used;
    const name=dissect ? (dis.mistakes[i]?.label || `Mistake ${i+1}`) : `Attempt ${i+1}`;
    const label = wasUsed ? name : `Available ${dissect?'mistake':'attempt'} ${i+1}`;
    slots+=`<span class="anat303-attempt ${wasUsed?'is-used':'is-available'}" aria-label="${html(label)}"><span class="anat303-x" aria-hidden="true">✕</span>${wasUsed?`<span>${html(name)}</span>`:''}</span>`;
  }
  return `<div class="anat303-ledger" role="status" aria-live="polite"><div class="anat303-ledger-head"><strong>${title}</strong>${limit?`<small>${Math.min(used,limit)}/${limit}</small>`:''}</div><div class="anat303-attempt-list">${slots}</div></div>`;
}
