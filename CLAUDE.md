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
| `/project/[id]/layout` | Layout editor: photo upload, prop placement |
| `/timeline?project=` | Timeline editor: effect blocks, beat snap, undo/redo |
| `/designer` | Redirects into the loaded project |
| `/dev/stage`, `/dev/visualizer-v2` | Dev harnesses (404 in prod) |

API: `projects` (list/create/get/patch/delete/duplicate), `autosave`,
`audio/[projectId]`, `import`, `upload-audio`, `upload-house-photo`,
`upload-depth-map`, `ai/generate` (SSE). All Clerk-free; new rows use
`owner_id: "local"`, new uploads use a `local/{projectId}/` storage prefix.

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
- **Verify by running code, not by reasoning about it.** The verify scripts
  above exist for exactly this.
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
the dev server, opens the browser; handles a busy port 3000). His guide is
WALKTHROUGH.md (plain English — keep it truthful when the UI changes), with
a text copy on his Desktop. The one DB project is "My Christmas Show 2026"
(his imported 84-prop display). UI copy is deliberately jargon-free:
"Your Lights", "Make a Show", "lighting moves" — keep new UI text in that
register.

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

- `.loredit` output not yet opened in S6 (the manual acceptance test) —
  exact files to open are named in LOREDIT-EXPORT-STATUS.md,
  AI-PIPELINE-STATUS.md, and LAYOUT-IMPORT-STATUS.md.
- Imported props carry real traced shapes (preview renders them), but there
  is still no UI to hand-trace a NEW shape on the photo, and imported shapes
  reposition by drag only — no scale/rotate.
- Pixel props export as colorwash only; curtain/bars settings grammar
  unverified.
- No lip-sync for the singing faces (deliberate — separate job).
- ANTHROPIC_API_KEY + `maxDuration` not yet set in Vercel prod.
