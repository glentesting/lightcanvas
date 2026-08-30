/**
 * Verifies the .loredit layout import against the real template:
 *   - the owner's prop set is found, grouped, and pre-selected
 *   - fixture pixel counts match the hardware reference
 *     (8 tree bases ×80px + 8 stars ×20px = 100/tree, 8 arches ×25px,
 *      40 stakes ×5px, 4 face outlines, 16 AC circuits)
 *   - imported shapes reach the preview: expandFixturePixels distributes
 *     pixels along the imported polylines, not default kind boxes
 *   - a generated sequence exports with a fully AUTOMATIC mapping
 *     (loreditPropMap built by the import, zero manual entry) and
 *     zero grammar violations
 *
 * Usage: npx tsx scripts/loredit/verify-layout-import.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLoreditLayout, propToFixture } from "../../src/lib/imports/loredit-layout";
import { expandFixturePixels } from "../../src/lib/scene/pixel-geometry";
import { runSequencer } from "../../src/lib/ai/sequencer/orchestrator";
import { mockPlanBatch } from "../../src/lib/ai/mock-provider";
import { exportLoredit, checkLoreditGrammar } from "../../src/lib/exports/loredit";
import type { AIEvent, GenerateInput } from "../../src/lib/ai/provider";
import type { EffectBlock, Track } from "../../src/lib/timeline/types";
import type { Project } from "../../src/types/domain";
import type { AudioAnalysis } from "../../src/lib/audio/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(here, "..", "loredit-spike", "test-fixtures", "Carol Of The Bells-Pentatonix-LOR-RGBPlus.loredit");
const OUT = path.join(here, "..", "loredit-spike", "test-fixtures", "output", "layout-import-export.loredit");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

// ── parse + selection ──
const text = fs.readFileSync(TEMPLATE, "utf8");
const groups = parseLoreditLayout(text);
const allProps = groups.flatMap((g) => g.props);
const preselected = allProps.filter((p) => p.preselected);
console.log(`Groups: ${groups.map((g) => `${g.key}(${g.props.length})`).join(", ")}`);
console.log(`Total props: ${allProps.length}, preselected: ${preselected.length}`);

check("all 265 PropClass props importable", allProps.length === 265, `${allProps.length}`);

const byName = new Map(preselected.map((p) => [p.name, p]));
const count = (re: RegExp) => preselected.filter((p) => re.test(p.name)).length;

check("8 mini tree bases preselected", count(/^RGB Mini Tree Base/) === 8);
check("8 mini tree stars preselected", count(/^RGB Mini Tree Star/) === 8);
check("8 arches preselected", count(/^RGB Arch/) === 8);
check("40 pixel stakes preselected", count(/^RGB Pixel Stake/) === 40, `${count(/^RGB Pixel Stake/)}`);
check("4 face outlines preselected", count(/^FaceV2-/) === 4, `${count(/^FaceV2-/)}`);
check("16 AC circuits preselected", count(/^01\./) === 16, `${count(/^01\./)}`);
check("preselected total = 84", preselected.length === 84, `${preselected.length}`);

// ── pixel counts vs the hardware doc ──
check("tree base = 80px (240ch)", byName.get("RGB Mini Tree Base 01")?.pixelCount === 80);
check("tree star = 20px (60ch)", byName.get("RGB Mini Tree Star 01")?.pixelCount === 20);
check("base+star = 100px per tree", (byName.get("RGB Mini Tree Base 01")?.pixelCount ?? 0) + (byName.get("RGB Mini Tree Star 01")?.pixelCount ?? 0) === 100);
check("arch = 25px (75ch)", byName.get("RGB Arch 01")?.pixelCount === 25);
check("stake = 5px (15ch)", byName.get("RGB Pixel Stake 01")?.pixelCount === 5);
const totalRgbPixels = preselected.filter((p) => p.stringType === "RGB").reduce((s, p) => s + p.pixelCount, 0);
check("total owned RGB pixels = 1200 (hardware doc §2)", totalRgbPixels === 1200, `${totalRgbPixels}`);
const ac = byName.get("01.01 AC Top Window 01-Group A");
check("AC circuit carries channelCount=1 (one dimmer)", ac?.channelCount === 1);
check("AC circuit unit 01 on Regular", ac?.unit === "01" && ac?.network === "Regular");
check("tree base addressed Aux A unit 09", byName.get("RGB Mini Tree Base 01")?.unit === "09" && byName.get("RGB Mini Tree Base 01")?.network === "Aux A");
const face = byName.get("FaceV2-Elden Tree Outline");
check("face outline is DumbRGB on unit 30", face?.stringType === "DumbRGB" && face?.unit === "30");
check("face outline has a traced shape (50+ points)", (face?.points.length ?? 0) >= 50, `${face?.points.length} points`);

// ── fixtures + preview expansion ──
const fixtures = preselected.map(propToFixture);
check("84 fixtures created", fixtures.length === 84);
check("every fixture placed on the stage", fixtures.every((f) => {
  const pts = f.layout?.points ?? [];
  return pts.length > 0 && pts.every((p) => p.x >= -50 && p.x <= 770 && p.y >= -50 && p.y <= 470);
}));
check("every fixture carries lor addressing", fixtures.every((f) => !!f.lor));

// shapes reach the preview: pixels distribute along imported polylines
const faceFixture = fixtures.find((f) => f.name === "FaceV2-Elden Tree Outline")!;
const facePixels = expandFixturePixels(faceFixture);
const facePts = faceFixture.layout!.points;
const bbox = facePts.reduce(
  (b, p) => ({ minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x), minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y) }),
  { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
);
check(
  "face pixels follow the traced outline (inside its bbox, spread out)",
  facePixels.length === faceFixture.pixelCount &&
    facePixels.every((p) => p.x >= bbox.minX - 1 && p.x <= bbox.maxX + 1 && p.y >= bbox.minY - 1 && p.y <= bbox.maxY + 1) &&
    new Set(facePixels.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`)).size > facePixels.length / 2,
  `${facePixels.length} pixels in bbox ${Math.round(bbox.maxX - bbox.minX)}×${Math.round(bbox.maxY - bbox.minY)}`
);

const stake = fixtures.find((f) => f.name === "RGB Pixel Stake 01")!;
const stakePixels = expandFixturePixels(stake);
check(
  "stake renders as a vertical stick (polyline), not a scatter blob",
  stakePixels.length === 5 && new Set(stakePixels.map((p) => Math.round(p.x))).size === 1,
  stakePixels.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(" ")
);

// AC fixtures import with friendly display names; the template name lives on lor.propName
const windowFx = fixtures.find((f) => f.lor?.propName === "01.01 AC Top Window 01-Group A")!;
check("AC fixture displays a friendly roof name", windowFx.name === "Roof Light String 01", windowFx.name);
check("AC fixture has a traced outline from the template", (windowFx.layout?.points.length ?? 0) >= 3);

// ── generate + export with the AUTOMATIC mapping ──
const DURATION = 60;
const beats = Array.from({ length: 120 }, (_, i) => i * 0.5);
const analysis: AudioAnalysis = {
  duration: DURATION,
  bpm: 120,
  beats,
  downbeats: beats.filter((_, i) => i % 4 === 0),
  onsets: beats,
  loudness: Array.from({ length: 600 }, (_, i) => ({ t: i / 10, v: 0.4 + 0.3 * Math.sin(i / 40) })),
  sections: [
    { label: "intro", startTime: 0, endTime: 15, avgEnergy: 0.3 },
    { label: "chorus", startTime: 15, endTime: 45, avgEnergy: 0.8 },
    { label: "outro", startTime: 45, endTime: 60, avgEnergy: 0.4 },
  ],
};

const input: GenerateInput = { audio: analysis, fixtures, vibe: "classic", intensity: "balanced" };
const blocks: EffectBlock[] = [];
const events: AIEvent[] = [];
for await (const e of runSequencer(input, {}, mockPlanBatch)) {
  events.push(e);
  if (e.type === "patch" && e.patch.addBlocks) blocks.push(...(e.patch.addBlocks as EffectBlock[]));
}
check("sequence generated on imported fixtures", blocks.length > 200 && events.every((e) => e.type !== "error"), `${blocks.length} blocks`);

// the mapping the import created — no seedDefaultMapping, no manual entry
const autoMap: Record<string, string> = {};
for (const f of fixtures) if (f.lor) autoMap[f.id] = f.lor.propName;
check("automatic mapping covers every imported fixture", Object.keys(autoMap).length === fixtures.length);

const tracks: Track[] = fixtures.map((f) => ({ id: f.id, kind: "fixture" as const }));
const project: Project = {
  id: "layout-import-verify", ownerId: "", name: "Layout Import Verification",
  audioUrl: null, audioFile: "Carol Of The Bells-Pentatonix-SN.mp3", audio: analysis,
  fixtures, groups: [],
  sequence: { tracks, blocks, bpm: 120, beatGridOffset: 0, loreditPropMap: autoMap },
  houseTemplate: "default", createdAt: "", updatedAt: "",
};

const { text: outText, report } = exportLoredit(project, {
  templateText: text,
  map: project.sequence.loreditPropMap!,
  now: new Date(2026, 7, 28, 12, 0, 0),
});
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, outText);

const grammar = checkLoreditGrammar(outText);
check("export re-parses with zero grammar violations", grammar.length === 0, grammar.slice(0, 3).join("; "));
check("no fixture skipped for missing mapping", !report.skippedFixtures.some((s) => s.reason.includes("not mapped")),
  report.skippedFixtures.filter((s) => s.reason.includes("not mapped")).map((s) => s.fixtureName).join(", "));
console.log(`Export: ${report.filledProps.length} props filled, ${report.skippedFixtures.length} skipped (${report.skippedFixtures.filter((s) => s.reason.includes("no effects")).length} with no effects)`);
check("most fixtures exported effects", report.filledProps.length >= 60, `${report.filledProps.length}/84`);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
console.log(`\nOpen in S6: ${path.resolve(OUT)}`);
process.exit(failures ? 1 : 0);
