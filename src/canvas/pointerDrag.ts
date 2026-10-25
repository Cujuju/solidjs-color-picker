/** Press-and-drag picking for the canvas controls, bound to the control's container so knob presses count. */

import type { JSX } from 'solid-js';

/** `PointerEvent.button` of the primary (usually left) button. */
const PRIMARY_BUTTON = 0;

type Handler = JSX.EventHandler<HTMLDivElement, PointerEvent>;

/** Container style that stops touch drags from scrolling the page instead of picking. */
export const DRAG_SURFACE_STYLE: JSX.CSSProperties = { "touch-action": 'none' };

/** Handlers that call `pick` on a primary-button press and on every move until release. */
export function pointerDrag(pick: (e: PointerEvent) => void): { onPointerDown: Handler; onPointerMove: Handler } {
  return {
    onPointerDown: (e) => {
      if (e.button !== PRIMARY_BUTTON) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pick(e);
    },
    onPointerMove: (e) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e);
    },
  };
}
