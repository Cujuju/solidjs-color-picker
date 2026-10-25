/** Contract tests for the colour parser and the helpers built on it. */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, extractAlpha, extractBaseHex, applyAlpha, rgbToHex, rgbToHsv, hsvToRgb, hexToHsv, carryHsv, parseRgbInput } from '../utils.ts';

describe('parseColor', () => {
  it('reads every hex length', () => {
    assert.deepEqual(parseColor('#f63'), { r: 255, g: 102, b: 51, a: 1 });
    assert.deepEqual(parseColor('#f638'), { r: 255, g: 102, b: 51, a: 0x88 / 255 });
    assert.deepEqual(parseColor('#FF6633'), { r: 255, g: 102, b: 51, a: 1 });
    assert.deepEqual(parseColor('#ff663380'), { r: 255, g: 102, b: 51, a: 0x80 / 255 });
  });
  it('reads rgb() and rgba() in comma and space syntax', () => {
    assert.deepEqual(parseColor('rgb(255, 102, 51)'), { r: 255, g: 102, b: 51, a: 1 });
    assert.deepEqual(parseColor('rgba(255, 102, 51, 0.5)'), { r: 255, g: 102, b: 51, a: 0.5 });
    assert.deepEqual(parseColor('rgb(255 102 51 / 50%)'), { r: 255, g: 102, b: 51, a: 0.5 });
  });
  it('clamps out-of-range parts as CSS does', () => {
    assert.deepEqual(parseColor('rgba(300, 0, 0, 2)'), { r: 255, g: 0, b: 0, a: 1 });
  });
  it('returns null for what it cannot read', () => {
    for (const s of ['red', 'hsl(0 100% 50%)', '#ff66f', '#ggg', 'rgb(1, 2)', '']) assert.equal(parseColor(s), null, s);
  });
});

describe('alpha and base-hex helpers', () => {
  it('extractAlpha covers every format', () => {
    assert.equal(extractAlpha('#ff6b3580'), 50);
    assert.equal(extractAlpha('rgb(255 107 53 / 50%)'), 50);
    assert.equal(extractAlpha('#ff6b35'), 100);
    assert.equal(extractAlpha('red'), 100);
  });
  it('extractBaseHex normalises to lowercase 6-digit hex, passing unreadable input through', () => {
    assert.equal(extractBaseHex('#F63'), '#ff6633');
    assert.equal(extractBaseHex('rgba(255, 107, 53, 0.5)'), '#ff6b35');
    assert.equal(extractBaseHex(' red '), 'red');
  });
  it('applyAlpha emits 6 digits when opaque, 8 otherwise, and clamps', () => {
    assert.equal(applyAlpha('#f63', 100), '#ff6633');
    assert.equal(applyAlpha('ff6633', 50), '#ff663380');
    assert.equal(applyAlpha('#ff6633', -5), '#ff663300');
  });
});

describe('conversions', () => {
  it('round-trips every 8-bit channel value through HSV', () => {
    for (let n = 0; n <= 255; n++) {
      const rgb = { r: n, g: 255 - n, b: (n * 7) % 256 };
      assert.deepEqual(hsvToRgb(rgbToHsv(rgb)), rgb);
    }
  });
  it('rgbToHex pads single-digit channels', () => assert.equal(rgbToHex({ r: 0, g: 10, b: 255 }), '#000aff'));
  it('hexToHsv throws on a non-hex string instead of returning NaN', () => assert.throws(() => hexToHsv('red'), TypeError));
});

describe('carryHsv', () => {
  const prev = { h: 200, s: 60, v: 80 };
  it('keeps hue for a grey', () => assert.deepEqual(carryHsv({ h: 0, s: 0, v: 50 }, prev), { h: 200, s: 0, v: 50 }));
  it('keeps hue and saturation for black', () => assert.deepEqual(carryHsv({ h: 0, s: 0, v: 0 }, prev), { h: 200, s: 60, v: 0 }));
  it('passes a chromatic colour through', () => assert.deepEqual(carryHsv({ h: 10, s: 50, v: 50 }, prev), { h: 10, s: 50, v: 50 }));
});

describe('parseRgbInput', () => {
  it('rejects partial numbers', () => assert.equal(parseRgbInput('12a, 0, 0'), null));
});
