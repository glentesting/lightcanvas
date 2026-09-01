/**
 * Copy / paste-at-beat / repeat-every-bar, checked by running them.
 *
 * These are the operations a real sequence is built from, so the things that
 * matter are: paste lands ON a beat, repeat lands ON bar lines and does not
 * drift over many copies, nothing is written past the end of the song, and a
 * whole repeat is a single undo step.
 *
 * Usage: npx tsx scripts/verify-timeline-edit.mts
 */
import {
  barSeconds,
  toClipboard,
  pasteAt,
  repeatSelection,
  repeatCount,
  nearestBeat,
} from "../src/lib/timeline/repeat";
import { useEditorStore } from "../src/lib/store/editor-store";
import type { EffectBlock } from "../src/lib/timeline/types";
import type { AudioAnalysis } from "../src/lib/audio/types";
import type { Project } from "../src/types/domain";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

/* ── a song shaped like a real one: 120 BPM, 3 minutes ── */
const BPM = 120;
const BEAT = 60 / BPM;              // 0.5s
const DURATION = 180;
const beats = Array.from({ length: Math.floor(DURATION / BEAT) }, (_, i) => i * BEAT);
const analysis = {
  duration: DURATION,
  bpm: BPM,
  beats,
  downbeats: beats.filter((_, i) => i % 4 === 0),
  onsets: [],
  loudness: [],
} as unknown as AudioAnalysis;

const mkBlock = (trackId: string, start: number, duration: number, id = `b-${start}-${trackId}`): EffectBlock => ({
  id, trackId, effectId: "chase", start, duration,
  params: { color1: "#ff0000", intensity: 0.8, speed: 1, easing: "linear" },
});

/* ── bar length ── */
console.log("── how long is a bar ──");
const bar = barSeconds(analysis);
check("a bar of a 120 BPM song is 2 seconds", Math.abs(bar - 2) < 1e-6, `${bar}s`);
check("with no analysis at all it still gives a sane bar", Math.abs(barSeconds(null) - 2) < 1e-6);
// a song whose downbeats disagree with the stated tempo: trust the downbeats
const oddDownbeats = { ...analysis, bpm: 120, downbeats: [0, 3, 6, 9, 12] } as unknown as AudioAnalysis;
check("detected downbeats win over the stated tempo", Math.abs(barSeconds(oddDownbeats) - 3) < 1e-6,
  `${barSeconds(oddDownbeats)}s`);

/* ── copy / paste ── */
console.log("\n── copy and paste at the playhead ──");
const phrase = [mkBlock("t1", 4, 1), mkBlock("t2", 4.5, 1), mkBlock("t1", 5, 0.5)];
const clip = toClipboard(phrase);
check("the copied span keeps its shape", clip.entries.map((e) => e.offset).join(",") === "0,0.5,1",
  clip.entries.map((e) => e.offset).join(","));
check("the span length is measured end to end", Math.abs(clip.span - 1.5) < 1e-9, `${clip.span}`);

const tracksPresent = new Set(["t1", "t2"]);
// playhead deliberately off the beat
const pasted = pasteAt(clip, 40.17, beats, tracksPresent, DURATION);
check("paste puts three moves back", pasted.blocks.length === 3);
const firstStart = Math.min(...pasted.blocks.map((b) => b.start));
check("the paste lands exactly ON a beat", beats.some((b) => Math.abs(b - firstStart) < 1e-9),
  `landed at ${firstStart}`);
check("paste snapped to the NEAREST beat, not the playhead", Math.abs(firstStart - 40) < 1e-9, `${firstStart}`);
check("the moves keep their spacing after pasting",
  pasted.blocks.map((b) => +(b.start - firstStart).toFixed(6)).join(",") === "0,0.5,1",
  pasted.blocks.map((b) => b.start - firstStart).join(","));
check("pasted moves get fresh ids", new Set(pasted.blocks.map((b) => b.id)).size === 3 &&
  !pasted.blocks.some((b) => phrase.some((p) => p.id === b.id)));
check("pasted moves go back on the rows they came from",
  pasted.blocks.map((b) => b.trackId).join(",") === "t1,t2,t1");

// The real test: detected beats are NOT evenly spaced (they are where the
// drums actually hit), so a paste that only anchors its first block leaves the
// rest of the phrase sitting between beats.
const jitter = beats.map((b, i) => (i === 0 ? 0 : b + ((i * 37) % 11) * 0.011));
const jitterPaste = pasteAt(clip, 40.17, jitter, tracksPresent, DURATION);
const worstPasteOffset = Math.max(
  ...jitterPaste.blocks.map((b) => Math.min(...jitter.map((x) => Math.abs(x - b.start))))
);
check("on a real, uneven beat grid EVERY pasted move lands on a beat",
  worstPasteOffset < 1e-9, `worst ${worstPasteOffset.toFixed(4)}s off the beat`);
check("pasted moves stay in their original order",
  jitterPaste.blocks.every((b, i) => i === 0 || b.start >= jitterPaste.blocks[i - 1].start),
  jitterPaste.blocks.map((b) => b.start.toFixed(3)).join(","));

const jitterRepeat = repeatSelection(
  [mkBlock("t1", 8, 1), mkBlock("t2", 8.4, 1)],
  { everyBars: 1, times: 20, bar, beats: jitter, maxTime: DURATION }
);
const worstRepeatOffset = Math.max(
  ...jitterRepeat.map((b) => Math.min(...jitter.map((x) => Math.abs(x - b.start))))
);
check("on a real, uneven beat grid EVERY repeated move lands on a beat",
  worstRepeatOffset < 1e-9, `worst ${worstRepeatOffset.toFixed(4)}s off the beat`);

const partial = pasteAt(clip, 40, beats, new Set(["t1"]), DURATION);
check("a row that no longer exists is reported, not silently dropped",
  partial.blocks.length === 2 && partial.droppedTracks === 1,
  `${partial.blocks.length} pasted, ${partial.droppedTracks} dropped`);

const nearEnd = pasteAt(clip, DURATION - 0.4, beats, tracksPresent, DURATION);
check("nothing is written past the end of the song",
  nearEnd.blocks.every((b) => b.start + b.duration <= DURATION),
  nearEnd.blocks.map((b) => `${b.start}+${b.duration}`).join(" "));

/* ── repeat every bar ── */
console.log("\n── repeat every bar ──");
const one = [mkBlock("t1", 8, 1)];
const opts = { everyBars: 1, times: 7, bar, beats, maxTime: DURATION };
const repeated = repeatSelection(one, opts);
check("seven more copies", repeated.length === 7, `${repeated.length}`);
check("the count shown on the button matches what is made",
  repeatCount(one, opts) === repeated.length, `${repeatCount(one, opts)} vs ${repeated.length}`);
check("copies sit one bar apart",
  repeated.map((b) => b.start).join(",") === "10,12,14,16,18,20,22",
  repeated.map((b) => b.start).join(","));
check("every copy sits on a beat",
  repeated.every((b) => beats.some((x) => Math.abs(x - b.start) < 1e-9)));

// the drift test: a bar length that does NOT divide evenly, repeated many times
const driftBar = 2.031;
const drifted = repeatSelection(one, { everyBars: 1, times: 60, bar: driftBar, beats, maxTime: DURATION });
const worstOffBeat = Math.max(...drifted.map((b) => Math.abs(b.start - nearestBeat(b.start, beats))));
check("60 repeats with an imperfect bar length never drift off the beat",
  worstOffBeat < 1e-9, `worst offset ${worstOffBeat}`);

const every4 = repeatSelection(one, { everyBars: 4, times: 3, bar, beats, maxTime: DURATION });
check("every 4 bars spaces copies 8 seconds apart",
  every4.map((b) => b.start).join(",") === "16,24,32", every4.map((b) => b.start).join(","));

const clipped = repeatSelection(one, { everyBars: 1, times: 500, bar, beats, maxTime: DURATION });
check("a repeat that would overrun the song stops at the end",
  clipped.every((b) => b.start + b.duration <= DURATION) && clipped.length < 500,
  `${clipped.length} made, last ends at ${Math.max(...clipped.map((b) => b.start + b.duration))}`);

// a multi-row selection repeats as one shape
const chord = [mkBlock("t1", 8, 1), mkBlock("t2", 8.5, 1)];
const chordRepeat = repeatSelection(chord, { everyBars: 1, times: 2, bar, beats, maxTime: DURATION });
check("a multi-row selection repeats as one shape",
  chordRepeat.map((b) => `${b.trackId}@${b.start}`).join(",") === "t1@10,t2@10.5,t1@12,t2@12.5",
  chordRepeat.map((b) => `${b.trackId}@${b.start}`).join(","));

/* ── one undo step for the whole repeat ── */
console.log("\n── undo ──");
const project: Project = {
  id: "p", ownerId: "", name: "t", audioUrl: null, audioFile: null, audio: analysis,
  fixtures: [
    { id: "t1", kind: "arch", name: "Arch 01", pixelCount: 25, startChannel: 1 },
    { id: "t2", kind: "arch", name: "Arch 02", pixelCount: 25, startChannel: 1 },
  ],
  groups: [],
  sequence: {
    tracks: [{ id: "t1", kind: "fixture" }, { id: "t2", kind: "fixture" }],
    blocks: [...one], bpm: BPM, beatGridOffset: 0,
  },
  houseTemplate: "default", createdAt: "", updatedAt: "",
};
useEditorStore.getState().loadProject(project);
await new Promise((r) => setTimeout(r, 10));
const before = useEditorStore.getState().sequence.blocks.length;
useEditorStore.getState().addBlocks(repeatSelection(one, opts));
const after = useEditorStore.getState().sequence.blocks.length;
check("the repeat landed in the sequence", after === before + 7, `${before} → ${after}`);
useEditorStore.temporal.getState().undo();
check("ONE undo removes the whole repeat",
  useEditorStore.getState().sequence.blocks.length === before,
  `${useEditorStore.getState().sequence.blocks.length} blocks`);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
