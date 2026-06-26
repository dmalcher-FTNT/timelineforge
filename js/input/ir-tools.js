import { parseCyberChef } from './cyberchef.js';
import { normalizeEvent, parseGenericCSV, parseGenericJSON } from './parser.js';
import { generateId, parseFlexibleDate, sortEvents } from '../utils.js';

const MISP_CATEGORY_MAP = {
  'Initial Access': 'initial-access',
  Persistence: 'persistence',
  'Credential Access': 'credential-access',
  'Lateral Movement': 'lateral-movement',
  Exfiltration: 'exfiltration',
  Impact: 'impact',
  'Defense Evasion': 'defense-evasion',
  Discovery: 'reconnaissance',
  Reconnaissance: 'reconnaissance',
  'Command and Control': 'persistence',
};

export function parseTheHive(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const tasks = root.tasks || root.observables || root.alerts || [];
  const source = Array.isArray(tasks) ? tasks : [tasks];

  return sortEvents(source.map((item, i) => {
    const ts = item.startDate || item.createdAt || item.date || item.reportedAt;
    const details = [
      item.title,
      item.description,
      item.message,
      item.data,
    ].filter(Boolean).join(' — ');

    return normalizeEvent({
      id: item._id || item.id || generateId(),
      timestampStart: parseFlexibleDate(ts) || ts || new Date().toISOString(),
      hostname: item.host || item.hostname || item.sourceRef || 'N/A',
      username: item.owner || item.user || item.createdBy || 'N/A',
      details: details || `TheHive task ${i + 1}`,
      tags: item.tags || [],
    });
  }).filter((e) => e.details));
}

export function parseMisp(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const events = root.response?.Event ? [].concat(root.response.Event)
    : root.Event ? [].concat(root.Event)
    : Array.isArray(root) ? root
    : root.events || [];

  const parsed = [];
  events.forEach((ev) => {
    const baseTs = parseFlexibleDate(ev.date) || ev.date;
    const attrs = ev.Attribute || [];

    if (attrs.length) {
      attrs.forEach((attr) => {
        const ts = parseFlexibleDate(attr.timestamp) || parseFlexibleDate(attr.first_seen) || baseTs;
        parsed.push(normalizeEvent({
          timestampStart: ts,
          hostname: attr.object?.name || attr.category || 'N/A',
          username: 'N/A',
          details: [attr.category, attr.type, attr.comment || attr.value].filter(Boolean).join(' · '),
          category: MISP_CATEGORY_MAP[attr.category] || inferCategory(attr.comment || attr.value || ''),
          tags: (ev.Tag || []).map((t) => t.name),
        }));
      });
    } else {
      parsed.push(normalizeEvent({
        timestampStart: baseTs,
        hostname: 'N/A',
        username: 'N/A',
        details: ev.info || ev.description || 'MISP event',
        tags: (ev.Tag || []).map((t) => t.name),
      }));
    }
  });

  return sortEvents(parsed);
}

export function parseElastic(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const alerts = root.hits?.hits
    || root.rawResponse?.hits?.hits
    || root.alerts
    || (Array.isArray(root) ? root : []);

  return sortEvents(alerts.map((hit) => {
    const src = hit._source || hit.source || hit;
    const ts = src['@timestamp'] || src.timestamp || src.event?.created;
    const host = src.host?.name || src.host?.hostname || src.agent?.name || 'N/A';
    const user = src.user?.name || src.winlog?.event_data?.SubjectUserName || 'N/A';
    const details = src.message || src.event?.reason || src.rule?.name || src.signal?.rule?.name || JSON.stringify(src).slice(0, 200);

    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: host,
      username: user,
      details,
      technique: src.threat?.technique?.[0]?.id || src.signal?.rule?.threat?.[0]?.technique?.id || '',
      tags: src.tags || [],
    });
  }).filter((e) => e.timestampStart));
}

export function parseSplunk(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const events = [];

  lines.slice(1).forEach((line) => {
    const cols = splitCSVLine(line);
    const row = {};
    header.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, ''); });

    const ts = row._time || row.time || row.timestamp || row.start_time || '';
    const details = row.comment || row.description || row.rule_name || row.search_name || row.orig_raw || row.raw || '';

    if (!ts && !details) return;

    events.push(normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: row.dest || row.host || row.src_host || row.dvc || 'N/A',
      username: row.user || row.src_user || 'N/A',
      details,
      tags: row.tag ? row.tag.split(';') : [],
    }));
  });

  return sortEvents(events);
}

export function parseSentinel(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const rows = root.tables?.[0]?.rows
    || root.results
    || root.incidents
    || (Array.isArray(root) ? root : []);

  return sortEvents(rows.map((row) => {
    const r = row.properties || row;
    const ts = r.createdTimeUtc || r.startTimeUtc || r.timeGenerated || r.TimeGenerated || r.timestamp;
    const details = r.description || r.title || r.alertDisplayName || r.name || r.message || '';
    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: r.computerName || r.hostname || r.host || r.deviceName || 'N/A',
      username: r.accountName || r.userPrincipalName || r.user || 'N/A',
      details,
      technique: r.techniques?.[0] || r.mitreTechnique || '',
      tags: r.labels || r.tags || [],
    });
  }).filter((e) => e.details || e.timestampStart));
}

export function parseTimesketch(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const objects = root.objects || root.timeline || root.events || (Array.isArray(root) ? root : []);

  return sortEvents(objects.map((obj) => {
    const ts = obj.timestamp || obj.datetime || obj.__timestamp;
    const details = obj.message || obj.description || obj.comment || obj.data_type || '';
    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: obj.hostname || obj.host || obj.computer_name || 'N/A',
      username: obj.username || obj.user || 'N/A',
      details: details || JSON.stringify(obj).slice(0, 180),
      tags: obj.tag ? (Array.isArray(obj.tag) ? obj.tag : [obj.tag]) : [],
    });
  }).filter((e) => e.timestampStart));
}

export function parsePlaso(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return parseGenericCSV(text);

  const header = lines[0].split('\t').length > 2 ? lines[0].split('\t') : lines[0].split(',');
  const headerLower = header.map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  return sortEvents(lines.slice(1).map((line) => {
    const cols = line.includes('\t') ? line.split('\t') : splitCSVLine(line);
    const row = {};
    headerLower.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, ''); });

    const ts = row['datetime'] || row['date and time'] || row.timestamp || row.date;
    const details = row['display name'] || row.description || row.message || row['source long'] || row.source || '';

    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: row['host identifier'] || row.hostname || row.host || 'N/A',
      username: row.username || row.user || 'N/A',
      details,
    });
  }).filter((e) => e.timestampStart && e.details));
}

function parseTabularCsv(text, mapRow) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  return sortEvents(lines.slice(1).map((line) => {
    const cols = splitCSVLine(line);
    const row = {};
    header.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, ''); });
    return mapRow(row);
  }).filter((e) => e && (e.timestampStart || e.details)));
}

/** KAPE Pro timeline CSV — Timestamp, Timeline Description, Record Source, etc. */
export function parseKape(text) {
  return parseTabularCsv(text, (row) => {
    const ts = row.timestamp || row['date and time'] || row['date/time'] || row.datetime || '';
    const details = row['timeline description'] || row['event description'] || row.description
      || row.details || row.artifact || '';
    const source = row['record source'] || row.source || '';
    const merged = [details, source && source !== details ? `(${source})` : ''].filter(Boolean).join(' ');

    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: row['computer name'] || row.computer || row.hostname || row.host || 'N/A',
      username: row.username || row.user || 'N/A',
      details: merged || 'KAPE timeline entry',
      tags: row['file name'] ? [row['file name']] : [],
    });
  });
}

/** Hayabusa Windows event timeline CSV. */
export function parseHayabusa(text) {
  return parseTabularCsv(text, (row) => {
    const ts = row.timestamp || row['date and time'] || '';
    const rule = row.ruletitle || row.rule || row['rule title'] || '';
    const details = row.details || row.extraFieldInfo || row['extra field info'] || rule || '';
    const channel = row.channel || '';
    const eventId = row.eventid || row['event id'] || '';

    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: row.computer || row.hostname || row.host || 'N/A',
      username: row.user || row.username || 'N/A',
      details: details || (eventId ? `Event ${eventId}` : 'Hayabusa event'),
      tags: [channel, eventId ? `EID:${eventId}` : ''].filter(Boolean),
    });
  });
}

/** Eric Zimmerman EvtxECmd / EZ Tools CSV export. */
export function parseEvtxecmd(text) {
  return parseTabularCsv(text, (row) => {
    const ts = row.timecreated || row['time created'] || row.datetime || row.timestamp || '';
    const eventId = row.eventid || row['event id'] || row.eventidentifier || row['event identifier'] || '';
    const mapDesc = row.mapdescription || row['map description'] || '';
    const shortDesc = row.shortdescription || row['short description'] || '';
    const payload = [row.payloaddata1, row.payloaddata2, row.payloaddata3, row.payloaddata4]
      .filter(Boolean).join(' | ');
    const details = mapDesc || shortDesc || row.description || payload || row.details || '';
    const channel = row.channel || '';
    const user = row.username || row.user || row['user name'] || 'N/A';

    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: row.computer || row.hostname || row.machine || 'N/A',
      username: user,
      details: details || (eventId ? `Event ${eventId}` : 'EvtxECmd event'),
      tags: [channel, eventId ? `EID:${eventId}` : ''].filter(Boolean),
    });
  });
}

export function parseVelociraptor(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const items = root.items || root.rows || root.results || (Array.isArray(root) ? root : []);

  return sortEvents(items.map((item) => {
    const ts = item._ts || item.timestamp || item.Time || item.event_time;
    const details = item.message || item.Description || item.Path || item.FullPath || item.event_type || '';
    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: item.hostname || item.Hostname || item.system || 'N/A',
      username: item.username || item.User || 'N/A',
      details: details || JSON.stringify(item).slice(0, 160),
    });
  }).filter((e) => e.timestampStart));
}

export function parseChronicleUdm(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const events = root.events || root.udmEvents || (Array.isArray(root) ? root : []);

  return sortEvents(events.map((ev) => {
    const ts = ev.metadata?.eventTimestamp || ev.metadata?.collectedTimestamp;
    const host = ev.principal?.hostname || ev.target?.hostname || 'N/A';
    const user = ev.principal?.user?.userid || ev.target?.user?.userid || 'N/A';
    const details = ev.metadata?.productEventType || ev.securityResult?.summary || ev.about?.labels?.join(', ') || '';

    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: host,
      username: user,
      details: details || 'Chronicle UDM event',
      tags: ev.metadata?.productName ? [ev.metadata.productName] : [],
    });
  }).filter((e) => e.timestampStart));
}

function parseAlertArray(rows, mapRow) {
  const list = Array.isArray(rows) ? rows : [];
  return sortEvents(list.map(mapRow).filter((e) => e.timestampStart || e.details));
}

export function parseCrowdStrike(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const rows = root.resources || root.events || root.alerts || root.data || (Array.isArray(root) ? root : []);
  return parseAlertArray(rows, (r) => {
    const ts = r.timestamp || r.created_timestamp || r.event_timestamp || r.StartTime;
    const details = r.description || r.pattern_description || r.name || r.CommandLine || '';
    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: r.hostname || r.ComputerName || r.device?.hostname || 'N/A',
      username: r.user_name || r.UserName || r.user || 'N/A',
      details: details || 'CrowdStrike alert',
      technique: r.technique_id || r.technique || '',
      tags: r.tactic ? [].concat(r.tactic) : [],
    });
  });
}

export function parseDefenderXdr(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const rows = root.value || root.alerts || root.incidents || (Array.isArray(root) ? root : []);
  return parseAlertArray(rows, (r) => {
    const ts = r.createdDateTime || r.firstEventTime || r.alertCreationTime || r.timeGenerated;
    const details = r.title || r.description || r.category || '';
    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: r.computerDnsName || r.deviceName || r.machineId || 'N/A',
      username: r.accountName || r.userPrincipalName || 'N/A',
      details: details || 'Defender XDR alert',
      technique: r.mitreTechniques?.[0] || r.techniques?.[0] || '',
      tags: r.serviceSource ? [r.serviceSource] : [],
    });
  });
}

export function parseQRadar(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const rows = root.events || root.offense?.events || root.offenses || (Array.isArray(root) ? root : []);
  return parseAlertArray(rows, (r) => {
    const ts = r.start_time || r.startTime || r.last_persisted_time || r.timestamp;
    const details = r.description || r.event_name || r.category_name || r.payload || '';
    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: r.sourceip || r.destinationip || r.hostname || 'N/A',
      username: r.username || r.user_name || 'N/A',
      details: details || 'QRadar event',
      tags: r.qid ? [`QID:${r.qid}`] : [],
    });
  });
}

export function parseWazuh(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const rows = root.hits?.hits || root.data?.affected_items || root.alerts || (Array.isArray(root) ? root : []);
  const items = rows.map((h) => h._source || h);
  return parseAlertArray(items, (r) => {
    const ts = r.timestamp || r['@timestamp'] || r.rule?.timestamp;
    const details = r.rule?.description || r.full_log || r.data?.title || '';
    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: r.agent?.name || r.agent?.id || r.data?.srcip || 'N/A',
      username: r.data?.dstuser || r.data?.srcuser || 'N/A',
      details: details || 'Wazuh alert',
      technique: r.rule?.mitre?.id?.[0] || '',
      tags: r.rule?.groups || [],
    });
  });
}

export function parseLogRhythm(data) {
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const rows = root.alarmEvents || root.events || root.cases || (Array.isArray(root) ? root : []);
  return parseAlertArray(rows, (r) => {
    const ts = r.dateInserted || r.normalDate || r.date || r.timestamp;
    const details = r.message || r.name || r.ruleName || r.summary || '';
    return normalizeEvent({
      timestampStart: parseFlexibleDate(ts) || ts,
      hostname: r.host || r.entityName || r.originHost || 'N/A',
      username: r.login || r.user || 'N/A',
      details: details || 'LogRhythm event',
      tags: r.alarmStatus ? [r.alarmStatus] : [],
    });
  });
}

export function parseOpenSearch(data) {
  return parseElastic(data);
}

export function parseIrTool(toolId, text) {
  switch (toolId) {
    case 'thehive':
      return parseTheHive(text);
    case 'misp':
      return parseMisp(text);
    case 'elastic':
      return parseElastic(text);
    case 'splunk':
      return parseSplunk(text);
    case 'sentinel':
      return parseSentinel(text);
    case 'timesketch':
      return parseTimesketch(text);
    case 'autopsy':
    case 'plaso':
      return parsePlaso(text);
    case 'kape':
      return parseKape(text);
    case 'hayabusa':
      return parseHayabusa(text);
    case 'evtxecmd':
      return parseEvtxecmd(text);
    case 'velociraptor':
      return parseVelociraptor(text);
    case 'chronicle':
      return parseChronicleUdm(text);
    case 'cyberchef':
      return parseCyberChef(text);
    case 'crowdstrike':
      return parseCrowdStrike(text);
    case 'defender':
      return parseDefenderXdr(text);
    case 'qradar':
      return parseQRadar(text);
    case 'wazuh':
      return parseWazuh(text);
    case 'logrhythm':
      return parseLogRhythm(text);
    case 'opensearch':
      return parseOpenSearch(text);
    case 'generic-json':
      return parseGenericJSON(text);
    case 'generic-csv':
    default:
      return toolId === 'axiom' || toolId === 'xways' ? parsePlaso(text) : parseGenericCSV(text);
  }
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
