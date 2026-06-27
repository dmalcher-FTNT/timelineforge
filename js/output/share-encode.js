import { idbSupported, loadShareTimeline, storeShareTimeline } from '../share-store.js';
import {
  assessShareLink,
  MAX_SHARE_URL_LENGTH,
  shareIdFromHash,
  prepareTimelineForShare,
  resolveShareBaseUrl,
} from './share-link.js';
import { compressTimelineJson, decompressTimelinePayload } from './share-compress.js';

export {
  assessShareLink,
  MAX_SHARE_URL_LENGTH,
  buildShareLink,
  prepareTimelineForShare,
  normalizeSharePath,
  resolveShareBaseUrl,
} from './share-link.js';

export { compressTimelineJson, decompressTimelinePayload, SHARE_CODEC_V2_PREFIX } from './share-compress.js';

/** Encode timeline for sharing — compressed #data= URL when it fits. */
export async function encodeShareLink(timeline) {
  const payload = prepareTimelineForShare(timeline);
  const compressed = compressTimelineJson(JSON.stringify(payload));
  const { origin, pathname, host } = resolveShareBaseUrl();
  const inline = assessShareLink(compressed, origin, pathname, host);

  if (!inline.tooLarge) {
    return { ...inline, mode: 'inline' };
  }

  return { ...inline, tooLarge: true, mode: 'inline' };
}

/** @deprecated Same-browser only — not exposed in UI; kept for decode of old #share= links. */
export async function encodeLocalShareLink(timeline) {
  if (!idbSupported()) {
    return { tooLarge: true, mode: 'stored', url: '', length: 0, maxLength: MAX_SHARE_URL_LENGTH };
  }
  const payload = prepareTimelineForShare(timeline);
  const id = await storeShareTimeline(payload);
  const { baseUrl, host } = resolveShareBaseUrl();
  const url = `${baseUrl}#share=${id}`;
  return {
    url,
    host,
    baseUrl,
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
    return decompressTimelinePayload(match[1]);
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
