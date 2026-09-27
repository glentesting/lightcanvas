"use client";

/**
 * Autosave: the React half. The rules and the baseline live in
 * `autosave-engine.ts` and are tested by `scripts/verify-autosave.mts` — read
 * that file first for why this is shaped the way it is.
 *
 * The short version: loading a project must never count as an edit. This hook
 * takes the page's own load state, seeds a baseline from the project the
 * moment it has loaded, and only writes when the store drifts away from that
 * baseline while still holding the project the page is showing.
 */

import { useEffect, useRef } from "react";
import { useEditorStore, type EditorState } from "./editor-store";
import {
  countsOf,
  createAutosaveController,
  type AutosaveController,
  type AutosaveSlice,
} from "./autosave-engine";

const AUTOSAVE_DEBOUNCE_MS = 1200;
const SAVED_BADGE_MS = 2000;

/** What the page knows about its own load, straight from `useProjectLoad`. */
export interface AutosaveGate {
  loaded: boolean;
  loadError: string | null;
}

/** The watched slice. Must stay in step with the autosave API's schema. */
export function autosaveSliceOf(s: EditorState): AutosaveSlice {
  return {
    name: s.name,
    audioUrl: s.audioUrl,
    audioFile: s.audioFile,
    audio: s.audio,
    fixtures: s.fixtures,
    groups: s.groups,
    sequence: s.sequence,
    houseTemplate: s.houseTemplate,
    houseCustomSvg: s.houseCustomSvg,
  };
}

export function useAutosave(projectId: string, gate: AutosaveGate) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AutosaveController | null>(null);
  if (controllerRef.current === null) controllerRef.current = createAutosaveController();
  const gateRef = useRef<AutosaveGate>(gate);

  // Keep the live gate readable from the subscription below. Every decision is
  // taken again at flush time, so a one-render lag here cannot cause a bad
  // write — it can only delay a good one by a tick.
  useEffect(() => {
    gateRef.current = gate;
  });

  // Changing project throws the old baseline away. Declared before the seed
  // effect so that on a project change this runs first and cannot wipe the
  // baseline the seed effect is about to set.
  useEffect(() => {
    controllerRef.current?.reset();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [projectId]);

  // Seed the baseline from the project as loaded. This is the whole fix: with
  // a baseline in place, the load itself is no longer a difference.
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !projectId || !gate.loaded || gate.loadError) return;
    if (controller.seededFor() === projectId) return;
    const state = useEditorStore.getState();
    if (state.projectId !== projectId) return;
    controller.seed(projectId, autosaveSliceOf(state));
  }, [projectId, gate.loaded, gate.loadError]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!projectId || !controller) return;

    const decideNow = (slice: AutosaveSlice, serialized: string) =>
      controller.decide({
        loaded: gateRef.current.loaded,
        loadError: gateRef.current.loadError,
        pageProjectId: projectId,
        storeProjectId: useEditorStore.getState().projectId,
        slice,
        serialized,
      });

    const flush = async () => {
      // Decide again against the store as it stands now: the debounce window
      // is long enough for the page to have navigated, or the load to have
      // failed, since the change that scheduled this.
      const state = useEditorStore.getState();
      const slice = autosaveSliceOf(state);
      const serialized = JSON.stringify(slice);
      const decision = decideNow(slice, serialized);

      if (decision.action === "refuse") {
        state.setSaveStatus("refused", decision.message);
        return;
      }
      if (decision.action !== "save") return;

      state.setSaveStatus("saving");
      try {
        const res = await fetch(`/api/projects/${projectId}/autosave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });
        if (res.ok) {
          controller.commit(serialized, countsOf(slice));
          useEditorStore.getState().setSaveStatus("saved");
          setTimeout(() => {
            if (useEditorStore.getState().saveStatus === "saved") {
              useEditorStore.getState().setSaveStatus("idle");
            }
          }, SAVED_BADGE_MS);
        } else {
          useEditorStore.getState().setSaveStatus("error");
        }
      } catch {
        useEditorStore.getState().setSaveStatus("error");
      }
    };

    const unsubscribe = useEditorStore.subscribe(autosaveSliceOf, (slice) => {
      const serialized = JSON.stringify(slice);
      const decision = decideNow(slice, serialized);

      if (decision.action === "refuse") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        useEditorStore.getState().setSaveStatus("refused", decision.message);
        return;
      }
      if (decision.action !== "save") return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => void flush(), AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [projectId]);
}
