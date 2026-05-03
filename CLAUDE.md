# Lumen (LightShow AI)

## What This Is

A web app for designing synchronized Christmas light shows. Users upload an MP3, see beats detected on a waveform, drag effect blocks onto fixture tracks in a timeline editor, preview the show against a house layout, and export sequence files for xLights hardware controllers.

Think "Premiere Pro for Christmas lights" — timeline-based editing with AI-assisted sequence generation.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Clerk** for authentication (login, signup, protected routes)
- **Supabase** Postgres for data (single-table JSONB model) + Storage for audio files
- **Zustand** + **immer** + **zundo** for editor state with undo/redo
- **WaveSurfer.js v7** for audio playback and waveform rendering
- **Meyda** for client-side beat detection (BPM, onsets, beat grid)
- **@dnd-kit/core** for drag-and-drop (palette → timeline)
- **Tailwind CSS 4** for styling (light mode only, Lumen design system)
- **zod** for API validation
- Deployed on Vercel

## Architecture

### Data Model

Single `projects` table with JSONB columns. Everything about a project (fixtures, sequence, audio analysis, layout) lives in one row. No joins, no normalization. The project loads once into Zustand and autosaves on a 1.2s debounce.

```
projects: id, owner_id, name, audio_url, audio_file, audio (jsonb),
          fixtures (jsonb), groups (jsonb), sequence (jsonb),
          house_template, house_custom_svg, thumbnail_url, created_at, updated_at
```

Also: `fixture_templates` table with 6 built-in fixture types.

### State Management

| State | Location | Notes |
|-------|----------|-------|
| Auth | Clerk hooks | Already wired |
| Project data (fixtures, sequence, groups) | Zustand `editor-store` | Undoable via zundo, autosaved |
| Transport (playhead, isPlaying, zoom) | Zustand `transport-store` | Not undoable, not saved |
| Audio buffer / WaveSurfer instance | React ref | Not serializable |
| Selection | Zustand `editor-store` | UI-only, not saved |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/project/[id]/page.tsx` | Main editor page — sidebar, tabs, timeline |
| `src/components/Timeline.tsx` | Track rows, effect blocks, DnD provider, palette chips |
| `src/components/WaveformViewer.tsx` | WaveSurfer waveform + transport + beat overlay |
| `src/components/AudioUpload.tsx` | Upload + triggers beat analysis |
| `src/lib/store/editor-store.ts` | Zustand store with all mutations |
| `src/lib/store/transport-store.ts` | Playback state |
| `src/lib/store/use-autosave.ts` | Debounced save subscription |
| `src/lib/audio/beat-detector.ts` | Client-side BPM/onset detection |
| `src/lib/timeline/snapping.ts` | Beat-snap helpers |
| `src/app/api/audio/[projectId]/route.ts` | Signed URL generation for audio playback |
| `src/app/api/projects/[id]/autosave/route.ts` | Zod-validated project save |

### URL Structure

| Route | What |
|-------|------|
| `/` | Landing page |
| `/sign-in`, `/sign-up` | Clerk auth |
| `/dashboard` | Project list, create new |
| `/project/[id]` | Editor (sidebar + tabs + timeline) |

## Feature Status

### Complete
- [x] Auth with Clerk (login, signup, protected routes, middleware)
- [x] Dashboard (list projects, create project with 6 default fixtures)
- [x] Editor shell (top bar, sidebar, tab system, Lumen design)
- [x] Audio upload to Supabase Storage (songs bucket)
- [x] Audio playback via signed URL endpoint
- [x] WaveSurfer waveform with play/pause/stop/seek
- [x] Spacebar toggles play/pause
- [x] Client-side beat detection (spectral flux onset, BPM estimation, beat grid)
- [x] Beat markers + numbered downbeats as SVG overlay on waveform
- [x] BPM/beat count chips in transport bar
- [x] Analysis persists to DB (no re-analysis on reload)
- [x] Zustand store with immer + zundo (undo/redo capable)
- [x] Autosave (1.2s debounce, status indicator in top bar)
- [x] Timeline: render existing blocks on tracks
- [x] Timeline: drag effect from palette onto track (creates block, snaps to beat)
- [x] Timeline: click to select blocks (shift/cmd for multi-select toggle)
- [x] Timeline: drag existing blocks to move (snaps to beats, hold Alt to disable)
- [x] Timeline: resize blocks via edge handles (left/right, min 0.1s)
- [x] Timeline: selection toolbar with Delete and Duplicate buttons
- [x] Timeline: keyboard shortcuts (Cmd+Z undo, Cmd+Shift+Z redo, Cmd+A select all, Cmd+D duplicate, Escape deselect)
- [x] Lumen design system (CSS custom properties, light mode only)
- [x] Database migration to single-table JSONB model
- [x] RLS policies for project ownership
- [x] Fixture templates seeded (6 built-in types)

- [x] Timeline: right-click context menu (Duplicate, Delete, Select All)
- [x] Timeline: parameter panel (color, intensity, speed, easing) for selected block

### Not Started
- [ ] Timeline: marquee rectangle selection (drag on empty area) — low priority
- [ ] Layout view (place fixtures on house SVG)
- [ ] Preview engine (render pixels per fixture at time t)
- [ ] AI panel (mock provider, generate-from-music)
- [ ] Export (Lumen JSON, xLights .xsq, WebM video)
- [ ] Onboarding flow
- [ ] Custom house SVG upload
- [ ] Fixture add/remove UI in editor

## Known Issues / Quirks

1. **Audio bucket**: The `lumen-audio` bucket was never successfully created via SQL. Audio uploads use the legacy `songs` bucket (public). The `/api/audio/[projectId]` route handles both URL formats (full public URL and `bucket/path` format) and generates signed URLs, falling back to public URL if signing fails.

2. **Beat detection performance**: The `analyzeAudio` function uses a manual DFT (64 bins) rather than FFT for simplicity. Works fine for 3-5 minute songs but may be slow for very long files. Could be moved to a Web Worker for non-blocking analysis.

3. **WaveSurfer destroy race**: Cleanup defers destroy until the `ready` or `error` event fires to avoid AbortError when unmounting during load.

4. **Storage RLS**: The storage bucket policies reference `auth.jwt() ->> 'sub'` for Clerk JWT integration. This requires Supabase to be configured with Clerk as the JWT issuer.

## Handoff Docs

The `handoff/handoff/` folder contains the full implementation spec (files 00-10). Current progress:
- 00-architecture.md — Read, agreed on
- 01-supabase.md — **Implemented** (migration applied)
- 02-projects-and-dashboard.md — Partially done (basic dashboard works, no onboarding)
- 03-editor-shell.md — **Implemented** (Zustand store, autosave, editor shell)
- 04-audio-engine.md — **Implemented** (WaveSurfer, beat detection, transport)
- 05-timeline.md — **In progress** (render + drag-from-palette done, remaining: move/resize/multi-select/shortcuts)
- 06-fixtures-and-layout.md — Not started
- 07-preview-engine.md — Not started
- 08-ai-panel.md — Not started
- 09-exports.md — Not started
- 10-design-system.md — Partially done (CSS tokens in place, no shadcn integration yet)

## What's Next

Slice 05 (Timeline) is complete. Next slices in order:
1. **Slice 06** — Fixtures & Layout view (place fixtures on house SVG, drag-to-place, anchor snapping)
2. **Slice 07** — Preview engine (render per-pixel colors at time t, SVG + canvas modes)
3. **Slice 08** — AI panel (mock provider, generate-from-music, streamed patches)
4. **Slice 09** — Export (Lumen JSON, xLights .xsq, WebM video)
5. Marquee rectangle selection on timeline (low priority, can add anytime)

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
```

## Environment Variables Required

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Git

- Remote: https://github.com/glentesting/lightshow
- Branch: main
