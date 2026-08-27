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
  updateBlock: (id: string, patch: Partial<EffectBlock>) => void;
  moveBlocks: (ids: string[], deltaSeconds: number, deltaTrackIndex: number) => void;
  resizeBlock: (id: string, edge: "start" | "end", newTime: number) => void;
  deleteBlocks: (ids: string[]) => void;
  duplicateBlocks: (ids: string[]) => void;

  addFixture: (fixture: Fixture) => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  deleteFixture: (id: string) => void;
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
        // Only track project-data mutations for undo/redo (not selection or save status)
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
        limit: 100,
      }
    )
  )
);
