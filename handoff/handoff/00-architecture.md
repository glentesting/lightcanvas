# 00 — Architecture & Data Model

## Mental model

Lumen is a **timeline editor over a fixture graph**, with a **renderer** that turns timeline state into per-pixel colors at any time `t`.

Three core domains:

1. **Project** — metadata, the audio file, the song's analyzed beats, and the user's fixture layout
2. **Sequence** — the timeline: a list of tracks, each with a list of effect blocks
3. **Render** — pure functions that take `(sequence, fixtures, t) → Map<fixtureId, Pixel[]>`

Every UI surface (timeline, layout, preview, export) reads from the same project state. Nothing duplicates the source of truth.

---

## Folder structure

Add these to the existing Next.js app. Do not move files that already exist; add alongside.

```
app/
  (marketing)/
    page.tsx                          # Welcome — already exists, restyle to match prototype
  (app)/
    dashboard/
      page.tsx                        # Project list
      _components/
        project-card.tsx
        new-project-dialog.tsx
    projects/
      [id]/
        page.tsx                      # Project detail (rare — usually goes straight to /edit)
        edit/
          page.tsx                    # The editor
          _components/
            editor-shell.tsx
            top-bar.tsx
            sidebar.tsx
            tabs/
              audio-timeline.tsx
              layout.tsx
              preview.tsx
            timeline/
              timeline.tsx
              track-row.tsx
              effect-block.tsx
              waveform.tsx
              ruler.tsx
              playhead.tsx
              context-menu.tsx
            ai-panel/
              ai-panel.tsx
              ai-action-card.tsx
            export-dialog/
              export-dialog.tsx
  api/
    projects/
      [id]/
        autosave/route.ts             # POST — debounced autosave
        export/route.ts               # GET ?format=lumen|xlights|mp4
    upload/
      audio/route.ts                  # POST — generates signed Supabase upload URL
    ai/
      generate/route.ts               # POST — mock provider, real interface
      suggest-beats/route.ts
      style-transfer/route.ts

components/
  ui/                                 # shadcn (already there)
  lumen/                              # our app-specific reusable bits
    color-swatch.tsx
    fixture-icon.tsx
    effect-icon.tsx
    pin.tsx                           # design-annotation pins (dev-only, behind a flag)

lib/
  supabase/
    server.ts                         # already exists
    client.ts                         # already exists
    types.ts                          # generated from database
  audio/
    wavesurfer-config.ts
    beat-detector.ts                  # Meyda wrapper
    transport.ts                      # play/pause/seek wrapper
  timeline/
    types.ts                          # Track, EffectBlock, Sequence
    operations.ts                     # pure functions: insert, move, resize, split, delete
    snapping.ts                       # snap-to-beat helpers
    selection.ts                      # multi-select math
  fixtures/
    types.ts                          # Fixture, FixtureGroup, Pixel
    library.ts                        # default fixture templates (Roofline, Mega tree, …)
    layout.ts                         # placing fixtures in the house SVG
  render/
    engine.ts                         # main renderer — sequence + fixtures + t → pixels
    effects/
      twinkle.ts
      chase.ts
      fade.ts
      strobe.ts
      sparkle.ts
      wave.ts
      pulse.ts
      wash.ts
      meteor.ts
      firework.ts
      index.ts                        # registry { id → effect }
  exports/
    lumen-json.ts
    xlights.ts                        # builds .xsq sequence file
    mp4.ts                            # uses MediaRecorder to capture preview canvas
  ai/
    provider.ts                       # interface (Provider)
    mock-provider.ts                  # current impl
    anthropic-provider.ts             # stub — swap in later
  store/
    editor-store.ts                   # Zustand + immer
    selectors.ts
    history.ts                        # undo/redo middleware
  utils/
    ids.ts                            # nanoid wrappers
    color.ts                          # hex/rgb/hsl conversions, oklch helpers
    time.ts                           # seconds ↔ ticks, formatting
    keyboard.ts                       # shortcut registry

public/
  house/
    house-default.svg                 # the stylized house from the prototype
  fixtures/
    roofline.svg
    mega-tree.svg
    arch.svg
    bush.svg
    window.svg
    mini-tree.svg

types/
  database.ts                         # supabase-generated
  domain.ts                           # exports of lib/timeline/types, lib/fixtures/types, etc
```

---

## Domain types (canonical — copy this verbatim into `lib/timeline/types.ts` etc)

```ts
// lib/fixtures/types.ts
export type FixtureKind =
  | 'roofline' | 'mega-tree' | 'mini-tree' | 'arch' | 'bush' | 'window-outline' | 'custom';

export interface Fixture {
  id: string;                  // nanoid
  kind: FixtureKind;
  name: string;                // user-editable; default from kind
  pixelCount: number;          // total addressable pixels in this strand
  startChannel: number;        // controller channel index (1-based, like xLights)
  // Layout — placement on the house SVG, in normalized 0..1 coords
  layout?: {
    points: Array<{ x: number; y: number }>; // path the strand follows
    closed?: boolean;
  };
  groupId?: string;            // optional group membership
}

export interface FixtureGroup {
  id: string;
  name: string;
  fixtureIds: string[];
}

// lib/timeline/types.ts
import type { Fixture } from '../fixtures/types';

export type EffectId =
  | 'twinkle' | 'chase' | 'fade' | 'strobe' | 'sparkle'
  | 'wave' | 'pulse' | 'wash' | 'meteor' | 'firework';

export type Easing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface EffectParams {
  // Common
  color1: string;              // hex
  color2?: string;             // for two-color effects
  intensity: number;           // 0..1
  speed: number;               // 0.25..4 — relative
  easing: Easing;
  // Effect-specific (typed unions in real code; flat here for brevity)
  density?: number;            // twinkle, sparkle
  direction?: 'forward' | 'backward' | 'center-out' | 'in';
  trailLength?: number;        // meteor
  burstCount?: number;         // firework
}

export interface EffectBlock {
  id: string;
  trackId: string;             // = fixtureId or groupId
  effectId: EffectId;
  start: number;               // seconds
  duration: number;            // seconds
  params: EffectParams;
  locked?: boolean;
}

export interface Track {
  id: string;                  // === fixture.id OR group.id
  kind: 'fixture' | 'group';
  collapsed?: boolean;
  height?: number;             // px override
}

export interface Sequence {
  tracks: Track[];
  blocks: EffectBlock[];
  bpm: number;
  beatGridOffset: number;      // seconds — where beat 1 starts
}

// lib/audio/types.ts
export interface AudioAnalysis {
  duration: number;            // seconds
  bpm: number;
  beats: number[];             // seconds, length === bar*beats
  downbeats: number[];         // seconds, every N bar
  onsets: number[];            // detected transients (drops, hits)
  loudness: Array<{ t: number; v: number }>; // for waveform overlay
}

// types/domain.ts — top-level project
export interface Project {
  id: string;
  ownerId: string;             // Clerk user id
  name: string;
  audioUrl: string | null;     // Supabase storage signed URL
  audioFileName: string | null;
  audio: AudioAnalysis | null;
  fixtures: Fixture[];
  groups: FixtureGroup[];
  sequence: Sequence;
  houseTemplate: 'default' | 'modern' | 'cottage' | 'custom';
  houseCustomSvg?: string;     // user-uploaded SVG
  createdAt: string;
  updatedAt: string;
}
```

---

## State boundaries — what lives where

| State | Lives in | Why |
|---|---|---|
| Auth user | Clerk hooks | already wired |
| List of projects | React Query, fetched from server actions | server-truth, infrequent |
| Current project metadata + fixtures + sequence | **Zustand** (`editor-store`) | high-frequency edits, undo/redo |
| Playhead time, isPlaying, scroll offset, hover state | **Zustand**, but in a separate slice (`transport`) so undo doesn't track it | UI-only, do not autosave |
| Audio buffer + WaveSurfer instance | **React ref**, not Zustand | not serializable |
| AI panel chat history | Zustand, ephemeral (not persisted to DB) | per-session |

**Autosave rule:** changes to project metadata, fixtures, groups, or sequence trigger a debounced (1.2s) POST to `/api/projects/[id]/autosave`. Transport state never autosaves.

---

## Routing map

| Route | What it shows |
|---|---|
| `/` | Welcome (marketing) — "Light shows, without the spreadsheet." CTA → `/sign-up` |
| `/sign-in`, `/sign-up` | Clerk's hosted UI styled to match |
| `/onboarding` | 3-step wizard, only shown if `onboardingComplete = false` on Clerk's `publicMetadata` |
| `/dashboard` | Project list + new-project button |
| `/projects/[id]/edit` | Editor (the screen the prototype shows) |
| `/projects/[id]/edit?tab=layout` | Editor, Layout tab |
| `/projects/[id]/edit?tab=preview` | Editor, Preview tab |

The editor's tab is in the URL query so refresh keeps you on the same tab.

---

## What "done" looks like for THIS slice

You don't ship anything from this file alone. Confirm with the user that:

- The folder layout is acceptable
- The domain types match what they expect
- Zustand for editor state vs React Query for server state is the right call

Then move to `01-supabase.md`.
