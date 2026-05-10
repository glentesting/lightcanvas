export interface AIStyle {
  id: string;
  name: string;
  desc: string;
  promptHint: string;
}

export const AI_STYLES: AIStyle[] = [
  {
    id: "tso",
    name: "TSO Style",
    desc: "Dense, synchronized, lots of chases and color sweeps",
    promptHint:
      "Dense sequencing with rapid chase patterns on rooflines, synchronized color sweeps across all fixtures during choruses, fireworks on beat drops. High energy, lots of movement.",
  },
  {
    id: "calm",
    name: "Calm & Elegant",
    desc: "Slow washes, gentle fades, warm colors",
    promptHint:
      "Gentle, slow-moving effects. Warm white and gold fades on windows, slow color washes on roofline. Minimal strobing. Peaceful and elegant.",
  },
  {
    id: "edm",
    name: "High Energy EDM",
    desc: "Fast strobes, rapid color changes, beat-driven",
    promptHint:
      "Fast strobes on every beat, rapid color changes, chase effects synced to BPM. Heavy use of sparkle and strobe. Maximum energy.",
  },
  {
    id: "classic",
    name: "Classic Holiday",
    desc: "Traditional red/green/white, slower tempo",
    promptHint:
      "Traditional Christmas colors: red, green, white, gold. Slow fades and gentle twinkle. Classic holiday feel, not flashy.",
  },
  {
    id: "subtle",
    name: "Subtle & Tasteful",
    desc: "Light accents, mostly off, highlights on beat",
    promptHint:
      "Minimal effects. Most fixtures off most of the time. Brief accent effects on strong beats only. Subtle and understated.",
  },
];

export const REFINE_PROMPTS = [
  { label: "Make it more energetic", prompt: "Increase energy: add more chase and strobe effects, make transitions faster, add accent hits on more beats." },
  { label: "Use more red and green", prompt: "Shift the color palette toward traditional Christmas red (#ff0000, #cc0000) and green (#00ff00, #00cc00). Keep some white accents." },
  { label: "Add more to the chorus", prompt: "Add denser, more dramatic effects during the high-energy chorus sections. Layer multiple effects on different fixtures simultaneously." },
  { label: "Slow it down", prompt: "Reduce speed on all effects. Replace strobes with gentle fades and washes. Use longer block durations. Make it feel more relaxed." },
  { label: "Make the intro less busy", prompt: "Reduce the number of effects in the first 15 seconds. Start with subtle twinkle or fade, building gradually into the main sequence." },
];
