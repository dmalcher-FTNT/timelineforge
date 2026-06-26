const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const URL = /\bhttps?:\/\/[^\s<>"']+/gi;
const MD5 = /\b[a-fA-F0-9]{32}\b/g;
const SHA1 = /\b[a-fA-F0-9]{40}\b/g;
const SHA256 = /\b[a-fA-F0-9]{64}\b/g;
const DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|local|internal|corp|io|edu|gov|uk|de|azure|aws|cloud)\b/gi;

const PRIVATE_IP_PREFIX = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function fieldText(event) {
  return [event.details, event.evidence, event.source, event.hostname, event.username]
    .filter(Boolean)
    .join(' ');
}

function addFinding(map, type, value, eventId, eventIndex) {
  const key = value.toLowerCase();
  if (!map.has(key)) {
    map.set(key, { type, value, eventIds: new Set(), eventIndexes: new Set() });
  }
  const row = map.get(key);
  row.eventIds.add(eventId);
  row.eventIndexes.add(eventIndex);
}

function scanField(map, type, regex, text, eventId, eventIndex) {
  if (!text) return;
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const re = new RegExp(regex.source, flags);
  let match;
  while ((match = re.exec(text)) !== null) {
    addFinding(map, type, match[0], eventId, eventIndex);
  }
}

/**
 * Extract IOC-style observables from timeline events.
 * @param {import('../utils.js').TimelineEvent[]} events
 */
export function extractObservables(events) {
  const map = new Map();

  (events || []).forEach((event, index) => {
    const text = fieldText(event);
    if (!text) return;
    const eventIndex = index + 1;

    scanField(map, 'ip', IPV4, text, event.id, eventIndex);
    scanField(map, 'email', EMAIL, text, event.id, eventIndex);
    scanField(map, 'url', URL, text, event.id, eventIndex);
    scanField(map, 'md5', MD5, text, event.id, eventIndex);
    scanField(map, 'sha1', SHA1, text, event.id, eventIndex);
    scanField(map, 'sha256', SHA256, text, event.id, eventIndex);
    scanField(map, 'domain', DOMAIN, text, event.id, eventIndex);
  });

  const rows = [...map.values()].map((row) => ({
    type: row.type,
    value: row.value,
    eventCount: row.eventIds.size,
    eventIndexes: [...row.eventIndexes].sort((a, b) => a - b),
  }));

  const byType = (type) => rows
    .filter((r) => r.type === type)
    .sort((a, b) => b.eventCount - a.eventCount || a.value.localeCompare(b.value));

  return {
    all: rows.sort((a, b) => a.type.localeCompare(b.type) || a.value.localeCompare(b.value)),
    ips: byType('ip'),
    emails: byType('email'),
    domains: byType('domain'),
    urls: byType('url'),
    hashes: rows
      .filter((r) => ['md5', 'sha1', 'sha256'].includes(r.type))
      .sort((a, b) => b.eventCount - a.eventCount || a.value.localeCompare(b.value)),
    publicIps: byType('ip').filter((r) => !PRIVATE_IP_PREFIX.test(r.value)),
    total: rows.length,
  };
}

export function observablesToCsv(observables) {
  const lines = ['type,value,event_count,event_numbers'];
  observables.all.forEach((row) => {
    const value = `"${row.value.replace(/"/g, '""')}"`;
    lines.push(`${row.type},${value},${row.eventCount},"${row.eventIndexes.join(';')}"`);
  });
  return lines.join('\n');
}

export function observablesToText(observables) {
  const sections = [
    ['IP addresses', observables.ips],
    ['Domains', observables.domains],
    ['URLs', observables.urls],
    ['Hashes', observables.hashes],
    ['Emails', observables.emails],
  ];
  return sections
    .filter(([, items]) => items.length)
    .map(([title, items]) => `${title}\n${items.map((i) => i.value).join('\n')}`)
    .join('\n\n');
}
