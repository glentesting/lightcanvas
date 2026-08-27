"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import WaveformViewer from "@/components/WaveformViewer";
import Timeline, { PaletteEffectChip, TimelineDndProvider, useTimelineShortcuts } from "@/components/Timeline";
import { useEditorStore } from "@/lib/store/editor-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";
import { EFFECT_COLORS, EFFECT_NAMES } from "@/lib/timeline/constants";
import type { EffectId } from "@/lib/timeline/types";

function TimelineContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Store selectors
  const name = useEditorStore((s) => s.name);
  const storeProjectId = useEditorStore((s) => s.projectId);
  const audioUrl = useEditorStore((s) => s.audioUrl);
  const audioAnalysis = useEditorStore((s) => s.audio);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const loadProject = useEditorStore((s) => s.loadProject);

  // Autosave + keyboard shortcuts
  useAutosave(projectId ?? "");
  useTimelineShortcuts();

  // If the project is already loaded in the store (navigated from Designer), skip fetch
  const alreadyLoaded = storeProjectId === projectId && storeProjectId !== "";

  // Load project from API if needed
  useEffect(() => {
    if (!projectId || loadedRef.current || alreadyLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (alreadyLoaded) setLoaded(true);
      return;
    }
    loadedRef.current = true;
    fetch(`/api/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Project not found" : "Failed to load project");
        return res.json();
      })
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
      })
      .catch((err) => setLoadError(err.message));
  }, [projectId, loadProject, alreadyLoaded]);

  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)" }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-3)" }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>No project selected</p>
        <p className="text-xs" style={{ color: "var(--ink-4)" }}>Open a project from the Designer to edit its timeline.</p>
        <Link href="/projects" className="text-sm px-4 py-2 rounded-md" style={{ background: "var(--accent)", color: "#fff" }}>
          Go to Projects
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--panel)", color: "var(--ink-3)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm font-medium">{loadError}</p>
        <Link href="/projects" className="text-sm px-4 py-2 rounded-md" style={{ background: "var(--accent)", color: "#fff" }}>
          Back to Projects
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>Loading project...</p>
      </div>
    );
  }

  const audioApiUrl = audioUrl ? `/api/audio/${projectId}` : null;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Page header */}
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 64, borderBottom: "1px solid var(--line)", background: "#FFFFFF" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/project/${projectId}`}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--panel)] transition-colors"
            style={{ color: "var(--ink-3)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1
              className="text-2xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
            >
              Timeline
            </h1>
            <p className="text-sm" style={{ color: "var(--ink-4)" }}>
              Edit your sequence, arrange effects, and sync to the beat.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--ink-4)" }}>
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Unsaved" : ""}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>
            {name || "Untitled"}
          </span>
          <Link
            href={`/project/${projectId}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Designer
          </Link>
        </div>
      </header>

      {/* Main sequencing area */}
      <TimelineDndProvider>
        <div className="flex flex-1 min-h-0">
          {/* Effects palette sidebar */}
          <aside
            className="flex flex-col shrink-0 overflow-y-auto"
            style={{ width: 180, borderRight: "1px solid var(--line)", background: "#FFFFFF" }}
          >
            <div className="px-3 pt-3 pb-2">
              <p
                className="text-xs font-semibold mb-2"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}
              >
                Effects
              </p>
              <p className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>
                Drag onto a track
              </p>
              <div className="grid grid-cols-1 gap-1">
                {(Object.keys(EFFECT_NAMES) as EffectId[]).map((id) => (
                  <PaletteEffectChip key={id} effectId={id} name={EFFECT_NAMES[id]} color={EFFECT_COLORS[id]} />
                ))}
              </div>
            </div>
          </aside>

          {/* Waveform + Timeline */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {audioApiUrl ? (
              <>
                <div className="shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
                  <WaveformViewer audioUrl={audioApiUrl} analysis={audioAnalysis} />
                </div>
                <Timeline analysis={audioAnalysis} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ background: "var(--panel)" }}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-3)" }}>
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No audio loaded</p>
                  <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                    Upload a song in the Designer to build your timeline
                  </p>
                  <Link
                    href={`/project/${projectId}`}
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Go to Designer
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </TimelineDndProvider>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}
