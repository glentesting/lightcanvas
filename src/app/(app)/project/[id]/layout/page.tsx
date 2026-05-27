"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { LayoutView } from "@/components/editor/layout-panel/LayoutView";
import { useEditorStore } from "@/lib/store/editor-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";

export default function LayoutPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const loadProject = useEditorStore((s) => s.loadProject);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const houseCustomSvg = useEditorStore((s) => s.houseCustomSvg);
  const setHousePhoto = useEditorStore((s) => s.setHousePhoto);

  const fixtures = useEditorStore((s) => s.fixtures);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [nightPreview, setNightPreview] = useState(false);

  const validationInfo = useMemo(() => {
    const needsPlacement = fixtures.filter(
      (f) => !f.layout3d?.points.length && !f.layout?.points.length,
    ).length;
    const total = fixtures.length;
    const placed = total - needsPlacement;
    const readiness = total === 0 ? 0 : Math.round((placed / total) * 100);
    return { needsPlacement, total, placed, readiness };
  }, [fixtures]);

  useAutosave(projectId);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    if (useEditorStore.getState().projectId === projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded(true);
      return;
    }
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((row) => {
        const project = projectFromRow(row);
        if (project.fixtures.length < 6) {
          const defaults = createDefaultFixtures();
          project.fixtures = defaults;
          project.sequence = {
            ...project.sequence,
            tracks: defaults.map((f) => ({ id: f.id, kind: "fixture" as const })),
          };
        }
        loadProject(project);
        setLoaded(true);
      });
  }, [projectId, loadProject]);

  const handlePhotoUpload = useCallback(async (file: File) => {
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    try {
      const res = await fetch("/api/upload-house-photo", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setHousePhoto(url);
      }
    } finally {
      setUploadingPhoto(false);
    }
  }, [projectId, setHousePhoto]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--line)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#FFFFFF" }}>
      {/* Hidden file input for house photo */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePhotoUpload(f);
          e.target.value = "";
        }}
      />

      {/* Page header */}
      <div className="shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center justify-between px-8 py-3">
          <div className="flex items-center gap-4">
            <Link
              href={`/project/${projectId}`}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-[var(--ink)]"
              style={{ color: "var(--ink-3)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Designer
            </Link>
            <div className="w-px h-5" style={{ background: "var(--line)" }} />
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }}
              >
                Layout Editor
              </h1>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                Map your lights to the real-world shape of your home.
              </p>
            </div>
          </div>
        </div>

        {/* Action toolbar */}
        <div
          className="flex items-center justify-between px-8 py-2"
          style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}
        >
          <div className="flex items-center gap-2">
            {/* Photo View / Night Preview toggle */}
            <div
              className="flex h-8 rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--line)" }}
            >
              <button
                onClick={() => setNightPreview(false)}
                className="px-3 text-xs font-medium flex items-center gap-1.5 transition-colors"
                style={{
                  background: !nightPreview ? "#1e3a5f" : "#FFFFFF",
                  color: !nightPreview ? "#FFFFFF" : "var(--ink-3)",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                Photo View
              </button>
              <button
                onClick={() => setNightPreview(true)}
                className="px-3 text-xs font-medium flex items-center gap-1.5 transition-colors"
                style={{
                  background: nightPreview ? "#1e3a5f" : "#FFFFFF",
                  color: nightPreview ? "#FFFFFF" : "var(--ink-3)",
                  borderLeft: "1px solid var(--line)",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Night Preview
              </button>
            </div>

            <div className="w-px h-5" style={{ background: "var(--line)" }} />

            {/* Replace / Upload Photo */}
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors hover:border-[var(--ink-3)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {uploadingPhoto ? "Uploading..." : houseCustomSvg ? "Replace Photo" : "Upload Photo"}
            </button>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Validate Layout — stub for now; surfaces channel-overlap
                warnings from src/lib/3d/export-adapter.ts in a follow-up. */}
            <button
              className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors hover:border-[var(--ink-3)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Validate Layout
            </button>
          </div>
        </div>
      </div>

      {/* Validation strip */}
      {validationInfo.total > 0 && (
        <div
          className="flex items-center justify-between px-8 py-2 shrink-0"
          style={{
            background: validationInfo.needsPlacement === 0 ? "#f0fdf4" : "#fffbeb",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={validationInfo.needsPlacement === 0 ? "#15803d" : "#b45309"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {validationInfo.needsPlacement === 0
                ? <><polyline points="20 6 9 17 4 12" /></>
                : <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>}
            </svg>
            <span className="text-xs font-medium"
              style={{ color: validationInfo.needsPlacement === 0 ? "#15803d" : "#b45309" }}>
              {validationInfo.needsPlacement === 0
                ? `All ${validationInfo.total} props placed — layout ready!`
                : `${validationInfo.needsPlacement} prop${validationInfo.needsPlacement > 1 ? "s" : ""} still need${validationInfo.needsPlacement === 1 ? "s" : ""} to be placed on your house`}
            </span>
          </div>
          {validationInfo.needsPlacement > 0 && (
            <div className="flex items-center gap-2">
              <button className="h-6 px-2.5 rounded-md text-xs font-medium"
                style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}>
                Auto-fix mapping
              </button>
              <button className="h-6 px-2.5 rounded-md text-xs font-medium"
                style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}>
                Review manually
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <LayoutView />
      </div>
    </div>
  );
}
