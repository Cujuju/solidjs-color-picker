/** Popover placement. Pure arithmetic; the caller measures. */

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
 * Place `popover` against `anchor` within the viewport: below, else above, else top-clamped; left-aligned, pulled in
 * from the right, then clamped left.
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
