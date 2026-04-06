/**
 * Design tokens for the color picker.
 *
 * These defaults produce a dark-themed picker matching TradingView's style.
 * Override any token by passing a partial `tokens` prop to CompactPicker or ColorSwatch.
 */

import type { PickerTokens } from './types';

/** Default design tokens — dark theme matching TradingView's picker */
export const DEFAULT_TOKENS: PickerTokens = {
  bg: '#1a1f2e',
  bgInput: '#252d3f',
  border: '#334155',
  borderHover: '#475569',
  radius: 8,
  radiusSm: 4,
  pad: 10,
  gap: 8,
  gapSm: 4,
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#475569',
  fontSizeSm: 12,
  accent: '#6366f1',
};

/** Default swatch size used by ColorSwatch (pixels) */
export const SWATCH_SIZE = 26;

/** Merge user-provided partial tokens with defaults */
export function mergeTokens(overrides?: Partial<PickerTokens>): PickerTokens {
  if (!overrides) return DEFAULT_TOKENS;
  return { ...DEFAULT_TOKENS, ...overrides };
}
