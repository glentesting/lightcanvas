import type { FixtureKind } from "@/lib/fixtures/types";

// Each prop kind has a default size (in SVG viewBox units out of 720x420)
export const PROP_DEFAULTS: Record<string, { w: number; h: number; cx: number; cy: number }> = {
  roofline:         { w: 380, h: 20, cx: 360, cy: 155 },
  "window-outline": { w: 44, h: 54, cx: 240, cy: 255 },
  bush:             { w: 56, h: 28, cx: 260, cy: 320 },
  "mega-tree":      { w: 64, h: 160, cx: 690, cy: 240 },
  "mini-tree":      { w: 36, h: 55, cx: 310, cy: 295 },
  arch:             { w: 80, h: 50, cx: 360, cy: 295 },
  matrix:           { w: 80, h: 50, cx: 500, cy: 240 },
};

// Category grouping for the props list
export const KIND_CATEGORIES: { label: string; kinds: FixtureKind[] }[] = [
  { label: "Rooflines", kinds: ["roofline"] },
  { label: "Windows", kinds: ["window-outline"] },
  { label: "Trees", kinds: ["mega-tree", "mini-tree"] },
  { label: "Landscape", kinds: ["bush", "arch"] },
  { label: "Other", kinds: ["matrix", "custom"] },
];

// Color dot per kind
export const KIND_COLORS: Record<string, string> = {
  roofline: "#f59e0b",
  "window-outline": "#3b82f6",
  "mega-tree": "#22c55e",
  "mini-tree": "#86efac",
  bush: "#a78bfa",
  arch: "#f97316",
  matrix: "#ec4899",
  custom: "#94a3b8",
};
