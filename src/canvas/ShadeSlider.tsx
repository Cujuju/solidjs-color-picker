/**
 * ShadeSlider — canvas-based vertical brightness slider.
 *
 * Draws a vertical gradient from the fully bright version of the current
 * hue+saturation (top) to black (bottom). Click or drag to pick brightness.
 * A horizontal pill indicator tracks the current position.
 */

import { createEffect, onMount, onCleanup } from 'solid-js';
import type { ShadeSliderProps } from '../types';
import { hsvToHex } from '../utils';

export function ShadeSlider(props: ShadeSliderProps) {
  let canvasEl: HTMLCanvasElement | undefined;
  let dragging = false;

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

  onMount(draw);

  const pickFromEvent = (e: MouseEvent) => {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    // Top = 100 (bright), bottom = 0 (dark)
    props.onChange(100 - (y / rect.height) * 100);
  };

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    dragging = true;
    pickFromEvent(e);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging) pickFromEvent(e);
  };

  const handleMouseUp = () => {
    dragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  onCleanup(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  });

  // Pointer position: vertical pill
  const pointerTop = () => `${100 - props.value}%`;

  return (
    <div style={{ position: 'relative', width: `${props.width}px`, height: `${props.height}px`, "flex-shrink": '0', "border-radius": '6px', overflow: 'hidden', cursor: 'pointer' }}>
      <canvas
        ref={canvasEl}
        width={props.width}
        height={props.height}
        onMouseDown={handleMouseDown}
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
