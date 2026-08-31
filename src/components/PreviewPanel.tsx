"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";
import { useTransportStore } from "@/lib/store/transport-store";
import NightStage from "@/components/scene/NightStage";
import ShowCanvas from "@/components/stage/ShowCanvas";

/**
 * Preview panel.
 *
 * With a house photo: the photo night-stage (NightStage / PhotoDepthScene) —
 * the real house as a dark, subtly pannable 2.5D stage with composited lights.
 * Without a photo: the shared ShowCanvas renderer on a dark stage. Both draw
 * from the same expandFixturePixels geometry.
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

/* ─── No-photo fallback: the same shared renderer on a dark stage ── */

function SvgPreview({ projectId }: { projectId: string }) {
  const fixtures = useEditorStore((s) => s.fixtures);
  const isPlaying = useTransportStore((s) => s.isPlaying);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0" style={{ background: "#0b101e" }}>
        <ShowCanvas />
      </div>

      <div className="absolute top-3 left-3 flex gap-2 z-10">
        <StageChip
          dot={isPlaying ? "oklch(70% 0.16 145)" : "rgba(255,255,255,0.4)"}
          label={isPlaying ? "Playing" : "Paused"}
        />
        <StageChip dot="rgba(255,255,255,0.4)" label={`${fixtures.length} props`} />
      </div>

      {/* Plain-language hint: this is not their house yet */}
      <div
        className="absolute z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{
          bottom: 12,
          left: 12,
          maxWidth: 340,
          background: "rgba(16, 20, 34, 0.78)",
          border: "1px solid rgba(255,255,255,0.14)",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        These are your lights on a dark stage. To see them on your real house,
        click &ldquo;Edit Layout&rdquo; and upload a photo of your home.
      </div>

      <Link
        href={`/project/${projectId}/layout`}
        className="absolute z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
        style={{
          bottom: 12,
          right: 12,
          background: "rgba(16, 20, 34, 0.72)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.14)",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        Edit Layout
      </Link>
    </div>
  );
}
