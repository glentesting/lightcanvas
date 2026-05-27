# MODULES.md — LightCanvas Module Map

> **How to use this file:**
> When something breaks, find the area in the table below. It tells you exactly which file owns that logic, which spec doc describes it, and which agent/PR built it. Go straight there — don't guess.
>
> When you build something new, add a row. One line per logical unit. Keep it honest.
>
> Last updated: 2026-05-27

---

## Table of Contents

1. [App Routes](#1-app-routes)
2. [Editor Shell & State](#2-editor-shell--state)
3. [Audio Engine](#3-audio-engine)
4. [Timeline](#4-timeline)
5. [3D Layout System](#5-3d-layout-system)
6. [Preview Engine](#6-preview-engine)
7. [AI Panel](#7-ai-panel)
8. [Exports](#8-exports)
9. [API Routes](#9-api-routes)
10. [Design System & UI Primitives](#10-design-system--ui-primitives)
11. [Shared Libraries](#11-shared-libraries)
12. [Database & Storage](#12-database--storage)
13. [Known Bugs & Active Fixes](#13-known-bugs--active-fixes)

---

## 1. App Routes

| Route | File | Notes |
|-------|------|-------|
| `/` | `src/app/(marketing)/page.tsx` | Marketing landing |
| `/sign-in`, `/sign-up` | Clerk hosted UI | Clerk-managed |
| `/onboarding` | `src/app/onboarding/page.tsx` | Onboarding wizard |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Project list |
| `/project/[id]` | `src/app/(app)/project/[id]/page.tsx` | Main editor (split view) |
| `/project/[id]/layout` | `src/app/(app)/project/[id]/layout/page.tsx` | Layout editor (3D) |
| `/settings` | `src/app/(app)/settings/page.tsx` | Account, Hardware, Billing |
| `/p/[token]` | `src/app/p/[token]/page.tsx` | Public read-only share link |

---

## 2. Editor Shell & State

| What | File | Notes |
|------|------|-------|
| Top bar | `src/components/AppTopBar.tsx` | Title, export, user menu |
| Sidebar | `src/components/AppSidebar.tsx` | Fixture nav + tools |
| Zustand editor store | `src/lib/store/editor-store.ts` | Single source of truth — fixtures, sequence, audio, selection |
| Transport store | `src/lib/store/transport-store.ts` | Playhead, play/pause, BPM |
| **3D Layout store** | `src/lib/store/layout3d-slice.ts` | 3D fixture positions, tool mode, snap |
| Undo/redo (zundo) | `src/lib/store/editor-store.ts` | Cmd+Z / Cmd+Shift+Z |
| Autosave | `src/lib/store/use-autosave.ts` + `src/app/api/projects/[id]/route.ts` | 800ms debounce, JSONB |

---

## 3. Audio Engine

| What | File | Notes |
|------|------|-------|
| Waveform player | `src/components/WaveformViewer.tsx` | WaveSurfer v7 |
| Audio upload | `src/components/AudioUpload.tsx` + `src/app/api/upload-audio/route.ts` | Signed Supabase URL |
| Beat detection | `src/lib/audio/` (Meyda) | Client-side, BPM halving heuristic |

---

## 4. Timeline

| What | File | Notes |
|------|------|-------|
| Timeline root | `src/components/Timeline.tsx` | Outer scroll container, tracks, effect blocks |
| Timeline types | `src/lib/timeline/types.ts` | EffectBlock, Track, Sequence |
| Drag/select hooks | inline in Timeline.tsx | dnd-kit based |

---

## 5. 3D Layout System

> This module replaces the original 2D SVG layout view (`src/components/LayoutEditor.tsx`).
> All 3D layout logic lives under `src/components/editor/scene3d/` and `src/lib/3d/`.
> Do **NOT** mix 3D coordinate logic with the legacy 2D `fixture.layout.points` field —
> the 3D system stores positions in `Fixture3DLayout` (see 5a).

### 5a. Shared Types & Constants

| What | File | Built by | Notes |
|------|------|----------|-------|
| All 3D TypeScript interfaces | `src/lib/3d/types.ts` | Foundation | **Single source of truth — import from here, never redefine** |
| Scene constants | `src/lib/3d/constants.ts` | Foundation | Grid size, camera defaults, snap radius, color palette |

### 5b. Scene Foundation

| What | File | Built by | Notes |
|------|------|----------|-------|
| R3F Canvas root | `src/components/editor/scene3d/Scene3D.tsx` | Foundation | Wraps entire 3D scene, lighting + fog |
| Camera + orbit controls | `src/components/editor/scene3d/camera/OrbitCamera.tsx` | Foundation | Perspective, elevated angle, damping |
| Ground plane + grid | `src/components/editor/scene3d/GroundPlane.tsx` | Foundation | Green tint, shadow receiver, raycast target |

### 5c. House Mesh System

| What | File | Built by | Notes |
|------|------|----------|-------|
| House mesh assembler | `src/components/editor/scene3d/house/House3D.tsx` | Agent 2 | Accepts templateId prop |
| Procedural geometry | `src/components/editor/scene3d/house/HouseGeometry.tsx` | Agent 2 | Parametric — no hardcoded vertices |
| Anchor surface logic | `src/components/editor/scene3d/house/AnchorSurfaces.tsx` | Agent 2 | `useSurfaces()` hook |
| Anchor visual highlight | `src/components/editor/scene3d/house/AnchorVisualizer.tsx` | Agent 2 | Amber glow during drag |
| House template data | `src/lib/3d/house-templates.ts` | Agent 2 | Colonial, Modern, Cottage |

### 5d. Fixture Rendering

| What | File | Built by | Notes |
|------|------|----------|-------|
| Fixture layer (all) | `src/components/editor/scene3d/fixtures/FixtureLayer.tsx` | Agent 3 | Reads store, renders all |
| Strand fixture | `src/components/editor/scene3d/fixtures/StrandFixture3D.tsx` | Agent 3 | TubeGeometry, waypoint handles |
| Point fixture | `src/components/editor/scene3d/fixtures/PointFixture3D.tsx` | Agent 3 | Emissive sphere |
| Drag ghost | `src/components/editor/scene3d/fixtures/FixtureGhost.tsx` | Agent 3 | Semi-transparent preview |
| Pixel interpolation | `src/lib/3d/fixture-renderer.ts` | Agent 3 | Strand path → N pixel positions |

### 5e. Interaction System

| What | File | Built by | Notes |
|------|------|----------|-------|
| Interaction orchestrator | `src/components/editor/scene3d/interaction/DragController.tsx` | Integration | Routes events by active tool |
| Path draw mode | `src/components/editor/scene3d/interaction/PathDrawer.tsx` | Integration | Click waypoints → double-click finish |
| Selection box | `src/components/editor/scene3d/interaction/SelectionBox.tsx` | Integration | Click+drag on empty space |
| Raycast hook | `src/lib/hooks/use-3d-raycast.ts` | Integration | Throttled |
| Drag hook | `src/lib/hooks/use-3d-drag.ts` | Integration | Disables OrbitControls |
| Path draw hook | `src/lib/hooks/use-path-draw.ts` | Integration | Waypoint state, finish/cancel |

### 5f. Data, Store & Coordinate Bridge

| What | File | Built by | Notes |
|------|------|----------|-------|
| Layout 3D Zustand slice | `src/lib/store/layout3d-slice.ts` | Agent 5 | Fixture positions, tool, snap — persists to Supabase |
| Snap logic | `src/lib/3d/snap.ts` | Agent 5 | Anchor-first, grid fallback |
| Coordinate bridge | `src/lib/3d/coordinate-bridge.ts` | Agent 5 | **World coords → xLights/LOR/2D export coords** |
| Export adapter | `src/lib/3d/export-adapter.ts` | Agent 5 | Assembles fixture data for exporters |

> ⚠️ If xLights or LOR export coordinates look wrong, start here: `src/lib/3d/coordinate-bridge.ts`

### 5g. Layout UI Shell

| What | File | Built by | Notes |
|------|------|----------|-------|
| Layout tab root | `src/components/editor/layout-panel/LayoutView.tsx` | Integration | Composes sidebar + scene + properties |
| Fixture library sidebar | `src/components/editor/layout-panel/FixtureLibrarySidebar.tsx` | Integration | Drag-to-place, context menu |
| Properties panel | `src/components/editor/layout-panel/PropertiesPanel.tsx` | Integration | Selected fixture details |
| Toolstrip | `src/components/editor/layout-panel/Toolstrip3D.tsx` | Integration | Select/Draw/Rect/Circle + snap |
| House template selector | `src/components/editor/layout-panel/HouseSelector.tsx` | Integration | Dropdown + upload custom |

---

## 6. Preview Engine

| What | File | Notes |
|------|------|-------|
| Preview panel | `src/components/PreviewPanel.tsx` | Reads 3D layout, drives light colors |
| Effect renderers | `src/lib/render/effects/` | Per-effect type rendering logic |

> Preview renders lights onto the same `House3D` mesh used in layout view.
> It reads fixture world positions from `layout3d-slice` to know where to draw.

---

## 7. AI Panel

| What | File | Notes |
|------|------|-------|
| AI panel UI | `src/components/AIPanel.tsx` | Lumi — the in-app assistant |
| AI provider | `src/lib/ai/` | Mock + Anthropic provider |
| AI API route | `src/app/api/ai/generate/route.ts` | POST — calls provider |

---

## 8. Exports

| What | File | Notes |
|------|------|-------|
| Export dialog | `src/components/ExportDialog.tsx` | Format picker + download |
| Export library | `src/lib/exports/` | xLights, LOR, JSON, ZIP writer |
| Export API route | `src/app/api/export/route.ts` | Triggers export by format |

> ⚠️ Both xLights and LOR export at launch — neither is deferred.
> If an export produces wrong channel assignments: `src/lib/3d/export-adapter.ts`
> If export coordinates are off: `src/lib/3d/coordinate-bridge.ts`

---

## 9. API Routes

| Route | File | Notes |
|-------|------|-------|
| `POST /api/upload-audio` | `src/app/api/upload-audio/route.ts` | Returns signed Supabase upload URL |
| `GET/PATCH /api/projects/[id]` | `src/app/api/projects/[id]/route.ts` | Project CRUD, autosave target |
| `GET /api/export` | `src/app/api/export/route.ts` | Triggers export by format |
| `POST /api/ai/generate` | `src/app/api/ai/generate/route.ts` | AI effect generation |

---

## 10. Design System & UI Primitives

| What | File | Notes |
|------|------|-------|
| Tailwind tokens | `tailwind.config.ts` (via PostCSS) | Color palette, spacing |
| Global CSS | `src/app/globals.css` | CSS vars, base resets |

> Light mode only. Warm cream tones: `#FAFAF8` backgrounds, `#F5F0E8` cards/canvas.

---

## 11. Shared Libraries

| What | File | Notes |
|------|------|-------|
| Supabase client | `src/lib/supabase.ts` | Use in client + server |
| Domain types (non-3D) | `src/types/domain.ts` | Project, Fixture, Sequence, EffectBlock |
| **3D types** | `src/lib/3d/types.ts` | Everything 3D-related — see Section 5a |
| Fixture library | `src/lib/fixtures/library.ts` | `nextStartChannel()` — no channel overlaps |
| Timeline types | `src/lib/timeline/types.ts` | EffectBlock, Track, Sequence |

---

## 12. Database & Storage

| What | Location | Notes |
|------|----------|-------|
| Primary DB schema | `supabase/migrations/` | Single-table JSONB model |
| Projects table | `projects` in Supabase | `data` column is JSONB |
| Audio storage | Supabase bucket: `songs` | MP3 files (note: bucket naming mismatch in migration 002 — see PROJECT-STATUS.md §1) |
| RLS policies | `supabase/migrations/` | Users can only read/write their own |

---

## 13. Known Bugs & Active Fixes

> Log bugs here as they're found. Remove the row when the fix ships. Keep this section honest.

| Bug | Where it likely lives | Status | Notes |
|-----|----------------------|--------|-------|
| *(none logged yet)* | — | — | — |

### How to log a bug

Copy this line and fill it in:

```
| Short description | `src/path/to/suspect/file.ts` | Open / In Progress / Fixed | Any context |
```

---

## Appendix — 3D Build Firing Order

When using multi-agent Claude Code for the 3D layout system:

1. **Foundation first** (`src/lib/3d/types.ts` + constants + Scene3D shell) — must finish before others start
2. **Agents 2, 3, 5 in parallel** — house mesh, fixture renderer, data/store/coord bridge (no file conflicts)
3. **Integration last** — interaction system + UI shell + wire-up

File ownership is strict. If two agents touch the same file, you get merge conflicts and broken types. Don't allow it.

---

*Update this file every time a new module is added, a file is moved, or a bug is logged. It should always reflect the actual state of the repo.*
