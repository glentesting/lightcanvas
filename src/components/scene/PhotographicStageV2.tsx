"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Fixture, FixtureGroup } from "@/lib/fixtures/types";
import type { Sequence } from "@/lib/timeline/types";
import { renderFrame } from "@/lib/render/engine";
import { expandAllFixtures } from "@/lib/scene/pixel-geometry";
import {
  DEFAULT_PHOTOGRAPHIC_SETTINGS,
  PhotographicCompositor,
  type PhotographicCompositorSettings,
} from "@/lib/scene/v2/photographic-compositor";

interface PhotographicStageV2Props {
  photoUrl: string;
  fixtures: Fixture[];
  groups: FixtureGroup[];
  sequence: Sequence;
  beats?: number[];
  getTime: () => number;
  settings?: Partial<PhotographicCompositorSettings>;
  onReady?: () => void;
}

export default function PhotographicStageV2({
  photoUrl,
  fixtures,
  groups,
  sequence,
  beats,
  getTime,
  settings,
  onReady,
}: PhotographicStageV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const compositorRef = useRef<PhotographicCompositor | null>(null);
  const frameInputs = useRef({ fixtures, groups, sequence, beats, getTime });
  const fixtureKindsRef = useRef(new Map(fixtures.map((fixture) => [fixture.id, fixture.kind])));
  const settingsRef = useRef(settings);
  const onReadyRef = useRef(onReady);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    frameInputs.current = { fixtures, groups, sequence, beats, getTime };
  }, [fixtures, groups, sequence, beats, getTime]);

  const fixtureKinds = useMemo(
    () => new Map(fixtures.map((fixture) => [fixture.id, fixture.kind])),
    [fixtures]
  );

  useEffect(() => {
    fixtureKindsRef.current = fixtureKinds;
  }, [fixtureKinds]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    const compositor = new PhotographicCompositor({
      ...DEFAULT_PHOTOGRAPHIC_SETTINGS,
      ...settingsRef.current,
    });
    compositorRef.current = compositor;
    compositor.setLightPoints(
      expandAllFixtures(frameInputs.current.fixtures),
      fixtureKindsRef.current
    );
    compositor.setOnFrame(() => {
      const input = frameInputs.current;
      compositor.setLightFrame(
        renderFrame(
          input.sequence,
          input.fixtures,
          input.getTime(),
          input.beats,
          input.groups
        )
      );
    });

    compositor
      .mount(container, photoUrl)
      .then(() => {
        if (cancelled) return;
        setReady(true);
        onReadyRef.current?.();
      })
      .catch((error) => {
        console.warn("Photographic visualizer v2 failed to mount:", error);
      });

    return () => {
      cancelled = true;
      compositor.dispose();
      if (compositorRef.current === compositor) compositorRef.current = null;
    };
  }, [photoUrl]);

  useEffect(() => {
    compositorRef.current?.setLightPoints(expandAllFixtures(fixtures), fixtureKinds);
  }, [fixtures, fixtureKinds]);

  useEffect(() => {
    compositorRef.current?.setSettings(settings ?? {});
  }, [settings]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#03050b" }}
    >
      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div
            className="rounded-full px-4 py-2 text-xs font-medium"
            style={{
              color: "rgba(255,255,255,.82)",
              background: "rgba(5,8,16,.78)",
              border: "1px solid rgba(255,255,255,.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            Building photographic light layers...
          </div>
        </div>
      )}
    </div>
  );
}
