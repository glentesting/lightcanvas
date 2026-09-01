/**
 * Proves the exporter only ever writes motion-effect settings strings whose
 * SHAPE Light-O-Rama itself writes.
 *
 * Method: read every one of the ~50,695 settings strings in the reference
 * sequence, learn the vocabulary LOR uses (mix modes, intensity modes, speed
 * values, effect names, and the exact parameter strings each effect takes),
 * then generate a settings string for every LightCanvas lighting move and
 * assert that each part of it was observed in the reference. Colour slots are
 * the one part allowed to differ — those are the user's colours.
 *
 * Usage: npx tsx scripts/loredit/verify-effect-grammar.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  colorwashSettings,
  curtainSettings,
  barsSettings,
  translateBlocksForRgbTrack,
} from "../../src/lib/exports/loredit/effects";
import { exportFidelity, summariseExportFidelity } from "../../src/lib/exports/loredit/fidelity";
import { attr } from "../../src/lib/exports/loredit/xml";
import type { EffectBlock, EffectId } from "../../src/lib/timeline/types";
import type { Fixture } from "../../src/lib/fixtures/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const REFERENCE = path.join(
  here, "..", "loredit-spike", "test-fixtures",
  "Carol Of The Bells-Pentatonix-LOR-RGBPlus.loredit"
);

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

/* ── learn the reference grammar ─────────────────────────────────────── */

const raw = fs.readFileSync(REFERENCE, "utf8");
const observed = raw.match(/settings="([^"]*)"/g)!.map((m) => m.slice(10, -1));
const motion = observed.filter((s) => s.includes("|"));
console.log(`Reference: ${observed.length} settings strings, ${motion.length} of them motion effects\n`);

const mixModes = new Set<string>();
const intensityModes = new Set<string>();
const speeds = new Set<string>();
const effectNames = new Set<string>();
/** effect name → every parameter string LOR wrote for it */
const paramsByEffect = new Map<string, Set<string>>();
/** effect name → every colour-slot count LOR wrote for it */
const slotCountsByEffect = new Map<string, Set<number>>();
/** the whole trailing "second effect" segment, verbatim */
const secondSegments = new Set<string>();

function splitSegment(seg: string): { name: string; colors: string; params: string } {
  const first = seg.indexOf(":");
  const last = seg.lastIndexOf(":");
  return {
    name: seg.slice(0, first),
    colors: seg.slice(first + 1, last),
    params: seg.slice(last + 1),
  };
}

for (const s of motion) {
  const parts = s.split("|");
  if (parts.length < 7) continue;
  mixModes.add(parts[0]);
  intensityModes.add(parts[3]);
  speeds.add(parts[4]);
  const primary = splitSegment(parts[5]);
  effectNames.add(primary.name);
  if (!paramsByEffect.has(primary.name)) paramsByEffect.set(primary.name, new Set());
  paramsByEffect.get(primary.name)!.add(primary.params);
  if (!slotCountsByEffect.has(primary.name)) slotCountsByEffect.set(primary.name, new Set());
  slotCountsByEffect.get(primary.name)!.add(primary.colors === "" ? 0 : primary.colors.split(";").length);
  secondSegments.add(parts[6]);
}

console.log(`Learned: ${mixModes.size} mix modes, ${intensityModes.size} intensity modes, ` +
  `${effectNames.size} motion effects, ${secondSegments.size} trailing segments`);
for (const name of ["lightorama_colorwash", "lightorama_curtain", "lightorama_bars"]) {
  console.log(`  ${name}: ${paramsByEffect.get(name)?.size ?? 0} distinct parameter strings, ` +
    `colour slot counts {${[...(slotCountsByEffect.get(name) ?? [])].sort((a, b) => a - b).join(", ")}}`);
}
console.log();

/* ── assert every string we can emit is built from that grammar ───────── */

const SLOT = /^FF[0-9A-F]{6},[01]$/;

function assertGrammar(label: string, s: string): void {
  const parts = s.split("|");
  const problems: string[] = [];
  if (parts.length !== 7) problems.push(`${parts.length} pipe-separated fields, expected 7`);
  else {
    if (!mixModes.has(parts[0])) problems.push(`mix mode "${parts[0]}" never used by LOR`);
    if (parts[1] !== "0" || parts[2] !== "0") problems.push(`fields 2/3 are "${parts[1]}"/"${parts[2]}", reference always writes 0/0`);
    if (!intensityModes.has(parts[3])) problems.push(`intensity mode "${parts[3]}" never used by LOR`);
    if (!speeds.has(parts[4])) problems.push(`speed "${parts[4]}" never used by LOR`);

    const primary = splitSegment(parts[5]);
    if (!effectNames.has(primary.name)) problems.push(`effect "${primary.name}" not in the reference`);
    const knownParams = paramsByEffect.get(primary.name);
    if (!knownParams?.has(primary.params)) {
      problems.push(`parameter string "${primary.params}" never written by LOR for ${primary.name}`);
    }
    const slots = primary.colors === "" ? [] : primary.colors.split(";");
    const knownCounts = slotCountsByEffect.get(primary.name);
    if (!knownCounts?.has(slots.length)) {
      problems.push(`${slots.length} colour slots, LOR writes {${[...(knownCounts ?? [])].join(", ")}} for ${primary.name}`);
    }
    for (const slot of slots) if (!SLOT.test(slot)) problems.push(`colour slot "${slot}" is malformed`);

    if (!secondSegments.has(parts[6])) problems.push(`trailing segment "${parts[6]}" never written by LOR`);
  }
  check(label, problems.length === 0, problems.join("; "));
}

console.log("── settings builders ──");
assertGrammar("colorwash, one colour", colorwashSettings("#ff8800"));
assertGrammar("colorwash, two colours", colorwashSettings("#ff8800", "#0033ff"));
assertGrammar("colorwash, blinking (strobe)", colorwashSettings("#ffffff", undefined, true));

for (const edge of ["center", "left", "right", "top", "bottom", "middle"] as const) {
  for (const motionKind of ["open", "close"] as const) {
    assertGrammar(`curtain ${edge},${motionKind}`, curtainSettings("#ff0088", "#00ffcc", edge, motionKind));
  }
}
for (const dir of ["right", "left", "H_expand", "H_compress", "V_expand", "V_compress", "up", "down"] as const) {
  assertGrammar(`bars ${dir}`, barsSettings("#22ff44", undefined, dir));
}

/* ── assert the real translator emits only that grammar ──────────────── */

console.log("\n── every lighting move, through the real translator ──");

const ALL_EFFECTS: EffectId[] = [
  "wash", "fade", "pulse", "strobe", "chase", "wave", "meteor", "firework", "twinkle", "sparkle",
];
const DIRECTIONS = ["forward", "backward", "center-out", "in"] as const;
const ctx = { beats: [0.5, 1.0, 1.5, 2.0, 2.5], totalCentiseconds: 1000 };

let emitted = 0;
const usedGrammars = new Map<EffectId, Set<string>>();
for (const effectId of ALL_EFFECTS) {
  for (const direction of DIRECTIONS) {
    const block: EffectBlock = {
      id: `b-${effectId}-${direction}`,
      trackId: "t",
      effectId,
      start: 0,
      duration: 4,
      params: {
        color1: "#ff3366", color2: "#3366ff", intensity: 0.75, speed: 1,
        easing: "linear", direction, burstCount: 3,
      },
    };
    const effects = translateBlocksForRgbTrack([block], ctx);
    if (effects.length === 0) {
      check(`${effectId} (${direction}) produced effects`, false, "translator returned nothing");
      continue;
    }
    for (const e of effects) {
      const s = attr(e, "settings") ?? "";
      assertGrammar(`${effectId} (${direction})`, s);
      emitted++;
      const name = s.split("|")[5].split(":")[0].replace("lightorama_", "");
      if (!usedGrammars.has(effectId)) usedGrammars.set(effectId, new Set());
      usedGrammars.get(effectId)!.add(name);
    }
  }
}
console.log(`\n${emitted} generated effects checked against the reference grammar.`);
console.log("Which LOR move each lighting move becomes:");
for (const effectId of ALL_EFFECTS) {
  console.log(`  ${effectId.padEnd(9)} -> ${[...(usedGrammars.get(effectId) ?? [])].sort().join(", ")}`);
}

check("curtain grammar is actually used", [...usedGrammars.values()].some((v) => v.has("curtain")));
check("bars grammar is actually used", [...usedGrammars.values()].some((v) => v.has("bars")));
check("colorwash grammar is still used", [...usedGrammars.values()].some((v) => v.has("colorwash")));

/* ── the fidelity table must describe every move, on every wiring ─────── */

console.log("\n── honesty table ──");
let tableGaps = 0;
for (const wire of ["RGB", "Traditional", "DumbRGB"] as const) {
  for (const effectId of ALL_EFFECTS) {
    const note = exportFidelity(effectId, wire);
    if (!note || !note.asExported) { tableGaps++; console.log(`  MISSING ${wire}/${effectId}`); continue; }
    if (note.fidelity !== "exact" && !note.loses) {
      tableGaps++;
      console.log(`  ${wire}/${effectId} is "${note.fidelity}" but does not say what is lost`);
    }
  }
}
check("every move on every wiring has an honest description", tableGaps === 0, `${tableGaps} gaps`);

// the summary the export dialog shows must count group blocks per member piece
const fx = (id: string, stringType: "RGB" | "Traditional" | "DumbRGB"): Fixture => ({
  id, kind: "mini-tree", name: id, pixelCount: 50, startChannel: 1,
  lor: { propId: id, propName: id, stringType, network: "Aux A", unit: "09", startCircuit: 1, channelCount: 150 },
});
const fixtures = [fx("a", "RGB"), fx("b", "RGB"), fx("roof", "Traditional")];
const rows = summariseExportFidelity(
  [
    { trackId: "a", effectId: "twinkle" },
    { trackId: "roof", effectId: "chase" },
    { trackId: "grp", effectId: "wash" },
  ],
  fixtures,
  [{ id: "grp", fixtureIds: ["a", "b"] }]
);
check("summary counts a group block once per member piece",
  rows.find((r) => r.effectId === "wash")?.fixtureCount === 2,
  JSON.stringify(rows.map((r) => [r.effectId, r.wire, r.fixtureCount])));
check("summary lists the plainest results first", rows[0].fidelity === "approximate", rows.map((r) => r.fidelity).join(", "));

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
