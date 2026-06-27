/**
 * Scale content to fit a page box without clipping edges.
 * @param {number} contentW
 * @param {number} contentH
 * @param {number} boxW
 * @param {number} boxH
 */
export function fitToBox(contentW, contentH, boxW, boxH) {
  if (!contentW || !contentH || !boxW || !boxH) {
    return { width: boxW, height: boxH, scale: 1 };
  }
  const scale = Math.min(boxW / contentW, boxH / contentH);
  return {
    width: contentW * scale,
    height: contentH * scale,
    scale,
  };
}

/** Pick PDF orientation from content aspect ratio. */
export function choosePdfOrientation(contentW, contentH) {
  return contentW >= contentH ? 'landscape' : 'portrait';
}

/**
 * Plan raster slices for multi-page PDF when scaled height exceeds one page.
 * @param {number} canvasH
 * @param {number} drawW — target width on page (pt)
 * @param {number} drawH — full scaled height on page (pt)
 * @param {number} pageSliceH — max height per page (pt)
 */
export function planCanvasPdfPages(canvasH, drawW, drawH, pageSliceH) {
  if (drawH <= pageSliceH) {
    return [{ srcY: 0, slicePx: canvasH, drawH }];
  }
  const sliceRatio = canvasH / drawH;
  const pages = [];
  let srcY = 0;
  while (srcY < canvasH) {
    const drawSliceH = Math.min(pageSliceH, drawH - (pages.length * pageSliceH));
    const slicePx = Math.min(canvasH - srcY, Math.ceil(drawSliceH * sliceRatio));
    pages.push({ srcY, slicePx, drawH: drawSliceH });
    srcY += slicePx;
  }
  return pages;
}

/** Scale factor for html2canvas — cap memory on very large layouts. */
export function exportCaptureScale(width, height, maxDim = 4096) {
  const longest = Math.max(width, height, 1);
  return Math.min(2, maxDim / longest);
}
