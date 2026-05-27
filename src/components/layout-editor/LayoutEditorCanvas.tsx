"use client";

import type { RefObject } from "react";
import type { Fixture } from "@/lib/fixtures/types";
import House from "@/components/editor/house";
import { PropShape, CanvasToolBtn, ToolbarDivider } from "./components";

export function LayoutEditorCanvas({
  svgRef,
  fixtures,
  hiddenIds,
  selectedId,
  dragging,
  nightPreview,
  houseCustomSvg,
  handlePropMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleCanvasClick,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  fixtures: Fixture[];
  hiddenIds: Set<string>;
  selectedId: string | null;
  dragging: { id: string; startMX: number; startMY: number; origX: number; origY: number } | null;
  nightPreview: boolean;
  houseCustomSvg: string | null | undefined;
  handlePropMouseDown: (e: React.MouseEvent, fixtureId: string) => void;
  handleMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseUp: () => void;
  handleCanvasClick: (e: React.MouseEvent<SVGSVGElement>) => void;
}) {
  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: nightPreview ? "#0c1222" : "#f5f4f0" }}>
      {/* House + interactive prop overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          style={{
            position: "relative",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: nightPreview ? "0 8px 60px rgba(0,0,0,.5)" : "0 8px 40px rgba(20,22,28,.15)",
            border: nightPreview ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {houseCustomSvg ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={houseCustomSvg}
              alt="Custom house"
              width={720}
              height={420}
              style={{
                width: 720, height: 420, objectFit: "cover",
                filter: nightPreview ? "brightness(0.25) saturate(0.4)" : "none",
                transition: "filter 0.4s ease",
              }}
            />
          ) : (
            <div style={{ position: "relative" }}>
              <House width={720} height={420} id="layout-house" />
              {nightPreview && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(8, 12, 30, 0.7)",
                  transition: "opacity 0.4s ease",
                }} />
              )}
            </div>
          )}
          {/* Interactive prop overlay */}
          <svg
            ref={svgRef}
            width="720"
            height="420"
            viewBox="0 0 720 420"
            style={{ position: "absolute", inset: 0, cursor: dragging ? "grabbing" : "default" }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Glow filter for night preview */}
            {nightPreview && (
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            )}
            {fixtures.filter((f) => !hiddenIds.has(f.id)).map((f) => (
              <PropShape
                key={f.id}
                fixture={f}
                isSelected={f.id === selectedId}
                nightMode={nightPreview}
                onMouseDown={(e) => handlePropMouseDown(e, f.id)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Floating canvas toolbar */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-px rounded-xl px-1 py-1"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
        }}
      >
        <CanvasToolBtn icon="select" label="Select" active />
        <CanvasToolBtn icon="draw" label="Draw" />
        <CanvasToolBtn icon="move" label="Move" />
        <CanvasToolBtn icon="resize" label="Resize" />
        <ToolbarDivider />
        <CanvasToolBtn icon="snap" label="Snap" />
        <CanvasToolBtn icon="fit" label="Fit" />
        <ToolbarDivider />
        <CanvasToolBtn icon="zoomOut" label="Zoom Out" />
        <span className="px-2 text-xs font-medium" style={{ color: "var(--ink-2)", fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "center" }}>100%</span>
        <CanvasToolBtn icon="zoomIn" label="Zoom In" />
        <ToolbarDivider />
        <CanvasToolBtn icon="fullscreen" label="Fullscreen" />
      </div>
    </div>
  );
}
