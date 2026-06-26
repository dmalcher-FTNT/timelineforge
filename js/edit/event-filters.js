export function uniqueFieldValues(events, field) {
  return [...new Set(
    events.map((e) => e[field]).filter((v) => v && v !== 'N/A' && v !== 'Multiple'),
  )].sort((a, b) => a.localeCompare(b));
}

export function uniqueTagValues(events) {
  return [...new Set(
    events.flatMap((e) => e.tags || []).filter((t) => t && String(t).trim()),
  )].sort((a, b) => a.localeCompare(b));
}

export function countByField(events, field, value) {
  return events.filter((e) => e[field] === value).length;
}

export function countByTag(events, tag) {
  return events.filter((e) => (e.tags || []).includes(tag)).length;
}

export function filterEvents(events, { search = '', host = '', user = '', category = '', tag = '' } = {}) {
  let list = events;
  if (host) list = list.filter((e) => e.hostname === host);
  if (user) list = list.filter((e) => e.username === user);
  if (category) list = list.filter((e) => e.category === category);
  if (tag) list = list.filter((e) => (e.tags || []).includes(tag));
  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter((e) =>
      [e.hostname, e.username, e.details, e.technique, e.category, ...(e.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(q));
  }
  return list;
}

export function filtersActive(filters) {
  return Boolean(filters.search?.trim() || filters.host || filters.user || filters.category || filters.tag);
}

export function toggleSingleFilter(current, value) {
  return current === value ? '' : value;
}

/**
 * Build EDIT filter state when clicking an observable (host chip vs text search).
 * @param {string} value Observable value
 * @param {string[]} hosts Known hostnames on the timeline
 * @param {{ search?: string, host?: string }} current
 */
export function observableFilterState(value, hosts, { search = '', host = '' } = {}) {
  const cleared = { search: '', host: '', user: '', category: '', tag: '' };
  if (hosts.includes(value)) {
    return { ...cleared, host: host === value ? '' : value };
  }
  return { ...cleared, search: search === value ? '' : value };
}
