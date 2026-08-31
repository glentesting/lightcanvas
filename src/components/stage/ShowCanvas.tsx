"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { useTransportStore } from "@/lib/store/transport-store";
import { expandFixturePixels } from "@/lib/scene/pixel-geometry";
import { renderFrame } from "@/lib/render/engine";
import { identityColor } from "@/lib/fixtures/identity";
import type { Fixture } from "@/lib/fixtures/types";
import type { LightPoint } from "@/lib/scene/types";

/**
 * THE shared show renderer — one code path for what the display looks like.
 *
 * Geometry comes from expandFixturePixels (the same pixels the photo
 * night-stage and the layout editor use). Colors come from the real render
 * engine at the transport clock's current time; when the show isn't
 * playing/scrubbed past 0, props glow in their identity colors so every
 * prop type is tellable at a glance.
 *
 * Used by: the timeline's live preview strip, the designer's no-photo
 * preview, and the layout editor's night view.
 */
export default function ShowCanvas({
  photoUrl,
  className,
  dimPhoto = 0.55,
}: {
  photoUrl?: string | null;
  className?: string;
  dimPhoto?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = parent.clientWidth;
    const ch = parent.clientHeight;
    if (cw === 0 || ch === 0) return;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // fit the 720×420 stage inside the canvas
    const scale = Math.min(cw / 720, ch / 420);
    const ox = (cw - 720 * scale) / 2;
    const oy = (ch - 420 * scale) / 2;

    // background
    ctx.fillStyle = "#0b101e";
    ctx.fillRect(0, 0, cw, ch);
    const img = photoRef.current;
    if (img) {
      ctx.drawImage(img, ox, oy, 720 * scale, 420 * scale);
      ctx.fillStyle = `rgba(8, 12, 30, ${dimPhoto})`;
      ctx.fillRect(ox, oy, 720 * scale, 420 * scale);
    }

    const { fixtures, sequence, groups, audio } = useEditorStore.getState();
    const t = useTransportStore.getState().currentTime;

    // real sequence colors from the engine; identity colors where dark/idle
    let frame: Map<string, Array<[number, number, number]>> | null = null;
    try {
      frame = renderFrame(sequence, fixtures, t, audio?.beats, groups) as Map<
        string,
        Array<[number, number, number]>
      >;
    } catch {
      frame = null;
    }

    for (const fixture of fixtures) {
      const pixels: LightPoint[] = expandFixturePixels(fixture, fixtures);
      const colors = frame?.get(fixture.id);
      const idle = identityColor(fixture);
      for (const p of pixels) {
        const c = colors?.[p.pixelIndex];
        const lit = c && (c[0] > 8 || c[1] > 8 || c[2] > 8);
        const x = ox + p.x * scale;
        const y = oy + p.y * scale;
        const r = Math.max(1, p.size * scale * 0.9);
        if (lit) {
          const fill = `rgb(${c![0]},${c![1]},${c![2]})`;
          ctx.shadowColor = fill;
          ctx.shadowBlur = r * 3;
          ctx.fillStyle = fill;
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = idle;
          ctx.globalAlpha = 0.85;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    }
  }, [dimPhoto]);

  // load the photo (redraw when it arrives)
  useEffect(() => {
    photoRef.current = null;
    if (!photoUrl) {
      draw();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      photoRef.current = img;
      draw();
    };
    img.src = photoUrl;
  }, [photoUrl, draw]);

  // redraw on store changes, transport ticks, and resize
  useEffect(() => {
    draw();
    const unsubEditor = useEditorStore.subscribe(() => scheduleDraw());
    const unsubTransport = useTransportStore.subscribe(() => scheduleDraw());
    const ro = new ResizeObserver(() => scheduleDraw());
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);

    function scheduleDraw() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }
    return () => {
      unsubEditor();
      unsubTransport();
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return <canvas ref={canvasRef} className={className} style={{ display: "block" }} />;
}

export type { Fixture };
