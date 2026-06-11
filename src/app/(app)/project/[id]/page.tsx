"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import AudioUpload from "@/components/AudioUpload";
import PreviewPanel from "@/components/PreviewPanel";
import AIPanel from "@/components/AIPanel";
import ExportDialog from "@/components/ExportDialog";
import { useEditorStore } from "@/lib/store/editor-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";
import type { AudioAnalysis } from "@/lib/audio/types";
import MobileGate from "@/components/MobileGate";
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
  roofline: "Rooflines",
  "window-outline": "Windows",
  "mega-tree": "Trees",
  "mini-tree": "Trees",
  bush: "Landscape",
  arch: "Other",
  matrix: "Other",
  custom: "Other",
};

function groupFixturesByCategory(fixtures: Fixture[]) {
  const order = ["Rooflines", "Windows", "Trees", "Landscape", "Other"];
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
        <Link href="/dashboard" className="text-sm px-4 py-2 rounded-md" style={{ background: "var(--accent)", color: "#fff" }}>
          Back to Dashboard
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
      <MobileGate />

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
            Main Sequence Editor
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-4)" }}>
            Design, map, and perfect your show — one prop at a time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--ink-4)" }}>
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Unsaved" : ""}
          </span>
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
                className="text-xs font-semibold mb-2"
                style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}
              >
                Props
              </p>
              <div
                className="flex items-center gap-2 h-7 px-2.5 rounded-md text-xs"
                style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-4)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search props...</span>
              </div>
            </div>

            {/* All props count */}
            <div className="px-3.5 pb-1">
              <p className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
                ALL PROPS <span className="inline-flex items-center justify-center px-1.5 rounded-full text-xs" style={{ background: "var(--panel)", color: "var(--ink-4)", fontSize: 10, minWidth: 18, height: 16 }}>{fixtures.length}</span>
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
                  AI Actions
                </p>
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
        Layout Summary
      </p>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--ink-3)" }}>Total props</span>
          <span className="font-medium">{fixtureCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--ink-3)" }}>Channels used</span>
          <span className="font-medium">{totalChannels.toLocaleString()}</span>
        </div>
        <div className="mt-6 rounded-xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <p className="text-xs text-center" style={{ color: "var(--ink-4)" }}>
            Select a prop to edit details
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Fixture Inspector (prop selected) ────────────────────── */
function FixtureInspector({ fixture, totalChannels }: { fixture: Fixture; totalChannels: number }) {
  const _fixtureChannels = fixture.pixelCount * 3;
  const maxChannels = 2000;
  const usagePct = Math.min(100, Math.round((totalChannels / maxChannels) * 100));

  return (
    <div className="p-4">
      {/* Fixture header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: FIXTURE_KIND_COLORS[fixture.kind] ?? "#6b7280" }}
        />
        <span className="text-sm font-semibold flex-1">{fixture.name}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--ink-4)" }}>Enabled</span>
          <div
            className="w-7 h-4 rounded-full relative"
            style={{ background: "var(--accent)", cursor: "default" }}
          >
            <div
              className="w-3 h-3 rounded-full absolute top-0.5"
              style={{ background: "#fff", right: 2 }}
            />
          </div>
        </div>
      </div>

      {/* Properties */}
      <p
        className="text-xs font-semibold mb-2"
        style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}
      >
        Properties
      </p>
      <div className="space-y-2 mb-4">
        <InspectorField label="Pixel Count" value={String(fixture.pixelCount)} />
        <InspectorField label="Universe" value={String(fixture.universe ?? 1)} />
        <InspectorField label="Start Channel" value={String(fixture.startChannel)} />
        <InspectorField label="Direction" value={fixture.direction === "rtl" ? "Right to Left" : "Left to Right"} />
      </div>

      {/* Mapping status */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-xs font-medium" style={{ color: "#15803d" }}>Mapping valid</span>
      </div>

      {/* Channel usage */}
      <p
        className="text-xs font-semibold mb-2"
        style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}
      >
        Channel Usage
      </p>
      <p className="text-xs mb-1.5" style={{ color: "var(--ink-3)" }}>
        {totalChannels.toLocaleString()} / {maxChannels.toLocaleString()} channels — {usagePct}%
      </p>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${usagePct}%`, background: "var(--accent)" }}
        />
      </div>
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

  return (
    <div
      className="flex items-center gap-4 px-4 shrink-0"
      style={{ height: 72, borderTop: "1px solid var(--line)", background: "#FFFFFF" }}
    >
      {/* Play button + time */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
        <div className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>
          0:00 / {durationStr}
        </div>
      </div>

      {/* Section blocks */}
      <div className="flex-1 flex items-center gap-1 min-w-0 px-2">
        {sections && sections.length > 0 ? (
          sections.map((sec, i) => {
            const widthPct = duration > 0 ? ((sec.endTime - sec.startTime) / duration) * 100 : 0;
            return (
              <div
                key={i}
                className="h-8 rounded-md flex items-center justify-center text-xs font-medium capitalize"
                style={{
                  width: `${widthPct}%`,
                  minWidth: 40,
                  background: SECTION_COLORS[sec.label] ?? "#e5e7eb",
                  color: "#1e293b",
                }}
              >
                {sec.label}
              </div>
            );
          })
        ) : (
          <div
            className="flex-1 h-8 rounded-md flex items-center justify-center text-xs font-medium"
            style={{ background: "#e0e7ef", color: "var(--ink-3)" }}
          >
            {duration > 0 ? "Full Song" : "No audio loaded"}
          </div>
        )}
      </div>

      {/* Effect count + Edit Timeline link */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs" style={{ color: "var(--ink-4)" }}>
          {blockCount} effect{blockCount !== 1 ? "s" : ""}
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
