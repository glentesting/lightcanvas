"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";
import { useTransportStore } from "@/lib/store/transport-store";
import { renderFrame } from "@/lib/render/engine";
import type { RGB } from "@/lib/render/effects/types";
import House from "@/components/editor/house";
import NightStage from "@/components/scene/NightStage";

/**
 * Preview panel.
 *
 * With a house photo: the photo night-stage (NightStage / PhotoDepthScene) —
 * the real house as a dark, subtly pannable 2.5D stage with composited lights.
 * Playback time is read imperatively inside the scene's own loop, so React
 * does not re-render per frame.
 *
 * Without a photo: the legacy SVG house fallback (per PROJECT-STATUS §7, the
 * SVG stays as the no-photo fallback only).
 */
export default function PreviewPanel({ projectId }: { projectId: string }) {
  const houseCustomSvg = useEditorStore((s) => s.houseCustomSvg);

  if (houseCustomSvg) {
    return <PhotoPreview projectId={projectId} photoUrl={houseCustomSvg} />;
  }
  return <SvgPreview projectId={projectId} />;
}

/* ─── Photo night-stage path ───────────────────────────────── */

function PhotoPreview({ projectId, photoUrl }: { projectId: string; photoUrl: string }) {
  const fixtures = useEditorStore((s) => s.fixtures);
  const groups = useEditorStore((s) => s.groups);
  const sequence = useEditorStore((s) => s.sequence);
  const audio = useEditorStore((s) => s.audio);
  const isPlaying = useTransportStore((s) => s.isPlaying);

  const getTime = useCallback(() => useTransportStore.getState().currentTime, []);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0">
        <NightStage
          photoUrl={photoUrl}
          projectId={projectId}
          fixtures={fixtures}
          groups={groups}
          sequence={sequence}
          beats={audio?.beats}
          getTime={getTime}
        />
      </div>

      {/* Floating chips — minimal chrome over the dark stage */}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        <StageChip
          dot={isPlaying ? "oklch(70% 0.16 145)" : "rgba(255,255,255,0.4)"}
          label={isPlaying ? "Playing" : "Paused"}
        />
        <StageChip dot="rgba(255,255,255,0.4)" label={`${fixtures.length} props`} />
      </div>

      <Link
        href={`/project/${projectId}/layout`}
        className="absolute z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
        style={{
          bottom: 12,
          right: 12,
          background: "rgba(16, 20, 34, 0.72)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.14)",
          color: "rgba(255,255,255,0.92)",
          boxShadow: "0 4px 16px rgba(0,0,0,.35)",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        Edit Layout
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}

function StageChip({ dot, label }: { dot: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs"
      style={{
        height: 22,
        background: "rgba(16, 20, 34, 0.72)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.85)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}

/* ─── Legacy SVG fallback (no photo uploaded) ──────────────── */

function SvgPreview({ projectId }: { projectId: string }) {
  const sequence = useEditorStore((s) => s.sequence);
  const fixtures = useEditorStore((s) => s.fixtures);
  const groups = useEditorStore((s) => s.groups);
  const audio = useEditorStore((s) => s.audio);

  const currentTime = useTransportStore((s) => s.currentTime);
  const isPlaying = useTransportStore((s) => s.isPlaying);

  const effectiveTime = currentTime;

  // Container sizing via ResizeObserver
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 420 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        // Fit the 720x420 aspect ratio within the container
        const aspect = 720 / 420;
        let w = width;
        let h = width / aspect;
        if (h > height) {
          h = height;
          w = height * aspect;
        }
        setSize({ w: Math.round(w), h: Math.round(h) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute pixel states from render engine
  let lights: Record<string, { color: string; intensity: number; outline?: boolean }> = {};
  try {
    const pixelStates = renderFrame(sequence, fixtures, effectiveTime, audio?.beats, groups);
    lights = buildHouseLights(pixelStates, fixtures);
  } catch (e) {
    console.warn("Preview render error:", e);
  }

  const activeEffects = sequence.blocks.filter(
    (b) => effectiveTime >= b.start && effectiveTime < b.start + b.duration
  ).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Preview canvas — house fills available space */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ background: "#f5f4f0", minHeight: 0 }}
      >
        {/* Status chips */}
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "rgba(255,255,255,.88)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.3)", color: "var(--ink-3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: isPlaying ? "oklch(58% 0.13 145)" : "var(--ink-4)" }} />
            {isPlaying ? "Playing" : "Paused"}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "rgba(255,255,255,.88)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.3)", color: "var(--ink-3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-4)" }} />
            {activeEffects} effect{activeEffects !== 1 ? "s" : ""} active
          </span>
        </div>

        {/* House — dynamically sized to fill container */}
        <House width={size.w} height={size.h} lights={lights} time={effectiveTime} />

        {/* Plain-language hint: this is not their house yet */}
        <div
          className="absolute z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            bottom: 12,
            left: 12,
            maxWidth: 340,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(0,0,0,0.08)",
            color: "var(--ink-3)",
            boxShadow: "0 4px 12px rgba(0,0,0,.10)",
          }}
        >
          This is a stand-in house. To see your real house here, click
          &ldquo;Edit Layout&rdquo; and upload a photo of your home.
        </div>

        {/* Edit Layout — floating overlay button */}
        <Link
          href={`/project/${projectId}/layout`}
          className="absolute z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
          style={{
            bottom: 12,
            right: 12,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.4)",
            color: "var(--ink)",
            boxShadow: "0 4px 12px rgba(0,0,0,.15)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          Edit Layout
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/**
 * Convert per-fixture pixel states into the House component's lights prop.
 */
function buildHouseLights(
  pixelStates: Map<string, RGB[]>,
  fixtures: { id: string; kind: string }[]
): Record<string, { color: string; intensity: number; outline?: boolean }> {
  const lights: Record<string, { color: string; intensity: number; outline?: boolean }> = {};

  for (const fixture of fixtures) {
    const pixels = pixelStates.get(fixture.id);
    if (!pixels || pixels.length === 0) continue;

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
