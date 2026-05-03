"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "./editor-store";

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
              setTimeout(() => {
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
      }
    );

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [projectId]);
}
