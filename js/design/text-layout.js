/** Display text limits aligned with executive / SOC timeline mockups. */
export const TEXT_LIMITS = {
  socDetails: 140,
  socTakeaway: 110,
  milestone: 85,
  columnItem: 52,
  chevronSummary: 105,
  chevronTitle: 42,
  phaseLabel: 16,
  host: 16,
  user: 22,
  metaPair: 28,
  ganttHost: 20,
  retroDetails: 88,
  scribingDetails: 65,
  attackNode: 36,
  compareCard: 95,
  appendixDetails: 72,
};

/** Collapse whitespace and strip control characters for clean viz text. */
export function normalizeText(s) {
  if (!s) return '';
  return String(s)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Truncate at character limit, preferring word boundaries. */
export function truncateWords(s, maxLen) {
  const text = normalizeText(s);
  if (!text || text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxLen * 0.55 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trim()}…`;
}

export function truncate(s, n) {
  return truncateWords(s, n);
}

/** Normalize then truncate for display in timeline boxes. */
export function displayText(s, maxLen) {
  return truncateWords(s, maxLen);
}

/** Split text into wrapped lines for SVG labels (max chars per line, max lines). */
export function wrapSvgLines(s, maxCharsPerLine, maxLines) {
  const text = normalizeText(s);
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length > maxCharsPerLine && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = truncateWords(last, maxCharsPerLine);
  }
  return lines;
}
