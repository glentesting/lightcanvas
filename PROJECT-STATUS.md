# LightCanvas — Project Status

**The single source of truth for the project. Read this first. Update this last.**

Last updated: 2026-05-11
Updated by: Claude (Track A cleanup session)

---

## How to use this document

This is the master brain doc. It lives at `/PROJECT-STATUS.md` in the repo root next to `CLAUDE.md`.

Two rules keep it useful:

1. **Every Claude Code session reads this first** — it's the fastest way to load context. The repo's `CLAUDE.md` references it at the top.
2. **Every Claude Code session updates this last** — when work finishes, the relevant section gets edited and the "Last updated" line at the top changes. The Update Log at the bottom gets a one-line entry.

If a section is wrong, fix it in place rather than adding caveats. The doc is meant to be edited, not annotated.

There are nine sections. Most are skimmable. The longest ones — Current Reality, Architecture Map, Do Not Repeat — are the ones worth keeping accurate.

---

## 1. Current Reality

### What ships today

The app is a real working product running on Vercel from `github.com/glentesting/lightshow`. It has roughly 84 source files across the standard Next.js layout. Build passes with TypeScript clean.

**Confirmed working:**
- Auth (Clerk: email + Google)
- Onboarding (4 steps: sequencer, decorating, lights, audio)
- Dashboard with Shows + Projects, project CRUD, show grouping
- Split-view editor (preview top, timeline bottom — no tabs)
- Layout editor on a separate route (`/project/[id]/layout`)
- Audio upload to Supabase Storage, WaveSurfer waveform, Meyda beat detection with BPM octave correction
- Timeline editor: fixture tracks, group tracks, 10 effect types, drag/drop, beat snap, resize, multi-select, parameter panel, undo/redo
- Preset system: 6 built-ins, user save, immutability rules, "Modified from" indicator
- Preview engine: SVG house with animated pixel rendering, geometry-aware effects (Chase, Wave, Meteor on matrix/tree/arch)
- AI panel: Anthropic Sonnet (real API call) with mock fallback, 5 style presets, refine prompts
- Export engine: custom ZIP writer (no JSZip dep), xLights .xsq + rgbeffects.xml, LOR .lms, LightCanvas JSON, video preview
- Import: .xsq parser, .lms parser, summary modal
- Validation: channel overlap, universe overflow, controller limits per profile
- Settings (3 tabs: Account, Hardware, Billing placeholder)
- Legal pages (Terms, Privacy, Copyright, Cookies — all placeholder)
- Mobile gate below 768px
- Public read-only share link at `/p/[token]`
- Cookie banner with consent state

### What's actually broken or half-built (despite `CLAUDE.md` saying "All Complete")

These need fixing before any real launch. They are the real punch list, not optimistic ones.

~~**Storage bucket inconsistency.**~~ **FIXED.** Migration 004 creates `lightcanvas-images` bucket. House photos now upload to `lightcanvas-images`, audio stays in `songs`. Audio route cleaned up (verbose console.logs removed). The `lumen-audio` bucket defined in migration 002 is legacy — never used by code.

**Telemetry isn't actually wired.** `src/lib/analytics.ts` is a stub that `console.log`s in development. No Sentry or PostHog installed. Cookie banner no longer names PostHog (fixed). Consent UX works; the SDKs need to be installed when ready.

~~**Two API routes are TODO stubs.**~~ **FIXED.** Both `analyze-audio` and `auto-sequence` stubs deleted.

~~**Anthropic model string is suspicious.**~~ **VERIFIED.** `claude-sonnet-4-5-20250514` is the correct current model ID.

~~**Lint isn't clean.**~~ **FIXED.** 0 errors, 0 warnings on `npm run lint`.

~~**Google Fonts fetched at build time.**~~ **FIXED.** Fraunces now loaded via `next/font/google` (bundled at build time), external `<link>` tag removed.

**Legal pages are placeholder content.** The pages render but they're explicitly marked `[PLACEHOLDER — AWAITING LEGAL REVIEW]`. They need real copy from counsel before public launch.

**ANTHROPIC_API_KEY in production env.** Without it, the app falls back to the mock AI provider — silently — which generates fake-feeling shows. Confirm it's set in Vercel prod env and that the model name is correct.

### Tech stack (locked, don't change)

Next.js 16.2.4 (App Router) · React 19.2.4 · TypeScript · Tailwind CSS 4 · Clerk auth · Supabase (Postgres + Storage) · Zustand + immer + zundo · WaveSurfer.js v7 · Meyda · dnd-kit · zod · Vercel deployment.

No `@anthropic-ai/sdk` dependency — the provider calls the API directly via `fetch`. No `jszip` — there's a hand-rolled ZIP writer in `src/lib/exports/zip.ts`. Both are reasonable choices, don't undo them.

### Current key files

- `src/lib/store/editor-store.ts` (270 lines) — Zustand store
- `src/components/Timeline.tsx` (852 lines) — main timeline UI
- `src/components/AIPanel.tsx` (541 lines) — AI sidebar
- `src/components/PreviewPanel.tsx` (159 lines) — preview render
- `src/lib/exports/xlights.ts` (383 lines) — XSQ generator
- `src/lib/exports/lor.ts` (386 lines) — LMS generator
- `src/lib/imports/xsq.ts` (157 lines), `src/lib/imports/lor.ts` (158 lines)
- `src/lib/render/effects/index.ts` (301 lines) — all 10 effect renderers
- `src/lib/ai/anthropic-provider.ts` — real Anthropic call
- `src/lib/ai/mock-provider.ts` — fallback for no-API-key

---

## 2. Product Vision

### What LightCanvas is

A web-based AI-assisted lighting design platform. Originally "Canva for Christmas lights." The v3 design direction expands this to a serious lighting platform that stays beginner-friendly: home Christmas displays at one end, multi-controller commercial installs and church productions at the other.

The in-app AI assistant is Lumi.

### Who it's for

In priority order:

1. **Obsessed hobbyists** — home decorators with 100–500 props who currently struggle with xLights. The Pro tier ($49/mo) bullseye.
2. **Churches and small productions** — Christmas Eve services, holiday programs, special events. v3 design mockups show "Christmas Service," "Winter Church Services," and "LightCanvas Worship" examples. This is a real segment.
3. **Commercial / professional installers** — multi-site operators running shows for clients. Installer tier ($149/mo).
4. **Beginners** — first-time decorators who want something approachable. Free + Creator ($19/mo).

The "single home, single song" mental model is too narrow. The v3 product handles multi-show, multi-controller, multi-user displays.

### What it must never become

- A 2009-style UI bolted with AI utilities. xLights is the cautionary tale. The AI must orchestrate, not just decorate.
- A walled garden. Always export to xLights and LOR. Always import from .xsq and .lms.
- A tool that hides hardware truth. Channels, universes, and controllers are real and must be respected. The UX makes them friendly — it doesn't pretend they don't exist.
- A subscription that requires the cloud to operate the show. The Bridge desktop app (Tauri, v2) runs locally. Cloud is for design, not playback.
- Real-time collaborative editing in the same document. Multi-user yes (workspaces, roles), real-time co-editing no.

### Tiers (locked)

- **Free** — $0, 50 lifetime AI credits ever, 1GB storage, 50% marketplace rev share
- **Creator** — $19/mo, 1,500 credits/mo, 25GB, 60% rev share
- **Pro** — $49/mo, 6,000 credits/mo, 100GB, 70% rev share *(primary target, ~70% of expected paid base)*
- **Installer** — $149/mo, 25,000 credits/mo, 500GB, 75% rev share
- Annual = flat 15% discount, no free months *(seasonal chargeback risk)*

### Financial reality

At conservative base case (15 Creators + 8 Pros + 2 Installers): ~$1,054 gross / month, ~$731 net. Fixed costs $280/mo. Year 1 estimate ~$8,800 net. Year 3 estimate ~$24,700/mo if growth holds. Gross margin 72% on day one because R2 zero egress + JSONB single-table keeps costs flat. Worst case still breaks even. Unit economics work even at tiny user counts.

### August 2026 launch target

Fully complete platform across all tiers, not a beta. The build needs to be solid enough to charge for from day one.

---

## 3. Keep / Kill / Rebuild

### Keep (already working, no touching)

- Entire tech stack (Next 16, React 19, Clerk, Supabase, Zustand, etc.)
- Single-table JSONB project schema (migration 002 model)
- Hand-rolled ZIP writer (no jszip dep)
- Direct `fetch` to Anthropic API (no SDK dep)
- Custom XSQ + LMS export logic — the exports are real, not stubs
- XSQ + LMS import parsers
- 10 effect renderers
- 6 built-in presets + user preset save
- 5 AI style presets and remix prompts
- BPM halving heuristic above 160
- Light mode only, top to bottom
- Annual plan structure (flat 15%, no free months)
- Hardware profile architecture (one product, intelligent defaults per platform)
- Tauri (not Electron) for Bridge when v2 starts

### Kill

- The `analyze-audio` API route (`src/app/api/analyze-audio/route.ts`) — dead stub, analysis is client-side
- The `lumen-audio` bucket reference in migration 002 — pick one name and apply it everywhere
- The `console.log`-only `analytics.ts` if Sentry/PostHog aren't going to be wired immediately. Don't ship a cookie banner that mentions PostHog when PostHog isn't installed.
- The CLAUDE.md line `"Feature Status — All Complete"` — replace with the truth (see Section 1)
- The fallback logic in `src/app/api/audio/[projectId]/route.ts` that masks the bucket mismatch
- House photos going to the `songs` bucket — wrong bucket, fix routing

### Rebuild — the v3 design pivot

This is the big one. The v3 image set lays out a substantially more mature product than what's currently built. The architecture and code stay; the UX and several core surfaces get rebuilt to match v3.

**Navigation gets a left sidebar with these top-level destinations** (replacing the current dashboard-centric flow):
- Dashboard (overview with Show Readiness score, Next Action, Recent Projects, Controller Health, Tonight's Show, AI Recommendations)
- Projects (Active / Drafts / Archived / Templates tabs, project health stats)
- Designer (main sequence editor with 2D/3D toggle, real house photo as background, Props panel showing categorized prop tree, properties on right, sequence overview waveform on bottom)
- Timeline (dedicated full-page timeline editor with Sections track, Waveform sub-track, Beat Grid sub-track, AI Timing Assist sidebar)
- AI Studio (dedicated AI page with 3-variant generation, video previews, mood/energy/palette pills, full edit controls)
- Audio (dedicated audio analysis page with Structure Overview, Intensity, Beat Grid, Detected Sections, Auto-Detected Markers, Analysis Summary)
- Controllers (live controller status, health monitoring, port usage, temperature, firmware, test patterns, alerts)
- Mapping (full prop-to-controller-to-channel mapping editor with conflict detection)
- Preflight (Show Readiness 0–100 score, system status across Controllers/Mapping/Audio/Exports/Schedule/Performance, prioritized issue list with auto-fix suggestions)
- Exports (4-step wizard: Destination → Validation → Packaging → Deliver, with compatibility report)
- Integrations (xLights/FPP/WLED/Falcon/Kulp/Dropbox/Google Drive as connected services, not just export targets; API keys + webhooks)
- Settings (Profile/Workspace/Playback/Exports/AI/Notifications/Billing tabs, workspace members with roles)

**Designer view change.** The current "stylized house SVG with 6 default fixtures" becomes a real house photo with overlaid prop anchor points. Props are organized in a categorized tree (Roofline 42, Windows 28, Mega Tree 1, Landscape 39, Other 7 — a 237-prop example). Right sidebar has rich appearance, effect, direction, speed, channels controls. This means the LayoutEditor component is essentially rewritten.

**Timeline becomes its own first-class page.** Currently the timeline is the bottom 65% of the split-view editor. In v3 it's a dedicated route with Sections track, AI Timing Assist (confidence score, auto-align, "Suggest Next" recommendations), zoom controls, professional snap controls. The split-view editor stays for fast iteration; the dedicated Timeline page is for serious sequencing work.

**AI gets promoted to a full studio.** Slide-in panel becomes a dedicated page with multi-variant generation (3 options), video previews of each, mood/energy/palette/duration/beat-aware pills, edit controls on the right, save-as-recipe, refine, compare.

**Mapping is a new surface entirely.** It exists in code today via the Layout editor's properties panel, but v3 makes it a top-level destination with conflict detection ("2 Overlapping Assignments," "12 Props Missing Output"), live channel utilization (4,536 / 8,192 channels used), per-prop output configuration (Controller, Output port, Universe Range, Channels, Channels per Point).

**Preflight is brand new.** No current equivalent. A 0–100 readiness score across six systems, a prioritized issues list with auto-fix actions, and a Last Run Summary with history. This is a high-impact addition.

**Controllers monitoring is brand new.** Currently the app validates against controller limits at export time. v3 has live monitoring — IP addresses, online status, port usage, temperature, firmware version, last seen, test output, identify (blink LEDs), reboot, update firmware, recent alerts, network health. This is Bridge territory (v2) but the UI exists in v3 even if the live data is initially mocked.

**Integrations becomes a real page.** Each system (xLights, FPP, WLED, Falcon Player, Kulp, Dropbox, Google Drive) is a connection with sync status. Recommended integrations (SmartThings, Bitfocus Companion, Unreal Engine, Weather Underground). API keys + webhooks for advanced users.

**Workspaces and roles get added.** Settings shows workspace members with Admin/Editor/Viewer roles, invite links, project sharing controls, SSO, 2FA. This is a database + permissions change, not just UI.

**Templates section in Projects.** Three example templates: House Mega Tree (152 props, 24 controllers), Church Service (98 props, 18 controllers), Parade Starter (110 props, 20 controllers). New users start from a template, not a blank project.

### What stays the same across the v3 pivot

- The data model. Single-table JSONB still works at 237 props.
- The export and import code. They don't care how the UI looks.
- The render engine. Effects render the same way against any prop tree.
- The Anthropic AI integration. The prompt and response stay the same; the UI wrapping changes.
- The Bridge architecture (Tauri, deferred to post-launch).
- Light mode only.

### What gets parked

- The current "stylized house SVG" mode. Real photo backgrounds win. Keep the SVG only as a low-prop fallback if the user hasn't uploaded a house photo.
- The current 3-tab Settings (Account/Hardware/Billing). v3 has 7 tabs (Profile/Workspace/Playback/Exports/AI/Notifications/Billing) and a Plan & Usage / Members / Security right-rail.
- The current onboarding flow's "What sequencing software do you use" question stays useful but becomes one step in a richer setup.

---

## 4. Architecture Map

### Frontend

```
Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 + Clerk
│
├── (marketing) — landing page at /
├── /sign-in, /sign-up — Clerk hosted
├── /onboarding — 4-step wizard
├── /dashboard — Shows + Projects (v3: hero, readiness, controller health)
├── /projects — full project list (v3: Active/Drafts/Archived/Templates tabs)
├── /project/[id] — split-view editor (today: preview + timeline)
├── /project/[id]/layout — layout editor (today separate; v3: becomes Designer)
├── /designer — v3 new
├── /timeline — v3 new (dedicated)
├── /ai-studio — v3 new
├── /audio — v3 new
├── /controllers — v3 new (live monitoring)
├── /mapping — v3 new (channel assignments)
├── /preflight — v3 new (readiness checks)
├── /exports — v3 new (4-step wizard)
├── /integrations — v3 new (connected services)
├── /settings — v3 expanded (7 tabs)
├── /legal/* — Terms, Privacy, Copyright, Cookies
└── /p/[token] — public read-only share
```

State: Zustand + immer for editor; zundo for undo/redo. zod at trust boundaries (file imports, API responses, AI output).

### Backend

```
Clerk (auth)
│  └── JWT → Supabase RLS (auth.jwt() ->> 'sub')
│
Supabase Postgres
│  ├── projects (single-table JSONB)
│  ├── shows (groups projects, ordered playlists)
│  ├── fixture_templates (seeded prop types)
│  ├── presets (user-saved presets)
│  └── (v3) workspaces, workspace_members, controllers
│
Supabase Storage
│  ├── songs (audio — CURRENT, intended)
│  ├── lumen-audio (defined in migration, NOT used — needs cleanup)
│  └── (v3) lightcanvas-images (house photos, separate from audio)
│
Cloudflare R2 (planned for media at scale, zero egress)

API Routes (src/app/api/)
├── ai/generate — SSE streaming Anthropic call
├── analyze-audio — STUB, dead, delete
├── audio/[projectId] — signed URL fetch
├── auto-sequence — STUB, unclear, evaluate
├── export — server-side export packaging
├── import — file parse + project create
├── onboarding — save profile
├── presets — CRUD
├── projects, projects/[id], projects/[id]/autosave — CRUD + autosave
├── shows, shows/[id] — CRUD
├── upload-audio — audio to Supabase Storage
└── upload-house-photo — currently uses songs bucket (BUG, separate it)
```

### AI

```
Provider interface (src/lib/ai/provider.ts)
│
├── AnthropicAIProvider (anthropic-provider.ts)
│   └── direct fetch to https://api.anthropic.com/v1/messages
│       model: claude-sonnet-4-5-20250514 [VERIFY this resolves]
│       blended Haiku (simple ops) + Sonnet (generation) for cost
│
└── MockAIProvider (mock-provider.ts)
    └── fallback when ANTHROPIC_API_KEY is missing
```

Credits are metered per tier (Free 50 lifetime, Creator 1.5k/mo, Pro 6k/mo, Installer 25k/mo). Top-up packs: 1k for $9, 5k for $39.

### Rendering & Preview

```
Preview engine (src/lib/render/)
│
├── effects/index.ts — 301 lines, all 10 effect renderers
│   ├── twinkle, chase, fade, strobe, sparkle
│   └── wave, pulse, wash, meteor, firework
│
├── Pure function: (sequence, fixtures, t) → pixel colors
├── Geometry-aware: matrix (rows/cols/wiring), tree (strands), arch (orientation)
└── House SVG overlay today; v3 = real photo with anchor points
```

### Exports

```
src/lib/exports/
├── xlights.ts — XSQ generator (383 lines)
├── lor.ts — LMS generator (386 lines)
├── lightcanvas-json.ts — native format
├── video.ts — WebM via canvas + MediaRecorder
├── validation.ts — channel overlap, universe overflow, controller limits
└── zip.ts — hand-rolled ZIP writer (no JSZip)

Export ZIP contents:
xLights: .xsq + audio + xlights_rgbeffects.xml + README
LOR: .lms + audio + README
Frame rate default: 50ms (xLights compatible)
```

Validation rules:
- Falcon F16v3 / F48: 1,700 px per port limit
- AlphaPix 16: 680 px per port
- LOR PixCon16: 170 px per port
- WLED: 512 channels safe default
- Unknown: 512 channels per universe

### Controllers / FPP / Hardware (live, v2)

The current build validates against controllers but doesn't talk to them. The v3 Controllers page UI shows live data but the wire-up needs the Bridge desktop app:

```
Bridge (Tauri, v2 — NOT v1)
~10MB install vs Electron's ~120MB
│
├── E1.31 / sACN UDP output (primary)
├── WLED HTTP/JSON output
├── DDP, Art-Net (interface stubbed for v3)
├── mDNS controller discovery
├── WebSocket gateway to cloud
└── Schedule executor (RRULE-based)

Latency target: ≤80ms from drag to lights on house ("Mirror Preview")
```

FPP integration is guidance-only in v1 (post-export modal walks user through loading FSEQ to FPP). v3 Integrations page treats FPP as a connected service.

### Database schema notes

```sql
projects (
  id uuid primary key,
  user_id text not null,  -- Clerk subject ID
  parent_show_id uuid,    -- groups into shows
  data jsonb not null,    -- full project: fixtures, sequence, audio, layout, mappings
  created_at, updated_at
)

shows (
  id uuid primary key,
  user_id text not null,
  name text,
  song_order jsonb,
  created_at, updated_at
)

-- v3 additions (not yet built):
workspaces (id, name, slug, owner_id)
workspace_members (workspace_id, user_id, role: admin|editor|viewer)
controllers (id, workspace_id, type, ip, status, last_seen, ...)
```

### Domains

Primary: lightcanvas.ai · App: app.lightcanvas.ai · Shortcut: lightcanvas.app · Backup redirect: lightcanvas.co

---

## 5. v3 Design Direction

### The 12 screens (the v3 image set)

All 12 are the visual north star for the rebuild. Located in the parent folder's reference set.

1. **Dashboard** — hero project image, Show Readiness 0–100 with top priorities, Next Action quick actions, Recent Projects / Controller Health / Tonight's Show / AI Recommendations cards
2. **Projects** — Active/Drafts/Archived/Templates tabs, project cards with progress %, props, controllers, ready status, Project Health stats, Templates right-rail (House Mega Tree, Church Service, Parade Starter)
3. **Designer** — categorized prop tree, real house photo with anchor points, 2D/3D toggle, properties panel with appearance/effect/direction/speed/channels, sequence overview waveform bottom
4. **Timeline** — sections track (Intro/Verse/Build/Drop/Chorus/Bridge/Outro), waveform + beat grid sub-tracks, multiple fixture tracks with named effect blocks, AI Timing Assist with confidence score
5. **AI Studio** — prompt box, mood/energy/palette/duration/beat-aware/targets pills, 3 generated effect variants with video previews, edit panel with intensity/speed/complexity/palette/transition controls
6. **Audio Analysis** — full song structure, BPM/Key/Time Sig/Duration/Confidence, intensity curve, beat grid, detected sections with confidence per section, auto-detected markers
7. **Controllers** — 6 controllers in list with status/IP/universes/port usage/temp/last-seen, network health stats, recent alerts, per-controller overview/ports/universes/settings, test output, identify, reboot, firmware update
8. **Mapping** — full prop tree, real house photo with mapped anchor points, conflict detection, channel utilization, per-prop controller/output/universe/channels config
9. **Preflight** — Show Readiness 0–100, six-system status (Controllers, Mapping, Audio, Exports, Schedule, Performance), prioritized issues list with severity and auto-fix actions, Recommended Fixes right-rail, Last Run Summary with history
10. **Exports** — 4-step wizard (Destination → Validation → Packaging → Deliver), Compatibility Summary 0–100%, Included Assets counts (Models 237, Sequences 18, Audio 12, Images 56, Effects 48, Controllers 45), Export Options, Export History with success/warning status
11. **Integrations** — Connected (xLights/FPP/WLED/Falcon/Kulp/Dropbox/Google Drive) with last sync, Recommended (SmartThings/Bitfocus/Unreal/Weather Underground), API Keys & Webhooks, Activity log
12. **Settings** — 7 tabs (Profile/Workspace/Playback/Exports/AI/Notifications/Billing), Workspace Members with roles (Admin/Editor/Viewer), Plan & Usage / Storage / Security right-rail

### Design tokens (preserve from current build)

- Type: Fraunces (display, italic accents), Inter Tight (UI), JetBrains Mono (meta)
- Colors: warm cream, deep ink, sky blue accent, lumi yellow for AI/glow elements
- Shape: generous radius (16–24px cards, 999 pills)
- Tone: warm, Canva-friendly, slightly playful, never DAW-clinical
- Light mode only, no exceptions

### Order of rebuild

Don't try to ship all 12 screens at once. Suggested order:

1. **Sidebar nav shell** — left rail with 12 destinations, replaces current top-tab dashboard pattern
2. **Dashboard rebuild** — hero + readiness + quick actions, this is what users see first
3. **Designer rebuild** — real house photo + prop tree + properties panel (this is the biggest one)
4. **Mapping page (new)** — extracted from Designer's prop properties, made first-class
5. **Timeline page** — promoted from split-view bottom to dedicated route
6. **AI Studio rebuild** — promote from sidebar slide-in to dedicated page
7. **Preflight (new)** — readiness score + issues + recommended fixes
8. **Controllers (new, UI only)** — display, mocked data until Bridge exists
9. **Exports wizard** — 4-step flow replacing current export modal
10. **Audio Analysis page** — promote from inline waveform
11. **Integrations** — connected services + API keys
12. **Settings expansion** — 7 tabs + workspaces + roles

Steps 1–3 alone close 70% of the perceived UX gap.

---

## 6. Outdated files & cleanup

### In the project folder (Glen's `Documents/Lightshow/` and predecessor docs)

Retire to an `_archive/` folder, don't delete (in case something is referenced later):

- All 20 original Lumen-era spec files (`00-architecture.md` through `19-legal.md`) — they were written for a project called Lumen and reference an older folder structure
- The handoff packages' `README.md` and `CLAUDE.md` (the docs versions, not the repo version)
- `ROADMAP.md` (the markdown one) — superseded by `LightCanvas_Roadmap_v3_05_05_26.xlsx`
- `OPEN-QUESTIONS.md` — all 23 prior questions are answered, the Open Questions sheet in the v3 roadmap tracks any new ones
- `LANDING-PAGE.md` — landing was built (LP-1), brief is historical
- Landing source files (`hero-house.jsx`, `landing-marketplace.jsx`, `landing-pricing.jsx`, `landing-sections.jsx`, `landing-styles.css`, `LightCanvas_Landing.html`, `styles.css`) — these got ported into the repo, the repo is canonical
- `CORRECTION-layout-tab.md` — one-off correction, already applied

### Keep but consolidate into a single Reference Library folder

These get used as reference, but rarely change:

- `xLights_File_Format_Reference.docx`
- `LOR_File_Format_Reference.docx`
- `lighting-technical-reference.md`
- `competitive-landscape.md`
- `LightCanvas_AI_Native_Show_Sequencer_Reference.docx`
- `LightCanvas_Timeline_Effects_Engine_Spec_-_From_ChatGPT.docx`
- `Interesting_Ideas___Concepts_for_LightCanvas_-_05_07_26.docx`
- `LightCanvas_Technical_Blueprint_Draft_05_10.pdf`

### Canonical, never duplicated

These three are the working source of truth:

- This file (`PROJECT-STATUS.md`) — live state
- `LightCanvas_Roadmap_v3_05_05_26.xlsx` — phased roadmap
- `LightCanvas_Financial_Model.xlsx` — financials

### In the repo (`/docs`)

The repo's `/docs` folder already mostly matches the Reference Library. Trim it to file format references + technical blueprint + competitive landscape + lighting technical reference. The rest goes into the parent's archive.

---

## 7. Do Not Repeat

The mistakes and patterns to explicitly avoid:

**Don't trust optimistic completion claims.** The `CLAUDE.md` in the repo says "Feature Status — All Complete." Reality has three categories of issues (bucket mismatch, missing telemetry SDKs, stub API routes). The fix is process: when an agent says "done," the doc edit happens with the actual proof — build green, lint green, manual test path, screenshot. Not "done because the build passed."

**Don't keep the `lumen-audio` reference in any migration or code.** Pick one bucket name, one place, and burn the rest.

**Don't ship cookie banners that reference services that aren't installed.** Either install Sentry + PostHog or remove their mentions from the consent UX. Pretending tracking happens is worse than no tracking.

**Don't let parallel-agent merges happen on autopilot.** The Claude Code session transcripts show worktree changes "auto-applying" to the main repo via linter behavior before the agent had committed. That worked out fine those times. The next time it could silently drop a file. `git diff main vs worktree` before any merge, every time.

**Don't ship without ANTHROPIC_API_KEY in production env.** The mock fallback is a development feature, not a launch feature. Real users hitting Generate on the mock get fake-feeling shows. That's a credibility leak.

**Don't keep building when you should be testing.** The smoke test was done at the code-level — 35 paths cleared. The human-level smoke test (real Clerk signup, audio playback, ZIP open in xLights and LOR, drag feel, mobile gate, public share link) hasn't happened. Build one hour into the calendar to walk it manually.

**Don't ship placeholder legal copy.** It's tempting because pages render and nothing breaks. But it has real liability and contract risk. Tag those pages so they're impossible to miss, and get counsel involved early.

**Don't dump every Claude chat into the new chat session for context.** It's noise. The chats had value in the moment but the truth is in this doc and the roadmap. Pull from chats only when answering "why was this built this way" — and only the relevant slice.

**Don't keep the SVG-house mental model in v3.** The vision is real-house-photo with prop anchor points. A 237-prop display needs to look like 237 props on a real house, not 6 fixtures on a stylized illustration. The SVG fallback stays for low-prop free-tier users only.

**Don't try to ship all 12 v3 screens at once.** Order matters. Sidebar shell → Dashboard → Designer → Mapping → Timeline → AI Studio first. The rest can phase in over weeks.

**Don't kill multi-user workspaces by calling it "real-time collaboration."** Workspaces with roles (Admin/Editor/Viewer) is a v3 add. Two users editing the same document simultaneously is not. Keep them separate concepts.

**Don't drop the AI down to "decoration" status.** Lumi must orchestrate — listen, suggest, refine, generate variants. The AI Studio page is dedicated for a reason. AI suggestions appear on a separate lane in the Timeline, never destructively overwriting user work.

**Don't underestimate Sections.** The v3 Timeline has a Sections track (Intro/Verse/Build/Drop/Chorus/Bridge/Outro). This is what makes Lumi able to say "make the chorus more intense" intelligently. It's not a polish feature — it's the architectural piece that lets AI work over song structure instead of just beats.

**Don't ship a Controllers page with mocked data labeled as real.** When the live Bridge isn't connected, show clearly that monitoring is offline. Don't fake-render "Online" + "42°C" + "Last seen 10s ago" if the data isn't real.

**Don't add `analyze-audio` or other API stubs back into the codebase.** Either implement them or delete them. Dead routes confuse future agents.

---

## 8. Active work / Next up

### What's open right now

The build is functionally complete on the original RL + V2 prompt list (RL-01 through V2-08, except V2-07 Bridge which was deferred by design). The next phase is two parallel tracks:

**Track A — Cleanup & launch readiness:**
1. Fix the storage bucket mismatch (migrations + upload routes + read fallback)
2. Either install + wire Sentry/PostHog or strip the references from the cookie banner
3. Delete the `analyze-audio` API stub; decide on `auto-sequence`
4. Verify Anthropic model string resolves; confirm `ANTHROPIC_API_KEY` is in Vercel prod env
5. Fix lint (19 errors)
6. Bundle Google Fonts locally
7. Walk the manual browser smoke test (35 items)
8. Get legal copy from counsel
9. Wire Stripe / billing (not in any prior spec)

**Track B — v3 design pivot:**
1. Sidebar nav shell
2. Dashboard rebuild (hero + readiness + quick actions)
3. Designer rebuild (real photo + prop tree + properties)
4. Mapping page (new)
5. Timeline page promotion
6. AI Studio promotion
7. Preflight (new)
8. Controllers monitoring UI (mocked data initially)

### Suggested sequence

Do Track A items 1–6 first — they're cleanup and config that can't slip. Then start Track B item 1 (sidebar shell) while Track A items 7–9 are in motion (legal review is slow, smoke test is yours to schedule, Stripe needs scoping).

### Next handoff prompt

To be written after Track A items 1–4 are complete. Likely starting point: "Track B Phase 1 — Sidebar Shell + Dashboard Rebuild against the v3 design mockups." Include the v3 image as reference.

---

## 9. Update Log

When you make significant changes, add a one-line entry here. Newest at the top.

- 2026-05-11 — Track A cleanup: fixed storage bucket mismatch (migration 004, house photos → lightcanvas-images), stripped PostHog name from cookie banner, deleted dead API stubs (analyze-audio, auto-sequence), verified Anthropic model string, fixed all 29 lint issues (0/0), bundled Fraunces via next/font/google.
- 2026-05-11 — Initial doc creation from audit. Reflects state as of repo zip uploaded 05-10. Identified bucket mismatch, missing telemetry, stub API routes. Documented v3 design pivot direction across 12 screens.

---

*End of PROJECT-STATUS.md. If you're an AI agent reading this for the first time, start at Section 1.*
