/**
 * ColorSwatch — swatch button that opens CompactColorPicker in a Portal on document.body, in the popover top layer
 * where supported. Placement is measured after mount and re-clamped on resize and scroll.
 */

import { createSignal, Show, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { ColorSwatchProps } from './types';
import { SWATCH_SIZE, mergeTokens } from './tokens';
import { clampPopoverPosition, type PopoverPosition } from './position';
import { CompactColorPicker } from './ColorPicker';

/** Corner radius per px of swatch size: 4px at 28px. */
const SWATCH_RADIUS_RATIO = 4 / 28;

export function ColorSwatch(props: ColorSwatchProps) {
  const [open, setOpen] = createSignal(false);
  /** Measured position; null until measured. */
  const [pickerPos, setPickerPos] = createSignal<PopoverPosition | null>(null);
  let swatchEl: HTMLDivElement | undefined;
  let portalEl: HTMLDivElement | undefined;

  const size = () => props.size ?? SWATCH_SIZE;
  const tokens = () => mergeTokens(props.tokens);

  /** Place the popover against the swatch at its rendered size, inside the viewport. */
  const clampPosition = () => {
    if (!swatchEl || !portalEl) return;
    setPickerPos(clampPopoverPosition(
      swatchEl.getBoundingClientRect(),
      { width: portalEl.offsetWidth, height: portalEl.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    ));
  };

  let openerEl: HTMLButtonElement | undefined;
  /** Close; return focus to the swatch if focus was inside the picker. */
  const close = () => {
    const focusWasInside = !!portalEl && portalEl.contains(document.activeElement);
    setOpen(false);
    if (focusWasInside) openerEl?.focus();
  };

  /** Toggle the picker; opening clears the old position so it is re-measured. */
  const handleOpen = () => {
    const willOpen = !open();
    if (willOpen) setPickerPos(null);
    setOpen(willOpen);
  };

  /**
   * Ref on the portalled wrapper. Subscriptions register synchronously: onCleanup needs the current owner.
   * showPopover and the first measure wait a microtask: Portal connects the node after this ref runs.
   */
  const attachPortal = (el: HTMLDivElement) => {
    portalEl = el;

    const observer = new ResizeObserver(clampPosition);
    observer.observe(el);
    // Capture: scroll events from nested scrollers don't reach window.
    window.addEventListener('scroll', clampPosition, { capture: true, passive: true });
    window.addEventListener('resize', clampPosition);

    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener('scroll', clampPosition, { capture: true });
      window.removeEventListener('resize', clampPosition);
      portalEl = undefined;
    });

    queueMicrotask(() => {
      if (!el.isConnected) return;
      // `popover` is set only where showPopover exists; otherwise `[popover]:not(:popover-open)` hides the picker.
      const showFn = (el as HTMLElement & { showPopover?: () => void }).showPopover;
      if (typeof showFn === 'function') {
        // setAttribute: Solid's JSX types don't emit `popover`.
        el.setAttribute('popover', 'manual');
        try { showFn.call(el); } catch { /* already-shown */ }
      }
      // After showPopover: a closed popover is display:none and measures 0x0.
      clampPosition();
    });
  };

  return (
    <div ref={swatchEl} style={{ display: props.fill ? 'flex' : 'inline-flex', "align-items": 'center', width: props.fill ? '100%' : undefined }}>
      <button
        type="button"
        ref={openerEl}
        onClick={handleOpen}
        title={props.value}
        aria-label={props.label ?? `Colour ${props.value}`}
        aria-haspopup="dialog"
        aria-expanded={open()}
        style={{
          width: props.fill ? '100%' : `${size()}px`, height: `${size()}px`, padding: '0', display: 'block',
          "border-radius": `${Math.round(size() * SWATCH_RADIUS_RATIO)}px`,
          background: props.value,
          border: props.noBorder ? 'none' : `1px solid ${tokens().border}`,
          cursor: 'pointer', "flex-shrink": '0',
        }}
      />
      <Show when={open()}>
        <Portal>
          {/* data-color-picker-popup: consumer outside-click checks exclude `closest('[data-color-picker-popup]')`. */}
          <div
            data-color-picker-popup
            ref={attachPortal}
            style={{
              // Neutralise the UA [popover] style: inset, margin, border, padding, background.
              position: 'fixed',
              inset: 'auto',
              top: `${pickerPos()?.top ?? 0}px`,
              left: `${pickerPos()?.left ?? 0}px`,
              // Hidden, not display:none, until measured: it must lay out to have a size.
              visibility: pickerPos() ? 'visible' : 'hidden',
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
              onClose={close}
              anchor={openerEl}
              savedColors={props.savedColors}
              onSavedColorsChange={props.onSavedColorsChange}
              paletteRow1={props.paletteRow1}
              paletteMain={props.paletteMain}
              tokens={props.tokens}
              alpha={props.alpha}
            />
          </div>
        </Portal>
      </Show>
    </div>
  );
}
