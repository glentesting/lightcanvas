import type { Project } from "@/types/domain";
import type { AudioAnalysis } from "@/lib/audio/types";
import { useSelectionStore } from "../selection-store";
import type { EditorSliceCreator } from "./types";

/**
 * Project-level state: identity, name, audio binding, house template.
 *
 * `projectId` itself is not autosaved (it identifies the row being edited,
 * not data being edited), but it lives in this slice because `loadProject`
 * sets it alongside the rest of the project data.
 */
export interface ProjectSlice {
  projectId: string;
  name: string;
  audioUrl: string | null;
  audioFile: string | null;
  audio: AudioAnalysis | null;
  houseTemplate: string;
  houseCustomSvg?: string;

  loadProject: (project: Project) => void;
  setName: (name: string) => void;
  setAudio: (url: string, fileName: string, analysis: AudioAnalysis | null) => void;
  setHousePhoto: (url: string | undefined) => void;
}

export const createProjectSlice: EditorSliceCreator<ProjectSlice> = (set) => ({
  projectId: "",
  name: "",
  audioUrl: null,
  audioFile: null,
  audio: null,
  houseTemplate: "default",
  houseCustomSvg: undefined,

  loadProject: (project) =>
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
      // Selection lives in useSelectionStore; clear it on project load.
      // Cross-store coordination: see selection-store.ts header comment.
      useSelectionStore.getState().clearSelection();
    }),

  setName: (name) =>
    set((state) => {
      state.name = name;
    }),

  setAudio: (url, fileName, analysis) =>
    set((state) => {
      state.audioUrl = url;
      state.audioFile = fileName;
      state.audio = analysis;
    }),

  setHousePhoto: (url) =>
    set((state) => {
      state.houseCustomSvg = url;
    }),
});
