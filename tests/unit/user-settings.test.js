import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  USER_SETTINGS_COOKIE,
  applyUserSettingsToMeta,
  loadUserSettings,
  parsePrefsCookie,
  readUserSettingsFromMeta,
  sanitizeUserSettings,
  saveUserSettings,
  serializePrefsCookie,
} from '../../js/user-settings.js';

describe('user-settings', () => {
  beforeEach(() => {
    global.document = { cookie: '' };
  });

  it('round-trips theme via cookie helpers', () => {
    const serialized = serializePrefsCookie({ theme: 'dark', timezone: 'UTC' });
    assert.match(serialized, new RegExp(`^${USER_SETTINGS_COOKIE}=`));
    const parsed = parsePrefsCookie(serialized);
    assert.equal(parsed?.theme, 'dark');
    assert.equal(parsed?.timezone, 'UTC');
  });

  it('loadUserSettings falls back to defaults', () => {
    assert.deepEqual(loadUserSettings(), {
      theme: 'light',
      timezone: 'UTC',
      accentColor: '#EE3124',
    });
  });

  it('saveUserSettings merges partial updates', () => {
    saveUserSettings({ theme: 'dark' });
    saveUserSettings({ timezone: 'Europe/London' });
    const settings = loadUserSettings();
    assert.equal(settings.theme, 'dark');
    assert.equal(settings.timezone, 'Europe/London');
  });

  it('applyUserSettingsToMeta overrides sample timeline theme', () => {
    const meta = { title: 'Sample', theme: 'light', timezone: 'UTC' };
    applyUserSettingsToMeta(meta, { theme: 'dark', timezone: 'America/New_York' });
    assert.equal(meta.theme, 'dark');
    assert.equal(meta.timezone, 'America/New_York');
    assert.equal(meta.title, 'Sample');
  });

  it('readUserSettingsFromMeta extracts display prefs', () => {
    const settings = readUserSettingsFromMeta({
      theme: 'dark',
      timezone: 'UTC',
      accentColor: '#112233',
      title: 'Incident',
    });
    assert.equal(settings.theme, 'dark');
    assert.equal(settings.accentColor, '#112233');
    assert.equal(settings.title, undefined);
  });

  it('sanitizeUserSettings rejects invalid theme', () => {
    assert.deepEqual(sanitizeUserSettings({ theme: 'sepia', timezone: 'UTC' }), { timezone: 'UTC' });
  });
});
