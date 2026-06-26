/** Common IANA timezones for IR reporting (stored in meta.timezone). */
export const COMMON_TIMEZONES = [
  { id: 'UTC', label: 'UTC — Coordinated Universal Time', short: 'UTC' },
  { id: 'America/New_York', label: 'US Eastern (ET)', short: 'ET' },
  { id: 'America/Chicago', label: 'US Central (CT)', short: 'CT' },
  { id: 'America/Denver', label: 'US Mountain (MT)', short: 'MT' },
  { id: 'America/Los_Angeles', label: 'US Pacific (PT)', short: 'PT' },
  { id: 'Europe/London', label: 'London (GMT/BST)', short: 'London' },
  { id: 'Europe/Berlin', label: 'Berlin (CET)', short: 'Berlin' },
  { id: 'Europe/Paris', label: 'Paris (CET)', short: 'Paris' },
  { id: 'Europe/Amsterdam', label: 'Amsterdam (CET)', short: 'Amsterdam' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)', short: 'Tokyo' },
  { id: 'Asia/Singapore', label: 'Singapore (SGT)', short: 'Singapore' },
  { id: 'Australia/Sydney', label: 'Sydney (AEST)', short: 'Sydney' },
];

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function timezoneLabel(id) {
  return COMMON_TIMEZONES.find((t) => t.id === id)?.label || id.replace(/_/g, ' ');
}

export function timezoneShortLabel(id) {
  const known = COMMON_TIMEZONES.find((t) => t.id === id);
  if (known) return known.short;
  const tail = id.split('/').pop();
  return tail ? tail.replace(/_/g, ' ') : id;
}

export function resolveTimezone(meta) {
  return meta?.timezone || 'UTC';
}
