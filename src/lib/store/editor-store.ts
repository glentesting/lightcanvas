import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import type { Project, Fixture, FixtureGroup } from "@/types/domain";
import type { EffectBlock, Sequence } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";
import { MIN_BLOCK_DURATION } from "@/lib/timeline/constants";

export interface EditorState {
  // Project (autosaved)
  projectId: string;
  name: string;
  audioUrl: string | null;
  audioFile: string | null;
  audio: AudioAnalysis | null;
  fixtures: Fixture[];
  groups: FixtureGroup[];
  sequence: Sequence;
  houseTemplate: string;
  houseCustomSvg?: string;

  // Selection (UI-only, not autosaved)
  selectedBlockIds: string[];
  selectedFixtureIds: string[];
  hoveredBlockId: string | null;

  // Save status
  saveStatus: "idle" | "saving" | "saved" | "error";

  // Actions
  loadProject: (project: Project) => void;
  setName: (name: string) => void;
  setAudio: (url: string, fileName: string, analysis: AudioAnalysis | null) => void;

  addBlock: (block: EffectBlock) => void;
  updateBlock: (id: string, patch: Partial<EffectBlock>) => void;
  moveBlocks: (ids: string[], deltaSeconds: number, deltaTrackIndex: number) => void;
  resizeBlock: (id: string, edge: "start" | "end", newTime: number) => void;
  deleteBlocks: (ids: string[]) => void;
  duplicateBlocks: (ids: string[]) => void;

  addFixture: (fixture: Fixture) => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  deleteFixture: (id: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  setXlightsNameMap: (map: Record<string, string>) => void;
  setLorMapping: (map: Record<string, { unit: number; circuit: number }>) => void;
  setHousePhoto: (url: string | undefined) => void;
  addGroup: (group: FixtureGroup) => void;
  updateGroup: (id: string, patch: Partial<FixtureGroup>) => void;
  deleteGroup: (id: string) => void;

  setSelection: (ids: string[], mode?: "replace" | "add" | "toggle") => void;
  clearSelection: () => void;
  setSaveStatus: (status: EditorState["saveStatus"]) => void;
}

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    temporal(
      immer((set) => ({
        // Initial empty state
        projectId: "",
        name: "",
        audioUrl: null,
        audioFile: null,
        audio: null,
        fixtures: [],
        groups: [],
        sequence: { tracks: [], blocks: [], bpm: 120, beatGridOffset: 0 },
        houseTemplate: "default",
        houseCustomSvg: undefined,

        selectedBlockIds: [],
        selectedFixtureIds: [],
        hoveredBlockId: null,
        saveStatus: "idle" as const,

        loadProject: (project: Project) => {
          set((state) => {
            state.projectId = project.id;
            state.name = project.name;
            state.audioUrl = project.audioUrl;
            state.audioFile = project.audioFile;
            state.audio = project.audio;
            state.fixtures = project.fixtures;
            state.groups = project.groups;
            state.sequence = project.sequence;
            state.houseTemplate = project.houseTemplate;
            state.houseCustomSvg = project.houseCustomSvg;
            state.selectedBlockIds = [];
            state.selectedFixtureIds = [];
          });
          // Fix #3: clear undo stack when loading a new project so undo
          // does not revert back into a previously-loaded project's state.
          useEditorStore.temporal.getState().clear();
        },

        setName: (name: string) =>
          set((state) => {
            state.name = name;
          }),

        setAudio: (url: string, fileName: string, analysis: AudioAnalysis | null) =>
          set((state) => {
            state.audioUrl = url;
            state.audioFile = fileName;
            state.audio = analysis;
          }),

        addBlock: (block: EffectBlock) =>
          set((state) => {
            // Fix #8: validate trackId exists before adding
            const trackExists = state.sequence.tracks.some((t) => t.id === block.trackId);
            if (!trackExists) {
              console.warn(`addBlock: trackId "${block.trackId}" not found — block dropped`);
              return;
            }
            state.sequence.blocks.push(block);
          }),

        updateBlock: (id: string, patch: Partial<EffectBlock>) =>
          set((state) => {
            const block = state.sequence.blocks.find((b) => b.id === id);
            if (!block) return;
            // Fix #8: if the patch changes trackId, validate the new trackId exists
            if (patch.trackId !== undefined) {
              const trackExists = state.sequence.tracks.some((t) => t.id === patch.trackId);
              if (!trackExists) {
                console.warn(`updateBlock: trackId "${patch.trackId}" not found — update dropped`);
                return;
              }
            }
            Object.assign(block, patch);
          }),

        moveBlocks: (ids: string[], deltaSeconds: number, deltaTrackIndex: number) =>
          set((state) => {
            const tracks = state.sequence.tracks;
            const selectedBlocks = state.sequence.blocks.filter((b) => ids.includes(b.id));

            // Fix #7: compute a single clamped deltaTrackIndex that keeps ALL
            // selected blocks within bounds, preserving their relative offsets.
            let clampedDelta = deltaTrackIndex;
            if (deltaTrackIndex !== 0) {
              for (const block of selectedBlocks) {
                const currentIdx = tracks.findIndex((t) => t.id === block.trackId);
                if (currentIdx === -1) continue;
                const proposedIdx = currentIdx + clampedDelta;
                if (proposedIdx < 0) clampedDelta = -currentIdx;
                if (proposedIdx >= tracks.length) clampedDelta = tracks.length - 1 - currentIdx;
              }
            }

            for (const block of selectedBlocks) {
              block.start = Math.max(0, block.start + deltaSeconds);
              if (clampedDelta !== 0) {
                const currentIdx = tracks.findIndex((t) => t.id === block.trackId);
                if (currentIdx !== -1) {
                  block.trackId = tracks[currentIdx + clampedDelta].id;
                }
              }
            }
          }),

        resizeBlock: (id: string, edge: "start" | "end", newTime: number) =>
          set((state) => {
            const block = state.sequence.blocks.find((b) => b.id === id);
            if (!block) return;
            if (edge === "start") {
              const end = block.start + block.duration;
              // Fix #10: use named constant instead of magic literal
              block.start = Math.max(0, Math.min(newTime, end - MIN_BLOCK_DURATION));
              block.duration = end - block.start;
            } else {
              block.duration = Math.max(MIN_BLOCK_DURATION, newTime - block.start);
            }
          }),

        deleteBlocks: (ids: string[]) =>
          set((state) => {
            state.sequence.blocks = state.sequence.blocks.filter(
              (b) => !ids.includes(b.id)
            );
            state.selectedBlockIds = [];
          }),

        duplicateBlocks: (ids: string[]) =>
          set((state) => {
            const audioDuration = state.audio?.duration ?? Infinity;
            const toDuplicate = state.sequence.blocks.filter((b) => ids.includes(b.id));
            const newBlocks = toDuplicate.map((b) => {
              const newStart = b.start + b.duration;
              // Fix #11: clamp duplicate's end to audio duration if known
              const maxDuration = Math.max(
                MIN_BLOCK_DURATION,
                audioDuration - newStart
              );
              return {
                ...b,
                id: crypto.randomUUID(),
                start: newStart,
                duration: Math.min(b.duration, maxDuration),
              };
            });
            state.sequence.blocks.push(...newBlocks);
            state.selectedBlockIds = newBlocks.map((b) => b.id);
          }),

        addFixture: (fixture: Fixture) =>
          set((state) => {
            state.fixtures.push(fixture);
            state.sequence.tracks.push({ id: fixture.id, kind: "fixture" });
          }),

        updateFixture: (id: string, patch: Partial<Fixture>) =>
          set((state) => {
            const fixture = state.fixtures.find((f) => f.id === id);
            if (fixture) Object.assign(fixture, patch);
          }),

        deleteFixture: (id: string) =>
          set((state) => {
            state.fixtures = state.fixtures.filter((f) => f.id !== id);
            state.sequence.tracks = state.sequence.tracks.filter((t) => t.id !== id);
            state.sequence.blocks = state.sequence.blocks.filter((b) => b.trackId !== id);
          }),

        reorderTracks: (fromIndex: number, toIndex: number) =>
          set((state) => {
            // Fix #9: bounds check before mutating
            const len = state.sequence.tracks.length;
            if (
              fromIndex < 0 || fromIndex >= len ||
              toIndex < 0 || toIndex >= len
            ) {
              console.warn(`reorderTracks: index out of bounds (from=${fromIndex}, to=${toIndex}, len=${len})`);
              return;
            }
            const [track] = state.sequence.tracks.splice(fromIndex, 1);
            state.sequence.tracks.splice(toIndex, 0, track);
          }),

        addGroup: (group: FixtureGroup) =>
          set((state) => {
            state.groups.push(group);
            // Add a group track at the top of the tracks list
            state.sequence.tracks.unshift({ id: group.id, kind: "group" });
          }),

        updateGroup: (id: string, patch: Partial<FixtureGroup>) =>
          set((state) => {
            const group = state.groups.find((g) => g.id === id);
            if (group) Object.assign(group, patch);
          }),

        deleteGroup: (id: string) =>
          set((state) => {
            state.groups = state.groups.filter((g) => g.id !== id);
            state.sequence.tracks = state.sequence.tracks.filter((t) => t.id !== id);
            state.sequence.blocks = state.sequence.blocks.filter((b) => b.trackId !== id);
          }),

        setXlightsNameMap: (map: Record<string, string>) =>
          set((state) => {
            state.sequence.xlightsNameMap = map;
          }),

        setLorMapping: (map: Record<string, { unit: number; circuit: number }>) =>
          set((state) => {
            state.sequence.lorMapping = map;
          }),

        setHousePhoto: (url: string | undefined) =>
          set((state) => {
            state.houseCustomSvg = url;
          }),

        setSelection: (ids: string[], mode: "replace" | "add" | "toggle" = "replace") =>
          set((state) => {
            if (mode === "replace") {
              state.selectedBlockIds = ids;
            } else if (mode === "add") {
              const merged = new Set([...state.selectedBlockIds, ...ids]);
              state.selectedBlockIds = Array.from(merged);
            } else {
              const current = new Set(state.selectedBlockIds);
              for (const id of ids) {
                if (current.has(id)) current.delete(id);
                else current.add(id);
              }
              state.selectedBlockIds = Array.from(current);
            }
          }),

        clearSelection: () =>
          set((state) => {
            state.selectedBlockIds = [];
            state.selectedFixtureIds = [];
          }),

        setSaveStatus: (status) =>
          set((state) => {
            state.saveStatus = status;
          }),
      })),
      {
        // Only track project-data mutations for undo/redo (not selection or save status).
        // All three audio fields are excluded together — the analysis (`audio`) is
        // multi-MB so it doesn't belong in undo frames, but if we kept the URL/path
        // in history without the analysis, undoing a remove or upload would
        // restore the filename while leaving the beats/duration null or stale.
        // Autosave then writes a project that points at a song with no analysis.
        // Treat audio as one indivisible unit; users can manage it through the
        // upload UI rather than through undo.
        // `name` is also excluded — renames should not push undo frames.
        partialize: (state) => ({
          fixtures: state.fixtures,
          groups: state.groups,
          sequence: state.sequence,
          houseTemplate: state.houseTemplate,
        }),
        limit: 100,
      }
    )
  )
);
