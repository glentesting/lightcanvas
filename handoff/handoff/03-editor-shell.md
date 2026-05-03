# 03 — Editor Shell, State, Undo/Redo, Autosave

The editor is a single-page React surface mounted at `/projects/[id]/edit`. It loads the project once, holds it in Zustand, autosaves on change, and never re-fetches during a session.

## Loading the project

```tsx
// app/(app)/projects/[id]/edit/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { EditorShell } from './_components/editor-shell';

export default async function EditPage({ params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) redirect('/sign-in');
  const supabase = createServerClient();
  const { data: project } = await supabase.from('projects').select('*').eq('id', params.id).single();
  if (!project) redirect('/dashboard');
  return <EditorShell initialProject={project} />;
}
```

`EditorShell` is a client component. It hydrates the Zustand store from `initialProject` once, then every interaction reads/writes the store.

## Zustand store shape

```ts
// lib/store/editor-store.ts
import { create } from 'zustand';
import { temporal } from 'zundo';                 // undo/redo middleware
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Project, Fixture, FixtureGroup, EffectBlock, Track, Sequence, AudioAnalysis } from '@/types/domain';

interface EditorState {
  // Project (autosaved)
  projectId: string;
  name: string;
  audioUrl: string | null;
  audioFile: string | null;
  audio: AudioAnalysis | null;
  fixtures: Fixture[];
  groups: FixtureGroup[];
  sequence: Sequence;
  houseTemplate: string;
  houseCustomSvg?: string;

  // Transport (NOT autosaved, NOT undoable — separate slice below)
  // … kept in a sibling store or in refs

  // Selection (UI-only, not autosaved)
  selectedBlockIds: Set<string>;
  selectedFixtureIds: Set<string>;
  hoveredBlockId: string | null;

  // Actions — every mutation goes through one of these
  addBlock: (block: EffectBlock) => void;
  updateBlock: (id: string, patch: Partial<EffectBlock>) => void;
  moveBlocks: (ids: string[], deltaSeconds: number, deltaTrackIndex: number) => void;
  resizeBlock: (id: string, edge: 'start' | 'end', newTime: number) => void;
  deleteBlocks: (ids: string[]) => void;
  splitBlock: (id: string, atSeconds: number) => void;
  duplicateBlocks: (ids: string[]) => void;

  addFixture: (fixture: Fixture) => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  deleteFixture: (id: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  setSelection: (ids: string[], mode?: 'replace' | 'add' | 'toggle') => void;

  loadProject: (project: Project) => void;
}
```

Use `zundo`'s `temporal` middleware to add `useEditorStore.temporal.getState().undo()` and `.redo()`. Configure it to track only the autosaved slice (project) — never selection or transport:

```ts
export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    temporal(
      immer((set) => ({ /* … */ })),
      {
        partialize: (state) => ({
          name: state.name, fixtures: state.fixtures, groups: state.groups,
          sequence: state.sequence, houseTemplate: state.houseTemplate,
        }),
        limit: 100,
      }
    )
  )
);
```

## Transport store (separate, not undoable)

```ts
// lib/store/transport-store.ts
import { create } from 'zustand';

interface TransportState {
  isPlaying: boolean;
  currentTime: number;        // seconds, updated ~30fps from WaveSurfer's audioprocess
  loopRange: [number, number] | null;
  zoom: number;               // pixels per second
  scrollX: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  setZoom: (z: number) => void;
}
```

The audio engine (next file) updates `currentTime` directly. The timeline reads it via `useTransportStore(s => s.currentTime)` — Zustand's shallow-equality + selector pattern keeps re-renders surgical.

## Autosave

Subscribe to the autosaved slice in `EditorShell`'s `useEffect`. Debounce 1.2s. Show a tiny indicator in the top bar: "Saving…" → "Saved" → idle.

```ts
useEffect(() => {
  const unsub = useEditorStore.subscribe(
    (s) => ({ name: s.name, fixtures: s.fixtures, groups: s.groups, sequence: s.sequence }),
    debounce((slice) => {
      fetch(`/api/projects/${projectId}/autosave`, {
        method: 'POST',
        body: JSON.stringify(slice),
        headers: { 'Content-Type': 'application/json' },
      });
    }, 1200),
    { equalityFn: shallow }
  );
  return unsub;
}, [projectId]);
```

`/api/projects/[id]/autosave/route.ts` validates with zod, then `supabase.from('projects').update(...)`. RLS handles auth.

## Top bar

From the prototype:
- Left: back arrow → `/dashboard`, project name (inline-editable on click)
- Center: tab switcher (Audio Timeline / Layout / Preview) — bound to URL `?tab=`
- Right: save indicator, AI Actions button (toggles right panel), Export button (opens dialog)

## Sidebar

Three collapsible sections (from prototype):
1. **Effects** — palette of 10 effect chips. Drag onto timeline, or click to set the "active brush" then click on a track.
2. **Fixtures** — list of the project's fixtures with pixel counts. "+ Add fixture" opens a sub-popover with the 6 templates.
3. **Audio** — file picker + analysis status (BPM, beats detected, song length).

## Acceptance

- [ ] Refresh the page, undo stack is reset; project state is loaded from DB
- [ ] Edit a block, wait 1.5s, refresh → change persisted
- [ ] Cmd+Z undoes the last sequence edit; does NOT undo a play/pause
- [ ] Renaming a project in the top bar updates `name` and reflects on the dashboard within seconds
- [ ] Tab is reflected in the URL — copying the URL and pasting in a new window opens the same tab
