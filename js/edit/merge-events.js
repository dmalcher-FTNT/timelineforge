import { sortEvents } from '../utils.js';

/** Fingerprint for deduplicating events on merge. */
export function eventFingerprint(event) {
  const details = (event.details || '').trim().slice(0, 120).toLowerCase();
  return `${event.timestampStart}|${event.hostname}|${event.username}|${details}`;
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
