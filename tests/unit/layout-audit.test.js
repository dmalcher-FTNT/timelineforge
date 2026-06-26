import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PSEUDO_ANCHOR_SELECTORS,
  isPositionedLayout,
} from '../../js/output/layout-audit.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const mainCss = readFileSync(join(root, 'css/main.css'), 'utf8');

describe('layout-audit helpers', () => {
  it('isPositionedLayout accepts positioned values', () => {
    assert.equal(isPositionedLayout('relative'), true);
    assert.equal(isPositionedLayout('absolute'), true);
    assert.equal(isPositionedLayout('fixed'), true);
    assert.equal(isPositionedLayout('sticky'), true);
    assert.equal(isPositionedLayout('static'), false);
    assert.equal(isPositionedLayout(''), false);
  });

  it('lists known pseudo-element anchor selectors', () => {
    assert.ok(PSEUDO_ANCHOR_SELECTORS.some((e) => e.selector === '.soc-timeline'));
    assert.ok(PSEUDO_ANCHOR_SELECTORS.every((e) => e.selector && e.label));
  });
});

describe('CSS pseudo-element anchors', () => {
  it('.soc-timeline is positioned so ::before spine stays contained', () => {
    assert.match(
      mainCss,
      /\.soc-timeline\s*\{[^}]*position\s*:\s*relative/,
      'SOC timeline spine requires position: relative on .soc-timeline',
    );
  });

  it('header menus use theme-independent popover colors', () => {
    assert.match(mainCss, /\.header-menu\s*\{[^}]*--menu-text:/);
    assert.match(mainCss, /\.header-menu-item\s*\{[^}]*color:\s*var\(--menu-text\)/);
  });

  it('.overview-lane-track is positioned for lane axis pseudo-elements', () => {
    assert.match(
      mainCss,
      /\.overview-lane-track\s*\{[^}]*position\s*:\s*relative/,
    );
  });

  PSEUDO_ANCHOR_SELECTORS.forEach(({ selector }) => {
    const className = selector.replace(/^\./, '');
    it(`${selector} has a CSS rule block`, () => {
      assert.match(mainCss, new RegExp(`\\.${className.replace('.', '\\.')}\\s*\\{`));
    });
  });
});
