// ANATOMIQ_HOTSPOT_FEEDBACK_277 — Label attempts and chapter-only restart.
// Pure data logic; no lessons, model geometry, or other chapter answers are changed.
export const MAX_HOTSPOT_ATTEMPTS = 10;
export const DEFAULT_NEW_HOTSPOT_ATTEMPTS = 3;
export function validHotspotAttemptLimit(value){
  return value === undefined || Number.isInteger(value) && value >= 0 && value <= MAX_HOTSPOT_ATTEMPTS;
}
export function hotspotAttemptState(activity, evidence){
  // Previous Label activities remain unlimited unless their teacher sets a limit.
  const raw=activity?.attemptLimit;
  const limit=raw===undefined?0:raw;
  if(!validHotspotAttemptLimit(limit))throw Error('Label attempt limit must be Unlimited or 1–10.');
  const tries=Number.isSafeInteger(evidence?.attempts)&&evidence.attempts>=0?evidence.attempts:0;
  const used=limit===0?tries:Math.min(limit,tries);
  const remaining=limit===0?null:Math.max(0,limit-used);
  return {limit,used,remaining,locked:limit>0&&remaining===0&&!evidence?.hotspotCorrect,
    finalChance:limit>0&&remaining===1&&!evidence?.hotspotCorrect};
}
export function restartChapterAnswers(answers, chapterActivities){
  if(!answers||typeof answers!=='object'||!Array.isArray(chapterActivities))throw Error('Invalid chapter progress');
  const updated={...answers};
  for(const a of chapterActivities){if(typeof a?.id==='string')delete updated[a.id];}
  return updated;
}
