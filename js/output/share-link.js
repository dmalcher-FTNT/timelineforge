/** Max portable share URL length — modern browsers tolerate ~8k safely. */
export const MAX_SHARE_URL_LENGTH = 8000;

/** Normalize pathname for stable share URLs (GitHub Pages, index.html, trailing slash). */
export function normalizeSharePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  let base = pathname.replace(/\/index\.html$/i, '/');
  if (!base.endsWith('/')) base += '/';
  return base;
}

/**
 * Resolve the share link base from the current page location.
 * Works on GitHub Pages, localhost, or any static host — no hardcoded deploy URL.
 * @param {Pick<Location, 'origin'|'pathname'|'host'>|null} [location]
 */
export function resolveShareBaseUrl(location = null) {
  const loc = location || (typeof window !== 'undefined' ? window.location : null);
  if (!loc) {
    return { origin: '', pathname: '/', baseUrl: '/', host: '' };
  }
  const origin = loc.origin || '';
  const pathname = normalizeSharePath(loc.pathname || '/');
  const host = loc.host || '';
  return { origin, pathname, host, baseUrl: `${origin}${pathname}` };
}

/** Strip redundant bulk before URL encoding — sourceText duplicates serialized events. */
export function prepareTimelineForShare(timeline) {
  if (!timeline) return timeline;
  const meta = { ...(timeline.meta || {}) };
  delete meta.sourceText;
  return { ...timeline, meta, events: timeline.events || [] };
}

export function buildShareLink(compressed, origin, pathname, host = '') {
  const { baseUrl } = resolveShareBaseUrl({ origin, pathname, host });
  return `${baseUrl}#data=${compressed}`;
}

export function assessShareLink(compressed, origin, pathname, host = '') {
  const { baseUrl } = resolveShareBaseUrl({ origin, pathname, host });
  const url = `${baseUrl}#data=${compressed}`;
  return {
    url,
    host,
    baseUrl,
    tooLarge: url.length > MAX_SHARE_URL_LENGTH,
    length: url.length,
    maxLength: MAX_SHARE_URL_LENGTH,
  };
}

export function shareIdFromHash(hash) {
  const match = hash.match(/share=([^&]+)/);
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  if (value.startsWith('data,') || value.includes('=')) return null;
  return value;
}
