/** Find page number (1-based) for an event in a filtered list. */
export function pageForEventIndex(index, pageSize) {
  if (index < 0) return 1;
  return Math.floor(index / pageSize) + 1;
}

/** Next/previous index in a list, clamped. */
export function stepEventIndex(currentIndex, delta, length) {
  if (length <= 0) return -1;
  if (currentIndex < 0) return delta > 0 ? 0 : length - 1;
  return Math.max(0, Math.min(length - 1, currentIndex + delta));
}

/** Closest element with data-event-id walking up from click target. */
export function findPreviewEventTarget(target, root) {
  if (!target || !root) return null;
  const el = target.closest?.('[data-event-id]');
  if (!el || !root.contains(el)) return null;
  const id = el.dataset.eventId;
  return id || null;
}
