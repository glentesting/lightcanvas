"use client";

import { useState, useCallback } from "react";
import { parseXsq } from "@/lib/imports/xsq";
import { parseLms } from "@/lib/imports/lor";
import type { ImportResult } from "@/lib/imports/xsq";
import ImportUploadStep from "./ImportUploadStep";
import ImportSummaryStep from "./ImportSummaryStep";
import ImportSuccessStep from "./ImportSuccessStep";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

type ImportStep = "upload" | "summary" | "importing" | "done";

export default function ImportDialog({ open, onClose }: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [format, setFormat] = useState<"xsq" | "lms" | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setFormat(null);
    setResult(null);
    setProjectName("");
    setError(null);
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
      <ImportSuccessStep
        result={result}
        newProjectId={newProjectId}
        onClose={handleClose}
      />
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
    return (
      <ImportSummaryStep
        fileName={fileName}
        format={format}
        result={result}
        projectName={projectName}
        setProjectName={setProjectName}
        error={error}
        importing={importing}
        onCancel={handleClose}
        onImport={handleImport}
      />
    );
  }

  // Upload step -- file selection
  return (
    <ImportUploadStep
      error={error}
      onFileSelect={handleFileSelect}
      onClose={handleClose}
    />
  );
}
