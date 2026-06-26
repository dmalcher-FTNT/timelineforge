import { formatDateRange, parseFlexibleDate } from '../utils.js';
import { eventsToMarkdownTable } from '../output/table-export.js';

function formatManualTimestamp(iso, timezone = 'UTC') {
  if (!iso) return 'N/A';
  const parsed = parseFlexibleDate(iso) || iso;
  const d = new Date(parsed);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
  const parts = d.toLocaleString('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return parts.replace('T', ' ').slice(0, 16);
}

/** One manual snippet line per event (preserves timeline row order). */
export function eventsToManualSnippets(events, timezone = 'UTC') {
  return events.map((e) => {
    const start = formatManualTimestamp(e.timestampStart, timezone);
    const date = e.timestampEnd
      ? `${start} → ${formatManualTimestamp(e.timestampEnd, timezone)}`
      : start;
    const host = e.hostname || 'N/A';
    const user = e.username || 'N/A';
    const details = (e.details || '').replace(/\s+/g, ' ').trim() || '—';
    return `${date} — ${host} — ${user} — ${details}`;
  }).join('\n');
}

/** Full-fidelity JSON for round-trip after IR/report imports or json mode. */
export function eventsToStructuredJson(timeline) {
  const { meta, events } = timeline;
  const payload = {
    meta: {
      title: meta?.title || 'Incident Timeline',
      subtitle: meta?.subtitle || '',
      timezone: meta?.timezone || 'UTC',
    },
    events: events.map((e) => ({
      id: e.id,
      timestampStart: e.timestampStart,
      timestampEnd: e.timestampEnd || null,
      hostname: e.hostname || 'N/A',
      username: e.username || 'N/A',
      details: e.details || '',
      category: e.category,
      phase: e.phase,
      technique: e.technique || '',
      source: e.source || '',
      evidence: e.evidence || '',
      linkedEventIds: e.linkedEventIds || [],
      tags: e.tags || [],
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Serialize timeline events back to source text for the active input mode.
 * import/report use structured JSON so EDIT changes round-trip with full fields.
 */
export function serializeEventsToSource(timeline, mode) {
  const tz = timeline.meta?.timezone || 'UTC';
  const events = timeline.events || [];

  switch (mode) {
    case 'table':
      return eventsToMarkdownTable(events, tz, { preserveOrder: true });
    case 'structured':
      return eventsToStructuredJson(timeline);
    case 'manual':
    default:
      return eventsToManualSnippets(events, tz);
  }
}

/** Map UI input mode to serialization format. */
export function sourceFormatForInputMode(inputMode) {
  if (inputMode === 'table') return 'table';
  if (inputMode === 'import' || inputMode === 'report') return 'structured';
  return 'manual';
}
