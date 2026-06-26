import { generateId, inferCategory, inferPhase, parseFlexibleDate, sortEvents } from '../utils.js';
import { dedupeEventDetails, narrativeFromManualLine, splitStructuredManualLine } from '../event-details.js';

export function parseMarkdownTable(text) {
  const lines = text.trim().split('\n').filter((l) => l.trim() && !/^\|[-\s|:]+\|$/.test(l.trim()));
  if (lines.length < 2) return [];

  const header = lines[0].split('|').map((c) => c.trim().toLowerCase()).filter(Boolean);
  const dateIdx = header.findIndex((h) => /date|time/.test(h));
  const hostIdx = header.findIndex((h) => /host/.test(h));
  const userIdx = header.findIndex((h) => /user/.test(h));
  const detailIdx = header.findIndex((h) => /detail|description|event/.test(h));

  return lines.slice(1).map((line) => {
    const cols = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);
    const dateRaw = cols[dateIdx >= 0 ? dateIdx : 0] || '';
    const [startRaw, endRaw] = dateRaw.split(/\s→\s|\sand\s/i).map((s) => s.trim());

    return normalizeEvent({
      timestampStart: parseFlexibleDate(startRaw) || startRaw,
      timestampEnd: endRaw ? parseFlexibleDate(endRaw) : null,
      hostname: cols[hostIdx >= 0 ? hostIdx : 1] || 'N/A',
      username: cols[userIdx >= 0 ? userIdx : 2] || 'N/A',
      details: cols[detailIdx >= 0 ? detailIdx : 3] || cols.slice(-1)[0] || '',
    });
  });
}

export function parseManualSnippets(text) {
  const events = [];
  const lines = text.split('\n').filter((l) => l.trim());

  const datePattern = /(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}(?::\d{2})?))?/gi;

  lines.forEach((line) => {
    const structured = splitStructuredManualLine(line);
    const dateSource = structured?.dateText || line;
    const dates = [...dateSource.matchAll(datePattern)];
    if (!dates.length) return;

    const firstDate = dates[0];
    const start = parseFlexibleDate(firstDate[0]);
    const end = dates[1] ? parseFlexibleDate(dates[1][0]) : null;

    const hostMatch = line.match(/\b(?:HOST|SERVER|WORKSTATION|DC|VPN)[-_]?\w+/i);
    const userMatch = line.match(/\b(?:DOMAIN|LOCAL)\\[\w-]+/i);
    const hostname = structured?.hostname || (hostMatch ? hostMatch[0].toUpperCase() : 'N/A');
    const username = structured?.username || (userMatch ? userMatch[0] : 'N/A');

    events.push(normalizeEvent({
      timestampStart: start || firstDate[0],
      timestampEnd: end,
      hostname,
      username,
      details: narrativeFromManualLine(line, {
        timestampStart: start || firstDate[0],
        timestampEnd: end,
        hostname,
        username,
      }),
    }));
  });

  return events;
}

export function parseGenericCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  return lines.slice(1).map((line) => {
    const cols = splitCSVLine(line);
    const row = {};
    header.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, ''); });

    const dateField = row['date/time (utc)'] || row.timestamp || row.date || row.time || '';
    const [startRaw, endRaw] = dateField.split(/\s→\s|\sto\s/i);

    return normalizeEvent({
      timestampStart: parseFlexibleDate(startRaw) || startRaw,
      timestampEnd: endRaw ? parseFlexibleDate(endRaw) : null,
      hostname: row.hostname || row.host || 'N/A',
      username: row.username || row.user || 'N/A',
      details: row.details || row.description || row.event || '',
    });
  });
}

export function parseGenericJSON(text) {
  const data = JSON.parse(text);
  const events = Array.isArray(data) ? data : data.events || [];
  return events.map((e) => normalizeEvent(e));
}

export function parsePdfPlainText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const events = [];

  const rowPattern = /^(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?(?:\s*(?:→|–|-)\s*\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)?)\s+(\S+)\s+(\S+)\s+(.+)$/;

  lines.forEach((line) => {
    const m = line.match(rowPattern);
    if (!m) return;
    const [startRaw, endRaw] = m[1].split(/\s*(?:→|–)\s*/).map((s) => s.trim());
    events.push(normalizeEvent({
      timestampStart: parseFlexibleDate(startRaw) || startRaw,
      timestampEnd: endRaw ? parseFlexibleDate(endRaw) : null,
      hostname: m[2],
      username: m[3],
      details: narrativeFromManualLine(m[4], {
        timestampStart: parseFlexibleDate(startRaw) || startRaw,
        timestampEnd: endRaw ? parseFlexibleDate(endRaw) : null,
        hostname: m[2],
        username: m[3],
      }),
    }));
  });

  return events.length ? events : parseManualSnippets(text);
}

export function parseReportText(text) {
  const fromTables = [];
  for (const block of extractPipeTables(text)) {
    fromTables.push(...parseMarkdownTable(block));
  }
  if (fromTables.length) return fromTables;

  const whitespace = parseWhitespaceTimelineTable(text);
  if (whitespace.length) return whitespace;

  const pdfParsed = parsePdfPlainText(text);
  if (pdfParsed.length) return pdfParsed;

  const events = [];
  const blocks = text.split(/\n(?=\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
  blocks.forEach((block) => {
    events.push(...parseManualSnippets(block));
  });
  return events;
}

/** Find all GitHub-style pipe tables in report text. */
export function extractPipeTables(text) {
  const tables = [];
  const re = /\|[^\n]+\|\n\|[-\s|:]+\|\n(?:\|[^\n]+\|\n?)+/g;
  let match;
  while ((match = re.exec(text))) tables.push(match[0]);
  return tables;
}

/** Parse PDF/DOCX plain-text tables with space or tab columns (no pipe chars). */
export function parseWhitespaceTimelineTable(text) {
  const lines = text.split('\n');
  const headerIdx = lines.findIndex((line) => {
    const lower = line.toLowerCase();
    return /date|time/.test(lower) && /host/.test(lower);
  });
  if (headerIdx < 0) return [];

  const header = splitTableColumns(lines[headerIdx]).map((c) => c.toLowerCase());
  if (!header.some((h) => /date|time/.test(h)) || !header.some((h) => /host/.test(h))) return [];

  const events = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');
    if (!line.trim()) break;
    if (/^appendix|^page \d+|^figure \d+|^table \d+/i.test(line.trim())) break;
    if (!/\d{4}[-/]|\d{1,2}[/.-]\d{1,2}/.test(line)) break;

    const parsed = parseWhitespaceDataLine(line);
    if (!parsed) continue;

    events.push(normalizeEvent({
      timestampStart: parseFlexibleDate(parsed.startRaw) || parsed.startRaw,
      timestampEnd: parsed.endRaw ? parseFlexibleDate(parsed.endRaw) : null,
      hostname: parsed.hostname || 'N/A',
      username: parsed.username || 'N/A',
      details: parsed.details || '',
    }));
  }
  return events;
}

function parseWhitespaceDataLine(line) {
  const dateMatch = line.match(
    /^(\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?(?:\s*(?:→|–|-)\s*\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)?|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/,
  );
  if (!dateMatch) return null;

  const dateRaw = dateMatch[1].trim();
  const [startRaw, endRaw] = dateRaw.split(/\s*(?:→|–|-)\s*/).map((s) => s.trim());
  const rest = line.slice(dateMatch[0].length).trim();
  const cols = splitTableColumns(rest);
  if (!cols.length) return null;

  return {
    startRaw,
    endRaw,
    hostname: cols[0] || 'N/A',
    username: cols[1] || 'N/A',
    details: cols.slice(2).join(' ') || cols[cols.length - 1] || '',
  };
}

function splitTableColumns(line) {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim()).filter(Boolean);
  return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

function normalizeEvent(raw) {
  const rawDetails = raw.details || raw.description || '';
  const timestampStart = typeof raw.timestampStart === 'string' && raw.timestampStart.includes('T')
    ? raw.timestampStart
    : parseFlexibleDate(raw.timestampStart) || raw.timestampStart;
  const timestampEnd = raw.timestampEnd
    ? (typeof raw.timestampEnd === 'string' && raw.timestampEnd.includes('T')
      ? raw.timestampEnd
      : parseFlexibleDate(raw.timestampEnd))
    : null;
  const hostname = raw.hostname || 'N/A';
  const username = raw.username || 'N/A';
  const details = dedupeEventDetails({
    timestampStart,
    timestampEnd,
    hostname,
    username,
    details: rawDetails,
  });

  const event = {
    id: raw.id || generateId(),
    timestampStart,
    timestampEnd,
    hostname,
    username,
    details,
    category: raw.category || inferCategory(details || rawDetails),
    phase: raw.phase || null,
    technique: raw.technique || '',
    source: raw.source || '',
    evidence: raw.evidence || '',
    linkedEventIds: raw.linkedEventIds || [],
    tags: raw.tags || [],
  };
  event.phase = inferPhase(event);
  return event;
}

export { normalizeEvent };

export function processInput({ mode, text, fileName }) {
  let events = [];
  if (mode === 'manual') events = parseManualSnippets(text);
  else if (mode === 'table') events = parseMarkdownTable(text);
  else if (mode === 'csv' || (fileName && fileName.endsWith('.csv'))) events = parseGenericCSV(text);
  else if (mode === 'json' || (fileName && fileName.endsWith('.json'))) events = parseGenericJSON(text);
  else if (mode === 'report') events = parseReportText(text);
  else events = parseManualSnippets(text);

  return sortEvents(events.filter((e) => e.details || e.timestampStart));
}

/** Parse with row/line attempt counts for partial-success feedback. */
export function processInputDetailed({ mode, text, fileName }) {
  const events = processInput({ mode, text, fileName });
  let attempted = events.length;
  if (mode === 'manual') {
    attempted = text.split('\n').filter((l) => l.trim()).length;
  } else if (mode === 'table') {
    attempted = Math.max(0, text.split('\n').filter((l) => l.trim() && !/^\|?\s*[-:]+/.test(l.trim())).length - 1);
  } else if (mode === 'report') {
    attempted = text.split('\n').filter((l) => /\d{4}[-/]|\d{1,2}\s+\w+\s+\d{4}/.test(l)).length;
  }
  const skipped = Math.max(0, attempted - events.length);
  return { events, attempted, parsed: events.length, skipped };
}

/** Human-readable hint when parsing yields no events. */
export function parseInputHint(mode) {
  const hints = {
    manual: 'No events found — each line needs a date (e.g. 2024-10-03 10:19) and event text.',
    table: 'No table rows parsed — check the header row includes DATE/TIME, HOSTNAME, and DETAILS columns.',
    import: 'No events parsed — verify the export format matches the selected IR tool.',
    report: 'No dated events in report text — try a timeline table or lines starting with dates.',
    json: 'No events in JSON — use { "events": [ … ] } or a bare array of event objects.',
  };
  return hints[mode] || hints.manual;
}
