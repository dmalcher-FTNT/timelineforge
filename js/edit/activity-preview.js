import { CATEGORIES } from '../utils.js';
import { assignIntervalRows, eventInterval } from '../design/phase-content.js';

const MAX_BUCKETS = 40;
const MAX_MARKERS = 150;
const MIN_POINT_WIDTH_PCT = 0.35;

function pct(time, min, max) {
  if (max <= min) return 50;
  return ((time - min) / (max - min)) * 100;
}

function clampPct(value) {
  return Math.max(0, Math.min(100, value));
}

function tickLabel(ms, timezone) {
  return new Date(ms).toLocaleDateString('en-GB', {
    timeZone: timezone,
    month: 'short',
    year: '2-digit',
  });
}

function buildPreviewTicks(min, max, timezone) {
  const span = max - min;
  const count = span < 86_400_000 * 3 ? 3 : span < 86_400_000 * 45 ? 4 : 5;
  return Array.from({ length: count }, (_, i) => {
    const time = min + (span * i) / (count - 1 || 1);
    return { time, leftPct: clampPct(pct(time, min, max)), label: tickLabel(time, timezone) };
  });
}

/**
 * Compact pre-timeline chart data for the incident activity window.
 * @param {import('../utils.js').TimelineEvent[]} events
 * @param {{ timezone?: string }} [opts]
 */
export function buildActivityPreview(events, opts = {}) {
  const timezone = opts.timezone || 'UTC';
  if (!events?.length) return null;

  const intervals = events
    .map((event) => {
      const iv = eventInterval(event);
      if (!Number.isFinite(iv.start)) return null;
      return { event, start: iv.start, end: iv.end };
    })
    .filter(Boolean);

  if (!intervals.length) return null;

  const min = Math.min(...intervals.map((i) => i.start));
  const max = Math.max(...intervals.map((i) => i.end));
  const span = Math.max(max - min, 3_600_000);

  const bucketCount = Math.min(MAX_BUCKETS, Math.max(10, Math.ceil(Math.sqrt(events.length) * 4)));
  const bucketMs = span / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const bStart = min + i * bucketMs;
    const bEnd = bStart + bucketMs;
    const count = intervals.filter((iv) => iv.start < bEnd && iv.end >= bStart).length;
    return {
      leftPct: clampPct(pct(bStart, min, max)),
      widthPct: Math.max(100 / bucketCount - 0.4, 0.8),
      count,
      heightPct: 0,
    };
  });
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));
  buckets.forEach((b) => {
    b.heightPct = Math.round((b.count / maxBucket) * 100);
  });

  const limited = intervals.length > MAX_MARKERS ? intervals.slice(0, MAX_MARKERS) : intervals;
  const stacked = assignIntervalRows(limited);
  const laneCount = Math.max(1, ...stacked.map((m) => m.row + 1));

  const markers = stacked.map(({ event, start, end, row }) => {
    const leftPct = clampPct(pct(start, min, max));
    const rightPct = clampPct(pct(end, min, max));
    const widthPct = Math.max(rightPct - leftPct, MIN_POINT_WIDTH_PCT);
    const isPoint = !event.timestampEnd || end - start < 60_000;
    const cat = event.category || 'unknown';
    return {
      id: event.id,
      leftPct,
      widthPct: isPoint ? MIN_POINT_WIDTH_PCT : widthPct,
      isPoint,
      color: CATEGORIES[cat]?.color || '#64748b',
      title: CATEGORIES[cat]?.label || cat,
      row,
      laneCount,
    };
  });

  return {
    min,
    max,
    buckets,
    markers,
    ticks: buildPreviewTicks(min, max, timezone),
    laneCount,
    truncated: intervals.length > MAX_MARKERS,
  };
}
