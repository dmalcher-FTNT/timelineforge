import { formatDateRange, sortEvents } from '../utils.js';
import { exportBasename, exportTitle } from './export-names.js';

export function eventsToMarkdownTable(events, timezone = 'UTC', opts = {}) {
  const sorted = opts.preserveOrder ? events : sortEvents(events);
  const tzOpts = { timezone, seconds: false };
  const lines = [
    '| DATE/TIME | HOSTNAME | USERNAME | MITRE | DETAILS |',
    '| --- | --- | --- | --- | --- |',
  ];
  sorted.forEach((e) => {
    const date = formatDateRange(e.timestampStart, e.timestampEnd, tzOpts);
    const row = [
      date,
      e.hostname || 'N/A',
      e.username || 'N/A',
      e.technique || '',
      (e.details || '').replace(/\|/g, '\\|').replace(/\n/g, ' '),
    ];
    lines.push(`| ${row.join(' | ')} |`);
  });
  return lines.join('\n');
}

export function eventsToCSV(events) {
  const sorted = sortEvents(events);
  const esc = (s) => {
    const v = String(s ?? '').replace(/"/g, '""');
    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
  };
  const header = 'timestamp_start,timestamp_end,hostname,username,category,phase,technique,source,evidence,details,tags';
  const rows = sorted.map((e) => [
    e.timestampStart,
    e.timestampEnd || '',
    e.hostname,
    e.username,
    e.category,
    e.phase,
    e.technique || '',
    e.source || '',
    e.evidence || '',
    e.details,
    (e.tags || []).join(';'),
  ].map(esc).join(','));
  return [header, ...rows].join('\n');
}

export function downloadText(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportMarkdown(timeline) {
  const tz = timeline.meta?.timezone || 'UTC';
  const title = exportTitle(timeline.meta);
  const table = eventsToMarkdownTable(timeline.events, tz);
  const md = title ? `# ${title}\n\n${table}` : table;
  downloadText(md, `${exportBasename(timeline.meta)}.md`, 'text/markdown');
}

export function exportCSV(timeline) {
  downloadText(eventsToCSV(timeline.events), `${exportBasename(timeline.meta)}.csv`, 'text/csv');
}
