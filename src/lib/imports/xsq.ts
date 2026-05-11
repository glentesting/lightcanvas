import type { Fixture } from "@/lib/fixtures/types";
import type { EffectBlock, EffectId } from "@/lib/timeline/types";

export interface ImportResult {
  fixtures: Fixture[];
  blocks: EffectBlock[];
  beatGrid?: number[];
  warnings: string[];
  stats: {
    fixtureCount: number;
    blockCount: number;
    unmappedEffectCount: number;
    timingTrackImported: boolean;
  };
}

/** xLights effect name → LightCanvas effect ID */
const XL_EFFECT_MAP: Record<string, EffectId> = {
  Twinkle: "twinkle",
  Chase: "chase",
  Fade: "fade",
  Strobe: "strobe",
  Shimmer: "sparkle",
  "Color Wash": "wash",
  Pulse: "pulse",
  Meteor: "meteor",
  Fireworks: "firework",
  On: "wash", // "On" is just solid color
};

/**
 * Parse an xLights .xsq XML string and extract fixtures + effect blocks.
 * Runs client-side using DOMParser.
 */
export function parseXsq(xmlString: string): ImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    return {
      fixtures: [],
      blocks: [],
      warnings: ["Failed to parse XML: " + (parserError.textContent ?? "unknown error")],
      stats: { fixtureCount: 0, blockCount: 0, unmappedEffectCount: 0, timingTrackImported: false },
    };
  }

  const warnings: string[] = [];
  const fixtures: Fixture[] = [];
  const blocks: EffectBlock[] = [];
  let beatGrid: number[] | undefined;
  let unmappedCount = 0;

  // Extract DisplayElements — each Element with type="model" becomes a fixture
  const displayElements = doc.querySelectorAll("DisplayElements > Element[type='model']");
  displayElements.forEach((el, i) => {
    const name = el.getAttribute("name") || `Model ${i + 1}`;
    fixtures.push({
      id: crypto.randomUUID(),
      kind: "custom",
      name,
      pixelCount: 100,
      startChannel: 1 + i * 300,
    });
  });

  // Extract ElementEffects
  const effectElements = doc.querySelectorAll("ElementEffects > Element[type='model']");
  effectElements.forEach((el) => {
    const modelName = el.getAttribute("name") || "";
    const fixture = fixtures.find((f) => f.name === modelName);
    if (!fixture) {
      warnings.push(`Model "${modelName}" in effects not found in display elements`);
      return;
    }

    const effects = el.querySelectorAll("EffectLayer > Effect");
    effects.forEach((eff) => {
      const xlName = eff.getAttribute("name") || "";
      const startMs = parseInt(eff.getAttribute("startTime") || "0", 10);
      const endMs = parseInt(eff.getAttribute("endTime") || "0", 10);
      const settings = eff.getAttribute("settings") || "";
      const palette = eff.getAttribute("palette") || "";

      const effectId = XL_EFFECT_MAP[xlName];
      if (!effectId) {
        unmappedCount++;
        // Create a placeholder wash block
        blocks.push({
          id: crypto.randomUUID(),
          trackId: fixture.id,
          effectId: "wash",
          start: startMs / 1000,
          duration: (endMs - startMs) / 1000,
          params: {
            color1: "#888888",
            intensity: 0.5,
            speed: 0.5,
            easing: "linear",
          },
          presetName: `[Unmapped: ${xlName}]`,
        });
        return;
      }

      // Extract color from palette
      let color1 = "#ff0000";
      const paletteMatch = palette.match(/C_BUTTON_Palette1=#([0-9a-fA-F]{6})/);
      if (paletteMatch) color1 = `#${paletteMatch[1]}`;

      // Extract intensity from settings
      let intensity = 1.0;
      const brightnessMatch = settings.match(/B_SLIDER_Brightness=(\d+)/);
      if (brightnessMatch) intensity = parseInt(brightnessMatch[1], 10) / 100;

      blocks.push({
        id: crypto.randomUUID(),
        trackId: fixture.id,
        effectId,
        start: startMs / 1000,
        duration: (endMs - startMs) / 1000,
        params: {
          color1,
          intensity,
          speed: 0.5,
          easing: "linear",
        },
      });
    });
  });

  // Extract timing tracks (beat grid)
  const timingElements = doc.querySelectorAll(
    "TimingTracks > Element[type='timing'] EffectLayer > Effect"
  );
  if (timingElements.length > 0) {
    beatGrid = [];
    timingElements.forEach((eff) => {
      const startMs = parseInt(eff.getAttribute("startTime") || "0", 10);
      beatGrid!.push(startMs / 1000);
    });
  }

  return {
    fixtures,
    blocks,
    beatGrid,
    warnings,
    stats: {
      fixtureCount: fixtures.length,
      blockCount: blocks.length,
      unmappedEffectCount: unmappedCount,
      timingTrackImported: !!beatGrid,
    },
  };
}
