/* AnatomIQ Studio — global geometry quality; a device preference, never lesson state.
 * Classic head script intentionally runs BEFORE the deferred app.js module.
 */
(function (scope) {
  'use strict';
  const KEY = 'anatomiq-global-geometry-quality-v1';
  const SKULL_KEY = 'anatomy-studio-skull-geometry-v2';
  const SYSTEMS = Object.freeze([
    ['connective', 'anatomiq-connective-geometry-v1'],
    ['lymphatic', 'anatomiq-lymphatic-geometry-v1'],
    ['urinary', 'anatomiq-urinary-geometry-v1'],
    ['nervous', 'anatomiq-nervous-geometry-v1'],
    ['respiratory', 'anatomiq-respiratory-geometry-v1'],
    ['cardio', 'anatomy-studio-cardio-geometry-v1'],
    ['digestive', 'anatomy-studio-digestive-geometry-v1']
  ]);
  function normalized(value) { return value === 'detailed' ? 'detailed' : 'standard'; }
  function applyToStorage(storage, mode) {
    const chosen = normalized(mode);
    storage.setItem(KEY, chosen);
    for (const [, key] of SYSTEMS) storage.setItem(key, chosen);
    // Retire the old experimental skull independently of global model detail.
    storage.setItem(SKULL_KEY, 'standard');
    return chosen;
  }
  function initializePreference(storage) {
    let mode = storage.getItem(KEY);
    if (mode !== 'standard' && mode !== 'detailed') {
      // Only preserve the old mode automatically when it was unanimous.
      mode = SYSTEMS.every(([, key]) => storage.getItem(key) === 'detailed') ? 'detailed' : 'standard';
    }
    return applyToStorage(storage, mode);
  }
  let selected = 'standard';
  try { selected = initializePreference(scope.localStorage); }
  catch (error) { console.warn('AnatomIQ geometry preference cannot be saved:', error); }
  function showControl() {
    const document = scope.document;
    if (!document || document.getElementById('settings-global-geometry-quality')) return;
    const skullSelect = document.getElementById('settings-skull-geometry');
    const anchor = skullSelect?.closest('.render-settings-group');
    if (!anchor) { console.warn('AnatomIQ: global geometry settings anchor is missing'); return; }
    const group = document.createElement('div');
    group.className = 'render-settings-group';
    group.id = 'aiq-global-geometry-group';
    const label = document.createElement('label');
    label.htmlFor = 'settings-global-geometry-quality';
    const strong = document.createElement('strong');
    strong.textContent = 'Anatomy model detail';
    label.append(strong);
    const select = document.createElement('select');
    select.id = 'settings-global-geometry-quality';
    select.className = 'text-input';
    select.setAttribute('aria-label', 'Anatomy model detail');
    for (const [value, text] of [
      ['standard', 'Standard — faster on Chromebooks'],
      ['detailed', 'Detailed — smoother model surfaces']
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }
    select.value = selected;
    const hint = document.createElement('p');
    hint.className = 'studio-hint';
    hint.textContent = 'Applies to Connective, Lymphatic, Urinary, Nervous, Respiratory, Cardiovascular and Digestive models on this device. Reloads the viewer. The skeletal system always uses the approved Detailed bones and assembled skull, regardless of this setting. Other anatomical systems follow the selector. This does not modify lessons or anatomical visibility.';
    group.append(label, select, hint);
    anchor.before(group);
    // Keep the individual controls in the DOM so existing app handlers remain safe.
    // Their whole groups are hidden, including obsolete explanatory copy.
    const legacyIds = SYSTEMS.map(([name]) => name === 'cardio' ? 'settings-cardio-geometry' : `settings-${name}-geometry`);
    legacyIds.push('settings-skull-geometry');
    const hidden = new Set();
    for (const id of legacyIds) {
      const old = document.getElementById(id);
      if (!old) { console.warn(`AnatomIQ: missing legacy geometry control ${id}`); continue; }
      const legacyGroup = old.closest('.render-settings-group');
      if (legacyGroup && !hidden.has(legacyGroup)) {
        legacyGroup.hidden = true;
        legacyGroup.setAttribute('aria-hidden', 'true');
        legacyGroup.style.display = 'none';
        hidden.add(legacyGroup);
      }
    }
    select.addEventListener('change', () => {
      try {
        selected = applyToStorage(scope.localStorage, select.value);
        scope.location.reload();
      } catch (error) {
        console.error('Could not apply AnatomIQ geometry quality:', error);
        scope.alert('This browser cannot save model detail preferences.');
        select.value = selected;
      }
    });
  }
  if (scope.document) {
    if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', showControl, {once:true});
    else showControl();
  }
  // Public only for deterministic nonbrowser tests and troubleshooting.
  scope.__AnatomIQGlobalGeometry = Object.freeze({key:KEY, systems:SYSTEMS, normalized, applyToStorage});
})(typeof window !== 'undefined' ? window : this);
