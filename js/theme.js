/** Fortinet-inspired brand tokens (unofficial — for UI theming only). */
export const FORTINET = {
  red: '#EE3124',
  redDark: '#C41E14',
  redDarker: '#9B1810',
  redLight: '#FFF0EF',
  redMuted: '#FECACA',
  black: '#1A1A1A',
  grayDark: '#2D2D2D',
  grayMid: '#4A4A4A',
  white: '#FFFFFF',
};

export const DEFAULT_ACCENT = FORTINET.red;

/** Migrate timelines saved with the old default purple accent. */
export function normalizeAccentColor(color) {
  if (!color || color === '#4f46e5' || color === '#4338ca') return DEFAULT_ACCENT;
  return color;
}

export function accentHoverColor(accent, dark = false) {
  if (dark) return '#FF6B61';
  return accent === DEFAULT_ACCENT ? FORTINET.redDark : accent;
}
