import { deflateSync, inflateSync } from '../../vendor/fflate.mjs';
import LZString from '../../vendor/lz-string.mjs';

/** Prefix for deflate + base64url share payloads (v2). Legacy v1 has no prefix (LZ-String). */
export const SHARE_CODEC_V2_PREFIX = '2.';

function utf8Encode(text) {
  return new TextEncoder().encode(text);
}

function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

export function bytesToBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Compress timeline JSON for #data= hash links (deflate — ~half the size of LZ-String v1). */
export function compressTimelineJson(json) {
  return SHARE_CODEC_V2_PREFIX + bytesToBase64Url(deflateSync(utf8Encode(json)));
}

/** Decompress v2 deflate or legacy v1 LZ-String share payloads. */
export function decompressTimelinePayload(payload) {
  if (payload.startsWith(SHARE_CODEC_V2_PREFIX)) {
    const json = utf8Decode(inflateSync(base64UrlToBytes(payload.slice(SHARE_CODEC_V2_PREFIX.length))));
    return JSON.parse(json);
  }
  const json = LZString.decompressFromEncodedURIComponent(payload);
  if (!json) throw new Error('Invalid legacy share payload');
  return JSON.parse(json);
}
