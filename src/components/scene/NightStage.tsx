"use client";

import { useEffect, useRef, useState } from "react";
import type { Fixture, FixtureGroup } from "@/lib/fixtures/types";
import type { Sequence } from "@/lib/timeline/types";
import { renderFrame } from "@/lib/render/engine";
import { expandAllFixtures } from "@/lib/scene/pixel-geometry";
import { PhotoDepthScene } from "@/lib/scene/photo-depth-scene";
import type { SceneProvider } from "@/lib/scene/types";
import { STAGE_ASPECT } from "@/lib/scene/types";
import { loadOrCreateDepth, type DepthStatus } from "@/lib/scene/depth/persist";

/**
 * NightStage — the photo night-stage preview surface.
 *
 * Props-driven (no store coupling) so the editor, the share page, and the dev
 * harness can all use it. Owns the SceneProvider lifecycle; per-frame light
 * colors are computed here from the sequence via renderFrame and pushed into
 * the scene, with playback time read imperatively through getTime().
 */
export interface NightStageProps {
  photoUrl: string;
  /** Enables depth-map persistence; null (e.g. dev harness) = estimate only. */
  projectId: string | null;
  fixtures: Fixture[];
  groups: FixtureGroup[];
  sequence: Sequence;
  beats?: number[];
  /** Read per animation frame — return current playback time in seconds. */
  getTime: () => number;
  /** Debug: skip depth estimation and render the flat stage (dev harness). */
  disableDepth?: boolean;
  /** Debug: render the photo ungraded to check light alignment (dev harness). */
  debugDaylight?: boolean;
}

export default function NightStage({
  photoUrl,
  projectId,
  fixtures,
  groups,
  sequence,
  beats,
  getTime,
  disableDepth,
  debugDaylight,
}: NightStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneProvider | null>(null);
  const [status, setStatus] = useState<DepthStatus | null>({ phase: "checking" });
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ w: 720, h: 420 });

  // Latest playback inputs, readable from the frame loop without re-mounting
  // the scene on every edit.
  const frameInputs = useRef({ fixtures, groups, sequence, beats, getTime });
  useEffect(() => {
    frameInputs.current = { fixtures, groups, sequence, beats, getTime };
  }, [fixtures, groups, sequence, beats, getTime]);

  // Letterbox the stage to 12:7 inside whatever space we're given.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;
      let w = width;
      let h = width / STAGE_ASPECT;
      if (h > height) {
        h = height;
        w = height * STAGE_ASPECT;
      }
      w = Math.round(w);
      h = Math.round(h);
      setSize({ w, h });
      sceneRef.current?.resize(w, h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scene lifecycle — rebuilt only when the photo changes.
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl || !photoUrl) return;
    let cancelled = false;
    let scene: PhotoDepthScene | null = null;

    (async () => {
      setMounted(false);
      const depth = disableDepth
        ? null
        : await loadOrCreateDepth(photoUrl, projectId, (s) => {
            if (!cancelled) setStatus(s);
          });
      if (cancelled) return;

      scene = new PhotoDepthScene({ photoUrl, depth, debugDaylight });
      sceneRef.current = scene;
      scene.setLightPoints(expandAllFixtures(frameInputs.current.fixtures));
      scene.setOnFrame(() => {
        const { fixtures, groups, sequence, beats, getTime } = frameInputs.current;
        try {
          const frame = renderFrame(sequence, fixtures, getTime(), beats, groups);
          scene?.setLightFrame(frame);
        } catch (e) {
          console.warn("Night stage render error:", e);
        }
      });

      try {
        await scene.mount(stageEl);
        if (cancelled) return;
        setMounted(true);
      } catch (e) {
        console.warn("Night stage failed to mount:", e);
        if (!cancelled) setStatus({ phase: "failed" });
      }
    })();

    return () => {
      cancelled = true;
      scene?.dispose();
      if (sceneRef.current === scene) sceneRef.current = null;
    };
  }, [photoUrl, projectId, disableDepth, debugDaylight]);

  // Light positions follow fixture layout edits without a scene rebuild.
  useEffect(() => {
    sceneRef.current?.setLightPoints(expandAllFixtures(fixtures));
  }, [fixtures]);

  const statusLabel = (() => {
    if (mounted || !status) return null;
    switch (status.phase) {
      case "checking":
        return "Preparing your night stage…";
      case "loading-model":
        return `Reading your house — building depth (${status.pct}%)…`;
      case "estimating":
        return "Mapping the shape of your house…";
      case "failed":
        return null; // flat fallback still renders
      default:
        return null;
    }
  })();

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: "#04060d" }}
      onPointerMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        sceneRef.current?.setPointer(nx, ny, true);
      }}
      onPointerLeave={() => sceneRef.current?.setPointer(0, 0, false)}
    >
      <div
        ref={stageRef}
        style={{
          width: size.w,
          height: size.h,
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      />
      {statusLabel && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-medium"
            style={{
              background: "rgba(10, 14, 28, 0.75)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: "#fbbf24" }}
            />
            {statusLabel}
          </div>
        </div>
      )}
    </div>
  );
}
