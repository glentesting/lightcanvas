"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import AudioUpload from "@/components/AudioUpload";
import PreviewPanel from "@/components/PreviewPanel";
import AIPanel from "@/components/AIPanel";
import ExportDialog from "@/components/ExportDialog";
import { useEditorStore } from "@/lib/store/editor-store";
import { useTransportStore, registerSeekHandler } from "@/lib/store/transport-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";
import type { AudioAnalysis } from "@/lib/audio/types";
import type { Fixture } from "@/lib/fixtures/types";

/* ─── Fixture Kind Colors ──────────────────────────────────── */
const FIXTURE_KIND_COLORS: Record<string, string> = {
  roofline: "#f59e0b",
  "window-outline": "#3b82f6",
  "mega-tree": "#22c55e",
  "mini-tree": "#22c55e",
  arch: "#6b7280",
  bush: "#8b5cf6",
  matrix: "#6b7280",
  custom: "#6b7280",
};

const KIND_GROUP_MAP: Record<string, string> = {
  roofline: "Roof & Railings",
  "window-outline": "Windows",
  "mega-tree": "Trees",
  "mini-tree": "Trees",
  bush: "Yard Stakes",
  arch: "Arches",
  matrix: "Other",
  custom: "Faces & Stars",
};

function groupFixturesByCategory(fixtures: Fixture[]) {
  const order = ["Trees", "Arches", "Yard Stakes", "Faces & Stars", "Windows", "Roof & Railings", "Other"];
  const groups: Record<string, Fixture[]> = {};
  for (const f of fixtures) {
    const label = KIND_GROUP_MAP[f.kind] ?? "Other";
    if (!groups[label]) groups[label] = [];
    groups[label].push(f);
  }
  return order.filter((l) => groups[l]).map((label) => ({ label, items: groups[label], count: groups[label].length }));
}

/* ─── Section colors for sequence overview ─────────────────── */
const SECTION_COLORS: Record<string, string> = {
  intro: "#93c5fd",
  verse: "#86efac",
  chorus: "#fbbf24",
  bridge: "#c4b5fd",
  outro: "#fca5a5",
};

export default function DesignerPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [showAI, setShowAI] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // The visualizer is the hero — both side panels collapse so the stage can go full-bleed.
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Store selectors
  const _name = useEditorStore((s) => s.name);
  const _audioUrl = useEditorStore((s) => s.audioUrl);
  const audioFile = useEditorStore((s) => s.audioFile);
  const audioAnalysis = useEditorStore((s) => s.audio);
  const fixtures = useEditorStore((s) => s.fixtures);
  const sequence = useEditorStore((s) => s.sequence);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const loadProject = useEditorStore((s) => s.loadProject);
  const setAudio = useEditorStore((s) => s.setAudio);

  // Transport for sequence overview (not used directly but kept for future use)

  // Autosave hook
  useAutosave(projectId);

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

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const selectedFixture = fixtures.find((f) => f.id === selectedFixtureId) ?? null;
  const totalChannels = fixtures.reduce((s, f) => s + f.pixelCount * 3, 0);

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

  const grouped = groupFixturesByCategory(fixtures);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Page header */}
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 64, borderBottom: "1px solid var(--line)", background: "#FFFFFF" }}
      >
        <div>
          <h1
            className="text-2xl font-semibold leading-tight"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Your Light Show
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-4)" }}>
            Press ▶ below to watch the show — click or drag the song bar to jump to any moment. When you like it, click Export to put it on your light controller.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--ink-4)" }}>
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Unsaved" : ""}
          </span>
          <button
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold transition-colors"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", cursor: "pointer" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <Link
            href={`/timeline?project=${projectId}`}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Edit Timeline
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main body: left panel + center preview + right inspector */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel — Props tree */}
        {leftOpen && (
        <aside
          className="flex flex-col shrink-0 overflow-hidden"
          style={{ width: 240, borderRight: "1px solid var(--line)", background: "#FFFFFF" }}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Props header */}
            <div className="px-3.5 pt-3.5 pb-2">
              <p
                className="text-xs font-semibold mb-1"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}
              >
                Your Lights
              </p>
              <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                Every light piece in your yard. Click one to see its details.
              </p>
            </div>

            {/* All lights count */}
            <div className="px-3.5 pb-1">
              <p className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
                ALL PIECES <span className="inline-flex items-center justify-center px-1.5 rounded-full text-xs" style={{ background: "var(--panel)", color: "var(--ink-4)", fontSize: 10, minWidth: 18, height: 16 }}>{fixtures.length}</span>
              </p>
            </div>

            {/* Categorized groups */}
            <div className="px-1.5 pb-2">
              {grouped.map(({ label, items, count }) => {
                const isCollapsed = collapsedGroups.has(label);
                return (
                  <div key={label} className="mb-1">
                    <button
                      onClick={() => toggleGroup(label)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left rounded-md hover:bg-[var(--panel)] transition-colors"
                      style={{ background: "transparent", border: "none", cursor: "pointer" }}
                    >
                      <svg
                        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.15s", color: "var(--ink-4)" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <span className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>{label}</span>
                      <span
                        className="inline-flex items-center justify-center rounded-full ml-auto"
                        style={{ background: "var(--panel)", color: "var(--ink-4)", fontSize: 10, minWidth: 16, height: 14, padding: "0 4px" }}
                      >
                        {count}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="ml-1">
                        {items.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setSelectedFixtureId(selectedFixtureId === f.id ? null : f.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left"
                            style={{
                              color: "var(--ink-2)",
                              background: selectedFixtureId === f.id ? "var(--accent-50, #eff6ff)" : "transparent",
                              border: "none",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (selectedFixtureId !== f.id) (e.currentTarget as HTMLElement).style.background = "#f8f8f8";
                            }}
                            onMouseLeave={(e) => {
                              if (selectedFixtureId !== f.id) (e.currentTarget as HTMLElement).style.background = "transparent";
                            }}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: FIXTURE_KIND_COLORS[f.kind] ?? "#6b7280" }}
                            />
                            <span className="truncate flex-1">{f.name}</span>
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                              style={{ color: "var(--ink-4)", opacity: 0.5 }}
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Song upload (compact) */}
            <div style={{ borderTop: "1px solid var(--line)" }}>
              <div className="px-3.5 py-2.5">
                <p className="text-xs font-semibold mb-2" style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                  Song
                </p>
                {audioFile ? (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-3)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                    <span className="truncate">{audioFile}</span>
                    {audioAnalysis && (
                      <span style={{ color: "var(--ink-4)" }}>
                        {Math.floor(audioAnalysis.duration / 60)}:{String(Math.floor(audioAnalysis.duration % 60)).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                ) : (
                  <AudioUpload projectId={projectId} onUploaded={handleAudioUploaded} />
                )}
              </div>
            </div>

            {/* AI Actions */}
            <div style={{ borderTop: "1px solid var(--line)" }}>
              <div className="px-3.5 py-2.5">
                <p className="text-xs font-semibold mb-2" style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                  Make a Show
                </p>
                <button
                  onClick={() => setShowAI(true)}
                  className="flex items-center gap-2 w-full h-8 px-2.5 rounded-md text-xs font-medium justify-start transition-colors"
                  style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", cursor: "pointer" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                  </svg>
                  Create my light show
                </button>
                <p className="text-xs mt-1.5" style={{ color: "var(--ink-4)" }}>
                  The computer listens to your song and sets all the lights to the music. You can redo it as many times as you like.
                </p>
              </div>
            </div>
          </div>
        </aside>
        )}

        {/* Center — Preview canvas (the hero) */}
        <div className="relative flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0">
            <PreviewPanel projectId={projectId} />
          </div>

          {/* Panel toggles — tucked to the stage edges */}
          <PanelToggle side="left" open={leftOpen} onClick={() => setLeftOpen((v) => !v)} />
          <PanelToggle side="right" open={rightOpen} onClick={() => setRightOpen((v) => !v)} />
        </div>

        {/* Right Panel — Selected Prop Inspector */}
        {rightOpen && (
        <aside
          className="flex flex-col shrink-0 overflow-y-auto"
          style={{ width: 280, borderLeft: "1px solid var(--line)", background: "#FFFFFF" }}
        >
          {selectedFixture ? (
            <FixtureInspector fixture={selectedFixture} totalChannels={totalChannels} />
          ) : (
            <LayoutSummary fixtureCount={fixtures.length} totalChannels={totalChannels} />
          )}
        </aside>
        )}
      </div>

      {/* Bottom — Sequence Overview */}
      <SequenceOverview
        projectId={projectId}
        audioAnalysis={audioAnalysis}
        blockCount={sequence.blocks.length}
        duration={audioAnalysis?.duration ?? 0}
      />

      <AIPanel open={showAI} onClose={() => setShowAI(false)} />
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}

/* ─── Panel toggle (stage edge chevrons) ───────────────────── */
function PanelToggle({ side, open, onClick }: { side: "left" | "right"; open: boolean; onClick: () => void }) {
  const pointsOut = (side === "left") === open; // chevron points toward collapse direction
  return (
    <button
      onClick={onClick}
      aria-label={`${open ? "Hide" : "Show"} ${side} panel`}
      className="absolute z-10 flex items-center justify-center transition-opacity hover:opacity-100"
      style={{
        [side]: 8,
        top: "50%",
        transform: "translateY(-50%)",
        width: 20,
        height: 44,
        borderRadius: 8,
        background: "rgba(16, 20, 34, 0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(6px)",
        opacity: 0.55,
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
        style={{ transform: pointsOut ? "rotate(180deg)" : "none" }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

/* ─── Layout Summary (no selection) ────────────────────────── */
function LayoutSummary({ fixtureCount, totalChannels }: { fixtureCount: number; totalChannels: number }) {
  return (
    <div className="p-4">
      <p
        className="text-xs font-semibold mb-4"
        style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}
      >
        Your Display
      </p>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--ink-3)" }}>Light pieces</span>
          <span className="font-medium">{fixtureCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--ink-3)" }}>Individual bulbs</span>
          <span className="font-medium">{Math.round(totalChannels / 3).toLocaleString()}</span>
        </div>
        <div className="mt-6 rounded-xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <p className="text-xs text-center" style={{ color: "var(--ink-4)" }}>
            Click any light piece in the left list and its details will show up here.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Fixture Inspector (light piece selected) ─────────────── */
function FixtureInspector({ fixture }: { fixture: Fixture; totalChannels: number }) {
  const kindLabels: Record<string, string> = {
    roofline: "Roof / railing lights",
    "window-outline": "Window outline",
    "mega-tree": "Big tree",
    "mini-tree": "Mini tree",
    arch: "Arch",
    bush: "Yard stake",
    matrix: "Light panel",
    custom: "Special piece",
  };

  return (
    <div className="p-4">
      {/* Fixture header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: FIXTURE_KIND_COLORS[fixture.kind] ?? "#6b7280" }}
        />
        <span className="text-sm font-semibold flex-1">{fixture.name}</span>
      </div>

      {/* Details */}
      <p
        className="text-xs font-semibold mb-2"
        style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}
      >
        Details
      </p>
      <div className="space-y-2 mb-4">
        <InspectorField label="What it is" value={kindLabels[fixture.kind] ?? "Light piece"} />
        <InspectorField label="Bulbs" value={String(fixture.pixelCount)} />
        {fixture.lor ? (
          <>
            <InspectorField label="Controller box" value={`Unit ${fixture.lor.unit}`} />
            <InspectorField label="Plug number" value={String(fixture.lor.startCircuit)} />
            <InspectorField
              label="Light type"
              value={fixture.lor.stringType === "RGB" ? "Color-changing pixels" : fixture.lor.stringType === "DumbRGB" ? "One-color-at-a-time RGB" : "Regular plug-in lights"}
            />
          </>
        ) : (
          <InspectorField label="Starts at channel" value={String(fixture.startChannel)} />
        )}
      </div>

      {fixture.lor && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs font-medium" style={{ color: "#15803d" }}>
            Came from your Light-O-Rama display — export knows exactly where it lives
          </span>
        </div>
      )}
    </div>
  );
}

function InspectorField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "var(--ink-3)" }}>{label}</span>
      <span
        className="text-xs font-mono px-2 py-0.5 rounded"
        style={{ background: "var(--panel)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Sequence Overview (bottom bar) ───────────────────────── */
function SequenceOverview({
  projectId,
  audioAnalysis,
  blockCount,
  duration,
}: {
  projectId: string;
  audioAnalysis: AudioAnalysis | null;
  blockCount: number;
  duration: number;
}) {
  const sections = audioAnalysis?.sections;
  const durationStr = duration > 0
    ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`
    : "0:00";

  // ── playback: audio element drives the shared transport clock so the
  //    preview lights run in sync with the music, right on this screen ──
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const currentTime = useTransportStore((s) => s.currentTime);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const hasAudio = duration > 0;
  // the audio route 307-redirects to the stored file; the <audio> element
  // follows that natively (same approach as the timeline page)
  const [audioBroken, setAudioBroken] = useState(false);
  const audioSrc = hasAudio && !audioBroken ? `/api/audio/${projectId}` : null;

  const stopTicking = useCallback(() => cancelAnimationFrame(rafRef.current), []);
  const startTicking = useCallback(() => {
    const tick = () => {
      const el = audioRef.current;
      if (el && !el.paused) {
        useTransportStore.getState().setCurrentTime(el.currentTime);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => stopTicking(), [stopTicking]);

  // ── scrubbing: move the real audio, which then republishes the clock so
  //    the preview lights redraw at the moment you land on ──
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const seekTo = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(duration, t));
      const el = audioRef.current;
      if (el) el.currentTime = clamped;
      // paused or playing, the preview follows the clock
      useTransportStore.getState().setCurrentTime(clamped);
    },
    [duration]
  );

  // this page owns the audio while it is open — let any surface seek it
  useEffect(() => {
    if (!audioSrc) return;
    registerSeekHandler(seekTo);
    return () => registerSeekHandler(null);
  }, [audioSrc, seekTo]);

  const timeAtClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return 0;
      return ((clientX - rect.left) / rect.width) * duration;
    },
    [duration]
  );

  const startScrub = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!audioSrc) return;
      e.preventDefault();
      setScrubbing(true);
      seekTo(timeAtClientX(e.clientX));
    },
    [audioSrc, seekTo, timeAtClientX]
  );

  // drag continues even when the pointer leaves the bar
  useEffect(() => {
    if (!scrubbing) return;
    const onMove = (e: PointerEvent) => seekTo(timeAtClientX(e.clientX));
    const onUp = () => setScrubbing(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scrubbing, seekTo, timeAtClientX]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      if (el.ended || el.currentTime >= duration - 0.05) el.currentTime = 0;
      el.play();
      useTransportStore.getState().setPlaying(true);
      startTicking();
    } else {
      el.pause();
      useTransportStore.getState().setPlaying(false);
      stopTicking();
    }
  }, [duration, startTicking, stopTicking]);

  // Space plays/pauses, arrows nudge, Home jumps to the start
  useEffect(() => {
    if (!audioSrc) return;
    function onKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekTo(useTransportStore.getState().currentTime + (e.shiftKey ? 10 : 5));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekTo(useTransportStore.getState().currentTime - (e.shiftKey ? 10 : 5));
      } else if (e.key === "Home") {
        e.preventDefault();
        seekTo(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [audioSrc, seekTo, togglePlay]);

  const timeStr = `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, "0")}`;
  const progressPct = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  return (
    <div
      className="flex items-center gap-4 px-4 shrink-0"
      style={{ height: 72, borderTop: "1px solid var(--line)", background: "#FFFFFF" }}
    >
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          onError={() => setAudioBroken(true)}
          // coarse fallback clock — keeps time moving even when the page is
          // hidden and requestAnimationFrame is throttled
          onTimeUpdate={(e) => useTransportStore.getState().setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            useTransportStore.getState().setPlaying(false);
            stopTicking();
          }}
        />
      )}

      {/* Play button + time */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={togglePlay}
          disabled={!audioSrc}
          title={audioSrc ? (isPlaying ? "Pause" : "Play the show") : "Add a song first"}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: audioSrc ? "var(--accent)" : "var(--panel)",
            border: "1px solid " + (audioSrc ? "var(--accent)" : "var(--line)"),
            color: audioSrc ? "#fff" : "var(--ink-4)",
            cursor: audioSrc ? "pointer" : "default",
          }}
        >
          {isPlaying ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <div className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>
          {timeStr} / {durationStr}
        </div>
      </div>

      {/* Song bar — click or drag anywhere on it to jump around the song */}
      <div className="flex-1 min-w-0 px-2">
        <div
          ref={trackRef}
          onPointerDown={startScrub}
          onPointerMove={(e) => audioSrc && setHoverTime(timeAtClientX(e.clientX))}
          onPointerLeave={() => setHoverTime(null)}
          className="relative w-full select-none"
          style={{ height: 34, cursor: audioSrc ? "pointer" : "default", touchAction: "none" }}
          title={audioSrc ? "Click or drag to jump to a moment in the song" : undefined}
        >
          {/* Sections (or one plain bar when the song hasn't been analysed) */}
          <div className="absolute inset-0 rounded-md overflow-hidden flex" style={{ background: "#e0e7ef" }}>
            {sections && sections.length > 0 && duration > 0 ? (
              sections.map((sec, i) => (
                <div
                  key={i}
                  className="h-full flex items-center justify-center text-xs font-medium capitalize overflow-hidden"
                  style={{
                    width: `${((sec.endTime - sec.startTime) / duration) * 100}%`,
                    background: SECTION_COLORS[sec.label] ?? "#e5e7eb",
                    color: "#1e293b",
                    borderRight: i < sections.length - 1 ? "1px solid rgba(255,255,255,0.7)" : undefined,
                  }}
                >
                  <span className="truncate px-1">{sec.label}</span>
                </div>
              ))
            ) : (
              <div className="flex-1 h-full flex items-center justify-center text-xs font-medium" style={{ color: "var(--ink-3)" }}>
                {duration > 0 ? "Full Song" : "No audio loaded"}
              </div>
            )}
          </div>

          {audioSrc && (
            <>
              {/* played-so-far shading */}
              <div
                className="absolute top-0 bottom-0 left-0 rounded-l-md pointer-events-none"
                style={{ width: `${progressPct}%`, background: "rgba(16,20,34,0.20)" }}
              />
              {/* playhead + grab handle */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: `${progressPct}%`, width: 2, background: "oklch(60% 0.18 25)", transform: "translateX(-1px)" }}
              />
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${progressPct}%`,
                  top: "50%",
                  width: scrubbing ? 16 : 12,
                  height: scrubbing ? 16 : 12,
                  transform: "translate(-50%, -50%)",
                  background: "oklch(60% 0.18 25)",
                  border: "2px solid #fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  transition: "width .1s, height .1s",
                }}
              />
              {/* hover time readout */}
              {hoverTime !== null && !scrubbing && (
                <div
                  className="absolute pointer-events-none text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    left: `${duration > 0 ? Math.max(0, Math.min(100, (hoverTime / duration) * 100)) : 0}%`,
                    bottom: "100%",
                    marginBottom: 4,
                    transform: "translateX(-50%)",
                    background: "rgba(16,20,34,0.9)",
                    color: "#fff",
                    fontSize: 10,
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmt(Math.max(0, Math.min(duration, hoverTime)))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Effect count + Edit Timeline link */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs" style={{ color: "var(--ink-4)" }}>
          {blockCount.toLocaleString()} lighting move{blockCount !== 1 ? "s" : ""}
        </span>
        <Link
          href={`/timeline?project=${projectId}`}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Edit Timeline
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ─── Fixture Kind Colors (module level) ───────────────────── */
// Already defined at top of file
