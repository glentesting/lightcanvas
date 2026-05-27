"use client";

import type { Intensity } from "./useAIGeneration";

interface AIIntensitySliderProps {
  intensity: Intensity;
  setIntensity: (i: Intensity) => void;
}

const INTENSITIES: Intensity[] = ["subtle", "balanced", "wild"];

export default function AIIntensitySlider({
  intensity,
  setIntensity,
}: AIIntensitySliderProps) {
  return (
    <div className="mb-5">
      <label
        className="text-xs font-medium block mb-2"
        style={{ color: "var(--ink-3)" }}
      >
        Intensity
      </label>
      <div className="flex gap-1.5">
        {INTENSITIES.map((i) => (
          <button
            key={i}
            onClick={() => setIntensity(i)}
            className="h-7 px-3 rounded-md text-xs font-medium capitalize flex-1"
            style={{
              background:
                intensity === i
                  ? "var(--accent-50)"
                  : "var(--surface)",
              border:
                intensity === i
                  ? "1px solid var(--accent-200)"
                  : "1px solid var(--line)",
              color:
                intensity === i
                  ? "var(--accent-ink)"
                  : "var(--ink-2)",
            }}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}
