/**
 * Light-O-Rama (.lms) sequence exporter.
 *
 * Generates LOR XML from a LightCanvas project. Each fixture becomes three
 * linked RGB channels (Red, Green, Blue). Effect blocks are translated to
 * LOR-native effect elements with timing in centiseconds.
 */

import type { Project } from "@/types/domain";
import type { EffectBlock, EffectId } from "@/lib/timeline/types";
import { escXml, createZip } from "./zip";

/**
 * Sanitize a string for use as a ZIP entry filename.
 * Strips path separators, forbidden chars, null bytes, and "..", truncates to 100 chars.
 */
function sanitizeZipName(s: string): string {
  return s
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\x00/g, "")
    .replace(/\.\./g, "__")
    .slice(0, 100);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LorMapping = Record<string, { unit: number; circuit: number }>;

interface DegradedEffect {
  blockId: string;
  effectId: string;
  fixtureName: string;
  approximation: string;
}

// ---------------------------------------------------------------------------
// Effect approximation descriptions
// ---------------------------------------------------------------------------

const EFFECT_APPROXIMATIONS: Partial<Record<EffectId, string>> = {
  chase: "Rendered as solid intensity (chase motion not supported in LOR)",
  sparkle: "Rendered as twinkle (sparkle maps to LOR twinkle)",
  wave: "Rendered as triangle fade up/down",
  meteor: "Rendered as fast fade-out ramp",
  firework: "Rendered as burst (20% rise, 80% fade)",
  pulse: "Rendered as alternating fade segments",
};

/** Effects that export natively (no approximation needed). */
const NATIVE_EFFECTS: Set<EffectId> = new Set([
  "twinkle",
  "strobe",
  "fade",
  "wash",
]);

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns a list of effect blocks that will be approximated during LOR export.
 */
export function getLorDegradedEffects(project: Project): DegradedEffect[] {
  const result: DegradedEffect[] = [];

  for (const block of project.sequence.blocks) {
    const eid = block.effectId as EffectId;
    if (NATIVE_EFFECTS.has(eid)) continue;
    const approx = EFFECT_APPROXIMATIONS[eid];
    if (!approx) continue;

    const fixture = project.fixtures.find((f) => f.id === block.trackId);
    result.push({
      blockId: block.id,
      effectId: block.effectId,
      fixtureName: fixture?.name ?? "Unknown",
      approximation: approx,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function channelIntensity(channelValue: number, blockIntensity: number): number {
  return Math.min(100, Math.max(0, Math.round((channelValue / 255) * blockIntensity * 100)));
}

// ---------------------------------------------------------------------------
// Effect → LOR XML elements
// ---------------------------------------------------------------------------

function msToCs(ms: number): number {
  return Math.round(ms / 10);
}

function effectElements(
  block: EffectBlock,
  intensity: number
): string[] {
  const startCs = Math.round(block.start * 100);
  const endCs = startCs + Math.max(1, Math.round(block.duration * 100));
  const lines: string[] = [];

  if (intensity === 0) return lines;

  switch (block.effectId as EffectId) {
    case "twinkle":
    case "sparkle":
      lines.push(
        `      <effect type="twinkle" startCentisecond="${startCs}" endCentisecond="${endCs}" startIntensity="${intensity}" endIntensity="${intensity}"/>`
      );
      break;

    case "strobe":
      lines.push(
        `      <effect type="shimmer" startCentisecond="${startCs}" endCentisecond="${endCs}" startIntensity="${intensity}" endIntensity="${intensity}"/>`
      );
      break;

    case "fade":
      lines.push(
        `      <effect type="intensity" startCentisecond="${startCs}" endCentisecond="${endCs}" startIntensity="0" endIntensity="${intensity}"/>`
      );
      break;

    case "wash":
      lines.push(
        `      <effect type="intensity" startCentisecond="${startCs}" endCentisecond="${endCs}" startIntensity="${intensity}" endIntensity="${intensity}"/>`
      );
      break;

    case "pulse": {
      // Alternating fade up/down segments
      const segCount = Math.max(2, Math.round(block.duration * block.params.speed * 2));
      const segDuration = (endCs - startCs) / segCount;
      for (let i = 0; i < segCount; i++) {
        const segStart = Math.round(startCs + i * segDuration);
        const segEnd = Math.round(startCs + (i + 1) * segDuration);
        if (i % 2 === 0) {
          lines.push(
            `      <effect type="intensity" startCentisecond="${segStart}" endCentisecond="${segEnd}" startIntensity="0" endIntensity="${intensity}"/>`
          );
        } else {
          lines.push(
            `      <effect type="intensity" startCentisecond="${segStart}" endCentisecond="${segEnd}" startIntensity="${intensity}" endIntensity="0"/>`
          );
        }
      }
      break;
    }

    case "chase":
      // Simplified: full intensity for block duration
      lines.push(
        `      <effect type="intensity" startCentisecond="${startCs}" endCentisecond="${endCs}" startIntensity="${intensity}" endIntensity="${intensity}"/>`
      );
      break;

    case "wave": {
      // Triangle wave: fade up then fade down
      const midCs = Math.round((startCs + endCs) / 2);
      lines.push(
        `      <effect type="intensity" startCentisecond="${startCs}" endCentisecond="${midCs}" startIntensity="0" endIntensity="${intensity}"/>`
      );
      lines.push(
        `      <effect type="intensity" startCentisecond="${midCs}" endCentisecond="${endCs}" startIntensity="${intensity}" endIntensity="0"/>`
      );
      break;
    }

    case "meteor":
      // Fast fade out
      lines.push(
        `      <effect type="intensity" startCentisecond="${startCs}" endCentisecond="${endCs}" startIntensity="${intensity}" endIntensity="0"/>`
      );
      break;

    case "firework": {
      // 20% rise, 80% fade
      const riseEnd = Math.round(startCs + (endCs - startCs) * 0.2);
      lines.push(
        `      <effect type="intensity" startCentisecond="${startCs}" endCentisecond="${riseEnd}" startIntensity="0" endIntensity="${intensity}"/>`
      );
      lines.push(
        `      <effect type="intensity" startCentisecond="${riseEnd}" endCentisecond="${endCs}" startIntensity="${intensity}" endIntensity="0"/>`
      );
      break;
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Export a project as a Light-O-Rama .lms XML sequence file.
 */
export function exportLor(
  project: Project,
  lorMap: LorMapping,
  options?: { frameTimeMs?: number }
): Blob {
  const frameRate = options?.frameTimeMs ?? 50;
  const durationMs = getDurationMs(project);
  const totalCentiseconds = msToCs(durationMs);
  const lines: string[] = [];

  const audioBasename = project.audioFile?.split("/").pop() ?? "audio.mp3";
  lines.push(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>`);
  lines.push(
    `<sequence dacInMilliseconds="${frameRate}" songTitle="${escXml(project.name)}" comment="Created by LightCanvas" totalCentiseconds="${totalCentiseconds}" audioFilename="${escXml(audioBasename)}">`
  );
  lines.push(`  <channels>`);

  let savedIndex = 0;
  let groupIdx = 0;

  for (const fixture of project.fixtures) {
    const mapping = lorMap[fixture.id] ?? { unit: fixture.universe ?? 1, circuit: fixture.startChannel ?? 1 };
    const unit = mapping.unit;
    const circuit = mapping.circuit;
    const centiseconds = Math.round(frameRate / 10);

    // Get blocks for this fixture
    const blocks = project.sequence.blocks
      .filter((b) => b.trackId === fixture.id)
      .sort((a, b) => a.start - b.start);

    // RGB channel definitions
    const channels: Array<{
      color: number;
      suffix: string;
      rgb: string;
      circuitOffset: number;
      getIntensity: (block: EffectBlock) => number;
    }> = [
      {
        color: 16711680,
        suffix: "Red",
        rgb: "Red",
        circuitOffset: 0,
        getIntensity: (block) => {
          const { r } = hexToRgb(block.params.color1);
          return channelIntensity(r, block.params.intensity);
        },
      },
      {
        color: 65280,
        suffix: "Green",
        rgb: "Green",
        circuitOffset: 1,
        getIntensity: (block) => {
          const { g } = hexToRgb(block.params.color1);
          return channelIntensity(g, block.params.intensity);
        },
      },
      {
        color: 255,
        suffix: "Blue",
        rgb: "Blue",
        circuitOffset: 2,
        getIntensity: (block) => {
          const { b } = hexToRgb(block.params.color1);
          return channelIntensity(b, block.params.intensity);
        },
      },
    ];

    for (const ch of channels) {
      lines.push(
        `    <channel color="${ch.color}" centiseconds="${centiseconds}" deviceType="LOR" unit="${unit}" circuit="${circuit + ch.circuitOffset}" name="${escXml(fixture.name)} ${ch.suffix}" savedIndex="${savedIndex}" RGB="${ch.rgb}" RGBChannel="${groupIdx}">`
      );

      for (const block of blocks) {
        const intensity = ch.getIntensity(block);
        const effects = effectElements(block, intensity);
        for (const eff of effects) {
          lines.push(eff);
        }
      }

      lines.push(`    </channel>`);
      savedIndex++;
    }

    groupIdx++;
  }

  lines.push(`  </channels>`);
  lines.push(`</sequence>`);

  const xml = lines.join("\n");
  return new Blob([xml], { type: "application/xml" });
}

// ---------------------------------------------------------------------------
// Duration helper
// ---------------------------------------------------------------------------

function getDurationMs(project: Project): number {
  const lastBlockEndMs = Math.max(
    0,
    ...project.sequence.blocks.map((b) => Math.round((b.start + b.duration) * 1000))
  );
  if (project.audio?.duration) {
    const audioDurationMs = Math.round(project.audio.duration * 1000);
    return Math.max(audioDurationMs, lastBlockEndMs);
  }
  return lastBlockEndMs || 60000;
}

// ---------------------------------------------------------------------------
// README
// ---------------------------------------------------------------------------

/**
 * Generate README.txt content for the LOR export ZIP.
 */
export function generateLorReadme(
  projectName: string,
  audioFilename: string
): string {
  return `LightCanvas Export \u2014 Light-O-Rama
===================================

Files in this ZIP:
  ${projectName}.lms     Your LOR sequence file
  ${audioFilename}       Your audio file

Steps:
1. Open Light-O-Rama Sequence Editor
2. File > Open > select ${projectName}.lms
3. Verify your channel assignments match your LOR controller setup
   (Edit > Channel Properties if anything needs adjusting)
4. Hit Play to preview \u2014 or use the LOR Control Panel to run your show
5. If channels don\u2019t line up, check Edit > Channel Properties and
   match the Unit/Circuit numbers to your LOR Network Configuration

Need help? Visit: forums.lightorama.com
`;
}

// ---------------------------------------------------------------------------
// ZIP package
// ---------------------------------------------------------------------------

/**
 * Export a complete LOR ZIP package containing:
 * - [project.name].lms
 * - [audioFilename] (the audio blob)
 * - README.txt
 */
export async function exportLorZip(
  project: Project,
  lorMap: LorMapping,
  frameTimeMs: number,
  audioBlob: Blob,
  audioFilename: string
): Promise<Blob> {
  const encoder = new TextEncoder();

  // Generate LMS
  const lmsBlob = exportLor(project, lorMap, { frameTimeMs });
  const lmsData = new Uint8Array(await lmsBlob.arrayBuffer());

  // Generate README
  const projectName = project.name || "project";
  const readmeText = generateLorReadme(projectName, audioFilename);
  const readmeData = encoder.encode(readmeText);

  // Audio data
  const audioData = new Uint8Array(await audioBlob.arrayBuffer());

  const safeProjectName = sanitizeZipName(projectName);
  const safeAudioFilename = sanitizeZipName(audioFilename);

  const files = [
    { name: `${safeProjectName}.lms`, data: lmsData },
    { name: safeAudioFilename, data: audioData },
    { name: "README.txt", data: readmeData },
  ];

  return createZip(files);
}
