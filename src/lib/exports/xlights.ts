import type { Project } from "@/types/domain";
import type { FixtureKind } from "@/lib/fixtures/types";
import type { EffectBlock, EffectId } from "@/lib/timeline/types";
import { escXml, createZip } from "./zip";

/**
 * xLights effect-name mapping: LightCanvas → xLights 2024
 */
const XLIGHTS_EFFECT_NAME: Record<EffectId, string> = {
  twinkle: "Twinkle",
  chase: "Chase",
  fade: "Fade",
  strobe: "Strobe",
  sparkle: "Shimmer",
  wave: "Color Wash",
  pulse: "Pulse",
  wash: "Color Wash",
  meteor: "Meteor",
  firework: "Fireworks",
};

/**
 * Fixture kind → xLights DisplayAs model type
 */
const DISPLAY_AS_MAP: Record<FixtureKind, string> = {
  roofline: "Single Line",
  arch: "Arch",
  bush: "Single Line",
  "mini-tree": "Single Line",
  "mega-tree": "Tree 360",
  "window-outline": "Single Line",
  matrix: "Matrix",
  custom: "Single Line",
};

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

/**
 * Convert a hex color "#rrggbb" to xLights palette format "rrggbb".
 * Returns "000000" (black) if input is not a valid 6-digit hex color.
 */
function hexToXl(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "000000";
  return hex.replace("#", "");
}

/**
 * Build the xLights `settings` attribute for a given effect block.
 * These map to the E_* and T_* keys that xLights parses in Effect.cpp.
 */
function settingsFor(block: EffectBlock): string {
  const p = block.params;
  const pairs: string[] = [];

  switch (block.effectId) {
    case "fade":
      // "Fade" effect with ramp up/down
      pairs.push(`E_TEXTCTRL_Eff_On_Start=0`);
      pairs.push(`E_TEXTCTRL_Eff_On_End=255`);
      break;
    case "chase":
      pairs.push(`E_CHECKBOX_Chase_Group_All=0`);
      pairs.push(`E_SLIDER_Chase_Speed=${Math.round(p.speed * 10)}`);
      pairs.push(
        `E_CHOICE_Chase_Type1=${p.direction === "backward" ? "Left-Right" : "Right-Left"}`
      );
      break;
    case "twinkle":
      pairs.push(
        `E_SLIDER_Twinkle_Count=${Math.round((p.density ?? 0.5) * 100)}`
      );
      pairs.push(
        `E_SLIDER_Twinkle_Steps=${Math.max(1, Math.round(p.speed * 5))}`
      );
      break;
    case "strobe":
      pairs.push(
        `E_SLIDER_Number_Strobes=${Math.max(1, Math.round(p.speed * 20))}`
      );
      break;
    case "sparkle":
      pairs.push(
        `E_SLIDER_Sparkle_Count=${Math.round((p.density ?? 0.5) * 200)}`
      );
      break;
    case "wave":
      pairs.push(`E_SLIDER_Plasma_Speed=${Math.round(p.speed * 10)}`);
      break;
    case "pulse":
      pairs.push(
        `E_TEXTCTRL_Pulse_Period=${Math.max(1, Math.round(10 / p.speed))}`
      );
      break;
    case "wash":
      pairs.push(`E_TEXTCTRL_Eff_On_Start=255`);
      pairs.push(`E_TEXTCTRL_Eff_On_End=255`);
      break;
    case "meteor":
      pairs.push(
        `E_SLIDER_Meteors_Count=${Math.max(1, Math.round(p.speed * 5))}`
      );
      pairs.push(
        `E_SLIDER_Meteors_Length=${p.trailLength ?? 10}`
      );
      pairs.push(`E_CHOICE_Meteors_Effect=Down`);
      break;
    case "firework":
      pairs.push(
        `E_SLIDER_Fireworks_Explosions=${p.burstCount ?? 5}`
      );
      pairs.push(`E_SLIDER_Fireworks_Count=50`);
      pairs.push(`E_SLIDER_Fireworks_Velocity=5`);
      break;
  }

  // Intensity maps to brightness
  pairs.push(`B_SLIDER_Brightness=${Math.round(p.intensity * 100)}`);

  return pairs.join(",");
}

/**
 * Build the xLights `palette` attribute for a block.
 */
function paletteFor(block: EffectBlock): string {
  const p = block.params;
  const parts: string[] = [];
  const color1 = p.color1 ?? "#000000";
  const color2 = p.color2 ?? null;
  parts.push(`C_BUTTON_Palette1=#${hexToXl(color1)}`);
  if (color2) {
    parts.push(`C_BUTTON_Palette2=#${hexToXl(color2)}`);
  }
  parts.push(`C_CHECKBOX_Palette1=1`);
  if (color2) {
    parts.push(`C_CHECKBOX_Palette2=1`);
  }
  return parts.join(",");
}

// escXml imported from ./zip

/** Supported step times in milliseconds */
export type FrameTimeMs = 20 | 25 | 40 | 50;

/**
 * Export a project as an xLights .xsq XML sequence file.
 * Targets xLights 2024 format.
 *
 * @param nameMap - maps fixture IDs to xLights model names
 * @param options.frameTimeMs - step time: 20ms (50fps), 25ms (40fps), 40ms (25fps), 50ms (20fps)
 */
export function exportXlights(
  project: Project,
  nameMap: Record<string, string> = {},
  options: { frameTimeMs?: FrameTimeMs } = {}
): Blob {
  const frameTime = options.frameTimeMs ?? 50; // default 50ms (20fps)
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<xsequence BaseChannel="0" ChanCtrlBasic="0" ChanCtrlColor="0" FixedPointTiming="1" ModelBlending="true">`
  );

  // Head
  lines.push(`  <head>`);
  lines.push(`    <author>LightCanvas</author>`);
  lines.push(`    <version>2024.18</version>`);
  const audioBasename = project.audioFile?.split("/").pop() ?? "audio.mp3";
  lines.push(
    `    <songFilename>${escXml(audioBasename)}</songFilename>`
  );
  lines.push(`    <sequenceTiming>${frameTime} ms</sequenceTiming>`);
  lines.push(`    <sequenceType>Media</sequenceType>`);
  lines.push(`    <sequenceDuration>${getDurationMs(project)}</sequenceDuration>`);
  lines.push(`  </head>`);

  // DisplayElements — one per fixture
  lines.push(`  <DisplayElements>`);
  for (const fixture of project.fixtures) {
    const displayName = nameMap[fixture.id] || fixture.name;
    lines.push(
      `    <Element collapsed="0" type="model" name="${escXml(displayName)}" visible="1"/>`
    );
  }
  // Timing track element
  lines.push(
    `    <Element collapsed="0" type="timing" name="Beats" visible="1"/>`
  );
  lines.push(`  </DisplayElements>`);

  // ElementEffects — effect blocks per fixture
  lines.push(`  <ElementEffects>`);
  for (const fixture of project.fixtures) {
    const displayName = nameMap[fixture.id] || fixture.name;
    lines.push(
      `    <Element type="model" name="${escXml(displayName)}">`
    );
    lines.push(`      <EffectLayer>`);
    const blocks = project.sequence.blocks.filter(
      (b) => b.trackId === fixture.id
    );
    blocks.sort((a, b) => a.start - b.start);
    blocks.forEach((block, i) => {
      const effectName =
        XLIGHTS_EFFECT_NAME[block.effectId as EffectId] || "On";
      const startMs = Math.round(block.start * 1000);
      const endMs = startMs + Math.max(1, Math.round(block.duration * 1000));
      lines.push(
        `        <Effect ref="${i}" name="${escXml(effectName)}" startTime="${startMs}" endTime="${endMs}" settings="${escXml(settingsFor(block))}" palette="${escXml(paletteFor(block))}"/>`
      );
    });
    lines.push(`      </EffectLayer>`);
    lines.push(`    </Element>`);
  }
  lines.push(`  </ElementEffects>`);

  // TimingTracks — beats
  lines.push(`  <TimingTracks>`);
  if (project.audio?.beats && project.audio.beats.length > 0) {
    lines.push(`    <Element type="timing" name="Beats">`);
    lines.push(`      <EffectLayer>`);
    const beats = project.audio.beats;
    beats.forEach((beat, i) => {
      const beatMs = Math.round(beat * 1000);
      const nextBeatMs = i + 1 < beats.length ? Math.round(beats[i + 1] * 1000) : beatMs + 500;
      lines.push(
        `        <Effect label="" startTime="${beatMs}" endTime="${nextBeatMs}"/>`
      );
    });
    lines.push(`      </EffectLayer>`);
    lines.push(`    </Element>`);
  }
  lines.push(`  </TimingTracks>`);

  lines.push(`  <nextid>1</nextid>`);
  lines.push(`</xsequence>`);

  const xml = lines.join("\n");
  return new Blob([xml], { type: "application/xml" });
}

function getDurationMs(project: Project): string {
  const lastBlockEndMs = Math.max(
    0,
    ...project.sequence.blocks.map((b) => Math.round((b.start + b.duration) * 1000))
  );
  if (project.audio?.duration) {
    const audioDurationMs = Math.round(project.audio.duration * 1000);
    return Math.max(audioDurationMs, lastBlockEndMs).toString();
  }
  return (lastBlockEndMs || 60000).toString();
}

/**
 * Generate xlights_rgbeffects.xml with model definitions.
 */
export function exportRgbEffects(
  project: Project,
  nameMap: Record<string, string> = {}
): Blob {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<!-- Generated by LightCanvas. Controller assignments need to be set in xLights Setup tab. -->`);
  lines.push(`<xlights_rgbeffects>`);
  lines.push(`  <models>`);

  for (const fixture of project.fixtures) {
    const modelName = nameMap[fixture.id] || fixture.name;
    const displayAs = DISPLAY_AS_MAP[fixture.kind] || "Single Line";
    const pixelCount = fixture.pixelCount;
    const startChannel = fixture.startChannel || 1;
    const universe = fixture.universe || 1;
    const dir = fixture.direction === "rtl" ? "R" : "L";

    lines.push(`    <modelNode`);
    lines.push(`      name="${escXml(modelName)}"`);
    lines.push(`      DisplayAs="${escXml(displayAs)}"`);
    lines.push(`      PixelCount="${pixelCount}"`);
    lines.push(`      StartChannel="${startChannel}"`);
    lines.push(`      Universe="${universe}"`);
    lines.push(`      Dir="${dir}"`);
    lines.push(`      StringType="RGB Nodes"`);
    lines.push(`      Antialias="1"`);

    const geo = fixture.geometry;
    if (fixture.kind === "mega-tree" && geo?.strandCount) {
      const pps = geo.pixelsPerStrand || Math.floor(pixelCount / geo.strandCount);
      lines.push(`      parm1="${geo.strandCount}"`);
      lines.push(`      parm2="${pps}"`);
      lines.push(`      parm3="1"`);
    } else if (fixture.kind === "matrix" && geo?.cols && geo?.rows) {
      const zigzag = geo.wiringPattern === "alternating" ? 1 : 0;
      lines.push(`      parm1="${geo.cols}"`);
      lines.push(`      parm2="${geo.rows}"`);
      lines.push(`      parm3="1"`);
      lines.push(`      ZigZag="${zigzag}"`);
    } else {
      lines.push(`      parm1="${pixelCount}"`);
      lines.push(`      parm2="1"`);
      lines.push(`      parm3="1"`);
    }

    lines.push(`    />`);
  }

  lines.push(`  </models>`);
  lines.push(`  <modelGroups/>`);
  lines.push(`  <palettes/>`);
  lines.push(`  <perspectives/>`);
  lines.push(`  <settings/>`);
  lines.push(`</xlights_rgbeffects>`);

  const xml = lines.join("\n");
  return new Blob([xml], { type: "application/xml" });
}

/**
 * Generate README.txt content for the xLights export ZIP.
 */
export function generateReadme(projectName: string, audioFilename: string): string {
  return `LightCanvas xLights Export
==========================
Project: ${projectName}
Audio: ${audioFilename}

How to use this export in xLights:
----------------------------------

1. Create a show directory (e.g., C:\\xLights\\MyShow\\)
2. Extract the contents of this ZIP into that directory.
3. Open xLights and set the Show Directory to that folder.
4. Layout tab: your fixtures should appear as models.
5. Sequencer tab: open the .xsq file.
6. Render > Render All to generate pixel data.
7. Load the resulting .fseq file in FPP or xSchedule and play.

Notes:
- Controller assignments need to be set in the xLights Setup tab.
- Model names must match exactly between LightCanvas and xLights.
- If you renamed fixtures during export, those names are used in the .xsq file.

Generated by LightCanvas.
`;
}

// CRC-32 and ZIP builder imported from ./zip

/**
 * Export a complete xLights ZIP package containing:
 * - [project.name].xsq
 * - [audioFilename] (the audio blob)
 * - xlights_rgbeffects.xml
 * - README.txt
 */
export async function exportXlightsZip(
  project: Project,
  nameMap: Record<string, string>,
  frameTimeMs: FrameTimeMs,
  audioBlob: Blob,
  audioFilename: string
): Promise<Blob> {
  const encoder = new TextEncoder();

  // Generate xsq
  const xsqBlob = exportXlights(project, nameMap, { frameTimeMs });
  const xsqData = new Uint8Array(await xsqBlob.arrayBuffer());

  // Generate rgbeffects
  const rgbBlob = exportRgbEffects(project, nameMap);
  const rgbData = new Uint8Array(await rgbBlob.arrayBuffer());

  // Generate README
  const readmeText = generateReadme(project.name, audioFilename);
  const readmeData = encoder.encode(readmeText);

  // Audio data
  const audioData = new Uint8Array(await audioBlob.arrayBuffer());

  const projectName = sanitizeZipName(project.name || "project");
  const safeAudioFilename = sanitizeZipName(audioFilename);

  const files = [
    { name: `${projectName}.xsq`, data: xsqData },
    { name: safeAudioFilename, data: audioData },
    { name: "xlights_rgbeffects.xml", data: rgbData },
    { name: "README.txt", data: readmeData },
  ];

  return createZip(files);
}
