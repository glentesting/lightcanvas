"use client";

import type { Fixture } from "@/lib/fixtures/types";
import type { LorMapping } from "@/lib/exports/lor";

interface ExportLorMappingStepProps {
  fixtures: Fixture[];
  lorMapLocal: LorMapping;
  setLorMapLocal: React.Dispatch<React.SetStateAction<LorMapping>>;
  lorMappingReviewed: boolean;
  setLorMappingReviewed: (v: boolean) => void;
  exporting: boolean;
  onBack: () => void;
  onClose: () => void;
  onExport: () => void;
}

export default function ExportLorMappingStep({
  fixtures,
  lorMapLocal,
  setLorMapLocal,
  lorMappingReviewed,
  setLorMappingReviewed,
  exporting,
  onBack,
  onClose,
  onExport,
}: ExportLorMappingStepProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="rounded-xl overflow-hidden w-full max-w-lg" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-1">Map fixtures to LOR channels</h3>
          <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
            Set the Unit and Circuit numbers to match your LOR controller configuration.
          </p>

          <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--line)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                  <th className="text-xs font-medium text-left px-3 py-2" style={{ color: "var(--ink-3)" }}>Fixture Name</th>
                  <th className="text-xs font-medium text-left px-3 py-2 w-20" style={{ color: "var(--ink-3)" }}>Unit #</th>
                  <th className="text-xs font-medium text-left px-3 py-2 w-20" style={{ color: "var(--ink-3)" }}>Circuit #</th>
                  <th className="text-xs font-medium text-left px-3 py-2 w-14" style={{ color: "var(--ink-3)" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map((fixture, i) => (
                  <tr key={fixture.id} style={{ borderBottom: i < fixtures.length - 1 ? "1px solid var(--line)" : undefined }}>
                    <td className="px-3 py-2">
                      <span className="text-xs" style={{ color: "var(--ink-2)" }}>{fixture.name}</span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={lorMapLocal[fixture.id]?.unit ?? 1}
                        onChange={(e) => {
                          setLorMapLocal((prev) => ({
                            ...prev,
                            [fixture.id]: {
                              ...prev[fixture.id],
                              unit: Math.max(1, parseInt(e.target.value) || 1),
                            },
                          }));
                        }}
                        className="w-full h-7 px-2 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={lorMapLocal[fixture.id]?.circuit ?? 1}
                        onChange={(e) => {
                          setLorMapLocal((prev) => ({
                            ...prev,
                            [fixture.id]: {
                              ...prev[fixture.id],
                              circuit: Math.max(1, parseInt(e.target.value) || 1),
                            },
                          }));
                        }}
                        className="w-full h-7 px-2 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center h-5 px-1.5 rounded text-xs font-medium" style={{ background: "oklch(96% 0.04 260)", color: "oklch(40% 0.12 260)" }}>
                        RGB
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={lorMappingReviewed}
              onChange={(e) => setLorMappingReviewed(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>I&apos;ve reviewed the mapping</span>
          </label>
        </div>

        {exporting && (
          <div className="px-5 pb-2">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: "100%", background: "var(--accent)", animation: "pulse 1.5s ease-in-out infinite" }}
              />
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
              Building ZIP package...
            </div>
          </div>
        )}

        <div className="flex justify-between px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
          <button
            onClick={onBack}
            disabled={exporting}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", opacity: exporting ? 0.5 : 1 }}
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={exporting}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", opacity: exporting ? 0.5 : 1 }}
            >
              Cancel
            </button>
            <button
              onClick={onExport}
              disabled={exporting || !lorMappingReviewed}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", opacity: exporting || !lorMappingReviewed ? 0.5 : 1 }}
            >
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
