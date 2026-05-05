import type { Project } from "@/types/domain";
import type { EffectBlock, EffectId } from "@/lib/timeline/types";

/**
 * xLights effect-name mapping: LightCanvas → xLights 2024
 */
const XLIGHTS_EFFECT_NAME: Record<EffectId, string> = {
  twinkle: "Twinkle",
  chase: "Marquee",
  fade: "On",
  strobe: "Strobe",
  sparkle: "Galaxy",
  wave: "Plasma",
  pulse: "Pulse",
  wash: "Color Wash",
  meteor: "Meteors",
  firework: "Fireworks",
};

/**
 * Convert a hex color "#rrggbb" to xLights palette format "rrggbb".
 */
function hexToXl(hex: string): string {
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
      // "On" effect with ramp up/down
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
  parts.push(`C_BUTTON_Palette1=#${hexToXl(p.color1)}`);
  if (p.color2) {
    parts.push(`C_BUTTON_Palette2=#${hexToXl(p.color2)}`);
  }
  parts.push(`C_CHECKBOX_Palette1=1`);
  if (p.color2) {
    parts.push(`C_CHECKBOX_Palette2=1`);
  }
  return parts.join(",");
}

/**
 * Escape XML special characters in attribute values.
 */
function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Export a project as an xLights .xsq XML sequence file.
 * Targets xLights 2024 format.
 */
export function exportXlights(
  project: Project,
  options: { frameRate?: 20 | 40 } = {}
): Blob {
  const frameTime = options.frameRate === 40 ? 25 : 50; // ms per frame
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<xsequence BaseChannel="0" ChanCtrlBasic="0" ChanCtrlColor="0" FixedPointTiming="1" ModelBlending="true">`
  );

  // Head
  lines.push(`  <head>`);
  lines.push(`    <author>LightCanvas</author>`);
  lines.push(`    <version>2024.18</version>`);
  lines.push(
    `    <songFilename>${escXml(project.audioFile ?? "")}</songFilename>`
  );
  lines.push(`    <sequenceTiming>${frameTime} ms</sequenceTiming>`);
  lines.push(`    <sequenceType>Media</sequenceType>`);
  lines.push(`    <sequenceDuration>${getDurationMs(project)}</sequenceDuration>`);
  lines.push(`  </head>`);

  // DisplayElements — one per fixture
  lines.push(`  <DisplayElements>`);
  for (const fixture of project.fixtures) {
    lines.push(
      `    <Element collapsed="0" type="model" name="${escXml(fixture.name)}" visible="1"/>`
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
    lines.push(
      `    <Element type="model" name="${escXml(fixture.name)}">`
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
      const endMs = Math.round((block.start + block.duration) * 1000);
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
      const next = beats[i + 1] ?? beat + 0.5;
      lines.push(
        `        <Effect label="" startTime="${Math.round(beat * 1000)}" endTime="${Math.round(next * 1000)}"/>`
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
  if (project.audio?.duration) {
    return Math.round(project.audio.duration * 1000).toString();
  }
  // Fall back to latest block end time
  const maxEnd = project.sequence.blocks.reduce(
    (max, b) => Math.max(max, (b.start + b.duration) * 1000),
    0
  );
  return Math.round(maxEnd || 60000).toString();
}
