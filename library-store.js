/* Teacher-only Scene Library — local, same-origin IndexedDB.
   No account, sync service, or anatomy model copies. Scene data is validated before reads/writes.
   The student viewer uses self-contained links and never needs access to this store. */
import {validateProject} from './scene-codec.js';

const DB_NAME = 'anatomy-studio-scene-library';
const DB_VERSION = 1;
const STORE = 'lessons';
const BACKUP_FORMAT = 'anatomy-studio-library';
export const MAX_LIBRARY_ITEMS = 500;
const MAX_BACKUP_BYTES = 16 * 1024 * 1024;

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Browser storage is unavailable. Use Export editable JSON for backup.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {keyPath:'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Scene Library could not be opened.'));
    request.onblocked = () => reject(new Error('Close other open Anatomy Studio tabs and retry.'));
  });
}
async function withStore(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      try {
        const req = operation(store);
        req.onsuccess = () => { result = req.result; };
        req.onerror = () => { /* Transaction error handler below reports the failure. */ };
      } catch (error) { tx.abort(); reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Cannot access Scene Library.'));
      tx.onabort = () => reject(tx.error || new Error('Scene Library operation was cancelled.'));
    });
  } finally { db.close(); }
}
export function newLessonId() {
  return globalThis.crypto?.randomUUID?.() || `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
function ensureRecord(record) {
  if (!record || typeof record.id !== 'string' || record.id.length > 100 || !record.id ||
      typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt)) ||
      typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) {
    throw new Error('A saved lesson has invalid metadata.');
  }
  validateProject(record.project);
  if (record.title !== record.project.t) throw new Error('Saved lesson title does not match project.');
  return record;
}
export async function listLessons() {
  const records = await withStore('readonly', store => store.getAll());
  return records.map(ensureRecord).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
}
export async function getLesson(id) {
  const record = await withStore('readonly', store => store.get(id));
  return record ? ensureRecord(record) : null;
}
export async function saveLesson(project, id=null) {
  validateProject(project);
  const items = await listLessons();
  const old = id ? items.find(item=>item.id===id) : null;
  if (id && !old) throw new Error('This lesson no longer exists in the library. Use Save as New.');
  if (!old && items.length >= MAX_LIBRARY_ITEMS) throw new Error(`Library is full (${MAX_LIBRARY_ITEMS} lessons). Export a backup before deleting entries.`);
  const timestamp = new Date().toISOString();
  const record = ensureRecord({
    id:old?.id || newLessonId(), title:project.t,
    createdAt:old?.createdAt || timestamp, updatedAt:timestamp,
    project:structuredClone(project)
  });
  await withStore('readwrite',store=>store.put(record));
  return record;
}
export async function deleteLesson(id) {
  await withStore('readwrite',store=>store.delete(id));
}
export function prepareBackup(records) {
  if (!Array.isArray(records) || records.length > MAX_LIBRARY_ITEMS) throw new Error('Too many library lessons to export.');
  return {format:BACKUP_FORMAT,version:1,exportedAt:new Date().toISOString(),lessons:records.map(record=>{
    ensureRecord(record);
    return {title:record.title,createdAt:record.createdAt,updatedAt:record.updatedAt,project:structuredClone(record.project)};
  })};
}
export function parseBackup(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 16 MB size limit.');
  let parsed;
  try { parsed=JSON.parse(raw); } catch { throw new Error('Invalid JSON backup.'); }
  if (parsed?.format !== BACKUP_FORMAT || parsed?.version !== 1 || !Array.isArray(parsed.lessons)) throw new Error('This file is not an Anatomy Studio library backup.');
  if (parsed.lessons.length > MAX_LIBRARY_ITEMS) throw new Error('Backup has too many lessons.');
  // All entries must validate before any write; incoming IDs are intentionally ignored.
  return parsed.lessons.map(entry=>{
    if (!entry || entry.title !== entry.project?.t || typeof entry.title !== 'string') throw new Error('Invalid lesson title in backup.');
    return validateProject(entry.project);
  });
}
export async function restoreBackup(projects) {
  if (!Array.isArray(projects) || projects.length > MAX_LIBRARY_ITEMS) throw new Error('Invalid number of imported lessons.');
  projects.forEach(validateProject);
  const existing = await listLessons();
  if (existing.length + projects.length > MAX_LIBRARY_ITEMS) throw new Error('Not enough room in Scene Library for all imported lessons.');
  const imported = [];
  const db = await openDatabase();
  try {
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      const store=tx.objectStore(STORE);
      const now=new Date().toISOString();
      projects.forEach(project=>{
        const record={id:newLessonId(),title:project.t,createdAt:now,updatedAt:now,project:structuredClone(project)};
        imported.push(record);
        store.put(record);
      });
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error || new Error('Backup could not be imported.'));
      tx.onabort=()=>reject(tx.error || new Error('Backup import cancelled.'));
    });
  }finally {db.close();}
  return imported;
}
