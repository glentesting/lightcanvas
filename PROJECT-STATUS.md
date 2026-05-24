# LightCanvas — Project Status

**The single source of truth for the project. Read this first. Update this last.**

Last updated: 2026-05-23
Updated by: Claude (Layout Editor Premium Rebuild)

---

## How to use this document

This is the master brain doc. It lives at `/PROJECT-STATUS.md` in the repo root next to `CLAUDE.md`.

Two rules keep it useful:

1. **Every Claude Code session reads this first** — it's the fastest way to load context. The repo's `CLAUDE.md` references it at the top.
2. **Every Claude Code session updates this last** — when work finishes, the relevant section gets edited and the "Last updated" line at the top changes. The Update Log at the bottom gets a one-line entry.

If a section is wrong, fix it in place rather than adding caveats. The doc is meant to be edited, not annotated.

---

## 1. Current Reality

### What ships today

The app is a real working product running on Vercel from `github.com/glentesting/lightshow`. Builds clean. TypeScript clean. Lint clean (0 errors, 0 warnings as of Track A cleanup).

**Confirmed working:**
- Auth (Clerk: email + Google)
- Onboarding (4 steps: sequencer, decorating, lights, audio)
- Dashboard with Shows + Projects, project CRUD, show grouping
- Split-view editor (preview top, timeline bottom — no tabs)
- Layout editor on a separate route (`/project/[id]/layout`) — premium three-column workspace with: action toolbar (Photo View/Night Preview toggle, AI assistant, Validate, Add Prop), left panel (Props/Layers tabs, search, per-prop visibility toggles + status dots, per-group Add Prop), center canvas (polished blue/white overlays with anchor nodes + label pills, floating toolbar with Select/Draw/Move/Resize/Snap/Zoom/Fullscreen), right panel (Layout Summary stat cards or inspector with Properties/Mapping/Channels/Preview tabs), 3-step Add Prop modal (Choose Type → Details → Placement Method), AI Layout Assistant popover (8 suggestions), validation strip, Night Preview mode (dark overlay + glowing colored props)
- Audio upload to Supabase Storage (`songs` bucket), WaveSurfer waveform, Meyda beat detection with BPM octave correction
- Timeline editor: fixture tracks, group tracks, 10 effect types, drag/drop, beat snap, resize, multi-select, parameter panel, undo/redo
- Preset system: 6 built-ins, user save, immutability rules, "Modified from" indicator
- Preview engine: SVG house with animated pixel rendering, geometry-aware effects
- AI panel: Anthropic Sonnet (real API, model `claude-sonnet-4-5-20250514`) with mock fallback, 5 style presets, refine prompts
- Export engine: custom ZIP writer (no JSZip dep), xLights .xsq + rgbeffects.xml, LOR .lms, LightCanvas JSON, video preview
- Import: .xsq parser, .lms parser, summary modal
- Validation: channel overlap, universe overflow, controller limits per profile
- Settings (3 tabs today: Account, Hardware, Billing placeholder)
- Legal pages (Terms, Privacy, Copyright, Cookies — all placeholder)
- Mobile gate below 768px
- Public read-only share link at `/p/[token]`
- Cookie banner with consent state
- House photos in `lightcanvas-images` bucket (separate from audio, fixed in Track A)

### What's still open

**Legal pages are placeholder content.** Need real counsel-written copy before public launch.

**ANTHROPIC_API_KEY in production env.** Without it, the app falls back to mock AI silently. Confirm it's set in Vercel prod env.

**Telemetry SDKs not installed.** `src/lib/analytics.ts` is a `console.log` stub. Cookie banner consent UX is in place. Install Sentry and PostHog when ready and wire them through `analytics.ts`.

**Manual browser smoke test not done.** Code-level test passed all 35 paths. Human-level test (Clerk signup, audio playback, ZIP open in xLights and LOR, mobile gate, public share link) needs an hour with the live URL.

**Stripe / billing not wired.** Placeholder route + UI exists. Real subscription handling — not built. Needs a fresh scoping pass before launch.

**v4 visual rebuild in progress.** Track B Steps 1–3 complete (sidebar shell, dashboard, designer, projects, layout editor). Steps 4–9 (Timeline, AI Studio, Audio, Preflight, Exports, Settings refresh) are still stub pages — not yet built. Sidebar now dynamically links to project-scoped routes when a project is loaded; stub tabs redirect to /projects when no project context exists.

**5 sidebar tabs are stub pages.** Timeline, AI Studio, Audio, Preflight, and Exports all show "Coming Soon" placeholders. These are the next major build targets (Track B Steps 4–9).

### Tech stack (locked, don't change)

Next.js 16.2.4 (App Router) · React 19.2.4 · TypeScript · Tailwind CSS 4 · Clerk auth · Supabase (Postgres + Storage) · Zustand + immer + zundo · WaveSurfer.js v7 · Meyda · dnd-kit · zod · Vercel deployment.

No `@anthropic-ai/sdk` dependency — direct `fetch` to Anthropic API. No `jszip` — hand-rolled ZIP writer in `src/lib/exports/zip.ts`. Both are correct choices.

### Current key files

- `src/lib/store/editor-store.ts` (270 lines) — Zustand store
- `src/components/LayoutEditor.tsx` (~1200 lines) — premium layout editor (three-column, overlays, floating toolbar, inspector tabs, night preview)
- `src/components/AppSidebar.tsx` — global sidebar (9 nav items, project-aware routing)
- `src/components/AppTopBar.tsx` — global top bar (project name from store, save status, Open Designer CTA)
- `src/components/Timeline.tsx` (852 lines) — main timeline UI
- `src/components/AIPanel.tsx` (541 lines) — AI sidebar
- `src/components/PreviewPanel.tsx` (159 lines) — preview render
- `src/lib/exports/xlights.ts` (383 lines) — XSQ generator
- `src/lib/exports/lor.ts` (386 lines) — LMS generator
- `src/lib/imports/xsq.ts` (157 lines), `src/lib/imports/lor.ts` (158 lines)
- `src/lib/render/effects/index.ts` (301 lines) — 10 effect renderers
- `src/lib/ai/anthropic-provider.ts` — real Anthropic call
- `src/lib/ai/mock-provider.ts` — fallback for no-API-key

---

## 2. Product Vision

### What LightCanvas is

**A web-based AI-assisted Christmas light show designer for single-home displays.** Canva for Christmas lights. Beginner-friendly alternative to xLights and LOR. One household, one display, one Christmas show at a time.

The in-app AI assistant is Lumi.

### Scope is LOCKED at single-home

This was the most important scope decision of the project. The product is designed for:

- A homeowner decorating their own house
- Roughly 20–150 props (roofline, mega tree, bushes, windows, arches, pathway, garage)
- One or two controllers (Falcon, LOR, WLED, etc.)
- A handful of songs in the season's show (8–12 typical)
- A Christmas Eve / Christmas-night show schedule

NOT:
- Multi-property / multi-site management
- Commercial installer fleets (multiple client displays)
- Churches / parades / community events
- Workspaces with multiple users and roles
- Live commercial event production tooling

The v4 designs (Section 5) are scoped exactly to this. Feature creep toward multi-property, workspaces, or fleet monitoring gets deferred to v2 or beyond.

### Who it's for

In priority order:

1. **Obsessed hobbyists** — homeowners with 60–150 props who currently struggle with xLights. Pro tier ($49/mo) bullseye, ~70% of expected paid users.
2. **Aspiring decorators** — first/second-year decorators. Creator tier ($19/mo).
3. **Curious beginners** — first-timers. Free tier.
4. **Power hobbyists / single-property pros** — Installer tier ($149/mo) for big home displays. Still single property.

### What it must never become

- A 2009-style UI bolted with AI utilities. xLights is the cautionary tale.
- A walled garden. Always export to xLights and LOR. Always import from .xsq and .lms.
- A tool that hides hardware truth. Channels, universes, controllers are real and respected.
- A subscription that requires the cloud to operate the show. Bridge (Tauri, v2) runs locally.
- Real-time collaborative editing.
- A multi-user / multi-property platform. Single home. That's the bet.
- A dark mode product. Light mode only, no exceptions.

### Tiers (locked)

- **Free** — $0, 50 lifetime AI credits ever, 1GB storage
- **Creator** — $19/mo, 1,500 credits/mo, 25GB
- **Pro** — $49/mo, 6,000 credits/mo, 100GB *(primary target)*
- **Installer** — $149/mo, 25,000 credits/mo, 500GB
- Annual = flat 15% discount, no free months *(seasonal chargeback risk)*

### Financial reality

At base case: ~$1,054 gross / month, ~$731 net. Fixed costs $280/mo. Year 1 net ~$8,800. Year 3 ~$24,700/mo if growth holds. Gross margin 72% day one. Worst case still breaks even.

### August 2026 launch target

Fully complete platform across all tiers, not a beta.

---

## 3. Keep / Kill / Rebuild

### Keep (working, no touching)

- Entire tech stack (Next 16, React 19, Clerk, Supabase, Zustand, etc.)
- Single-table JSONB project schema
- Hand-rolled ZIP writer (no jszip dep)
- Direct `fetch` to Anthropic API (no SDK dep)
- Custom XSQ + LMS export logic
- XSQ + LMS import parsers
- 10 effect renderers
- 6 built-in presets + user preset save
- 5 AI style presets and remix prompts
- BPM halving heuristic above 160
- Light mode only, top to bottom
- Annual plan structure (flat 15%, no free months)
- Hardware profile architecture
- Tauri (not Electron) for Bridge when v2 starts
- `lightcanvas-images` bucket for house photos, `songs` for audio (separate, fixed Track A)

### Killed in Track A (don't resurrect)

- `analyze-audio` and `auto-sequence` API stubs — deleted
- `lumen-audio` bucket references — done
- PostHog name in cookie banner — replaced with generic "Analytics"
- External Google Fonts `<link>` — replaced with `next/font/google`
- "Feature Status — All Complete" optimistic claim — gone

### Kill in Track B implementation

- **The cream background** — `--bg` token changes from warm cream to true white (`#FFFFFF`). Cream felt off at the matured visual scope. White is the new ground.
- **The Dark theme toggle in Settings** (visible in v4 image 9). Light mode is locked. Remove the toggle entirely on implementation.
- **The "LightCanvas Worship" demo song name** in Audio Analysis mockup. Replace with hobbyist-appropriate demo ("Wizards in Winter" or similar) before any screenshot or marketing material.

### Rebuild — Track B (the v4 design pivot)

Architecture and code stay; UX layer gets a substantial rebuild against the v4 design set. See Section 5 for the v4 direction and Section 8 for the rebuild order.

### What stays the same across the v4 rebuild

- The data model. Single-table JSONB still works.
- Export and import code. They don't care how the UI looks.
- The render engine. Effects render the same.
- The Anthropic AI integration. Prompt and response stay; UI wrapping changes.
- Light mode only.
- Bridge architecture (Tauri, post-launch).

---

## 4. Architecture Map

### Frontend (current + planned v4 routes)

```
Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 + Clerk
│
├── (marketing) — landing page at /
├── /sign-in, /sign-up — Clerk hosted
├── /onboarding — 4-step wizard
├── /dashboard — Show overview (v4: hero, readiness, quick actions, controller card)
├── /projects — Active / Drafts / Archived / Templates (v4: tabbed)
├── /project/[id] — Designer (v4: real photo + prop tree + Mapping tab in properties)
├── /timeline — dedicated timeline (v4: Sections + Beat Grid + AI Timing Assist)
├── /ai-studio — dedicated AI page (v4: 3-variant generation + edit panel)
├── /audio — dedicated audio analysis (v4: structure + intensity + markers)
├── /preflight — readiness checks (v4: NEW, single-home scope)
├── /exports — 4-step wizard (v4: Destination → Validation → Package → Export)
├── /settings — Profile/Playback/Exports/AI/Notifications/Billing/Connections (v4)
├── /legal/* — Terms, Privacy, Copyright, Cookies
└── /p/[token] — public read-only share
```

State: Zustand + immer for editor; zundo for undo/redo. zod at trust boundaries.

### Backend

```
Clerk (auth)
│  └── JWT → Supabase RLS (auth.jwt() ->> 'sub')
│
Supabase Postgres
│  ├── projects (single-table JSONB)
│  ├── shows (groups projects, ordered playlists)
│  ├── fixture_templates (seeded prop types)
│  └── presets (user-saved presets)
│
Supabase Storage
│  ├── songs (audio — public bucket)
│  └── lightcanvas-images (house photos — public bucket, separate)
│
Cloudflare R2 (planned for media at scale, zero egress)

API Routes (src/app/api/)
├── ai/generate — SSE streaming Anthropic call
├── audio/[projectId] — signed URL fetch
├── export — server-side export packaging
├── import — file parse + project create
├── onboarding — save profile
├── presets — CRUD
├── projects, projects/[id], projects/[id]/autosave — CRUD + autosave
├── shows, shows/[id] — CRUD
├── upload-audio — audio to songs bucket
└── upload-house-photo — house photo to lightcanvas-images bucket
```

### AI

```
Provider interface (src/lib/ai/provider.ts)
│
├── AnthropicAIProvider (anthropic-provider.ts)
│   └── direct fetch to https://api.anthropic.com/v1/messages
│       model: claude-sonnet-4-5-20250514 (verified)
│       blended Haiku (simple ops) + Sonnet (generation) for cost
│
└── MockAIProvider (mock-provider.ts)
    └── fallback when ANTHROPIC_API_KEY is missing
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

### Domains

Primary: lightcanvas.ai · App: app.lightcanvas.ai · Shortcut: lightcanvas.app · Backup redirect: lightcanvas.co

---

## 5. v4 Design Direction

The v4 design set is the locked visual and structural north star. 9 screens, scoped exactly to single-home use.

### Sidebar navigation — 9 destinations (FINAL)

```
Dashboard
Projects
Designer
Timeline
AI Studio
Audio
Preflight
Exports
Settings
```

Three previously-considered destinations are explicitly NOT top-level:
- **Mapping** — folded into Designer as a tab inside the Selected Prop properties panel (Properties / Mapping / Channels tabs)
- **Controllers** — single home has 1–2 controllers, so monitoring is a card on the Dashboard + status in Settings → Connections
- **Integrations** — replaced by a simpler Settings → Connections tab listing xLights Controller, Google Drive, Dropbox, YouTube

### The 9 screens

1. **Dashboard** — hero project card with real house photo + prop labels (Roofline, Mega Tree, Bushes). Show Readiness score (87/100). Next Action (Continue Editing). Quick Actions (Preview Show, Check Preflight, Export Preview Video). "Continue Where You Left Off" with prop and controller counts. Recent Projects. Controller Status card (single controller — "LightCanvas Controller LC-1"). Tonight's Show (Christmas Eve schedule + duration + intensity). AI Suggestions card.

2. **Projects** — Active / Drafts / Archived / Templates tabs. Project cards with hero photo, readiness ring, prop count, last-edited timestamp, % ready bar. Templates section shows home-display style packs: Classic Warm White, Candy Cane, North Pole, Winter Wonderland, Golden Glow, Minimal Modern.

3. **Designer (Main Sequence Editor)** — categorized prop tree (Rooflines, Windows, Mega Tree, Landscape, Other) totaling ~38 props for a typical home. Real house photo with prop anchor points overlaid. 2D/3D toggle, Move/Scale/Rotate tools. Selected Prop panel on the right with **Properties / Mapping / Channels tabs**. Mapping tab shows Controller, Port/Output, Pixel Start, Channel Count, conflict status, Visual Preview Off/On/Test toggle, Show in Controller View link. Sequence Overview waveform along the bottom with section blocks.

4. **Timeline** — dedicated full-page timeline. Song header with BPM/Key/Time Sig/Duration/Current Section. Sections sub-track (Intro/Verse/Build/Drop/Chorus/Bridge/Outro), Waveform sub-track, Beat Grid sub-track. Multiple fixture tracks with named effect blocks. AI Timing Assist sidebar with confidence score, suggestions, Quick Edits.

5. **AI Studio** — dedicated AI page. Describe-your-effect prompt box. Mood/Energy/Palette/Duration/Beat Aware/Targets pills. 3 generated effect variants with video previews. Edit Effect panel on the right: Intensity, Speed, Complexity sliders, Palette, Beat Awareness toggle, Transition Style, Apply To checkboxes.

6. **Audio Analysis** — dedicated audio page. Song header. Structure Overview with section blocks, full waveform, Intensity curve, Beat Grid. Detected Sections table with per-section confidence. Analysis Summary right rail. Quick Actions.

7. **Preflight** — Show Readiness 87/100, "Almost Ready 🎉" tonight's-show status. Four big metric tiles (38 Props, Controller, Audio Synced, Export Ready). Review N Items primary CTA. Readiness Summary right rail (Needs Attention / Warning / All Good counts, Schedule status, Next Show countdown). Readiness Checks grid: Display Output, Timing & Sequence, Controller (with firmware version), Audio Sync, Export Status, Brightness Check.

8. **Exports** — 4-step wizard (Destination → Validation → Package → Export). Step 1: xLights Show (Recommended) / Light-O-Rama Show / Preview Video. Package Options: Include All Assets, Compress Package. Export Summary right rail: project title, show duration, sequence channels, controllers, props, audio tracks, blocking issues, Last Preflight status.

9. **Settings** — 7 tabs: **Profile, Playback, Exports, AI, Notifications, Billing, Connections**. Profile (Display Name, Email, Time Zone, Language). Playback (Default Preview Quality, Preview Volume, Default Start Mode). Exports defaults. AI preferences. Notifications. Billing (Plan, Storage Used, Next Billing Date, Manage Billing). Connections (xLights Controller, Google Drive, Dropbox, YouTube — connect/manage).

### Design tokens (updated)

- Type: **Fraunces** (display, italic accents), **Inter Tight** (UI), **JetBrains Mono** (meta)
- Background: **True white** (`#FFFFFF`). The cream from earlier is killed. Lumen-yellow / Christmas accents stay.
- Accent colors: sky blue (primary CTA + active nav), lumi yellow (AI / glow), green (success), orange (warning), red (critical)
- Shape: generous radius (16–24px cards, 999 pills)
- Tone: warm, approachable, slightly playful, never DAW-clinical
- **Light mode only.** No dark mode toggle anywhere. The v4 Settings mockup shows a Light/Dark toggle — remove on implementation.

### Order of v4 rebuild (Track B)

1. **Sidebar nav shell + global frame** — left rail with 9 destinations, top bar (project selector, search, save status, Preview button, primary CTA), profile chip bottom-left.
2. **Dashboard rebuild** — hero card + readiness + quick actions + controller status + tonight's show.
3. **Designer rebuild** — categorized prop tree + real house photo + Properties/Mapping/Channels tabs.
4. **Timeline rebuild** — dedicated route, Sections/Waveform/Beat Grid, AI Timing Assist.
5. **AI Studio rebuild** — dedicated page, 3-variant generation.
6. **Preflight (new)** — readiness score + checks + tonight's show framing.
7. **Audio Analysis (promotion)** — dedicated page from inline waveform.
8. **Exports rebuild** — 4-step wizard replacing current modal.
9. **Projects + Settings refresh** — tabbed Projects, updated Settings tab order.

Steps 1–3 alone close 70% of the perceived UX gap.

---

## 6. Outdated files & cleanup

### Retire (move to `_archive/`)

- All 20 original Lumen-era spec files (`00-architecture.md` through `19-legal.md`)
- Old handoff packages' `README.md` and `CLAUDE.md`
- `ROADMAP.md` (markdown) — superseded by the v3 Excel
- `OPEN-QUESTIONS.md` — all 23 prior questions answered
- `LANDING-PAGE.md` — landing was built
- Landing source files that got ported into the repo
- `CORRECTION-layout-tab.md` — applied
- v3 image set — superseded by v4

### Keep as Reference Library

- `xLights_File_Format_Reference.docx`
- `LOR_File_Format_Reference.docx`
- `lighting-technical-reference.md`
- `competitive-landscape.md`
- `LightCanvas_AI_Native_Show_Sequencer_Reference.docx`
- `LightCanvas_Timeline_Effects_Engine_Spec_-_From_ChatGPT.docx`
- `Interesting_Ideas___Concepts_for_LightCanvas_-_05_07_26.docx`
- `LightCanvas_Technical_Blueprint_Draft_05_10.pdf`
- **v4 image set** (`LightCanvas_v4_Full_Image_Set/`) — visual north star for Track B

### Canonical, never duplicated

- This file (`PROJECT-STATUS.md`) — live state
- `LightCanvas_Roadmap_v3_05_05_26.xlsx` — phased roadmap
- `LightCanvas_Financial_Model.xlsx` — financials

---

## 7. Do Not Repeat

**Don't trust optimistic completion claims.** The "All Complete" claim was caught in audit. Track A's strikethrough-on-fixed pattern is now the model — proof attached, not vibes.

**Don't add multi-property / workspace / fleet features.** Scope is single-home. If a v4 screen drifts toward installer / commercial territory (multiple controllers as fleet, workspace members, multi-site dashboards), it's a v2+ ask. Defer.

**Don't add a dark mode toggle.** Light mode is locked. The v4 Settings mockup includes a Light/Dark toggle in the Profile section — remove it on implementation. Adding dark mode is weeks of component work for a feature nobody asked for and a maintenance burden forever.

**Don't keep the cream background.** True white is the new ground. The cream was vestigial from the original "warm Canva" tone and felt off as the product matured visually.

**Don't ship demo data that betrays the wrong product positioning.** "LightCanvas Worship" as the artist name in the Audio Analysis mockup is a church-product holdover. Replace with hobbyist-appropriate demo content before any screenshot or marketing material.

**Don't ship cookie banners that reference services that aren't installed.** Already fixed — keep it fixed.

**Don't let parallel-agent merges happen on autopilot.** `git diff main vs worktree` before any merge, every time.

**Don't ship without ANTHROPIC_API_KEY in production env.** Mock fallback is a dev convenience, not a launch feature.

**Don't keep building when you should be testing.** Track B will be tempting to rush. Schedule the manual smoke test alongside it.

**Don't ship placeholder legal copy.** Get counsel involved.

**Don't dump every Claude chat into a new chat for context.** This doc + the roadmap is enough. Pull from chats only for specific "why was this built this way" questions.

**Don't add Workspaces, Members/Roles, SSO, or API Keys/Webhooks.** Single-home product. Don't need them. Don't add them.

**Don't make the SVG-house fallback the primary visual.** Real-house-photo with prop anchor points is the v4 vision. SVG illustration stays as a fallback for free-tier users who haven't uploaded a photo yet.

**Don't promote Mapping or Controllers to top-level sidebar destinations.** Mapping lives inside Designer (tab); Controllers shows on Dashboard + Settings Connections. The 9-destination sidebar is final.

**Don't drop the AI down to "decoration" status.** Lumi orchestrates — listens, suggests, refines, generates variants. The AI Studio page is dedicated for a reason. Suggestions appear on a separate lane in the Timeline, never destructively overwriting user work.

**Don't underestimate Sections.** The Sections track is what lets Lumi work over song structure instead of just beats. Architectural piece, not polish.

**Don't add `analyze-audio` or other API stubs back into the codebase.** Either implement or delete. Dead routes confuse future agents.

---

## 8. Active work / Next up

### Track A — DONE (2026-05-11)

✅ Storage bucket mismatch fixed (migration 004 + house photos in `lightcanvas-images`)
✅ Cookie banner no longer dishonestly names PostHog
✅ Dead API stubs (`analyze-audio`, `auto-sequence`) deleted
✅ Anthropic model string verified (`claude-sonnet-4-5-20250514`)
✅ Lint clean (0 errors, 0 warnings, was 17/12)
✅ Fonts bundled via `next/font/google`, external Google Fonts link removed

### Still needs human action (can't be automated)

- Legal pages need real counsel-written copy
- ANTHROPIC_API_KEY confirmed in Vercel prod env
- Manual browser smoke test (35-item checklist)
- Sentry + PostHog SDKs installed when ready
- Stripe / billing scoping pass

### Track B — v4 design rebuild (IN PROGRESS)

#### DONE

✅ **Step 1: Sidebar nav shell + global frame** — left rail with 9 nav items, AppTopBar (project selector, search, save status, Open Designer), profile chip bottom-left, (app) route group. `--bg` token → `#FFFFFF`. Sidebar now reads projectId from editor store and dynamically routes project-scoped tabs to `/project/[id]`. Tabs without a loaded project redirect to `/projects`.

✅ **Step 2: Dashboard rebuild** — hero project card with house photo + prop labels, Show Readiness ring, Design Overview tiles, Next Action card, Continue Where You Left Off, AI Suggestions card, empty state with upload prompt.

✅ **Step 3a: Designer rebuild** — categorized prop tree, real house photo with prop overlays, Properties/Mapping/Channels tabs in inspector, sequence overview bar.

✅ **Step 3b: Projects page** — Active/Drafts/Archived/Templates tabs, project cards with readiness rings, sort controls, template packs.

✅ **Step 3c: Layout Editor premium rebuild (2026-05-23)** — full redesign:
- Page header with "Back to Designer" + title
- Action toolbar: Photo View / Night Preview toggle, Replace Photo, AI Layout Assistant, Validate Layout, + Add Prop
- Left panel: Props/Layers tabs, search, per-prop visibility toggles + status dots (green=placed, amber=needs), per-group Add Prop buttons, category icons
- Center canvas: blue/white prop overlays with anchor nodes + label pills, floating toolbar (Select/Draw/Move/Resize/Snap/Fit/Zoom/Fullscreen)
- Right panel (no selection): Layout Summary with stat cards (props mapped, channels, controllers, readiness %), readiness bar, issue alerts
- Right panel (selected): Inspector with Properties/Mapping/Channels/Preview tabs, brightness limit slider, enabled toggle, geometry fields, channel overlap detection
- 3-step Add Prop modal: Choose Type → Basic Details → Placement Method (Draw/AI/Copy)
- AI Layout Assistant popover: 8 layout-specific AI suggestions
- Validation strip: friendly messaging with auto-fix and review actions
- Night Preview mode: dark canvas overlay, per-kind colored glowing props with SVG glow filter

#### NEXT — NOT STARTED (stub pages)

4. **Timeline rebuild** — dedicated route, Sections/Waveform/Beat Grid, AI Timing Assist
5. **AI Studio rebuild** — dedicated page, 3-variant generation — NOT STARTED
6. **Preflight (new)** — DONE (2026-05-23): readiness score ring, 3-column hero strip (readiness/tonight's show/summary), 6 check cards (display, timing, controller, audio, export, brightness) with real validation, bottom callout strip. Uses real fixture validation data.
7. **Audio Analysis (promotion)** — DONE (2026-05-23): header strip with song info + 4 metric tiles, structure overview (section blocks + waveform + intensity + beat grid), detected sections table, analysis summary rail, quick actions, tip card. Reads real BPM/beats/sections/loudness from store.
8. **Exports rebuild** — DONE (2026-05-23): 4-step wizard (Destination → Validation → Package → Export), 3 export type cards (xLights/LOR/Video) with radio selection, package options checkboxes, validation step with real engine, Export Summary right rail, progress strip, download button. Uses real validation data.
9. **Projects + Settings refresh** — updated Settings tab order (Profile/Playback/Exports/AI/Notifications/Billing/Connections)

Steps 4–9 are currently "Coming Soon" stub pages. The sidebar links to them but they show placeholder content.

#### Concurrent items completed
- ✅ `--bg` token changed from warm cream to true white (`#FFFFFF`)
- ✅ Dark mode toggle not implemented (locked out)
- ✅ Demo data uses hobbyist content ("Wizards in Winter"), not "LightCanvas Worship"
- ✅ AppTopBar shows real project name from store + live save status
- ✅ Sidebar dynamically links to project-scoped routes when a project is loaded

---

## 9. Update Log

When you make significant changes, add a one-line entry here. Newest at the top.

- 2026-05-23 — Layout Editor premium rebuild (7 phases): action toolbar, left panel (Props/Layers tabs, visibility, status dots, per-group add), canvas (blue/white overlays, anchor nodes, label pills, floating toolbar), right panel (stat cards, inspector tabs), 3-step Add Prop modal, AI Layout Assistant popover, validation strip, Night Preview mode. Also fixed: sidebar now reads projectId from store and dynamically routes project-scoped tabs; AppTopBar shows real project name + save status; stub tabs redirect to /projects when no project loaded. TypeScript clean, lint 0/0, build passes.
- 2026-05-11 — Track B Seven-Priority Rebuild: P1 demo data verified clean, P2 hero nighttime treatment (dusk overlay + warm amber glow), P3 Projects page rebuilt to v4 library (tabs, sort, project cards, templates), P4 Continue Where You Left Off card, P5 Designer rebuilt (props tree + preview + inspector + sequence overview) + Timeline graduated (full waveform + tracks + effects), P6 Layout rebuilt as three-column workspace (props left + canvas center + inspector right), P7 consistency sweep (cream→white on legal/share/mobile).
- 2026-05-11 — Track B Step 2c: Photo sync (house_custom_svg added to projects API select), editor light-mode (preview canvas → warm cream, sidebar → #FFFFFF, props grouped by category with colored dots, breadcrumb removed), dashboard AI Suggestions card + hero empty-state polish (camera icon, warm glow, warmer copy) + dynamic prop pills from real fixtures.
- 2026-05-11 — Track B Step 2b: Dashboard visual polish — 400px hero card with starfield + upload prompt (no-photo) or full-bleed photo with prop pills, 48px Fraunces welcome, Design Overview tiles with colored icons + progress bars + percentages, 96px readiness ring, Next Action card with accent header + lightbulb icon, generous spacing/shadows throughout.
- 2026-05-11 — Track B Step 2: Dashboard rebuilt to v4 hero layout (welcome row, hero project card with house photo/SVG fallback, Design Overview tiles, Show Readiness ring + checklist, Next Action card, empty state). Old Shows+Songs list moved to /projects with full CRUD preserved.
- 2026-05-11 — Track B Step 1 fix: added 7 stub placeholder pages (Projects, Designer, Timeline, AI Studio, Audio, Preflight, Exports) so all sidebar links resolve. Fixed Projects href from /dashboard to /projects.
- 2026-05-11 — Track B Step 1: sidebar shell. Created (app) route group with AppSidebar (9 nav items) + AppTopBar (project selector, search, actions). Moved dashboard/settings/project into (app). Removed standalone navs from dashboard and settings. --bg token → #FFFFFF. Lint clean 0/0.
- 2026-05-11 — v4 design lock + single-home scope clarification. Sidebar reduced from 12 to 9 destinations (Mapping folded into Designer, Controllers/Integrations removed as top-level). Workspaces/Members/Roles/SSO/API Keys explicitly cut. Cream background → true white token swap added to Track B. Dark mode toggle in v4 Settings mockup flagged for removal. "LightCanvas Worship" demo data flagged for replacement. v4 image set now visual north star (`LightCanvas_v4_Full_Image_Set/`).
- 2026-05-11 — Track A cleanup: fixed storage bucket mismatch (migration 004, house photos → lightcanvas-images), stripped PostHog name from cookie banner, deleted dead API stubs (analyze-audio, auto-sequence), verified Anthropic model string, fixed all 29 lint issues (0/0), bundled Fraunces via next/font/google.
- 2026-05-11 — Initial doc creation from audit. Reflects state as of repo zip uploaded 05-10. Identified bucket mismatch, missing telemetry, stub API routes. Documented v3 design pivot direction across 12 screens.

---

*End of PROJECT-STATUS.md. If you're an AI agent reading this for the first time, start at Section 1.*
