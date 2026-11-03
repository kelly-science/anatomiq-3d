/* AnatomIQ 2.2.100 — Teacher-only tree visibility planning. No scene schema changes. */
export function inspectBranch(entries, visible, eligible=()=>true){
  const unique=[...new Set(entries||[])].filter(eligible);
  const shown=unique.filter(visible).length;
  return {total:unique.length,shown,kind:!unique.length?'unavailable':shown===unique.length?'all':shown===0?'none':'some'};
}
export function newlyVisibleToHide(entries, previouslyShown, targets, nowEnabled){
  const desired=new Set(targets||[]);
  const prior=new Set(previouslyShown||[]);
  return [...new Set(entries||[])].filter(s=>!prior.has(s)&&!desired.has(s)&&nowEnabled(s));
}
