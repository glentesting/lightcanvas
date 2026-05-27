"use client";

import type { Vibe } from "./useAIGeneration";

interface AIVibeSelectorProps {
  vibe: Vibe;
  setVibe: (v: Vibe) => void;
}

const VIBES: Vibe[] = ["classic", "jazz", "edm", "cinematic", "whimsical"];

export default function AIVibeSelector({ vibe, setVibe }: AIVibeSelectorProps) {
  return (
    <div className="mb-4">
      <label
        className="text-xs font-medium block mb-2"
        style={{ color: "var(--ink-3)" }}
      >
        Color Palette
      </label>
      <div className="flex flex-wrap gap-1.5">
        {VIBES.map((v) => (
          <button
            key={v}
            onClick={() => setVibe(v)}
            className="h-7 px-3 rounded-md text-xs font-medium capitalize"
            style={{
              background:
                vibe === v ? "var(--accent-50)" : "var(--surface)",
              border:
                vibe === v
                  ? "1px solid var(--accent-200)"
                  : "1px solid var(--line)",
              color:
                vibe === v ? "var(--accent-ink)" : "var(--ink-2)",
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
