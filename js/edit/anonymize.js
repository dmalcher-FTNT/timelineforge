import { generateId } from '../utils.js';

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|local|internal|corp|io|edu|gov)\b/gi;
const DOMAIN_USER = /\b(?:[A-Za-z0-9._-]+\\[A-Za-z0-9._-]+)\b/g;
const HOSTLIKE = /\b(?:HOST|SERVER|WORKSTATION|DC|VPN|DEVICE|SECURITY-TOOL)-[A-Z0-9-]+\b/gi;

export function scanTimeline(timeline) {
  const findings = { ips: new Set(), emails: new Set(), domains: new Set(), users: new Set(), hosts: new Set() };
  const text = JSON.stringify(timeline.events);

  (text.match(IPV4) || []).forEach((v) => findings.ips.add(v));
  (text.match(EMAIL) || []).forEach((v) => findings.emails.add(v));
  (text.match(DOMAIN) || []).forEach((v) => findings.domains.add(v));
  (text.match(DOMAIN_USER) || []).forEach((v) => findings.users.add(v));
  (text.match(HOSTLIKE) || []).forEach((v) => findings.hosts.add(v.toUpperCase()));

  timeline.events.forEach((e) => {
    (e.hostname || '').split(/[;,]/).forEach((h) => {
      const t = h.trim();
      if (t && t !== 'N/A' && t !== 'Multiple') findings.hosts.add(t);
    });
    (e.username || '').split(/[;,]/).forEach((u) => {
      const t = u.trim();
      if (t && t !== 'N/A' && t !== 'Multiple') findings.users.add(t);
    });
  });

  return {
    ips: [...findings.ips],
    emails: [...findings.emails],
    domains: [...findings.domains],
    users: [...findings.users],
    hosts: [...findings.hosts],
    total: findings.ips.size + findings.emails.size + findings.domains.size + findings.users.size + findings.hosts.size,
  };
}

export function buildReplacementMap(findings, prefix = 'REDACTED') {
  const map = new Map();
  let hostN = 1;
  let userN = 1;
  let ipN = 1;

  [...findings.hosts].sort((a, b) => b.length - a.length).forEach((h) => {
    map.set(h, `HOST-${String(hostN++).padStart(3, '0')}`);
  });
  [...findings.users].sort((a, b) => b.length - a.length).forEach((u) => {
    map.set(u, `DOMAIN\\USER-${String(userN++).padStart(3, '0')}`);
  });
  [...findings.ips].sort().forEach((ip) => {
    map.set(ip, `IP-${String(ipN++).padStart(3, '0')}`);
  });
  findings.emails.forEach((e, i) => map.set(e, `user${i + 1}@example.com`));
  findings.domains.forEach((d, i) => map.set(d, `domain${i + 1}.example.com`));

  return map;
}

export function anonymizeTimeline(timeline, customMap = null) {
  const findings = scanTimeline(timeline);
  const map = customMap || buildReplacementMap(findings);
  const clone = JSON.parse(JSON.stringify(timeline));

  const replaceIn = (str) => {
    if (!str || typeof str !== 'string') return str;
    let out = str;
    [...map.entries()].sort((a, b) => b[0].length - a[0].length).forEach(([from, to]) => {
      out = out.split(from).join(to);
    });
    return out;
  };

  clone.meta.title = replaceIn(clone.meta.title);
  clone.meta.subtitle = replaceIn(clone.meta.subtitle);
  clone.meta.anonymized = true;
  clone.events = clone.events.map((e) => ({
    ...e,
    id: e.id.startsWith('evt-') ? generateId() : e.id,
    hostname: replaceIn(e.hostname),
    username: replaceIn(e.username),
    details: replaceIn(e.details),
    tags: (e.tags || []).map(replaceIn),
  }));

  return { timeline: clone, map: Object.fromEntries(map), findings };
}
