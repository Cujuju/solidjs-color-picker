/** Public API of @cujuju/solidjs-color-picker. */

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
