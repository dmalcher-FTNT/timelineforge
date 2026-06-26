import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCrowdStrike, parseDefenderXdr, parseWazuh } from '../../js/input/ir-tools.js';

describe('new SIEM parsers', () => {
  it('parses CrowdStrike alerts', () => {
    const events = parseCrowdStrike(JSON.stringify({
      resources: [{
        timestamp: '2024-06-01T12:00:00Z',
        hostname: 'WS-01',
        user_name: 'alice',
        description: 'Suspicious process',
        technique_id: 'T1059',
      }],
    }));
    assert.equal(events.length, 1);
    assert.equal(events[0].hostname, 'WS-01');
    assert.equal(events[0].technique, 'T1059');
  });

  it('parses Defender XDR alerts', () => {
    const events = parseDefenderXdr(JSON.stringify({
      value: [{
        createdDateTime: '2024-06-01T12:00:00Z',
        title: 'Ransomware activity',
        computerDnsName: 'PC-02',
        accountName: 'bob',
        mitreTechniques: ['T1486'],
      }],
    }));
    assert.equal(events.length, 1);
    assert.equal(events[0].technique, 'T1486');
  });

  it('parses Wazuh hits', () => {
    const events = parseWazuh(JSON.stringify({
      hits: {
        hits: [{
          _source: {
            timestamp: '2024-06-01T12:00:00Z',
            agent: { name: 'agent-1' },
            rule: { description: 'SSH login', mitre: { id: ['T1021'] } },
          },
        }],
      },
    }));
    assert.equal(events.length, 1);
    assert.equal(events[0].technique, 'T1021');
  });
});
