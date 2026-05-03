"use client";

import { useState } from "react";
import type { AudioAnalysis } from "@/lib/audio/types";

interface AudioUploadProps {
  projectId: string;
  onUploaded?: (url: string, name: string, analysis: AudioAnalysis | null) => void;
}

export default function AudioUpload({ projectId, onUploaded }: AudioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);

    try {
      const res = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const song = await res.json();
      setFileName(file.name);
      setUploading(false);

      // Run beat detection analysis
      setAnalyzing(true);
      let analysis: AudioAnalysis | null = null;
      try {
        const { analyzeAudio } = await import("@/lib/audio/beat-detector");
        analysis = await analyzeAudio(file);
      } catch (err) {
        console.warn("Beat detection failed:", err);
      }
      setAnalyzing(false);

      onUploaded?.(song.file_url, file.name, analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  function handleReplace() {
    setFileName(null);
  }

  return (
    <div>
      {fileName ? (
        <div
          className="flex items-center gap-2.5 p-2.5 rounded-lg"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-100)", color: "var(--accent-ink)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{fileName}</div>
            <div className="text-xs" style={{ color: "var(--ink-3)" }}>
              {analyzing ? "Analyzing beats..." : "Uploaded"}
            </div>
          </div>
          <button
            onClick={handleReplace}
            className="text-xs px-2 py-1 rounded-md transition-colors"
            style={{ color: "var(--accent-ink)", background: "var(--accent-50)" }}
          >
            Replace
          </button>
        </div>
      ) : (
        <label
          className="flex items-center justify-center gap-2 w-full h-8 rounded-md cursor-pointer text-xs font-medium transition-colors"
          style={{
            background: "var(--accent-50)",
            color: "var(--accent-ink)",
            border: "1px solid var(--accent-200)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {uploading ? "Uploading..." : "Upload song"}
          <input
            type="file"
            accept="audio/*"
            onChange={handleUpload}
            disabled={uploading || analyzing}
            className="hidden"
          />
        </label>
      )}
      {error && <p className="text-xs mt-2" style={{ color: "#d44" }}>{error}</p>}
    </div>
  );
}
