export function exportSVG(previewElement, filename) {
  const svgs = previewElement?.querySelectorAll('svg') || [];
  if (!svgs.length) throw new Error('No SVG found in preview — try a chart style (Gantt, Fahrplan, Attack Flow).');

  if (svgs.length === 1) {
    downloadSvg(svgs[0], filename);
    return;
  }

  const combined = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  combined.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  let yOffset = 0;
  svgs.forEach((svg) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(0, ${yOffset})`);
    g.appendChild(svg.cloneNode(true));
    combined.appendChild(g);
    const h = svg.viewBox?.baseVal?.height || svg.getBoundingClientRect().height || 200;
    yOffset += h + 20;
  });
  combined.setAttribute('viewBox', `0 0 1100 ${yOffset}`);
  downloadSvg(combined, filename);
}

export function exportPrint() {
  window.print();
}

function downloadSvg(svgEl, filename) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
}
