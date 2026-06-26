import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const jsRoot = join(root, 'js');
const importRe = /(?:import|export)\s+(?:[\s\S]*?\sfrom\s)?['"](\.\.?\/[^'"]+)['"]/g;

function collectLocalJsFiles(startFile, seen = new Set()) {
  const abs = resolve(dirname(startFile), startFile.endsWith('.js') ? startFile : startFile);
  const file = abs.endsWith('.js') ? abs : `${abs}.js`;
  if (seen.has(file) || !existsSync(file)) return seen;
  seen.add(file);
  const src = readFileSync(file, 'utf8');
  let m;
  while ((m = importRe.exec(src))) {
    const rel = m[1];
    if (!rel.startsWith('.')) continue;
    collectLocalJsFiles(join(dirname(file), rel), seen);
  }
  return seen;
}

describe('local module graph', () => {
  it('resolves all local imports from bootstrap.js', () => {
    const bootstrap = join(jsRoot, 'bootstrap.js');
    const files = collectLocalJsFiles(bootstrap);
    assert.ok(files.size > 10, `expected many modules, got ${files.size}`);
    for (const f of files) {
      assert.ok(existsSync(f), `missing module: ${f}`);
    }
  });

  it('exports vizTitleHtml from viz-helpers', () => {
    const helpers = join(jsRoot, 'design', 'viz-helpers.js');
    const src = readFileSync(helpers, 'utf8');
    assert.match(src, /export function vizTitleHtml/);
  });

  it('wires workflow tools and sample scenarios in app.js', () => {
    const app = readFileSync(join(jsRoot, 'app.js'), 'utf8');
    assert.match(app, /link-sequential/);
    assert.match(app, /applyLinkSequential/);
    assert.match(app, /fileSamples:/);
  });
});
