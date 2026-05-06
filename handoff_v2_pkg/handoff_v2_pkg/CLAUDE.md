# LightCanvas — v2 Build Plan

You are continuing development on **LightCanvas**, an AI-assisted Christmas light show designer — "Canva for Christmas lights." Users upload a song, drag effects onto fixture tracks synced to the beat, preview their house lighting up, and export sequence files for xLights or Light-O-Rama hardware.

## Current state of the platform (as of May 2026)

The following are **fully built and working**. Do not rebuild them:

- Auth (Clerk — email + Google)
- Supabase DB (single JSONB schema, RLS, migration 002 applied)
- Supabase Storage (`songs` bucket for audio)
- Dashboard (project cards, create, delete, rename, duplicate)
- Editor shell (top bar, tab system, sidebar, autosave, keyboard shortcuts)
- Audio engine (upload, WaveSurfer waveform, beat detection via Meyda, beat markers)
- Timeline editor (fixture tracks, 10 effects palette, drag/drop, beat snap, resize, multi-select, parameter panel, undo/redo)
- Layout editor (house SVG, 6 default fixtures, drag-to-place, Add Prop dialog, properties panel)
- Preview engine (render function, 10 effect renderers, SVG house animation) — **has a bug: nothing renders visually. Fix is part of RL-02 preview refactor.**
- AI panel (slide-in UI, mock provider, SSE streaming, undo/keep)
- Export modal UI (format selector — no actual export logic yet)
- Onboarding wizard (3-step creative track — no hardware setup)
- Design polish pass (complete)
- Smoke test (complete)
- Marketing landing page (separate task — being built in parallel)

## Stack (do not change)

- Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui
- Clerk (auth) · Supabase (Postgres + Storage)
- Zustand + immer + zundo (state + undo/redo)
- WaveSurfer.js v7 · Meyda (audio)
- dnd-kit (drag and drop)
- zod (validation)
- Vercel (deployment)

**Light mode only throughout the entire app.** No dark backgrounds, no dark modal overlays anywhere. The Show Remote PWA has one opt-in dark stage mode — that's the only sanctioned dark surface.

## What's in this handoff package

This package is organised into two phases:

### Launch Ready (RL-*)
Things that must be built before any real user touches the platform.

| File | What it covers |
|---|---|
| `RL-01-preview-refactor.md` | Remove Preview tab → persistent split-view editor |
| `RL-02-hardware-profile.md` | Hardware profile system + onboarding question |
| `RL-03-export-xsq-complete.md` | Complete xLights export (all critical gaps fixed) |
| `RL-04-export-lor.md` | LOR .lms export (Light-O-Rama) |
| `RL-05-export-shared.md` | Export ZIP packaging, rgbeffects.xml, guidance modal, validation |
| `RL-06-show-data-model.md` | parent_show_id Supabase field + show groundwork |
| `RL-07-legal.md` | ToS, Privacy Policy, audio rights, DMCA |

### v2 (V2-*)
Post-MVP improvements targeting August launch.

| File | What it covers |
|---|---|
| `V2-01-sequencer-enhancements.md` | Group tracks, layer system, blend modes, scenes, loop handling, keyframes, diagnostic track |
| `V2-02-preset-system.md` | Immutable presets, versioning, fixture-type tagging |
| `V2-03-show-playlist-ui.md` | Show dashboard redesign, playlist management, show-level export, scheduling |
| `V2-04-ai-real-integration.md` | Real Anthropic API, style presets, remix, phrase detection, spectral audio |
| `V2-05-extended-fixture-geometry.md` | Matrix/tree/arch extended definitions |
| `V2-06-import.md` | XSQ import, LOR import |
| `V2-07-bridge-desktop-app.md` | Tauri Bridge app (hardware real-time control) |
| `V2-08-platform-polish.md` | Telemetry, accessibility, settings, billing, mobile, share links |

## Working rules

**Read the relevant spec file before writing any code.** Each file has an Acceptance section — don't mark a slice done until those checks pass.

**The visual prototype is source of truth for UX.** When in doubt about a layout, label, or empty state — replicate what's there. Don't redesign.

**Light mode only.** No exceptions except the Show Remote dark stage toggle.

**Build slices in order within each phase.** Each slice assumes the previous is complete.

**Ask before adding scope.** If something isn't in the spec, ask first.

## What "done" looks like

1. User creates a project, uploads MP3, sees waveform + beat markers
2. Drags effects onto fixture tracks, resizes, multi-selects, undoes — autosaves
3. Switches to Layout, places fixtures, persists on refresh
4. **Preview always visible above timeline** — plays in sync with audio
5. AI Actions generates a show (mock), user keeps or undoes it
6. Exports to xLights (.xsq + audio + rgbeffects.xml in one ZIP)
7. Exports to LOR (.lms + audio in one ZIP)
8. Pre-export guidance tells them exactly what to do next in xLights/LOR
9. Channel overlap and universe limit warnings fire before export
10. Legal pages live. Audio rights checkbox on upload. ToS + Privacy in footer.
