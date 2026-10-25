/** Contract tests for the colour-string helpers the picker parses its `value` with. */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractAlpha, extractBaseHex, rgbToHex, hexToHsv } from '../utils.ts';

describe('extractAlpha', () => {
  it('reads a 0-1 number alpha', () => assert.equal(extractAlpha('rgba(255, 107, 53, 0.5)'), 50));
  it('reads a percentage alpha', () => assert.equal(extractAlpha('rgb(255 107 53 / 50%)'), 50));
  it('reads 8-digit hex alpha', () => assert.equal(extractAlpha('#ff6b3580'), 50));
  it('treats plain hex as opaque', () => assert.equal(extractAlpha('#ff6b35'), 100));
});

describe('extractBaseHex', () => {
  it('expands 3-digit hex', () => assert.equal(extractBaseHex('#f63'), '#ff6633'));
  it('strips 8-digit hex alpha', () => assert.equal(extractBaseHex('#ff6b3580'), '#ff6b35'));
  it('converts rgba()', () => assert.equal(extractBaseHex('rgba(255, 107, 53, 0.5)'), '#ff6b35'));
  it('yields a hex hexToHsv can parse', () => assert.ok(!Number.isNaN(hexToHsv(extractBaseHex('#abc')).h)));
});

describe('rgbToHex', () => {
  it('pads single-digit channels', () => assert.equal(rgbToHex(0, 10, 255), '#000aff'));
});
