import { exportCaptureScale } from './export-fit.js';

const HTML_VIZ_SELECTOR = '.viz-ciso, .viz-overview, .viz-phase-columns, .viz-soc, .viz-event-stack, .viz-host-lanes, .viz-evidence-table, .viz-storyboard, .viz-compare, .viz-retro, .viz-scribing, .viz-activity-strip, .viz-appendix, .viz-mermaid, .viz-mitre-heatmap, .viz-containment-lanes';

/** Elements that often scroll horizontally in preview but must expand for export. */
export const EXPORT_SCROLL_SELECTORS = [
  '.viz-ciso',
  '.viz-overview',
  '.overview-chart',
  '.overview-lanes',
  '.ciso-swimlane',
  '.ciso-metro',
  '.phase-spine-wrap',
  '.host-lanes-chart',
  '.containment-lanes-chart',
  '.mitre-heatmap-scroll',
  '.activity-strip-chart',
  '.viz-activity-strip',
];

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

/**
 * Measure full export bounds including horizontally scrollable chart areas.
 * @param {Element} root
 * @returns {{ width: number, height: number, offsetX: number, offsetY: number }}
 */
export function measureExportBounds(root) {
  if (!root) return { width: 1, height: 1, offsetX: 0, offsetY: 0 };

  let width = Math.max(root.scrollWidth || 0, root.offsetWidth || 0, 1);
  let height = Math.max(root.scrollHeight || 0, root.offsetHeight || 0, 1);

  root.querySelectorAll?.(EXPORT_SCROLL_SELECTORS.join(',')).forEach((el) => {
    width = Math.max(width, el.scrollWidth || 0, el.offsetWidth || 0);
  });

  height = Math.max(height, root.scrollHeight || 0, root.offsetHeight || 0);
  root.querySelectorAll?.(EXPORT_SCROLL_SELECTORS.join(',')).forEach((el) => {
    height = Math.max(height, el.scrollHeight || 0, el.offsetHeight || 0);
  });

  root.querySelectorAll?.('*').forEach((el) => {
    if (el.scrollWidth > el.clientWidth + 2) {
      width = Math.max(width, el.scrollWidth || 0);
    }
  });

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
    offsetX: 0,
    offsetY: 0,
  };
}

/** Temporarily expand clipped/scrollable preview containers to full content size. */
export function expandExportLayout(wrap) {
  const saved = [];

  const stretch = (el, extra = {}) => {
    if (!el) return;
    saved.push({
      el,
      prev: {
        overflow: el.style.overflow,
        overflowX: el.style.overflowX,
        overflowY: el.style.overflowY,
        maxWidth: el.style.maxWidth,
        maxHeight: el.style.maxHeight,
        width: el.style.width,
        minWidth: el.style.minWidth,
      },
    });
    Object.assign(el.style, {
      overflow: 'visible',
      overflowX: 'visible',
      overflowY: 'visible',
      maxWidth: 'none',
      maxHeight: 'none',
      ...extra,
    });
  };

  let node = wrap;
  while (node) {
    stretch(node);
    if (node.classList?.contains('publish-preview-column') || node.classList?.contains('publish-main')) break;
    node = node.parentElement;
  }

  wrap.querySelectorAll(EXPORT_SCROLL_SELECTORS.join(',')).forEach((el) => {
    const fullW = Math.max(el.scrollWidth, el.offsetWidth);
    stretch(el, { width: `${fullW}px`, minWidth: `${fullW}px` });
  });

  return () => {
    saved.forEach(({ el, prev }) => {
      Object.assign(el.style, prev);
    });
  };
}

async function loadHtml2Canvas() {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas;
}

function pinExportWidth(wrap, previewEl, width) {
  wrap.style.width = `${width}px`;
  wrap.style.minWidth = `${width}px`;
  wrap.style.maxWidth = 'none';
  wrap.style.overflow = 'visible';
  if (previewEl) {
    previewEl.style.maxWidth = 'none';
    previewEl.style.width = `${width}px`;
    previewEl.style.minWidth = `${width}px`;
  }
}

export async function capturePreviewCanvas(previewEl) {
  const wrap = previewEl?.closest('.viz-preview-wrap') || previewEl;
  wrap.scrollTop = 0;
  wrap.scrollLeft = 0;

  const cleanupClass = prepareExportCapture(previewEl);
  const cleanupLayout = expandExportLayout(wrap);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  let { width, height } = measureExportBounds(wrap);
  pinExportWidth(wrap, previewEl, width);
  await new Promise((r) => requestAnimationFrame(r));
  ({ width, height } = measureExportBounds(wrap));
  pinExportWidth(wrap, previewEl, width);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const scale = exportCaptureScale(width, height);

  try {
    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(wrap, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width + 64,
      windowHeight: height + 64,
      scrollX: 0,
      scrollY: 0,
      onclone: (doc) => {
        const clonedWrap = doc.querySelector('.viz-preview-wrap');
        if (!clonedWrap) return;
        clonedWrap.style.overflow = 'visible';
        clonedWrap.style.maxWidth = 'none';
        clonedWrap.style.width = `${width}px`;
        clonedWrap.style.minWidth = `${width}px`;
        clonedWrap.querySelectorAll(EXPORT_SCROLL_SELECTORS.join(',')).forEach((el) => {
          const fullW = Math.max(el.scrollWidth, el.offsetWidth, width);
          el.style.overflow = 'visible';
          el.style.maxWidth = 'none';
          el.style.width = `${fullW}px`;
          el.style.minWidth = `${fullW}px`;
        });
        const preview = clonedWrap.querySelector('#viz-preview');
        if (preview) {
          preview.style.maxWidth = 'none';
          preview.style.width = `${width}px`;
          preview.style.minWidth = `${width}px`;
        }
        doc.querySelectorAll('svg').forEach((svg) => {
          svg.style.overflow = 'visible';
          svg.style.maxWidth = 'none';
        });
      },
    });
    return canvas;
  } finally {
    wrap.style.width = '';
    wrap.style.minWidth = '';
    wrap.style.maxWidth = '';
    wrap.style.overflow = '';
    if (previewEl) {
      previewEl.style.width = '';
      previewEl.style.minWidth = '';
      previewEl.style.maxWidth = '';
    }
    cleanupLayout();
    cleanupClass();
  }
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
    [canvas.width - sampleSize, canvas.height / 2 - sampleSize / 2],
  ];

  const ratios = regions.map(([x, y]) => sampleNonWhiteRatio(ctx, canvas, x, y, sampleSize, sampleSize));
  const avgInk = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const blankRegions = ratios.filter((r) => r < 0.02).length;
  const sampleY = Math.max(0, canvas.height * 0.35 - sampleSize / 2);
  const centerInk = sampleNonWhiteRatio(
    ctx,
    canvas,
    canvas.width / 2 - sampleSize / 2,
    sampleY,
    sampleSize,
    sampleSize,
  );
  const leftInk = sampleNonWhiteRatio(ctx, canvas, canvas.width * 0.12, sampleY, sampleSize, sampleSize);
  const rightInk = sampleNonWhiteRatio(ctx, canvas, canvas.width * 0.88 - sampleSize, sampleY, sampleSize, sampleSize);
  const lateralInk = Math.max(leftInk, rightInk);
  const chartInk = Math.max(centerInk, lateralInk);

  if (avgInk < 0.015) {
    items.push({ severity: 'error', message: 'Export looks blank — check DESIGN preview before sharing.' });
  } else if (canvas.height > 400 && chartInk < 0.02 && avgInk < 0.08) {
    items.push({ severity: 'error', message: 'Export chart area looks empty — timeline content may not have rendered.' });
  } else if (blankRegions >= 3) {
    items.push({ severity: 'warning', message: 'Export may be mostly empty — verify timeline content rendered.' });
  } else if (canvas.height > 400 && chartInk < 0.02) {
    items.push({ severity: 'warning', message: 'Export center looks empty — layout may be clipped.' });
  } else if (ratios[0] < 0.02 && ratios[3] < 0.02) {
    items.push({ severity: 'warning', message: 'Export edges look empty — layout may be clipped.' });
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
