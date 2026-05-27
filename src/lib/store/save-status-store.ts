import { create } from "zustand";

/**
 * UI-only save status. Not autosaved, not in undo history.
 *
 * Lives separately from useEditorStore because save status reflects
 * the autosave pipeline, not user-editable data, and should never
 * land in the zundo undo stack.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface SaveStatusState {
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  saveStatus: "idle",
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
