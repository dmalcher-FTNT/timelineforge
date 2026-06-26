import { sortEvents } from '../utils.js';

/** Fingerprint for deduplicating events on merge. */
export function eventFingerprint(event) {
  const details = (event.details || '').trim().slice(0, 120).toLowerCase();
  return `${event.timestampStart}|${event.hostname}|${event.username}|${details}`;
}

/**
 * Remove duplicate events (same timestamp, host, user, details prefix).
 * Keeps the first occurrence; merges tags and empty source/evidence from later rows.
 * @returns {{ events: import('../utils.js').TimelineEvent[], removed: number }}
 */
export function collapseDuplicateEvents(events) {
  const indexByFp = new Map();
  const result = [];
  let removed = 0;

  (events || []).forEach((event) => {
    const fp = eventFingerprint(event);
    const idx = indexByFp.get(fp);
    if (idx !== undefined) {
      removed += 1;
      const survivor = result[idx];
      const tags = new Set([...(survivor.tags || []), ...(event.tags || [])]);
      survivor.tags = [...tags];
      if (!survivor.source && event.source) survivor.source = event.source;
      if (!survivor.evidence && event.evidence) survivor.evidence = event.evidence;
      return;
    }
    indexByFp.set(fp, result.length);
    result.push({ ...event });
  });

  return { events: sortEvents(result), removed };
}

/** Count events that would be removed by collapseDuplicateEvents. */
export function countDuplicateEvents(events) {
  const seen = new Set();
  let dupes = 0;
  (events || []).forEach((event) => {
    const fp = eventFingerprint(event);
    if (seen.has(fp)) dupes += 1;
    else seen.add(fp);
  });
  return dupes;
}

/**
 * Merge incoming events into an existing list.
 * @param {import('../utils.js').TimelineEvent[]} existing
 * @param {import('../utils.js').TimelineEvent[]} incoming
 * @param {{ dedupe?: boolean }} opts
 */
export function mergeTimelineEvents(existing, incoming, { dedupe = true } = {}) {
  const merged = [...existing];
  const seen = new Set(existing.map(eventFingerprint));
  incoming.forEach((event) => {
    const fp = eventFingerprint(event);
    if (dedupe && seen.has(fp)) return;
    seen.add(fp);
    merged.push(event);
  });
  return sortEvents(merged);
}
