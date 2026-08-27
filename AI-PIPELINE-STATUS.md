# AI Sequencer Pipeline — Status

**Date:** 2026-08-27
**Goal:** close the ~30× density gap (60–100 sparse blocks → professional-scale
sequences) by splitting generation into AI musical direction + deterministic
expansion.

## What changed

The old pipeline asked the model to emit effect blocks directly — token limits
capped it around 60–100 blocks, and it saw only the first 20 beat timestamps.
Both problems are gone; generation is now two layers:

**Layer 1 — musical direction (AI).** One model call per batch of ≤4 song
sections. The model returns a compact JSON plan per section: energy, which
fixture *groups* are active, effect + palette + rhythm
(sustained / every-beat / every-2-beats / downbeats / offbeats) + movement
(unison / chases / stagger / alternate / center-out) per group, and a
transition (flash / sweep / blackout). A few hundred tokens per section.
Files: `src/lib/ai/sequencer/{schema,prompt,sections,groups}.ts`.

**Layer 2 — deterministic expansion (code).** Each plan expands into real
effect blocks: chases and staggers across the fixtures of a group, phrase
splitting for sustained beds, per-pulse accent distribution, transitions.
**Every block start is a real detected beat** — no extrapolated grids. A
density ceiling (6,000 blocks) thins accents uniformly, never the sustained
bed. File: `src/lib/ai/sequencer/expander.ts`, orchestrated by
`orchestrator.ts` (batching, truncation retry, salvage, streaming).

### Input starvation fixed

The prompt now carries the full musical picture, condensed: every section with
its beat/bar counts, loudness avg/peak, onset density, and per-beat bass/high
spectral means, plus a 20-point loudness envelope of the whole song. (Whole
prompt ≈ 4.7k chars for a 5.4-minute song.) Sections themselves got smarter:
slivers are merged, overlong sections are split at bar boundaries (~24 s
chunks) — a steady-loudness song used to collapse into ONE 5-minute section —
and split chunks are relabeled verse/chorus by loudness.

### Robustness (all verified by running code)

- `stop_reason: "max_tokens"` is handled explicitly: a truncated batch is
  split in half and retried; a single section that still truncates surfaces a
  clear error (no more "AI returned invalid JSON" for truncation).
- `stop_reason: "refusal"` surfaces a clear error.
- Truncated/partial JSON is salvaged object-by-object with a balanced-brace
  scanner; invalid section or group entries are dropped individually (zod).
- Unknown group keys from the model are ignored and reported, never fatal.

### Silent mock killed

`getAIProvider()` now **throws** without `ANTHROPIC_API_KEY`; the generate
route returns 503 with the message. The mock survives only behind the explicit
`AI_USE_MOCK=1` env flag, announces itself with a `{type:"mode", mock:true}`
event, and the AI panel renders an amber "Mock mode" banner. The mock replaces
only the model call (deterministic section plans); parsing, validation,
expansion, and streaming are the same code the real provider runs.

### Model call

`claude-opus-5` via direct fetch (this project deliberately has no SDK dep),
adaptive thinking (default — no `thinking` param), `max_tokens: 16000`,
server-side refusal fallbacks enabled
(`anthropic-beta: server-side-fallback-2026-07-01`, `fallbacks: "default"`).

### Streaming & editor integration (kept, per the audit)

SSE stream, per-block salvage, and store patching are reused. Blocks now
stream in batches of 100, and the store gained a bulk `addBlocks` setter so a
3,000-block generation is a handful of store updates instead of thousands.
A refine pass **replaces** the previous AI-generated blocks (dense generation
made additive refinement wrong); Undo still removes the whole generation.

## Actual density achieved (measured, not estimated)

Run: `npx tsx scripts/ai/verify-pipeline.mts` — end-to-end against a REAL
song ("Christmas Lights And Zero Regrets.mp3", 326 s, decoded with a pure-JS
decoder, analyzed by the real `analyzeChannelData`):

- Detected: 83 BPM, 451 beats, 1,879 onsets → 15 sections after normalization
- **2,925 blocks generated** across 20 fixtures (target ≥ 1,500)
- **100% of block starts land exactly on detected beats**
- All 20 fixtures participate (124–204 blocks each; per-fixture table in the
  script output)
- Exported to `.loredit` through the real exporter: 20 props filled, 451 beat
  marks, **zero grammar violations**

Old pipeline on the same input: ~60–100 blocks. Gap closed: ~30–50×.

## The file to open in S6

```
C:\Users\glenh\Documents\LightCanvas\AppRepo\scripts\loredit-spike\test-fixtures\output\ai-pipeline-export.loredit
```

A full AI-generated (mock-planned) show on the RGBPlus layout: mini trees,
arches, roofline AC, mega tree, with the real song's beats as the
"LightCanvas Beats" timing grid.

## What's stubbed / simplified

- **Layer 1 in the verification run is the deterministic mock planner** — this
  machine has no `ANTHROPIC_API_KEY` (see Unverified below). The mock produces
  schema-valid plans through the identical downstream path.
- Rhythm vocabulary is beat-grid-based ("offbeats" = the backbeat, index %4==2,
  not true syncopation); the beat grid itself is still the detector's rigid
  metronome fit.
- Movement "stagger" is a simplified pulse-shift, not per-pixel phase offsets.
- No lip-sync / singing-face planning (separate job, per instructions).
- Refinement regenerates the whole show with the refinement text in the
  prompt; it does not do targeted edits of existing blocks.

## What's unverified

1. **A live `claude-opus-5` call end to end.** No API key on this machine —
   the exact machine where the old silent mock was masquerading as real AI.
   The request shape follows current API docs (adaptive thinking default,
   fallbacks beta), and every failure path (truncation, refusal, bad JSON) is
   exercised with synthetic responses, but the real round trip needs a key:
   set `ANTHROPIC_API_KEY` in `.env.local` and in Vercel, then generate from
   the AI panel — or re-run the verify script after exporting the key.
2. **Real-model plan quality** — whether Opus 5's musical judgment beats the
   mock's rotation heuristics (it should; the prompt gives it everything).
3. **Vercel function duration** — sequential batch planning (2–6 model calls)
   inside one streaming route may need a `maxDuration` bump in production.
4. **Timeline UI feel at 3,000 blocks** — bulk insert is one store update, but
   rendering thousands of blocks in the timeline hasn't been profiled.
5. **S6 opening `ai-pipeline-export.loredit`** — same manual step as the
   exporter's own pending test.

## Where things live

- Sequencer: `src/lib/ai/sequencer/` (`schema.ts`, `groups.ts`, `sections.ts`,
  `prompt.ts`, `expander.ts`, `orchestrator.ts`)
- Providers: `src/lib/ai/anthropic-provider.ts` (thin model caller),
  `src/lib/ai/mock-provider.ts` (explicit dev mock), `src/lib/ai/index.ts`
  (loud failure without key)
- Route: `src/app/api/ai/generate/route.ts` (503 on missing key; SSE kept)
- UI: `src/components/AIPanel.tsx` (mock banner, bulk apply, refine-replaces)
- Store: `addBlocks` bulk setter in `src/lib/store/editor-store.ts`
- Analysis: `analyzeChannelData` split out of `analyzeAudio`
  (`src/lib/audio/beat-detector.ts`) so Node can run the real analysis
- Verification: `scripts/ai/verify-pipeline.mts` (deps: `audio-decode`, dev-only)
