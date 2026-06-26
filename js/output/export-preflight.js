/** Human-readable export format names for UI and filenames. */
export const EXPORT_FORMAT_LABELS = {
  png: 'PNG',
  pdf: 'PDF',
  svg: 'SVG',
  pptx: 'PowerPoint',
  docx: 'Word',
  html: 'HTML',
  json: 'JSON',
  csv: 'CSV',
  markdown: 'Markdown',
  stix: 'STIX',
  ical: 'iCal',
  print: 'Print',
  'appendix-pdf': 'Appendix PDF',
  'appendix-png': 'Appendix PNG',
  'executive-pdf': 'Executive PDF',
  'report-pack': 'Report pack',
  'appendix-pptx': 'Appendix PowerPoint',
};

export function exportFormatLabel(type) {
  return EXPORT_FORMAT_LABELS[type] || (type ? String(type).toUpperCase() : 'File');
}

/** Visual exports from DESIGN that can skip preflight when layout is already green. */
export const SKIP_PREFLIGHT_VISUAL_TYPES = new Set(['png', 'pdf', 'svg']);

const LAYOUT_READY_SCORE = 88;

/**
 * @param {string} type
 * @param {{ ok?: boolean, layoutScore?: number | null, layoutOverflow?: number | null }} result
 */
export function canSkipVisualExportPreflight(type, result) {
  if (!SKIP_PREFLIGHT_VISUAL_TYPES.has(type)) return false;
  if (!result?.ok) return false;
  if (result.layoutScore == null || result.layoutScore < LAYOUT_READY_SCORE) return false;
  if ((result.layoutOverflow ?? 0) > 0) return false;
  return true;
}

/**
 * @param {{ ok?: boolean, items?: Array<{ severity: string }> }} result
 * @returns {'ready' | 'warnings' | 'blocked'}
 */
export function exportPreflightStatus(result) {
  if (!result?.ok) return 'blocked';
  if (result.items?.some((i) => i.severity === 'warning')) return 'warnings';
  return 'ready';
}

/**
 * @param {string} type
 * @param {{ ok?: boolean, items?: Array<{ severity: string }>, layoutScore?: number | null }} result
 */
export function exportPreflightSummary(type, result) {
  const label = exportFormatLabel(type);
  const status = exportPreflightStatus(result);

  if (status === 'blocked') {
    return 'Fix the errors below before exporting.';
  }
  if (status === 'warnings') {
    if (result.layoutScore != null && result.layoutScore < LAYOUT_READY_SCORE) {
      return `Layout score ${result.layoutScore}/100 — you can export ${label}, but text may clip in the file.`;
    }
    return `Ready to export ${label} with minor warnings below.`;
  }
  if (SKIP_PREFLIGHT_VISUAL_TYPES.has(type) && result.layoutScore != null) {
    return `Preview looks good (${result.layoutScore}/100) — ready to export ${label}.`;
  }
  return `Ready to export ${label}.`;
}

export function exportConfirmLabel(type) {
  return `Export ${exportFormatLabel(type)}`;
}
