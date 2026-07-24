/**
 * ColorSwatch — click-to-open swatch button with portal-based picker.
 *
 * Renders a small colored square. Clicking it opens the CompactColorPicker via
 * Solid's <Portal>, which renders directly into document.body to escape
 * any ancestor transform/overflow that would break fixed positioning
 * (e.g. dialogs using transform: translateX(-50%)).
 *
 * Positioning is MEASURED, never assumed. The panel's size is not knowable
 * before it renders — CompactColorPicker and the FullPicker it swaps to on "+"
 * are different sizes, and both change with the `tokens` prop (pad/gap/radius).
 * So the popover mounts hidden, is measured, then clamped to the viewport, and
 * re-clamped whenever the geometry it was derived from changes:
 *
 *   - the panel resizes    → ResizeObserver (covers the Compact <-> Full swap)
 *   - the viewport resizes → window 'resize'
 *   - the anchor moves     → window 'scroll' (capture, so nested scrollers count)
 *
 * Prior versions computed the position once on click from hard-coded 260x320
 * dimensions, which left the panel hanging off-screen near the right and bottom
 * edges and after any Compact -> Full swap.
 *
 * This file owns the MEASURING and the subscriptions; the placement rules
 * themselves live in ./position as pure arithmetic.
 */

import { createSignal, Show, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { ColorSwatchProps } from './types';
import { SWATCH_SIZE, mergeTokens } from './tokens';
import { clampPopoverPosition, type PopoverPosition } from './position';
import { CompactColorPicker } from './ColorPicker';

/**
 * Corner radius as a fraction of swatch size — a 28px swatch gets 4px corners,
 * and smaller/larger swatches scale proportionally rather than looking either
 * square or pill-shaped at the extremes.
 */
const SWATCH_RADIUS_RATIO = 4 / 28;

export function ColorSwatch(props: ColorSwatchProps) {
  const [open, setOpen] = createSignal(false);
  /** null until the popover has been measured — gates `visibility` below. */
  const [pickerPos, setPickerPos] = createSignal<PopoverPosition | null>(null);
  let swatchEl: HTMLDivElement | undefined;
  let portalEl: HTMLDivElement | undefined;

  const size = () => props.size ?? SWATCH_SIZE;
  const tokens = () => mergeTokens(props.tokens);

  /**
   * Position the popover against the swatch using the popover's ACTUAL
   * rendered size, clamped so no edge leaves the viewport.
   */
  const clampPosition = () => {
    if (!swatchEl || !portalEl) return;
    setPickerPos(clampPopoverPosition(
      swatchEl.getBoundingClientRect(),
      { width: portalEl.offsetWidth, height: portalEl.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    ));
  };

  /** Toggle the picker. Position is resolved after mount, once measurable. */
  const handleOpen = () => {
    const willOpen = !open();
    // Drop the stale position when opening so the next open re-measures
    // instead of flashing at wherever the previous open happened to land.
    if (willOpen) setPickerPos(null);
    setOpen(willOpen);
  };

  /**
   * Ref callback on the portalled wrapper. Runs once the node is in the DOM,
   * which is the first moment its size is real — so it both measures and
   * subscribes to every source of geometry change.
   */
  const attachPortal = (el: HTMLDivElement) => {
    portalEl = el;
    clampPosition();

    const observer = new ResizeObserver(clampPosition);
    observer.observe(el);
    // Capture phase: scrolling ANY ancestor moves the anchor, and scroll
    // events from nested scrollers do not bubble up to window.
    window.addEventListener('scroll', clampPosition, { capture: true, passive: true });
    window.addEventListener('resize', clampPosition);

    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener('scroll', clampPosition, { capture: true });
      window.removeEventListener('resize', clampPosition);
      portalEl = undefined;
    });
  };

  return (
    <div ref={swatchEl} style={{ display: 'inline-flex', "align-items": 'center' }}>
      <div
        onClick={handleOpen}
        title={props.value}
        style={{
          width: `${size()}px`, height: `${size()}px`,
          "border-radius": `${Math.round(size() * SWATCH_RADIUS_RATIO)}px`,
          background: props.value,
          border: props.noBorder ? 'none' : `1px solid ${tokens().border}`,
          cursor: 'pointer', "flex-shrink": '0',
        }}
      />
      <Show when={open()}>
        {/* Portal renders into document.body, bypassing ancestor transform/overflow */}
        <Portal>
          <div
            ref={attachPortal}
            style={{
              position: 'fixed',
              top: `${pickerPos()?.top ?? 0}px`,
              left: `${pickerPos()?.left ?? 0}px`,
              // Hidden (not unmounted) until measured: the node must be laid
              // out to have a size, but must not be seen at the pre-clamp
              // origin. `visibility` still reserves layout; `display: none`
              // would zero the measurement.
              visibility: pickerPos() ? 'visible' : 'hidden',
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
