"use client";

import { useRouter } from "next/navigation";
import type { ImportResult } from "@/lib/imports/xsq";

interface ImportSuccessStepProps {
  result: ImportResult | null;
  newProjectId: string;
  onClose: () => void;
}

export default function ImportSuccessStep({
  result,
  newProjectId,
  onClose,
}: ImportSuccessStepProps) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
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
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(96% 0.06 145)", color: "oklch(35% 0.12 145)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Import complete!</h3>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                {result?.stats.fixtureCount} fixture{result?.stats.fixtureCount !== 1 ? "s" : ""},{" "}
                {result?.stats.blockCount} effect block{result?.stats.blockCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div
            className="rounded-lg p-4 mb-3"
            style={{ background: "oklch(97% 0.04 80)", border: "1px solid oklch(90% 0.06 80)" }}
          >
            <div className="flex items-start gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="oklch(55% 0.15 80)"
                strokeWidth="2"
                className="shrink-0 mt-0.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p className="text-xs" style={{ color: "oklch(40% 0.1 80)" }}>
                Your sequence file referenced an audio file. Open the project and upload your
                audio via the Audio tab to hear playback.
              </p>
            </div>
          </div>
        </div>
        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}
        >
          <button
            onClick={() => {
              onClose();
            }}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          >
            Stay on dashboard
          </button>
          <button
            onClick={() => {
              router.push(`/project/${newProjectId}`);
              onClose();
            }}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Open project
          </button>
        </div>
      </div>
    </div>
  );
}
