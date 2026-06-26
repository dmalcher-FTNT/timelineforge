import LZString from '../../vendor/lz-string.mjs';
import { idbSupported, loadShareTimeline, storeShareTimeline } from '../share-store.js';
import { assessShareLink, MAX_SHARE_URL_LENGTH, shareIdFromHash } from './share-link.js';

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString;

export { assessShareLink, MAX_SHARE_URL_LENGTH, buildShareLink } from './share-link.js';

function originPath() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  return { origin, pathname };
}

/** Encode timeline for sharing — portable #data= URL when it fits. */
export async function encodeShareLink(timeline) {
  const compressed = compressToEncodedURIComponent(JSON.stringify(timeline));
  const { origin, pathname } = originPath();
  const inline = assessShareLink(compressed, origin, pathname);

  if (!inline.tooLarge) {
    return { ...inline, mode: 'inline' };
  }

  return { ...inline, tooLarge: true, mode: 'inline' };
}

/** Short #share=id link stored in IndexedDB — same browser only. */
export async function encodeLocalShareLink(timeline) {
  if (!idbSupported()) {
    return { tooLarge: true, mode: 'stored', url: '', length: 0, maxLength: MAX_SHARE_URL_LENGTH };
  }
  const id = await storeShareTimeline(timeline);
  const { origin, pathname } = originPath();
  const url = `${origin}${pathname}#share=${id}`;
  return {
    url,
    tooLarge: false,
    mode: 'stored',
    shareId: id,
    length: url.length,
    maxLength: MAX_SHARE_URL_LENGTH,
  };
}

export function decodeShareLinkInline(hash) {
  const match = hash.match(/data=([^&]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decompressFromEncodedURIComponent(match[1]));
  } catch {
    return null;
  }
}

export { shareIdFromHash } from './share-link.js';

export async function decodeShareLink(hash) {
  const inline = decodeShareLinkInline(hash);
  if (inline) return inline;

  const id = shareIdFromHash(hash);
  if (id && idbSupported()) {
    return loadShareTimeline(id);
  }
  return null;
}
