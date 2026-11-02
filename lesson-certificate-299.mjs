// AnatomIQ 2.2.91 — student-entered certificate names persist per lesson attempt.
// This is a usability lock, not an identity/authentication guarantee.
const PREFIX = 'anatomiq-lesson-certificate-name-v1:';
export function createCertificateNameStore(storageProvider = () => globalThis.localStorage) {
  function keyFor(progressKey) {
    if (typeof progressKey !== 'string' || !progressKey.trim()) throw Error('Missing lesson progress identity.');
    return PREFIX + progressKey;
  }
  function get(progressKey) {
    if (!progressKey) return null;
    try {
      const raw = storageProvider()?.getItem(keyFor(progressKey));
      if (!raw) return null;
      const value = JSON.parse(raw);
      return value?.version === 1 && typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 70
        ? value.name : null;
    } catch { return null; }
  }
  function lock(progressKey, input) {
    const prior = get(progressKey);
    if (prior) return prior; // Never overwrite an existing certificate name.
    const name = String(input ?? '').trim().replace(/\s+/g, ' ').slice(0, 70);
    if (!name) throw Error('Student name required.');
    const storage = storageProvider();
    if (!storage) throw Error('Browser storage unavailable.');
    storage.setItem(keyFor(progressKey), JSON.stringify({version: 1, name, savedAt: Date.now()}));
    if (get(progressKey) !== name) throw Error('Certificate name could not be confirmed in device storage.');
    return name;
  }
  function clear(progressKey) {
    if (!progressKey) return true;
    try {
      const storage = storageProvider();
      if (!storage) return false;
      storage.removeItem(keyFor(progressKey));
      return get(progressKey) === null;
    } catch { return false; }
  }
  return Object.freeze({get, lock, clear});
}
