import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import {
  createProjectSlice,
  type ProjectSlice,
} from "./slices/project-slice";
import {
  createFixtureSlice,
  type FixtureSlice,
} from "./slices/fixture-slice";
import {
  createTimelineSlice,
  type TimelineSlice,
} from "./slices/timeline-slice";

/**
 * Primary autosaved editor store, composed from three slices:
 *   - ProjectSlice  (identity, name, audio, house template)
 *   - FixtureSlice  (fixtures, groups, and the tracks they own)
 *   - TimelineSlice (sequence: blocks, tracks, export name maps)
 *
 * Undo/redo (zundo `temporal`) covers all autosaved project data atomically,
 * matching the legacy behavior. UI-only state lives in sibling stores:
 *   - useSelectionStore   (src/lib/store/selection-store.ts)
 *   - useSaveStatusStore  (src/lib/store/save-status-store.ts)
 *
 * Cross-store coordination (e.g. `loadProject` clearing selection,
 * `deleteBlocks` clearing selection) is handled inside the slice actions
 * by calling the sibling store's `getState()` directly.
 */
export type EditorState = ProjectSlice & FixtureSlice & TimelineSlice;

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    temporal(
      immer((set, get, store) => ({
        ...createProjectSlice(set, get, store),
        ...createFixtureSlice(set, get, store),
        ...createTimelineSlice(set, get, store),
      })),
      {
        // Only track project-data mutations for undo/redo.
        // `projectId` is excluded — switching projects shouldn't be undoable.
        partialize: (state) => ({
          name: state.name,
          audioUrl: state.audioUrl,
          audioFile: state.audioFile,
          audio: state.audio,
          fixtures: state.fixtures,
          groups: state.groups,
          sequence: state.sequence,
          houseTemplate: state.houseTemplate,
        }),
        limit: 100,
      }
    )
  )
);
