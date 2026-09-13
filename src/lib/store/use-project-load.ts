"use client";

/**
 * The ONE way a page loads a project into the editor store.
 *
 * Three pages need this — the designer, the layout editor and the timeline —
 * and before this hook existed each did it by hand. They drifted: the layout
 * editor had no `.catch` at all, so a failed load left the spinner turning
 * forever with an unhandled rejection in the console and no way out.
 *
 * A load that does not finish MUST become a visible error. That is the rule
 * this hook exists to enforce. Three things can go wrong and all three of
 * them surface:
 *
 *   1. The request fails or the server answers with an error  → message.
 *   2. The request never answers at all                       → timeout.
 *   3. The page is remounting in a loop and refetching        → loop guard.
 *
 * (3) is not hypothetical. On 2026-09-12 a production `next build` was run
 * against the same `.next` directory as a running `next dev`, which left the
 * dev server rebuilding forever. The designer page remounted continuously,
 * and because the fetch is guarded by a ref that a remount resets, it
 * refetched 1.3 MB roughly every 8 ms for two days behind a spinner that
 * said only "Loading project...". Nothing told the owner anything was wrong.
 * The build collision is fixed separately (see next.config.ts); this makes
 * sure that shape of failure can never be silent again.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";

/** A load that has not answered in this long is treated as failed. */
const LOAD_TIMEOUT_MS = 20_000;

/** More loads than this of the same project inside the window = a loop. */
const LOOP_LIMIT = 5;
const LOOP_WINDOW_MS = 10_000;

/**
 * Module-level so it survives the remounts it is trying to detect — a ref or
 * state would be reset by the very loop we are watching for.
 */
const loadAttempts = new Map<string, { count: number; windowStart: number }>();

function registerAttemptAndCheckLoop(projectId: string): boolean {
  const now = Date.now();
  const prev = loadAttempts.get(projectId);
  if (!prev || now - prev.windowStart > LOOP_WINDOW_MS) {
    loadAttempts.set(projectId, { count: 1, windowStart: now });
    return false;
  }
  prev.count += 1;
  return prev.count > LOOP_LIMIT;
}

function clearAttempts(projectId: string) {
  loadAttempts.delete(projectId);
}

export interface ProjectLoadState {
  /** The project is in the store and the page may render it. */
  loaded: boolean;
  /** Plain-English failure, already written for the owner. Null while fine. */
  error: string | null;
  /** Try again from scratch. Safe to call from a button. */
  retry: () => void;
}

export function useProjectLoad(projectId: string | null | undefined): ProjectLoadState {
  const loadProject = useEditorStore((s) => s.loadProject);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  /**
   * Already in the store — navigated here from another editor page. Derived
   * during render rather than set from the effect, so there is no cascading
   * re-render and no lint suppression.
   */
  const alreadyInStore = useEditorStore(
    (s) => !!projectId && s.projectId === projectId
  );

  // Guards this mount against running the fetch twice (React strict mode).
  const startedRef = useRef(false);

  const retry = useCallback(() => {
    if (projectId) clearAttempts(projectId);
    startedRef.current = false;
    setError(null);
    setLoaded(false);
    setAttempt((n) => n + 1);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    // Already in the store from another page in this session — nothing to
    // fetch; `alreadyInStore` reports it as loaded during render.
    if (useEditorStore.getState().projectId === projectId) {
      clearAttempts(projectId);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    if (registerAttemptAndCheckLoop(projectId)) {
      // The loop counter is an external system — a module-level map that
      // deliberately outlives the remounts being counted — so reporting it
      // from an effect is what this rule exists to allow. It fires once and
      // then the component stops fetching, so there is no cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(
        "This page keeps restarting before your show can finish loading, so it has been stopped. " +
          "Your show is safe — nothing has been changed. Close this tab and open LightCanvas again; " +
          "if it keeps happening, close the black window and start LightCanvas fresh."
      );
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), LOAD_TIMEOUT_MS);
    let cancelled = false;

    fetch(`/api/projects/${projectId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "That show could not be found. It may have been deleted."
              : `Could not load your show (the server said ${res.status}).`
          );
        }
        return res.json();
      })
      .then((row) => {
        if (cancelled) return;
        const project = projectFromRow(row);
        // A nearly-empty project gets the starter set so the editor is usable.
        if (project.fixtures.length < 6) {
          const defaults = createDefaultFixtures();
          project.fixtures = defaults;
          project.sequence = {
            ...project.sequence,
            tracks: defaults.map((f) => ({ id: f.id, kind: "fixture" as const })),
          };
        }
        loadProject(project);
        clearAttempts(projectId);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const aborted = err instanceof DOMException && err.name === "AbortError";
        setError(
          aborted
            ? "Your show is taking too long to load and has been stopped so it doesn't hang. " +
                "Your show is safe — nothing has been changed. Try again."
            : err instanceof Error
            ? err.message
            : "Could not load your show."
        );
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
    // `attempt` is here so retry() re-runs the effect.
  }, [projectId, loadProject, attempt]);

  return { loaded: loaded || alreadyInStore, error, retry };
}
