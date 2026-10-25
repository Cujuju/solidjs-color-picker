/**
 * FullPicker — saturation square + shade slider + hue slider + hex/RGB fields.
 * Opened from CompactColorPicker's "+" button to create custom colors.
 */

import { createSignal } from 'solid-js';
import type { JSX } from 'solid-js';
import type { HsvColor, RgbColor, FullPickerProps } from './types';
import { parseColor, parseRgbInput, rgbToHsv, hexToHsv, hsvToHex, hsvToRgb, carryHsv, supportsEyeDropper } from './utils';
import { mergeTokens } from './tokens';
import { createDraftField } from './draftField';
import { actionButtonStyle, ACTION_BUTTON_H } from './actionButton';
import { SaturationCanvas } from './canvas/SaturationCanvas';
import { HueSlider } from './canvas/HueSlider';
import { ShadeSlider } from './canvas/ShadeSlider';

/** Panel width (px). */
const FULL_W = 280;
/** Thickness (px) of the shade and hue sliders. */
const SLIDER_TRACK = 18;

export function FullPicker(props: FullPickerProps) {
  const [hsv, setHsv] = createSignal<HsvColor>(hexToHsv(props.initial));

  const P = mergeTokens(props.tokens);
  const GAP = P.gap;
  const SAT_W = FULL_W - P.pad * 2 - SLIDER_TRACK - GAP;

  /** Set the colour and preview it. */
  const emit = (next: HsvColor) => {
    setHsv(next);
    props.onPreview?.(hsvToHex(next));
  };
  /** Set from RGB, keeping the hue and saturation a grey or black leaves undetermined. */
  const emitRgb = (rgb: RgbColor) => emit(carryHsv(rgbToHsv(rgb), hsv()));

  const hexField = createDraftField({
    format: () => hsvToHex(hsv()).toUpperCase(),
    // Opaque hex only; an alpha pair would be dropped.
    parse: (text) => {
      const c = parseColor(`#${text.trim().replace(/^#/, '')}`);
      return c && c.a === 1 ? c : null;
    },
    apply: emitRgb,
  });
  const rgbField = createDraftField({
    format: () => { const { r, g, b } = hsvToRgb(hsv()); return `${r}, ${g}, ${b}`; },
    parse: parseRgbInput,
    apply: emitRgb,
  });

  /** EyeDropper API — pick color from screen */
  const handleEyeDropper = async () => {
    if (!window.EyeDropper) return;
    try {
      const picked = parseColor((await new window.EyeDropper().open()).sRGBHex);
      if (picked) emitRgb(picked);
    } catch { /* user cancelled */ }
  };

  const preview = () => hsvToHex(hsv());

  const inputStyle: JSX.CSSProperties = {
    background: P.bgInput, border: `1px solid ${P.border}`, "border-radius": `${P.radiusSm}px`,
    color: P.text, "font-size": `${P.fontSizeSm}px`, padding: '4px 8px', flex: '1',
    "font-family": 'monospace', width: '100%', "box-sizing": 'border-box',
  };
  const field = (f: ReturnType<typeof createDraftField>, placeholder: string) => (
    <input
      value={f.text()}
      onInput={(e) => f.input(e.currentTarget.value)}
      onBlur={f.commit}
      onKeyDown={(e) => e.key === 'Enter' && f.commit()}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
  const swatchLabel: JSX.CSSProperties = {
    position: 'absolute', bottom: '2px', left: '0', right: '0', "text-align": 'center',
    "font-size": '8px', color: 'rgba(255,255,255,0.6)', "pointer-events": 'none', "line-height": '1',
  };

  return (
    <div style={{
      background: P.bg, border: `1px solid ${P.border}`, "border-radius": `${P.radius}px`,
      padding: `${P.pad}px`, "box-shadow": '0 8px 32px rgba(0,0,0,0.7)',
      "user-select": 'none', width: `${FULL_W}px`, "box-sizing": 'border-box',
    }}>
      {/* Row 1: Saturation square + Shade slider */}
      <div style={{ display: 'flex', gap: `${GAP}px`, "margin-bottom": `${GAP}px` }}>
        <SaturationCanvas hue={hsv().h} saturation={hsv().s} value={hsv().v} width={SAT_W} height={SAT_W}
          onChange={(s, v) => emit({ ...hsv(), s, v })} />
        <ShadeSlider hue={hsv().h} saturation={hsv().s} value={hsv().v} width={SLIDER_TRACK} height={SAT_W}
          onChange={(v) => emit({ ...hsv(), v })} />
      </div>

      {/* Row 2: Hue slider — width matches saturation box */}
      <div style={{ "margin-bottom": `${GAP}px` }}>
        <HueSlider hue={hsv().h} width={SAT_W} height={SLIDER_TRACK} onChange={(h) => emit({ ...hsv(), h })} />
      </div>

      {/* Row 3: Hex + RGB inputs */}
      <div style={{ display: 'flex', gap: `${GAP}px`, "margin-bottom": `${GAP}px` }}>
        {field(hexField, 'Hex')}
        {field(rgbField, 'R, G, B')}
      </div>

      {/* Row 4: Footer — eyedropper, preview, cancel/add */}
      <div style={{ display: 'flex', gap: `${GAP}px`, "align-items": 'center' }}>
        <div style={{ flex: '1', display: 'flex', "align-items": 'center', gap: `${GAP}px` }}>
          {supportsEyeDropper && (
            <button
              type="button"
              onClick={handleEyeDropper}
              title="Pick color from screen"
              style={{
                background: P.bgInput, border: `1px solid ${P.border}`, "border-radius": `${P.radiusSm}px`,
                color: P.textMuted, "font-size": '14px', width: `${ACTION_BUTTON_H}px`, height: `${ACTION_BUTTON_H}px`,
                "flex-shrink": '0', cursor: 'pointer', display: 'flex', "align-items": 'center', "justify-content": 'center',
              }}
            >💧</button>
          )}
          <div style={{
            display: 'flex', height: `${ACTION_BUTTON_H}px`, flex: '1',
            "border-radius": `${P.radiusSm}px`, overflow: 'hidden', border: `1px solid ${P.border}`,
          }}>
            <div style={{ flex: '1', background: preview(), position: 'relative' }} title="Current">
              <span style={swatchLabel}>Cur</span>
            </div>
            <div style={{ flex: '1', background: props.initial, position: 'relative' }} title="Previous">
              <span style={swatchLabel}>Prev</span>
            </div>
          </div>
        </div>
        <div style={{ flex: '1', display: 'flex', "align-items": 'center', gap: `${GAP}px` }}>
          <button type="button" onClick={props.onCancel} style={actionButtonStyle(P, false)}>Cancel</button>
          <button type="button" onClick={() => props.onAdd(preview())} style={actionButtonStyle(P, true)}>Add</button>
        </div>
      </div>
    </div>
  );
}
