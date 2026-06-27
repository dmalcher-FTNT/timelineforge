import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { hasWelcomeBeenSeen, markWelcomeSeen, WELCOME_SEEN_KEY } from '../../js/onboarding.js';

const storage = new Map();

describe('onboarding', () => {
  beforeEach(() => {
    storage.clear();
    global.localStorage = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    };
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('tracks welcome completion', () => {
    assert.equal(hasWelcomeBeenSeen(), false);
    markWelcomeSeen();
    assert.equal(hasWelcomeBeenSeen(), true);
    assert.equal(storage.get(WELCOME_SEEN_KEY), '1');
  });
});
