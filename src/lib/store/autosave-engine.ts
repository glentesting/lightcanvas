/**
 * The decision half of autosave — no React, no network — so the rules can be
 * tested directly. `scripts/verify-autosave.mts` drives this file.
 *
 * Why it exists: before 2026-09-27 autosave treated the project *load* as an
 * edit. The "last saved" baseline started as an empty string, `loadProject`
 * writes the whole watched slice in one go, so roughly 1.2 s after opening a
 * project the app POSTed the entire show back to Supabase with nobody having
 * touched anything. Opening a show rewrote the row and moved `updated_at`
 * through the `projects_touch` trigger.
 *
 * The same hole had a nastier shape: if a second project failed to load while
 * the first was still in the store, the pending write went out under the
 * second project's id — one project's data saved over another's.
 *
 * The rules below are the fix, and they are deliberately boring. A save
 * happens only when a project that has finished loading, and is still the one
 * the page is showing, has genuinely changed since it was loaded — and never
 * when the change would leave the show empty.
 */

import type { Fixture, FixtureGroup } from "@/types/domain";
import type { Sequence } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";

/** Exactly the project data autosave persists. Mirrors the API's schema. */
export interface AutosaveSlice {
  name: string;
  audioUrl: string | null;
  audioFile: string | null;
  audio: AudioAnalysis | null;
  fixtures: Fixture[];
  groups: FixtureGroup[];
  sequence: Sequence;
  houseTemplate: string;
  houseCustomSvg?: string;
}

/** The two numbers that must never fall to zero behind the owner's back. */
export interface AutosaveCounts {
  fixtures: number;
  blocks: number;
}

export function countsOf(slice: AutosaveSlice): AutosaveCounts {
  return { fixtures: slice.fixtures.length, blocks: slice.sequence.blocks.length };
}

export type AutosaveSkipReason =
  /** The page has not finished loading the project yet. */
  | "not-loaded"
  /** The load failed; the store cannot be trusted to hold this project. */
  | "load-error"
  /** The store holds a different project than the page is showing. */
  | "different-project"
  /** No post-load baseline yet, so "changed" is not yet meaningful. */
  | "no-baseline"
  /** Identical to what was loaded (or last saved). */
  | "unchanged";

export type AutosaveDecision =
  | { action: "save" }
  | { action: "skip"; reason: AutosaveSkipReason }
  | { action: "refuse"; reason: "would-empty"; message: string };

export interface AutosaveInput {
  /** The page's own load state — from `useProjectLoad`. */
  loaded: boolean;
  loadError: string | null;
  /** The project the page is showing. */
  pageProjectId: string;
  /** The project actually sitting in the store right now. */
  storeProjectId: string;
  /** Serialized slice as loaded (or as last saved). Null until seeded. */
  baseline: string | null;
  baselineCounts: AutosaveCounts | null;
  /** Serialized slice as it stands now. */
  candidate: string;
  candidateCounts: AutosaveCounts;
}

/** Shown in the header instead of writing an empty show over a full one. */
export const EMPTY_SAVE_MESSAGE =
  "Not saved — that would have emptied your show. Press Undo to put it back.";

export function decideAutosave(input: AutosaveInput): AutosaveDecision {
  if (!input.loaded) return { action: "skip", reason: "not-loaded" };
  if (input.loadError) return { action: "skip", reason: "load-error" };
  if (!input.pageProjectId || input.storeProjectId !== input.pageProjectId) {
    return { action: "skip", reason: "different-project" };
  }
  if (input.baseline === null || input.baselineCounts === null) {
    return { action: "skip", reason: "no-baseline" };
  }
  if (input.candidate === input.baseline) return { action: "skip", reason: "unchanged" };

  // A show that had props and effects must never be saved back with none.
  // This is the last line of defence, not the only one: it catches a bad bulk
  // delete, a bad import, and any future bug that empties the store.
  const had = input.baselineCounts;
  const now = input.candidateCounts;
  if ((had.fixtures > 0 && now.fixtures === 0) || (had.blocks > 0 && now.blocks === 0)) {
    return { action: "refuse", reason: "would-empty", message: EMPTY_SAVE_MESSAGE };
  }

  return { action: "save" };
}

/** What the caller knows at the moment a decision is needed. */
export interface AutosaveContext {
  loaded: boolean;
  loadError: string | null;
  pageProjectId: string;
  storeProjectId: string;
  slice: AutosaveSlice;
  serialized: string;
}

/**
 * Holds the baseline across a project's lifetime. The React hook owns one of
 * these; so does the test, which is the point — the orchestration under test
 * is the orchestration that ships.
 */
export interface AutosaveController {
  /** Forget everything. Called when the page switches project. */
  reset(): void;
  /** Record the project as loaded. After this, a load is not a difference. */
  seed(projectId: string, slice: AutosaveSlice): void;
  /** Which project the current baseline belongs to, or null. */
  seededFor(): string | null;
  decide(ctx: AutosaveContext): AutosaveDecision;
  /** Move the baseline forward after a write actually succeeded. */
  commit(serialized: string, counts: AutosaveCounts): void;
}

export function createAutosaveController(): AutosaveController {
  let baseline: string | null = null;
  let baselineCounts: AutosaveCounts | null = null;
  let seeded: string | null = null;

  return {
    reset() {
      baseline = null;
      baselineCounts = null;
      seeded = null;
    },
    seed(projectId, slice) {
      baseline = JSON.stringify(slice);
      baselineCounts = countsOf(slice);
      seeded = projectId;
    },
    seededFor: () => seeded,
    decide: (ctx) =>
      decideAutosave({
        loaded: ctx.loaded,
        loadError: ctx.loadError,
        pageProjectId: ctx.pageProjectId,
        storeProjectId: ctx.storeProjectId,
        baseline,
        baselineCounts,
        candidate: ctx.serialized,
        candidateCounts: countsOf(ctx.slice),
      }),
    commit(serialized, counts) {
      baseline = serialized;
      baselineCounts = counts;
    },
  };
}
