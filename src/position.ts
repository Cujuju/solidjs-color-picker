/**
 * Popover positioning geometry.
 *
 * Pure arithmetic, deliberately free of any DOM access: the component measures
 * the real elements and hands the numbers here. That split is what makes the
 * placement rules testable without a browser, and it is why the sizes are
 * PARAMETERS rather than the hard-coded 260x320 constants this replaced.
 */

/** Minimum gap kept between the popover and every viewport edge (pixels). */
export const VIEWPORT_MARGIN_PX = 8;

/** Gap between the anchor and the popover edge it opens against (pixels). */
export const ANCHOR_GAP_PX = 6;

/** A rectangle in viewport coordinates, as produced by getBoundingClientRect. */
export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
}

/** The popover's measured size (offsetWidth / offsetHeight). */
export interface PopoverSize {
  width: number;
  height: number;
}

/** Viewport dimensions (window.innerWidth / innerHeight). */
export interface ViewportSize {
  width: number;
  height: number;
}

/** Resulting fixed-position offsets for the popover. */
export interface PopoverPosition {
  top: number;
  left: number;
}

/**
 * Place `popover` against `anchor` without letting any edge leave the viewport.
 *
 * Vertical rule: prefer below the anchor; flip above when below would overflow
 * the bottom; when neither side fits (viewport shorter than the popover), stop
 * anchoring and clamp so the popover's top edge stays reachable — a popover
 * pinned off the top of the screen is unusable, one pinned off the bottom
 * merely loses its footer.
 *
 * Horizontal rule: align to the anchor's left edge, pull back when that would
 * overflow the right edge, then clamp the left edge. Both clamps are required:
 * a popover wider than the viewport overflows on whichever side is left
 * unclamped, and the right-edge pull-back can itself push `left` negative.
 */
export function clampPopoverPosition(
  anchor: AnchorRect,
  popover: PopoverSize,
  viewport: ViewportSize,
): PopoverPosition {
  let top = anchor.bottom + ANCHOR_GAP_PX;
  if (top + popover.height > viewport.height - VIEWPORT_MARGIN_PX) {
    const above = anchor.top - popover.height - ANCHOR_GAP_PX;
    top = above >= VIEWPORT_MARGIN_PX
      ? above
      : Math.max(VIEWPORT_MARGIN_PX, viewport.height - popover.height - VIEWPORT_MARGIN_PX);
  }

  let left = anchor.left;
  if (left + popover.width > viewport.width - VIEWPORT_MARGIN_PX) {
    left = viewport.width - popover.width - VIEWPORT_MARGIN_PX;
  }
  if (left < VIEWPORT_MARGIN_PX) left = VIEWPORT_MARGIN_PX;

  return { top, left };
}
