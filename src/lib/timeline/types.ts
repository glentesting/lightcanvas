export type EffectId =
  | "twinkle"
  | "chase"
  | "fade"
  | "strobe"
  | "sparkle"
  | "wave"
  | "pulse"
  | "wash"
  | "meteor"
  | "firework";

export type Easing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface EffectParams {
  color1: string;
  color2?: string;
  intensity: number;
  speed: number;
  easing: Easing;
  density?: number;
  direction?: "forward" | "backward" | "center-out" | "in";
  trailLength?: number;
  burstCount?: number;
}

export interface EffectBlock {
  id: string;
  trackId: string;
  effectId: EffectId;
  start: number;
  duration: number;
  params: EffectParams;
  locked?: boolean;
}

export interface Track {
  id: string;
  kind: "fixture" | "group";
  collapsed?: boolean;
  height?: number;
}

export interface Sequence {
  tracks: Track[];
  blocks: EffectBlock[];
  bpm: number;
  beatGridOffset: number;
  xlightsNameMap?: Record<string, string>;
  lorMapping?: Record<string, { unit: number; circuit: number }>;
}
