const DB_NAME = 'timelineforge';
const DB_VERSION = 1;
const SHARES = 'shares';
const DRAFTS = 'drafts';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SHARES)) {
        db.createObjectStore(SHARES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DRAFTS)) {
        db.createObjectStore(DRAFTS, { keyPath: 'id' });
      }
    };
  });
}

/** Store a timeline for share-by-id links. Returns the id. */
export async function storeShareTimeline(timeline) {
  const id = crypto.randomUUID();
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SHARES, 'readwrite');
    tx.objectStore(SHARES).put({ id, timeline, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function loadShareTimeline(id) {
  const db = await openDb();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(SHARES, 'readonly');
    const req = tx.objectStore(SHARES).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record?.timeline || null;
}

/** Fallback when localStorage draft quota is exceeded. */
export async function storeDraftBackup(payload) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFTS, 'readwrite');
    tx.objectStore(DRAFTS).put({ id: 'primary', ...payload, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDraftBackup() {
  const db = await openDb();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFTS, 'readonly');
    const req = tx.objectStore(DRAFTS).get('primary');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!record?.timeline) return null;
  return { savedAt: record.savedAt, timeline: record.timeline, compareTimeline: record.compareTimeline || null };
}

export function idbSupported() {
  return typeof indexedDB !== 'undefined';
}
