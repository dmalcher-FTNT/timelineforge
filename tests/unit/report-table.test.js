import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPipeTables,
  parseReportText,
  parseWhitespaceTimelineTable,
  processInput,
} from '../../js/input/parser.js';

describe('extractPipeTables', () => {
  it('finds multiple pipe tables in report text', () => {
    const text = `Intro paragraph

| DATE | HOST | DETAILS |
| --- | --- | --- |
| 2024-01-01 | H1 | First |

More text

| DATE | HOST | DETAILS |
| --- | --- | --- |
| 2024-02-01 | H2 | Second |`;
    assert.equal(extractPipeTables(text).length, 2);
  });
});

describe('parseWhitespaceTimelineTable', () => {
  it('parses space-aligned columns from PDF-style text', () => {
    const text = `Incident appendix

DATE/TIME (UTC)    HOSTNAME    USERNAME    DETAILS
2024-10-03 10:19   HOST-001    jsmith      Phishing link clicked
2024-10-03 11:02   HOST-002    jsmith      Malware executed`;
    const events = parseWhitespaceTimelineTable(text);
    assert.equal(events.length, 2);
    assert.equal(events[0].hostname, 'HOST-001');
    assert.match(events[0].details, /Phishing/i);
  });
});

describe('parseReportText', () => {
  it('prefers whitespace table when no pipe table present', () => {
    const events = parseReportText(`Summary
DATE/TIME    HOST    DETAILS
2024-05-01 09:00   SRV-1   Lateral movement detected`);
    assert.equal(events.length, 1);
    assert.equal(events[0].hostname, 'SRV-1');
  });

  it('parses via report mode in processInput', () => {
    const events = processInput({
      mode: 'report',
      text: `| DATE | HOST | DETAILS |
| --- | --- | --- |
| 2024-03-01 | DC-01 | GPO abuse |`,
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].hostname, 'DC-01');
  });
});
