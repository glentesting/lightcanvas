/**
 * .loredit exporter — LOR S6 (saveFileVersion 15) via template fill.
 *
 * Takes a user-supplied .loredit template (any sequence saved against the
 * owner's S6 Preview — e.g. a purchased RGBPlus sequence), keeps its
 * PreviewClass and TimingGrids verbatim, strips all effects, and writes the
 * LightCanvas sequence onto the mapped props. Detected beats are added as a
 * separate TimingGridFree so the template's own grids stay untouched.
 *
 * Acceptance test for any change here: LOR S6 v6.6.12 opens the file.
 */

import type { Project } from "@/types/domain";
import type { EffectBlock } from "@/lib/timeline/types";
import { generateXml, attr, setAttr, findChild, findChildren, isElement, el } from "./xml";
import type { XmlElement, XmlNode } from "./xml";
import { parseTemplate, stripAllEffects } from "./template";
import type { TemplateProp } from "./template";
import type { LoreditPropMap } from "./mapping";
import {
  translateBlocksForAC,
  translateBlocksForDumbRgb,
  translateBlocksForRgbTrack,
} from "./effects";

export { parseTemplate, stripAllEffects } from "./template";
export type { LoreditTemplate, TemplateProp, LorStringType } from "./template";
export { seedDefaultMapping } from "./mapping";
export type { LoreditPropMap } from "./mapping";
export * from "./effects";
export { parseXml, generateXml, serializeXml } from "./xml";

export const LIGHTCANVAS_BEAT_GRID_NAME = "LightCanvas Beats";

export interface LoreditExportOptions {
  templateText: string;
  map: LoreditPropMap;
  /** Injectable clock so tests are deterministic */
  now?: Date;
}

export interface FilledPropReport {
  fixtureName: string;
  propName: string;
  stringType: string;
  effectCount: number;
}

export interface LoreditExportReport {
  filledProps: FilledPropReport[];
  skippedFixtures: Array<{ fixtureName: string; reason: string }>;
  strippedEffects: number;
  beatMarksWritten: number;
  totalCentiseconds: number;
}

export interface LoreditExportResult {
  text: string;
  report: LoreditExportReport;
}

/** Blocks targeting a fixture: its own track plus any group track containing it. */
function blocksForFixture(project: Project, fixtureId: string): EffectBlock[] {
  const groupIds = new Set(
    project.groups.filter((g) => g.fixtureIds.includes(fixtureId)).map((g) => g.id)
  );
  return project.sequence.blocks.filter(
    (b) => b.trackId === fixtureId || groupIds.has(b.trackId)
  );
}

function formatLorDate(d: Date): string {
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${hours}:${minutes} ${ampm}`;
}

function newGuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback (non-crypto) — format is what matters to LOR
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function exportLoredit(project: Project, options: LoreditExportOptions): LoreditExportResult {
  const template = parseTemplate(options.templateText);
  const { sequence } = template;
  const strippedEffects = stripAllEffects(template);

  // ── sequence length ──
  const templateTotal = parseInt(attr(sequence, "totalCentiseconds") ?? "0", 10) || 0;
  const totalCentiseconds = project.audio?.duration
    ? Math.round(project.audio.duration * 100)
    : templateTotal;
  setAttr(sequence, "totalCentiseconds", totalCentiseconds);

  // ── metadata ──
  setAttr(sequence, "id", newGuid());
  setAttr(sequence, "author", "LightCanvas");
  setAttr(sequence, "createdAt", formatLorDate(options.now ?? new Date()));
  if (project.audioFile) {
    // S6 resolves this against its Audio folder (Documents\Light-O-Rama\Audio)
    setAttr(sequence, "musicFilename", project.audioFile);
  }
  if (project.name) setAttr(sequence, "musicTitle", project.name);

  // ── beats → timing grid ──
  const beats = project.audio?.beats ?? [];
  let beatMarksWritten = 0;
  const grids = findChild(sequence, "TimingGrids");
  if (grids && beats.length > 0) {
    grids.selfClosing = false;
    // replace a previous LightCanvas grid if the template came from us
    grids.children = grids.children.filter(
      (c: XmlNode) => !(isElement(c) && attr(c, "name") === LIGHTCANVAS_BEAT_GRID_NAME)
    );
    const marks = beats.map((b) => el("timing", { centisecond: Math.round(b * 100) }));
    grids.children.push(el("TimingGridFree", { name: LIGHTCANVAS_BEAT_GRID_NAME }, marks, false));
    beatMarksWritten = marks.length;
  }

  // ── fill effects ──
  const seqPropsEl = findChild(sequence, "SequenceProps");
  if (!seqPropsEl) throw new Error("Template has no SequenceProps");
  const seqPropByName = new Map<string, XmlElement>();
  for (const sp of findChildren(seqPropsEl, "SeqProp")) {
    const name = attr(sp, "name");
    if (name) seqPropByName.set(name, sp);
  }
  const templatePropByName = new Map<string, TemplateProp>(
    template.props.map((p) => [p.name, p])
  );

  const ctx = { beats, totalCentiseconds };
  const report: LoreditExportReport = {
    filledProps: [],
    skippedFixtures: [],
    strippedEffects,
    beatMarksWritten,
    totalCentiseconds,
  };

  for (const fixture of project.fixtures) {
    const propName = options.map[fixture.id];
    if (!propName) {
      report.skippedFixtures.push({ fixtureName: fixture.name, reason: "not mapped to a template prop" });
      continue;
    }
    const prop = templatePropByName.get(propName);
    const seqProp = seqPropByName.get(propName);
    if (!prop || !seqProp) {
      report.skippedFixtures.push({ fixtureName: fixture.name, reason: `prop "${propName}" not found in template` });
      continue;
    }
    const blocks = blocksForFixture(project, fixture.id);
    if (blocks.length === 0) {
      report.skippedFixtures.push({ fixtureName: fixture.name, reason: "no effects in sequence" });
      continue;
    }

    let effectCount = 0;
    if (prop.rowType === "channel") {
      const effects =
        prop.stringType === "DumbRGB"
          ? translateBlocksForDumbRgb(blocks, ctx)
          : translateBlocksForAC(blocks, ctx);
      // Traditional/DumbRGB props: identical envelope on every circuit of the prop
      for (const row of findChildren(seqProp, "channel")) {
        row.selfClosing = false;
        row.children.push(...effects.map((e) => ({ ...e, children: [...e.children] })));
      }
      effectCount = effects.length * Math.max(1, prop.channelRowCount);
    } else {
      const effects = translateBlocksForRgbTrack(blocks, ctx);
      // first track row addresses the whole prop
      const firstTrack = findChildren(seqProp, "track")[0];
      if (!firstTrack) {
        report.skippedFixtures.push({ fixtureName: fixture.name, reason: `prop "${propName}" has no track rows` });
        continue;
      }
      firstTrack.selfClosing = false;
      firstTrack.children.push(...effects);
      effectCount = effects.length;
    }

    report.filledProps.push({
      fixtureName: fixture.name,
      propName,
      stringType: prop.stringType,
      effectCount,
    });
  }

  return { text: generateXml(template.doc), report };
}

/**
 * Grammar check used by the verification scripts and safe to run anywhere:
 * re-parses an exported file and asserts the channel/track separation rule.
 * Returns a list of violations (empty = clean).
 */
export function checkLoreditGrammar(text: string): string[] {
  const template = parseTemplate(text);
  const problems: string[] = [];
  const seqPropsEl = findChild(template.sequence, "SequenceProps");
  if (!seqPropsEl) return ["missing SequenceProps"];
  for (const sp of findChildren(seqPropsEl, "SeqProp")) {
    const name = attr(sp, "name") ?? "?";
    for (const row of sp.children.filter(isElement)) {
      if (row.name !== "channel" && row.name !== "track") continue;
      for (const eff of findChildren(row, "effect")) {
        const settings = attr(eff, "settings") ?? "";
        const isClassic = settings === "INTENSITY" || settings === "SHIMMER" || settings === "TWINKLE";
        const isMotion = settings.includes("|") && settings.includes("lightorama_");
        if (row.name === "channel" && !isClassic) {
          problems.push(`${name}: channel row carries non-classic settings "${settings.slice(0, 40)}"`);
        }
        if (row.name === "track" && !isMotion) {
          problems.push(`${name}: track row carries non-motion settings "${settings.slice(0, 40)}"`);
        }
        const hasConst = attr(eff, "intensity") !== undefined;
        const hasRamp = attr(eff, "startIntensity") !== undefined || attr(eff, "endIntensity") !== undefined;
        if (hasConst && hasRamp) {
          problems.push(`${name}: effect carries both intensity and start/endIntensity`);
        }
      }
    }
  }
  return problems;
}
