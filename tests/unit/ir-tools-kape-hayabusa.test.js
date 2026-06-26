import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseKape, parseHayabusa, parseEvtxecmd } from '../../js/input/ir-tools.js';

describe('KAPE parser', () => {
  it('parses KAPE timeline CSV', () => {
    const csv = `Timestamp,Timeline Description,Record Source,Computer Name,Username,File Name
2024-03-01 10:00:00,User logon,Security.evtx,WS-01,jsmith,Security.evtx
2024-03-01 10:05:00,Process creation,Prefetch,WS-01,jsmith,cmd.exe`;
    const events = parseKape(csv);
    assert.equal(events.length, 2);
    assert.equal(events[0].hostname, 'WS-01');
    assert.equal(events[0].username, 'jsmith');
    assert.match(events[0].details, /User logon/);
    assert.match(events[0].details, /Security\.evtx/);
  });
});

describe('Hayabusa parser', () => {
  it('parses Hayabusa CSV export', () => {
    const csv = `Timestamp,RuleTitle,Level,Computer,Channel,EventID,Details
2024-03-01T10:00:00.000Z,Logon Success,info,DC-01,Security,4624,Successful logon`;
    const events = parseHayabusa(csv);
    assert.equal(events.length, 1);
    assert.equal(events[0].hostname, 'DC-01');
    assert.match(events[0].details, /Successful logon/);
    assert.ok(events[0].tags.includes('Security'));
  });
});

describe('EvtxECmd parser', () => {
  it('parses EvtxECmd CSV export', () => {
    const csv = `TimeCreated,EventId,Computer,UserName,Channel,MapDescription,PayloadData1
2024-03-01 10:00:00.000,4624,WS-01,DOMAIN\\jsmith,Security,Successful logon,Logon Type 2`;
    const events = parseEvtxecmd(csv);
    assert.equal(events.length, 1);
    assert.equal(events[0].hostname, 'WS-01');
    assert.equal(events[0].username, 'DOMAIN\\jsmith');
    assert.match(events[0].details, /Successful logon/);
    assert.ok(events[0].tags.includes('Security'));
    assert.ok(events[0].tags.includes('EID:4624'));
  });
});
