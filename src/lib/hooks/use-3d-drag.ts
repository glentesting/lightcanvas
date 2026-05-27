"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Vec3 } from "@/lib/3d/types";

export interface Drag3DCallbacks {
  /** Called on every pointer move while dragging. Use to update ghost position. */
  onMove: (worldPoint: Vec3) => void;
  /** Called on pointer up. Receives the final world point. */
  onCommit: (worldPoint: Vec3) => void;
  /** Called on Escape. */
  onCancel: () => void;
  /** Resolve a screen-space pointer event to a world-space point. Caller
   *  supplies this so we don't have to know about R3F here. */
  resolveScreenToWorld: (clientX: number, clientY: number) => Vec3 | null;
}

/**
 * Headless drag state machine. The interaction layer mounts this and the
 * returned `start()` flips the camera-controls off (via the consumer's
 * `setControlsEnabled`), tracks pointer moves until release, then commits.
 */
export function use3DDrag(
  cb: Drag3DCallbacks,
  setControlsEnabled: (enabled: boolean) => void,
) {
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const cbRef = useRef(cb);
  cbRef.current = cb;

  const start = useCallback(() => {
    if (draggingRef.current) return;
    draggingRef.current = true;
    setDragging(true);
    setControlsEnabled(false);
  }, [setControlsEnabled]);

  const stop = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    setControlsEnabled(true);
  }, [setControlsEnabled]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const wp = cbRef.current.resolveScreenToWorld(e.clientX, e.clientY);
      if (wp) cbRef.current.onMove(wp);
    };
    const onUp = (e: PointerEvent) => {
      const wp = cbRef.current.resolveScreenToWorld(e.clientX, e.clientY);
      if (wp) cbRef.current.onCommit(wp);
      stop();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cbRef.current.onCancel();
        stop();
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [dragging, stop]);

  return { dragging, start, stop };
}
