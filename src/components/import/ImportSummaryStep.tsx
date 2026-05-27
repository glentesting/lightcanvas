"use client";

import { useState } from "react";
import type { ImportResult } from "@/lib/imports/xsq";

interface ImportSummaryStepProps {
  fileName: string;
  format: "xsq" | "lms" | null;
  result: ImportResult;
  projectName: string;
  setProjectName: (name: string) => void;
  error: string | null;
  importing: boolean;
  onCancel: () => void;
  onImport: () => void;
}

export default function ImportSummaryStep({
  fileName,
  format,
  result,
  projectName,
  setProjectName,
  error,
  importing,
  onCancel,
  onImport,
}: ImportSummaryStepProps) {
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const { stats, warnings } = result;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-w-md"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-1">Import Summary</h3>
          <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
            {format === "xsq" ? "xLights" : "Light-O-Rama"} file: {fileName}
          </p>

          {/* Project name */}
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--ink-3)" }}>
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid var(--line)", background: "var(--bg)" }}
            />
          </div>

          {/* Stats */}
          <div
            className="rounded-lg p-3 mb-3 grid grid-cols-2 gap-2"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            <div>
              <div className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                {stats.fixtureCount}
              </div>
              <div className="text-xs" style={{ color: "var(--ink-4)" }}>
                Fixture{stats.fixtureCount !== 1 ? "s" : ""}
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                {stats.blockCount}
              </div>
              <div className="text-xs" style={{ color: "var(--ink-4)" }}>
                Effect block{stats.blockCount !== 1 ? "s" : ""}
              </div>
            </div>
            {stats.timingTrackImported && (
              <div className="col-span-2 flex items-center gap-1.5 pt-1" style={{ borderTop: "1px solid var(--line)" }}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="oklch(45% 0.13 145)"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs" style={{ color: "oklch(35% 0.1 145)" }}>
                  Timing track imported as beat grid
                </span>
              </div>
            )}
          </div>

          {/* Unmapped effects warning */}
          {stats.unmappedEffectCount > 0 && (
            <div
              className="rounded-lg p-3 mb-3 flex items-start gap-2"
              style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
                className="shrink-0 mt-0.5"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-xs font-medium" style={{ color: "#92400e" }}>
                  {stats.unmappedEffectCount} effect{stats.unmappedEffectCount !== 1 ? "s" : ""}{" "}
                  could not be mapped
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#b45309" }}>
                  These will appear as gray placeholder blocks. You can replace them in the editor.
                </p>
              </div>
            </div>
          )}

          {/* Warnings list */}
          {warnings.length > 0 && (
            <div>
              <button
                onClick={() => setWarningsExpanded(!warningsExpanded)}
                className="flex items-center gap-1.5 text-xs font-medium mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: warningsExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s",
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
              </button>
              {warningsExpanded && (
                <div
                  className="rounded-lg p-2 max-h-32 overflow-y-auto"
                  style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
                >
                  {warnings.map((w, i) => (
                    <p
                      key={i}
                      className="text-xs py-0.5"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded-lg p-3 mt-2"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
            >
              <p className="text-xs" style={{ color: "#dc2626" }}>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}
        >
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onImport}
            disabled={importing || !projectName.trim()}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "1px solid var(--accent)",
              opacity: importing || !projectName.trim() ? 0.5 : 1,
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
