import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  analyzeTimeline,
  analysisIssues,
  analysisRecommendations,
  QUALITY_RULES,
} from '../../js/edit/analyzer.js';

describe('analyzeTimeline quality rules', () => {
  it('flags missing hostname with rule metadata and event index', () => {
    const events = [
      { id: 'a', timestampStart: '2024-01-01T10:00:00Z', hostname: 'HOST-1', username: 'u', details: 'ok', category: 'initial-access', phase: 1 },
      { id: 'b', timestampStart: '2024-01-02T10:00:00Z', hostname: 'N/A', username: 'u', details: 'no host', category: 'initial-access', phase: 1 },
    ];
    const result = analyzeTimeline(events);
    const recs = analysisRecommendations(result);
    const hostRec = recs.find((r) => r.rule === 'missing-hostname');
    assert.ok(hostRec);
    assert.equal(hostRec.eventIndex, 2);
    assert.equal(hostRec.eventId, 'b');
    assert.match(hostRec.message, /Event #2/);
    assert.equal(hostRec.ruleHint, QUALITY_RULES['missing-hostname'].hint);
  });

  it('splits errors from recommendations', () => {
    const events = [
      { id: 'a', timestampStart: 'invalid', hostname: 'H', username: 'u', details: '', category: 'x', phase: 1 },
    ];
    const result = analyzeTimeline(events);
    assert.ok(analysisIssues(result).some((i) => i.severity === 'error'));
    assert.ok(analysisIssues(result).some((i) => i.severity === 'warning'));
  });
});
