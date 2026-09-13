"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STEPS, TOTAL_STEPS } from "./steps";

/**
 * Bench-test progress, saved in the browser on every tap.
 *
 * Deliberately NOT in the project database: this is not show data, it must
 * work with zero setup, and it belongs to the machine standing at the bench.
 * It survives closing the browser and restarting the PC. The summary screen's
 * Copy button is how results leave this machine.
 */

export interface StepAnswer {
  /** option id the user chose */
  choice: string;
  /** their typed note, if any */
  note?: string;
  /** ISO timestamp of when they answered */
  at: string;
}

interface BenchTestState {
  /** index into STEPS; TOTAL_STEPS means "on the summary screen" */
  stepIndex: number;
  answers: Record<string, StepAnswer>;
  /** port-table entries, keyed `${stepId}:${port}` */
  portNotes: Record<string, string>;
  startedAt: string | null;

  answer: (stepId: string, choice: string, note?: string) => void;
  setPortNote: (stepId: string, port: number, text: string) => void;
  goTo: (index: number) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
}

export const useBenchTestStore = create<BenchTestState>()(
  persist(
    (set) => ({
      stepIndex: 0,
      answers: {},
      portNotes: {},
      startedAt: null,

      answer: (stepId, choice, note) =>
        set((s) => ({
          startedAt: s.startedAt ?? new Date().toISOString(),
          answers: {
            ...s.answers,
            [stepId]: { choice, note: note?.trim() || undefined, at: new Date().toISOString() },
          },
        })),

      setPortNote: (stepId, port, text) =>
        set((s) => ({
          startedAt: s.startedAt ?? new Date().toISOString(),
          portNotes: { ...s.portNotes, [`${stepId}:${port}`]: text },
        })),

      goTo: (index) => set({ stepIndex: Math.max(0, Math.min(TOTAL_STEPS, index)) }),
      next: () => set((s) => ({ stepIndex: Math.min(TOTAL_STEPS, s.stepIndex + 1) })),
      back: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

      reset: () => set({ stepIndex: 0, answers: {}, portNotes: {}, startedAt: null }),
    }),
    {
      name: "lightcanvas-bench-test-v1",
      storage: createJSONStorage(() => localStorage),
      /**
       * v2 (2026-09-13): three Box 3 screens were added before the two port
       * tables, which shifted every index after them. A saved stepIndex from
       * the September 12 run would now point at the wrong screen — possibly
       * past the new work, which is the one thing we must not do.
       *
       * Answers are keyed by step id, never by index, so they are carried
       * over untouched. Only the position is recomputed: land on the first
       * screen that has no answer yet, which is where the remaining work
       * actually starts.
       */
      version: 2,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<BenchTestState> | undefined;
        if (!state || fromVersion >= 2) return state as BenchTestState;
        const answers = state.answers ?? {};
        const firstUnanswered = STEPS.findIndex((step) => !answers[step.id]);
        return {
          ...(state as BenchTestState),
          answers,
          stepIndex: firstUnanswered === -1 ? TOTAL_STEPS : firstUnanswered,
        };
      },
    }
  )
);
