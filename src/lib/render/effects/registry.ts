import { chase } from "./chase";
import { fade } from "./fade";
import { firework } from "./firework";
import { meteor } from "./meteor";
import { pulse } from "./pulse";
import { sparkle } from "./sparkle";
import { strobe } from "./strobe";
import { twinkle } from "./twinkle";
import { wash } from "./wash";
import { wave } from "./wave";

export const EFFECT_REGISTRY = {
  twinkle,
  chase,
  fade,
  strobe,
  sparkle,
  wave,
  pulse,
  wash,
  meteor,
  firework,
} as const;

export type EffectId = keyof typeof EFFECT_REGISTRY;
