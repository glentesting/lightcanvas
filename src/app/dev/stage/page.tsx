"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import NightStage from "@/components/scene/NightStage";
import type { Fixture, FixtureGroup } from "@/lib/fixtures/types";
import type { Sequence } from "@/lib/timeline/types";

/**
 * Dev-only harness for the photo night-stage. Lets us iterate on the look
 * (night grade, bloom, bulb rendering, parallax) with a bundled sample photo,
 * fake fixtures, and a self-advancing clock — no auth, no Supabase, no audio.
 * Not linked from anywhere; 404s in production builds.
 */

const LOOP_SECONDS = 24;

// Demo layout traced against /dev/sample-house.jpg (stage space, 720×420).
function demoFixtures(): Fixture[] {
  return [
    {
      id: "demo-roofline",
      kind: "roofline",
      name: "Roofline",
      pixelCount: 200,
      startChannel: 1,
      layout: {
        // Left eave → entry eave → right wing rake, following the photo.
        points: [
          { x: 146, y: 139 },
          { x: 250, y: 167 },
          { x: 266, y: 194 },
          { x: 424, y: 194 },
          { x: 465, y: 176 },
          { x: 615, y: 59 },
          { x: 705, y: 124 },
        ],
        closed: false,
      },
    },
    {
      id: "demo-window-left",
      kind: "window-outline",
      name: "Bay window",
      pixelCount: 40,
      startChannel: 601,
      layout: { points: [{ x: 176, y: 248 }], closed: false },
    },
    {
      id: "demo-window-right",
      kind: "window-outline",
      name: "Right window",
      pixelCount: 40,
      startChannel: 721,
      layout: { points: [{ x: 544, y: 251 }], closed: false },
    },
    {
      id: "demo-mega-tree",
      kind: "mega-tree",
      name: "Mega tree",
      pixelCount: 360,
      startChannel: 841,
      geometry: { strandCount: 12 },
      layout: { points: [{ x: 465, y: 340 }], closed: false },
    },
    {
      id: "demo-mini-1",
      kind: "mini-tree",
      name: "Mini tree 1",
      pixelCount: 50,
      startChannel: 1921,
      layout: { points: [{ x: 135, y: 338 }], closed: false },
    },
    {
      id: "demo-mini-2",
      kind: "mini-tree",
      name: "Mini tree 2",
      pixelCount: 50,
      startChannel: 2071,
      layout: { points: [{ x: 595, y: 320 }], closed: false },
    },
    {
      id: "demo-arch-1",
      kind: "arch",
      name: "Arch 1",
      pixelCount: 35,
      startChannel: 2221,
      layout: { points: [{ x: 200, y: 352 }], closed: false },
    },
    {
      id: "demo-arch-2",
      kind: "arch",
      name: "Arch 2",
      pixelCount: 35,
      startChannel: 2326,
      layout: { points: [{ x: 310, y: 356 }], closed: false },
    },
    {
      id: "demo-arch-3",
      kind: "arch",
      name: "Arch 3",
      pixelCount: 35,
      startChannel: 2431,
      layout: { points: [{ x: 420, y: 358 }], closed: false },
    },
  ];
}

function demoSequence(fixtures: Fixture[]): Sequence {
  const base = { intensity: 1, speed: 1, easing: "linear" as const };
  const blocks = [
    // Warm-white roofline: dense shimmer — most bulbs lit, like the references.
    { trackId: "demo-roofline", effectId: "twinkle" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#ffd9a0", density: 0.85, speed: 0.45 } },
    // Windows: steady cool-white outline.
    { trackId: "demo-window-left", effectId: "wash" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#bfe7ff", color2: "#7dd3fc", intensity: 0.9 } },
    { trackId: "demo-window-right", effectId: "wash" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#bfe7ff", color2: "#7dd3fc", intensity: 0.9 } },
    // Mega tree: red/green wave across strands.
    { trackId: "demo-mega-tree", effectId: "wave" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#ff4040", color2: "#22c55e", speed: 0.45 } },
    // Mini trees: steady green with a slow breathe.
    { trackId: "demo-mini-1", effectId: "wash" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#34d399", color2: "#a7f3d0", intensity: 0.85 } },
    { trackId: "demo-mini-2", effectId: "wash" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#34d399", color2: "#a7f3d0", intensity: 0.85 } },
    // Arches: blue↔white wave rolling through each.
    { trackId: "demo-arch-1", effectId: "wave" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#60a5fa", color2: "#e0f2fe", speed: 0.8 } },
    { trackId: "demo-arch-2", effectId: "wave" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#60a5fa", color2: "#e0f2fe", speed: 0.8 } },
    { trackId: "demo-arch-3", effectId: "wave" as const, start: 0, duration: LOOP_SECONDS, params: { ...base, color1: "#60a5fa", color2: "#e0f2fe", speed: 0.8 } },
  ].map((b, i) => ({ ...b, id: `demo-block-${i}` }));

  return {
    tracks: fixtures.map((f) => ({ id: f.id, kind: "fixture" as const })),
    blocks,
    bpm: 120,
    beatGridOffset: 0,
  };
}

export default function StageDevPage() {
  return (
    <Suspense fallback={null}>
      <StageDevHarness />
    </Suspense>
  );
}

function StageDevHarness() {
  if (process.env.NODE_ENV === "production") notFound();

  // ?photo=/dev/test-photos/whatever.jpg — lets scripts and manual tests load
  // a specific photo without the file picker.
  const searchParams = useSearchParams();
  const queryPhoto = searchParams.get("photo");
  const [pickedPhoto, setPickedPhoto] = useState<string | null>(null);
  const photoUrl = pickedPhoto ?? queryPhoto ?? "/dev/sample-house.jpg";
  const fileRef = useRef<HTMLInputElement>(null);

  const fixtures = useMemo(() => demoFixtures(), []);
  const groups = useMemo<FixtureGroup[]>(() => [], []);
  const sequence = useMemo(() => demoSequence(fixtures), [fixtures]);
  // Self-advancing clock; epoch is set lazily on the first frame read.
  const epochRef = useRef<number | null>(null);
  const getTime = useCallback(() => {
    if (epochRef.current === null) epochRef.current = performance.now();
    return ((performance.now() - epochRef.current) / 1000) % LOOP_SECONDS;
  }, []);

  return (
    <div className="flex h-screen flex-col" style={{ background: "#FFFFFF" }}>
      <div className="flex items-center justify-between border-b border-black/8 px-4 py-2">
        <div className="text-sm font-semibold" style={{ color: "var(--ink, #1a1c22)" }}>
          Night Stage — dev harness
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
            onClick={() => fileRef.current?.click()}
          >
            Try another photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPickedPhoto(URL.createObjectURL(f));
            }}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <NightStage
          photoUrl={photoUrl}
          projectId={null}
          fixtures={fixtures}
          groups={groups}
          sequence={sequence}
          getTime={getTime}
        />
      </div>
    </div>
  );
}
