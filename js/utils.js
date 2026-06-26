export const CATEGORIES = {
  'initial-access': { label: 'Initial Access', color: '#EE3124', icon: '✉' },
  persistence: { label: 'Persistence', color: '#3b82f6', icon: '🛡' },
  'credential-access': { label: 'Credential Access', color: '#8b5cf6', icon: '🔑' },
  'lateral-movement': { label: 'Lateral Movement', color: '#14b8a6', icon: '↔' },
  exfiltration: { label: 'Exfiltration', color: '#f97316', icon: '☁' },
  impact: { label: 'Impact', color: '#ef4444', icon: '💥' },
  detection: { label: 'Detection', color: '#64748b', icon: '🔍' },
  'defense-evasion': { label: 'Defense Evasion', color: '#eab308', icon: '🎭' },
  reconnaissance: { label: 'Reconnaissance', color: '#0ea5e9', icon: '👁' },
};

export const PHASES = [
  { id: 1, name: 'Initial Compromise', color: '#EE3124', range: 'Oct – Dec 2024' },
  { id: 2, name: 'Persistence & Access Expansion', color: '#2563eb', range: 'Jan – Sep 2025' },
  { id: 3, name: 'Dormant / Sustained Access', color: '#0d9488', range: 'Nov 2025 – Mar 2026' },
  { id: 4, name: 'Escalation & Exfiltration', color: '#ea580c', range: 'Mar – Apr 2026' },
  { id: 5, name: 'Impact & Containment', color: '#dc2626', range: 'Apr 2026' },
];

export const FUNNY_STATUS = [
  'Correlating logs… the attacker left more breadcrumbs than a Hansel & Gretel reboot.',
  'Parsing timestamps… UTC is the only timezone that never lies to IR.',
  'Mapping hosts… HOST-007 sounds suspiciously like a Bond villain lair.',
  'Detecting gaps… if only attackers filled out change requests.',
  'Building timeline… faster than reading a 200-page PDF appendix.',
  'Analyzing MITRE mappings… T1059 counts as “creative scripting.”',
  'Sanitizing IOCs… your real IPs are safe with us.',
  'Grouping by phase… kill chain, but make it aesthetic.',
  'Finding missing links… unlike the attacker’s VPN attempts.',
  'Rendering SVG… pixels arranged chronologically, not chaotically.',
  'Almost done… unlike that 18-month dwell time.',
  'Consulting the oracle… it says “patch your VPN.”',
  'Reading PDF page by page… still faster than printing Appendix A.',
  'Extracting text from PDF… OCR not needed if the vendor used real fonts.',
  'Scanning for timeline tables… hiding behind page breaks since 2004.',
];

export const IR_TOOL_FORMATS = [
  { id: 'generic-csv', name: 'Generic CSV', status: 'supported' },
  { id: 'generic-json', name: 'Generic JSON', status: 'supported' },
  { id: 'thehive', name: 'TheHive / Case JSON', status: 'supported' },
  { id: 'misp', name: 'MISP Events', status: 'supported' },
  { id: 'elastic', name: 'Elastic Security Timeline', status: 'supported' },
  { id: 'splunk', name: 'Splunk Notable Events CSV', status: 'supported' },
  { id: 'sentinel', name: 'Microsoft Sentinel', status: 'supported' },
  { id: 'chronicle', name: 'Google SecOps Chronicle', status: 'supported' },
  { id: 'velociraptor', name: 'Velociraptor Collection', status: 'supported' },
  { id: 'autopsy', name: 'Autopsy / Plaso CSV', status: 'supported' },
  { id: 'kape', name: 'KAPE Timeline CSV', status: 'supported' },
  { id: 'hayabusa', name: 'Hayabusa CSV', status: 'supported' },
  { id: 'evtxecmd', name: 'EvtxECmd (EZ Tools CSV)', status: 'supported' },
  { id: 'timesketch', name: 'Timesketch', status: 'supported' },
  { id: 'axiom', name: 'Magnet AXIOM Export', status: 'supported' },
  { id: 'xways', name: 'X-Ways Forensics', status: 'supported' },
  { id: 'cyberchef', name: 'CyberChef Recipe Output', status: 'supported' },
  { id: 'crowdstrike', name: 'CrowdStrike Falcon', status: 'supported' },
  { id: 'defender', name: 'Microsoft Defender XDR', status: 'supported' },
  { id: 'qradar', name: 'IBM QRadar', status: 'supported' },
  { id: 'wazuh', name: 'Wazuh Alerts', status: 'supported' },
  { id: 'logrhythm', name: 'LogRhythm Case', status: 'supported' },
  { id: 'opensearch', name: 'OpenSearch / Wazuh Index', status: 'supported' },
];

export function randomStatus() {
  return FUNNY_STATUS[Math.floor(Math.random() * FUNNY_STATUS.length)];
}

export function generateId() {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function formatDate(iso, opts = {}) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const tz = opts.timezone || opts.timeZone || 'UTC';
  const formatted = d.toLocaleString('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: opts.seconds === false ? undefined : '2-digit',
    hour12: false,
    ...opts,
  });
  const suffix = tz === 'UTC' ? ' UTC' : '';
  return formatted + suffix;
}

export function formatDateRange(start, end, opts = {}) {
  if (!end) return formatDate(start, opts);
  return `${formatDate(start, opts)} → ${formatDate(end, opts)}`;
}

export function parseFlexibleDate(str) {
  if (!str || str === 'N/A') return null;
  const cleaned = str.trim().replace(/\s+/g, ' ');
  const iso = cleaned.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/);
  if (iso) return new Date(iso[0].replace(' ', 'T') + (iso[0].includes('Z') ? '' : 'Z')).toISOString();
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function inferCategory(text) {
  const t = (text || '').toLowerCase();
  if (/phish|teams|email|vpn.*connect|initial/.test(t)) return 'initial-access';
  if (/exfil|200 mb|ndr vectra|c2/.test(t)) return 'exfiltration';
  if (/wiper|gpo|impact|destroy/.test(t)) return 'impact';
  if (/edr|detect|quarantine|blocked|classified/.test(t)) return 'detection';
  if (/credential|password|stealer|logging\.dll|sense\.dll/.test(t)) return 'credential-access';
  if (/rdp|ssh|lateral|remote desktop|netbird|tunnel/.test(t)) return 'lateral-movement';
  if (/recon|brows|discovery|web server/.test(t)) return 'reconnaissance';
  if (/whitelist|evasion|disable.*notification/.test(t)) return 'defense-evasion';
  if (/backdoor|openssh|netapi|smartplatform|persist|scheduled task/.test(t)) return 'persistence';
  return 'reconnaissance';
}

export function inferPhase(event, allEvents) {
  if (event.phase) return event.phase;
  const start = new Date(event.timestampStart).getTime();
  if (start < Date.parse('2025-01-01')) return 1;
  if (start < Date.parse('2025-11-01')) return 2;
  if (start < Date.parse('2026-03-01')) return 3;
  if (start < Date.parse('2026-04-11')) return 4;
  return 5;
}

export function sortEvents(events) {
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.timestampStart) || 0;
    const tb = Date.parse(b.timestampStart) || 0;
    return ta - tb;
  });
}

export function uniqueHosts(events) {
  const set = new Set();
  events.forEach((e) => {
    (e.hostname || '').split(/[;,]/).forEach((h) => {
      const t = h.trim();
      if (t && t !== 'N/A' && t !== 'Multiple') set.add(t);
    });
  });
  return [...set];
}

export function uniqueUsers(events) {
  const set = new Set();
  events.forEach((e) => {
    (e.username || '').split(/[;,]/).forEach((u) => {
      const t = u.trim();
      if (t && t !== 'N/A' && t !== 'Multiple') set.add(t);
    });
  });
  return [...set];
}

export function timelineSpanMonths(events) {
  if (!events.length) return 0;
  const times = events.flatMap((e) => [Date.parse(e.timestampStart), e.timestampEnd ? Date.parse(e.timestampEnd) : Date.parse(e.timestampStart)]).filter(Boolean);
  const min = Math.min(...times);
  const max = Math.max(...times);
  return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24 * 30)));
}

/** Human-readable duration between two ISO timestamps (dwell time). */
export function formatDwellTime(earliest, latest) {
  if (!earliest || !latest) return '—';
  const ms = Math.max(0, Date.parse(latest) - Date.parse(earliest));
  if (ms < 60_000) return 'less than 1 minute';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 60) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.max(1, Math.round(days / 30));
  return `${months} month${months === 1 ? '' : 's'}`;
}

export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
