/** Max portable share URL length — modern browsers tolerate ~8k safely. */
export const MAX_SHARE_URL_LENGTH = 8000;

export function buildShareLink(compressed, origin, pathname) {
  return `${origin}${pathname}#data=${compressed}`;
}

export function assessShareLink(compressed, origin, pathname) {
  const url = buildShareLink(compressed, origin, pathname);
  return {
    url,
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
