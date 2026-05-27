"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "./editor-store";
import { useSaveStatusStore } from "./save-status-store";

export function useAutosave(projectId: string) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
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
          useSaveStatusStore.getState().setSaveStatus("saving");
          try {
            const res = await fetch(`/api/projects/${projectId}/autosave`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: serialized,
            });
            if (res.ok) {
              lastSavedRef.current = serialized;
              useSaveStatusStore.getState().setSaveStatus("saved");
              setTimeout(() => {
                if (useSaveStatusStore.getState().saveStatus === "saved") {
                  useSaveStatusStore.getState().setSaveStatus("idle");
                }
              }, 2000);
            } else {
              useSaveStatusStore.getState().setSaveStatus("error");
            }
          } catch {
            useSaveStatusStore.getState().setSaveStatus("error");
          }
        }, 1200);
      }
    );

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [projectId]);
}
