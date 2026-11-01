/* AnatomIQ 2.2.80: student activity completion cue. No network/storage/model effects. */
let activeCue = null;
export function showActivitySuccess(onFinished, doc = document) {
  if (activeCue) activeCue();
  const win = doc.defaultView || window;
  const reduce = !!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const overlay = doc.createElement('div');
  overlay.className = 'anat-ga-success-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-label', 'Question completed');
  overlay.innerHTML = `<div class="anat-ga-success-ring" aria-hidden="true">
    <svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">
      <circle class="anat-ga-success-circle" cx="60" cy="60" r="49"/>
      <path class="anat-ga-success-check" d="M34 61l17 17 35-39"/>
    </svg></div>`;
  doc.body.appendChild(overlay);
  doc.body.classList.add('anat-ga-success-active');
  let done = false, timer;
  const finish = (advance) => {
    if(done) return;
    done = true;
    win.clearTimeout(timer);
    overlay.remove();
    doc.body.classList.remove('anat-ga-success-active');
    if(activeCue === cancel) activeCue = null;
    if(advance) onFinished?.();
  };
  const cancel = () => finish(false);
  activeCue = cancel;
  timer = win.setTimeout(() => finish(true), reduce ? 230 : 1020);
  return cancel;
}
