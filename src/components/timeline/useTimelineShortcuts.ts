"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/lib/store/editor-store";

export function useTimelineShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const state = useEditorStore.getState();
      const { selectedBlockIds } = state;

      // Delete / Backspace — delete selected blocks
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockIds.length > 0) {
        e.preventDefault();
        state.deleteBlocks(selectedBlockIds);
      }

      // Cmd+D — duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedBlockIds.length > 0) {
        e.preventDefault();
        state.duplicateBlocks(selectedBlockIds);
      }

      // Cmd+A — select all
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        state.setSelection(state.sequence.blocks.map((b) => b.id));
      }

      // Escape — clear selection
      if (e.key === "Escape") {
        state.clearSelection();
      }

      // Cmd+Z — undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.temporal.getState().undo();
      }

      // Cmd+Shift+Z or Cmd+Y — redo
      if (((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === "y")) {
        e.preventDefault();
        useEditorStore.temporal.getState().redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
