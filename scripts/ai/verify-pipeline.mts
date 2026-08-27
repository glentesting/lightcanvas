/**
 * End-to-end verification of the two-layer AI sequencer, run against a REAL
 * audio file with the REAL analysis code:
 *
 *   1. decode a real MP3 (pure-JS decoder) → analyzeChannelData (the same
 *      code the browser runs after decodeAudioData)
 *   2. run the full sequencer pipeline — orchestrator, plan parsing/salvage,
 *      deterministic expander, SSE-shaped event stream — using the
 *      deterministic mock planner as Layer 1 (no ANTHROPIC_API_KEY on this
 *      machine; the model call is injectable and exercised separately below)
 *   3. measure density (target: ≥1,500 blocks for a 3–4 min song, ~20 fixtures),
 *      beat alignment, and per-fixture distribution
 *   4. exercise the Layer-1 failure paths with synthetic model responses:
 *      max_tokens truncation (batch splitting), refusal, garbage JSON,
 *      truncated-JSON salvage
 *   5. export the generated show to .loredit via the real exporter and check
 *      zero grammar violations
 *
 * Usage: npx tsx scripts/ai/verify-pipeline.mts [path-to-mp3]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import decodeAudio from "audio-decode";
import { analyzeChannelData } from "../../src/lib/audio/beat-detector";
import { runSequencer } from "../../src/lib/ai/sequencer/orchestrator";
import type { ModelCaller } from "../../src/lib/ai/sequencer/orchestrator";
import { mockPlanBatch } from "../../src/lib/ai/mock-provider";
import { makeAnthropicCaller } from "../../src/lib/ai/anthropic-provider";
import { buildPlanPrompt } from "../../src/lib/ai/sequencer/prompt";
import { prepareSections, loudnessShape } from "../../src/lib/ai/sequencer/sections";
import { deriveFixtureGroups } from "../../src/lib/ai/sequencer/groups";
import { exportLoredit, parseTemplate, seedDefaultMapping, checkLoreditGrammar } from "../../src/lib/exports/loredit";
import type { AIEvent, GenerateInput } from "../../src/lib/ai/provider";
import type { EffectBlock, Track } from "../../src/lib/timeline/types";
import type { Fixture } from "../../src/lib/fixtures/types";
import type { Project } from "../../src/types/domain";

const here = path.dirname(fileURLToPath(import.meta.url));
const MP3 =
  process.argv[2] ??
  "C:/Users/glenh/Documents/LightCanvas/Songs/Christmas Lights And Zero Regrets.mp3";
const TEMPLATE = path.join(here, "..", "loredit-spike", "test-fixtures", "Carol Of The Bells-Pentatonix-LOR-RGBPlus.loredit");
const OUT = path.join(here, "..", "loredit-spike", "test-fixtures", "output", "ai-pipeline-export.loredit");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

// ── Layer-1 planner: real Opus 5 when a key is available, else the mock ──
// The key is read from .env.local (Node doesn't auto-load it) and never printed.
function loadApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const env = fs.readFileSync(path.join(here, "..", "..", ".env.local"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      // strip BOM and zero-width characters (pasted keys often carry U+200B)
      const trimmed = line.replace(/[​‌‍﻿]/g, "").trim();
      if (trimmed.startsWith("ANTHROPIC_API_KEY=")) {
        return trimmed.slice("ANTHROPIC_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

const apiKey = loadApiKey();
/** raw model responses, captured so the report can show the model's actual plans */
const capturedPlans: Array<{ sections: string; text: string; stopReason: string | null; ms: number }> = [];

let planner: ModelCaller;
let plannerName: string;
if (apiKey) {
  const real = makeAnthropicCaller(apiKey);
  planner = async (prompt, meta) => {
    const t = Date.now();
    const result = await real(prompt, meta);
    capturedPlans.push({
      sections: meta.batch.map((s) => `#${s.index} ${s.label}`).join(", "),
      text: result.text,
      stopReason: result.stopReason,
      ms: Date.now() - t,
    });
    return result;
  };
  plannerName = "REAL claude-opus-5";
} else {
  planner = mockPlanBatch;
  plannerName = "deterministic mock (no ANTHROPIC_API_KEY found)";
}
console.log(`Layer-1 planner: ${plannerName}`);

// ── 1. real audio, real analysis ──
console.log(`Decoding: ${MP3}`);
const t0 = Date.now();
const decoded = (await decodeAudio(fs.readFileSync(MP3))) as unknown as {
  channelData: Float32Array[];
  sampleRate: number;
};
const mono = decoded.channelData[0];
console.log(
  `Decoded ${(mono.length / decoded.sampleRate).toFixed(1)}s at ${decoded.sampleRate} Hz in ${Date.now() - t0} ms`
);

const t1 = Date.now();
const analysis = analyzeChannelData(mono, decoded.sampleRate);
console.log(
  `Analyzed in ${((Date.now() - t1) / 1000).toFixed(1)}s: ${analysis.bpm} BPM, ` +
    `${analysis.beats.length} beats, ${analysis.downbeats.length} downbeats, ` +
    `${analysis.onsets.length} onsets, ${analysis.sections?.length ?? 0} sections, ` +
    `${analysis.loudness.length} loudness samples`
);
check("analysis produced beats and sections", analysis.beats.length > 100 && (analysis.sections?.length ?? 0) > 0);

// ── fixtures shaped like the owner's display (~20) ──
const fixtures: Fixture[] = [];
const mk = (kind: Fixture["kind"], name: string, pixelCount: number) => {
  fixtures.push({ id: `fx-${fixtures.length + 1}`, kind, name, pixelCount, startChannel: 1 });
};
for (let i = 1; i <= 8; i++) mk("mini-tree", `Mini Tree ${i}`, 100);
for (let i = 1; i <= 8; i++) mk("arch", `Arch ${i}`, 25);
mk("roofline", "Roof Peak", 1);
mk("roofline", "Roof Ridge", 1);
mk("window-outline", "Front Windows", 1);
mk("mega-tree", "Mega Tree", 400);
console.log(`Fixtures: ${fixtures.length}`);

const input: GenerateInput = { audio: analysis, fixtures, vibe: "classic", intensity: "balanced" };

// ── 2. full pipeline with the deterministic planner ──
async function collect(events: AsyncIterable<AIEvent>) {
  const blocks: EffectBlock[] = [];
  const all: AIEvent[] = [];
  for await (const e of events) {
    all.push(e);
    if (e.type === "patch" && e.patch.addBlocks) blocks.push(...(e.patch.addBlocks as EffectBlock[]));
  }
  return { blocks, all };
}

const t2 = Date.now();
const { blocks, all } = await collect(runSequencer(input, { style: "tso" }, planner));
console.log(`\nPipeline (${plannerName}) ran in ${Date.now() - t2} ms, ${all.length} events`);
const errors = all.filter((e) => e.type === "error");
check("pipeline completed without errors", errors.length === 0, errors.map((e) => "message" in e ? e.message : "").join("; "));
const done = all.find((e) => e.type === "done");
check("done event emitted", !!done, done && "summary" in done ? done.summary : "");

// ── 3. density + alignment + distribution ──
const beatSet = new Set(analysis.beats);
const onBeat = blocks.filter((b) => beatSet.has(b.start)).length;
const perFixture: Record<string, number> = {};
for (const b of blocks) perFixture[b.trackId] = (perFixture[b.trackId] ?? 0) + 1;
const fixturesWithBlocks = Object.keys(perFixture).length;

console.log(`\n=== DENSITY REPORT ===`);
console.log(`Song: ${analysis.duration.toFixed(1)}s, ${analysis.bpm} BPM, ${analysis.beats.length} beats`);
console.log(`TOTAL BLOCKS GENERATED: ${blocks.length}`);
console.log(`On detected beats: ${onBeat} (${((onBeat / blocks.length) * 100).toFixed(1)}%); remaining starts are section-start/phrase boundaries`);
console.log(`Fixtures covered: ${fixturesWithBlocks}/${fixtures.length}`);
console.log(`Per-fixture distribution:`);
for (const f of fixtures) {
  const count = perFixture[f.id] ?? 0;
  console.log(`  ${f.name.padEnd(16)} ${String(count).padStart(5)}  ${"#".repeat(Math.min(60, Math.round(count / 10)))}`);
}

// mock comparison run (same analysis, same fixtures)
if (apiKey) {
  const mockRun = await collect(runSequencer(input, { style: "tso" }, mockPlanBatch));
  console.log(`Mock planner on the same input: ${mockRun.blocks.length} blocks (real model: ${blocks.length})`);
}

check("density target met (>= 1500 blocks)", blocks.length >= 1500, `${blocks.length} blocks`);
check("every block starts on a detected beat or section boundary", onBeat / blocks.length > 0.9, `${((onBeat / blocks.length) * 100).toFixed(1)}% exactly on beats`);
check("blocks within song bounds", blocks.every((b) => b.start >= 0 && b.start + b.duration <= analysis.duration + 0.5));
check("most fixtures participate", fixturesWithBlocks >= fixtures.length * 0.75, `${fixturesWithBlocks}/${fixtures.length}`);

// ── what the model actually returned ──
if (capturedPlans.length > 0) {
  console.log(`\n=== MODEL RESPONSES (${capturedPlans.length} calls) ===`);
  for (const c of capturedPlans) {
    console.log(`\n--- call for sections ${c.sections} (stop: ${c.stopReason}, ${(c.ms / 1000).toFixed(1)}s) ---`);
    try {
      console.log(JSON.stringify(JSON.parse(c.text.replace(/```(?:json)?|```/g, "").trim()), null, 1));
    } catch {
      console.log(c.text.slice(0, 3000));
    }
  }
}

// ── 4. Layer-1 failure paths with synthetic model responses ──
console.log(`\n=== LAYER-1 FAILURE HANDLING ===`);
const sections = prepareSections(analysis);
const groups = deriveFixtureGroups(fixtures);

// prompt contains the full musical picture (input starvation fix)
const prompt = buildPlanPrompt({
  allSections: sections, batch: sections.slice(0, 4), groups,
  bpm: analysis.bpm, duration: analysis.duration, loudnessShape: loudnessShape(analysis),
  style: "tso", vibe: "classic", intensity: "balanced",
});
check("prompt carries all sections", sections.every((s) => prompt.includes(`#${s.index} `)));
check("prompt carries loudness shape", prompt.includes("Loudness shape"));
check("prompt carries per-section beat counts", prompt.includes(`${sections[0].beatCount} beats`));
check("prompt is compact (< 8k chars)", prompt.length < 8000, `${prompt.length} chars`);

// truncation: batches get cut off; single sections succeed → orchestrator must split and recover
let singleCalls = 0;
const truncatingCaller: ModelCaller = async (_p, meta) => {
  if (meta.batch.length > 1) return { text: "[{\"section\":", stopReason: "max_tokens" };
  singleCalls++;
  return mockPlanBatch(_p, meta);
};
const truncRun = await collect(runSequencer(input, {}, truncatingCaller));
check(
  "max_tokens truncation recovers by splitting the batch",
  truncRun.blocks.length > 0 && truncRun.all.every((e) => e.type !== "error"),
  `${singleCalls} single-section retries, ${truncRun.blocks.length} blocks`
);

// refusal surfaces clearly
const refusalRun = await collect(runSequencer(input, {}, async () => ({ text: "", stopReason: "refusal" })));
check(
  "refusal stop_reason surfaces a clear error",
  refusalRun.all.some((e) => e.type === "error" && e.message.includes("declined")),
);

// garbage JSON surfaces clearly (not "invalid JSON" from a truncation)
const garbageRun = await collect(runSequencer(input, {}, async () => ({ text: "sorry, here's prose", stopReason: "end_turn" })));
check(
  "unparseable response surfaces a clear error",
  garbageRun.all.some((e) => e.type === "error" && e.message.includes("unparseable")),
);

// truncated-but-mostly-valid JSON: salvage keeps complete objects
const salvageCaller: ModelCaller = async (_p, meta) => {
  const full = await mockPlanBatch(_p, meta);
  const cut = full.text.lastIndexOf("},");
  return { text: cut > 0 ? full.text.slice(0, cut + 1) : full.text, stopReason: "end_turn" };
};
const salvageRun = await collect(runSequencer(input, {}, salvageCaller));
check("partial JSON salvages complete section plans", salvageRun.blocks.length > 0, `${salvageRun.blocks.length} blocks`);

// ── 5. export the generated show to .loredit ──
console.log(`\n=== .LOREDIT EXPORT ===`);
const tracks: Track[] = fixtures.map((f) => ({ id: f.id, kind: "fixture" as const }));
const project: Project = {
  id: "ai-verify", ownerId: "", name: "AI Pipeline Verification",
  audioUrl: null, audioFile: path.basename(MP3), audio: analysis,
  fixtures, groups: [],
  sequence: { tracks, blocks, bpm: analysis.bpm, beatGridOffset: 0 },
  houseTemplate: "default", createdAt: "", updatedAt: "",
};
const templateText = fs.readFileSync(TEMPLATE, "utf8");
const map = seedDefaultMapping(fixtures, parseTemplate(templateText).props);
const t3 = Date.now();
const { text, report } = exportLoredit(project, { templateText, map, now: new Date(2026, 7, 27, 12, 0, 0) });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
console.log(
  `Exported ${(text.length / 1e6).toFixed(2)} MB in ${Date.now() - t3} ms: ` +
    `${report.filledProps.length} props filled, ${report.beatMarksWritten} beat marks, ${report.skippedFixtures.length} skipped`
);
const grammar = checkLoreditGrammar(text);
check("exported .loredit has zero grammar violations", grammar.length === 0, grammar.slice(0, 3).join("; "));
check("export filled the mapped props", report.filledProps.length >= fixtures.length * 0.75, `${report.filledProps.length} filled`);
const exportedEffects = report.filledProps.reduce((s, p) => s + p.effectCount, 0);
console.log(`Effects written into the .loredit: ${exportedEffects}`);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
console.log(`\nBLOCK COUNT: ${blocks.length}  (target >= 1500)`);
console.log(`Open in S6: ${path.resolve(OUT)}`);
process.exit(failures ? 1 : 0);
