const DIFF_FIELDS = [
  'timestampStart',
  'timestampEnd',
  'hostname',
  'username',
  'details',
  'category',
  'phase',
  'technique',
];

function norm(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function fieldDiffs(before, after) {
  return DIFF_FIELDS.filter((field) => norm(before[field]) !== norm(after[field])).map((field) => ({
    field,
    before: before[field] ?? null,
    after: after[field] ?? null,
  }));
}

/**
 * Diff two event lists. `base` is the reference (e.g. saved baseline); `current` is the working timeline.
 * Matches by id first, then timestampStart + hostname.
 */
export function diffTimelines(baseEvents = [], currentEvents = []) {
  const baseById = new Map(baseEvents.map((e) => [e.id, e]));
  const usedBaseIds = new Set();
  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const cur of currentEvents) {
    let base = baseById.get(cur.id);
    if (base) {
      usedBaseIds.add(base.id);
      const diffs = fieldDiffs(base, cur);
      if (diffs.length) changed.push({ before: base, after: cur, diffs });
      else unchanged.push({ before: base, after: cur });
      continue;
    }

    base = baseEvents.find(
      (b) => !usedBaseIds.has(b.id)
        && b.timestampStart === cur.timestampStart
        && b.hostname === cur.hostname,
    );
    if (base) {
      usedBaseIds.add(base.id);
      const diffs = fieldDiffs(base, cur);
      if (diffs.length) changed.push({ before: base, after: cur, diffs });
      else unchanged.push({ before: base, after: cur });
    } else {
      added.push(cur);
    }
  }

  for (const base of baseEvents) {
    if (!usedBaseIds.has(base.id)) removed.push(base);
  }

  return {
    added,
    removed,
    changed,
    unchanged,
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged: unchanged.length,
      baseCount: baseEvents.length,
      currentCount: currentEvents.length,
    },
  };
}

export function formatDiffSummary(diff) {
  const s = diff.summary;
  const parts = [];
  if (s.added) parts.push(`${s.added} added`);
  if (s.removed) parts.push(`${s.removed} removed`);
  if (s.changed) parts.push(`${s.changed} changed`);
  if (!parts.length) return 'Timelines match';
  return parts.join(', ');
}
