import { CATEGORIES } from '../utils.js';

function icsDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line) {
  const max = 73;
  if (line.length <= max) return line;
  const parts = [];
  let rest = line;
  while (rest.length > max) {
    parts.push(rest.slice(0, max));
    rest = rest.slice(max);
  }
  if (rest) parts.push(rest);
  return parts.join('\r\n ');
}

/** Build iCalendar (.ics) text from a timeline object. */
export function buildICalContent(timeline) {
  const meta = timeline.meta || {};
  const now = icsDate(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimelineForge//IR Timeline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeIcs(meta.title || 'Incident Timeline')}`),
  ];

  (timeline.events || []).forEach((e) => {
    const start = icsDate(e.timestampStart);
    if (!start) return;
    const cat = CATEGORIES[e.category]?.label || e.category || '';
    const summary = `${e.hostname || 'N/A'} — ${cat}`.trim();
    const description = [
      e.details,
      e.username && e.username !== 'N/A' ? `User: ${e.username}` : '',
      e.technique ? `MITRE: ${e.technique}` : '',
      e.source ? `Source: ${e.source}` : '',
      e.evidence ? `Evidence: ${e.evidence}` : '',
    ].filter(Boolean).join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcs(e.id)}@timelineforge`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${start}`);
    const end = e.timestampEnd ? icsDate(e.timestampEnd) : null;
    if (end && end > start) lines.push(`DTEND:${end}`);
    lines.push(foldLine(`SUMMARY:${escapeIcs(summary)}`));
    if (description) lines.push(foldLine(`DESCRIPTION:${escapeIcs(description)}`));
    if (e.hostname && e.hostname !== 'N/A') {
      lines.push(foldLine(`LOCATION:${escapeIcs(e.hostname)}`));
    }
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Export timeline events as iCalendar (.ics) download. */
export function exportICal(timeline) {
  const blob = new Blob([buildICalContent(timeline)], { type: 'text/calendar;charset=utf-8' });
  const name = (timeline.meta?.title || 'timeline').replace(/\s+/g, '-').toLowerCase();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}
