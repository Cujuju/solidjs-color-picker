/**
 * ColorSwatch — click-to-open swatch button with portal-based picker.
 *
 * Renders a small colored square. Clicking it opens the CompactColorPicker via
 * Solid's <Portal>, which renders directly into document.body to escape
 * any ancestor transform/overflow that would break fixed positioning
 * (e.g. dialogs using transform: translateX(-50%)).
 *
 * 2026-05-12 — the portaled picker also opts into the HTML Popover API
 * top-layer (`popover="manual"` + `showPopover()` on mount). This keeps
 * it above any consumer-side popover (e.g. an AnchoredPopover-based
 * StyleEditor) that would otherwise paint above a plain
 * `z-index: 9999` portal. Top-layer is rendered above ALL z-indexes
 * and stacks LIFO of showPopover() calls, so the picker (opened second)
 * naturally lands above its consumer (opened first). Feature-detected
 * so non-supporting browsers silently fall back to the z-index 9999
 * layer.
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
          {/*
            data-color-picker-popup — outside-click hook for consumer overlays.
            Consumers wrapping ColorSwatch inside their own click-outside trap
            (Dialog, popover, StyleEditor) extend their predicate with
            `target.closest('[data-color-picker-popup]')` so a click inside
            the portaled picker (which is NOT a DOM descendant of the
            consumer's ref) doesn't dismiss the wrapper.

            popover="manual" — opts into the HTML Popover API top-layer.
            Ref-callback calls showPopover() so the picker enters the
            top-layer LIFO-after any consumer popover (e.g. a parent
            AnchoredPopover-based StyleEditor) and paints above it.
            Feature-detected via typeof check; non-supporting browsers
            still get the z-index 9999 fallback.
          */}
          <div
            data-color-picker-popup
            ref={(el) => {
              // Set `popover` as an HTML attribute via setAttribute rather
              // than a JSX prop — Solid's JSX types don't reliably emit the
              // `popover` global attribute, and a missing attribute leaves
              // the element styled by UA `[popover]:not(:popover-open) {
              // display: none }` once the attribute IS observed.
              // Same workaround used by @cujuju/solidjs-anchored-popover.
              el.setAttribute('popover', 'manual');
              // Defer showPopover() until the element is connected to the
              // document. Solid's <Portal> appends to its mount target AFTER
              // the ref callback fires, so calling showPopover() directly
              // here throws InvalidStateError (silently swallowed). One
              // microtask later, the element is in document.body and
              // showPopover() succeeds. queueMicrotask is preferable to
              // setTimeout(0) because it runs before paint, avoiding a
              // flash of UA-hidden picker. (HTML Popover API spec requires
              // an element to be connected before showPopover() runs.)
              queueMicrotask(() => {
                if (!el.isConnected) return;
                const showFn = (el as HTMLElement & { showPopover?: () => void }).showPopover;
                if (typeof showFn === 'function') {
                  try { showFn.call(el); } catch { /* already-shown */ }
                }
              });
            }}
            style={{
              // Override the browser's [popover] UA stylesheet (inset:0,
              // margin:auto, border:solid, padding:0.25em, background:canvas)
              // so the picker positions exactly where computed and doesn't
              // get a UA chrome ring.
              position: 'fixed',
              inset: 'auto',
              top: `${pickerPos().top}px`,
              left: `${pickerPos().left}px`,
              width: 'auto',
              height: 'auto',
              margin: '0',
              padding: '0',
              border: 'none',
              overflow: 'visible',
              background: 'transparent',
              color: 'inherit',
              "z-index": '9999',
            }}
          >
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
