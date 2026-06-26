import { formatDate } from '../utils.js';
import { exportBasename, exportTitle } from './export-names.js';
import { captureAppendixImage } from './export-appendix.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function eventRows(events, timezone) {
  const tz = { timezone: timezone || 'UTC', seconds: false };
  return events.map((e) => `
    <tr>
      <td>${escapeHtml(formatDate(e.timestampStart, tz))}</td>
      <td>${escapeHtml(e.hostname)}</td>
      <td>${escapeHtml(e.username)}</td>
      <td>${escapeHtml(e.category)}</td>
      <td>${escapeHtml(e.technique || '')}</td>
      <td>${escapeHtml(e.source || '')}</td>
      <td>${escapeHtml(e.details)}</td>
    </tr>`).join('');
}

/**
 * Build Word-compatible HTML — optional appendix snapshot + full event table.
 * @param {object} timeline
 * @param {string | null} appendixImageDataUrl
 */
export function buildDocxHtml(timeline, appendixImageDataUrl = null) {
  const meta = timeline.meta || {};
  const tz = meta.timezone || 'UTC';
  const title = exportTitle(meta);
  const titleBlock = title ? `  <h1>${escapeHtml(title)}</h1>\n` : '';
  const appendixBlock = appendixImageDataUrl ? `
  <h2 style="font-family:Calibri,Arial,sans-serif;font-size:14pt;margin:1.25rem 0 .5rem">Timeline appendix</h2>
  <p style="margin:0 0 1rem"><img src="${appendixImageDataUrl}" alt="Timeline appendix" width="720" style="max-width:100%;height:auto;border:1px solid #e2e8f0" /></p>
` : '';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${escapeHtml(title || 'Timeline')}</title></head>
<body style="font-family:Calibri,Arial,sans-serif">
${titleBlock}${appendixBlock}  <h2 style="font-family:Calibri,Arial,sans-serif;font-size:14pt;margin:1rem 0 .5rem">Event data</h2>
  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Calibri,Arial,sans-serif;font-size:10pt">
    <thead>
      <tr>
        <th>Date/time</th><th>Host</th><th>User</th><th>Category</th>
        <th>Technique</th><th>Source</th><th>Details</th>
      </tr>
    </thead>
    <tbody>${eventRows(timeline.events || [], tz)}</tbody>
  </table>
</body></html>`;
}

function downloadDocxHtml(html, meta) {
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${exportBasename(meta)}.doc`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Export timeline as Word-compatible HTML (.doc) with appendix snapshot when events exist. */
export async function exportDocx(timeline) {
  let appendixImage = null;
  if (timeline.events?.length) {
    try {
      appendixImage = await captureAppendixImage(timeline);
    } catch {
      appendixImage = null;
    }
  }
  downloadDocxHtml(buildDocxHtml(timeline, appendixImage), timeline.meta || {});
}
