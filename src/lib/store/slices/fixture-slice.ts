import type { Fixture, FixtureGroup } from "@/types/domain";
import type { EditorSliceCreator } from "./types";

/**
 * Fixtures + fixture groups, including the associated timeline tracks that
 * are created/removed alongside them.
 */
export interface FixtureSlice {
  fixtures: Fixture[];
  groups: FixtureGroup[];

  addFixture: (fixture: Fixture) => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  deleteFixture: (id: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  addGroup: (group: FixtureGroup) => void;
  updateGroup: (id: string, patch: Partial<FixtureGroup>) => void;
  deleteGroup: (id: string) => void;
}

export const createFixtureSlice: EditorSliceCreator<FixtureSlice> = (set) => ({
  fixtures: [],
  groups: [],

  addFixture: (fixture) =>
    set((state) => {
      state.fixtures.push(fixture);
      state.sequence.tracks.push({ id: fixture.id, kind: "fixture" });
    }),

  updateFixture: (id, patch) =>
    set((state) => {
      const fixture = state.fixtures.find((f) => f.id === id);
      if (fixture) Object.assign(fixture, patch);
    }),

  deleteFixture: (id) =>
    set((state) => {
      state.fixtures = state.fixtures.filter((f) => f.id !== id);
      state.sequence.tracks = state.sequence.tracks.filter((t) => t.id !== id);
      state.sequence.blocks = state.sequence.blocks.filter((b) => b.trackId !== id);
    }),

  reorderTracks: (fromIndex, toIndex) =>
    set((state) => {
      const [track] = state.sequence.tracks.splice(fromIndex, 1);
      state.sequence.tracks.splice(toIndex, 0, track);
    }),

  addGroup: (group) =>
    set((state) => {
      state.groups.push(group);
      // Add a group track at the top of the tracks list
      state.sequence.tracks.unshift({ id: group.id, kind: "group" });
    }),

  updateGroup: (id, patch) =>
    set((state) => {
      const group = state.groups.find((g) => g.id === id);
      if (group) Object.assign(group, patch);
    }),

  deleteGroup: (id) =>
    set((state) => {
      state.groups = state.groups.filter((g) => g.id !== id);
      state.sequence.tracks = state.sequence.tracks.filter((t) => t.id !== id);
      state.sequence.blocks = state.sequence.blocks.filter((b) => b.trackId !== id);
    }),
});
