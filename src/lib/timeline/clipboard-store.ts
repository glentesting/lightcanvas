import { create } from "zustand";
import type { Clipboard } from "./repeat";
import { toClipboard } from "./repeat";
import type { EffectBlock } from "./types";

/**
 * What was copied. Deliberately NOT part of the editor store: a clipboard is
 * not project data, so it must never be autosaved and must never appear as an
 * undo step.
 */
interface ClipboardState {
  clip: Clipboard;
  copy: (blocks: EffectBlock[]) => void;
  clear: () => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  clip: { entries: [], span: 0 },
  copy: (blocks) => set({ clip: toClipboard(blocks) }),
  clear: () => set({ clip: { entries: [], span: 0 } }),
}));
