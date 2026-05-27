"use client";

import { useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AnchorSurface, RaycastHit, Vec3 } from "@/lib/3d/types";

/**
 * Helper hook that exposes a `raycastAt(screenX, screenY)` function returning the
 * nearest scene intersection. The interaction layer calls this on pointer move
 * to figure out where in world space the cursor is pointing.
 *
 * Anchor surfaces are checked separately (closest within snap radius wins) and
 * attached to the returned hit. Throttling is the caller's responsibility — the
 * function itself is cheap to call.
 */
export function use3DRaycast(anchors: AnchorSurface[] = []) {
  const { camera, scene, gl } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());

  const raycastAt = useCallback(
    (clientX: number, clientY: number): RaycastHit | null => {
      const rect = gl.domElement.getBoundingClientRect();
      pointerRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      if (intersects.length === 0) return null;

      const hit = intersects[0];
      const point: Vec3 = { x: hit.point.x, y: hit.point.y, z: hit.point.z };
      const normal: Vec3 = hit.face
        ? { x: hit.face.normal.x, y: hit.face.normal.y, z: hit.face.normal.z }
        : { x: 0, y: 1, z: 0 };

      // Find a nearby anchor (if any) and attach it. Anchor matching is the
      // snap layer's job, but we surface the candidate here so the snap module
      // doesn't have to walk the scene again.
      let bestAnchor: AnchorSurface | undefined;
      let bestDist = Infinity;
      for (const a of anchors) {
        const dx = a.worldPosition.x - point.x;
        const dy = a.worldPosition.y - point.y;
        const dz = a.worldPosition.z - point.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < a.snapRadius && d < bestDist) {
          bestDist = d;
          bestAnchor = a;
        }
      }

      return {
        objectId: hit.object.name || hit.object.uuid,
        point,
        normal,
        anchorSurface: bestAnchor,
        distance: hit.distance,
      };
    },
    [camera, scene, gl, anchors],
  );

  return { raycastAt };
}
