"use client";

import { useEffect } from "react";
import { useStore } from "zustand";
import { useEditorStore } from "./editor-store";

/**
 * Live undo/redo state for buttons. `canUndo`/`canRedo` re-render when the
 * history changes, so a button can honestly disable itself instead of looking
 * clickable and doing nothing.
 *
 * History is cleared when a project loads (see `loadProject`), so undo can
 * never roll back past the display you opened.
 */
export function useUndoRedo() {
  const pastCount = useStore(useEditorStore.temporal, (s) => s.pastStates.length);
  const futureCount = useStore(useEditorStore.temporal, (s) => s.futureStates.length);
  return {
    canUndo: pastCount > 0,
    canRedo: futureCount > 0,
    pastCount,
    futureCount,
    undo: () => useEditorStore.temporal.getState().undo(),
    redo: () => useEditorStore.temporal.getState().redo(),
  };
}

/** Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z / Ctrl+Y, ignored while typing in a field. */
export function useUndoShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.temporal.getState().undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        useEditorStore.temporal.getState().redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
