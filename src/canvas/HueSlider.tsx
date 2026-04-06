/**
 * HueSlider — canvas-based horizontal rainbow hue slider.
 *
 * Draws a horizontal rainbow gradient (0-360 degrees). Click or drag
 * to pick a hue value. A vertical pill indicator tracks the current position.
 */

import { onMount, onCleanup } from 'solid-js';
import type { HueSliderProps } from '../types';

export function HueSlider(props: HueSliderProps) {
  let canvasEl: HTMLCanvasElement | undefined;
  let dragging = false;

  const draw = () => {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const w = props.width;
    const h = props.height;
    // Horizontal rainbow gradient
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    const stops = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1];
    const colors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'];
    stops.forEach((s, i) => grad.addColorStop(s, colors[i]));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  };

  onMount(draw);

  const pickFromEvent = (e: MouseEvent) => {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    props.onChange((x / rect.width) * 360);
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

  // Pointer position: horizontal slider pill
  const pointerLeft = () => `${(props.hue / 360) * 100}%`;

  return (
    <div style={{ position: 'relative', width: `${props.width}px`, height: `${props.height}px`, "border-radius": '6px', overflow: 'hidden', cursor: 'pointer' }}>
      <canvas
        ref={canvasEl}
        width={props.width}
        height={props.height}
        onMouseDown={handleMouseDown}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* Horizontal pill pointer */}
      <div style={{
        position: 'absolute',
        left: pointerLeft(),
        top: '0',
        height: '100%',
        display: 'flex',
        "align-items": 'center',
      }}>
        <div style={{
          width: '6px',
          height: `${props.height - 4}px`,
          "border-radius": '3px',
          background: 'rgba(255,255,255,0.9)',
          "box-shadow": '0 1px 4px rgba(0,0,0,0.5)',
          transform: 'translateX(-50%)',
          "pointer-events": 'none',
        }} />
      </div>
    </div>
  );
}
