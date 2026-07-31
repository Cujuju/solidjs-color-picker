/**
 * Contract tests for the popover placement rules.
 *
 * These target `clampPopoverPosition` directly rather than the ColorSwatch
 * component, because the contract being fixed IS the geometry: "no edge of the
 * popover may leave the viewport, at any anchor position or popover size."
 * Testing it through the component would only verify wiring, and would need a
 * DOM to do it.
 *
 * Written against node:test so they run with `node --test` and no dependencies.
 * They are equally valid vitest tests if a runner is added later — the
 * describe/it/assert shape is common to both.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPopoverPosition,
  VIEWPORT_MARGIN_PX,
  ANCHOR_GAP_PX,
  type AnchorRect,
  type PopoverSize,
  type ViewportSize,
} from '../position.ts';

/** A typical desktop viewport. */
const VIEWPORT: ViewportSize = { width: 1280, height: 800 };

/** Roughly the CompactColorPicker's real size. */
const COMPACT: PopoverSize = { width: 260, height: 320 };

/** Roughly the FullPicker's real size — what the Compact panel swaps to. */
const FULL: PopoverSize = { width: 280, height: 450 };

/** Build a swatch-sized anchor rect at a given viewport position. */
function anchorAt(left: number, top: number, size = 26): AnchorRect {
  return { left, top, bottom: top + size };
}

/** Assert the popover lies fully inside the viewport, margins included. */
function assertInsideViewport(
  pos: { top: number; left: number },
  popover: PopoverSize,
  viewport: ViewportSize,
): void {
  assert.ok(pos.left >= VIEWPORT_MARGIN_PX, `left ${pos.left} past left edge`);
  assert.ok(pos.top >= VIEWPORT_MARGIN_PX, `top ${pos.top} past top edge`);
  assert.ok(
    pos.left + popover.width <= viewport.width - VIEWPORT_MARGIN_PX,
    `right edge ${pos.left + popover.width} past viewport width ${viewport.width}`,
  );
  assert.ok(
    pos.top + popover.height <= viewport.height - VIEWPORT_MARGIN_PX,
    `bottom edge ${pos.top + popover.height} past viewport height ${viewport.height}`,
  );
}

describe('clampPopoverPosition — preferred placement', () => {
  it('opens below the anchor, left-aligned, when there is room', () => {
    const anchor = anchorAt(100, 100);
    const pos = clampPopoverPosition(anchor, COMPACT, VIEWPORT);
    assert.equal(pos.top, anchor.bottom + ANCHOR_GAP_PX);
    assert.equal(pos.left, anchor.left);
    assertInsideViewport(pos, COMPACT, VIEWPORT);
  });
});

describe('clampPopoverPosition — viewport edges', () => {
  it('flips above the anchor when opening below would overflow the bottom', () => {
    const anchor = anchorAt(100, 700);
    const pos = clampPopoverPosition(anchor, COMPACT, VIEWPORT);
    assert.equal(pos.top, anchor.top - COMPACT.height - ANCHOR_GAP_PX);
    assertInsideViewport(pos, COMPACT, VIEWPORT);
  });

  it('pulls back from the right edge instead of overflowing it', () => {
    // This is the case the old hard-coded 260x320 math got wrong for the
    // FullPicker: it pulled back by 260 while the panel was actually 280 wide.
    const anchor = anchorAt(1150, 100);
    const pos = clampPopoverPosition(anchor, FULL, VIEWPORT);
    assert.equal(pos.left, VIEWPORT.width - FULL.width - VIEWPORT_MARGIN_PX);
    assertInsideViewport(pos, FULL, VIEWPORT);
  });

  it('stays inside the viewport at the bottom-right corner', () => {
    const anchor = anchorAt(1250, 780);
    const pos = clampPopoverPosition(anchor, FULL, VIEWPORT);
    assertInsideViewport(pos, FULL, VIEWPORT);
  });

  it('clamps the left edge when the anchor sits at x=0', () => {
    const pos = clampPopoverPosition(anchorAt(0, 100), COMPACT, VIEWPORT);
    assert.equal(pos.left, VIEWPORT_MARGIN_PX);
  });
});

describe('clampPopoverPosition — the Compact -> Full swap', () => {
  it('re-clamps a panel that fit as Compact but overflows as Full', () => {
    // Anchor low enough that the 320px Compact panel fits below but the 450px
    // Full panel does not. The old code never recomputed here at all.
    const anchor = anchorAt(100, 420);

    const compactPos = clampPopoverPosition(anchor, COMPACT, VIEWPORT);
    assert.equal(compactPos.top, anchor.bottom + ANCHOR_GAP_PX, 'compact should open below');
    assertInsideViewport(compactPos, COMPACT, VIEWPORT);

    const fullPos = clampPopoverPosition(anchor, FULL, VIEWPORT);
    assert.notEqual(fullPos.top, compactPos.top, 'full panel must be repositioned');
    assertInsideViewport(fullPos, FULL, VIEWPORT);
  });
});

describe('clampPopoverPosition — degenerate viewports', () => {
  it('keeps the top edge reachable when the popover is taller than the viewport', () => {
    const shortViewport: ViewportSize = { width: 1280, height: 300 };
    const pos = clampPopoverPosition(anchorAt(100, 100), FULL, shortViewport);
    // Cannot fit; the contract is that the TOP stays on-screen so the panel
    // remains usable from its header down.
    assert.equal(pos.top, VIEWPORT_MARGIN_PX);
  });

  it('keeps the left edge reachable when the popover is wider than the viewport', () => {
    const narrowViewport: ViewportSize = { width: 200, height: 800 };
    const pos = clampPopoverPosition(anchorAt(50, 100), COMPACT, narrowViewport);
    assert.equal(pos.left, VIEWPORT_MARGIN_PX);
  });
});

describe('clampPopoverPosition — sweep', () => {
  it('never puts any edge off-screen across a grid of anchors and sizes', () => {
    const viewports: ViewportSize[] = [
      { width: 1280, height: 800 },
      { width: 1920, height: 1080 },
      { width: 800, height: 600 },
      { width: 480, height: 640 },
    ];
    for (const viewport of viewports) {
      for (const popover of [COMPACT, FULL]) {
        // Skip viewports too small to satisfy the contract at all — those are
        // covered by the degenerate cases above.
        if (popover.width + 2 * VIEWPORT_MARGIN_PX > viewport.width) continue;
        if (popover.height + 2 * VIEWPORT_MARGIN_PX > viewport.height) continue;
        for (let x = 0; x <= viewport.width; x += 37) {
          for (let y = 0; y <= viewport.height; y += 37) {
            const pos = clampPopoverPosition(anchorAt(x, y), popover, viewport);
            assertInsideViewport(pos, popover, viewport);
          }
        }
      }
    }
  });
});
