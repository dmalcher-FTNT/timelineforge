import { DEFAULT_ACCENT, normalizeAccentColor } from './theme.js';

export const USER_SETTINGS_COOKIE = 'timelineforge_prefs';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** @typedef {{ theme?: 'light' | 'dark', timezone?: string, accentColor?: string }} UserSettings */

export const USER_SETTINGS_DEFAULTS = {
  theme: 'light',
  timezone: 'UTC',
  accentColor: DEFAULT_ACCENT,
};

/** @param {string} cookieHeader */
export function parsePrefsCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${USER_SETTINGS_COOKIE}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.slice(USER_SETTINGS_COOKIE.length + 1));
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return sanitizeUserSettings(parsed);
  } catch {
    return null;
  }
}

/** @param {Partial<UserSettings>} settings */
export function sanitizeUserSettings(settings) {
  /** @type {UserSettings} */
  const out = {};
  if (settings.theme === 'light' || settings.theme === 'dark') out.theme = settings.theme;
  if (typeof settings.timezone === 'string' && settings.timezone.trim()) {
    out.timezone = settings.timezone.trim();
  }
  if (typeof settings.accentColor === 'string' && settings.accentColor.trim()) {
    out.accentColor = normalizeAccentColor(settings.accentColor.trim());
  }
  return out;
}

/** @param {UserSettings} settings */
export function serializePrefsCookie(settings) {
  const payload = encodeURIComponent(JSON.stringify(sanitizeUserSettings(settings)));
  return `${USER_SETTINGS_COOKIE}=${payload}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

export function hasUserSettingsCookie() {
  if (typeof document === 'undefined') return false;
  return parsePrefsCookie(document.cookie) !== null;
}

/** @returns {Required<UserSettings>} */
export function loadUserSettings() {
  const fromCookie = typeof document !== 'undefined' ? parsePrefsCookie(document.cookie) : null;
  return { ...USER_SETTINGS_DEFAULTS, ...fromCookie };
}

/** @param {Partial<UserSettings>} partial */
export function saveUserSettings(partial) {
  if (typeof document === 'undefined') return loadUserSettings();
  const next = { ...loadUserSettings(), ...sanitizeUserSettings(partial) };
  document.cookie = serializePrefsCookie(next);
  return next;
}

/** @param {Record<string, unknown> | undefined | null} meta */
export function readUserSettingsFromMeta(meta) {
  return sanitizeUserSettings({
    theme: meta?.theme,
    timezone: meta?.timezone,
    accentColor: meta?.accentColor,
  });
}

/** Apply stored UI preferences onto timeline meta (does not touch incident content). */
export function applyUserSettingsToMeta(meta, settings = loadUserSettings()) {
  if (!meta) return meta;
  if (settings.theme) meta.theme = settings.theme;
  if (settings.timezone) meta.timezone = settings.timezone;
  if (settings.accentColor) meta.accentColor = settings.accentColor;
  return meta;
}
