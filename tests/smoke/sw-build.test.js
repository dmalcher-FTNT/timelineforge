import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('service worker build', () => {
  it('dist sw uses lib/ DEPS without broken path guards', () => {
    execSync('npm run build', { cwd: root, stdio: 'pipe' });
    const sw = readFileSync(join(root, 'dist/sw.js'), 'utf8');
    assert.match(sw, /const DEPS = '\.\/lib\/';/);
    assert.match(sw, /\$\{DEPS\}alpinejs\.mjs/);
    assert.match(sw, /!path\.includes\('\/vendor\/'\)/);
    assert.match(sw, /!path\.includes\('\/lib\/'\)/);
    assert.match(sw, /isStaleHtml/);
    assert.match(sw, /networkOnlyDocument/);
  });
});
