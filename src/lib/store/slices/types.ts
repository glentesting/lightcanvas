import type { StateCreator } from "zustand";
import type { EditorState } from "../editor-store";

/**
 * Helper type for slice creators. Each slice is composed into the full
 * `EditorState` and uses immer middleware, so `set` accepts a draft mutation.
 */
export type EditorSliceCreator<TSlice> = StateCreator<
  EditorState,
  [["zustand/immer", never]],
  [],
  TSlice
>;
