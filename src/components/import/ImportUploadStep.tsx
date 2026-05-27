"use client";

import { useRef } from "react";

interface ImportUploadStepProps {
  error: string | null;
  onFileSelect: (file: File) => void;
  onClose: () => void;
}

export default function ImportUploadStep({
  error,
  onFileSelect,
  onClose,
}: ImportUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

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
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-1">Import Sequence</h3>
          <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
            Import an existing sequence from xLights or Light-O-Rama
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
            style={{
              border: "2px dashed var(--line)",
              background: "var(--panel)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLElement).style.background = "var(--accent-50)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
              (e.currentTarget as HTMLElement).style.background = "var(--panel)";
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: "var(--ink-3)" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
                Drop a file here or click to browse
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
                Supports .xsq (xLights) and .lms (Light-O-Rama)
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xsq,.lms"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
              // Reset so same file can be selected again
              e.target.value = "";
            }}
          />

          {/* Error */}
          {error && (
            <div
              className="rounded-lg p-3 mt-3"
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
          className="flex justify-end px-5 py-3"
          style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}
        >
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
