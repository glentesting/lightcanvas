"use client";

import { useEffect, useRef } from "react";
import { shallow } from "zustand/shallow";
import { useEditorStore } from "./editor-store";

export function useAutosave(projectId: string) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the inner "flip saved→idle" timer so it can be cleared on unmount (fix #5)
  const savedIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    // Fix #1: pass `shallow` as the equality function so the selector object
    // is compared field-by-field rather than by reference, preventing a
    // subscription callback on every unrelated store change.
    const unsubscribe = useEditorStore.subscribe(
      (state) => ({
        name: state.name,
        audioUrl: state.audioUrl,
        audioFile: state.audioFile,
        audio: state.audio,
        fixtures: state.fixtures,
        groups: state.groups,
        sequence: state.sequence,
        houseTemplate: state.houseTemplate,
        houseCustomSvg: state.houseCustomSvg,
      }),
      (slice) => {
        const serialized = JSON.stringify(slice);
        if (serialized === lastSavedRef.current) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
          useEditorStore.getState().setSaveStatus("saving");
          try {
            const res = await fetch(`/api/projects/${projectId}/autosave`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: serialized,
            });
            if (res.ok) {
              lastSavedRef.current = serialized;
              useEditorStore.getState().setSaveStatus("saved");
              // Fix #5: track this inner timer so it can be cleared on unmount
              savedIdleTimerRef.current = setTimeout(() => {
                if (useEditorStore.getState().saveStatus === "saved") {
                  useEditorStore.getState().setSaveStatus("idle");
                }
              }, 2000);
            } else {
              useEditorStore.getState().setSaveStatus("error");
            }
          } catch {
            useEditorStore.getState().setSaveStatus("error");
          }
        }, 1200);
      },
      // Fix #1: shallow equality prevents spurious callbacks when unrelated
      // state (e.g. selectedBlockIds, saveStatus) changes.
      { equalityFn: shallow }
    );

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Fix #5: also clear the inner saved→idle timer on unmount
      if (savedIdleTimerRef.current) clearTimeout(savedIdleTimerRef.current);
    };
  }, [projectId]);
}
