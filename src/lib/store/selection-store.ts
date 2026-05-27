import { create } from "zustand";

/**
 * UI-only selection state. Not autosaved, not in undo history.
 *
 * Lives separately from useEditorStore because selection changes shouldn't
 * push entries onto the zundo undo stack — users undo edits, not selections.
 *
 * Cross-store coordination: useEditorStore actions that need to clear
 * selection (e.g. loadProject, deleteBlocks) call
 * useSelectionStore.getState().clearSelection() directly.
 */
export interface SelectionState {
  selectedBlockIds: string[];
  selectedFixtureIds: string[];
  hoveredBlockId: string | null;

  setSelection: (ids: string[], mode?: "replace" | "add" | "toggle") => void;
  clearSelection: () => void;
  setHoveredBlockId: (id: string | null) => void;
  setSelectedFixtureIds: (ids: string[]) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedBlockIds: [],
  selectedFixtureIds: [],
  hoveredBlockId: null,

  setSelection: (ids, mode = "replace") =>
    set((state) => {
      if (mode === "replace") {
        return { selectedBlockIds: ids };
      }
      if (mode === "add") {
        const merged = new Set([...state.selectedBlockIds, ...ids]);
        return { selectedBlockIds: Array.from(merged) };
      }
      // toggle
      const current = new Set(state.selectedBlockIds);
      for (const id of ids) {
        if (current.has(id)) current.delete(id);
        else current.add(id);
      }
      return { selectedBlockIds: Array.from(current) };
    }),

  clearSelection: () =>
    set({ selectedBlockIds: [], selectedFixtureIds: [] }),

  setHoveredBlockId: (id) => set({ hoveredBlockId: id }),

  setSelectedFixtureIds: (ids) => set({ selectedFixtureIds: ids }),
}));
