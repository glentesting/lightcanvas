import type { EffectId } from "./types";

export const EFFECT_COLORS: Record<EffectId, string> = {
  twinkle: "var(--fx-twinkle)",
  chase: "var(--fx-chase)",
  fade: "var(--fx-fade)",
  strobe: "var(--fx-strobe)",
  sparkle: "var(--fx-sparkle)",
  wave: "var(--fx-wave)",
  pulse: "var(--fx-pulse)",
  wash: "var(--fx-wash)",
  meteor: "var(--fx-meteor)",
  firework: "var(--fx-firework)",
};

export const EFFECT_NAMES: Record<EffectId, string> = {
  twinkle: "Twinkle",
  chase: "Chase",
  fade: "Fade",
  strobe: "Strobe",
  sparkle: "Sparkle",
  wave: "Wave",
  pulse: "Pulse",
  wash: "Color Wash",
  meteor: "Meteor",
  firework: "Fireworks",
};

export const DEFAULT_EFFECT_PARAMS = {
  color1: "#3b82f6",
  intensity: 0.8,
  speed: 1,
  easing: "linear" as const,
};
