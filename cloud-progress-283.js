/* ANATOMIQ_CLOUD_PROGRESS_283 — optional Apps Script portal bridge.
   No Google credentials or student answer data are stored in published lesson files.
   The Google web-app authenticates the account. This GitHub client never treats
   a typed email or unacknowledged upload as verified cloud progress. */
(function (root) {
  'use strict';
  const MARKER = 'ANATOMIQ_CLOUD_PROGRESS_283';
  const enabled = new URLSearchParams(root.location.search).get('aiqCloud') === '1';
  const SETTINGS_KEY = 'anatomiq-cloud-publish-283';
  let identity = null, portalOrigin = null, remote = null, status = enabled ? 'waiting' : 'disabled';
  let pending = null, inFlight = false, acknowledgedAt = 0;
  const listeners = new Set();

  function isPortalOrigin(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'script.google.com' ||
        url.hostname === 'script.googleusercontent.com' ||
        url.hostname.endsWith('.script.googleusercontent.com') ||
        // Apps Script HTML Service typically uses <random>-script.googleusercontent.com.
        // Keep this strict: only a Google-owned host, HTTPS, and our parent frame.
        url.hostname.endsWith('-script.googleusercontent.com')); // ANATOMIQ_SCHOOL_HANDSHAKE_287
    } catch { return false; }
  }
  function notify() {
    root.dispatchEvent(new CustomEvent('anatomiq:cloud-state'));
    listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  }
  function getState() {
    return { enabled, identity: identity ? { ...identity } : null, status, acknowledgedAt };
  }
  function lessonId() {
    const route = root.location.hash;
    if (/^#lesson=[a-z0-9-]+\/[a-z0-9_.-]+\/[a-z0-9-]+@[a-z0-9._%/-]+$/i.test(route)) return route.slice(1);
    return null;
  }
  function send(type, payload) {
    if (!enabled || !portalOrigin || root.parent === root) return false;
    root.parent.postMessage({ type, marker: MARKER, ...payload }, portalOrigin);
    return true;
  }
  function flush() {
    if (!identity || !pending || inFlight || !portalOrigin) return;
    inFlight = true;
    status = 'syncing'; notify();
    send('ANATOMIQ_PROGRESS_283', { progress: pending });
  }
  function enqueue(progress) {
    if (!enabled || !progress || typeof progress !== 'object' || !lessonId()) return;
    pending = {
      lessonId: lessonId(),
      projectKey: String(progress.projectKey || '').slice(0, 100),
      title: String(progress.title || 'AnatomIQ lesson').slice(0, 120),
      chapter: Number.isInteger(progress.chapter) ? progress.chapter : 0,
      total: Number.isInteger(progress.total) ? progress.total : 0,
      done: Number.isInteger(progress.done) ? progress.done : 0,
      graded: Number.isInteger(progress.graded) ? progress.graded : 0,
      firstTry: Number.isInteger(progress.firstTry) ? progress.firstTry : 0,
      answers: progress.answers && typeof progress.answers === 'object' ? progress.answers : {},
      updatedAt: Number(progress.updatedAt) || Date.now()
    };
    status = 'pending'; notify(); flush();
  }
  function getRemote(key) {
    return remote && remote.projectKey === key ? structuredClone(remote) : null;
  }
  function progressStorageKey(projectKey) {
    if (!enabled || !identity?.email) return null;
    // FNV-1a deterministic key, scoped to the authenticated Google account.
    // Hashing keeps the student's email out of IndexedDB record keys.
    let hash = 2166136261;
    for (const char of identity.email.toLowerCase()) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `${projectKey}-school-${(hash >>> 0).toString(36)}`;
  }
  function waitForIdentity(timeoutMs = 12000) {
    if (!enabled) return Promise.resolve(null);
    if (identity?.email) return Promise.resolve({ ...identity });
    return new Promise((resolve, reject) => {
      const timer = root.setTimeout(() => {
        listeners.delete(check);
        reject(new Error('School Google account verification is unavailable. Open this lesson using your teacher-provided tracked link.'));
      }, timeoutMs);
      function check() {
        if (!identity?.email) return;
        root.clearTimeout(timer);
        listeners.delete(check);
        resolve({ ...identity });
      }
      listeners.add(check);
    });
  }
  function storedConfig() {
    try { return JSON.parse(root.localStorage.getItem(SETTINGS_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function configure(url, tracked) {
    const current = { url: String(url || '').trim(), tracked: Boolean(tracked) };
    if (current.url) {
      const u = new URL(current.url);
      if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' || !u.pathname.endsWith('/exec'))
        throw new Error('Enter the deployed Google Apps Script web-app URL ending in /exec.');
      current.url = u.origin + u.pathname;
    }
    root.localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    return current;
  }
  function preparePublish(hasGuidedActivities) {
    const check = document.getElementById('aiq283-track');
    const input = document.getElementById('aiq283-script-url');
    const hint = document.getElementById('aiq283-publish-hint');
    if (!check || !input) return;
    const cfg = storedConfig();
    check.disabled = !hasGuidedActivities;
    check.checked = Boolean(hasGuidedActivities && cfg.tracked);
    input.value = cfg.url || '';
    if (hint) hint.textContent = hasGuidedActivities ?
      'School account required; one tracked link for all class periods. Apps Script must be deployed first.' :
      'Add guided chapter activities before enabling progress tracking.';
  }
  function capturePublish(hasGuidedActivities) {
    const check = document.getElementById('aiq283-track');
    const input = document.getElementById('aiq283-script-url');
    if (!check || !input) return;
    const wantsTracking = Boolean(hasGuidedActivities && check.checked);
    if (wantsTracking && !input.value.trim())
      throw new Error('To track progress, enter your deployed Google Apps Script web-app URL.');
    configure(input.value, wantsTracking);
  }
  // ANATOMIQ_PUBLISH_LINKS_285: the dashboard opens directly from the visible
  // typed URL; no publish/Google sheet write is required to save a setting first.
  function teacherDashboardURL(typedURL) {
    const input = String(typedURL || '').trim() || storedConfig().url || '';
    if (!input) return null;
    const u = new URL(input);
    if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' ||
        !/^\/macros\/s\/[^/]+\/exec$/.test(u.pathname))
      throw new Error('Enter a valid deployed Apps Script URL ending in /exec.');
    u.search = '';
    u.hash = '';
    u.searchParams.set('view', 'teacher');
    return u.href;
  }
  function wrapLink(original, opts = {}) {
    const cfg = storedConfig();
    if (!cfg.tracked) return original;
    if (!cfg.url) throw new Error('Set the school progress web-app URL before publishing.');
    const u = new URL(original);
    // A teacher may publish from localhost. Always require the actual
    // canonical public lesson, never a localhost or snapshot URL.
    if (u.origin !== 'https://kelly-science.github.io' || u.pathname !== '/anatomiq-3d/' ||
        !/^#lesson=[a-z0-9-]+\/[a-z0-9_.-]+\/[a-z0-9-]+@[a-z0-9._%/-]+$/i.test(u.hash) ||
        u.search)
      throw new Error('Cloud tracking requires a published kelly-science.github.io/anatomiq-3d/ lesson link.');
    const endpoint = new URL(cfg.url);
    endpoint.searchParams.set('lesson', original);
    if (opts.embedded) endpoint.searchParams.set('embed', '1');
    return endpoint.href;
  }
  // Authentication and persistence remain server-owned. This message merely carries
  // the identity that the Apps Script server returned to its own authenticated page.
  root.addEventListener('message', event => {
    if (!enabled || !isPortalOrigin(event.origin) || event.source !== root.parent ||
        !event.data || event.data.marker !== MARKER) return;
    const data = event.data;
    if (data.type === 'ANATOMIQ_IDENTITY_283') {
      const user = data.identity || {};
      if (typeof user.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(user.email) ||
          !/^[0-9A-Za-z -]{1,32}$/.test(String(user.period || ''))) return;
      portalOrigin = event.origin;
      identity = { email: user.email.toLowerCase(), name: String(user.name || '').slice(0, 70), period: String(user.period) };
      status = 'pending'; notify(); flush();
    } else if (data.type === 'ANATOMIQ_RESTORE_283') {
      if (!identity || data.lessonId !== lessonId() || !data.progress || typeof data.progress !== 'object') return;
      remote = data.progress;
      root.dispatchEvent(new CustomEvent('anatomiq:cloud-restore', { detail: { progress: structuredClone(remote) } }));
    } else if (data.type === 'ANATOMIQ_READY_283') {
      // The server successfully checked this student's record and found no prior snapshot.
      root.dispatchEvent(new CustomEvent('anatomiq:cloud-ready'));
    } else if (data.type === 'ANATOMIQ_ACK_283') {
      inFlight = false;
      if (data.ok === true) {
        acknowledgedAt = Date.now();
        const sentAt = Number(data.updatedAt) || 0;
        if (pending && pending.updatedAt > sentAt) { status = 'pending'; notify(); flush(); return; }
        pending = null; status = 'synced';
      } else { status = 'error'; }
      notify();
    }
  });
  if (enabled && root.parent !== root) {
    // Only route metadata is sent before identity confirmation (not student PII/answers).
    root.parent.postMessage({ type: 'ANATOMIQ_HELLO_283', marker: MARKER, lessonId: lessonId() }, '*');
    root.addEventListener('online', () => flush());
  }
  root.AnatomIQCloudProgress283 = {
    enabled, lessonId, enqueue, getRemote, progressStorageKey, waitForIdentity, state: getState, onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    storedConfig, configure, wrapLink, preparePublish, capturePublish, teacherDashboardURL,
    statusText() {
      if (!enabled) return 'Saved on this device';
      return status === 'synced' ? 'Saved to school Google account' :
        status === 'syncing' ? 'Syncing to school account…' :
        status === 'error' ? 'Saved on this device — cloud sync failed' :
        status === 'pending' ? 'Saved on this device — awaiting cloud confirmation' :
        'Waiting for verified school sign-in';
    }
  };
})(window);
