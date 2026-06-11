import type { RGB } from "@/lib/render/effects/types";

/**
 * The scene layer contract. A SceneProvider turns a captured backdrop (today a
 * photo + AI depth map, later a Gaussian-splat scene) into a navigable night
 * stage that light points composite onto. Playback and authoring code only
 * talk to this interface — they must never care how the scene was built.
 */

/** Stage coordinate space — matches the layout editor's SVG overlay. */
export const STAGE_W = 720;
export const STAGE_H = 420;
export const STAGE_ASPECT = STAGE_W / STAGE_H;

/**
 * One renderable light point, in stage space (720×420, y-down — the same
 * space fixture.layout.points live in).
 */
export interface LightPoint {
  fixtureId: string;
  /** Index into the fixture's pixel array (matches renderFrame output order). */
  pixelIndex: number;
  x: number;
  y: number;
  /** Bulb radius hint in stage units. */
  size: number;
}

/** Per-frame light colors: fixtureId → one RGB per pixel (renderFrame output). */
export type LightFrame = Map<string, RGB[]>;

export interface SceneProvider {
  /** Attach to a container and start rendering. Container is letterboxed 12:7 by the caller. */
  mount(container: HTMLElement): Promise<void>;
  /** Replace the set of light points (call on fixture layout changes, not per frame). */
  setLightPoints(points: LightPoint[]): void;
  /** Push this frame's light colors (call per frame, cheap). */
  setLightFrame(frame: LightFrame): void;
  /** Pointer position in [-1, 1] for the lean-and-slide rig. active=false → idle drift. */
  setPointer(nx: number, ny: number, active: boolean): void;
  /** Called every animation frame before render — push light colors here. */
  setOnFrame(cb: ((elapsedSeconds: number) => void) | null): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

/**
 * A monocular depth map over the cover-cropped stage image.
 * Values are normalized 0..1 with 1 = nearest to camera.
 */
export interface DepthMap {
  width: number;
  height: number;
  data: Float32Array;
}

/** Sample a DepthMap at normalized (u, v), v measured top-down. Clamped. */
export function sampleDepth(depth: DepthMap, u: number, v: number): number {
  const x = Math.min(depth.width - 1, Math.max(0, Math.round(u * (depth.width - 1))));
  const y = Math.min(depth.height - 1, Math.max(0, Math.round(v * (depth.height - 1))));
  return depth.data[y * depth.width + x];
}
