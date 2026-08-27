/**
 * End-to-end test of the real exporter: builds a project shaped like Glen's
 * actual hardware (8 mini trees, 8 arches, pixel stakes, AC roofline), seeds
 * the default mapping against the reference template, exports a .loredit,
 * and verifies the output:
 *   - re-parses cleanly with the template parser
 *   - channel/track grammar rule holds (zero violations)
 *   - PreviewClass is structurally untouched
 *   - beat timing grid was written
 *   - expected props carry effects
 *
 * Output file (open this in S6 v6.6.12 — the true acceptance test):
 *   scripts/loredit-spike/test-fixtures/output/lightcanvas-export-test.loredit
 *
 * Usage: npx tsx scripts/loredit/verify-export.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  exportLoredit,
  parseTemplate,
  seedDefaultMapping,
  checkLoreditGrammar,
} from "../../src/lib/exports/loredit";
import { findChild, findChildren, childElements, attr } from "../../src/lib/exports/loredit/xml";
import type { Project } from "../../src/types/domain";
import type { Fixture } from "../../src/lib/fixtures/types";
import type { EffectBlock, EffectId, Track } from "../../src/lib/timeline/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(
  here,
  "..",
  "loredit-spike",
  "test-fixtures",
  "Carol Of The Bells-Pentatonix-LOR-RGBPlus.loredit"
);
const OUT = path.join(here, "..", "loredit-spike", "test-fixtures", "output", "lightcanvas-export-test.loredit");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

// ── build a project shaped like the owner's display ──
const fixtures: Fixture[] = [];
const mk = (kind: Fixture["kind"], name: string, pixelCount: number): Fixture => {
  const f: Fixture = { id: `fx-${fixtures.length + 1}`, kind, name, pixelCount, startChannel: 1 };
  fixtures.push(f);
  return f;
};

for (let i = 1; i <= 8; i++) mk("mini-tree", `Mini Tree ${i}`, 100);
for (let i = 1; i <= 8; i++) mk("arch", `Arch ${i}`, 25);
for (let i = 1; i <= 4; i++) mk("bush", `Pixel Stake ${i}`, 5);
mk("roofline", "Roof Peak", 1); // AC circuit on the CTB16
mk("roofline", "Roof Ridge", 1);
mk("window-outline", "Front Windows", 1);
mk("custom", "Unmappable Thing", 10); // intentionally has no default target
const faceFixture = mk("custom", "Elden Outline", 16); // manually mapped to a DumbRGB face prop below

const DURATION = 30; // seconds
const BPM = 120;
const beats = Array.from({ length: Math.floor(DURATION * (BPM / 60)) }, (_, i) => i * (60 / BPM));

const tracks: Track[] = fixtures.map((f) => ({ id: f.id, kind: "fixture" as const }));
const blocks: EffectBlock[] = [];
let blockN = 0;
const addBlock = (fixtureId: string, effectId: EffectId, start: number, duration: number, params?: Partial<EffectBlock["params"]>) => {
  blocks.push({
    id: `blk-${++blockN}`,
    trackId: fixtureId,
    effectId,
    start,
    duration,
    params: { color1: "#ff0000", color2: "#00ff00", intensity: 0.8, speed: 0.5, easing: "linear", ...params },
  });
};

// pixel props: every effect becomes a colorwash motion effect
addBlock(fixtures[0].id, "wash", 0, 4);
addBlock(fixtures[0].id, "fade", 4, 4, { color1: "#0000ff", color2: undefined });
addBlock(fixtures[1].id, "chase", 2, 6, { color1: "#ffffff" });
addBlock(fixtures[8].id, "twinkle", 0, 8); // arch 1
// AC props: classic-effect envelopes
addBlock(fixtures[20].id, "fade", 0, 4, { intensity: 1.0 }); // Roof Peak
addBlock(fixtures[20].id, "pulse", 4, 4);
addBlock(fixtures[20].id, "strobe", 8, 2);
addBlock(fixtures[20].id, "twinkle", 10, 4);
addBlock(fixtures[21].id, "wash", 0, 30); // Roof Ridge: constant approximation
// unmapped fixture: must be skipped, not crash
addBlock(fixtures[23].id, "wash", 0, 10);
// DumbRGB face prop: constant packed-ARGB color blocks
addBlock(faceFixture.id, "wash", 0, 5, { color1: "#ff0000", intensity: 1.0 });
addBlock(faceFixture.id, "twinkle", 6, 4, { color1: "#00ff00", intensity: 0.5 });

// group track: one block that fans out to two mini trees
const group = { id: "grp-1", name: "Tree Pair", fixtureIds: [fixtures[2].id, fixtures[3].id] };
tracks.push({ id: group.id, kind: "group" });
blocks.push({
  id: `blk-${++blockN}`,
  trackId: group.id,
  effectId: "wave",
  start: 10,
  duration: 5,
  params: { color1: "#ffcc00", intensity: 1.0, speed: 0.5, easing: "linear" },
});

const project: Project = {
  id: "test-project",
  ownerId: "",
  name: "Export Verification",
  audioUrl: null,
  audioFile: "Carol Of The Bells-Pentatonix-SN.mp3",
  audio: {
    duration: DURATION,
    bpm: BPM,
    beats,
    downbeats: beats.filter((_, i) => i % 4 === 0),
    onsets: [],
    sections: [],
    loudness: [],
  } as unknown as Project["audio"],
  fixtures,
  groups: [group],
  sequence: { tracks, blocks, bpm: BPM, beatGridOffset: 0 },
  houseTemplate: "default",
  createdAt: "",
  updatedAt: "",
};

// ── export ──
const templateText = fs.readFileSync(TEMPLATE, "utf8");
const template = parseTemplate(templateText);
console.log(`Template: ${template.props.length} mappable props, ${template.timingMarkCount} timing marks`);

const map = seedDefaultMapping(project.fixtures, template.props);
map[faceFixture.id] = "FaceV2-Elden Tree Outline"; // exercise the DumbRGB packed-ARGB path
console.log(`Seeded mapping (${Object.keys(map).length}/${fixtures.length} fixtures):`);
for (const f of fixtures) console.log(`  ${f.name.padEnd(18)} -> ${map[f.id] ?? "(unmapped)"}`);

const t0 = Date.now();
const { text, report } = exportLoredit(project, {
  templateText,
  map,
  now: new Date(2026, 7, 27, 12, 0, 0),
});
fs.writeFileSync(OUT, text);
console.log(`\nExported ${(text.length / 1e6).toFixed(2)} MB in ${Date.now() - t0} ms -> ${OUT}`);
console.log(`Report: ${report.filledProps.length} filled, ${report.skippedFixtures.length} skipped, ` +
  `${report.strippedEffects} template effects stripped, ${report.beatMarksWritten} beat marks, ` +
  `totalCs=${report.totalCentiseconds}`);
for (const p of report.filledProps) console.log(`  filled  ${p.fixtureName.padEnd(18)} -> ${p.propName} [${p.stringType}] ${p.effectCount} effects`);
for (const s of report.skippedFixtures) console.log(`  skipped ${s.fixtureName.padEnd(18)} (${s.reason})`);

// ── verify ──
check("seeded mapping covers all default-mappable fixtures", Object.keys(map).length === fixtures.length - 1,
  `${Object.keys(map).length} mapped, expected ${fixtures.length - 1} (custom prop has no default)`);

// full red at intensity 1.0 packs to signed ARGB -65536 (0xFFFF0000)
check("DumbRGB face effect uses packed ARGB intensity", text.includes('intensity="-65536"'));

let reparsed: ReturnType<typeof parseTemplate> | null = null;
try {
  reparsed = parseTemplate(text);
  check("output re-parses cleanly", true);
} catch (err) {
  check("output re-parses cleanly", false, String(err));
}

const grammar = checkLoreditGrammar(text);
check("channel/track grammar rule holds", grammar.length === 0, grammar.slice(0, 3).join("; "));

if (reparsed) {
  const origPreview = findChild(parseTemplate(templateText).sequence, "PreviewClass");
  const newPreview = findChild(reparsed.sequence, "PreviewClass");
  check(
    "PreviewClass untouched",
    JSON.stringify(origPreview) === JSON.stringify(newPreview)
  );

  const grids = findChild(reparsed.sequence, "TimingGrids");
  const gridNames = grids ? childElements(grids).map((g) => attr(g, "name")) : [];
  check(
    "LightCanvas beat grid present alongside template grids",
    gridNames.includes("LightCanvas Beats") && gridNames.includes("Default Free"),
    `grids: ${gridNames.join(", ")}`
  );

  // count effects in the output
  let effectCount = 0;
  const seqPropsEl = findChild(reparsed.sequence, "SequenceProps")!;
  for (const sp of findChildren(seqPropsEl, "SeqProp")) {
    for (const row of childElements(sp)) {
      if (row.name !== "channel" && row.name !== "track") continue;
      effectCount += findChildren(row, "effect").length;
    }
  }
  check("output contains effects", effectCount > 0, `${effectCount} effects`);
  // Mini Trees 1–2 (own blocks), Mini Trees 3–4 (group block), Arch 1, Roof Peak, Roof Ridge, Elden face
  check("expected fixtures were filled", report.filledProps.length === 8,
    `filled ${report.filledProps.length}, expected 8`);
}

check("unmappable fixture skipped without error",
  report.skippedFixtures.some((s) => s.fixtureName === "Unmappable Thing"));
check("beat marks written", report.beatMarksWritten === beats.length, `${report.beatMarksWritten}/${beats.length}`);
check("totalCentiseconds from audio", report.totalCentiseconds === DURATION * 100);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
console.log(`\nOpen in S6: ${path.resolve(OUT)}`);
process.exit(failures ? 1 : 0);
