# LightShow AI — Claude Code Briefing

## What This Is

A web app for designing synchronized Christmas light shows. Upload an MP3, detect beats,
drag effect blocks onto fixture tracks in a timeline editor, preview animations on an SVG
house illustration, and export sequence files for xLights hardware controllers.

Positioning: "Canva for Christmas lights." Beginner-friendly alternative to xLights and LOR.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Clerk** — auth (login, signup, protected routes, middleware)
- **Supabase** — Postgres (single-table JSONB model) + Storage (audio files)
- **Zustand** + **immer** + **zundo** — editor state with undo/redo
- **WaveSurfer.js v7** — audio playback + waveform rendering
- **Meyda** — client-side beat detection (BPM, onsets, beat grid)
- **@dnd-kit/core** — drag-and-drop on timeline + layout
- **Tailwind CSS 4** — light mode only, Lumen design tokens
- **zod** — API validation
- **Vercel** — hosting (auto-deploys from GitHub on push to main)

## Architecture

### Data Model

Single `projects` table. All project state (fixtures, sequence, audio analysis, layout)
lives in one JSONB row. No joins, no normalization. Loads once into Zustand, autosaves
on 1.2s debounce.

```
projects: id, owner_id, name, audio_url, audio_file, audio (jsonb),
          fixtures (jsonb), groups (jsonb), sequence (jsonb),
          house_template, house_custom_svg, thumbnail_url, created_at, updated_at

fixture_templates: id, name, kind, default_pixel_count, default_color (seeded — 6 types)
```

### State Boundaries

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
| `src/app/project/[id]/page.tsx` | Main editor page |
| `src/components/Timeline.tsx` | Track rows, effect blocks, DnD, palette |
| `src/components/WaveformViewer.tsx` | WaveSurfer + transport + beat overlay |
| `src/components/AudioUpload.tsx` | Upload + triggers beat analysis |
| `src/components/LayoutEditor.tsx` | House SVG + fixture placement canvas |
| `src/components/PreviewPanel.tsx` | Preview tab with animated house |
| `src/components/AIPanel.tsx` | Slide-in AI Actions panel |
| `src/components/editor/house.tsx` | Stylized house SVG illustration |
| `src/lib/store/editor-store.ts` | Zustand store with all mutations |
| `src/lib/store/transport-store.ts` | Playback state |
| `src/lib/store/use-autosave.ts` | Debounced save subscription |
| `src/lib/audio/beat-detector.ts` | Client-side BPM/onset detection |
| `src/lib/render/engine.ts` | Pure render fn: (sequence, fixtures, t) → pixels |
| `src/lib/render/effects/index.ts` | All 10 effect functions |
| `src/lib/timeline/snapping.ts` | Beat-snap helpers |
| `src/lib/fixtures/defaults.ts` | Default 6-fixture starter pack (988px) |
| `src/app/api/projects/[id]/autosave/route.ts` | Zod-validated project save |
| `src/app/api/audio/[projectId]/route.ts` | Signed URL generation for audio |
| `src/app/api/ai/generate/route.ts` | SSE-streaming AI generation (mock) |
| `src/lib/exports/lightcanvas-json.ts` | LightCanvas JSON export + zod import |
| `src/lib/exports/xlights.ts` | xLights .xsq XML sequence exporter |
| `src/lib/exports/video.ts` | WebM video capture via canvas + MediaRecorder |
| `src/components/ExportDialog.tsx` | Export dialog with format/range/options |

### Routes

| Route | What |
|-------|------|
| `/` | Landing page |
| `/sign-in`, `/sign-up` | Clerk auth |
| `/dashboard` | Project list + create |
| `/project/[id]` | Editor (sidebar + tabs + timeline) |

---

## Feature Status

### Complete

- Auth with Clerk (login, signup, protected routes, middleware)
- Supabase single-table JSONB schema (migration 002 applied), RLS, fixture_templates seeded
- Vercel deployment connected to GitHub
- Dashboard: project list, project cards, create new project dialog
- Editor shell: top bar, sidebar, tab system, LightCanvas design
- Audio upload to Supabase Storage + signed URL serving
- WaveSurfer waveform with play/pause/stop/seek + spacebar toggle
- Client-side beat detection: BPM estimation, onset detection, beat grid
- Beat markers + numbered downbeats as SVG overlay; analysis persists to DB
- Zustand store with immer + zundo (undo/redo); autosave 1.2s debounce
- Timeline: render blocks, drag from palette, drag/move existing blocks, resize via handles
- Timeline: click/multi-select, selection toolbar, right-click context menu
- Timeline: per-block parameter panel (color, intensity, speed, easing)
- Timeline: keyboard shortcuts (Cmd+Z, Cmd+Shift+Z, Cmd+A, Cmd+D, Escape, Delete)
- Layout editor: stylized house SVG, 6 pre-placed fixtures (988px total)
- Layout editor: draggable prop shapes, Add Prop dialog, properties panel
- Layout editor: toolstrip (Select/Pen/Rect/Circle/Snap), Freeform/Grid toggle
- Layout → Timeline connection (adding props creates timeline tracks)
- Preview engine: render engine + all 10 effect functions (twinkle, chase, fade, strobe,
  sparkle, wave, pulse, wash, meteor, firework)
- Preview tab: house with animated lights + transport controls (rendering bug fixed)
- AI panel: slide-in UI, mock provider (3-layer composition), SSE streaming, undo/keep
- Tab-aware sidebar, top bar polish, UI rename (Fixtures→Props, Sequence→Effects)
- Export: LightCanvas JSON (with zod-validated import), xLights .xsq (2024 format),
  WebM video preview — full Export dialog with format picker, time range, format options
- Export API route: server-side JSON and xLights export with auth + Content-Disposition

### Not Started
- ~~Dashboard: delete / rename / duplicate project actions not wired.~~ Done.
- Onboarding flow — 3-step creative wizard for new users.
- Empty / loading / error states (per handoff doc 13).
- Marquee selection on timeline — low priority.
- Hardware Bridge desktop app (doc 11) — v2.
- Hardware onboarding wizard (doc 12) — v2.
- Mobile / Show Remote PWA (doc 14) — v2.
- Settings & Account page (doc 15) — v2.
- Real Anthropic AI integration — interface ready for swap-in; mock only in v1.
- Telemetry: Sentry, PostHog (doc 18) — v2.
- Legal pages: Terms, Privacy, DMCA (doc 19) — v2.

---

## Known Issues / Quirks

1. **Audio bucket**: `lightcanvas-audio` bucket may not exist. Falls back to `songs` bucket
   (public). API route handles both URL formats.

2. **Beat detection**: Manual DFT (64 bins). Markers visually dense at high BPM — fix
   in polish pass.

3. **WaveSurfer destroy race**: Cleanup defers destroy until `ready` or `error` fires
   to avoid AbortError on unmount during load.

4. **Storage RLS**: References `auth.jwt() ->> 'sub'` for Clerk JWT. Requires Supabase
   configured with Clerk as JWT issuer.

5. **Moved from OneDrive**: Project relocated to `C:/Users/glenh/Documents/Lightshow/AppRepo`
   to avoid OneDrive sync conflicts with node_modules. Personal docs stay in parent folder.

6. **Windows path issues**: Always `cd` to project folder first before any bash command.

7. **Fixture count on old projects**: Old projects (pre-migration) show 3 fixtures. Create
   new ones — old test projects are stale.

---

## What's Next (Priority Order)

1. ~~Dashboard delete/rename/duplicate actions~~ Done
2. Onboarding flow (creative track, 3 steps)
3. Design polish pass (Prompt 11)
4. Smoke test (Prompt 12)

---

## Handoff Docs

All spec docs: `handoff/handoff/`. Prompts: `handoff/handoff/prompts/README.md`.
v2 handoff covers docs 00–19. Currently up to Prompt 10 done; next is Prompt 11.

| Doc | Status |
|-----|--------|
| 00-architecture.md | Done |
| 01-supabase.md | Done |
| 02-projects-and-dashboard.md | Done — delete/rename/duplicate wired |
| 03-editor-shell.md | Done |
| 04-audio-engine.md | Done |
| 05-timeline.md | Done |
| 06-fixtures-and-layout.md | Done (corrections applied) |
| 07-preview-engine.md | Done (rendering bug fixed) |
| 08-ai-panel.md | Done (mock provider) |
| 09-exports.md | Done — LightCanvas JSON, xLights .xsq, WebM video |
| 10-design-system.md | Partial — no full polish pass yet |
| 11-hardware-bridge.md | Not started — v2 |
| 12-onboarding-hardware-setup.md | Not started — v2 |
| 13-states-empty-loading-error.md | Not started |
| 14-mobile-responsive.md | Not started — v2 |
| 15-settings-account.md | Not started — v2 |
| 16-accessibility-perf.md | Not started |
| 17-component-inventory.md | Reference only |
| 18-telemetry.md | Not started — v2 |
| 19-legal.md | Not started — v2 |

---

## Working Rules

- **Light mode only** — everywhere, no exceptions. No dark modal overlays.
- **Show plan before touching DB** — any migration or schema change needs review first.
- **TypeScript clean** (`npx tsc --noEmit`) before any prompt is called done.
- **Build passes** (`npx next build`) before moving to next prompt.
- **Commit rule**: "commit and push" means — (1) update CLAUDE.md, (2) commit all changes
  including CLAUDE.md, (3) push. Never commit without updating CLAUDE.md first.

## Claude Code Workflow

```bash
cd "C:/Users/glenh/Documents/Lightshow/AppRepo"
claude
```

## Environment Variables

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

## Commands

```bash
npm run dev      # Dev server
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

## Git

- Remote: https://github.com/glentesting/lightshow
- Branch: main
