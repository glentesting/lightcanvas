"use client";

import type { Fixture } from "@/lib/fixtures/types";

interface ExportNameMappingStepProps {
  fixtures: Fixture[];
  localNameMap: Record<string, string>;
  setLocalNameMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  namesReviewed: boolean;
  setNamesReviewed: (v: boolean) => void;
  exporting: boolean;
  onBack: () => void;
  onClose: () => void;
  onExport: () => void;
}

export default function ExportNameMappingStep({
  fixtures,
  localNameMap,
  setLocalNameMap,
  namesReviewed,
  setNamesReviewed,
  exporting,
  onBack,
  onClose,
  onExport,
}: ExportNameMappingStepProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-w-lg"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-1">Match your fixtures to xLights model names</h3>
          <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
            Your xLights sequence won&apos;t show effects for fixtures whose names don&apos;t match exactly. Fix any differences here.
          </p>

          {/* Mapping table */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--line)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                  <th className="text-xs font-medium text-left px-3 py-2" style={{ color: "var(--ink-3)" }}>LightCanvas</th>
                  <th className="text-xs font-medium text-left px-3 py-2" style={{ color: "var(--ink-3)" }}>xLights Model Name</th>
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
                        type="text"
                        value={localNameMap[fixture.id] ?? fixture.name}
                        onChange={(e) => {
                          setLocalNameMap((prev) => ({
                            ...prev,
                            [fixture.id]: e.target.value,
                          }));
                        }}
                        className="w-full h-7 px-2 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Review checkbox */}
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={namesReviewed}
              onChange={(e) => setNamesReviewed(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>I&apos;ve reviewed the names</span>
          </label>
        </div>

        {/* Progress bar */}
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

        {/* Footer */}
        <div
          className="flex justify-between px-5 py-3"
          style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}
        >
          <button
            onClick={onBack}
            disabled={exporting}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              opacity: exporting ? 0.5 : 1,
            }}
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={exporting}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                opacity: exporting ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onExport}
              disabled={exporting || !namesReviewed}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "1px solid var(--accent)",
                opacity: exporting || !namesReviewed ? 0.5 : 1,
              }}
            >
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
