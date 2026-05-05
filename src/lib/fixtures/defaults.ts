import type { Fixture } from "./types";

/**
 * Default fixture set for new projects — the "Wizards in Winter" starter pack.
 * 6 fixtures, 988 total pixels. Each has pre-placed layout coordinates
 * in the SVG viewBox space (720×420) matching the default house illustration.
 */
export function createDefaultFixtures(): Fixture[] {
  return [
    {
      id: crypto.randomUUID(),
      kind: "roofline",
      name: "Roofline strip",
      pixelCount: 220,
      startChannel: 1,
      layout: { points: [{ x: 360, y: 155 }], closed: false },
    },
    {
      id: crypto.randomUUID(),
      kind: "window-outline",
      name: "Window outlines",
      pixelCount: 128,
      startChannel: 661,
      layout: { points: [{ x: 240, y: 255 }], closed: false },
    },
    {
      id: crypto.randomUUID(),
      kind: "bush",
      name: "Bush wraps",
      pixelCount: 180,
      startChannel: 1045,
      layout: { points: [{ x: 260, y: 320 }], closed: false },
    },
    {
      id: crypto.randomUUID(),
      kind: "mega-tree",
      name: "Mega tree",
      pixelCount: 480,
      startChannel: 1585,
      layout: { points: [{ x: 690, y: 240 }], closed: false },
    },
    {
      id: crypto.randomUUID(),
      kind: "mini-tree",
      name: "Mini trees",
      pixelCount: 100,
      startChannel: 3025,
      layout: { points: [{ x: 310, y: 295 }], closed: false },
    },
    {
      id: crypto.randomUUID(),
      kind: "arch",
      name: "Arches",
      pixelCount: 150,
      startChannel: 3325,
      layout: { points: [{ x: 360, y: 295 }], closed: false },
    },
  ];
}
