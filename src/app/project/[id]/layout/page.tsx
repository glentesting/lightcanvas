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
  const name = useEditorStore((s) => s.name);

  useAutosave(projectId);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    // Only load if store is empty (navigated directly)
    if (useEditorStore.getState().projectId === projectId) {
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

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      <header className="flex items-center gap-3 px-3.5 shrink-0" style={{ height: 52, borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <Link
          href={`/project/${projectId}`}
          className="flex items-center gap-2 h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Editor
        </Link>
        <div className="w-px h-5" style={{ background: "var(--line)" }} />
        <span className="text-sm font-semibold">{name || "Untitled"}</span>
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>· Layout Editor</span>
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        <LayoutEditor />
      </div>
    </div>
  );
}
