"use client";

import { useParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import AudioUpload from "@/components/AudioUpload";
import WaveformViewer from "@/components/WaveformViewer";
import Timeline, { PaletteEffectChip, TimelineDndProvider } from "@/components/Timeline";
import { useEditorStore } from "@/lib/store/editor-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import type { AudioAnalysis } from "@/lib/audio/types";
import { EFFECT_COLORS, EFFECT_NAMES } from "@/lib/timeline/constants";
import type { EffectId } from "@/lib/timeline/types";

type Tab = "timeline" | "layout" | "preview";

export default function ProjectEditorPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [tab, setTab] = useState<Tab>("timeline");
  const [loaded, setLoaded] = useState(false);
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

  // Load project from API into store (once)
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((row) => {
        loadProject(projectFromRow(row));
        setLoaded(true);
      });
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

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
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
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>My shows /</span>
          <span className="text-sm font-semibold">{name || "Untitled"}</span>
        </div>

        {/* Save status */}
        <div className="ml-2">
          {saveStatus === "saving" && (
            <span className="text-xs" style={{ color: "var(--ink-4)" }}>Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs" style={{ color: "var(--accent)" }}>Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs" style={{ color: "#d44" }}>Save failed</span>
          )}
        </div>

        <div className="flex-1" />

        {/* Song info chip */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs"
          style={{ background: "var(--panel)", color: "var(--ink-3)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span>{audioFile || "No song uploaded"}</span>
        </div>

        <button
          className="inline-flex items-center gap-2 h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "1px solid var(--accent)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
          </svg>
          AI Actions
        </button>

        <button
          className="inline-flex items-center gap-2 h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          Save
        </button>

        <button
          className="inline-flex items-center gap-2 h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "1px solid var(--accent)",
          }}
        >
          Export
        </button>

        <UserButton />
      </header>

      {/* Main body */}
      <TimelineDndProvider>
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <aside
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: 240,
            borderRight: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Song Upload Section */}
            <SidebarSection title="Song Upload">
              <AudioUpload projectId={projectId} onUploaded={handleAudioUploaded} />
            </SidebarSection>

            {/* Fixtures Section */}
            <SidebarSection title="Fixtures">
              <p className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>
                {fixtures.length} fixture{fixtures.length !== 1 ? "s" : ""} defined
              </p>
              {fixtures.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs mb-0.5"
                  style={{ color: "var(--ink-2)" }}
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-xs shrink-0"
                    style={{ background: "var(--accent-50)", color: "var(--accent-ink)", fontSize: 9 }}
                  >
                    {f.kind[0].toUpperCase()}
                  </span>
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-xs" style={{ color: "var(--ink-4)" }}>{f.pixelCount}px</span>
                </div>
              ))}
            </SidebarSection>

            {/* Effects Palette */}
            <SidebarSection title="Effects">
              <p className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>
                Drag onto a track
              </p>
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

            {/* AI Actions */}
            <SidebarSection title="AI Actions">
              <div className="flex flex-col gap-1.5">
                <button
                  className="flex items-center gap-2 w-full h-7 px-2.5 rounded-md text-xs font-medium text-left transition-colors"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "1px solid var(--accent)",
                  }}
                >
                  Generate sequence
                </button>
                <button
                  className="flex items-center gap-2 w-full h-7 px-2.5 rounded-md text-xs font-medium text-left transition-colors"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                >
                  Analyze audio
                </button>
                <button
                  className="flex items-center gap-2 w-full h-7 px-2.5 rounded-md text-xs font-medium text-left transition-colors"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                >
                  Refine timing
                </button>
                <button
                  className="flex items-center gap-2 w-full h-7 px-2.5 rounded-md text-xs font-medium text-left transition-colors"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                >
                  Generate palette
                </button>
              </div>
            </SidebarSection>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
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
    </div>
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
  const fixtures = useEditorStore((s) => s.fixtures);

  return (
    <div className="flex-1 flex min-h-0">
      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f7f6f2, #ecebe6)" }}>
        {/* Tool strip */}
        <div
          className="absolute top-3.5 left-1/2 -translate-x-1/2 flex gap-0.5 p-1 rounded-lg z-10"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}
        >
          {["Select", "Draw", "Rect", "Circle"].map((t) => (
            <button
              key={t}
              className="w-8 h-7 rounded-md flex items-center justify-center text-xs font-medium"
              style={{ background: "transparent", color: "var(--ink-2)", border: "none", cursor: "pointer" }}
            >
              {t[0]}
            </button>
          ))}
        </div>

        {/* Canvas empty state */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "var(--accent-50)", color: "var(--accent-ink)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>
              Upload a house photo
            </p>
            <p className="text-xs" style={{ color: "var(--ink-4)" }}>
              Then draw fixtures on top to define your light layout
            </p>
          </div>
        </div>

        {/* Zoom control */}
        <div
          className="absolute bottom-3.5 right-3.5 flex items-center gap-1 p-1 rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
        >
          <button className="w-6 h-6 flex items-center justify-center rounded text-xs" style={{ color: "var(--ink-3)" }}>-</button>
          <span className="text-xs font-semibold px-1.5" style={{ color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>100%</span>
          <button className="w-6 h-6 flex items-center justify-center rounded text-xs" style={{ color: "var(--ink-3)" }}>+</button>
        </div>
      </div>

      {/* Right panel — fixture list */}
      <div
        className="flex flex-col shrink-0"
        style={{ width: 260, borderLeft: "1px solid var(--line)", background: "var(--surface)" }}
      >
        <div className="p-3.5 pb-2.5" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold">Fixtures</span>
            <span className="inline-flex items-center px-2 rounded-full text-xs" style={{ height: 20, background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>
              {fixtures.length}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>Click to select. Drag to reorder.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {fixtures.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-center" style={{ color: "var(--ink-4)" }}>
                No fixtures yet. Use the draw tools to add fixtures to your layout.
              </p>
            </div>
          ) : (
            fixtures.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 cursor-pointer"
                style={{ border: "1px solid transparent" }}
              >
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0"
                  style={{ background: "var(--accent-50)", color: "var(--accent-ink)" }}
                >
                  {f.kind[0].toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{f.name}</div>
                  <div className="text-xs" style={{ color: "var(--ink-4)" }}>{f.pixelCount} px</div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Properties */}
        <div className="p-3.5" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--ink-3)", letterSpacing: "0.06em" }}>
            Properties
          </div>
          <p className="text-xs" style={{ color: "var(--ink-4)" }}>Select a fixture to edit properties</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Preview Panel ──────────────────────────────────────────── */
function PreviewPanel() {
  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "var(--bg)" }}>
      {/* Preview canvas */}
      <div
        className="flex-1 flex items-center justify-center relative"
        style={{ background: "linear-gradient(135deg, #f0eee9, #e6e3dc)" }}
      >
        {/* Status chips */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-4)" }} />
            Paused
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-4)" }} />
            0 effects active
          </span>
        </div>

        {/* Fullscreen button */}
        <button
          className="absolute top-4 right-4 inline-flex items-center gap-2 px-2.5 rounded-md text-xs font-medium"
          style={{ height: 28, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          Fullscreen
        </button>

        {/* Preview empty state */}
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-3)" }}>
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>
            Preview will appear here
          </p>
          <p className="text-xs" style={{ color: "var(--ink-4)" }}>
            Add a layout and create a sequence to see your light show in action
          </p>
        </div>
      </div>

      {/* Transport controls */}
      <div
        className="flex flex-col gap-2 px-4 py-3 shrink-0"
        style={{ height: 80, borderTop: "1px solid var(--line)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5">
          <button className="inline-flex items-center justify-center w-7 h-7 rounded-md" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
          </button>
          <button
            className="inline-flex items-center justify-center w-9 h-8 rounded-md"
            style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          </button>
          <button className="inline-flex items-center justify-center w-7 h-7 rounded-md" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="12" height="16" rx="1" /></svg>
          </button>
          <div
            className="px-2.5 py-1 rounded-md text-xs font-mono"
            style={{ background: "var(--panel)", color: "var(--ink-2)", fontVariantNumeric: "tabular-nums", minWidth: 130 }}
          >
            00:00.00 <span style={{ color: "var(--ink-4)" }}>/ 00:00</span>
          </div>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs" style={{ height: 22, background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-4)" }} />
            1x
          </span>
        </div>
        {/* Scrubber bar */}
        <div className="relative rounded cursor-pointer" style={{ height: 18, background: "var(--panel)" }}>
          <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded" style={{ background: "var(--accent)" }} />
        </div>
      </div>
    </div>
  );
}
