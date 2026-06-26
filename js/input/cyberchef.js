import { generateId, inferCategory, parseFlexibleDate, sortEvents } from '../utils.js';
import { normalizeEvent } from './parser.js';
import { parseGenericCSV, parseGenericJSON } from './parser.js';

const COLUMN_ALIASES = {
  timestampStart: ['time', 'date', 'datetime', 'timestamp', 'date/time', 'date_time', 'event time', 'occurred'],
  hostname: ['host', 'hostname', 'computer', 'device', 'asset', 'system'],
  username: ['user', 'username', 'account', 'principal'],
  details: ['message', 'detail', 'details', 'description', 'event', 'text', 'comment', 'data'],
  category: ['category', 'type', 'event type', 'classification'],
};

function pickField(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const key = keys.find((k) => k.toLowerCase().trim() === alias);
    if (key && row[key]) return row[key];
  }
  return null;
}

function normalizeCyberChefRow(row) {
  if (!row || typeof row !== 'object') return null;
  const ts = pickField(row, COLUMN_ALIASES.timestampStart)
    || row.Time
    || row.Date
    || row.timestamp;
  const details = pickField(row, COLUMN_ALIASES.details) || JSON.stringify(row);
  if (!ts && !details) return null;

  return normalizeEvent({
    id: row.id || generateId(),
    timestampStart: parseFlexibleDate(ts) || ts || new Date().toISOString(),
    hostname: pickField(row, COLUMN_ALIASES.hostname) || 'N/A',
    username: pickField(row, COLUMN_ALIASES.username) || 'N/A',
    details: String(details),
    category: inferCategory(String(pickField(row, COLUMN_ALIASES.category) || details)),
    tags: ['cyberchef'],
  });
}

function parseCyberChefJson(text) {
  const root = typeof text === 'string' ? JSON.parse(text) : text;
  let rows = null;

  if (Array.isArray(root)) rows = root;
  else if (Array.isArray(root.results)) rows = root.results;
  else if (Array.isArray(root.data)) rows = root.data;
  else if (Array.isArray(root.events)) rows = root.events;
  else if (root.response && Array.isArray(root.response)) rows = root.response;

  if (!rows) return null;
  return sortEvents(rows.map(normalizeCyberChefRow).filter(Boolean));
}

/** Parse CyberChef table/JSON/CSV recipe output into timeline events. */
export function parseCyberChef(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const fromJson = parseCyberChefJson(trimmed);
      if (fromJson?.length) return fromJson;
    } catch {
      // fall through to CSV
    }
  }

  try {
    const fromGenericJson = parseGenericJSON(trimmed);
    if (fromGenericJson.length) return fromGenericJson;
  } catch {
    /* ignore */
  }

  const fromCsv = parseGenericCSV(trimmed);
  if (fromCsv.length) {
    return fromCsv.map((e) => normalizeEvent({ ...e, tags: [...new Set([...(e.tags || []), 'cyberchef'])] }));
  }

  return [];
}
