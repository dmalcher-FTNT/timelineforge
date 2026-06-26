import { CATEGORIES, sortEvents, timelineSpanMonths, uniqueHosts, uniqueUsers } from '../utils.js';
import { displayEventDetails } from '../event-details.js';
import { displayText, TEXT_LIMITS } from './text-layout.js';

export const PHASE_ICONS = ['✉', '⌨', '🔒', '📈', '🛡'];

const CATEGORY_OBJECTIVES = {
  'initial-access': 'Establish initial foothold',
  persistence: 'Maintain persistent access',
  'credential-access': 'Harvest credentials',
  'lateral-movement': 'Move laterally across the network',
  exfiltration: 'Exfiltrate sensitive data',
  impact: 'Cause business impact',
  reconnaissance: 'Discover network assets',
  'defense-evasion': 'Evade detection controls',
  detection: 'Trigger defensive response (contained)',
};

/** Pick representative milestones across phases (exec summary). */
export function pickMilestones(events, phaseDefs, maxTotal = 10) {
  const sorted = sortEvents(events);
  const picks = [];
  phaseDefs.forEach((p) => {
    const evts = sorted.filter((e) => e.phase === p.id);
    if (evts.length) picks.push(evts[0]);
    if (evts.length > 3) picks.push(evts[Math.floor(evts.length / 2)]);
    if (evts.length > 1) picks.push(evts[evts.length - 1]);
  });
  return picks.slice(0, maxTotal);
}

/** Up to N overview boxes per phase lane. */
export function pickPhaseHighlights(phaseEvents, max = 3) {
  const evts = sortEvents(phaseEvents);
  if (evts.length <= max) return evts;
  const picks = [evts[0]];
  if (max > 2) picks.push(evts[Math.floor(evts.length / 2)]);
  if (max > 1) picks.push(evts[evts.length - 1]);
  return picks.slice(0, max);
}

/** Narrative blurb for a phase chevron / lane label — derived from events. */
export function derivePhaseSummary(phaseEvents) {
  if (!phaseEvents.length) return 'No documented activity in this phase.';
  const cats = [...new Set(phaseEvents.map((e) => CATEGORIES[e.category]?.label).filter(Boolean))];
  const lead = displayEventDetails(phaseEvents[0], 72);
  if (cats.length >= 2) {
    return displayText(
      `${cats.slice(0, 3).join(', ')} observed across ${phaseEvents.length} event(s). ${lead}`,
      TEXT_LIMITS.chevronSummary,
    );
  }
  return displayText(`${phaseEvents.length} event(s): ${lead}`, TEXT_LIMITS.chevronSummary);
}

/** Short sidebar blurb (overview grid lane label). */
export function derivePhaseBlurb(phaseEvents) {
  if (!phaseEvents.length) return 'No activity recorded.';
  const cats = [...new Set(phaseEvents.map((e) => CATEGORIES[e.category]?.label).filter(Boolean))];
  if (cats.length) return displayText(cats.slice(0, 2).join(' and ') + '.', 48);
  return displayEventDetails(phaseEvents[0], 48);
}

/** Attacker objectives inferred from categories present in the timeline. */
export function deriveAttackerObjectives(events) {
  const seen = new Set();
  const objectives = [];
  sortEvents(events).forEach((e) => {
    const obj = CATEGORY_OBJECTIVES[e.category];
    if (obj && !seen.has(obj)) {
      seen.add(obj);
      objectives.push(obj);
    }
  });
  if (!objectives.length) {
    return ['Establish access', 'Maintain presence', 'Achieve impact'];
  }
  return objectives.slice(0, 6);
}

export function buildExecutiveTakeaway(events) {
  if (!events.length) return 'No events documented.';
  const sorted = sortEvents(events);
  const months = timelineSpanMonths(sorted);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return `This incident spanned approximately ${months} months with ${sorted.length} documented events across ${uniqueHosts(sorted).length} hosts. `
    + `Initial activity involved ${CATEGORIES[first?.category]?.label || 'compromise'}. `
    + `Security controls triggered during later phases — ${displayEventDetails(last, TEXT_LIMITS.footerTakeaway) || 'containment followed'}.`;
}

/** Month/year ticks for overview grid header. */
export function buildTimeAxis(events) {
  if (!events.length) return { years: [], months: [], min: 0, max: 1 };
  const times = events.flatMap((e) => [
    Date.parse(e.timestampStart),
    e.timestampEnd ? Date.parse(e.timestampEnd) : Date.parse(e.timestampStart),
  ]).filter(Boolean);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const pad = (max - min) * 0.04 || 86_400_000 * 7;
  const start = min - pad;
  const end = max + pad;

  const months = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end) {
    months.push({
      time: cursor.getTime(),
      label: cursor.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
      year: cursor.getUTCFullYear(),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const years = [];
  let lastYear = null;
  months.forEach((m) => {
    if (m.year !== lastYear) {
      years.push({ year: m.year, startTime: m.time });
      lastYear = m.year;
    }
  });

  return { years, months, min: start, max: end };
}

export function timeToPercent(time, min, max) {
  if (max <= min) return 50;
  return Math.max(2, Math.min(98, ((time - min) / (max - min)) * 100));
}

/** Start/end ms for interval stacking (point events use start as end). */
export function eventInterval(event) {
  const start = Date.parse(event.timestampStart);
  if (!Number.isFinite(start)) return { start: 0, end: 0 };
  const endRaw = event.timestampEnd ? Date.parse(event.timestampEnd) : start;
  const end = Number.isFinite(endRaw) ? endRaw : start;
  return { start, end: Math.max(end, start) };
}

/**
 * Assign sub-rows for overlapping [start, end] intervals (sweep-line packing).
 * @param {Array<object>} items — objects with start/end or { event }
 * @returns items with row (0-based) and laneRowCount
 */
export function assignIntervalRows(items, minGapMs = 0) {
  if (!items.length) return [];

  const indexed = items.map((item, index) => {
    const iv = item.start !== undefined
      ? { start: item.start, end: item.end }
      : eventInterval(item.event || item);
    return { index, start: iv.start, end: iv.end, item };
  });

  indexed.sort((a, b) => a.start - b.start || a.end - b.end);

  const laneEnds = [];
  const rows = new Array(items.length);

  indexed.forEach(({ index, start, end }) => {
    let row = 0;
    while (row < laneEnds.length && laneEnds[row] + minGapMs > start) row += 1;
    laneEnds[row] = Math.max(laneEnds[row] || 0, end);
    rows[index] = row;
  });

  const laneRowCount = Math.max(1, laneEnds.length);
  return items.map((item, index) => ({
    ...item,
    row: rows[index] ?? 0,
    laneRowCount,
  }));
}

/** Percent-lane deconflict for fixed-width overview boxes. */
export function deconflictBoxPositions(boxes, minGapOrOpts = 14) {
  const opts = typeof minGapOrOpts === 'number'
    ? { minGapPct: minGapOrOpts, boxWidthPct: 14 }
    : { minGapPct: 14, boxWidthPct: 14, ...minGapOrOpts };

  const { minGapPct, boxWidthPct } = opts;
  const half = boxWidthPct / 2;
  const sorted = [...boxes].sort((a, b) => a.pct - b.pct);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const prevRight = prev.pct + half;
    const curLeft = sorted[i].pct - half;
    const minCenter = prevRight + minGapPct + half;
    if (curLeft < prevRight + minGapPct) {
      sorted[i].row = Math.max(sorted[i].row || 0, (prev.row || 0) + 1);
      if (sorted[i].pct < minCenter) sorted[i].pct = Math.min(98, minCenter);
    }
  }
  return sorted;
}

export function countExternalIps(events) {
  const ips = new Set();
  const re = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  events.forEach((e) => {
    const text = `${e.details || ''} ${e.evidence || ''} ${e.source || ''}`;
    const matches = text.match(re) || [];
    matches.forEach((ip) => ips.add(ip));
  });
  return ips.size;
}
