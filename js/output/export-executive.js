import { renderCisoSummary } from '../design/ciso-summary.js';
import { capturePreviewCanvas, verifyRasterExport } from './export-capture.js';
import { exportBasename, exportTitle } from './export-names.js';

/** Mount executive summary viz off-screen for capture. */
export function mountExecutivePreview(timeline) {
  const host = document.createElement('div');
  host.setAttribute('data-executive-export', '');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;pointer-events:none;visibility:hidden';
  const wrap = document.createElement('div');
  wrap.className = 'viz-preview-wrap viz-export-capture';
  wrap.style.width = '1200px';
  const preview = document.createElement('div');
  preview.className = 'viz-export-ready';
  wrap.appendChild(preview);
  host.appendChild(wrap);
  document.body.appendChild(host);

  renderCisoSummary(preview, {
    events: timeline.events || [],
    meta: timeline.meta || {},
  });
  const theme = timeline.meta?.theme || 'light';
  if (theme === 'dark') preview.querySelector('.viz-ciso')?.classList.add('viz-dark');

  return {
    element: preview,
    cleanup() {
      host.remove();
    },
  };
}

/** Portrait A4 PDF scaled to fit the executive summary on one page. */
export async function renderExecutivePDFBytes(timeline) {
  const { element, cleanup } = mountExecutivePreview(timeline);
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = await capturePreviewCanvas(element);
    const verify = verifyRasterExport(canvas);

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const heading = exportTitle(timeline.meta);
    let contentTop = margin;

    if (heading) {
      pdf.setFontSize(11);
      pdf.text(heading, margin, margin + 10);
      contentTop = margin + 22;
    }

    const availW = pageW - margin * 2;
    const availH = pageH - contentTop - margin;
    const ratio = canvas.width / canvas.height;
    let drawW = availW;
    let drawH = drawW / ratio;
    if (drawH > availH) {
      drawH = availH;
      drawW = drawH * ratio;
    }
    const x = margin + (availW - drawW) / 2;
    const img = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(img, 'JPEG', x, contentTop, drawW, drawH);

    return { bytes: new Uint8Array(pdf.output('arraybuffer')), verify };
  } finally {
    cleanup();
  }
}

function downloadBytes(bytes, filename, mime) {
  const blob = new Blob([bytes], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Download executive one-pager PDF (portrait, single page). */
export async function exportExecutivePDF(timeline) {
  const base = exportBasename(timeline.meta);
  const { bytes, verify } = await renderExecutivePDFBytes(timeline);
  downloadBytes(bytes, `${base}-executive.pdf`, 'application/pdf');
  return verify;
}
