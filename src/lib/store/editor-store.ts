import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import type { Project, Fixture, FixtureGroup } from "@/types/domain";
import type { EffectBlock, Sequence } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";

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
  /** bulk insert in a single store update — AI generation adds thousands of blocks */
  addBlocks: (blocks: EffectBlock[]) => void;
  updateBlock: (id: string, patch: Partial<EffectBlock>) => void;
  moveBlocks: (ids: string[], deltaSeconds: number, deltaTrackIndex: number) => void;
  resizeBlock: (id: string, edge: "start" | "end", newTime: number) => void;
  deleteBlocks: (ids: string[]) => void;
  duplicateBlocks: (ids: string[]) => void;

  addFixture: (fixture: Fixture) => void;
  /** Layout import: add fixtures (with tracks + automatic export mapping), or
   *  replace the whole layout — which also removes the old fixtures' blocks. */
  importFixtures: (fixtures: Fixture[], mode: "replace" | "add") => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  /** Bulk placement in ONE undo step — see the note on deleteFixtures. */
  updateFixtures: (patches: Array<{ id: string; patch: Partial<Fixture> }>) => void;
  deleteFixture: (id: string) => void;
  /** Bulk delete in ONE undo step. Calling deleteFixture in a loop records one
   *  history entry per prop, so a single Ctrl+Z would bring back only one of
   *  forty — which is exactly what made bulk edits feel permanent. */
  deleteFixtures: (ids: string[]) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  setLoreditPropMap: (map: Record<string, string>) => void;
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

        loadProject: (project: Project) =>
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
            // Loading a project is itself a state change, so without this the
            // first Undo after opening a project would roll the whole display
            // back to empty — and autosave would then persist that. History
            // starts at the freshly loaded project.
            queueMicrotask(() => useEditorStore.temporal.getState().clear());
          }),

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
            state.sequence.blocks.push(block);
          }),

        addBlocks: (blocks: EffectBlock[]) =>
          set((state) => {
            state.sequence.blocks.push(...blocks);
          }),

        updateBlock: (id: string, patch: Partial<EffectBlock>) =>
          set((state) => {
            const block = state.sequence.blocks.find((b) => b.id === id);
            if (block) Object.assign(block, patch);
          }),

        moveBlocks: (ids: string[], deltaSeconds: number, deltaTrackIndex: number) =>
          set((state) => {
            const tracks = state.sequence.tracks;
            for (const block of state.sequence.blocks) {
              if (!ids.includes(block.id)) continue;
              block.start = Math.max(0, block.start + deltaSeconds);
              if (deltaTrackIndex !== 0) {
                const currentIdx = tracks.findIndex((t) => t.id === block.trackId);
                const newIdx = Math.max(0, Math.min(tracks.length - 1, currentIdx + deltaTrackIndex));
                block.trackId = tracks[newIdx].id;
              }
            }
          }),

        resizeBlock: (id: string, edge: "start" | "end", newTime: number) =>
          set((state) => {
            const block = state.sequence.blocks.find((b) => b.id === id);
            if (!block) return;
            if (edge === "start") {
              const end = block.start + block.duration;
              block.start = Math.max(0, Math.min(newTime, end - 0.1));
              block.duration = end - block.start;
            } else {
              block.duration = Math.max(0.1, newTime - block.start);
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
            const toDuplicate = state.sequence.blocks.filter((b) => ids.includes(b.id));
            const newBlocks = toDuplicate.map((b) => ({
              ...b,
              id: crypto.randomUUID(),
              start: b.start + b.duration,
            }));
            state.sequence.blocks.push(...newBlocks);
            state.selectedBlockIds = newBlocks.map((b) => b.id);
          }),

        addFixture: (fixture: Fixture) =>
          set((state) => {
            state.fixtures.push(fixture);
            state.sequence.tracks.push({ id: fixture.id, kind: "fixture" });
          }),

        importFixtures: (fixtures: Fixture[], mode: "replace" | "add") =>
          set((state) => {
            if (mode === "replace") {
              const oldIds = new Set(state.fixtures.map((f) => f.id));
              for (const g of state.groups) oldIds.add(g.id);
              state.fixtures = [];
              state.groups = [];
              state.sequence.tracks = state.sequence.tracks.filter((t) => !oldIds.has(t.id));
              state.sequence.blocks = state.sequence.blocks.filter((b) => !oldIds.has(b.trackId));
              state.sequence.loreditPropMap = {};
            }
            for (const f of fixtures) {
              state.fixtures.push(f);
              state.sequence.tracks.push({ id: f.id, kind: "fixture" });
              // fixtures born from a LOR prop map themselves for export
              if (f.lor) {
                if (!state.sequence.loreditPropMap) state.sequence.loreditPropMap = {};
                state.sequence.loreditPropMap[f.id] = f.lor.propName;
              }
            }
          }),

        updateFixture: (id: string, patch: Partial<Fixture>) =>
          set((state) => {
            const fixture = state.fixtures.find((f) => f.id === id);
            if (fixture) Object.assign(fixture, patch);
          }),

        updateFixtures: (patches: Array<{ id: string; patch: Partial<Fixture> }>) =>
          set((state) => {
            const byId = new Map(patches.map((p) => [p.id, p.patch]));
            for (const fixture of state.fixtures) {
              const patch = byId.get(fixture.id);
              if (patch) Object.assign(fixture, patch);
            }
          }),

        deleteFixture: (id: string) =>
          set((state) => {
            state.fixtures = state.fixtures.filter((f) => f.id !== id);
            state.sequence.tracks = state.sequence.tracks.filter((t) => t.id !== id);
            state.sequence.blocks = state.sequence.blocks.filter((b) => b.trackId !== id);
          }),

        deleteFixtures: (ids: string[]) =>
          set((state) => {
            const gone = new Set(ids);
            state.fixtures = state.fixtures.filter((f) => !gone.has(f.id));
            state.sequence.tracks = state.sequence.tracks.filter((t) => !gone.has(t.id));
            state.sequence.blocks = state.sequence.blocks.filter((b) => !gone.has(b.trackId));
            // a group that lost members keeps working; drop the dead ids
            for (const g of state.groups) g.fixtureIds = g.fixtureIds.filter((id) => !gone.has(id));
          }),

        reorderTracks: (fromIndex: number, toIndex: number) =>
          set((state) => {
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

        setLoreditPropMap: (map: Record<string, string>) =>
          set((state) => {
            state.sequence.loreditPropMap = map;
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
        // Only track project-data mutations for undo/redo (not selection or
        // save status). `partialize` alone decides WHAT gets stored, not
        // WHETHER a step is recorded — without the `equality` check below,
        // every autosave status flip ("saving" → "saved" → "idle") pushed a
        // history step, so Undo would burn itself on a save notification
        // instead of undoing the edit you just made.
        partialize: (state) => ({
          name: state.name,
          audioUrl: state.audioUrl,
          audioFile: state.audioFile,
          audio: state.audio,
          fixtures: state.fixtures,
          groups: state.groups,
          sequence: state.sequence,
          houseTemplate: state.houseTemplate,
        }),
        // immer keeps references stable for slices it did not touch, so
        // identity comparison is exactly "did any project data change?"
        equality: (past, current) =>
          past.name === current.name &&
          past.audioUrl === current.audioUrl &&
          past.audioFile === current.audioFile &&
          past.audio === current.audio &&
          past.fixtures === current.fixtures &&
          past.groups === current.groups &&
          past.sequence === current.sequence &&
          past.houseTemplate === current.houseTemplate,
        limit: 100,
      }
    )
  )
);
