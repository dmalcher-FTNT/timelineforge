import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exportBasename, exportTitle } from '../../js/output/export-names.js';

describe('export names', () => {
  it('returns blank title when unset', () => {
    assert.equal(exportTitle({}), '');
    assert.equal(exportTitle({ title: '  ' }), '');
  });

  it('uses timeline basename when no title', () => {
    assert.equal(exportBasename({}), 'timeline');
  });

  it('slugifies titles for filenames', () => {
    assert.equal(exportBasename({ title: 'APT Campaign Q1' }), 'apt-campaign-q1');
  });
});
