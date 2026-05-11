# LightCanvas — Claude Code Briefing

## What This Is

A web app for designing synchronized Christmas light shows. Upload an MP3, detect beats,
drag effect blocks onto fixture tracks in a timeline editor, preview animations on an SVG
house illustration, and export sequence files for xLights and Light-O-Rama hardware controllers.

Positioning: "Canva for Christmas lights." Beginner-friendly alternative to xLights and LOR.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Clerk** — auth (login, signup, protected routes, middleware)
- **Supabase** — Postgres (projects + shows tables, JSONB) + Storage (audio)
- **Zustand** + **immer** + **zundo** — editor state with undo/redo
- **WaveSurfer.js v7** — audio playback + waveform rendering
- **Meyda** — client-side beat detection (BPM, onsets, sections, spectral features)
- **@dnd-kit/core** — drag-and-drop on timeline + layout
- **Tailwind CSS 4** — light mode only, LightCanvas design tokens
- **zod** — API + export validation
- **Vercel** — hosting (auto-deploys from GitHub on push to main)

## Architecture

### Data Model

`projects` table: JSONB row per project (fixtures, sequence, audio analysis, layout, export mappings).
`shows` table: groups projects into multi-song shows with ordered playlists.
`fixture_templates`: seeded fixture types (6 kinds + matrix).

### Key Routes

| Route | What |
|-------|------|
| `/` | Marketing landing page |
| `/sign-in`, `/sign-up` | Clerk auth |
| `/onboarding` | 4-step wizard (sequencer, decorating, lights, audio) |
| `/dashboard` | Shows + projects list |
| `/project/[id]` | Split-view editor (preview + timeline) |
| `/project/[id]/layout` | Layout editor (separate page) |
| `/settings` | Account, Hardware, Billing tabs |
| `/legal/*` | Terms, Privacy, Copyright, Cookies (placeholder) |
| `/p/[token]` | Public read-only share link |

### Editor Layout

Split-view (no tabs): Preview panel top ~35%, Timeline bottom ~65%, resizable divider.
Sidebar: Song, Props, Groups, Effects, Presets, AI Actions.

### Export Formats

- **xLights (.xsq)** — ZIP with .xsq + audio + xlights_rgbeffects.xml + README
- **LOR (.lms)** — ZIP with .lms + audio + README
- **LightCanvas JSON** — full project file, re-importable
- **Video (WebM)** — rendered preview with audio

### Import Formats

- **xLights (.xsq)** — parse models + effects, create project
- **LOR (.lms)** — parse channels + effects, group RGB channels

## Feature Status — All Complete

- Auth, onboarding (4 steps with hardware profile), dashboard with shows
- Split-view editor: persistent preview + timeline, no tabs
- Audio: upload, waveform, beat detection with BPM octave correction, section detection, spectral features
- Timeline: fixture + group tracks, drag/drop, resize, snap, multi-select, undo/redo, presets
- Layout editor: house SVG, fixture placement, custom house photo upload
- Preview: ResizeObserver-scaled house, group-aware rendering, 10 effects
- AI: Anthropic API (claude-sonnet-4-5) with 5 style presets, remix/refine, mock fallback
- Export: xLights + LOR + JSON + Video, pre-export validation (channel overlap, universe overflow, controller limits), fixture name/unit mapping, post-export guidance
- Import: xLights (.xsq) + LOR (.lms) parsers with summary modal
- Extended fixture geometry: matrix, tree, arch fields, geometry-aware renderers
- Preset system: 6 built-ins, user presets, immutability rules
- Shows: multi-song grouping, playlist ordering
- Legal pages (placeholder), audio rights checkbox, cookie banner
- Accessibility: focus-visible, skip-to-content, aria labels, prefers-reduced-motion
- Settings: Account, Hardware (sequencer + controller), Billing (placeholder)
- Mobile gate (<768px), public share links (/p/[token])

## Known Issues / Quirks

1. **Audio bucket**: Uses `songs` bucket (public). API route handles both URL formats.
2. **BPM correction**: If detected BPM >160, halved; if <60, doubled.
3. **WaveSurfer destroy race**: Cleanup defers destroy until `ready` or `error` fires.
4. **Storage RLS**: References `auth.jwt() ->> 'sub'` for Clerk JWT.
5. **Windows paths**: Always `cd` to project folder first before any bash command.
6. **ANTHROPIC_API_KEY**: Required in env for real AI generation; falls back to mock without it.

## Working Rules

- **Light mode only** — everywhere, no exceptions.
- **Show plan before touching DB** — any migration needs review first.
- **TypeScript clean** (`npx tsc --noEmit`) before marking done.
- **Build passes** (`npx next build`) before marking done.
- **Commit rule**: update CLAUDE.md, commit all changes, push.

## Commands

```bash
cd "C:/Users/glenh/Documents/Lightshow/AppRepo"
npm run dev      # Dev server
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

## Git

- Remote: https://github.com/glentesting/lightshow
- Branch: main

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
ANTHROPIC_API_KEY (optional — falls back to mock AI)
```

## Doc Structure

- **CLAUDE.md** (this file) — Claude Code reads this. Keep updated.
- **docs/** — reference docs (competitive landscape, lighting tech reference)
- **Parent folder** — `LightCanvas Roadmap v3.xlsx` (master), `Financial Model.xlsx`, `Claude Code Prompts.docx`
- **Parent/Reference/** — file format specs, AI design docs, technical blueprint
- **Parent/Archive/** — retired handoff packages, images, old specs
