"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Vec3 } from "@/lib/3d/types";

export interface PathDrawCallbacks {
  /** Resolve cursor screen position to a snapped world point. */
  resolveScreenToWorld: (clientX: number, clientY: number) => Vec3 | null;
  /** Called when the user double-clicks (or presses Enter) to commit a path
   *  with 2+ waypoints. */
  onFinish: (waypoints: Vec3[]) => void;
  /** Called on Escape or right-click. */
  onCancel: () => void;
}

/**
 * Path-draw state machine. The interaction layer activates this when the
 * "pen" tool is selected. Each scene click adds a waypoint, double-click
 * commits, Escape cancels. The hover preview point follows the cursor.
 */
export function usePathDraw(active: boolean, cb: PathDrawCallbacks) {
  const [waypoints, setWaypoints] = useState<Vec3[]>([]);
  const [hover, setHover] = useState<Vec3 | null>(null);
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const waypointsRef = useRef<Vec3[]>([]);
  waypointsRef.current = waypoints;

  const reset = useCallback(() => {
    setWaypoints([]);
    setHover(null);
  }, []);

  const finishPath = useCallback(() => {
    if (waypointsRef.current.length >= 2) {
      cbRef.current.onFinish(waypointsRef.current);
    }
    reset();
  }, [reset]);

  const cancelPath = useCallback(() => {
    cbRef.current.onCancel();
    reset();
  }, [reset]);

  const addWaypoint = useCallback((pt: Vec3) => {
    setWaypoints((prev) => [...prev, pt]);
  }, []);

  useEffect(() => {
    if (!active) {
      reset();
      return;
    }

    let lastClickTime = 0;
    const DOUBLE_CLICK_MS = 280;

    const onClick = (e: MouseEvent) => {
      // Only left-click adds waypoints
      if (e.button !== 0) return;
      const wp = cbRef.current.resolveScreenToWorld(e.clientX, e.clientY);
      if (!wp) return;
      const now = performance.now();
      if (now - lastClickTime < DOUBLE_CLICK_MS) {
        finishPath();
        lastClickTime = 0;
      } else {
        addWaypoint(wp);
        lastClickTime = now;
      }
    };

    const onMove = (e: PointerEvent) => {
      const wp = cbRef.current.resolveScreenToWorld(e.clientX, e.clientY);
      if (wp) setHover(wp);
    };

    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      cancelPath();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelPath();
      else if (e.key === "Enter") finishPath();
    };

    window.addEventListener("click", onClick);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, addWaypoint, finishPath, cancelPath, reset]);

  return { waypoints, hover, isDrawing: waypoints.length > 0, finishPath, cancelPath };
}
