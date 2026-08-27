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
decoder, analyzed by the real `analyzeChannelData`). The script auto-detects
`ANTHROPIC_API_KEY` in `.env.local` and uses the **real `claude-opus-5`
planner** when present (2026-08-27: verified live).

Live-model run (4 API calls, 12–18 s each, all `end_turn`, zero salvage):

- Detected: 83 BPM, 451 beats, 1,879 onsets → 15 sections after normalization
- **1,907 blocks generated** across 20 fixtures (target ≥ 1,500)
- **100% of block starts land exactly on detected beats**
- All 20 fixtures participate (33–299 blocks each — and unevenly on purpose:
  the model leans on the roofline for every-beat chases and uses the
  mega-tree as a sustained bed)
- Plan quality is genuinely musical: intro at energy 0.25 (mega-tree fade +
  window twinkle only), verses 0.42→0.55 layering 3–4 groups, choruses 0.78–0.82
  layering 5 (wash bed + every-beat mini-tree chase + arch waves + downbeat
  roofline strobes + window pulses), flash/sweep transitions at boundaries
- Exported to `.loredit` through the real exporter: 20 props filled, 451 beat
  marks, **zero grammar violations**

Mock planner on the same input: 2,925 blocks (denser but mechanically
rotated; the model trades raw count for contrast and restraint).
Old pipeline on the same input: ~60–100 blocks. Gap closed: ~20–30×.

The first live run landed at 1,338 blocks — under target — because the
expander swept traveling chases one fixture per beat (5.8 s to cross 8 props
at 83 BPM). Chases now move a ⌈n/4⌉-wide front so a sweep completes about
once per bar; that plus stronger chorus-layering prompt guidance brought the
live result to 1,907.

## The file to open in S6

```
C:\Users\glenh\Documents\LightCanvas\AppRepo\scripts\loredit-spike\test-fixtures\output\ai-pipeline-export.loredit
```

A full **live-Opus-5-planned** show on the RGBPlus layout: mini trees, arches,
roofline AC, mega tree, with the real song's beats as the "LightCanvas Beats"
timing grid.

## What's stubbed / simplified

- Rhythm vocabulary is beat-grid-based ("offbeats" = the backbeat, index %4==2,
  not true syncopation); the beat grid itself is still the detector's rigid
  metronome fit.
- Movement "stagger" is a simplified pulse-shift, not per-pixel phase offsets.
- No lip-sync / singing-face planning (separate job, per instructions).
- Refinement regenerates the whole show with the refinement text in the
  prompt; it does not do targeted edits of existing blocks.

## What's verified live (2026-08-27)

- **Real `claude-opus-5` planning end to end** — key set in `.env.local`
  (note: the pasted key carried invisible U+200B zero-width characters that
  broke env parsing; they've been stripped from the file). 4 sequential calls,
  all `end_turn`, valid JSON every time, zero salvage needed, ~60 s total
  planning time.
- Full chain: real MP3 → real analysis → live plans → deterministic expansion
  → 1,907 beat-snapped blocks → `.loredit` export with zero grammar
  violations.

## What's still unverified

1. **The key in Vercel prod** — set it there too, and expect the streaming
   route to need a `maxDuration` bump (planning alone is ~60 s for 4 batches;
   sequential calls inside one serverless invocation).
2. **Generation through the actual AI panel UI** (the verify script drives the
   same orchestrator, but the browser SSE round trip hasn't been watched).
3. **Timeline UI feel at ~2,000 blocks** — bulk insert is one store update,
   but rendering thousands of blocks in the timeline hasn't been profiled.
4. **S6 opening `ai-pipeline-export.loredit`** — same manual step as the
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
