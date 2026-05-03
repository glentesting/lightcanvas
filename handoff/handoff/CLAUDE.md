# Lumen — Claude Code Build Plan

You are continuing work on **Lumen**, a web app that lets people design synchronized Christmas-light shows the way they'd edit video in Premiere — drop an MP3 on a timeline, drag effect blocks onto fixture tracks, preview the show against an SVG of their house, and export a sequence file that xLights can play through their controller.

A working visual prototype was designed and approved. The interaction patterns, layout, color system, and information architecture are decided. **Your job is to implement the real, functional product on top of an existing scaffold.**

The user already has a Next.js + Clerk + Supabase scaffold running locally. Auth works. Projects save to a database. A basic editor shell exists. **Build on top of what's there. Do not start from scratch. Do not regenerate auth or scaffolding.**

---

## Stack (already set up — do not change)

- **Next.js 14+** with App Router, TypeScript, server actions
- **Tailwind CSS** + **shadcn/ui** for components
- **Clerk** for auth
- **Supabase** Postgres for data + Storage for audio files
- **Light mode only**, throughout the entire app

## Stack (you'll add)

- **Zustand** for editor state (chosen because the editor has lots of fast-changing state — playhead, drag previews, hover — that should not round-trip through React Query)
- **WaveSurfer.js v7** for audio playback + waveform render
- **Meyda** for beat detection (BPM, onset detection)
- **dnd-kit** for drag-and-drop on the timeline + layout view
- **immer** for immutable edits inside Zustand reducers
- **@tanstack/react-query** for server state (project list, fixture library)
- **zod** for runtime schema validation at trust boundaries (file imports, API responses, AI output)

---

## How this folder is organized

Read these in order. Each is a self-contained briefing for one slice of the product. Stop and confirm before moving to the next slice — these are sequenced so each builds on the last.

| File | What it covers |
|---|---|
| `00-architecture.md` | Big picture, data model, folder structure, what lives where |
| `01-supabase.md` | Tables, RLS policies, Storage buckets, migrations |
| `02-projects-and-dashboard.md` | `/dashboard`, `/projects/[id]`, project CRUD, server actions |
| `03-editor-shell.md` | The `/projects/[id]/edit` route, Zustand store shape, undo/redo, autosave |
| `04-audio-engine.md` | WaveSurfer setup, MP3 upload pipeline, Meyda beat detection, transport |
| `05-timeline.md` | Effect blocks, tracks, drag/resize/snap, multi-select, keyboard shortcuts, context menu |
| `06-fixtures-and-layout.md` | Fixture model (pixel-accurate), layout view, house SVG, drag-to-place |
| `07-preview-engine.md` | Real-time renderer (SVG default + canvas "fancy" mode), how effects map to pixels |
| `08-ai-panel.md` | The AI Actions panel and the mock provider behind it (designed to swap to real Anthropic later) |
| `09-exports.md` | Lumen JSON, xLights `.xsq` sequence file, MP4 preview render |
| `10-design-system.md` | Tailwind tokens, shadcn theme, the spacing/type scale, the effect-color palette |
| `prompts/` | Ready-to-paste prompts for Claude Code, one per slice |

---

## Working agreement

**Read first, build second.** Each briefing has an "Acceptance" section with concrete checks. Don't ship a slice until those pass — manually if you have to.

**The visual prototype is the source of truth for UX.** When in doubt about a button label, a layout decision, an empty state — replicate what's in the prototype. Don't redesign.

**Light mode only.** No dark backgrounds, no dark modal overlays. Modal overlays are warm white with blur. The design system file (`10-design-system.md`) has the exact tokens.

**Pixel-accurate fixtures.** A fixture is a *strand of N pixels*. An effect block applied to a fixture renders to all of its pixels — not as a single color swatch. The preview must render every pixel.

**Mock AI cleanly.** The AI panel must behave end-to-end (loading state, streamed-feeling output, applies changes to the project). The mock provider lives behind an interface so we can swap to real Anthropic later by changing one file.

**No premature features.** If a feature isn't called out in a briefing, don't build it. Ask first.

---

## What "done" looks like for the whole project

1. A signed-in user can create a project, upload an MP3, and hear it play with a moving playhead on a real waveform.
2. They can drag effect blocks onto fixture tracks, resize them, multi-select, undo/redo, and the changes save to Supabase automatically.
3. They can switch to Layout View, drag fixtures onto an SVG of their house, and the layout persists.
4. They can switch to Preview View, hit play, and watch the lights animate against the house in sync with the music.
5. They can click AI Actions, run "Generate from Music," and see effects appear on the timeline (mock — but the UX is real).
6. They can export to either `.lumen.json` or a real xLights `.xsq` file that opens in xLights.
7. Every state above survives a refresh.

That's the bar. Build to it, slice by slice.
