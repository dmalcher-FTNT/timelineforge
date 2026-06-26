/** @typedef {{ mode: 'manual'|'table'|'import'|'report', importTool?: string, label: string, confidence: 'high'|'medium'|'low' }} DetectedFormat */

function normalizeHeader(line) {
  return line
    .split(/[\t,]/)
    .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

function headerSet(text) {
  const line = text.trim().split(/\r?\n/)[0] || '';
  return new Set(normalizeHeader(line));
}

function hasHeaders(set, names) {
  return names.every((n) => [...set].some((h) => h === n || h.includes(n)));
}

function hasAnyHeader(set, names) {
  return names.some((n) => [...set].some((h) => h === n || h.includes(n)));
}

/** @returns {DetectedFormat|null} */
function detectCsvFormat(text) {
  const headers = headerSet(text);
  if (!headers.size) return null;

  if (hasHeaders(headers, ['timecreated']) && hasAnyHeader(headers, ['eventid', 'event identifier'])) {
    return { mode: 'import', importTool: 'evtxecmd', label: 'EvtxECmd CSV', confidence: 'high' };
  }
  if (hasAnyHeader(headers, ['ruletitle', 'rule title']) && hasAnyHeader(headers, ['timestamp', 'datetime'])) {
    return { mode: 'import', importTool: 'hayabusa', label: 'Hayabusa CSV', confidence: 'high' };
  }
  if (hasAnyHeader(headers, ['timeline description']) && hasAnyHeader(headers, ['timestamp', 'datetime'])) {
    return { mode: 'import', importTool: 'kape', label: 'KAPE timeline CSV', confidence: 'high' };
  }
  if (hasAnyHeader(headers, ['_time', 'time']) && hasAnyHeader(headers, ['sourcetype', 'source'])) {
    return { mode: 'import', importTool: 'splunk', label: 'Splunk CSV', confidence: 'medium' };
  }
  if (hasAnyHeader(headers, ['display name', 'host identifier'])) {
    return { mode: 'import', importTool: 'autopsy', label: 'Autopsy / Plaso CSV', confidence: 'medium' };
  }
  if (headers.has('timestamp') || headers.has('datetime') || headers.has('date/time')) {
    return { mode: 'import', importTool: 'generic-csv', label: 'Generic CSV', confidence: 'medium' };
  }

  return { mode: 'import', importTool: 'generic-csv', label: 'CSV export', confidence: 'low' };
}

/** @returns {DetectedFormat|null} */
function detectJsonFormat(data) {
  const root = Array.isArray(data) ? { items: data } : data;
  if (!root || typeof root !== 'object') return null;

  if (root.hits?.hits || root.rawResponse?.hits?.hits) {
    return { mode: 'import', importTool: 'elastic', label: 'Elastic Security JSON', confidence: 'high' };
  }
  if (root.response?.Event || root.Event) {
    return { mode: 'import', importTool: 'misp', label: 'MISP JSON', confidence: 'high' };
  }
  if (root.tasks || root.observables || root.caseId || root.case_id) {
    return { mode: 'import', importTool: 'thehive', label: 'TheHive JSON', confidence: 'medium' };
  }
  if (root.incidents || root.alerts?.some?.((a) => a.properties)) {
    return { mode: 'import', importTool: 'sentinel', label: 'Microsoft Sentinel JSON', confidence: 'medium' };
  }
  if (root.Collection || root.TotalCollectedRows != null) {
    return { mode: 'import', importTool: 'velociraptor', label: 'Velociraptor JSON', confidence: 'high' };
  }
  if (root.resources || root.data?.incidents) {
    return { mode: 'import', importTool: 'defender', label: 'Microsoft Defender JSON', confidence: 'medium' };
  }
  if (Array.isArray(data) && data.length && (data[0].timestampStart || data[0].details)) {
    return { mode: 'import', importTool: 'generic-json', label: 'Timeline JSON', confidence: 'high' };
  }
  if (Array.isArray(data) && data.length && (data[0]['@timestamp'] || data[0].hostname)) {
    return { mode: 'import', importTool: 'generic-json', label: 'Event JSON array', confidence: 'medium' };
  }
  if (root.events && Array.isArray(root.events)) {
    return { mode: 'import', importTool: 'generic-json', label: 'Timeline JSON', confidence: 'high' };
  }

  return { mode: 'import', importTool: 'generic-json', label: 'JSON export', confidence: 'low' };
}

/**
 * Guess INPUT mode and IR tool from pasted or uploaded text.
 * @param {string} text
 * @returns {DetectedFormat|null}
 */
export function detectInputFormat(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return detectJsonFormat(JSON.parse(trimmed));
    } catch {
      return { mode: 'import', importTool: 'generic-json', label: 'JSON', confidence: 'low' };
    }
  }

  const firstLine = trimmed.split(/\r?\n/)[0] || '';
  if (/^\|/.test(firstLine) && /\|[\s-:|]+\|/.test(trimmed.split(/\r?\n/)[1] || '')) {
    return { mode: 'table', label: 'Markdown table', confidence: 'high' };
  }

  if (firstLine.includes(',') || firstLine.includes('\t')) {
    return detectCsvFormat(trimmed);
  }

  if (/^\d{4}[-/]\d{2}[-/]\d{2}/m.test(trimmed) || /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/m.test(trimmed)) {
    return { mode: 'manual', label: 'Manual snippets', confidence: 'medium' };
  }

  if (trimmed.length > 2000 && /\n.{20,}\n/.test(trimmed)) {
    return { mode: 'report', label: 'Report text', confidence: 'low' };
  }

  return { mode: 'manual', label: 'Free text', confidence: 'low' };
}
