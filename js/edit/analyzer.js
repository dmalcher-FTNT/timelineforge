import { inferTechnique, techniqueLabel } from '../data/mitre-techniques.js';
import { CATEGORIES, inferCategory, sortEvents, uniqueHosts, uniqueUsers } from '../utils.js';

/** Explains why each quality check exists (shown in EDIT recommendations UI). */
export const QUALITY_RULES = {
  'missing-hostname': {
    label: 'Affected system',
    hint: 'Hostname links each event to an asset in EDIT, filters, and DESIGN exports.',
  },
  'missing-details': {
    label: 'Event narrative',
    hint: 'Details drive SOC cards and executive summaries — empty rows export as placeholders.',
  },
  'invalid-timestamp': {
    label: 'Start time',
    hint: 'Chronological ordering and Gantt views require a valid ISO start timestamp.',
  },
  'end-before-start': {
    label: 'Time range',
    hint: 'End time must be after start time for interval bars and duration text.',
  },
  'broken-link': {
    label: 'Event link',
    hint: 'linkedEventIds must reference another event id in this timeline.',
  },
  'timeline-gap': {
    label: 'Timeline gap',
    hint: 'Large silent gaps may indicate missing dwell-time or exfiltration events.',
  },
  'duplicate-narrative': {
    label: 'Similar events',
    hint: 'Back-to-back events on one host with similar text may be duplicates to merge.',
  },
  'suggest-mitre': {
    label: 'MITRE ATT&CK',
    hint: 'Technique inferred from details keywords — adds context for reports.',
  },
  'suggest-category': {
    label: 'Kill-chain category',
    hint: 'Category inferred from details — groups events in phase visualizations.',
  },
  'suggest-link': {
    label: 'Lateral movement',
    hint: 'Host activity chain suggests a possible missing link between systems.',
  },
  'suggest-initial-access': {
    label: 'Kill-chain coverage',
    hint: 'Timelines should show how the attacker first got in.',
  },
  'suggest-detection-impact': {
    label: 'Response milestones',
    hint: 'Add detection, containment, or impact events for executive closure.',
  },
};

function displayIndexMap(events) {
  return new Map(events.map((e, i) => [e.id, i + 1]));
}

function withRule(ruleId, fields) {
  const meta = QUALITY_RULES[ruleId] || { label: ruleId, hint: '' };
  return { rule: ruleId, ruleLabel: meta.label, ruleHint: meta.hint, ...fields };
}

export function analyzeTimeline(events) {
  const issues = [];
  const suggestions = [];
  const num = displayIndexMap(events);
  const eventNum = (id) => num.get(id) ?? '?';
  const sorted = sortEvents(events);

  if (!sorted.length) {
    issues.push(withRule('missing-details', {
      severity: 'error',
      message: 'Timeline is empty. Add at least one event.',
    }));
    return { issues, suggestions, stats: { events: 0, hosts: 0, users: 0 }, score: 0 };
  }

  const idSet = new Set(events.map((e) => e.id));
  events.forEach((evt) => {
    (evt.linkedEventIds || []).forEach((linkId) => {
      if (!idSet.has(linkId)) {
        issues.push(withRule('broken-link', {
          severity: 'warning',
          message: `Event #${eventNum(evt.id)}: Broken link to missing event "${linkId}".`,
          eventId: evt.id,
          eventIndex: eventNum(evt.id),
        }));
      }
    });
    if (!evt.technique && evt.details) {
      const inferred = inferTechnique(evt.details);
      if (inferred) {
        suggestions.push(withRule('suggest-mitre', {
          type: 'technique',
          message: `Suggest MITRE ${techniqueLabel(inferred)} for event #${eventNum(evt.id)}.`,
          eventId: evt.id,
          eventIndex: eventNum(evt.id),
          value: inferred,
        }));
      }
    }
  });

  events.forEach((evt) => {
    const n = eventNum(evt.id);
    if (!evt.timestampStart || Number.isNaN(Date.parse(evt.timestampStart))) {
      issues.push(withRule('invalid-timestamp', {
        severity: 'error',
        message: `Event #${n}: Invalid or missing start timestamp.`,
        eventId: evt.id,
        eventIndex: n,
      }));
    }
    if (!evt.details?.trim()) {
      issues.push(withRule('missing-details', {
        severity: 'warning',
        message: `Event #${n}: Missing details/description.`,
        eventId: evt.id,
        eventIndex: n,
      }));
    }
    if (!evt.hostname || evt.hostname === 'N/A') {
      issues.push(withRule('missing-hostname', {
        severity: 'info',
        message: `Event #${n}: No hostname — consider adding affected system.`,
        eventId: evt.id,
        eventIndex: n,
      }));
    }
    if (evt.timestampEnd && Date.parse(evt.timestampEnd) < Date.parse(evt.timestampStart)) {
      issues.push(withRule('end-before-start', {
        severity: 'error',
        message: `Event #${n}: End time is before start time.`,
        eventId: evt.id,
        eventIndex: n,
      }));
    }
  });

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gapDays = (Date.parse(curr.timestampStart) - Date.parse(prev.timestampEnd || prev.timestampStart)) / 86400000;
    if (gapDays > 90) {
      issues.push(withRule('timeline-gap', {
        severity: 'info',
        message: `${Math.round(gapDays)}-day gap before event #${eventNum(curr.id)} — document sustained access or dormancy?`,
        eventId: curr.id,
        eventIndex: eventNum(curr.id),
      }));
    }
  }

  const hostChains = buildHostChains(sorted);
  hostChains.forEach(({ from, to, gap }) => {
    if (gap > 7) {
      suggestions.push(withRule('suggest-link', {
        type: 'link',
        message: `Possible missing lateral movement link: activity on ${from} then ${to} after ${Math.round(gap)} days.`,
      }));
    }
  });

  const categories = new Set(events.map((e) => e.category));
  if (!categories.has('initial-access')) {
    suggestions.push(withRule('suggest-initial-access', {
      type: 'fill',
      message: 'No Initial Access event detected. Add the compromise vector (phishing, VPN, etc.).',
    }));
  }
  if (!categories.has('detection') && !categories.has('impact')) {
    suggestions.push(withRule('suggest-detection-impact', {
      type: 'fill',
      message: 'No Detection or Impact events. Add containment/response milestones.',
    }));
  }

  const duplicateHosts = findDuplicateNarratives(sorted);
  duplicateHosts.forEach((d) => {
    issues.push(withRule('duplicate-narrative', {
      severity: 'info',
      message: `Similar events on ${d.host} within ${d.hours}h — merge or differentiate?`,
      eventId: d.eventId,
      eventIndex: d.eventId ? eventNum(d.eventId) : undefined,
    }));
  });

  events.filter((e) => !e.category || !CATEGORIES[e.category]).forEach((e) => {
    const inferred = inferCategory(e.details);
    suggestions.push(withRule('suggest-category', {
      type: 'category',
      message: `Auto-suggest category "${CATEGORIES[inferred].label}" for event #${eventNum(e.id)}.`,
      eventId: e.id,
      eventIndex: eventNum(e.id),
      value: inferred,
    }));
  });

  const stats = {
    events: events.length,
    hosts: uniqueHosts(events).length,
    users: uniqueUsers(events).length,
  };

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);

  return { issues, suggestions, stats, score };
}

function buildHostChains(events) {
  const chains = [];
  let lastHost = null;
  let lastTime = null;
  events.forEach((e) => {
    const host = (e.hostname || '').split(/[;,]/)[0].trim();
    const time = Date.parse(e.timestampStart);
    if (lastHost && host !== lastHost && host !== 'N/A' && host !== 'Multiple') {
      chains.push({ from: lastHost, to: host, gap: (time - lastTime) / 86400000 });
    }
    if (host !== 'N/A') {
      lastHost = host;
      lastTime = time;
    }
  });
  return chains;
}

function findDuplicateNarratives(events) {
  const dupes = [];
  for (let i = 1; i < events.length; i++) {
    const a = events[i - 1];
    const b = events[i];
    if (a.hostname === b.hostname && similarity(a.details, b.details) > 0.6) {
      dupes.push({
        host: a.hostname,
        hours: Math.abs(Date.parse(b.timestampStart) - Date.parse(a.timestampStart)) / 3600000,
        eventId: b.id,
      });
    }
  }
  return dupes;
}

function similarity(a, b) {
  const wa = new Set((a || '').toLowerCase().split(/\W+/));
  const wb = new Set((b || '').toLowerCase().split(/\W+/));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  return inter / Math.max(wa.size, wb.size, 1);
}

export function applySuggestion(events, suggestion) {
  if (suggestion.type === 'category' && suggestion.eventId) {
    return events.map((e) => (e.id === suggestion.eventId ? { ...e, category: suggestion.value } : e));
  }
  if (suggestion.type === 'technique' && suggestion.eventId) {
    return events.map((e) => (e.id === suggestion.eventId ? { ...e, technique: suggestion.value } : e));
  }
  return events;
}

/** Errors and warnings that should be fixed before export. */
export function analysisIssues(analysis) {
  return (analysis?.issues || []).filter((i) => i.severity === 'error' || i.severity === 'warning');
}

/** Info-level issues plus auto-suggestions for enrichment. */
export function analysisRecommendations(analysis) {
  const info = (analysis?.issues || []).filter((i) => i.severity === 'info');
  const suggestions = (analysis?.suggestions || []).map((s) => ({ ...s, severity: 'suggestion' }));
  return [...info, ...suggestions];
}
