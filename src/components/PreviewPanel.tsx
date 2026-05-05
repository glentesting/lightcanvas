"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { useTransportStore } from "@/lib/store/transport-store";
import { renderFrame } from "@/lib/render/engine";
import type { RGB } from "@/lib/render/effects/types";
import House from "@/components/editor/house";

/**
 * Preview tab: renders the house with lights animated in real-time
 * based on the current timeline state and playhead position.
 */
export default function PreviewPanel() {
  const sequence = useEditorStore((s) => s.sequence);
  const fixtures = useEditorStore((s) => s.fixtures);
  const audio = useEditorStore((s) => s.audio);
  const audioUrl = useEditorStore((s) => s.audioUrl);

  const currentTime = useTransportStore((s) => s.currentTime);
  const isPlaying = useTransportStore((s) => s.isPlaying);

  const [previewTime, setPreviewTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  // Use transport time if audio is playing, otherwise use local preview time
  const effectiveTime = audioUrl ? currentTime : previewTime;

  // Local playback loop when no audio is loaded
  useEffect(() => {
    if (!playing || audioUrl) return;
    lastFrameRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;
      setPreviewTime((t) => {
        const duration = audio?.duration ?? 30;
        const next = t + dt;
        if (next >= duration) { setPlaying(false); return 0; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, audioUrl, audio?.duration]);

  const togglePlay = useCallback(() => {
    if (audioUrl) {
      // Let the WaveSurfer transport handle it
      useTransportStore.getState().toggle();
    } else {
      setPlaying((p) => !p);
    }
  }, [audioUrl]);

  const stop = useCallback(() => {
    setPlaying(false);
    setPreviewTime(0);
    if (audioUrl) {
      useTransportStore.getState().pause();
      useTransportStore.getState().seek(0);
    }
  }, [audioUrl]);

  // Compute pixel states from render engine
  let lights: Record<string, { color: string; intensity: number; outline?: boolean }> = {};
  try {
    const pixelStates = renderFrame(sequence, fixtures, effectiveTime, audio?.beats);
    lights = buildHouseLights(pixelStates, fixtures);
  } catch (e) {
    console.warn("Preview render error:", e);
  }

  const duration = audio?.duration ?? 30;
  const progress = duration > 0 ? effectiveTime / duration : 0;
  const activeEffects = sequence.blocks.filter(
    (b) => effectiveTime >= b.start && effectiveTime < b.start + b.duration
  ).length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Preview canvas */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f0eee9, #e6e3dc)" }}
      >
        {/* Status chips */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: (isPlaying || playing) ? "oklch(58% 0.13 145)" : "var(--ink-4)" }} />
            {(isPlaying || playing) ? "Playing" : "Paused"}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-4)" }} />
            {activeEffects} effect{activeEffects !== 1 ? "s" : ""} active
          </span>
        </div>

        {/* House with lights */}
        <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px rgba(20,22,28,.18)" }}>
          <House width={780} height={460} lights={lights} time={effectiveTime} />
        </div>
      </div>

      {/* Transport controls */}
      <div
        className="flex flex-col gap-2 px-4 py-3 shrink-0"
        style={{ height: 80, borderTop: "1px solid var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={stop}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>
          <button
            onClick={togglePlay}
            className="inline-flex items-center justify-center w-9 h-8 rounded-md"
            style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
          >
            {(isPlaying || playing) ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
          <button
            onClick={stop}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="12" height="16" rx="1" />
            </svg>
          </button>
          <div
            className="px-2.5 py-1 rounded-md text-xs font-mono"
            style={{ background: "var(--panel)", color: "var(--ink-2)", fontVariantNumeric: "tabular-nums", minWidth: 130 }}
          >
            {formatTime(effectiveTime)} <span style={{ color: "var(--ink-4)" }}>/ {formatTime(duration)}</span>
          </div>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-4)" }} />
            1x
          </span>
        </div>
        {/* Scrubber bar */}
        <div
          className="relative rounded cursor-pointer"
          style={{ height: 18, background: "var(--panel)" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const t = ((e.clientX - rect.left) / rect.width) * duration;
            if (audioUrl) {
              useTransportStore.getState().seek(t);
            } else {
              setPreviewTime(t);
            }
          }}
        >
          {/* Effect block mini-view */}
          {sequence.blocks.map((b, i) => (
            <div
              key={i}
              className="absolute top-1 bottom-1 rounded-sm"
              style={{
                left: `${(b.start / duration) * 100}%`,
                width: `${(b.duration / duration) * 100}%`,
                background: "var(--accent)",
                opacity: 0.3,
              }}
            />
          ))}
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 rounded"
            style={{ left: `${progress * 100}%`, background: "oklch(60% 0.18 25)" }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Convert per-fixture pixel states into the House component's lights prop.
 * Averages all pixel colors to get a single representative color + intensity.
 */
function buildHouseLights(
  pixelStates: Map<string, RGB[]>,
  fixtures: { id: string; kind: string }[]
): Record<string, { color: string; intensity: number; outline?: boolean }> {
  const lights: Record<string, { color: string; intensity: number; outline?: boolean }> = {};

  for (const fixture of fixtures) {
    const pixels = pixelStates.get(fixture.id);
    if (!pixels || pixels.length === 0) continue;

    // Average color and max brightness
    let rSum = 0, gSum = 0, bSum = 0, maxBright = 0;
    for (const [r, g, b] of pixels) {
      rSum += r; gSum += g; bSum += b;
      maxBright = Math.max(maxBright, r, g, b);
    }
    const n = pixels.length;
    if (maxBright === 0) continue;

    const avgR = Math.round(rSum / n);
    const avgG = Math.round(gSum / n);
    const avgB = Math.round(bSum / n);
    const intensity = maxBright / 255;
    const color = `rgb(${avgR},${avgG},${avgB})`;

    // Map fixture kind to House lights prop key
    const keyMap: Record<string, string> = {
      roofline: "roofline",
      "window-outline": "windows",
      bush: "bushes",
      "mega-tree": "megaTree",
      "mini-tree": "miniTrees",
      arch: "arches",
    };
    const key = keyMap[fixture.kind];
    if (key) {
      lights[key] = { color, intensity, outline: fixture.kind === "window-outline" };
    }
  }

  return lights;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}
