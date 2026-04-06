/**
 * SaturationCanvas — canvas-based HSV saturation/brightness square.
 *
 * Draws a 2D saturation (x-axis) / brightness (y-axis) gradient for a given hue.
 * Click or drag to pick saturation and value. The crosshair pointer tracks
 * the current position.
 */

import { createEffect, onMount, onCleanup } from 'solid-js';
import type { SaturationCanvasProps } from '../types';
import { hsvToHex } from '../utils';

export function SaturationCanvas(props: SaturationCanvasProps) {
  let canvasEl: HTMLCanvasElement | undefined;
  let dragging = false;

  // Draw the saturation/brightness gradient for the current hue
  const draw = () => {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const w = props.width;
    const h = props.height;

    // Base hue fill
    const pureColor = hsvToHex({ h: props.hue, s: 100, v: 100 });
    ctx.fillStyle = pureColor;
    ctx.fillRect(0, 0, w, h);

    // White gradient (left-to-right)
    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);

    // Black gradient (top-to-bottom)
    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);
  };

  // Redraw whenever hue changes
  createEffect(() => {
    void props.hue;
    draw();
  });

  onMount(draw);

  /** Convert mouse position to saturation/value and emit */
  const pickFromEvent = (e: MouseEvent) => {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const s = (x / rect.width) * 100;
    const v = 100 - (y / rect.height) * 100;
    props.onChange(s, v);
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

  // Pointer position as percentage
  const pointerX = () => `${props.saturation}%`;
  const pointerY = () => `${100 - props.value}%`;

  return (
    <div style={{ position: 'relative', width: `${props.width}px`, height: `${props.height}px`, "flex-shrink": '0', "border-radius": '6px', overflow: 'hidden', cursor: 'crosshair' }}>
      <canvas
        ref={canvasEl}
        width={props.width}
        height={props.height}
        onMouseDown={handleMouseDown}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* Crosshair pointer */}
      <div style={{
        position: 'absolute',
        left: pointerX(),
        top: pointerY(),
        width: '12px',
        height: '12px',
        "border-radius": '50%',
        border: '2px solid white',
        "box-shadow": '0 1px 4px rgba(0,0,0,0.5)',
        transform: 'translate(-50%, -50%)',
        "pointer-events": 'none',
      }} />
    </div>
  );
}
