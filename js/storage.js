const STORAGE_KEY = 'timelineforge-draft';
const LEGACY_DRAFT_KEY = 'chronicle-ir-draft';

function migrateStorageKey(newKey, oldKey) {
  try {
    if (localStorage.getItem(newKey)) return;
    const legacy = localStorage.getItem(oldKey);
    if (legacy) {
      localStorage.setItem(newKey, legacy);
      localStorage.removeItem(oldKey);
    }
  } catch {
    /* private browsing */
  }
}

export function migrateLegacyStorage() {
  migrateStorageKey(STORAGE_KEY, LEGACY_DRAFT_KEY);
}

export function saveDraft(timeline, compareTimeline = null) {
  migrateLegacyStorage();
  const payload = { savedAt: Date.now(), timeline, compareTimeline };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    import('./share-store.js').then(({ storeDraftBackup, idbSupported }) => {
      if (idbSupported()) storeDraftBackup(payload);
    });
  }
}

export async function loadDraftAsync() {
  migrateLegacyStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.timeline) return data;
    }
  } catch {
    /* fall through */
  }
  try {
    const { loadDraftBackup, idbSupported } = await import('./share-store.js');
    if (idbSupported()) return loadDraftBackup();
  } catch {
    /* private browsing */
  }
  return null;
}

export function loadDraft() {
  migrateLegacyStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.timeline ? data : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_DRAFT_KEY);
}

export function draftAgeLabel(savedAt) {
  if (!savedAt) return '';
  const mins = Math.round((Date.now() - savedAt) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export { STORAGE_KEY, LEGACY_DRAFT_KEY };
