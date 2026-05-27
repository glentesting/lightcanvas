"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { useLayout3DStore } from "@/lib/store/layout3d-slice";
import type { Fixture3DLayout } from "@/lib/3d/types";

/**
 * Bridges the Layout3D Zustand slice and the existing editor store.
 *
 * On mount (and whenever the editor's fixture list changes identity):
 *   - hydrate the 3D store from each fixture's `layout3d` field.
 *
 * After hydrate, subscribe to 3D-store changes and project them back onto
 * the corresponding fixtures in the editor store. That triggers the existing
 * autosave (which already persists the full `fixtures` array to Supabase).
 *
 * Net effect: zero schema changes; 3D placements travel with each fixture.
 */
export function useLayout3DSync() {
  const hydrate = useLayout3DStore((s) => s.hydrate);
  const fixtures = useEditorStore((s) => s.fixtures);
  const houseTemplate = useEditorStore((s) => s.houseTemplate);
  const updateFixture = useEditorStore((s) => s.updateFixture);

  const hydratedRef = useRef(false);

  // Hydrate once per fixtures-load (we use a sentinel string of fixture ids to detect "load").
  const fixtureIdsKey = fixtures.map((f) => f.id).join(",");
  useEffect(() => {
    if (!fixtureIdsKey) return;
    const snapshot: Record<string, Fixture3DLayout> = {};
    for (const f of fixtures) {
      if (f.layout3d && f.layout3d.points.length > 0) {
        snapshot[f.id] = {
          points: f.layout3d.points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
          closed: f.layout3d.closed ?? false,
          anchorSurfaceId: f.layout3d.anchorSurfaceId,
          rotation: f.layout3d.rotation,
        };
      }
    }
    hydrate({
      fixtures3d: snapshot,
      activeTemplateId: houseTemplate && houseTemplate !== "default" ? houseTemplate : "colonial",
    });
    hydratedRef.current = true;
    // intentionally not depending on every field; key change triggers reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureIdsKey]);

  // Persist 3D placements back onto fixtures whenever the 3D store changes.
  useEffect(() => {
    const unsub = useLayout3DStore.subscribe(
      (state) => state.fixtures3d,
      (next, prev) => {
        if (!hydratedRef.current) return;
        // Diff: write changed entries, clear removed ones.
        const nextKeys = new Set(Object.keys(next));
        const prevKeys = new Set(Object.keys(prev));

        for (const id of nextKeys) {
          const n = next[id];
          const p = prev[id];
          if (!p || JSON.stringify(n) !== JSON.stringify(p)) {
            updateFixture(id, {
              layout3d: {
                points: n.points.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z })),
                closed: n.closed,
                anchorSurfaceId: n.anchorSurfaceId,
                rotation: n.rotation,
              },
            });
          }
        }
        for (const id of prevKeys) {
          if (!nextKeys.has(id)) {
            updateFixture(id, { layout3d: undefined });
          }
        }
      },
    );
    return unsub;
  }, [updateFixture]);
}
