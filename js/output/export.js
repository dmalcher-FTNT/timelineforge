import { isHtmlHeavyViz, capturePreviewCanvas, verifyRasterExport, prepareSvgExportCapture } from './export-capture.js';
import { exportBasename, exportTitle } from './export-names.js';

export async function exportJSON(timeline) {
  const blob = new Blob([JSON.stringify(timeline, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${exportBasename(timeline.meta)}.json`);
}

export async function exportPNG(element, filename) {
  if (!element) throw new Error('Nothing to export');

  if (isHtmlHeavyViz(element) || !element.querySelector('svg')) {
    const canvas = await capturePreviewCanvas(element);
    const verify = verifyRasterExport(canvas);
    if (!verify.ok) throw new Error(verify.items[0]?.message || 'Export verification failed');
    await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('PNG export failed'));
        else {
          downloadBlob(blob, `${filename}.png`);
          resolve();
        }
      }, 'image/png');
    });
    return verify;
  }

  const svg = element.querySelector('svg');
  const cleanup = prepareSvgExportCapture(element);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgData = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const canvas = document.createElement('canvas');
  const vb = svg.viewBox?.baseVal;
  const exportW = vb?.width || svg.getBoundingClientRect().width || 1100;
  const exportH = vb?.height || svg.getBoundingClientRect().height || 800;
  canvas.width = Math.ceil(exportW * 2);
  canvas.height = Math.ceil(exportH * 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
  });

  const verify = verifyRasterExport(canvas);
  cleanup();
  await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('PNG export failed'));
      else {
        downloadBlob(blob, `${filename}.png`);
        resolve();
      }
    }, 'image/png');
  });
  return verify;
}

export async function exportPDF(element, filename, title) {
  const { pdf, verify } = await buildPDFDocument(element, title);
  pdf.save(`${filename}.pdf`);
  return verify;
}

/** Build PDF bytes for bundling (report pack, etc.). */
export async function renderPDFBytes(element, title) {
  const { pdf, verify } = await buildPDFDocument(element, title);
  return { bytes: new Uint8Array(pdf.output('arraybuffer')), verify };
}

async function buildPDFDocument(element, title) {
  const [{ jsPDF }, svg2pdfModule] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
  ]);
  const svg2pdf = svg2pdfModule.default || svg2pdfModule.svg2pdf;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const heading = (title || '').trim();
  const contentTop = heading ? 44 : margin;

  if (heading) {
    pdf.setFontSize(14);
    pdf.text(heading, margin, 28);
  }

  if (isHtmlHeavyViz(element) || !element.querySelector('svg')) {
    const canvas = await capturePreviewCanvas(element);
    const verify = verifyRasterExport(canvas);
    const ratio = canvas.width / canvas.height;
    const contentW = pageW - margin * 2;
    const contentH = contentW / ratio;
    const maxH = pageH - contentTop - margin;
    let y = contentTop;
    let sliceH = Math.min(contentH, maxH);
    let srcY = 0;
    const sliceRatio = canvas.height / contentH;

    while (srcY < canvas.height) {
      if (y > contentTop) pdf.addPage();
      const sliceCanvas = document.createElement('canvas');
      const slicePx = Math.min(canvas.height - srcY, Math.round(sliceH * sliceRatio));
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = slicePx;
      const sctx = sliceCanvas.getContext('2d');
      sctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
      const sliceImg = sliceCanvas.toDataURL('image/jpeg', 0.92);
      const drawH = (slicePx / canvas.width) * contentW;
      pdf.addImage(sliceImg, 'JPEG', margin, y, contentW, drawH);
      srcY += slicePx;
      y = margin;
    }
    return { pdf, verify };
  }

  const svg = element.querySelector('svg');
  await svg2pdf(svg, pdf, { x: margin, y: contentTop, width: pageW - margin * 2 });
  return { pdf, verify: { ok: true, items: [] } };
}

export function exportStandaloneHTML(timeline, vizHtml) {
  const title = exportTitle(timeline.meta) || 'Timeline';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
${VIZ_EXPORT_CSS}
</style>
</head>
<body>
<div class="viz-export-body"><div class="viz-wrap viz-export-ready">${vizHtml}</div></div>
<script type="application/json" id="timeline-data">${escapeHtml(JSON.stringify(timeline))}</script>
</body>
</html>`;
  downloadBlob(new Blob([html], { type: 'text/html' }), `${exportBasename(timeline.meta)}.html`);
}

const VIZ_EXPORT_CSS = `
body{font-family:Inter,system-ui,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#0f172a}
.viz-export-body{max-width:1100px;margin:0 auto}
.viz-wrap{background:#fff;border-radius:12px;padding:24px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.viz-header{display:flex;justify-content:space-between;align-items:start;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
.viz-header h2{margin:0;font-size:1.25rem;border-left:4px solid #EE3124;padding-left:.65rem}
.viz-subtitle{margin:.25rem 0 0;color:#64748b;font-size:.875rem}
.viz-legend{display:flex;flex-wrap:wrap;gap:.5rem;font-size:.72rem}
.viz-legend span{display:flex;align-items:center;gap:.3rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.viz-legend i{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0}
.ciso-chevrons{display:grid;grid-template-columns:repeat(5,1fr);gap:.5rem;margin-bottom:.5rem}
.ciso-chevron{display:flex;flex-direction:column;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);font-size:.72rem}
.chevron-head{display:flex;align-items:center;justify-content:space-between;padding:.5rem .65rem;color:#fff}
.chevron-body{padding:.65rem;background:#f8fafc;flex:1;min-height:0}
.chevron-body h3{margin:0 0 .2rem;font-size:.78rem;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.chevron-body p{margin:.35rem 0 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.ciso-milestones-row{display:flex;flex-wrap:wrap;gap:1rem .65rem;margin-bottom:1.25rem;padding-top:.35rem}
.ciso-ms-card{flex:1 1 180px;max-width:220px;min-height:88px;border:2px solid;border-radius:8px;padding:.6rem;padding-top:1.5rem;background:#fff;font-size:.72rem;position:relative}
.ms-num{position:absolute;top:-11px;left:8px;width:22px;height:22px;border-radius:50%;color:#fff;display:grid;place-items:center;font-size:.65rem;font-weight:700;z-index:1;box-shadow:0 0 0 2px #fff}
.ciso-ms-card p{margin:.3rem 0 0;line-height:1.35;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.ciso-columns{display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem;margin-bottom:1.25rem}
.ciso-col{background:#f8fafc;border-radius:8px;padding:.65rem;font-size:.72rem;overflow:hidden}
.ciso-col li{margin-bottom:.3rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.soc-timeline{position:relative;padding:1rem 0}
.soc-timeline::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:3px;background:#EE3124;opacity:.35;transform:translateX(-50%)}
.soc-card{display:flex;width:48%;margin:1rem 0;position:relative}
.soc-left{margin-right:auto;flex-direction:row-reverse}
.soc-right{margin-left:auto}
.soc-rail{width:36px;display:flex;flex-direction:column;align-items:center;padding:.5rem 0;color:#fff;border-radius:6px 0 0 6px;flex-shrink:0}
.soc-left .soc-rail{border-radius:0 6px 6px 0}
.soc-content{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:.75rem;flex:1;min-width:0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.soc-content p{margin:.35rem 0;font-size:.82rem;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.soc-meta{display:flex;gap:.75rem;font-size:.72rem;color:#64748b;margin:.35rem 0;flex-wrap:wrap}
.soc-meta span{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.soc-takeaways{margin-top:2rem;padding:1rem;background:#1A1A1A;color:#f8fafc;border-radius:8px;border-top:3px solid #EE3124}
`;

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
