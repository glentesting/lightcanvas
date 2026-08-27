import type { Fixture, FixtureGroup } from "@/lib/fixtures/types";
import type { Sequence } from "@/lib/timeline/types";

export const VISUALIZER_LOOP_SECONDS = 24;

export function visualizerDemoFixtures(): Fixture[] {
  return [
    {
      id: "demo-roofline",
      kind: "roofline",
      name: "Roofline",
      pixelCount: 220,
      startChannel: 1,
      layout: {
        points: [
          { x: 170, y: 153 },
          { x: 197, y: 125 },
          { x: 240, y: 125 },
          { x: 287, y: 158 },
          { x: 340, y: 131 },
          { x: 372, y: 152 },
          { x: 425, y: 151 },
          { x: 508, y: 197 },
          { x: 380, y: 195 },
        ],
      },
    },
    {
      id: "demo-window-left",
      kind: "window-outline",
      name: "Upstairs window",
      pixelCount: 40,
      startChannel: 661,
      layout: { points: [{ x: 200, y: 180 }] },
    },
    {
      id: "demo-window-right",
      kind: "window-outline",
      name: "Front window",
      pixelCount: 40,
      startChannel: 781,
      layout: { points: [{ x: 458, y: 214 }] },
    },
    {
      id: "demo-mega-tree",
      kind: "mega-tree",
      name: "Mega tree",
      pixelCount: 360,
      startChannel: 901,
      geometry: { strandCount: 12 },
      layout: { points: [{ x: 520, y: 300 }] },
    },
    {
      id: "demo-mini-1",
      kind: "mini-tree",
      name: "Mini tree 1",
      pixelCount: 50,
      startChannel: 1981,
      layout: { points: [{ x: 105, y: 285 }] },
    },
    {
      id: "demo-mini-2",
      kind: "mini-tree",
      name: "Mini tree 2",
      pixelCount: 50,
      startChannel: 2131,
      layout: { points: [{ x: 275, y: 300 }] },
    },
    ...[310, 395, 480].map(
      (x, index): Fixture => ({
        id: `demo-arch-${index + 1}`,
        kind: "arch",
        name: `Arch ${index + 1}`,
        pixelCount: 35,
        startChannel: 2281 + index * 105,
        layout: { points: [{ x, y: index === 1 ? 336 : 332 + index }] },
      })
    ),
  ];
}

export function visualizerDemoGroups(): FixtureGroup[] {
  return [];
}

export function visualizerDemoSequence(fixtures: Fixture[]): Sequence {
  const base = { intensity: 1, speed: 1, easing: "linear" as const };
  const blocks = [
    {
      trackId: "demo-roofline",
      effectId: "twinkle" as const,
      params: { ...base, color1: "#ffd3a0", density: 0.9, speed: 0.35 },
    },
    {
      trackId: "demo-window-left",
      effectId: "wash" as const,
      params: { ...base, color1: "#b8ddff", color2: "#72c7ff", intensity: 0.82 },
    },
    {
      trackId: "demo-window-right",
      effectId: "wash" as const,
      params: { ...base, color1: "#b8ddff", color2: "#72c7ff", intensity: 0.82 },
    },
    {
      trackId: "demo-mega-tree",
      effectId: "wave" as const,
      params: { ...base, color1: "#ff3232", color2: "#21c55d", speed: 0.42 },
    },
    {
      trackId: "demo-mini-1",
      effectId: "wash" as const,
      params: { ...base, color1: "#2fd18c", color2: "#a7f3d0", intensity: 0.72 },
    },
    {
      trackId: "demo-mini-2",
      effectId: "wash" as const,
      params: { ...base, color1: "#2fd18c", color2: "#a7f3d0", intensity: 0.72 },
    },
    ...[1, 2, 3].map((index) => ({
      trackId: `demo-arch-${index}`,
      effectId: "wave" as const,
      params: {
        ...base,
        color1: "#4f8fff",
        color2: "#e2f2ff",
        speed: 0.72,
      },
    })),
  ].map((block, index) => ({
    ...block,
    id: `visualizer-v2-block-${index}`,
    start: 0,
    duration: VISUALIZER_LOOP_SECONDS,
  }));

  return {
    tracks: fixtures.map((fixture) => ({ id: fixture.id, kind: "fixture" as const })),
    blocks,
    bpm: 120,
    beatGridOffset: 0,
  };
}
