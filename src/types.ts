/**
 * Shared type definitions for cujuju-solidjs-color-picker.
 */

import type { JSX } from 'solid-js';

// ── HSV color model ──────────────────────────────────────────────────────────

/** HSV color with h: 0-360, s: 0-100, v: 0-100 */
export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

// ── Design tokens ────────────────────────────────────────────────────────────

/** Overridable design tokens for the picker panel */
export interface PickerTokens {
  bg: string;
  bgInput: string;
  border: string;
  borderHover: string;
  radius: number;
  radiusSm: number;
  pad: number;
  gap: number;
  gapSm: number;
  text: string;
  textMuted: string;
  textDim: string;
  fontSizeSm: number;
  accent: string;
}

// ── Context menu state ───────────────────────────────────────────────────────

/** Internal state for the right-click context menu on saved colors */
export interface CtxMenuState {
  x: number;
  y: number;
  color: string;
}

// ── Component props ──────────────────────────────────────────────────────────

/** Props for the SaturationCanvas sub-component */
export interface SaturationCanvasProps {
  hue: number;
  saturation: number;
  value: number;
  width: number;
  height: number;
  onChange: (s: number, v: number) => void;
}

/** Props for the HueSlider sub-component */
export interface HueSliderProps {
  hue: number;
  width: number;
  height: number;
  onChange: (hue: number) => void;
}

/** Props for the ShadeSlider sub-component */
export interface ShadeSliderProps {
  hue: number;
  saturation: number;
  value: number;
  width: number;
  height: number;
  onChange: (v: number) => void;
}

/** Props for the FullPicker (saturation/hue/shade based advanced picker) */
export interface FullPickerProps {
  initial: string;
  onAdd: (hex: string) => void;
  onCancel: () => void;
  onPreview?: (hex: string) => void;
  tokens?: Partial<PickerTokens>;
}

/** Props for the CompactColorPicker (main TV-palette picker panel) */
export interface CompactColorPickerProps {
  /** Current color value (hex, rgba, or 8-digit hex with alpha) */
  value: string;
  /** Callback when color changes */
  onChange: (hex: string) => void;
  /** Callback to close the picker */
  onClose: () => void;
  /** User-saved custom colors array */
  savedColors?: string[];
  /** Callback when saved colors change (add/delete) */
  onSavedColorsChange?: (colors: string[]) => void;
  /** Override the default TV palette rows (grayscale) */
  paletteRow1?: string[];
  /** Override the default TV palette (main grid) */
  paletteMain?: string[];
  /** Override design tokens */
  tokens?: Partial<PickerTokens>;
}

/** Props for the ColorSwatch click-to-open wrapper */
export interface ColorSwatchProps {
  /** Current color value */
  value: string;
  /** Callback when color changes */
  onChange: (v: string) => void;
  /** Swatch size in pixels (default: 26) */
  size?: number;
  /** Hide the border around the swatch */
  noBorder?: boolean;
  /** User-saved custom colors array */
  savedColors?: string[];
  /** Callback when saved colors change */
  onSavedColorsChange?: (colors: string[]) => void;
  /** Override the default TV palette rows (grayscale) */
  paletteRow1?: string[];
  /** Override the default TV palette (main grid) */
  paletteMain?: string[];
  /** Override design tokens */
  tokens?: Partial<PickerTokens>;
}
