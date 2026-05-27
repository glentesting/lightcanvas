"use client";

import { useState } from "react";
import { getLorDegradedEffects } from "@/lib/exports/lor";
import type { Project } from "@/types/domain";

interface ExportLorDegradedStepProps {
  project: Project;
  onBack: () => void;
  onContinue: () => void;
  onClose: () => void;
}

export default function ExportLorDegradedStep({
  project,
  onBack,
  onContinue,
  onClose,
}: ExportLorDegradedStepProps) {
  const [lorDegradedExpanded, setLorDegradedExpanded] = useState(false);
  const degraded = getLorDegradedEffects(project);
  const totalBlocks = project.sequence.blocks.length;
  const nativeCount = totalBlocks - degraded.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="rounded-xl overflow-hidden w-full max-w-lg" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-1">LOR Export Compatibility</h3>
          <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
            Light-O-Rama supports fewer effect types than LightCanvas. Some effects will be approximated.
          </p>

          <div className="rounded-lg p-3 mb-3" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium" style={{ color: "var(--ink)" }}>
                {nativeCount} effect{nativeCount !== 1 ? "s" : ""} export directly
              </span>
              {degraded.length > 0 && (
                <>
                  <span style={{ color: "var(--ink-4)" }}>&bull;</span>
                  <span style={{ color: "oklch(55% 0.15 45)" }}>
                    {degraded.length} will be approximated
                  </span>
                </>
              )}
            </div>
          </div>

          {degraded.length > 0 && (
            <div>
              <button
                onClick={() => setLorDegradedExpanded(!lorDegradedExpanded)}
                className="flex items-center gap-1.5 text-xs font-medium mb-2"
                style={{ color: "var(--accent)" }}
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  style={{ transform: lorDegradedExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {lorDegradedExpanded ? "Hide details" : "Show details"}
              </button>
              {lorDegradedExpanded && (
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto" style={{ borderColor: "var(--line)" }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                        <th className="text-xs font-medium text-left px-3 py-1.5" style={{ color: "var(--ink-3)" }}>Fixture</th>
                        <th className="text-xs font-medium text-left px-3 py-1.5" style={{ color: "var(--ink-3)" }}>Effect</th>
                        <th className="text-xs font-medium text-left px-3 py-1.5" style={{ color: "var(--ink-3)" }}>Approximation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {degraded.map((d, i) => (
                        <tr key={d.blockId} style={{ borderBottom: i < degraded.length - 1 ? "1px solid var(--line)" : undefined }}>
                          <td className="px-3 py-1.5 text-xs" style={{ color: "var(--ink-2)" }}>{d.fixtureName}</td>
                          <td className="px-3 py-1.5 text-xs" style={{ color: "var(--ink-2)" }}>{d.effectId}</td>
                          <td className="px-3 py-1.5 text-xs" style={{ color: "var(--ink-4)" }}>{d.approximation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
          <button
            onClick={onBack}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
            >
              Continue to mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
