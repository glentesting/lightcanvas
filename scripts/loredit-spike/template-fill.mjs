/**
 * Task 3: template fill.
 * Keep PreviewClass + TimingGrids untouched, strip every effect, then write a
 * simple new sequence onto 5 props (3 Traditional AC via channel INTENSITY,
 * 2 RGB pixel via track motion effects incl. colorwash).
 * Output: test-fixtures/output/spike-template-fill.loredit
 * Usage: node scripts/loredit-spike/template-fill.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseXml, generateXml, attr, findChild, findChildren, el } from "./xml.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "test-fixtures", "Carol Of The Bells-Pentatonix-LOR-RGBPlus.loredit");
const OUT = path.join(here, "test-fixtures", "output", "spike-template-fill.loredit");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const doc = parseXml(fs.readFileSync(FIXTURE, "utf8"));
const root = doc.root.children.find((c) => c.name === "sequence");

// --- gather layout info (PreviewClass stays untouched) ---
const preview = findChild(root, "PreviewClass");
const propById = new Map();
for (const p of findChildren(preview, "PropClass")) propById.set(attr(p, "id"), p);

// --- timing marks ---
const grids = findChild(root, "TimingGrids");
const freeGrid = findChildren(grids, "TimingGridFree")[0];
const marks = findChildren(freeGrid, "timing").map((t) => parseInt(attr(t, "centisecond"), 10));
console.log(`Timing marks available: ${marks.length} (${marks[0]}…${marks[marks.length - 1]} cs)`);

// --- strip every effect from every SeqProp row ---
const seqProps = findChildren(findChild(root, "SequenceProps"), "SeqProp");
let stripped = 0;
for (const sp of seqProps) {
  for (const row of sp.children.filter((c) => c.name === "channel" || c.name === "track")) {
    const before = row.children.filter((c) => c.name === "effect").length;
    stripped += before;
    row.children = row.children.filter((c) => c.name && c.name !== "effect");
    if (row.children.length === 0) {
      // Empty rows are self-closing in LOR's own output (e.g. unused tracks)
      row.selfClosing = true;
    }
  }
}
console.log(`Stripped ${stripped} effects across ${seqProps.length} SeqProps`);

// --- choose target props ---
function seqPropFor(predicate) {
  return seqProps.filter((sp) => {
    const pc = propById.get(attr(sp, "id"));
    return pc && predicate(pc, sp);
  });
}

const acProps = seqPropFor(
  (pc, sp) =>
    attr(pc, "StringType") === "Traditional" &&
    sp.children.some((c) => c.name === "channel")
).slice(0, 3);

const rgbProps = seqPropFor(
  (pc, sp) =>
    attr(pc, "StringType") === "RGB" &&
    sp.children.some((c) => c.name === "track")
).slice(0, 2);

if (acProps.length < 3 || rgbProps.length < 2) {
  throw new Error(`Not enough target props found: AC=${acProps.length} RGB=${rgbProps.length}`);
}

// --- helpers to build effects ---
function intensityEffect(startCs, endCs, kind) {
  if (kind === "ramp-up") {
    return el("effect", { startCentisecond: startCs, endCentisecond: endCs, startIntensity: 0, endIntensity: 100, settings: "INTENSITY" });
  }
  if (kind === "ramp-down") {
    return el("effect", { startCentisecond: startCs, endCentisecond: endCs, startIntensity: 100, endIntensity: 0, settings: "INTENSITY" });
  }
  return el("effect", { startCentisecond: startCs, endCentisecond: endCs, intensity: 100, settings: "INTENSITY" });
}

// Colorwash settings copied verbatim from the reference file's grammar:
// mixer|?|?|region|speed|primary_effect:colors:params|secondary_effect:colors:
const COLORWASH_RED_GREEN =
  "Mix_Average|0|0|full|20|lightorama_colorwash:FFFF0000,1;FF00FF00,1;FF0000FF,0;FFFFFF00,0;FFFFFFFF,0;FF00FFFF,0:full,full,single_color|lightorama_none:FFFF0000,0;FF00FF00,0;FF0000FF,0;FFFFFF00,0;FFFFFFFF,0;FF000000,0:";

function motionEffect(startCs, endCs, settings) {
  return el("effect", { startCentisecond: startCs, endCentisecond: endCs, intensity: 100, settings });
}

// --- fill: INTENSITY blocks on timing marks for the 3 AC props ---
// Use marks 40..56 in strides so each prop gets 4 blocks at musical positions.
const report = [];
acProps.forEach((sp, propIdx) => {
  const channel = sp.children.find((c) => c.name === "channel");
  channel.selfClosing = false;
  const kinds = ["solid", "ramp-up", "ramp-down", "solid"];
  const added = [];
  for (let b = 0; b < 4; b++) {
    const m = 40 + propIdx * 2 + b * 4; // interleave props on the grid
    const start = marks[m];
    const end = marks[m + 2];
    const eff = intensityEffect(start, end, kinds[b]);
    channel.children.push(eff);
    added.push(`${start}-${end}cs ${kinds[b]}`);
  }
  channel.children.sort(
    (a, b) => parseInt(attr(a, "startCentisecond"), 10) - parseInt(attr(b, "startCentisecond"), 10)
  );
  report.push(`AC  "${attr(sp, "name")}": ${added.join(", ")}`);
});

// --- fill: motion effects on the 2 RGB pixel props ---
rgbProps.forEach((sp, propIdx) => {
  const track = sp.children.find((c) => c.name === "track"); // first row = whole prop
  track.selfClosing = false;
  const added = [];
  const blocks = propIdx === 0 ? 3 : 1;
  for (let b = 0; b < blocks; b++) {
    const m = 60 + b * 8 + propIdx * 4;
    const start = marks[m];
    const end = marks[m + 6];
    track.children.push(motionEffect(start, end, COLORWASH_RED_GREEN));
    added.push(`${start}-${end}cs colorwash`);
  }
  report.push(`RGB "${attr(sp, "name")}" (row "${attr(track, "name")}"): ${added.join(", ")}`);
});

console.log("\nFilled props:");
for (const line of report) console.log("  " + line);

// --- write ---
const out = generateXml(doc);
fs.writeFileSync(OUT, out);
console.log(`\nWrote ${OUT} (${(out.length / 1e6).toFixed(2)} MB)`);

// --- self-check: re-parse the output ---
const check = parseXml(fs.readFileSync(OUT, "utf8"));
const checkRoot = check.root.children.find((c) => c.name === "sequence");
let remaining = 0;
for (const sp of findChildren(findChild(checkRoot, "SequenceProps"), "SeqProp")) {
  for (const row of sp.children.filter((c) => c.name === "channel" || c.name === "track")) {
    remaining += row.children.filter((c) => c.name === "effect").length;
  }
}
const expected = 3 * 4 + 3 + 1;
console.log(`Self-check: output parses OK, contains ${remaining} effects (expected ${expected})`);

// PreviewClass / TimingGrids untouched check: byte-compare their generated form
import { serializeXml } from "./xml.mjs";
const origDoc = parseXml(fs.readFileSync(FIXTURE, "utf8"));
const origRoot = origDoc.root.children.find((c) => c.name === "sequence");
const sameSection = (name) =>
  JSON.stringify(findChild(checkRoot, name)) === JSON.stringify(findChild(origRoot, name));
console.log(`PreviewClass untouched: ${sameSection("PreviewClass")}`);
console.log(`TimingGrids untouched: ${sameSection("TimingGrids")}`);
