import { CATEGORIES, formatDwellTime, timelineSpanMonths, uniqueHosts, uniqueUsers } from '../utils.js';

/**
 * @param {import('../utils.js').TimelineEvent[]} events
 */
export function computeTimelineStats(events) {
  if (!events?.length) {
    return {
      eventCount: 0,
      hostCount: 0,
      userCount: 0,
      spanMonths: 0,
      linkedCount: 0,
      earliest: null,
      latest: null,
      dwellTime: '—',
      techniqueCount: 0,
      categoryCount: 0,
      topCategories: [],
      topHosts: [],
      topUsers: [],
    };
  }

  const linkedCount = events.filter((e) => (e.linkedEventIds || []).length > 0).length;
  const categoryBreakdown = {};

  events.forEach((e) => {
    const cat = e.category || 'unknown';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  });

  const starts = events.map((e) => Date.parse(e.timestampStart)).filter(Boolean);
  const ends = events.flatMap((e) => {
    const end = e.timestampEnd ? Date.parse(e.timestampEnd) : Date.parse(e.timestampStart);
    return Number.isFinite(end) ? [end] : [];
  });
  const allTimes = [...starts, ...ends];
  const earliest = allTimes.length ? new Date(Math.min(...allTimes)).toISOString() : null;
  const latest = allTimes.length ? new Date(Math.max(...allTimes)).toISOString() : null;

  const topCategories = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({
      key,
      count,
      label: CATEGORIES[key]?.label || key,
      color: CATEGORIES[key]?.color || '#64748b',
    }));

  const techniqueSet = new Set(
    events.map((e) => (e.technique || '').trim()).filter(Boolean),
  );
  const categorySet = new Set(
    events.map((e) => e.category).filter(Boolean),
  );

  return {
    eventCount: events.length,
    hostCount: uniqueHosts(events).length,
    userCount: uniqueUsers(events).length,
    spanMonths: timelineSpanMonths(events),
    linkedCount,
    earliest,
    latest,
    dwellTime: formatDwellTime(earliest, latest),
    techniqueCount: techniqueSet.size,
    categoryCount: categorySet.size,
    topCategories,
    topHosts: topEntityCounts(events, 'hostname', 3),
    topUsers: topEntityCounts(events, 'username', 3),
  };
}

function topEntityCounts(events, field, limit = 3) {
  const counts = new Map();
  events.forEach((e) => {
    const v = (e[field] || '').trim();
    if (!v || v === 'N/A') return;
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

/**
 * Apply a field value to events matching the given ids.
 * @param {import('../utils.js').TimelineEvent[]} events
 * @param {Set<string>} ids
 * @param {'phase' | 'category'} field
 * @param {string | number} value
 */
export function bulkUpdateEvents(events, ids, field, value) {
  events.forEach((e) => {
    if (!ids.has(e.id)) return;
    if (field === 'phase') e.phase = Number(value);
    else if (field === 'category') e.category = String(value);
  });
}
