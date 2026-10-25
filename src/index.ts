/**
 * cujuju-solidjs-color-picker — TradingView-style color picker for SolidJS.
 *
 * Public API exports:
 *  - Components: ColorSwatch, CompactColorPicker
 *  - Canvas sub-components: SaturationCanvas, HueSlider, ShadeSlider
 *  - Utilities: parseColor, rgbToHex, rgbToHsv, hexToHsv, hsvToHex, hsvToRgb, extractAlpha, extractBaseHex, applyAlpha, parseRgbInput, supportsEyeDropper
 *  - Tokens: DEFAULT_TOKENS, SWATCH_SIZE, mergeTokens
 *  - Palette: TV_PALETTE_ROW1, TV_PALETTE_MAIN
 *  - Types: all interfaces
 */

// ── Components ───────────────────────────────────────────────────────────────
export { ColorSwatch } from './ColorSwatch';
export { CompactColorPicker } from './ColorPicker';

// ── Canvas sub-components ────────────────────────────────────────────────────
export { SaturationCanvas } from './canvas/SaturationCanvas';
export { HueSlider } from './canvas/HueSlider';
export { ShadeSlider } from './canvas/ShadeSlider';

// ── Color conversion utilities ───────────────────────────────────────────────
export {
  parseColor,
  rgbToHex,
  rgbToHsv,
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  extractAlpha,
  extractBaseHex,
  applyAlpha,
  parseRgbInput,
  supportsEyeDropper,
} from './utils';

// ── Design tokens ────────────────────────────────────────────────────────────
export {
  DEFAULT_TOKENS,
  SWATCH_SIZE,
  PALETTE_SWATCH_SIZE,
  PALETTE_SWATCH_RADIUS,
  mergeTokens,
} from './tokens';

// ── Palette data ─────────────────────────────────────────────────────────────
export { TV_PALETTE_ROW1, TV_PALETTE_MAIN } from './palette';

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  HsvColor,
  RgbColor,
  RgbaColor,
  PickerTokens,
  CtxMenuState,
  SaturationCanvasProps,
  HueSliderProps,
  ShadeSliderProps,
  FullPickerProps,
  CompactColorPickerProps,
  ColorSwatchProps,
} from './types';
