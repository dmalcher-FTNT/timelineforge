import { formatDate, formatDateRange } from './utils.js';
import { normalizeText, truncateWords } from './design/text-layout.js';

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function peelSeparators(text) {
  return text.replace(/^[\s|·,;:—–\-→]+/, '').trim();
}

const LEADING_DATE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?(?:\s*(?:→|–|->| to )\s*\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?(?:Z)?)?/i;

const LEADING_EU_DATE =
  /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?(?:\s*(?:→|–|->| to )\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)?/;

const LEADING_TEXT_DATE =
  /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?(?:\s*(?:→|–|->| to )\s*\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)?/i;

const LEADING_CONNECTOR = /^(?:and|then|also|or|plus|&)\s+/i;

const PLACEHOLDER_FIELD = /^(?:N\/A|NA|None|null|unknown|multiple|not applicable|-+|—+)$/i;

const STRUCTURED_ROW_SEP = /\s*[—–|]\s*/;

function isPlaceholderField(text) {
  const t = normalizeText(text);
  return !t || PLACEHOLDER_FIELD.test(t);
}

function peelLeadingConnectors(text) {
  let out = text;
  for (let i = 0; i < 4; i += 1) {
    const next = out.replace(LEADING_CONNECTOR, '');
    if (next === out) break;
    out = peelSeparators(next);
  }
  return out;
}

function stripDateTokens(text) {
  return normalizeText(
    text
      .replace(
        /(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/gi,
        ' ',
      )
      .replace(/\b(?:and|to|through|until|between)\b/gi, ' '),
  );
}

function isDateOnlySegment(text) {
  const t = peelLeadingConnectors(normalizeText(text));
  if (!t) return true;
  if (LEADING_DATE.test(t) || LEADING_EU_DATE.test(t) || LEADING_TEXT_DATE.test(t)) return true;
  return stripDateTokens(t) === '';
}

function peelLeadingDates(text) {
  let out = text;
  for (let i = 0; i < 4; i += 1) {
    const next = out
      .replace(LEADING_DATE, '')
      .replace(LEADING_EU_DATE, '')
      .replace(LEADING_TEXT_DATE, '');
    if (next === out) break;
    out = peelSeparators(next);
  }
  return out;
}

function peelLeadingField(text, value) {
  const v = normalizeText(value);
  if (!v || isPlaceholderField(v)) return text;
  const re = new RegExp(`^${escapeRegex(v)}\\b`, 'i');
  return peelSeparators(text.replace(re, ''));
}

function dateHintVariants(start, end) {
  const variants = [];
  if (!start) return variants;
  try {
    variants.push(formatDateRange(start, end, { timezone: 'UTC' }));
    variants.push(formatDateRange(start, null, { timezone: 'UTC' }));
    variants.push(formatDate(start, { timezone: 'UTC' }));
  } catch {
    /* ignore invalid dates */
  }
  const iso = String(start);
  variants.push(iso, iso.slice(0, 19), iso.slice(0, 16), iso.slice(0, 10));
  if (end) {
    const endIso = String(end);
    variants.push(endIso, endIso.slice(0, 19), endIso.slice(0, 10));
  }
  return [...new Set(variants.filter(Boolean))].sort((a, b) => b.length - a.length);
}

function isTimeOnlyToken(text) {
  return /^\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:\s*(?:UTC|GMT))?$/i.test(text);
}

function isTimezoneToken(text) {
  return /^(UTC|GMT|[+-]\d{2}:?\d{2})$/i.test(text);
}

function segmentMatchesDate(text, event) {
  if (!text) return false;
  if (isDateOnlySegment(text)) return true;
  return dateHintVariants(event?.timestampStart, event?.timestampEnd).some((hint) => {
    const h = normalizeText(hint);
    const t = peelLeadingConnectors(normalizeText(text));
    return h && (t === h || t.startsWith(h) || h.startsWith(t));
  });
}

function segmentMatchesField(text, value) {
  if (isPlaceholderField(text)) return true;
  const v = normalizeText(value);
  const t = normalizeText(text);
  if (!v || !t || isPlaceholderField(v)) return false;
  return t.toLowerCase() === v.toLowerCase();
}

/** When details reuse table columns joined by | or —, keep the narrative tail only. */
function extractNarrativeTail(text, event) {
  const segments = text
    .split(STRUCTURED_ROW_SEP)
    .map((s) => normalizeText(s))
    .filter(Boolean);
  if (segments.length <= 1) return text;

  const narrative = segments.filter((segment) => (
    !segmentMatchesDate(segment, event)
    && !segmentMatchesField(segment, event?.hostname)
    && !segmentMatchesField(segment, event?.username)
    && !isPlaceholderField(segment)
    && !isTimeOnlyToken(segment)
    && !isTimezoneToken(segment)
  ));

  if (narrative.length === 1) return narrative[0];
  if (narrative.length > 1) return narrative.join(' — ');
  return segments[segments.length - 1];
}

/**
 * Split manual/report lines shaped like DATE — HOST — USER — DETAILS.
 * Returns narrative column when separators are present.
 */
export function splitStructuredManualLine(line) {
  const parts = line.split(STRUCTURED_ROW_SEP).map((p) => normalizeText(p)).filter(Boolean);
  if (parts.length < 2) return null;

  if (parts.length >= 4) {
    return {
      dateText: parts[0],
      hostname: parts[1],
      username: parts[2],
      narrative: parts.slice(3).join(' — '),
    };
  }

  if (parts.length === 3) {
    const hostLike = /\b(?:HOST|SERVER|WORKSTATION|DC|VPN|DOMAIN)[-_\\]?/i.test(parts[1]);
    if (isPlaceholderField(parts[1]) || hostLike) {
      return {
        dateText: parts[0],
        hostname: isPlaceholderField(parts[1]) ? 'N/A' : parts[1],
        username: 'N/A',
        narrative: parts[2],
      };
    }
    return {
      dateText: parts[0],
      hostname: 'N/A',
      username: 'N/A',
      narrative: parts[parts.length - 1],
    };
  }

  return {
    dateText: parts[0],
    hostname: 'N/A',
    username: 'N/A',
    narrative: parts[parts.length - 1],
  };
}

/**
 * Remove timestamp / host / user prefixes already shown in structured event fields.
 */
export function dedupeEventDetails(event) {
  const original = normalizeText(event?.details);
  if (!original) return '';

  let text = peelLeadingConnectors(original);
  for (const hint of dateHintVariants(event?.timestampStart, event?.timestampEnd)) {
    if (text.startsWith(hint)) {
      text = peelSeparators(text.slice(hint.length));
    }
  }

  for (let i = 0; i < 8; i += 1) {
    const before = text;
    text = peelLeadingConnectors(text);
    text = peelLeadingDates(text);
    text = peelLeadingField(text, event?.hostname);
    text = peelLeadingField(text, event?.username);
    text = peelSeparators(text);
    if (/^(UTC|GMT)\b/i.test(text)) text = peelSeparators(text.replace(/^(UTC|GMT)\b/i, ''));
    if (isTimeOnlyToken(text)) text = '';
    if (isPlaceholderField(text)) text = '';
    text = peelSeparators(text);
    if (text === before) break;
  }

  text = extractNarrativeTail(text, event);
  text = peelLeadingConnectors(text);
  text = peelSeparators(text);

  if (!text) return original;
  if (text.length < 12 && original.length > text.length + 20) return original;
  return text;
}

/** Narrative-only details for viz boxes and exports. */
export function displayEventDetails(event, maxLen) {
  return truncateWords(dedupeEventDetails(event), maxLen);
}

/** Strip structured columns from a raw manual input line. */
export function narrativeFromManualLine(line, { timestampStart, timestampEnd, hostname, username }) {
  const structured = splitStructuredManualLine(line);
  const source = structured?.narrative || line;
  let text = normalizeText(source);
  if (!text) return '';

  text = stripDateTokens(text);
  text = peelLeadingConnectors(text);
  text = peelLeadingField(text, hostname);
  text = peelLeadingField(text, username);
  text = peelSeparators(text);

  const cleaned = dedupeEventDetails({
    timestampStart,
    timestampEnd,
    hostname,
    username,
    details: text,
  });

  return cleaned || text || structured?.narrative || line.trim();
}
