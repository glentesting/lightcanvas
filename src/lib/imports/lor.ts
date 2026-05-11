import type { Fixture } from "@/lib/fixtures/types";
import type { EffectBlock, EffectId } from "@/lib/timeline/types";
import type { ImportResult } from "./xsq";

/** LOR effect type → LightCanvas effect ID */
const LOR_EFFECT_MAP: Record<string, EffectId | null> = {
  intensity: "wash",
  fadeTo: "fade",
  shimmer: "strobe",
  twinkle: "twinkle",
};

/**
 * Parse a Light-O-Rama .lms XML string and extract fixtures + effect blocks.
 * Runs client-side using DOMParser.
 */
export function parseLms(xmlString: string): ImportResult {
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
  let unmappedCount = 0;

  // Group channels by RGBChannel attribute
  const channels = doc.querySelectorAll("channel");
  const rgbGroups = new Map<string, Element[]>();
  const singleChannels: Element[] = [];

  channels.forEach((ch) => {
    const rgbIdx = ch.getAttribute("RGBChannel");
    if (rgbIdx) {
      const group = rgbGroups.get(rgbIdx) || [];
      group.push(ch);
      rgbGroups.set(rgbIdx, group);
    } else {
      singleChannels.push(ch);
    }
  });

  // Process RGB groups as fixtures
  let groupIndex = 0;
  rgbGroups.forEach((group) => {
    groupIndex++;
    const redCh = group.find((ch) => ch.getAttribute("RGB") === "Red");
    const name = (redCh?.getAttribute("name") || `RGB Group ${groupIndex}`).replace(
      / Red$/,
      ""
    );

    const fixture: Fixture = {
      id: crypto.randomUUID(),
      kind: "custom",
      name,
      pixelCount: 1,
      startChannel: parseInt(redCh?.getAttribute("circuit") || "1", 10),
      universe: parseInt(redCh?.getAttribute("unit") || "1", 10),
    };
    fixtures.push(fixture);

    // Import effects from the red channel (representative)
    if (redCh) {
      const effects = redCh.querySelectorAll("effect");
      effects.forEach((eff) => {
        const type = eff.getAttribute("type") || "";
        const startCs = parseInt(eff.getAttribute("startCentisecond") || "0", 10);
        const endCs = parseInt(eff.getAttribute("endCentisecond") || "0", 10);
        const startIntensity = parseInt(eff.getAttribute("startIntensity") || "0", 10);
        const endIntensity = parseInt(
          eff.getAttribute("intensity") || eff.getAttribute("endIntensity") || "100",
          10
        );

        const effectId = LOR_EFFECT_MAP[type];
        if (effectId === null || effectId === undefined) {
          if (type) unmappedCount++;
          return;
        }

        // Skip "off" effects
        if (effectId === "wash" && endIntensity === 0 && startIntensity === 0) return;

        blocks.push({
          id: crypto.randomUUID(),
          trackId: fixture.id,
          effectId,
          start: startCs / 10,
          duration: (endCs - startCs) / 10,
          params: {
            color1: "#ffffff",
            intensity: Math.max(startIntensity, endIntensity) / 100,
            speed: 0.5,
            easing: "linear",
          },
        });
      });
    }
  });

  // Process single-color channels
  singleChannels.forEach((ch) => {
    const name = ch.getAttribute("name") || "Single Channel";
    const fixture: Fixture = {
      id: crypto.randomUUID(),
      kind: "custom",
      name,
      pixelCount: 1,
      startChannel: parseInt(ch.getAttribute("circuit") || "1", 10),
      universe: parseInt(ch.getAttribute("unit") || "1", 10),
    };
    fixtures.push(fixture);

    const effects = ch.querySelectorAll("effect");
    effects.forEach((eff) => {
      const type = eff.getAttribute("type") || "";
      const startCs = parseInt(eff.getAttribute("startCentisecond") || "0", 10);
      const endCs = parseInt(eff.getAttribute("endCentisecond") || "0", 10);

      const effectId = LOR_EFFECT_MAP[type];
      if (!effectId) {
        if (type) unmappedCount++;
        return;
      }

      blocks.push({
        id: crypto.randomUUID(),
        trackId: fixture.id,
        effectId,
        start: startCs / 10,
        duration: (endCs - startCs) / 10,
        params: { color1: "#ffffff", intensity: 1.0, speed: 0.5, easing: "linear" },
      });
    });
  });

  return {
    fixtures,
    blocks,
    warnings,
    stats: {
      fixtureCount: fixtures.length,
      blockCount: blocks.length,
      unmappedEffectCount: unmappedCount,
      timingTrackImported: false,
    },
  };
}
