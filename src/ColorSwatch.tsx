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
 *
 * 2026-05-12 — the portalled picker also opts into the HTML Popover API
 * top-layer (`popover="manual"` + `showPopover()` on mount). This keeps it above
 * any consumer-side popover (e.g. an AnchoredPopover-based StyleEditor) that
 * would otherwise paint above a plain `z-index: 9999` portal. The top layer
 * renders above ALL z-indexes and stacks LIFO by showPopover() call order, so
 * the picker (opened second) naturally lands above its consumer (opened first).
 * Feature-detected, so non-supporting browsers fall back to the z-index layer.
 *
 * ⚠ The top-layer opt-in and the measuring above are ORDER-COUPLED, which is why
 * the mount sequence below looks fussier than either concern needs alone. The UA
 * stylesheet carries `[popover]:not(:popover-open) { display: none }`, and a
 * display:none element measures 0x0 — so the FIRST measurement must happen after
 * showPopover(), or the clamp runs on a zero-size popover and places the panel
 * at its unclamped preferred origin. That is also why the `popover` attribute is
 * only set when showPopover is actually callable: setting it in a browser that
 * cannot open it would leave the picker permanently display:none.
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
  let openerEl: HTMLButtonElement | undefined;
  /**
   * Closes the picker and returns focus to the swatch that opened it, when focus was in the picker (an outside click's
   * own target takes focus after this runs, so it isn't stolen).
   */
  const close = () => {
    const focusWasInside = !!portalEl && portalEl.contains(document.activeElement);
    setOpen(false);
    if (focusWasInside) openerEl?.focus();
  };

  const handleOpen = () => {
    const willOpen = !open();
    // Drop the stale position when opening so the next open re-measures
    // instead of flashing at wherever the previous open happened to land.
    if (willOpen) setPickerPos(null);
    setOpen(willOpen);
  };

  /**
   * Ref callback on the portalled wrapper.
   *
   * Split into a synchronous half and a deferred half, and the split is load-
   * bearing in both directions:
   *
   *  - The subscriptions stay SYNCHRONOUS because `onCleanup` only registers
   *    against the owner that is current while the ref runs. Moving it into the
   *    microtask below would put it outside that owner, so the observer and the
   *    two window listeners would never be torn down.
   *  - The top-layer opt-in and the FIRST measurement are DEFERRED because
   *    Solid's <Portal> appends the node to its mount target AFTER this callback
   *    fires. showPopover() on a disconnected node throws InvalidStateError, and
   *    offsetWidth/offsetHeight on one reads 0 — which would clamp the panel
   *    against a 0x0 popover and place it at the unclamped origin. One
   *    microtask later the node is connected; a microtask (not setTimeout 0)
   *    keeps this before paint, so nothing is seen at the wrong position.
   */
  const attachPortal = (el: HTMLDivElement) => {
    portalEl = el;

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

    queueMicrotask(() => {
      if (!el.isConnected) return;
      // Feature-detect BEFORE setting the attribute. `popover` without a
      // working showPopover() leaves the element matching the UA's
      // `[popover]:not(:popover-open) { display: none }` rule forever.
      const showFn = (el as HTMLElement & { showPopover?: () => void }).showPopover;
      if (typeof showFn === 'function') {
        // Set `popover` via setAttribute rather than a JSX prop — Solid's JSX
        // types don't reliably emit the `popover` global attribute. Same
        // workaround used by @cujuju/solidjs-anchored-popover.
        el.setAttribute('popover', 'manual');
        try { showFn.call(el); } catch { /* already-shown */ }
      }
      // AFTER showPopover: only now is the element guaranteed not to be
      // display:none, so this is the first point at which it has a real size.
      clampPosition();
    });
  };

  return (
    <div ref={swatchEl} style={{ display: 'inline-flex', "align-items": 'center' }}>
      <button
        type="button"
        ref={openerEl}
        onClick={handleOpen}
        title={props.value}
        aria-label={props.label ?? `Colour ${props.value}`}
        aria-haspopup="dialog"
        aria-expanded={open()}
        style={{
          width: `${size()}px`, height: `${size()}px`, padding: '0', display: 'block',
          "border-radius": `${Math.round(size() * SWATCH_RADIUS_RATIO)}px`,
          background: props.value,
          border: props.noBorder ? 'none' : `1px solid ${tokens().border}`,
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
            the portalled picker (which is NOT a DOM descendant of the
            consumer's ref) doesn't dismiss the wrapper.

            The `popover` attribute is NOT set here — attachPortal sets it, and
            only once showPopover() is known to be callable. See the file
            header for why the order matters.
          */}
          <div
            data-color-picker-popup
            ref={attachPortal}
            style={{
              // Override the browser's [popover] UA stylesheet (inset:0,
              // margin:auto, border:solid, padding:0.25em, background:canvas)
              // so the picker positions exactly where computed and doesn't
              // get a UA chrome ring.
              position: 'fixed',
              inset: 'auto',
              top: `${pickerPos()?.top ?? 0}px`,
              left: `${pickerPos()?.left ?? 0}px`,
              // Hidden (not unmounted) until measured: the node must be laid
              // out to have a size, but must not be seen at the pre-clamp
              // origin. `visibility` still reserves layout; `display: none`
              // would zero the measurement.
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
