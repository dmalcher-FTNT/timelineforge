const HTML_VIZ_SELECTOR = '.viz-ciso, .viz-overview, .viz-phase-columns, .viz-soc, .viz-event-stack, .viz-host-lanes, .viz-evidence-table, .viz-storyboard, .viz-compare, .viz-retro, .viz-scribing, .viz-activity-strip, .viz-appendix, .viz-mermaid';

export function isHtmlHeavyViz(root) {
  return Boolean(root?.querySelector(HTML_VIZ_SELECTOR));
}

/** Expand preview wrapper and mark export-ready layout before capture. */
export function prepareExportCapture(previewEl) {
  const wrap = previewEl?.closest('.viz-preview-wrap') || previewEl?.parentElement;
  if (!wrap) return () => {};
  wrap.classList.add('viz-export-capture');
  previewEl?.classList.add('viz-export-ready');
  return () => {
    wrap.classList.remove('viz-export-capture');
    previewEl?.classList.remove('viz-export-ready');
  };
}

/** Expand SVG-only viz wrappers so raster export uses full viewBox height. */
export function prepareSvgExportCapture(previewEl) {
  const wrap = previewEl?.closest('.viz-preview-wrap') || previewEl?.parentElement;
  if (!wrap) return () => {};
  wrap.classList.add('viz-export-capture', 'viz-export-svg');
  previewEl?.classList.add('viz-export-ready');
  return () => {
    wrap.classList.remove('viz-export-capture', 'viz-export-svg');
    previewEl?.classList.remove('viz-export-ready');
  };
}

async function loadHtml2Canvas() {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas;
}

export async function capturePreviewCanvas(previewEl) {
  const wrap = previewEl?.closest('.viz-preview-wrap') || previewEl;
  const cleanup = prepareExportCapture(previewEl);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const html2canvas = await loadHtml2Canvas();
  const canvas = await html2canvas(wrap, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
    width: wrap.scrollWidth,
    height: wrap.scrollHeight,
    windowWidth: wrap.scrollWidth,
    windowHeight: wrap.scrollHeight,
  });
  cleanup();
  return canvas;
}

function sampleNonWhiteRatio(ctx, canvas, x, y, w, h) {
  const sx = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));
  const sw = Math.max(1, Math.min(w, canvas.width - sx));
  const sh = Math.max(1, Math.min(h, canvas.height - sy));
  const sample = ctx.getImageData(sx, sy, sw, sh).data;
  let nonWhite = 0;
  for (let i = 0; i < sample.length; i += 4) {
    if (sample[i] < 250 || sample[i + 1] < 250 || sample[i + 2] < 250) nonWhite += 1;
  }
  return nonWhite / (sample.length / 4);
}

/** Quick sanity check — exported raster should not be blank. */
export function verifyRasterExport(canvas) {
  const items = [];
  if (!canvas || canvas.width < 10 || canvas.height < 10) {
    items.push({ severity: 'error', message: 'Export produced an empty image — preview may not have rendered.' });
    return { ok: false, items };
  }

  const ctx = canvas.getContext('2d');
  const sampleSize = Math.min(48, Math.floor(canvas.width / 6), Math.floor(canvas.height / 6));
  const regions = [
    [0, 0],
    [canvas.width / 2 - sampleSize / 2, canvas.height / 2 - sampleSize / 2],
    [canvas.width - sampleSize, canvas.height - sampleSize],
    [canvas.width / 2 - sampleSize / 2, canvas.height - sampleSize],
  ];

  const ratios = regions.map(([x, y]) => sampleNonWhiteRatio(ctx, canvas, x, y, sampleSize, sampleSize));
  const avgInk = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const blankRegions = ratios.filter((r) => r < 0.02).length;

  if (avgInk < 0.015) {
    items.push({ severity: 'error', message: 'Export looks blank — check DESIGN preview before sharing.' });
  } else if (blankRegions >= 3) {
    items.push({ severity: 'warning', message: 'Export may be mostly empty — verify timeline content rendered.' });
  } else if (ratios[0] < 0.02 && ratios[2] < 0.02) {
    items.push({ severity: 'warning', message: 'Export corners look empty — layout may be clipped.' });
  }

  return { ok: !items.some((i) => i.severity === 'error'), items };
}

export async function createExportThumbnail(previewEl, maxWidth = 480) {
  try {
    const canvas = await capturePreviewCanvas(previewEl);
    const ratio = maxWidth / canvas.width;
    const thumb = document.createElement('canvas');
    thumb.width = maxWidth;
    thumb.height = Math.round(canvas.height * ratio);
    const ctx = thumb.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, thumb.width, thumb.height);
    ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return thumb.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}
