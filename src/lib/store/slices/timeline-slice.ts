import type { EffectBlock, Sequence } from "@/lib/timeline/types";
import { useSelectionStore } from "../selection-store";
import type { EditorSliceCreator } from "./types";

/**
 * Timeline sequence: tracks, blocks, BPM grid, and export-name mappings.
 *
 * Cross-store coordination: `deleteBlocks` and `duplicateBlocks` need to
 * update selection (clear deleted selection / select new duplicates).
 * Because selection lives in `useSelectionStore`, these actions call
 * `useSelectionStore.getState()...` directly.
 */
export interface TimelineSlice {
  sequence: Sequence;

  addBlock: (block: EffectBlock) => void;
  updateBlock: (id: string, patch: Partial<EffectBlock>) => void;
  moveBlocks: (ids: string[], deltaSeconds: number, deltaTrackIndex: number) => void;
  resizeBlock: (id: string, edge: "start" | "end", newTime: number) => void;
  deleteBlocks: (ids: string[]) => void;
  duplicateBlocks: (ids: string[]) => void;
  setXlightsNameMap: (map: Record<string, string>) => void;
  setLorMapping: (map: Record<string, { unit: number; circuit: number }>) => void;
}

export const createTimelineSlice: EditorSliceCreator<TimelineSlice> = (set) => ({
  sequence: { tracks: [], blocks: [], bpm: 120, beatGridOffset: 0 },

  addBlock: (block) =>
    set((state) => {
      state.sequence.blocks.push(block);
    }),

  updateBlock: (id, patch) =>
    set((state) => {
      const block = state.sequence.blocks.find((b) => b.id === id);
      if (block) Object.assign(block, patch);
    }),

  moveBlocks: (ids, deltaSeconds, deltaTrackIndex) =>
    set((state) => {
      const tracks = state.sequence.tracks;
      for (const block of state.sequence.blocks) {
        if (!ids.includes(block.id)) continue;
        block.start = Math.max(0, block.start + deltaSeconds);
        if (deltaTrackIndex !== 0) {
          const currentIdx = tracks.findIndex((t) => t.id === block.trackId);
          const newIdx = Math.max(
            0,
            Math.min(tracks.length - 1, currentIdx + deltaTrackIndex)
          );
          block.trackId = tracks[newIdx].id;
        }
      }
    }),

  resizeBlock: (id, edge, newTime) =>
    set((state) => {
      const block = state.sequence.blocks.find((b) => b.id === id);
      if (!block) return;
      if (edge === "start") {
        const end = block.start + block.duration;
        block.start = Math.max(0, Math.min(newTime, end - 0.1));
        block.duration = end - block.start;
      } else {
        block.duration = Math.max(0.1, newTime - block.start);
      }
    }),

  deleteBlocks: (ids) => {
    set((state) => {
      state.sequence.blocks = state.sequence.blocks.filter(
        (b) => !ids.includes(b.id)
      );
    });
    // Selection lives in useSelectionStore; clear deleted blocks' selection.
    useSelectionStore.getState().clearSelection();
  },

  duplicateBlocks: (ids) => {
    let newIds: string[] = [];
    set((state) => {
      const toDuplicate = state.sequence.blocks.filter((b) => ids.includes(b.id));
      const newBlocks = toDuplicate.map((b) => ({
        ...b,
        id: crypto.randomUUID(),
        start: b.start + b.duration,
      }));
      state.sequence.blocks.push(...newBlocks);
      newIds = newBlocks.map((b) => b.id);
    });
    // Cross-store: select the newly created duplicates.
    useSelectionStore.getState().setSelection(newIds, "replace");
  },

  setXlightsNameMap: (map) =>
    set((state) => {
      state.sequence.xlightsNameMap = map;
    }),

  setLorMapping: (map) =>
    set((state) => {
      state.sequence.lorMapping = map;
    }),
});
