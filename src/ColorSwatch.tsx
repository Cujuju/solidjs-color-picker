/**
 * ColorSwatch — click-to-open swatch button with portal-based picker.
 *
 * Renders a small colored square. Clicking it opens the CompactColorPicker via
 * Solid's <Portal>, which renders directly into document.body to escape
 * any ancestor transform/overflow that would break fixed positioning
 * (e.g. dialogs using transform: translateX(-50%)).
 */

import { createSignal, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { ColorSwatchProps } from './types';
import { SWATCH_SIZE } from './tokens';
import { CompactColorPicker } from './ColorPicker';

export function ColorSwatch(props: ColorSwatchProps) {
  const [open, setOpen] = createSignal(false);
  let swatchEl: HTMLDivElement | undefined;
  const [pickerPos, setPickerPos] = createSignal({ top: 0, left: 0 });

  const size = () => props.size ?? SWATCH_SIZE;

  /** Calculate position and toggle the picker open/closed */
  const handleOpen = () => {
    if (swatchEl) {
      const rect = swatchEl.getBoundingClientRect();
      const pickerW = 260;
      const pickerH = 320;
      const top = rect.bottom + 6 + pickerH > window.innerHeight
        ? Math.max(8, rect.top - pickerH - 6)
        : rect.bottom + 6;
      const left = rect.left + pickerW > window.innerWidth
        ? Math.max(8, window.innerWidth - pickerW - 8)
        : rect.left;
      setPickerPos({ top, left });
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={swatchEl} style={{ display: 'inline-flex', "align-items": 'center' }}>
      <div
        onClick={handleOpen}
        title={props.value}
        style={{
          width: `${size()}px`, height: `${size()}px`, "border-radius": `${Math.round(size() * 4 / 28)}px`,
          background: props.value, border: props.noBorder ? 'none' : '1px solid #334155',
          cursor: 'pointer', "flex-shrink": '0',
        }}
      />
      <Show when={open()}>
        {/* Portal renders into document.body, bypassing ancestor transform/overflow */}
        <Portal>
          <div style={{ position: 'fixed', top: `${pickerPos().top}px`, left: `${pickerPos().left}px`, "z-index": '9999' }}>
            <CompactColorPicker
              value={props.value}
              onChange={props.onChange}
              onClose={() => setOpen(false)}
              savedColors={props.savedColors}
              onSavedColorsChange={props.onSavedColorsChange}
              paletteRow1={props.paletteRow1}
              paletteMain={props.paletteMain}
              tokens={props.tokens}
            />
          </div>
        </Portal>
      </Show>
    </div>
  );
}
