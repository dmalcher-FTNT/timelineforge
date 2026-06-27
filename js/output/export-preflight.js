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

/** Visual exports that capture a live preview thumbnail before download. */
export const VISUAL_PREVIEW_TYPES = new Set(['png', 'pdf', 'pptx', 'svg', 'html', 'print']);

/** @deprecated Always show preflight — kept for tests that assert the helper exists. */
export const SKIP_PREFLIGHT_VISUAL_TYPES = new Set();

const LAYOUT_READY_SCORE = 88;

/**
 * @param {string} type
 * @param {{ ok?: boolean, layoutScore?: number | null, layoutOverflow?: number | null }} result
 */
export function canSkipVisualExportPreflight(type, result) {
  void type;
  void result;
  return false;
}

/**
 * Short text preview for non-visual export formats.
 * @param {string} type
 * @param {{ events?: object[], meta?: object }} timeline
 */
export function buildExportPreviewText(type, timeline) {
  const events = timeline?.events || [];
  const n = events.length;
  const title = timeline?.meta?.title?.trim() || 'Untitled timeline';

  switch (type) {
    case 'csv':
      return `${title}\nCSV table — ${n} event row(s)\nColumns: timestamp, host, user, category, phase, technique, details…`;
    case 'json':
      return `${title}\nJSON bundle — ${n} events, metadata, phases, and source fields.`;
    case 'markdown':
      return `${title}\nMarkdown table — ${n} rows formatted for report paste-in.`;
    case 'stix':
      return `${title}\nSTIX 2.1 bundle — ${n} observed-data objects with timestamps and labels.`;
    case 'ical':
      return `${title}\nCalendar file — ${n} VEVENT entries from timeline timestamps.`;
    case 'docx':
      return `${title}\nWord document — narrative summary, phase breakdown, and event table.`;
    case 'appendix-pdf':
      return `${title}\nAppendix PDF — compact activity strip plus event table for report appendices.`;
    case 'appendix-png':
      return `${title}\nAppendix PNG — single-page snapshot for report paste-in.`;
    case 'appendix-pptx':
      return `${title}\nAppendix slide — PowerPoint slide with timeline appendix image.`;
    case 'executive-pdf':
      return `${title}\nExecutive one-pager — leadership summary with phased milestones and stats.`;
    case 'report-pack':
      return `${title}\nReport pack (ZIP) — executive PDF, appendix PDF, CSV, and JSON in one download.`;
    case 'share-file':
      return `${title}\nTimeline JSON file — send to colleagues to open via File → Open.`;
    default:
      return `${title}\n${exportFormatLabel(type)} export — ${n} event(s).`;
  }
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
  if (result.layoutScore != null && VISUAL_PREVIEW_TYPES.has(type)) {
    return `Preview looks good (${result.layoutScore}/100) — ready to export ${label}.`;
  }
  return `Ready to export ${label}.`;
}

export function exportConfirmLabel(type) {
  return `Export ${exportFormatLabel(type)}`;
}
