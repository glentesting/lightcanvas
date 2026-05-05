"use client";

import { useParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import AudioUpload from "@/components/AudioUpload";
import WaveformViewer from "@/components/WaveformViewer";
import Timeline, { PaletteEffectChip, TimelineDndProvider, useTimelineShortcuts } from "@/components/Timeline";
import LayoutEditor from "@/components/LayoutEditor";
import PreviewPanel from "@/components/PreviewPanel";
import AIPanel from "@/components/AIPanel";
import ExportDialog from "@/components/ExportDialog";
import { useEditorStore } from "@/lib/store/editor-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";
import type { AudioAnalysis } from "@/lib/audio/types";
import { EFFECT_COLORS, EFFECT_NAMES } from "@/lib/timeline/constants";
import type { EffectId } from "@/lib/timeline/types";

type Tab = "timeline" | "layout" | "preview";

export default function ProjectEditorPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [tab, setTab] = useState<Tab>("timeline");
  const [showAI, setShowAI] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Store selectors
  const name = useEditorStore((s) => s.name);
  const audioUrl = useEditorStore((s) => s.audioUrl);
  const audioFile = useEditorStore((s) => s.audioFile);
  const audioAnalysis = useEditorStore((s) => s.audio);
  const fixtures = useEditorStore((s) => s.fixtures);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const loadProject = useEditorStore((s) => s.loadProject);
  const setAudio = useEditorStore((s) => s.setAudio);

  // Autosave hook
  useAutosave(projectId);

  // Timeline keyboard shortcuts (Delete, Cmd+D, Cmd+A, Cmd+Z, Esc)
  useTimelineShortcuts();

  // Load project from API into store (once)
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch(`/api/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Project not found" : "Failed to load project");
        return res.json();
      })
      .then((row) => {
        const project = projectFromRow(row);
        // Upgrade legacy projects that have fewer than 6 fixtures
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
  }, [projectId, loadProject]);

  const handleAudioUploaded = useCallback(
    (url: string, fileName: string, analysis: AudioAnalysis | null) => {
      setAudio(url, fileName, analysis);
    },
    [setAudio]
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "timeline", label: "Audio Timeline" },
    { id: "layout", label: "Layout" },
    { id: "preview", label: "Preview" },
  ];

  if (loadError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--panel)", color: "var(--ink-3)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm font-medium">{loadError}</p>
        <Link href="/dashboard" className="text-sm px-4 py-2 rounded-md" style={{ background: "var(--accent)", color: "#fff" }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Top Bar */}
      <header
        className="flex items-center gap-3 px-3.5 shrink-0"
        style={{
          height: 52,
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--panel)] transition-colors text-[var(--ink-3)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="w-px h-5" style={{ background: "var(--line)" }} />
        {/* Logo mark */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent)" }}>
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
        </svg>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>My shows /</span>
          <span className="text-sm font-semibold">{name || "Untitled"}</span>
          <button className="p-0.5" style={{ color: "var(--ink-4)", background: "none", border: "none", cursor: "pointer" }} title="Rename">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {saveStatus === "saving" && (
            <span className="text-xs ml-1" style={{ color: "var(--ink-4)" }}>· saving...</span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs ml-1" style={{ color: "#d44" }}>· unsaved</span>
          )}
        </div>

        <div className="flex-1" />

        {/* Song chip */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs"
          style={{ background: "var(--panel)", color: "var(--ink-3)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span>{audioFile || "No song"}</span>
          {audioAnalysis && <span style={{ color: "var(--ink-4)" }}>· {Math.floor(audioAnalysis.duration / 60)}:{String(Math.floor(audioAnalysis.duration % 60)).padStart(2, "0")}</span>}
        </div>

        {/* AI Actions with kbd hint */}
        <button
          onClick={() => setShowAI(true)}
          className="inline-flex items-center gap-2 h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
          </svg>
          AI Actions
          <span className="inline-flex items-center justify-center px-1.5 rounded font-mono" style={{ height: 18, background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-4)", fontSize: 10 }}>⌘K</span>
        </button>

        {/* Save */}
        <button
          className="inline-flex items-center gap-2 h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          Save
        </button>

        {/* Export (primary) */}
        <button
          onClick={() => setShowExport(true)}
          className="inline-flex items-center gap-2 h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
          style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
        >
          Export
        </button>

        <UserButton />
      </header>

      {/* Main body */}
      <TimelineDndProvider>
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar — tab-aware */}
        <aside
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: 240,
            borderRight: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Song — always visible */}
            <SidebarSection title="Song">
              <AudioUpload projectId={projectId} onUploaded={handleAudioUploaded} />
            </SidebarSection>

            {/* Fixtures — on timeline and layout tabs */}
            {(tab === "timeline" || tab === "layout") && (
              <SidebarSection title="Props">
                <p className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>
                  {fixtures.length} props · {fixtures.reduce((s, f) => s + f.pixelCount, 0)} px
                </p>
                {fixtures.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs mb-0.5 hover:bg-[var(--panel)] transition-colors cursor-default"
                    style={{ color: "var(--ink-2)" }}
                  >
                    <span
                      className="rounded flex items-center justify-center shrink-0"
                      style={{ width: 18, height: 18, background: "var(--accent-50)", color: "var(--accent-ink)" }}
                    >
                      <FixtureKindIcon kind={f.kind} />
                    </span>
                    <span className="truncate flex-1">{f.name}</span>
                  </div>
                ))}
              </SidebarSection>
            )}

            {/* Effects palette — only on Audio Timeline tab */}
            {tab === "timeline" && (
              <SidebarSection title="Effects">
                <p className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>Drag onto a track</p>
                <div className="grid grid-cols-2 gap-1">
                  {(Object.keys(EFFECT_NAMES) as EffectId[]).map((id) => (
                    <PaletteEffectChip
                      key={id}
                      effectId={id}
                      name={EFFECT_NAMES[id]}
                      color={EFFECT_COLORS[id]}
                    />
                  ))}
                </div>
              </SidebarSection>
            )}

            {/* AI Actions — always visible */}
            <SidebarSection title="AI Actions">
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setShowAI(true)}
                  className="flex items-center gap-2 w-full h-8 px-2.5 rounded-md text-xs font-medium justify-start transition-colors"
                  style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                  </svg>
                  Generate sequence
                </button>
                <button
                  className="flex items-center gap-2 w-full h-7 px-2.5 rounded-md text-xs font-medium justify-start transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l3-9 4 18 3-9h4" /></svg>
                  Analyze audio
                </button>
                <button
                  className="flex items-center gap-2 w-full h-7 px-2.5 rounded-md text-xs font-medium justify-start transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  Refine timing
                </button>
                <button
                  className="flex items-center gap-2 w-full h-7 px-2.5 rounded-md text-xs font-medium justify-start transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5" /><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                  Generate palette
                </button>
              </div>
            </SidebarSection>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Tab bar */}
          <div
            className="flex items-end gap-0.5 px-3.5 shrink-0"
            style={{
              height: 42,
              background: "var(--bg)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3.5 transition-colors"
                style={{
                  height: 32,
                  fontSize: 13,
                  fontWeight: tab === t.id ? 600 : 500,
                  color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
                  background: tab === t.id ? "var(--bg)" : "transparent",
                  border: tab === t.id ? "1px solid var(--line)" : "1px solid transparent",
                  borderBottom: tab === t.id ? "1px solid var(--bg)" : "none",
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  position: "relative",
                  bottom: -1,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "timeline" && <TimelinePanel audioUrl={audioUrl ? `/api/audio/${projectId}` : null} analysis={audioAnalysis} />}
          {tab === "layout" && <LayoutPanel />}
          {tab === "preview" && <PreviewPanel />}
        </div>
      </div>
      </TimelineDndProvider>

      {/* AI Panel (slides in from right) */}
      <AIPanel open={showAI} onClose={() => setShowAI(false)} />

      {/* Export Dialog */}
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}

/* ─── Fixture Kind Icon (tiny SVG for sidebar) ─────────── */
function FixtureKindIcon({ kind }: { kind: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {kind === "roofline" && <line x1="2" y1="12" x2="22" y2="12" />}
      {kind === "window-outline" && <rect x="4" y="6" width="16" height="12" rx="1" />}
      {kind === "mega-tree" && <><polygon points="12,2 3,18 21,18" /><line x1="12" y1="18" x2="12" y2="22" /></>}
      {kind === "mini-tree" && <><polygon points="12,4 5,17 19,17" /><line x1="12" y1="17" x2="12" y2="21" /></>}
      {kind === "arch" && <path d="M4 20 Q12 2 20 20" />}
      {kind === "bush" && <ellipse cx="12" cy="13" rx="9" ry="6" />}
    </svg>
  );
}

/* ─── Sidebar Section ────────────────────────────────────────── */
function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3.5 py-2.5 text-left"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? "rotate(0)" : "rotate(-90deg)",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {title}
      </button>
      {open && <div className="px-2.5 pb-2.5">{children}</div>}
    </div>
  );
}

/* ─── Timeline Panel ─────────────────────────────────────────── */
function TimelinePanel({ audioUrl, analysis }: { audioUrl: string | null; analysis: AudioAnalysis | null }) {
  if (audioUrl) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Waveform — fixed height */}
        <div className="shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
          <WaveformViewer audioUrl={audioUrl} analysis={analysis} />
        </div>
        {/* Track timeline — fills remaining space */}
        <Timeline analysis={analysis} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "var(--bg)" }}>
      {/* Transport bar (empty state) */}
      <div
        className="flex items-center gap-2.5 px-3.5 shrink-0"
        style={{
          height: 48,
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <button className="inline-flex items-center justify-center w-7 h-7 rounded-md opacity-50" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
        </button>
        <button className="inline-flex items-center justify-center w-9 h-8 rounded-md opacity-50" style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        </button>
        <button className="inline-flex items-center justify-center w-7 h-7 rounded-md opacity-50" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="12" height="16" rx="1" /></svg>
        </button>
        <div
          className="px-2.5 py-1 rounded-md text-xs font-mono"
          style={{ background: "var(--panel)", color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}
        >
          00:00.00 <span style={{ color: "var(--ink-4)" }}>/ 00:00</span>
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-4)" }} />
          Upload a song to detect BPM
        </span>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--panel)" }}>
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-3)" }}>
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>
            No audio loaded
          </p>
          <p className="text-xs" style={{ color: "var(--ink-4)" }}>
            Upload a song in the sidebar to see the waveform and build your timeline
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Layout Panel ───────────────────────────────────────────── */
function LayoutPanel() {
  return <LayoutEditor />;
}
