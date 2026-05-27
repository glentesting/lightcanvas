"use client";

/**
 * Top-level house component for the 3D layout view.
 *
 * Composes:
 *   - HouseGeometry  — the parametric mesh
 *   - AnchorVisualizer — glow for the currently-highlighted snap target
 *   - Optional debug anchor dots (when showAnchors=true)
 */

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { AnchorSurface } from "@/lib/3d/types";
import { COLOR_HIGHLIGHT } from "@/lib/3d/constants";
import { getHouseTemplate } from "@/lib/3d/house-templates";
import { AnchorVisualizer } from "./AnchorVisualizer";
import { HouseGeometry } from "./HouseGeometry";
import { useSurfaces } from "./AnchorSurfaces";

export interface House3DProps {
  templateId: string;
  /** Render small dots at every anchor (debug aid) */
  showAnchors?: boolean;
  /** id of the anchor to highlight via AnchorVisualizer */
  highlightAnchorId?: string | null;
  /** Fired when a debug anchor dot is clicked */
  onAnchorClick?: (anchorId: string) => void;
}

export function House3D({
  templateId,
  showAnchors = false,
  highlightAnchorId = null,
  onAnchorClick,
}: House3DProps) {
  const template = useMemo(() => getHouseTemplate(templateId), [templateId]);
  const { map, list } = useSurfaces(template);

  const highlighted: AnchorSurface | null = highlightAnchorId
    ? map.get(highlightAnchorId) ?? null
    : null;

  return (
    <group name={`house3d-${templateId}`}>
      <HouseGeometry template={template} />

      <AnchorVisualizer surface={highlighted} visible={highlighted !== null} />

      {showAnchors && (
        <group name="anchor-debug-dots">
          {list.map((s) => (
            <DebugAnchorDot
              key={s.id}
              surface={s}
              onClick={onAnchorClick}
            />
          ))}
        </group>
      )}
    </group>
  );
}

interface DebugAnchorDotProps {
  surface: AnchorSurface;
  onClick?: (anchorId: string) => void;
}

function DebugAnchorDot({ surface, onClick }: DebugAnchorDotProps) {
  const { x, y, z } = surface.worldPosition;
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.(surface.id);
  };

  return (
    <mesh
      position={[x, y, z]}
      onClick={handleClick}
      name={`anchor-dot-${surface.id}`}
    >
      <sphereGeometry args={[0.1, 12, 10]} />
      <meshBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.5} />
    </mesh>
  );
}
