/**
 * ColorPicker — compact TV-palette color picker for SolidJS.
 *
 * Contains:
 *  - FullPicker — advanced saturation/hue/shade picker with hex/RGB inputs
 *  - CompactColorPicker — the main panel with palette grid, saved colors, alpha, OK/Cancel
 *
 * The picker has zero dependencies beyond solid-js. Saved colors are managed
 * via props (savedColors / onSavedColorsChange) so the consumer controls persistence.
 */

import { createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import type { HsvColor, PickerTokens, CtxMenuState, CompactColorPickerProps, FullPickerProps } from './types';
import { hexToHsv, hsvToHex, hsvToRgb, extractAlpha, extractBaseHex, applyAlpha, parseRgbInput, supportsEyeDropper } from './utils';
import { mergeTokens } from './tokens';
import { TV_PALETTE_ROW1, TV_PALETTE_MAIN } from './palette';
import { SaturationCanvas } from './canvas/SaturationCanvas';
import { HueSlider } from './canvas/HueSlider';
import { ShadeSlider } from './canvas/ShadeSlider';

// ── FullPicker (advanced HSV picker) ─────────────────────────────────────────

/**
 * FullPicker — saturation square + hue slider + shade slider + hex/RGB inputs.
 * Opened from CompactColorPicker's "+" button to create custom colors.
 */
function FullPicker(props: FullPickerProps) {
  // Parse initial color into HSV
  const initHsv = hexToHsv(extractBaseHex(props.initial));
  const [hsv, setHsv] = createSignal<HsvColor>(initHsv);
  const [hexInput, setHexInput] = createSignal(hsvToHex(initHsv).toUpperCase());
  const initRgb = hsvToRgb(initHsv);
  const [rgbInput, setRgbInput] = createSignal(`${initRgb.r}, ${initRgb.g}, ${initRgb.b}`);

  const P = mergeTokens(props.tokens);
  const PAD = P.pad * 2;
  const FULL_W = 280;
  const FULL_INNER_W = FULL_W - PAD;
  const SLIDER_TRACK = 18; // vertical shade slider width
  const GAP = P.gap;
  const SAT_W = FULL_INNER_W - SLIDER_TRACK - GAP;
  const SAT_H = SAT_W; // 1:1 ratio
  const SLIDER_H = SAT_H;
  const btnH = 26;

  /** Update HSV state and emit preview */
  const emit = (next: HsvColor) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexInput(hex.toUpperCase());
    const rgb = hsvToRgb(next);
    setRgbInput(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    props.onPreview?.(hex);
  };

  /** Handle hex text input blur — parse and apply */
  const handleHexBlur = () => {
    const v = hexInput().trim();
    const clean = v.startsWith('#') ? v : '#' + v;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) emit(hexToHsv(clean));
  };

  /** Handle RGB text input blur — parse and apply */
  const handleRgbBlur = () => {
    const parsed = parseRgbInput(rgbInput());
    if (parsed) {
      const { r, g, b } = parsed;
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      emit(hexToHsv(hex));
      setRgbInput(`${r}, ${g}, ${b}`);
    }
  };

  /** EyeDropper API — pick color from screen */
  const handleEyeDropper = async () => {
    if (!window.EyeDropper) return;
    try {
      const result = await new window.EyeDropper().open();
      emit(hexToHsv(result.sRGBHex));
    } catch { /* user cancelled */ }
  };

  const preview = () => hsvToHex(hsv());

  const inputStyle: JSX.CSSProperties = {
    background: P.bgInput, border: `1px solid ${P.border}`, "border-radius": `${P.radiusSm}px`,
    color: P.text, "font-size": `${P.fontSizeSm}px`, padding: '4px 8px',
    "font-family": 'monospace', width: '100%', "box-sizing": 'border-box',
  };

  return (
    <div style={{
      background: P.bg, border: `1px solid ${P.border}`, "border-radius": `${P.radius}px`,
      padding: `${P.pad}px`, "box-shadow": '0 8px 32px rgba(0,0,0,0.7)',
      "user-select": 'none', width: `${FULL_W}px`, "box-sizing": 'border-box',
    }}>
      {/* Row 1: Saturation square + Shade slider */}
      <div style={{ display: 'flex', gap: `${GAP}px`, "margin-bottom": `${GAP}px` }}>
        <SaturationCanvas
          hue={hsv().h}
          saturation={hsv().s}
          value={hsv().v}
          width={SAT_W}
          height={SAT_H}
          onChange={(s, v) => emit({ ...hsv(), s, v })}
        />
        <ShadeSlider
          hue={hsv().h}
          saturation={hsv().s}
          value={hsv().v}
          width={SLIDER_TRACK}
          height={SLIDER_H}
          onChange={(v) => emit({ ...hsv(), v })}
        />
      </div>

      {/* Row 2: Hue slider — width matches saturation box */}
      <div style={{ "margin-bottom": `${GAP}px` }}>
        <HueSlider
          hue={hsv().h}
          width={SAT_W}
          height={SLIDER_TRACK}
          onChange={(h) => emit({ ...hsv(), h })}
        />
      </div>

      {/* Row 3: Hex + RGB inputs */}
      <div style={{ display: 'flex', gap: `${GAP}px`, "margin-bottom": `${GAP}px` }}>
        <input
          value={hexInput()}
          onInput={(e) => setHexInput(e.currentTarget.value)}
          onBlur={handleHexBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleHexBlur()}
          placeholder="Hex"
          style={{ ...inputStyle, flex: '1' }}
        />
        <input
          value={rgbInput()}
          onInput={(e) => setRgbInput(e.currentTarget.value)}
          onBlur={handleRgbBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleRgbBlur()}
          placeholder="R, G, B"
          style={{ ...inputStyle, flex: '1' }}
        />
      </div>

      {/* Row 4: Footer — eyedropper, preview, cancel/add */}
      <div style={{ display: 'flex', gap: `${GAP}px`, "align-items": 'center' }}>
        {/* Left col: optional eyedropper + AB swatch */}
        <div style={{ flex: '1', display: 'flex', "align-items": 'center', gap: `${P.gap}px` }}>
          {supportsEyeDropper && (
            <button
              onClick={handleEyeDropper}
              title="Pick color from screen"
              style={{
                background: P.bgInput, border: `1px solid ${P.border}`, "border-radius": `${P.radiusSm}px`,
                color: P.textMuted, "font-size": '14px', width: `${btnH}px`, height: `${btnH}px`, "flex-shrink": '0',
                cursor: 'pointer', display: 'flex', "align-items": 'center', "justify-content": 'center',
              }}
            >💧</button>
          )}
          <div style={{
            display: 'flex', height: `${btnH}px`, flex: '1',
            "border-radius": `${P.radiusSm}px`, overflow: 'hidden', border: `1px solid ${P.border}`,
          }}>
            <div style={{ flex: '1', background: preview(), position: 'relative' }} title="Current">
              <span style={{ position: 'absolute', bottom: '2px', left: '0', right: '0', "text-align": 'center', "font-size": '8px', color: 'rgba(255,255,255,0.6)', "pointer-events": 'none', "line-height": '1' }}>Cur</span>
            </div>
            <div style={{ flex: '1', background: props.initial, position: 'relative' }} title="Previous">
              <span style={{ position: 'absolute', bottom: '2px', left: '0', right: '0', "text-align": 'center', "font-size": '8px', color: 'rgba(255,255,255,0.6)', "pointer-events": 'none', "line-height": '1' }}>Prev</span>
            </div>
          </div>
        </div>
        {/* Right col: Cancel + Add */}
        <div style={{ flex: '1', display: 'flex', "align-items": 'center', gap: `${P.gap}px` }}>
          <button
            onClick={props.onCancel}
            style={{
              flex: '1', background: P.bgInput, border: `1px solid ${P.border}`, "border-radius": `${P.radiusSm}px`,
              color: P.textMuted, "font-size": `${P.fontSizeSm}px`, height: `${btnH}px`, padding: '0', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={() => props.onAdd(preview())}
            style={{
              flex: '1', background: P.accent, border: 'none', "border-radius": `${P.radiusSm}px`,
              color: '#fff', "font-size": `${P.fontSizeSm}px`, "font-weight": '600', height: `${btnH}px`, padding: '0', cursor: 'pointer',
            }}
          >Add</button>
        </div>
      </div>
    </div>
  );
}

// ── CompactColorPicker (TV swatch style) ─────────────────────────────────────────

/**
 * CompactColorPicker — the main color picker panel.
 *
 * Displays a TradingView-style palette grid, user-saved custom colors,
 * an opacity slider, and OK/Cancel buttons. Clicking "+" opens the FullPicker
 * for creating custom colors.
 *
 * Saved colors are managed via props: pass `savedColors` and `onSavedColorsChange`
 * to handle persistence in whatever storage system you prefer.
 */
export function CompactColorPicker(props: CompactColorPickerProps) {
  // Resolve palette and tokens with defaults
  const row1 = () => props.paletteRow1 ?? TV_PALETTE_ROW1;
  const main = () => props.paletteMain ?? TV_PALETTE_MAIN;
  const customColors = () => props.savedColors ?? [];
  const setCustomColors = (colors: string[]) => props.onSavedColorsChange?.(colors);

  const [showFull, setShowFull] = createSignal(false);
  const [alpha, setAlpha] = createSignal(extractAlpha(props.value));
  const [alphaInput, setAlphaInput] = createSignal(String(extractAlpha(props.value)));
  const [current, setCurrent] = createSignal(extractBaseHex(props.value));
  const [ctxMenu, setCtxMenu] = createSignal<CtxMenuState | null>(null);
  // Snapshot on open for Cancel revert
  const original = props.value;
  let containerEl: HTMLDivElement | undefined;
  // Snapshot of current color at the moment FullPicker is opened
  let fullPickerInitial = props.value;

  // Auto-add the opened color to custom colors if not in palette or already saved
  const hex = extractBaseHex(props.value).toLowerCase();
  const inPalette = row1().some(c => c.toLowerCase() === hex)
    || main().some(c => c.toLowerCase() === hex);
  const inCustom = customColors().some(c => c.toLowerCase() === hex);
  if (!inPalette && !inCustom && hex.startsWith('#') && hex.length === 7) {
    setCustomColors([hex, ...customColors()]);
  }

  // Close on outside click
  const handleOutsideClick = (e: MouseEvent) => {
    if (ctxMenu()) return; // don't close while context menu is open
    if (containerEl && !containerEl.contains(e.target as Node)) props.onClose();
  };
  document.addEventListener('mousedown', handleOutsideClick, true);
  onCleanup(() => document.removeEventListener('mousedown', handleOutsideClick, true));

  const applyColor = (hex: string, a: number) => {
    setCurrent(hex);
    props.onChange(applyAlpha(hex, a));
  };

  const selectColor = (hex: string) => applyColor(hex, alpha());

  const handleAddColor = (hex: string) => {
    setCustomColors([hex, ...customColors().filter(c => c !== hex)]);
    setShowFull(false);
    applyColor(hex, alpha());
  };

  const handleDeleteColor = (color: string) => {
    setCustomColors(customColors().filter(c => c !== color));
    setCtxMenu(null);
  };

  const handleAlphaSlider = (n: number) => {
    setAlpha(n);
    setAlphaInput(String(n));
    applyColor(current(), n);
  };

  const handleAlphaInput = (v: string) => {
    setAlphaInput(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 0 && n <= 100) {
      setAlpha(n);
      applyColor(current(), n);
    }
  };

  const P = mergeTokens(props.tokens);
  const SWATCH = 18;
  const GAP = 3;

  const swatchStyle = (c: string): JSX.CSSProperties => ({
    width: `${SWATCH}px`, height: `${SWATCH}px`, "border-radius": '3px', background: c,
    cursor: 'pointer', "flex-shrink": '0', "box-sizing": 'border-box',
    border: c.toLowerCase() === current().toLowerCase()
      ? '2px solid #fff'
      : '1px solid rgba(255,255,255,0.15)',
  });

  // Fixed panel width: 10 swatches + 9 gaps + padding each side
  const PANEL_W = 10 * SWATCH + 9 * GAP + P.pad * 2;

  return (
    <Show when={!showFull()} fallback={
      <div ref={containerEl}>
        <FullPicker
          initial={fullPickerInitial}
          onAdd={handleAddColor}
          onCancel={() => { props.onChange(original); setShowFull(false); }}
          onPreview={(hex) => applyColor(hex, alpha())}
          tokens={props.tokens}
        />
      </div>
    }>
      <div
        ref={containerEl}
        style={{
          background: P.bg, border: `1px solid ${P.border}`, "border-radius": `${P.radius}px`,
          padding: `${P.pad}px`, "box-shadow": '0 8px 32px rgba(0,0,0,0.7)',
          "user-select": 'none', width: `${PANEL_W}px`, "box-sizing": 'border-box',
        }}
      >
        {/* Row 1: grayscale (10 swatches) */}
        <div style={{ display: 'flex', gap: `${GAP}px`, "margin-bottom": '6px' }}>
          {row1().map((c) => (
            <div onClick={() => selectColor(c)} title={c} style={swatchStyle(c)} />
          ))}
        </div>

        {/* Gap between grayscale and main palette */}
        <div style={{ "margin-bottom": '6px' }} />

        {/* Main palette grid 10x7 */}
        <div style={{ display: 'grid', "grid-template-columns": `repeat(10, ${SWATCH}px)`, gap: `${GAP}px`, "margin-bottom": '8px' }}>
          {main().map((c) => (
            <div onClick={() => selectColor(c)} title={c} style={swatchStyle(c)} />
          ))}
        </div>

        <div style={{ "border-top": `1px solid ${P.border}`, "margin-bottom": `${P.gap}px` }} />

        {/* Custom colors + add button */}
        <div style={{ display: 'flex', "flex-wrap": 'wrap', gap: `${GAP}px`, "margin-bottom": `${P.gap}px`, "align-items": 'center' }}>
          {customColors().map((c) => (
            <div
              onClick={() => selectColor(c)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, color: c }); }}
              title={c}
              style={swatchStyle(c)}
            />
          ))}
          <div
            onClick={() => { fullPickerInitial = current(); setShowFull(true); }}
            title="Add custom color"
            style={{
              width: `${SWATCH}px`, height: `${SWATCH}px`, "border-radius": '3px',
              background: P.bgInput, border: `1px solid ${P.borderHover}`,
              cursor: 'pointer', display: 'flex', "align-items": 'center', "justify-content": 'center',
              color: P.textDim, "font-size": '16px', "line-height": '1', "flex-shrink": '0',
            }}
          >+</div>
        </div>

        {/* Context menu for custom color delete */}
        <Show when={ctxMenu()}>
          {(menu) => (
            <div>
              <div style={{ position: 'fixed', inset: '0', "z-index": '9998' }} onClick={() => setCtxMenu(null)} />
              <div style={{
                position: 'fixed', top: `${menu().y}px`, left: `${menu().x}px`, "z-index": '9999',
                background: P.bg, border: `1px solid ${P.border}`, "border-radius": `${P.radiusSm}px`,
                padding: '4px 0', "box-shadow": '0 4px 16px rgba(0,0,0,0.5)', "min-width": '100px',
              }}>
                <div style={{ display: 'flex', "align-items": 'center', gap: '6px', padding: '4px 10px', "margin-bottom": '2px' }}>
                  <div style={{ width: '14px', height: '14px', "border-radius": '2px', background: menu().color, border: `1px solid ${P.border}`, "flex-shrink": '0' }} />
                  <span style={{ "font-size": '11px', color: P.textMuted, "font-family": 'monospace' }}>{menu().color.toUpperCase()}</span>
                </div>
                <button
                  onClick={() => handleDeleteColor(menu().color)}
                  style={{
                    display: 'block', width: '100%', "text-align": 'left',
                    background: 'none', border: 'none', color: '#ef4444',
                    "font-size": `${P.fontSizeSm}px`, padding: '6px 10px', cursor: 'pointer',
                  }}
                >Delete</button>
              </div>
            </div>
          )}
        </Show>

        <div style={{ "border-top": `1px solid ${P.border}`, "margin-bottom": `${P.gap}px` }} />

        {/* Opacity row */}
        <div style={{ display: 'flex', "align-items": 'center', gap: `${P.gapSm}px`, "margin-bottom": `${P.gap}px` }}>
          <span style={{ "font-size": `${P.fontSizeSm}px`, color: P.textDim, "flex-shrink": '0' }}>Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={alpha()}
            onInput={(e) => handleAlphaSlider(Number(e.currentTarget.value))}
            style={{ flex: '1', "min-width": '0', "accent-color": P.accent, cursor: 'pointer' }}
          />
          <input
            value={alphaInput()}
            onInput={(e) => handleAlphaInput(e.currentTarget.value)}
            onBlur={() => setAlphaInput(String(alpha()))}
            style={{
              width: '36px', background: P.bgInput, border: `1px solid ${P.border}`,
              "border-radius": `${P.radiusSm}px`, padding: '3px 4px', "font-size": `${P.fontSizeSm}px`,
              color: P.text, "text-align": 'right', "font-family": 'monospace',
              "flex-shrink": '0', "box-sizing": 'border-box',
            }}
          />
          <span style={{ "font-size": `${P.fontSizeSm}px`, color: P.textDim, "flex-shrink": '0' }}>%</span>
        </div>

        <div style={{ "border-top": `1px solid ${P.border}`, "margin-bottom": `${P.gap}px` }} />

        {/* Ok / Cancel */}
        <div style={{ display: 'flex', gap: `${P.gap}px` }}>
          <button
            onClick={() => { props.onChange(original); props.onClose(); }}
            style={{
              flex: '1', background: P.bgInput, border: `1px solid ${P.border}`, "border-radius": `${P.radiusSm}px`,
              color: P.textMuted, "font-size": `${P.fontSizeSm}px`, height: '26px', padding: '0', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={props.onClose}
            style={{
              flex: '1', background: P.accent, border: 'none', "border-radius": `${P.radiusSm}px`,
              color: '#fff', "font-size": `${P.fontSizeSm}px`, "font-weight": '600', height: '26px', padding: '0', cursor: 'pointer',
            }}
          >Ok</button>
        </div>
      </div>
    </Show>
  );
}
