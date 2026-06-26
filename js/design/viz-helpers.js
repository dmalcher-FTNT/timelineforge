import { formatDateRange, sortEvents } from '../utils.js';

export { truncate, displayText, normalizeText, truncateWords, wrapSvgLines, TEXT_LIMITS } from './text-layout.js';
export { displayEventDetails, dedupeEventDetails } from '../event-details.js';

export function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Optional export title — omitted when blank or placeholder. */
export function vizTitleHtml(meta) {
  const title = (meta?.title || '').trim();
  if (!title || title === 'New Incident') return '';
  return `<h2>${escapeHtml(title)}</h2>`;
}

export function computePhaseSummaries(events, phaseDefs) {
  return phaseDefs.map((p) => {
    const phaseEvents = events.filter((e) => e.phase === p.id);
    let range = p.range;
    if (phaseEvents.length) {
      const starts = phaseEvents.map((e) => Date.parse(e.timestampStart)).filter(Boolean);
      const ends = phaseEvents.flatMap((e) => [Date.parse(e.timestampStart), e.timestampEnd ? Date.parse(e.timestampEnd) : null]).filter(Boolean);
      const min = new Date(Math.min(...starts));
      const max = new Date(Math.max(...ends));
      const fmt = (d) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      range = `${fmt(min)} – ${fmt(max)}`;
    }
    return { ...p, events: phaseEvents, range };
  });
}

export function orderEventsForViz(events) {
  return sortEvents(events);
}
