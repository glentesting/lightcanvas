/**
 * Layout3D slice — Zustand store for the 3D layout editor.
 *
 * Contract:
 *   - State is plain JSON-serializable data (no THREE.* instances, no functions
 *     stored in state). This guarantees the store contents round-trip cleanly
 *     through Supabase JSONB.
 *   - Persistence is decoupled: the orchestrator calls `toSnapshot()` for
 *     autosave and `hydrate()` on project load. The slice never calls Supabase.
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Fixture3DLayout, Vec3 } from "@/lib/3d/types";

export type Layout3DTool = "select" | "pen" | "rect" | "circle";

export interface Layout3DSnapshot {
  fixtures3d: Record<string, Fixture3DLayout>;
  activeTemplateId: string;
}

export interface Layout3DState {
  // ---- persisted ----
  fixtures3d: Record<string /* fixtureId */, Fixture3DLayout>;
  activeTemplateId: string;

  // ---- UI / ephemeral ----
  selectedIds: string[];
  activeTool: Layout3DTool;
  snapEnabled: boolean;
  showGrid: boolean;
  showAnchors: boolean;
  controlsEnabled: boolean;
  highlightedAnchorId: string | null;

  // ---- actions ----
  setFixtureLayout: (id: string, layout: Fixture3DLayout) => void;
  removeFixtureLayout: (id: string) => void;
  updateWaypoint: (fixtureId: string, waypointIndex: number, position: Vec3) => void;

  setSelected: (ids: string[]) => void;
  addSelected: (id: string) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;

  setTool: (tool: Layout3DTool) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
  toggleAnchors: () => void;
  setTemplate: (templateId: string) => void;
  setControlsEnabled: (enabled: boolean) => void;
  setHighlightedAnchor: (anchorId: string | null) => void;

  hydrate: (snapshot: Layout3DSnapshot) => void;
  toSnapshot: () => Layout3DSnapshot;
}

export const useLayout3DStore = create<Layout3DState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // ---- initial state ----
      fixtures3d: {},
      activeTemplateId: "colonial",

      selectedIds: [],
      activeTool: "select",
      snapEnabled: true,
      showGrid: true,
      showAnchors: false,
      controlsEnabled: true,
      highlightedAnchorId: null,

      // ---- layout mutations ----
      setFixtureLayout: (id, layout) =>
        set((state) => {
          state.fixtures3d[id] = layout;
        }),

      removeFixtureLayout: (id) =>
        set((state) => {
          delete state.fixtures3d[id];
          state.selectedIds = state.selectedIds.filter((s) => s !== id);
        }),

      updateWaypoint: (fixtureId, waypointIndex, position) =>
        set((state) => {
          const layout = state.fixtures3d[fixtureId];
          if (!layout) return;
          if (waypointIndex < 0 || waypointIndex >= layout.points.length) return;
          layout.points[waypointIndex] = { x: position.x, y: position.y, z: position.z };
        }),

      // ---- selection ----
      setSelected: (ids) =>
        set((state) => {
          state.selectedIds = [...ids];
        }),

      addSelected: (id) =>
        set((state) => {
          if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
        }),

      toggleSelected: (id) =>
        set((state) => {
          const idx = state.selectedIds.indexOf(id);
          if (idx === -1) state.selectedIds.push(id);
          else state.selectedIds.splice(idx, 1);
        }),

      clearSelection: () =>
        set((state) => {
          state.selectedIds = [];
        }),

      // ---- tool / UI ----
      setTool: (tool) =>
        set((state) => {
          state.activeTool = tool;
        }),

      toggleSnap: () =>
        set((state) => {
          state.snapEnabled = !state.snapEnabled;
        }),

      toggleGrid: () =>
        set((state) => {
          state.showGrid = !state.showGrid;
        }),

      toggleAnchors: () =>
        set((state) => {
          state.showAnchors = !state.showAnchors;
        }),

      setTemplate: (templateId) =>
        set((state) => {
          state.activeTemplateId = templateId;
        }),

      setControlsEnabled: (enabled) =>
        set((state) => {
          state.controlsEnabled = enabled;
        }),

      setHighlightedAnchor: (anchorId) =>
        set((state) => {
          state.highlightedAnchorId = anchorId;
        }),

      // ---- persistence boundary ----
      hydrate: (snapshot) =>
        set((state) => {
          state.fixtures3d = snapshot.fixtures3d ?? {};
          state.activeTemplateId = snapshot.activeTemplateId ?? "colonial";
          state.selectedIds = [];
          state.highlightedAnchorId = null;
        }),

      toSnapshot: () => {
        const s = get();
        // Deep-clone to ensure consumers can't mutate live state via the snapshot.
        const fixtures3d: Record<string, Fixture3DLayout> = {};
        for (const [id, layout] of Object.entries(s.fixtures3d)) {
          fixtures3d[id] = {
            points: layout.points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
            closed: layout.closed,
            anchorSurfaceId: layout.anchorSurfaceId,
            rotation: layout.rotation
              ? { x: layout.rotation.x, y: layout.rotation.y, z: layout.rotation.z }
              : undefined,
          };
        }
        return {
          fixtures3d,
          activeTemplateId: s.activeTemplateId,
        };
      },
    })),
  ),
);
