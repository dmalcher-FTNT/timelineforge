import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countByField,
  countByTag,
  filterEvents,
  filtersActive,
  observableFilterState,
  toggleSingleFilter,
  uniqueFieldValues,
  uniqueTagValues,
} from '../../js/edit/event-filters.js';

const events = [
  { hostname: 'HOST-A', username: 'alice', category: 'initial-access', details: 'phish', tags: ['critical'] },
  { hostname: 'HOST-A', username: 'bob', category: 'persistence', details: 'backdoor', tags: ['reviewed'] },
  { hostname: 'HOST-B', username: 'alice', category: 'exfiltration', details: 'upload', tags: ['critical'] },
];

describe('event-filters', () => {
  it('lists unique hostnames', () => {
    assert.deepEqual(uniqueFieldValues(events, 'hostname'), ['HOST-A', 'HOST-B']);
  });

  it('filters to a single host', () => {
    const out = filterEvents(events, { host: 'HOST-A' });
    assert.equal(out.length, 2);
  });

  it('combines host and category filters', () => {
    const out = filterEvents(events, { host: 'HOST-A', category: 'persistence' });
    assert.equal(out.length, 1);
    assert.equal(out[0].details, 'backdoor');
  });

  it('toggleSingleFilter deselects same value', () => {
    assert.equal(toggleSingleFilter('HOST-A', 'HOST-A'), '');
    assert.equal(toggleSingleFilter('', 'HOST-A'), 'HOST-A');
  });

  it('counts events per host', () => {
    assert.equal(countByField(events, 'hostname', 'HOST-A'), 2);
  });

  it('detects active filters', () => {
    assert.equal(filtersActive({ host: 'HOST-A' }), true);
    assert.equal(filtersActive({ tag: 'critical' }), true);
    assert.equal(filtersActive({}), false);
  });

  it('lists and filters by tags', () => {
    assert.deepEqual(uniqueTagValues(events), ['critical', 'reviewed']);
    assert.equal(countByTag(events, 'critical'), 2);
    assert.equal(filterEvents(events, { tag: 'reviewed' }).length, 1);
  });

  it('observableFilterState uses host chip for known hostnames', () => {
    const hosts = ['HOST-A', 'HOST-B'];
    assert.deepEqual(observableFilterState('HOST-A', hosts, {}), {
      search: '', host: 'HOST-A', user: '', category: '', tag: '', technique: '',
    });
    assert.deepEqual(observableFilterState('HOST-A', hosts, { host: 'HOST-A' }), {
      search: '', host: '', user: '', category: '', tag: '', technique: '',
    });
  });

  it('observableFilterState uses search for other observables', () => {
    assert.deepEqual(observableFilterState('10.0.0.5', ['HOST-A'], {}), {
      search: '10.0.0.5', host: '', user: '', category: '', tag: '', technique: '',
    });
    assert.deepEqual(observableFilterState('10.0.0.5', ['HOST-A'], { search: '10.0.0.5' }), {
      search: '', host: '', user: '', category: '', tag: '', technique: '',
    });
  });

  it('filters by MITRE technique including sub-techniques', () => {
    const withTechniques = [
      { technique: 'T1059.001', details: 'powershell' },
      { technique: 'T1059.003', details: 'cmd' },
      { technique: 'T1566', details: 'phish' },
    ];
    assert.equal(filterEvents(withTechniques, { technique: 'T1059' }).length, 2);
    assert.equal(filterEvents(withTechniques, { technique: 'T1566' }).length, 1);
    assert.equal(filtersActive({ technique: 'T1059' }), true);
  });
});
