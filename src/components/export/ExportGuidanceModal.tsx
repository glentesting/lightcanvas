"use client";

import type { ExportFormat } from "@/lib/exports/dialog-state";

interface ExportGuidanceModalProps {
  format: ExportFormat;
  onDismiss: () => void;
}

export default function ExportGuidanceModal({
  format,
  onDismiss,
}: ExportGuidanceModalProps) {
  const isXlights = format === "xlights";
  const isLor = format === "lor";
  const guidanceTitle = isLor
    ? "Next steps for Light-O-Rama"
    : isXlights
      ? "Next steps for xLights"
      : "Export complete";
  const guidanceSteps = isLor
    ? [
        "Open Light-O-Rama Sequence Editor",
        "File > Open > select the .lms file",
        "Verify channel assignments match your LOR controller",
        "Edit > Channel Properties to adjust Unit/Circuit if needed",
        "Hit Play to preview your show",
      ]
    : isXlights
      ? [
          "Create a show directory (e.g., C:\\xLights\\MyShow\\)",
          "Extract the ZIP contents into that directory",
          "Open xLights and set Show Directory to that folder",
          "Layout tab: your fixtures should appear as models",
          "Sequencer tab: open the .xsq file",
          "Render > Render All to generate pixel data",
          "Load the .fseq file in FPP or xSchedule and play",
        ]
      : ["Your file has been downloaded", "Open it in the appropriate application"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onDismiss}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-w-md"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(96% 0.06 145)", color: "oklch(35% 0.12 145)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Export complete!</h3>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>Your file has been downloaded</p>
            </div>
          </div>
          <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{guidanceTitle}</h4>
          <ol className="space-y-2.5">
            {guidanceSteps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--ink-2)" }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold" style={{ background: "var(--accent-50)", color: "var(--accent-700)" }}>{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="text-xs mt-4" style={{ color: "var(--ink-4)" }}>
            Detailed instructions coming soon. You can change your sequencer in <a href="/settings" style={{ color: "var(--accent)", textDecoration: "underline" }}>Settings</a>.
          </p>
        </div>
        <div className="flex justify-end px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
          <button onClick={onDismiss} className="h-8 px-4 rounded-md text-xs font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
