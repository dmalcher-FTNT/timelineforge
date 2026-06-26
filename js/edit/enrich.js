import { inferTechnique } from '../data/mitre-techniques.js';
import { inferPhase } from '../utils.js';

/** Fill missing technique, phase, and linkedEventIds (sequential chain) on parsed events. */
export function enrichEvents(events, { autoLink = false } = {}) {
  const enriched = events.map((e) => ({
    ...e,
    technique: e.technique || inferTechnique(e.details),
    phase: e.phase || inferPhase(e),
    linkedEventIds: e.linkedEventIds || [],
    tags: e.tags || [],
  }));

  if (autoLink && enriched.length > 1) return linkSequentialEvents(enriched);
  return enriched;
}

/** Chain each event to the next when no explicit links exist (for Attack flow viz). */
export function linkSequentialEvents(events) {
  if (events.length < 2) return events.map((e) => ({ ...e, linkedEventIds: e.linkedEventIds || [] }));
  return events.map((e, i) => {
    const linkedEventIds = e.linkedEventIds || [];
    if (i < events.length - 1 && !linkedEventIds.length) {
      return { ...e, linkedEventIds: [events[i + 1].id] };
    }
    return { ...e, linkedEventIds };
  });
}
