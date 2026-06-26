import { zipSync } from 'fflate';
import { buildDocxHtml } from './export-docx.js';
import { eventsToMarkdownTable } from './table-export.js';
import { exportBasename, exportTitle } from './export-names.js';
import { captureAppendixImage, mountAppendixPreview } from './export-appendix.js';
import { renderExecutivePDFBytes } from './export-executive.js';
import { stixBundleBytes } from './export-stix.js';
import { renderPDFBytes } from './export.js';

const REPORT_PACK_README = `TimelineForge — report pack

Files in this folder:
  *-executive.pdf   One-page executive summary (portrait)
  *-appendix.pdf    Print-ready appendix (activity chart + event table)
  *.doc             Word document with appendix snapshot + editable event table
  *.md              Markdown table for GitHub / Confluence / reports
  *.json            Full timeline data (re-open in TimelineForge)
  *.stix.json       STIX 2.1 bundle for threat intel platforms

Open the timeline in TimelineForge via File → Open… and load the JSON file.
`;

function encodeText(text) {
  return new TextEncoder().encode(text);
}

/** @returns {Record<string, Uint8Array>} */
export function buildReportPackFiles(timeline, {
  appendixImage = null,
  pdfBytes = null,
  executivePdfBytes = null,
  stixBytes = null,
  jsonBytes = null,
} = {}) {
  const base = exportBasename(timeline.meta);
  const title = exportTitle(timeline.meta);
  const tz = timeline.meta?.timezone || 'UTC';
  const prefix = `${base}/`;

  const table = eventsToMarkdownTable(timeline.events || [], tz);
  const markdown = title ? `# ${title}\n\n${table}` : table;
  const docHtml = buildDocxHtml(timeline, appendixImage);

  /** @type {Record<string, Uint8Array>} */
  const files = {
    [`${prefix}README.txt`]: encodeText(REPORT_PACK_README),
    [`${prefix}${base}.md`]: encodeText(markdown),
    [`${prefix}${base}.doc`]: encodeText(`\ufeff${docHtml}`),
  };

  if (pdfBytes?.length) {
    files[`${prefix}${base}-appendix.pdf`] = pdfBytes;
  }
  if (executivePdfBytes?.length) {
    files[`${prefix}${base}-executive.pdf`] = executivePdfBytes;
  }
  if (jsonBytes?.length) {
    files[`${prefix}${base}.json`] = jsonBytes;
  }
  if (stixBytes?.length) {
    files[`${prefix}${base}.stix.json`] = stixBytes;
  }

  return files;
}

function downloadZip(filename, files) {
  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped], { type: 'application/zip' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Zip executive PDF, appendix PDF, Word doc, Markdown, JSON, and STIX for report delivery. */
export async function exportReportPack(timeline) {
  const base = exportBasename(timeline.meta);
  const title = exportTitle(timeline.meta);

  let appendixImage = null;
  let pdfBytes = null;
  let executivePdfBytes = null;

  const jsonBytes = encodeText(JSON.stringify(timeline, null, 2));
  const stixBytes = stixBundleBytes(timeline);

  if (timeline.events?.length) {
    try {
      appendixImage = await captureAppendixImage(timeline);
    } catch {
      appendixImage = null;
    }

    const { element, cleanup } = mountAppendixPreview(timeline);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const rendered = await renderPDFBytes(element, title);
      pdfBytes = rendered.bytes;
    } catch {
      pdfBytes = null;
    } finally {
      cleanup();
    }

    try {
      const executive = await renderExecutivePDFBytes(timeline);
      executivePdfBytes = executive.bytes;
    } catch {
      executivePdfBytes = null;
    }
  }

  const files = buildReportPackFiles(timeline, {
    appendixImage,
    pdfBytes,
    executivePdfBytes,
    stixBytes,
    jsonBytes,
  });
  downloadZip(`${base}-report-pack.zip`, files);
}
