"use client";

import { useCallback } from "react";
import { Scene3D } from "@/components/editor/scene3d/Scene3D";
import { House3D } from "@/components/editor/scene3d/house/House3D";
import { FixtureLayer } from "@/components/editor/scene3d/fixtures/FixtureLayer";
import { DragController } from "@/components/editor/scene3d/interaction/DragController";
import { Toolstrip3D } from "./Toolstrip3D";
import { HouseSelector } from "./HouseSelector";
import { FixtureLibrarySidebar } from "./FixtureLibrarySidebar";
import { PropertiesPanel } from "./PropertiesPanel";
import { useLayout3DStore } from "@/lib/store/layout3d-slice";
import { useEditorStore } from "@/lib/store/editor-store";
import { useLayout3DSync } from "@/lib/hooks/use-layout3d-sync";
import type { Vec3 } from "@/lib/3d/types";

/**
 * Full 3D Layout tab. Composes sidebar + 3D scene + properties panel.
 * Sync hook bridges the 3D store with each fixture's `layout3d` field so
 * placements travel through the existing autosave flow without a migration.
 */
export function LayoutView() {
  useLayout3DSync();

  const fixtures = useEditorStore((s) => s.fixtures);
  const layouts = useLayout3DStore((s) => s.fixtures3d);
  const selectedIds = useLayout3DStore((s) => s.selectedIds);
  const setSelected = useLayout3DStore((s) => s.setSelected);
  const setTool = useLayout3DStore((s) => s.setTool);
  const setFixtureLayout = useLayout3DStore((s) => s.setFixtureLayout);
  const updateWaypoint = useLayout3DStore((s) => s.updateWaypoint);
  const showGrid = useLayout3DStore((s) => s.showGrid);
  const showAnchors = useLayout3DStore((s) => s.showAnchors);
  const highlightedAnchorId = useLayout3DStore((s) => s.highlightedAnchorId);
  const templateId = useLayout3DStore((s) => s.activeTemplateId);
  const controlsEnabled = useLayout3DStore((s) => s.controlsEnabled);

  const handleSelect = useCallback(
    (fixtureId: string, additive: boolean) => {
      if (additive) {
        setSelected(Array.from(new Set([...selectedIds, fixtureId])));
      } else {
        setSelected([fixtureId]);
      }
    },
    [selectedIds, setSelected],
  );

  const handlePathFinish = useCallback(
    (waypoints: Vec3[], anchorSurfaceId?: string) => {
      // The first selected fixture without a placement gets the new path.
      // If no fixture is selected, fall back to the first roofline-class
      // fixture that has no layout yet.
      let target = fixtures.find((f) => selectedIds.includes(f.id) && !layouts[f.id]);
      if (!target) target = fixtures.find((f) => !layouts[f.id]);
      if (!target) return;
      setFixtureLayout(target.id, {
        points: waypoints,
        closed: false,
        anchorSurfaceId,
      });
      setSelected([target.id]);
      setTool("select");
    },
    [fixtures, layouts, selectedIds, setFixtureLayout, setSelected, setTool],
  );

  const handleWaypointDrag = useCallback(
    (fixtureId: string, waypointIndex: number, newPos: Vec3) => {
      updateWaypoint(fixtureId, waypointIndex, newPos);
    },
    [updateWaypoint],
  );

  return (
    <div className="flex h-full w-full" style={{ background: "#FAFAF8" }}>
      <FixtureLibrarySidebar />
      <div className="relative flex-1 min-w-0">
        <HouseSelector />
        <Toolstrip3D />
        <Scene3D showGrid={showGrid} controlsEnabled={controlsEnabled}>
          <House3D
            templateId={templateId}
            showAnchors={showAnchors}
            highlightAnchorId={highlightedAnchorId}
          />
          <FixtureLayer
            fixtures={fixtures}
            layouts={layouts}
            selectedIds={selectedIds}
            activeEffectsByFixtureId={{}}
            playheadSeconds={0}
            onSelect={handleSelect}
            onWaypointDrag={handleWaypointDrag}
          />
          <DragController onPathFinish={handlePathFinish} />
        </Scene3D>
      </div>
      <PropertiesPanel />
    </div>
  );
}
