# LightCanvas — Claude Code Briefing

## What this is

**A personal tool for one user (Glen) to design, preview, and export a
synchronized Christmas light show for his own house.** Not a product. No
auth, no billing, no marketing, no second user. Upload an MP3, detect beats,
sequence effects (by hand on the timeline or with the AI sequencer), preview
on a photo of the house, export a `.loredit` file that LOR S6 opens and the
G4-MP3 Director plays.

## Authoritative docs (read the relevant one before working)

- `LIGHTCANVAS-HARDWARE-REFERENCE.md` — the physical show: controllers, unit
  IDs, port→prop map, the `.loredit` format, file locations. If it isn't in
  there, it isn't settled.
- `AUDIT-2026-08.md` — the honest audit that set the current direction.
- `LOREDIT-EXPORT-STATUS.md` — exporter: what works, what's unverified.
- `AI-PIPELINE-STATUS.md` — AI sequencer: architecture, measured density.
- `CLEANUP-STATUS.md` — what was deleted and what routes remain.
- `LAYOUT-IMPORT-STATUS.md` — importing the owner's display from a .loredit.
- `LAYOUT-GEOMETRY-STATUS.md` — exact coro prop shapes, tracing, bulk placement.
- `GAP-ANALYSIS.md` — ranked gaps vs. real sequencing needs (2026-08-29).
- `EDITOR-UPGRADE-STATUS.md` — the one-renderer unification, timeline transport, marquee.

Keep these truthful: when a session changes what works, update the matching
status doc in the same commit.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Supabase (Postgres +
Storage, service-role key, no RLS reliance) · Zustand + immer + zundo ·
WaveSurfer.js v7 · dnd-kit · three (photo night-stage) ·
@huggingface/transformers (client-side depth estimation) · zod ·
Tailwind CSS 4 (light mode only).

No auth (Clerk removed 2026-08-27 — single user). No `@anthropic-ai/sdk`
(direct fetch). No `jszip` (hand-rolled ZIP in `src/lib/exports/zip.ts`).
Beat detection is hand-rolled (`src/lib/audio/beat-detector.ts`).

## Routes (all real — nothing fake is allowed to exist)

| Route | What |
|---|---|
| `/` → `/projects` | Project list: open, create, delete |
| `/project/[id]` | The editor: photo night-stage preview, props, AI panel, Export button, working play bar (audio-driven transport) |
| `/project/[id]/layout` | Layout editor: photo upload, exact coro prop shapes, identity colors, marquee multi-select + bulk delete, click-to-trace roof strings, "Place a Row", real Night Preview (ShowCanvas) |
| `/timeline?project=` | Timeline editor: live show preview strip, playhead + follow-scroll + ruler seek, effect blocks, beat snap, undo/redo |
| `/designer` | Redirects into the loaded project |
| `/dev/stage`, `/dev/visualizer-v2` | Dev harnesses (404 in prod) |

API: `projects` (list/create/get/patch/delete/duplicate), `autosave`,
`audio/[projectId]`, `import`, `upload-audio`, `upload-house-photo`,
`upload-depth-map`, `ai/generate` (SSE). All Clerk-free; new rows use
`owner_id: "local"`, new uploads use a `local/{projectId}/` storage prefix.

## The display model (load-bearing contracts)

- **ONE renderer.** `src/components/stage/ShowCanvas.tsx` (2D canvas over
  `expandFixturePixels` + `renderFrame`) draws the show everywhere: timeline
  preview strip, designer no-photo fallback, layout editor Night Preview.
  The three.js photo night-stage reads the same `expandFixturePixels`.
  Idle = identity colors (`src/lib/fixtures/identity.ts` — the ONLY prop
  color table); playing = engine colors. Never add another draw path.
- **Transport is shared.** WaveSurfer (timeline) and the designer play bar
  publish to `useTransportStore`; `registerSeekHandler`/`requestSeek` route
  seeks to whoever owns the audio. The timeline has a playhead,
  follow-scroll, and ruler click-to-seek built on this.
- **Tree+star pairing**: a star's position is DERIVED from its paired tree
  (`starFrameFor`/`pairIndexOf` in coro-shapes) — one visual prop, two
  circuits. Paired stars don't drag and are excluded from Place a Row.
- **Short display names** ("Tree 01", "Stake 12", Elden/Felix/Ralphie/Zuzu)
  are set at import (`shortNameFor`) and were migrated onto the live
  project; `lor.propName` still carries the template name for export.

- **`Fixture.lor`** is set on fixtures imported from a `.loredit`:
  `{ propId, propName, stringType, network, unit, startCircuit, channelCount }`.
  `lor.propName` is the export-mapping key (mirrored in
  `sequence.loreditPropMap[fixtureId]`) and must NEVER change on rename —
  `fixture.name` is the free display name (e.g. the 16 unit-01 AC circuits
  display as "Roof Light String NN" / whatever the owner renames them to).
- **`geometry.coroShape`** (`"tiered-tree" | "star5" | "arch" | "stake"`)
  selects exact coroplast geometry from `src/lib/fixtures/coro-shapes.ts` —
  the single source for both shape AND pixel wiring order, feeding
  `expandFixturePixels` (preview + effects) and the layout editor outlines.
  Mini tree = 10 horizontal rows (3 top → 13 bottom), wired bottom-first
  serpentine so chases climb in bands; arch = semicircle wired leg→top→leg;
  stake = 5 stacked pixels; star = 20 around a 5-point outline. Chase
  direction is engine-verified — don't change ordering without re-running
  `npx tsx scripts/loredit/verify-coro-geometry.mts`.
- **Shapes without a coroShape** render as multi-point polylines when
  `layout.points.length >= 2` (traced roof strings, imported face outlines),
  else kind-based defaults. The layout editor has click-to-trace (inspector
  → "Trace where it runs on the photo") and "Place a Row" bulk placement
  (distributes a category evenly along a drawn line, in numeric order).
- **Wiring conflicts**: LOR fixtures conflict only within the same
  network+unit on overlapping circuit ranges. Never compare raw start
  channels across units — that false-positived 1,562 "overlaps" once.
  Non-LOR fixtures keep the legacy universe/channel check among themselves
  (`LayoutEditor.tsx` issuesList and `src/lib/exports/validation.ts`).
- **AC/DumbRGB display vs wire**: channel props carry display bulbs for
  their outline (`pixelCount`), but the wire truth is `lor.channelCount`
  (1 or 3) — the preview can animate per-bulb where the hardware dims as
  one unit; export uses envelopes, so nothing false is exported.

## The three pipelines that matter

**Layout import (`src/lib/imports/loredit-layout.ts`):** "Import from
Light-O-Rama" in the Layout editor parses a template's PreviewClass into a
grouped picker (the owner's 84 props pre-selected), creates fixtures with
real pixel counts, unit/circuit addressing (`Fixture.lor`), and traced
shapes, and auto-populates `sequence.loreditPropMap` — export mapping is a
review step, not data entry. Verify with
`npx tsx scripts/loredit/verify-layout-import.mts`.


**Export (`src/lib/exports/loredit/`):** template-fill. User supplies a
`.loredit` (paid content — globally gitignored, never committed, never
hardcoded); PreviewClass/TimingGrids kept verbatim, effects replaced via a
fixture→prop mapping persisted on `sequence.loreditPropMap`. The
channel/track grammar rule is absolute (see the hardware doc §6). Verify
with `npx tsx scripts/loredit/verify-roundtrip.mts` and `verify-export.mts`.

**AI sequencer (`src/lib/ai/sequencer/`):** two layers. Layer 1
(`claude-opus-5`, one call per ≤4 sections) returns compact musical plans;
Layer 2 deterministically expands them into beat-snapped blocks. No key →
loud 503 (never a silent mock; `AI_USE_MOCK=1` is the explicit, UI-labeled
dev mock). Verify with `npx tsx scripts/ai/verify-pipeline.mts`.

## Working rules

- **Light mode only.**
- **TypeScript clean** (`npx tsc --noEmit`) and **build passes**
  (`npx next build`) before marking anything done.
- **Verify by running code, not by reasoning about it.** The suites (all
  `npx tsx ...`, all must pass before commit):
  `scripts/loredit/verify-roundtrip.mts` (byte-identical .loredit round-trip),
  `verify-export.mts` (template fill + grammar), `verify-layout-import.mts`
  (84-prop import + auto-mapping + export), `verify-coro-geometry.mts`
  (prop shapes + engine-level chase direction), and
  `scripts/ai/verify-pipeline.mts` (AI sequencer end-to-end, real audio;
  uses the real API when ANTHROPIC_API_KEY is present). They need the
  gitignored reference file in `scripts/loredit-spike/test-fixtures/`.
- **Never commit** `.loredit` files, MP3s, or template content (gitignored).
- **No dead buttons, no fake data.** If a control can't work yet, it doesn't
  render. This confusion is why the project stalled once.
- **Show a plan before touching the DB.**
- The acceptance test for anything export-related is: LOR S6 v6.6.12 opens
  the file.

## Commands

```bash
cd "C:/Users/glenh/Documents/LightCanvas/AppRepo"
npm run dev      # Dev server (or .claude/launch.json "dev")
npm run build    # Production build
npx tsc --noEmit # Type check
npm run lint     # ESLint (baseline: 3 warnings in scripts/loredit-spike)
```

The owner starts the app via `Start LightCanvas.bat` on his Desktop (starts
the dev server, opens the browser; handles a busy port 3000) — **check
whether his server already holds port 3000 before starting your own**. His
guide is WALKTHROUGH.md (plain English — keep it truthful when the UI
changes), with a text copy on his Desktop ("LightCanvas - How To.txt";
regenerate it when WALKTHROUGH.md changes). The one DB project is
"My Christmas Show 2026" (his imported 84-prop display, his house photo,
his music, a real AI-generated show) — treat it as his real data, not test
data. UI copy is deliberately jargon-free: "Your Lights", "Make a Show",
"lighting moves" — keep new UI text in that register.

## Git

- Remote: https://github.com/glentesting/lightcanvas (old `lightshow` URL redirects)
- Branch: main

## Environment (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY   (AI generation fails loudly without it)
AI_USE_MOCK=1       (optional: explicit deterministic mock planner)
```

Beware invisible characters when pasting keys — a U+200B in a pasted value
once broke env parsing here.

## Known gaps (honest list)

- `.loredit` output not yet opened in S6 (THE manual acceptance test, still
  outstanding) — the files to open sit in
  `scripts/loredit-spike/test-fixtures/output/`
  (`lightcanvas-export-test.loredit`, `ai-pipeline-export.loredit`,
  `layout-import-export.loredit`); details in the matching status docs.
- No scale/rotate on prop shapes; the tree silhouette is stylized, not a
  photo-match of the coro cutout (pixel positions are the accurate part).
- Pixel props export as colorwash only; curtain/bars settings grammar
  unverified in S6.
- A chase on a traced AC roof string animates per-bulb in the preview but
  exports as a single dim envelope (one channel on the wire — the Wiring
  tab says so).
- No lip-sync for the singing faces (deliberate — separate job; the ~51
  FaceV2 mouth/eye sub-props stay unimported by default).
- The beat analysis after audio upload blocks the page for a minute or two
  (naive DFT on the main thread); WALKTHROUGH.md warns him.
- ANTHROPIC_API_KEY + `maxDuration` not yet set in Vercel prod (the key IS
  in local `.env.local`; live Opus 5 generation verified locally).
- The owner's project holds 83 of the 84 imported props — he deleted
  "Roof Light String 15" himself; re-import with "Add alongside" restores it.
- Preview shows 10 effect types but pixel props export as colorwash — the
  what-you-see-vs-what-exports gap is #2 on GAP-ANALYSIS.md's follow-ups.
