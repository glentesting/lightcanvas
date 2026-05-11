"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseXsq } from "@/lib/imports/xsq";
import { parseLms } from "@/lib/imports/lor";
import type { ImportResult } from "@/lib/imports/xsq";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

type ImportStep = "upload" | "summary" | "importing" | "done";

export default function ImportDialog({ open, onClose }: ImportDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [format, setFormat] = useState<"xsq" | "lms" | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setFormat(null);
    setResult(null);
    setProjectName("");
    setError(null);
    setWarningsExpanded(false);
    setImporting(false);
    setNewProjectId(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext !== "xsq" && ext !== "lms") {
      setError("Unsupported file format. Please select an .xsq (xLights) or .lms (Light-O-Rama) file.");
      return;
    }

    setFileName(file.name);
    setFormat(ext as "xsq" | "lms");
    setProjectName(file.name.replace(/\.(xsq|lms)$/i, ""));

    try {
      const text = await file.text();
      const parsed = ext === "xsq" ? parseXsq(text) : parseLms(text);
      setResult(parsed);

      if (parsed.fixtures.length === 0 && parsed.blocks.length === 0) {
        setError("No fixtures or effects found in the file. It may be empty or in an unsupported format.");
        return;
      }

      setStep("summary");
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleImport = useCallback(async () => {
    if (!result || !projectName.trim()) return;

    setImporting(true);
    setStep("importing");

    try {
      // Build tracks from fixtures
      const tracks = result.fixtures.map((f) => ({
        id: f.id,
        kind: "fixture" as const,
      }));

      // Build audio analysis if we have beat grid
      const audio = result.beatGrid
        ? {
            duration: 0,
            bpm: 120,
            beats: result.beatGrid,
            downbeats: result.beatGrid.filter((_, i) => i % 4 === 0),
            onsets: [],
            loudness: [],
          }
        : null;

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          fixtures: result.fixtures,
          sequence: {
            tracks,
            blocks: result.blocks,
            bpm: 120,
            beatGridOffset: 0,
          },
          audio,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      const project = await res.json();
      setNewProjectId(project.id);
      setStep("done");
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStep("summary");
    } finally {
      setImporting(false);
    }
  }, [result, projectName]);

  if (!open) return null;

  // Done step -- import succeeded
  if (step === "done" && newProjectId) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
        onClick={handleClose}
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
                handleClose();
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
                handleClose();
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

  // Importing step -- spinner
  if (step === "importing") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      >
        <div
          className="rounded-xl overflow-hidden w-full max-w-sm"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="px-5 py-8 flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
            <p className="text-sm font-medium">Creating project...</p>
          </div>
        </div>
      </div>
    );
  }

  // Summary step -- show parsed results
  if (step === "summary" && result) {
    const { stats, warnings } = result;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
        onClick={handleClose}
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
              onClick={handleClose}
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
              onClick={handleImport}
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

  // Upload step -- file selection
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={handleClose}
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
              if (file) handleFileSelect(file);
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
            onClick={handleClose}
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
