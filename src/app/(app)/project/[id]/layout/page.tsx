"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LayoutEditor from "@/components/LayoutEditor";
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

  // Ref for triggering photo upload from header
  const photoInputRef = useRef<HTMLInputElement>(null);
  const houseCustomSvg = useEditorStore((s) => s.houseCustomSvg);
  const setHousePhoto = useEditorStore((s) => s.setHousePhoto);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const handlePhotoUpload = async (file: File) => {
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
  };

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
      <div
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
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
                fontSize: 24,
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
        <div className="flex items-center gap-2">
          {houseCustomSvg && (
            <button
              onClick={() => setHousePhoto(undefined)}
              className="h-8 px-3 rounded-lg text-xs font-medium"
              style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink-3)" }}
            >
              Remove Photo
            </button>
          )}
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="h-8 px-3 rounded-lg text-xs font-medium"
            style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}
          >
            {uploadingPhoto ? "Uploading..." : houseCustomSvg ? "Replace Photo" : "Upload Photo"}
          </button>
        </div>
      </div>

      {/* Editor fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <LayoutEditor />
      </div>
    </div>
  );
}
