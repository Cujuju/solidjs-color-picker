/** Color parsing and conversion. Pure; every string input goes through `parseColor`. */

import type { HsvColor, RgbColor, RgbaColor } from './types';

// ── Parsing ──────────────────────────────────────────────────────────────────

const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** rgb()/rgba() in comma or space syntax; alpha after `,` or `/`, as a 0-1 number or a percentage. */
const RGB_FN_RE = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/i;
const CHANNEL_MAX = 255;
const PERCENT = 100;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Parse #rgb, #rgba, #rrggbb, #rrggbbaa, rgb() or rgba(). Out-of-range parts clamp, as in CSS.
 * @returns channels 0-255 and alpha 0-1, or null for anything else (named colours, hsl(), malformed)
 */
export function parseColor(color: string): RgbaColor | null {
  const s = color.trim();
  const hex = HEX_RE.exec(s);
  if (hex) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    const byte = (i: number) => parseInt(digits.slice(i * 2, i * 2 + 2), 16);
    return { r: byte(0), g: byte(1), b: byte(2), a: digits.length === 8 ? byte(3) / CHANNEL_MAX : 1 };
  }
  const fn = RGB_FN_RE.exec(s);
  if (!fn) return null;
  const [r, g, b] = fn.slice(1, 4).map((c) => clamp(Math.round(parseFloat(c)), 0, CHANNEL_MAX));
  const a = fn[4] === undefined ? 1 : parseFloat(fn[4]) / (fn[5] ? PERCENT : 1);
  return { r, g, b, a: clamp(a, 0, 1) };
}

/** Parse "r, g, b" (comma or space separated, integers 0-255); null otherwise. */
export function parseRgbInput(input: string): RgbColor | null {
  const parts = input.trim().split(/[\s,]+/).map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= CHANNEL_MAX)) {
    return { r: parts[0], g: parts[1], b: parts[2] };
  }
  return null;
}

// ── HSV / RGB / Hex conversions ──────────────────────────────────────────────

/** Convert RGB (0-255) to HSV (h 0-360, s and v 0-100). */
export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const [rn, gn, bn] = [r, g, b].map((c) => c / CHANNEL_MAX);
  const max = Math.max(rn, gn, bn);
  const d = max - Math.min(rn, gn, bn);
  let hue = 0;
  if (d !== 0) {
    if (max === rn) hue = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) hue = ((bn - rn) / d + 2) * 60;
    else hue = ((rn - gn) / d + 4) * 60;
  }
  return { h: hue, s: max === 0 ? 0 : (d / max) * PERCENT, v: max * PERCENT };
}

/** Convert HSV (h 0-360, s and v 0-100) to RGB (0-255). */
export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const vn = v / PERCENT;
  const c = vn * (s / PERCENT);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to255 = (n: number) => Math.round((n + m) * CHANNEL_MAX);
  return { r: to255(r), g: to255(g), b: to255(b) };
}

/** Convert RGB (0-255) to a 6-digit hex string like "#ff0000". */
export function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Convert HSV to a 6-digit hex string like "#ff0000". */
export function hsvToHex(hsv: HsvColor): string {
  return rgbToHex(hsvToRgb(hsv));
}

/**
 * Convert hex (3, 4, 6 or 8 digits; "#" optional) to HSV, ignoring alpha.
 * @throws TypeError when `hex` is not a hex colour
 */
export function hexToHsv(hex: string): HsvColor {
  const c = parseColor(hex.startsWith('#') ? hex : `#${hex}`);
  if (!c) throw new TypeError(`hexToHsv: not a hex colour: "${hex}"`);
  return rgbToHsv(c);
}

/** `next`, keeping what it leaves undetermined from `prev`: hue for a grey, hue and saturation for black. */
export function carryHsv(next: HsvColor, prev: HsvColor): HsvColor {
  if (next.v === 0) return { ...next, h: prev.h, s: prev.s };
  if (next.s === 0) return { ...next, h: prev.h };
  return next;
}

// ── Alpha helpers ────────────────────────────────────────────────────────────

/** Alpha (0-100) of any `parseColor` format; 100 when the string has no alpha or does not parse. */
export function extractAlpha(color: string): number {
  return Math.round((parseColor(color)?.a ?? 1) * PERCENT);
}

/**
 * The 7-character base hex ("#ff0000") of any `parseColor` format, alpha dropped.
 * A string that does not parse is returned trimmed and unchanged.
 */
export function extractBaseHex(color: string): string {
  const c = parseColor(color);
  return c ? rgbToHex(c) : color.trim();
}

/**
 * Apply alpha (0-100) to a hex color, returning 8-digit hex.
 * If alpha >= 100, returns standard 6-digit hex.
 */
export function applyAlpha(hex: string, alpha: number): string {
  const base = extractBaseHex(hex.startsWith('#') ? hex : `#${hex}`);
  const a = clamp(alpha, 0, PERCENT);
  if (a === PERCENT) return base;
  return base + Math.round((a / PERCENT) * CHANNEL_MAX).toString(16).padStart(2, '0');
}

// ── EyeDropper API ───────────────────────────────────────────────────────────

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

/** Whether the browser supports the EyeDropper API (Chromium 95+) */
export const supportsEyeDropper = typeof window !== 'undefined' && !!window.EyeDropper;
