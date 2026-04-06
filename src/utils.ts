/**
 * Color conversion utilities — HSV, RGB, Hex, alpha helpers.
 *
 * All functions are pure and have zero dependencies.
 * They can be used standalone without any picker component.
 */

import type { HsvColor } from './types';

// ── HSV / RGB / Hex conversions ──────────────────────────────────────────────

/**
 * Convert hex (#rrggbb) to HSV.
 * @returns HsvColor with h: 0-360, s: 0-100, v: 0-100
 */
export function hexToHsv(hex: string): HsvColor {
  const h6 = hex.startsWith('#') ? hex.slice(1, 7) : hex.slice(0, 6);
  const r = parseInt(h6.slice(0, 2), 16) / 255;
  const g = parseInt(h6.slice(2, 4), 16) / 255;
  const b = parseInt(h6.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }
  const sat = max === 0 ? 0 : (d / max) * 100;
  const val = max * 100;
  return { h: hue, s: sat, v: val };
}

/**
 * Convert HSV to 6-digit hex string.
 * @param hsv - h: 0-360, s: 0-100, v: 0-100
 * @returns Hex string like "#ff0000"
 */
export function hsvToHex(hsv: HsvColor): string {
  const { h, s, v } = hsv;
  const sn = s / 100;
  const vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert HSV to RGB object.
 * @returns Object with r, g, b each 0-255
 */
export function hsvToRgb(hsv: HsvColor): { r: number; g: number; b: number } {
  const hex = hsvToHex(hsv);
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// ── Alpha helpers ────────────────────────────────────────────────────────────

/**
 * Extract alpha (0-100) from a color string.
 * Supports rgba(), 8-digit hex (#rrggbbaa), and plain hex (returns 100).
 */
export function extractAlpha(color: string): number {
  const trimmed = color.trim();
  // rgba(r, g, b, a) or rgba(r g b / a)
  const rgbaMatch = trimmed.match(/rgba?\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+[\s,/]+\s*([\d.]+)\s*\)/i);
  if (rgbaMatch) {
    const a = parseFloat(rgbaMatch[1]);
    return Math.round((a > 1 ? a : a * 100));
  }
  // 8-digit hex (#rrggbbaa)
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    const aa = parseInt(trimmed.slice(7, 9), 16);
    return Math.round((aa / 255) * 100);
  }
  return 100;
}

/**
 * Extract the base hex color (without alpha) from rgba or hex string.
 * @returns 7-character hex string like "#ff0000"
 */
export function extractBaseHex(color: string): string {
  const trimmed = color.trim();
  // rgba(r, g, b, a)
  const rgbaMatch = trimmed.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgbaMatch) {
    const r = Math.round(parseFloat(rgbaMatch[1]));
    const g = Math.round(parseFloat(rgbaMatch[2]));
    const b = Math.round(parseFloat(rgbaMatch[3]));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  // 8-digit hex -> strip alpha
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) return trimmed.slice(0, 7);
  // Already 6-digit hex or other
  return trimmed;
}

/**
 * Apply alpha (0-100) to a hex color, returning 8-digit hex.
 * If alpha >= 100, returns standard 6-digit hex.
 */
export function applyAlpha(hex: string, alpha: number): string {
  const base = hex.startsWith('#') ? hex.slice(1, 7) : hex.slice(0, 6);
  if (alpha >= 100) return `#${base}`;
  const aa = Math.round((alpha / 100) * 255).toString(16).padStart(2, '0');
  return `#${base}${aa}`;
}

// ── Input parsing ────────────────────────────────────────────────────────────

/**
 * Parse "r, g, b" text input into RGB values.
 * Accepts comma-separated or space-separated values.
 * @returns RGB object or null if parsing fails
 */
export function parseRgbInput(input: string): { r: number; g: number; b: number } | null {
  const parts = input.trim().split(/[\s,]+/).map(s => parseInt(s, 10));
  if (parts.length === 3 && parts.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
    return { r: parts[0], g: parts[1], b: parts[2] };
  }
  return null;
}

// ── EyeDropper API ───────────────────────────────────────────────────────────

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

/** Whether the browser supports the EyeDropper API (Chromium 95+) */
export const supportsEyeDropper = typeof window !== 'undefined' && !!window.EyeDropper;
