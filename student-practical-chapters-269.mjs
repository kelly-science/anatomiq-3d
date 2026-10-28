/* AnatomIQ 2.2.69 — Student-side practical chapter scope.
   The teacher's permitted chapters and excluded target keys are authoritative.
   We only create a temporary scope for each attempt; no lesson schema changes. */

let pendingChooser = null;

export function availablePracticalChapters(chapters, config) {
  if (!Array.isArray(chapters)) return [];
  const permitted = Array.isArray(config?.chapters) ? new Set(config.chapters) : null;
  return chapters.map((ch, index) => ({index, title: String(ch?.t || `Chapter ${index + 1}`)}))
    .filter(ch => !permitted || permitted.has(ch.index));
}

export function practicalScopedConfig(config, chapters, choice) {
  const available = availablePracticalChapters(chapters, config);
  const permitted = available.map(ch => ch.index);
  if (!permitted.length) return null;
  if (choice === 'all') return {...config, chapters: permitted};
  if (!Number.isInteger(choice) || !permitted.includes(choice)) return null;
  return {...config, chapters: [choice]};
}

export function practicalScopeTargetCount(candidates, config, chapters, choice) {
  const scoped = practicalScopedConfig(config, chapters, choice);
  if (!scoped || !Array.isArray(candidates)) return 0;
  const off = new Set(Array.isArray(scoped.off) ? scoped.off : []);
  const allowed = new Set(scoped.chapters);
  return candidates.filter(group => {
    const variants = Array.isArray(group?.variants) && group.variants.length ? group.variants : [group];
    return variants.some(variant => allowed.has(variant.chapter) && !off.has(variant.key));
  }).length;
}

const STYLE = `
.aiq269-practical-dialog { width:min(92vw,490px); max-width:92vw; max-height:min(84vh,720px); box-sizing:border-box; padding:0; border:1px solid rgba(183,203,218,.24); border-radius:18px; color:#f0f5fa; background:#17232e; box-shadow:0 20px 72px rgba(0,0,0,.55); overflow:auto; }
.aiq269-practical-dialog::backdrop { background:rgba(6,11,17,.72); backdrop-filter:blur(5px); }
.aiq269-practical-dialog.aiq269-fallback { position:fixed; inset:0; margin:auto; z-index:100000; }
.aiq269-practical-dialog .aiq269-body { padding:20px 22px 16px; }
.aiq269-practical-dialog h2 { font-size:1.18rem; margin:0 0 7px; color:#f7fbff; }
.aiq269-practical-dialog p { margin:0 0 16px; color:#b9cbd7; font-size:.92rem; line-height:1.45; }
.aiq269-choices { display:flex; flex-direction:column; gap:8px; max-height:min(46vh,375px); overflow:auto; padding:2px; }
.aiq269-choice { display:flex; align-items:center; gap:11px; border:1px solid #4a5e70; padding:12px; border-radius:11px; cursor:pointer; background:#21313e; color:#f0f5fa; }
.aiq269-choice:has(input:checked) { border-color:#83c8f8; background:#284156; }
.aiq269-choice:has(input:focus-visible) { outline:2px solid #a4d9ff; outline-offset:2px; }
.aiq269-choice input { accent-color:#84c8f9; width:17px; height:17px; flex:0 0 auto; }
.aiq269-choice .aiq269-label { flex:1; min-width:0; overflow-wrap:anywhere; }
.aiq269-choice small { font-size:.79rem; color:#b7d0df; white-space:nowrap; }
.aiq269-actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:9px; padding:14px 22px 18px; border-top:1px solid #34495a; }
.aiq269-actions button { border-radius:9px; padding:9px 15px; border:1px solid #647a8d; color:#f0f7fc; background:#293b49; cursor:pointer; font:inherit; }
.aiq269-actions button.aiq269-start { background:#337eb0; border-color:#59a6dd; color:white; font-weight:600; }
.aiq269-actions button:disabled { opacity:.45; cursor:not-allowed; }
.aiq269-empty { color:#efc5aa; padding:14px 0; }
`;

/** Show student-only modal. Resolves to 'all', a chapter index, or null on cancel.
 *  Re-entrant calls share a promise so rapid double taps don't create overlays. */
export function chooseStudentPracticalChapter({chapters, candidates, config, doc = document}) {
  if (pendingChooser) return pendingChooser;
  pendingChooser = new Promise(resolve => {
    const previousFocus = doc.activeElement;
    if (!doc.getElementById('aiq269-practical-style')) {
      const style = doc.createElement('style');
      style.id = 'aiq269-practical-style'; style.textContent = STYLE;
      doc.head.append(style);
    }
    const dialog = doc.createElement('dialog');
    dialog.className = 'aiq269-practical-dialog';
    dialog.id = 'aiq269-practical-chapter-dialog';
    dialog.setAttribute('aria-labelledby', 'aiq269-practical-title');
    dialog.setAttribute('aria-describedby', 'aiq269-practical-description');
    const body = doc.createElement('div'); body.className = 'aiq269-body';
    const title = doc.createElement('h2'); title.id = 'aiq269-practical-title'; title.textContent = 'Choose practical chapters';
    const description = doc.createElement('p'); description.id = 'aiq269-practical-description';
    description.textContent = 'Practice all available chapters or focus on one chapter. Your teacher’s exclusions still apply. At least two eligible targets are needed for multiple-choice questions.';
    const form = doc.createElement('form'); form.id = 'aiq269-practical-form';
    form.addEventListener('submit', event => event.preventDefault());
    const choices = doc.createElement('div'); choices.className = 'aiq269-choices';
    choices.setAttribute('role', 'radiogroup'); choices.setAttribute('aria-label', 'Practical chapter selection');
    const allowed = availablePracticalChapters(chapters, config);
    const options = [{value: 'all', title: allowed.length === chapters.length ? 'All Chapters' : 'All available chapters'},
      ...allowed.map(ch => ({value: String(ch.index), title: `${ch.index + 1}. ${ch.title}`}))];
    let selection = 'all';
    const footer = doc.createElement('div'); footer.className = 'aiq269-actions';
    const cancel = doc.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
    const start = doc.createElement('button'); start.type = 'button'; start.className = 'aiq269-start'; start.textContent = 'Start practical';
    const update = () => {
      const count = practicalScopeTargetCount(candidates, config, chapters, selection);
      start.disabled = count < 2;
      start.textContent = count >= 2 ? `Start practical (${Math.min(Number(config?.count) || 15, count)})` : 'Need at least 2 targets';
    };
    for (const option of options) {
      const choice = option.value === 'all' ? 'all' : Number(option.value);
      const count = practicalScopeTargetCount(candidates, config, chapters, choice);
      const row = doc.createElement('label'); row.className = 'aiq269-choice';
      const radio = doc.createElement('input'); radio.type = 'radio'; radio.name = 'aiq269-practical-chapter'; radio.value = option.value;
      radio.checked = option.value === 'all'; radio.disabled = count < 2;
      const text = doc.createElement('span'); text.className = 'aiq269-label'; text.textContent = option.title;
      const number = doc.createElement('small'); number.textContent = `${count} ${count === 1 ? 'target' : 'targets'}`;
      radio.addEventListener('change', () => { if (radio.checked) { selection = choice; update(); } });
      row.append(radio, text, number); choices.append(row);
    }
    if (!allowed.length) {
      const empty = doc.createElement('div'); empty.className = 'aiq269-empty';
      empty.textContent = 'No chapters are available for this practical. Ask your teacher to include a chapter.';
      choices.append(empty);
    }
    const finish = value => {
      dialog.remove();
      if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
      resolve(value);
    };
    cancel.addEventListener('click', () => finish(null));
    start.addEventListener('click', () => { if (!start.disabled) finish(selection); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
    dialog.addEventListener('click', event => { if (event.target === dialog) finish(null); });
    footer.append(cancel, start); form.append(choices); body.append(title, description, form); dialog.append(body, footer);
    doc.body.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else { dialog.setAttribute('open', ''); dialog.classList.add('aiq269-fallback'); }
    update();
    const checked = choices.querySelector('input:not(:disabled):checked') || choices.querySelector('input:not(:disabled)');
    if (checked) { checked.checked = true; selection = checked.value === 'all' ? 'all' : Number(checked.value); update(); checked.focus(); }
    else cancel.focus();
  }).finally(() => { pendingChooser = null; });
  return pendingChooser;
}
