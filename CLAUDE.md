# LightCanvas — Claude Code Briefing

## ⚠️ Read this first

**Open `PROJECT-STATUS.md` at the repo root.** It is the single source of truth for the
project — current state, vision, architecture, known issues, what's next, what to avoid.
This file is the technical briefing; that file is the brain.

## ⚠️ Update protocol — non-negotiable

At the **end of every Claude Code session that makes real changes**, before you push:

1. Open `PROJECT-STATUS.md`
2. Update the affected section(s) in place (don't add caveats — edit the truth)
3. Update the "Last updated" line at the top
4. Add a one-line entry to the Update Log at the bottom
5. Commit the doc edit along with the code changes (same commit, not a separate one)

If the change touches features, that's Section 1 or 8. If it touches architecture, Section 4.
If it introduces a new constraint or gotcha, Section 7. If a previously-listed issue is fixed,
remove it from Section 1's "What's actually broken" subsection — don't strike-through or comment
it out, just delete it.

Treat this exactly like the build passing or tests passing — done is not done without the doc update.

---

## What This Is

A web app for designing synchronized lighting shows. Upload an MP3, detect beats,
drag effect blocks onto fixture tracks in a timeline editor, preview animations on the
house, and export sequence files for xLights and Light-O-Rama hardware controllers.

Positioning: "Canva for Christmas lights" expanding toward a serious lighting platform
(churches, parades, commercial installs) per the v3 design direction. See Section 2 of
PROJECT-STATUS.md for the full vision.

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

Note: no `@anthropic-ai/sdk` dep (direct `fetch` to Anthropic API).
No `jszip` dep (hand-rolled ZIP writer in `src/lib/exports/zip.ts`).

## Architecture (short version — full version in PROJECT-STATUS.md §4)

### Data Model

`projects` table: JSONB row per project (fixtures, sequence, audio analysis, layout, export mappings).
`shows` table: groups projects into multi-song shows with ordered playlists.
`fixture_templates`: seeded fixture types.

### Key Routes (current — v3 adds several more)

| Route | What |
|-------|------|
| `/` | Marketing landing page |
| `/sign-in`, `/sign-up` | Clerk auth |
| `/onboarding` | 4-step wizard |
| `/dashboard` | Shows + projects list |
| `/project/[id]` | Split-view editor (preview + timeline) |
| `/project/[id]/layout` | Layout editor (separate page) |
| `/settings` | Account, Hardware, Billing tabs |
| `/legal/*` | Terms, Privacy, Copyright, Cookies (PLACEHOLDER) |
| `/p/[token]` | Public read-only share link |

### Export Formats

- **xLights (.xsq)** — ZIP with .xsq + audio + xlights_rgbeffects.xml + README
- **LOR (.lms)** — ZIP with .lms + audio + README
- **LightCanvas JSON** — full project file, re-importable
- **Video (WebM)** — rendered preview with audio

### Import Formats

- **xLights (.xsq)** — parse models + effects, create project
- **LOR (.lms)** — parse channels + effects, group RGB channels

## Known Issues / Quirks (the real list)

**See PROJECT-STATUS.md §1 for the canonical issue list.** Highlights:

1. **Telemetry not actually wired.** `analytics.ts` is a `console.log` stub. No Sentry installed,
   no PostHog installed. Cookie banner mentions PostHog dishonestly.
2. **Legal pages are placeholder.** Need real counsel-written copy before launch.
3. **AI rate limiting not wired.** No per-user quota on `/api/ai/generate`. Needs Redis/KV + design discussion.
4. **BPM correction.** If detected BPM >160, halved; if <60, doubled. Working as designed.
5. **Storage RLS.** References `auth.jwt() ->> 'sub'` for Clerk JWT (migrations 002 + 005).
6. **Windows paths.** Always `cd` to project folder first before any bash command.
7. **ANTHROPIC_API_KEY.** Required in env for real AI generation; falls back to mock with `console.warn` without it.

## Working Rules

- **Light mode only** — everywhere, no exceptions.
- **Show plan before touching DB** — any migration needs review first.
- **TypeScript clean** (`npx tsc --noEmit`) before marking done.
- **Build passes** (`npx next build`) before marking done.
- **Update PROJECT-STATUS.md** before pushing — see protocol at top of this file.
- **Don't claim "complete" optimistically** — see PROJECT-STATUS.md §7.
- **Real photo backgrounds win over SVG illustrations** — per v3 design direction.

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
ANTHROPIC_API_KEY (required for real AI; silent mock fallback without it)
```

## Doc Structure

- **PROJECT-STATUS.md** (repo root) — **the brain. Read first. Update last.**
- **CLAUDE.md** (this file) — technical briefing for Claude Code
- **docs/** — reference docs (file formats, technical blueprint, competitive landscape)
- **Parent folder** — `LightCanvas Roadmap v3.xlsx` (phased roadmap),
  `LightCanvas Financial Model.xlsx`, archived handoff packages
