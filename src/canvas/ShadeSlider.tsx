/** ShadeSlider — vertical brightness slider, current hue and saturation (top) to black (bottom); click or drag to pick. */

import { createEffect } from 'solid-js';
import { pointerDrag, DRAG_SURFACE_STYLE } from './pointerDrag';
import type { ShadeSliderProps } from '../types';
import { hsvToHex } from '../utils';

export function ShadeSlider(props: ShadeSliderProps) {
  let canvasEl: HTMLCanvasElement | undefined;

  const draw = () => {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const w = props.width;
    const h = props.height;
    // Vertical gradient: bright (top) to dark (bottom)
    const topColor = hsvToHex({ h: props.hue, s: props.saturation, v: 100 });
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  };

  // Redraw when hue or saturation changes
  createEffect(() => {
    void props.hue;
    void props.saturation;
    draw();
  });


  const pickFromEvent = (e: MouseEvent) => {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    // Top = 100 (bright), bottom = 0 (dark)
    props.onChange(100 - (y / rect.height) * 100);
  };

  const drag = pointerDrag(pickFromEvent);

  // Pointer position: vertical pill
  const pointerTop = () => `${100 - props.value}%`;

  return (
    <div onPointerDown={drag.onPointerDown} onPointerMove={drag.onPointerMove} style={{ ...DRAG_SURFACE_STYLE, position: 'relative', width: `${props.width}px`, height: `${props.height}px`, "flex-shrink": '0', "border-radius": '6px', overflow: 'hidden', cursor: 'pointer' }}>
      <canvas
        ref={canvasEl}
        width={props.width}
        height={props.height}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* Vertical pill pointer */}
      <div style={{
        position: 'absolute',
        top: pointerTop(),
        width: '100%',
        display: 'flex',
        "justify-content": 'center',
      }}>
        <div style={{
          width: `${props.width - 4}px`,
          height: '6px',
          "border-radius": '3px',
          background: 'rgba(255,255,255,0.9)',
          "box-shadow": '0 1px 4px rgba(0,0,0,0.5)',
          transform: 'translateY(-50%)',
          "pointer-events": 'none',
        }} />
      </div>
    </div>
  );
}
