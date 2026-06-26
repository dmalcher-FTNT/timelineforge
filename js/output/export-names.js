/** Optional export title from timeline meta (blank when unset). */
export function exportTitle(meta) {
  return (meta?.title || '').trim();
}

/** Filename stem for downloads — always a safe non-empty slug. */
export function exportBasename(meta) {
  const title = exportTitle(meta);
  if (!title) return 'timeline';
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'timeline';
}
