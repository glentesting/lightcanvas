"use client";

import { useState, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import type { AudioAnalysis } from "@/lib/audio/types";

interface AudioUploadProps {
  projectId: string;
  onUploaded?: (url: string, name: string, analysis: AudioAnalysis | null) => void;
}

export default function AudioUpload({ projectId, onUploaded }: AudioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioFile = useEditorStore((s) => s.audioFile);

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
        let message = "Upload failed";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch { /* response wasn't JSON */ }
        throw new Error(message);
      }

      const song = await res.json();
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

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveSong() {
    setConfirmDelete(false);
    // Clear audio from store — effects on timeline remain
    onUploaded?.("", "", null);
  }

  // Hidden file input shared by upload and replace
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="audio/*"
      onChange={handleUpload}
      disabled={uploading || analyzing}
      className="hidden"
    />
  );

  // Song is loaded — show info + replace/delete
  if (audioFile) {
    return (
      <div>
        {fileInput}
        {confirmDelete ? (
          <div className="rounded-lg p-3" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <p className="text-xs font-medium mb-1">Remove this song?</p>
            <p className="text-xs mb-3" style={{ color: "var(--ink-3)" }}>Effects on the timeline will remain.</p>
            <div className="flex gap-2">
              <button
                onClick={handleRemoveSong}
                className="text-xs px-2.5 py-1 rounded-md font-medium text-white"
                style={{ background: "#dc2626" }}
              >
                Remove
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2.5 py-1 rounded-md font-medium"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 p-2 rounded-lg"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            {/* Music note icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" style={{ color: "var(--accent-ink)" }}>
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            {/* Song name — truncated */}
            <span className="text-xs font-medium truncate flex-1" style={{ maxWidth: 140 }} title={audioFile}>
              {audioFile}
            </span>
            {/* Replace button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel-2)]"
              style={{ color: "var(--ink-3)" }}
              title="Replace song"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" />
                <path d="M2 11.5a10 10 0 0 1 18.8-4.3" /><path d="M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
            {/* Delete button */}
            <button
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel-2)]"
              style={{ color: "var(--ink-3)" }}
              title="Remove song"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {analyzing && <p className="text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>Analyzing beats...</p>}
        {error && <p className="text-xs mt-1.5" style={{ color: "#d44" }}>{error}</p>}
      </div>
    );
  }

  // No song loaded — show upload button
  return (
    <div>
      {fileInput}
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
      {error && <p className="text-xs mt-2" style={{ color: "#d44" }}>{error}</p>}
    </div>
  );
}
