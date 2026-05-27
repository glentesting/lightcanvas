"use client";

import { useCallback, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLayout3DStore } from "@/lib/store/layout3d-slice";
import { useSurfaces } from "@/components/editor/scene3d/house/AnchorSurfaces";
import { getHouseTemplate } from "@/lib/3d/house-templates";
import { snapPoint } from "@/lib/3d/snap";
import { GRID_SNAP_STEP } from "@/lib/3d/constants";
import { usePathDraw } from "@/lib/hooks/use-path-draw";
import { PathDrawer } from "./PathDrawer";
import type { Vec3 } from "@/lib/3d/types";
import { useEditorStore } from "@/lib/store/editor-store";

export interface DragControllerProps {
  /** Called when the pen tool finishes a path and we need to attach it to a fixture. */
  onPathFinish?: (waypoints: Vec3[], anchorSurfaceId?: string) => void;
}

/**
 * Orchestrates pointer-driven interactions inside the 3D scene. Lives inside
 * the R3F <Canvas> so it can use useThree() and project ground-plane positions.
 *
 * Current scope:
 *  - "select" tool: clicks on empty space deselect; clicks on fixtures are
 *    handled by the fixtures themselves via their onSelect prop.
 *  - "pen" tool: ground-plane raycast → snap → waypoints. Double-click commits.
 *  - Keyboard: Esc clears selection / cancels draw, Delete removes selection.
 */
export function DragController({ onPathFinish }: DragControllerProps) {
  const { camera, gl } = useThree();
  const activeTool = useLayout3DStore((s) => s.activeTool);
  const snapEnabled = useLayout3DStore((s) => s.snapEnabled);
  const templateId = useLayout3DStore((s) => s.activeTemplateId);
  const setHighlightedAnchor = useLayout3DStore((s) => s.setHighlightedAnchor);
  const clearSelection = useLayout3DStore((s) => s.clearSelection);
  const selectedIds = useLayout3DStore((s) => s.selectedIds);
  const removeFixtureLayout = useLayout3DStore((s) => s.removeFixtureLayout);

  const editorFixtures = useEditorStore((s) => s.fixtures);
  const updateFixture = useEditorStore((s) => s.updateFixture);

  const template = getHouseTemplate(templateId);
  const { list: anchors } = useSurfaces(template);

  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  /**
   * Project screen coords onto the ground plane (y = 0), then run the snap.
   * Returns null if the ray points above the horizon.
   */
  const resolveScreenToWorld = useCallback(
    (clientX: number, clientY: number): Vec3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }
      pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, camera);
      const target = new THREE.Vector3();
      const hit = raycaster.current.ray.intersectPlane(groundPlane.current, target);
      if (!hit) return null;
      const raw: Vec3 = { x: target.x, y: target.y, z: target.z };
      const snap = snapPoint(raw, anchors, GRID_SNAP_STEP, snapEnabled);
      setHighlightedAnchor(snap.source === "anchor" ? (snap.surfaceId ?? null) : null);
      return snap.point;
    },
    [camera, gl, anchors, snapEnabled, setHighlightedAnchor],
  );

  const handlePathFinish = useCallback(
    (waypoints: Vec3[]) => {
      // The most recent anchor that was highlighted at the moment of the last
      // waypoint is the best guess for which surface this path is attached to.
      // We snap each waypoint at draw time, but the surface id is captured here
      // for the final commit.
      const snapTry = snapPoint(
        waypoints[waypoints.length - 1],
        anchors,
        GRID_SNAP_STEP,
        snapEnabled,
      );
      onPathFinish?.(waypoints, snapTry.source === "anchor" ? snapTry.surfaceId : undefined);
      setHighlightedAnchor(null);
    },
    [anchors, snapEnabled, setHighlightedAnchor, onPathFinish],
  );

  const handlePathCancel = useCallback(() => {
    setHighlightedAnchor(null);
  }, [setHighlightedAnchor]);

  const { waypoints, hover } = usePathDraw(activeTool === "pen", {
    resolveScreenToWorld,
    onFinish: handlePathFinish,
    onCancel: handlePathCancel,
  });

  // Global keyboard shortcuts for the layout view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        clearSelection();
        setHighlightedAnchor(null);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length === 0) return;
        // Remove only the 3D placement; keep the fixture itself.
        for (const id of selectedIds) {
          removeFixtureLayout(id);
          // also clear the legacy 2D layout so the next save reflects the
          // removed placement (optional — keeps consistent state)
          const f = editorFixtures.find((x) => x.id === id);
          if (f) updateFixture(id, { layout3d: undefined });
        }
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection, setHighlightedAnchor, selectedIds, removeFixtureLayout, editorFixtures, updateFixture]);

  return (
    <>
      {activeTool === "pen" && <PathDrawer waypoints={waypoints} hover={hover} />}
      {/* Click on the ground (handled by R3F children) deselects when in select tool. */}
      <mesh
        position={[0, -0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          if (activeTool === "select") {
            e.stopPropagation();
            clearSelection();
          }
        }}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}
