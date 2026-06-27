const DEFENDER_TAG_RE = /containment|remediation|response|isolated|quarantine|eradication|recovery|mitigated/i;
const DEFENDER_DETAIL_RE = /\b(contain(ed|ment)|isolat(ed|ion)|quarantin|remediat|eradicat|recovery|blocked|detected by|alert(ed)?|incident response|defender|edr|siem alert|threat hunt)\b/i;

/** Classify timeline events for attacker vs defender swimlanes. */
export function classifyEventActor(evt) {
  if (!evt) return 'attacker';
  if (evt.category === 'detection') return 'defender';
  const tags = (evt.tags || []).join(' ');
  if (DEFENDER_TAG_RE.test(tags)) return 'defender';
  if (DEFENDER_DETAIL_RE.test(evt.details || '')) return 'defender';
  return 'attacker';
}

export function actorLaneLabel(actor) {
  return actor === 'defender' ? 'Defender response' : 'Attacker actions';
}
