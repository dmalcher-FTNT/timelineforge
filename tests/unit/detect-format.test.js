import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectInputFormat } from '../../js/input/detect-format.js';

describe('detectInputFormat', () => {
  it('detects Hayabusa CSV headers', () => {
    const csv = `Timestamp,RuleTitle,Level,Computer,Channel,EventID,Details
2024-03-01T10:00:00.000Z,Logon Success,info,DC-01,Security,4624,Successful logon`;
    const detected = detectInputFormat(csv);
    assert.equal(detected.mode, 'import');
    assert.equal(detected.importTool, 'hayabusa');
    assert.equal(detected.confidence, 'high');
  });

  it('detects EvtxECmd CSV headers', () => {
    const csv = `TimeCreated,EventId,Computer,UserName,Channel,MapDescription
2024-03-01 10:00:00.000,4624,WS-01,user,Security,Logon`;
    const detected = detectInputFormat(csv);
    assert.equal(detected.importTool, 'evtxecmd');
  });

  it('detects markdown tables', () => {
    const md = `| DATE | HOST | USER | DETAILS |
| --- | --- | --- | --- |
| 2024-01-01 | H1 | u1 | test |`;
    const detected = detectInputFormat(md);
    assert.equal(detected.mode, 'table');
  });

  it('detects Elastic JSON', () => {
    const json = JSON.stringify({ hits: { hits: [{ _source: { '@timestamp': '2024-01-01', message: 'alert' } }] } });
    const detected = detectInputFormat(json);
    assert.equal(detected.importTool, 'elastic');
  });
});
