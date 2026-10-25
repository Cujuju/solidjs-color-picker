/**
 * CompactColorPicker — TradingView-style palette grid, saved colors, opacity, OK/Cancel.
 * "+" swaps in the FullPicker. Saved colors are props (savedColors / onSavedColorsChange); the consumer persists them.
 */

import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js';
import type { JSX } from 'solid-js';
import type { CtxMenuState, CompactColorPickerProps } from './types';
import { parseColor, rgbToHex, extractBaseHex, applyAlpha } from './utils';
import { mergeTokens, PALETTE_SWATCH_SIZE, PALETTE_SWATCH_RADIUS } from './tokens';
import { TV_PALETTE_ROW1, TV_PALETTE_MAIN } from './palette';
import { createDraftField } from './draftField';
import { actionButtonStyle } from './actionButton';
import { FullPicker } from './FullPicker';

/** What the picker has selected: base colour (lowercase 6-digit hex) and opacity 0-100. */
interface Selection {
  hex: string;
  alpha: number;
}

/** A state Cancel returns to: the selection, and the exact value string the host held then. */
interface Checkpoint {
  selection: Selection;
  value: string;
}

/** Shown when `value` doesn't parse; nothing is emitted until the user picks, and Cancel restores the original string. */
const UNREADABLE_START: Selection = { hex: '#000000', alpha: 100 };
const OPAQUE = 100;
/** Palette grid columns; the panel is exactly this many swatches wide. */
const PALETTE_COLUMNS = 10;
/** Gap (px) between swatches. */
const SWATCH_GAP = 3;

function toSelection(value: string): Selection {
  const c = parseColor(value);
  if (c) return { hex: rgbToHex(c), alpha: Math.round(c.a * OPAQUE) };
  console.error(`[solidjs-color-picker] cannot read colour "${value}"; showing black until one is picked.`);
  return UNREADABLE_START;
}

export function CompactColorPicker(props: CompactColorPickerProps) {
  const row1 = () => props.paletteRow1 ?? TV_PALETTE_ROW1;
  const main = () => props.paletteMain ?? TV_PALETTE_MAIN;
  const customColors = () => props.savedColors ?? [];
  const setCustomColors = (colors: string[]) => props.onSavedColorsChange?.(colors);

  const [showFull, setShowFull] = createSignal(false);
  const [selection, setSelection] = createSignal(toSelection(props.value));
  const [ctxMenu, setCtxMenu] = createSignal<CtxMenuState | null>(null);
  let containerEl: HTMLDivElement | undefined;

  // ── Selection: every change emits through `select`; both Cancels go through `restore` ──
  /** The value last sent through onChange (or the opening value). */
  let lastValue = props.value;
  const select = (next: Selection) => {
    setSelection(next);
    lastValue = applyAlpha(next.hex, next.alpha);
    props.onChange(lastValue);
  };
  const checkpoint = (): Checkpoint => ({ selection: selection(), value: lastValue });
  const restore = (cp: Checkpoint) => {
    setSelection(cp.selection);
    if (lastValue === cp.value) return;
    lastValue = cp.value;
    props.onChange(cp.value);
  };
  const opened = checkpoint();
  let beforeFull = opened;

  const openFull = () => { beforeFull = checkpoint(); setShowFull(true); };
  /** Back to the colour chosen before "+", still open. */
  const cancelFull = () => { restore(beforeFull); setShowFull(false); };
  /** Back to the colour the picker opened with, then close. */
  const cancel = () => { restore(opened); props.onClose(); };

  const selectHex = (color: string) => select({ ...selection(), hex: extractBaseHex(color) });
  const isSelected = (color: string) => extractBaseHex(color) === selection().hex;

  const handleAddColor = (hex: string) => {
    setCustomColors([hex, ...customColors().filter(c => c !== hex)]);
    setShowFull(false);
    selectHex(hex);
  };

  const handleDeleteColor = (color: string) => {
    setCustomColors(customColors().filter(c => c !== color));
    setCtxMenu(null);
  };

  const setAlpha = (alpha: number) => select({ ...selection(), alpha });
  const alphaField = createDraftField({
    format: () => String(selection().alpha),
    parse: (text) => {
      const n = Number(text.trim());
      return text.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= OPAQUE ? n : null;
    },
    apply: setAlpha,
    live: true,
  });

  // Saved colors accumulate only via FullPicker "Add". Auto-adding the opened colour (pre-L9.8) grew the list per reopen.

  const handleOutsideClick = (e: MouseEvent) => {
    const target = e.target as Node;
    // A press on the anchor is its own toggle; closing here would let its click reopen the picker.
    if (containerEl?.contains(target) || props.anchor?.contains(target)) return;
    props.onClose();
  };
  document.addEventListener('mousedown', handleOutsideClick, true);
  onCleanup(() => document.removeEventListener('mousedown', handleOutsideClick, true));

  // Focus the dialog on open and on each view swap. A frame later: ColorSwatch shows the popover after mount.
  createEffect(() => {
    showFull();
    requestAnimationFrame(() => containerEl?.focus({ preventScroll: true }));
  });

  const P = mergeTokens(props.tokens);
  // The shared token, not a local literal: an outside caller sizes its own swatch from it (see tokens.ts).
  const SWATCH = PALETTE_SWATCH_SIZE;
  const PANEL_W = PALETTE_COLUMNS * SWATCH + (PALETTE_COLUMNS - 1) * SWATCH_GAP + P.pad * 2;
  const divider = () => <div style={{ "border-top": `1px solid ${P.border}`, "margin-bottom": `${P.gap}px` }} />;

  const Swatch = (p: { color: string; label: string; onContextMenu?: (e: MouseEvent) => void }) => (
    <button
      type="button"
      onClick={() => selectHex(p.color)}
      onContextMenu={p.onContextMenu}
      title={p.color}
      aria-label={p.label}
      aria-pressed={isSelected(p.color)}
      style={{
        width: `${SWATCH}px`, height: `${SWATCH}px`, "border-radius": `${PALETTE_SWATCH_RADIUS}px`, background: p.color,
        cursor: 'pointer', "flex-shrink": '0', "box-sizing": 'border-box', padding: '0',
        border: isSelected(p.color) ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
      }}
    />
  );

  return (
    <div
      ref={containerEl}
      role="dialog"
      aria-label={showFull() ? 'Custom colour' : 'Colour picker'}
      tabindex="-1"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        if (showFull()) cancelFull(); else cancel();
      }}
    >
      <Show when={!showFull()} fallback={
        <FullPicker
          initial={beforeFull.selection.hex}
          onAdd={handleAddColor}
          onCancel={cancelFull}
          onPreview={selectHex}
          tokens={props.tokens}
        />
      }>
        <div style={{
          background: P.bg, border: `1px solid ${P.border}`, "border-radius": `${P.radius}px`,
          padding: `${P.pad}px`, "box-shadow": '0 8px 32px rgba(0,0,0,0.7)',
          "user-select": 'none', width: `${PANEL_W}px`, "box-sizing": 'border-box',
        }}>
          {/* Grayscale row, then the main grid */}
          <div style={{ display: 'flex', gap: `${SWATCH_GAP}px`, "margin-bottom": '6px' }}>
            <For each={row1()}>{(c) => <Swatch color={c} label={c} />}</For>
          </div>
          <div style={{ display: 'grid', "grid-template-columns": `repeat(${PALETTE_COLUMNS}, ${SWATCH}px)`, gap: `${SWATCH_GAP}px`, "margin-bottom": '8px' }}>
            <For each={main()}>{(c) => <Swatch color={c} label={c} />}</For>
          </div>

          {divider()}

          {/* Saved colors + add button */}
          <div style={{ display: 'flex', "flex-wrap": 'wrap', gap: `${SWATCH_GAP}px`, "margin-bottom": `${P.gap}px`, "align-items": 'center' }}>
            <For each={customColors()}>{(c) => (
              <Swatch color={c} label={`Saved colour ${c}`}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, color: c }); }} />
            )}</For>
            <button
              type="button"
              onClick={openFull}
              title="Add custom color"
              aria-label="Add custom color"
              style={{
                padding: '0',
                width: `${SWATCH}px`, height: `${SWATCH}px`, "border-radius": `${PALETTE_SWATCH_RADIUS}px`,
                background: P.bgInput, border: `1px solid ${P.borderHover}`,
                cursor: 'pointer', display: 'flex', "align-items": 'center', "justify-content": 'center',
                color: P.textDim, "font-size": '16px', "line-height": '1', "flex-shrink": '0',
              }}
            >+</button>
          </div>

          {/* Context menu for saved-colour delete; its backdrop is inside the dialog, so it isn't an outside click */}
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
                    type="button"
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

          {divider()}

          {/* Opacity row: hidden when the host takes opaque colours only */}
          <Show when={props.alpha !== false}>
            <div style={{ display: 'flex', "align-items": 'center', gap: `${P.gapSm}px`, "margin-bottom": `${P.gap}px` }}>
              <span style={{ "font-size": `${P.fontSizeSm}px`, color: P.textDim, "flex-shrink": '0' }}>Opacity</span>
              <input
                type="range"
                min={0}
                max={OPAQUE}
                value={selection().alpha}
                onInput={(e) => setAlpha(Number(e.currentTarget.value))}
                style={{ flex: '1', "min-width": '0', "accent-color": P.accent, cursor: 'pointer' }}
              />
              <input
                value={alphaField.text()}
                onInput={(e) => alphaField.input(e.currentTarget.value)}
                onBlur={alphaField.commit}
                onKeyDown={(e) => e.key === 'Enter' && alphaField.commit()}
                style={{
                  width: '36px', background: P.bgInput, border: `1px solid ${P.border}`,
                  "border-radius": `${P.radiusSm}px`, padding: '3px 4px', "font-size": `${P.fontSizeSm}px`,
                  color: P.text, "text-align": 'right', "font-family": 'monospace',
                  "flex-shrink": '0', "box-sizing": 'border-box',
                }}
              />
              <span style={{ "font-size": `${P.fontSizeSm}px`, color: P.textDim, "flex-shrink": '0' }}>%</span>
            </div>
            {divider()}
          </Show>

          <div style={{ display: 'flex', gap: `${P.gap}px` }}>
            <button type="button" onClick={cancel} style={actionButtonStyle(P, false)}>Cancel</button>
            <button type="button" onClick={props.onClose} style={actionButtonStyle(P, true)}>Ok</button>
          </div>
        </div>
      </Show>
    </div>
  );
}
