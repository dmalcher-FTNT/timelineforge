import { auditPreviewLayout } from './layout-audit.js';

export function validateExport(timeline, qualityAnalysis = null, previewEl = null) {
  const items = [];
  const events = timeline.events || [];

  if (!events.length) {
    items.push({ severity: 'error', message: 'Timeline has no events — nothing to export.' });
    return { ok: false, items, layoutScore: 0, layoutOverflow: 0 };
  }

  const invalidDates = events.filter((e) => !e.timestampStart || Number.isNaN(Date.parse(e.timestampStart)));
  if (invalidDates.length) {
    items.push({ severity: 'error', message: `${invalidDates.length} event(s) have invalid start dates.` });
  }

  const noDetails = events.filter((e) => !e.details?.trim());
  if (noDetails.length) {
    items.push({ severity: 'warning', message: `${noDetails.length} event(s) missing details.` });
  }

  const longDetails = events.filter((e) => (e.details || '').length > 180);
  if (longDetails.length) {
    items.push({
      severity: 'info',
      message: `${longDetails.length} event(s) have long descriptions — text will be shortened in visuals.`,
    });
  }

  if (timeline.meta?.anonymized !== true) {
    const sensitive = /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(JSON.stringify(events));
    if (sensitive) {
      items.push({ severity: 'warning', message: 'IP addresses detected — consider anonymizing before export.' });
    }
  }

  if (qualityAnalysis && qualityAnalysis.score < 70) {
    items.push({
      severity: 'warning',
      message: `Timeline data quality score is ${qualityAnalysis.score}/100 — review suggestions in EDIT.`,
    });
  }
  if (qualityAnalysis?.issues?.some((i) => i.severity === 'error')) {
    const n = qualityAnalysis.issues.filter((i) => i.severity === 'error').length;
    items.push({ severity: 'warning', message: `${n} data quality error(s) — see EDIT data quality panel.` });
  }

  let layoutScore = null;
  let layoutOverflow = null;
  if (previewEl) {
    const layout = auditPreviewLayout(previewEl);
    layoutScore = layout.score;
    layoutOverflow = layout.overflowCount;
    if (layout.overflowCount > 0) {
      items.push({
        severity: 'warning',
        message: `${layout.overflowCount} text overflow issue(s) in preview — layout score ${layout.score}/100.`,
      });
    } else if (layout.score >= 85) {
      items.push({
        severity: 'info',
        message: `Preview layout looks good (${layout.score}/100).`,
      });
    }
    layout.items.forEach((li) => {
      if (!items.some((i) => i.message === li.message)) items.push(li);
    });
  }

  const ok = !items.some((i) => i.severity === 'error');
  return { ok, items, layoutScore, layoutOverflow };
}
