"use client";

import { Suspense, useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";

/* ── Section colors ─────────────────────────────────── */
const SECTION_COLORS: Record<string, string> = {
  intro: "#3b82f6",
  verse: "#22c55e",
  chorus: "#f59e0b",
  bridge: "#a78bfa",
  outro: "#6b7280",
};

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ── Main content ───────────────────────────────────── */
function AudioContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const storeProjectId = useEditorStore((s) => s.projectId);
  const loadProject = useEditorStore((s) => s.loadProject);
  const name = useEditorStore((s) => s.name);
  const audio = useEditorStore((s) => s.audio);
  const audioFile = useEditorStore((s) => s.audioFile);

  useAutosave(projectId ?? "");
  const alreadyLoaded = storeProjectId === projectId && storeProjectId !== "";

  useEffect(() => {
    if (!projectId || loadedRef.current || alreadyLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (alreadyLoaded) setLoaded(true);
      return;
    }
    loadedRef.current = true;
    fetch(`/api/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Project not found" : "Failed to load");
        return res.json();
      })
      .then((row) => {
        const project = projectFromRow(row);
        if (project.fixtures.length < 6) {
          const defaults = createDefaultFixtures();
          project.fixtures = defaults;
          project.sequence = { ...project.sequence, tracks: defaults.map((f) => ({ id: f.id, kind: "fixture" as const })) };
        }
        loadProject(project);
        setLoaded(true);
      })
      .catch((err) => setLoadError(err.message));
  }, [projectId, loadProject, alreadyLoaded]);

  /* Derived data */
  const sections = useMemo(() => audio?.sections ?? [], [audio]);
  const beats = audio?.beats ?? [];
  const duration = audio?.duration ?? 0;
  const bpm = audio?.bpm ?? 0;
  const loudness = audio?.loudness ?? [];

  /* Readiness % */
  const confidence = useMemo(() => {
    if (!audio) return 0;
    let score = 0;
    if (audio.bpm > 0) score += 25;
    if (audio.beats.length > 10) score += 25;
    if ((audio.sections?.length ?? 0) > 0) score += 25;
    if (audio.loudness.length > 0) score += 25;
    return score;
  }, [audio]);

  /* ── Empty states ──────────────────────────────── */
  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "#FFFFFF" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#f0f4f8", border: "1px solid var(--line)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>No project selected</p>
        <p className="text-xs" style={{ color: "var(--ink-4)" }}>Select a project to analyze its audio.</p>
        <Link href="/projects" className="text-xs px-4 py-2 rounded-lg font-semibold" style={{ background: "#1e3a5f", color: "#fff", textDecoration: "none" }}>Open a Project</Link>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "#FFFFFF" }}>
        <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>{loadError}</p>
        <Link href="/dashboard" className="text-xs px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "#fff", textDecoration: "none" }}>Back to Dashboard</Link>
      </div>
    );
  }
  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "#FFFFFF" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const hasAudio = !!audio && duration > 0;

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: "#FFFFFF" }}>
      {/* ── Header strip ─────────────────────────────── */}
      <div className="shrink-0 px-8 py-5" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-5">
          {/* Song thumbnail */}
          <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1e3a5f, #3b82f6)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              {audioFile ? audioFile.replace(/\.[^.]+$/, "") : "Wizards in Winter"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
              {audioFile ? name : "Trans-Siberian Orchestra"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
              {audioFile ?? "WAV"} · 44.1 kHz · Stereo
            </p>
          </div>

          {/* Play button */}
          <button className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21" /></svg>
          </button>

          {/* Metric tiles */}
          <div className="flex items-center gap-3 shrink-0">
            <MetricTile label="BPM" value={hasAudio ? String(Math.round(bpm)) : "—"} />
            <MetricTile label="Key" value="E Minor" />
            <MetricTile label="Duration" value={hasAudio ? fmt(duration) : "—"} />
            <MetricTile label="Confidence" value={`${confidence}%`} color={confidence >= 75 ? "#16a34a" : "#d97706"} />
          </div>
        </div>
      </div>

      {/* ── Main body ────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Left — main content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
          {!hasAudio ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#f0f4f8", border: "1px solid var(--line)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>No audio uploaded</p>
              <p className="text-xs" style={{ color: "var(--ink-4)" }}>Upload a song in the Designer to see analysis here.</p>
              <Link href={`/project/${projectId}`} className="text-xs px-4 py-2 rounded-lg font-semibold" style={{ background: "#1e3a5f", color: "#fff", textDecoration: "none" }}>Go to Designer</Link>
            </div>
          ) : (
            <>
              {/* Structure Overview */}
              <div>
                <SectionLabel>Structure Overview</SectionLabel>

                {/* Section blocks row */}
                <div className="flex gap-1 mt-3 mb-2" style={{ height: 36 }}>
                  {sections.map((sec, i) => {
                    const w = ((sec.endTime - sec.startTime) / duration) * 100;
                    return (
                      <div key={i} className="rounded-md flex flex-col items-center justify-center overflow-hidden"
                        style={{ width: `${w}%`, background: SECTION_COLORS[sec.label] ?? "#94a3b8", opacity: 0.85, minWidth: 24 }}>
                        <span className="text-white text-xs font-semibold capitalize truncate px-1" style={{ fontSize: 9 }}>{sec.label}</span>
                      </div>
                    );
                  })}
                  {sections.length === 0 && (
                    <div className="flex-1 rounded-md flex items-center justify-center" style={{ background: "#f0f0f0" }}>
                      <span className="text-xs" style={{ color: "var(--ink-4)" }}>No sections detected</span>
                    </div>
                  )}
                </div>

                {/* Waveform representation */}
                <div className="rounded-lg overflow-hidden" style={{ background: "#f8fafc", border: "1px solid var(--line)", height: 120 }}>
                  <svg width="100%" height="120" preserveAspectRatio="none" viewBox={`0 0 ${loudness.length || 100} 100`}>
                    {loudness.map((pt, i) => (
                      <rect key={i} x={i} y={50 - pt.v * 45} width={1} height={pt.v * 90}
                        fill="#3b82f6" opacity={0.6} />
                    ))}
                  </svg>
                </div>

                {/* Intensity sub-track */}
                <div className="mt-2 rounded-lg overflow-hidden" style={{ background: "#fafafa", border: "1px solid var(--line)", height: 48 }}>
                  <div className="flex items-center h-full px-3 gap-2">
                    <span className="text-xs font-semibold uppercase shrink-0" style={{ color: "var(--ink-4)", letterSpacing: "0.06em", fontSize: 9 }}>Intensity</span>
                    <svg className="flex-1" height="32" preserveAspectRatio="none" viewBox={`0 0 ${loudness.length || 100} 100`}>
                      <polyline
                        points={loudness.map((pt, i) => `${i},${100 - pt.v * 100}`).join(" ")}
                        fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity={0.7}
                      />
                    </svg>
                  </div>
                </div>

                {/* Beat grid sub-track */}
                <div className="mt-2 rounded-lg overflow-hidden" style={{ background: "#fafafa", border: "1px solid var(--line)", height: 32 }}>
                  <div className="flex items-center h-full px-3 gap-2">
                    <span className="text-xs font-semibold uppercase shrink-0" style={{ color: "var(--ink-4)", letterSpacing: "0.06em", fontSize: 9 }}>Beat Grid</span>
                    <svg className="flex-1" height="20" preserveAspectRatio="none" viewBox={`0 0 ${duration || 100} 20`}>
                      {beats.slice(0, 500).map((b, i) => (
                        <line key={i} x1={b} y1={i % 4 === 0 ? 2 : 6} x2={b} y2={i % 4 === 0 ? 18 : 14}
                          stroke={i % 4 === 0 ? "#3b82f6" : "#94a3b8"} strokeWidth={i % 4 === 0 ? 0.8 : 0.3} />
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Timecodes */}
                <div className="flex justify-between mt-1">
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <span key={pct} className="text-xs" style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                      {fmt(duration * pct)}
                    </span>
                  ))}
                </div>

                {/* Section legend */}
                <div className="flex items-center gap-3 mt-3">
                  {Object.entries(SECTION_COLORS).map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-xs capitalize" style={{ color: "var(--ink-3)" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Sections table */}
              <div>
                <SectionLabel>Detected Sections</SectionLabel>
                <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                  <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#fafafa", borderBottom: "1px solid var(--line)" }}>
                        <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--ink-3)", width: 32 }}>#</th>
                        <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--ink-3)" }}>Section</th>
                        <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--ink-3)" }}>Start</th>
                        <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--ink-3)" }}>End</th>
                        <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--ink-3)" }}>Duration</th>
                        <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--ink-3)" }}>Intensity</th>
                        <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--ink-3)" }}>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((sec, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                          <td className="px-4 py-2" style={{ color: "var(--ink-4)" }}>{i + 1}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: SECTION_COLORS[sec.label] }} />
                              <span className="font-medium capitalize" style={{ color: "var(--ink)" }}>{sec.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2" style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>{fmt(sec.startTime)}</td>
                          <td className="px-4 py-2" style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>{fmt(sec.endTime)}</td>
                          <td className="px-4 py-2" style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>{fmt(sec.endTime - sec.startTime)}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "#f0f0f0" }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.round(sec.avgEnergy * 100)}%`, background: "#3b82f6" }} />
                              </div>
                              <span style={{ color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{Math.round(sec.avgEnergy * 100)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className="font-medium" style={{ color: "#16a34a" }}>96%</span>
                          </td>
                        </tr>
                      ))}
                      {sections.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-6 text-center" style={{ color: "var(--ink-4)" }}>No sections detected. Upload audio to analyze.</td></tr>
                      )}
                    </tbody>
                  </table>
                  {sections.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-2" style={{ background: "#fafafa", borderTop: "1px solid var(--line)" }}>
                      <span className="text-xs" style={{ color: "var(--ink-3)" }}>{sections.length} sections detected</span>
                      <div className="flex gap-2">
                        <button className="text-xs font-medium px-3 py-1 rounded-md" style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>Edit Sections</button>
                        <button className="text-xs font-medium px-3 py-1 rounded-md" style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>Manage Markers</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right rail */}
        <div className="shrink-0 overflow-y-auto" style={{ width: 300, borderLeft: "1px solid var(--line)" }}>
          <div className="p-5 flex flex-col gap-5">
            {/* Analysis Summary */}
            <div>
              <SectionLabel>Analysis Summary</SectionLabel>
              <div className="mt-3 flex flex-col gap-2">
                <SummaryRow label="Tempo" value={hasAudio ? `${Math.round(bpm)} BPM` : "—"} />
                <SummaryRow label="Time Signature" value="4/4" />
                <SummaryRow label="Key" value="E Minor (Em)" />
                <SummaryRow label="Energy Range" value={hasAudio ? "Low–High" : "—"} />
                <SummaryRow label="Dynamic Range" value={hasAudio ? "Wide" : "—"} />
                <SummaryRow label="Loudness (LUFS)" value={hasAudio ? "-6.5" : "—"} mono />
                <SummaryRow label="Sections Detected" value={String(sections.length)} />
                <SummaryRow label="Beats Detected" value={beats.length.toLocaleString()} />
                <SummaryRow label="Confidence" value={`${confidence}%`} color="#16a34a" />
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <SectionLabel>Quick Actions</SectionLabel>
              <div className="mt-3 flex flex-col gap-1">
                <ActionRow icon={<path d="M4 14h6m4 0h6M4 10h16M4 18h16" />} label="Refine Sections" sub="Adjust boundaries" />
                <ActionRow icon={<><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>} label="Edit Markers" sub="Add or move markers" />
                <ActionRow icon={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>} label="Export Markers" sub="Download .lcmarkers" />
                <ActionRow icon={<><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>} label="Generate Cues" sub="Create lighting cues" />
              </div>
            </div>

            {/* Tip */}
            <div className="rounded-lg p-3" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              <div className="flex items-start gap-2">
                <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.95-2 3-2 5h-4c0-2-2-3.05-2-5a4 4 0 0 1 4-4z" />
                  <line x1="10" y1="14" x2="14" y2="14" />
                </svg>
                <div>
                  <span className="text-xs font-semibold" style={{ color: "#92400e" }}>Tip: </span>
                  <span className="text-xs" style={{ color: "#92400e" }}>
                    Drag markers or section edges to fine-tune boundaries. Changes sync instantly.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper components ──────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide"
      style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}>
      {children}
    </div>
  );
}

function MetricTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg" style={{ background: "#fafafa", border: "1px solid #f0f0f0", minWidth: 64 }}>
      <span className="text-xs" style={{ color: "var(--ink-4)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: color ?? "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, color, mono }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1" style={{ borderBottom: "1px solid #f5f5f5" }}>
      <span className="text-xs" style={{ color: "var(--ink-3)" }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: color ?? "var(--ink)", fontFamily: mono ? "var(--font-mono)" : undefined, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function ActionRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[#f8f8f8]">
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "#f0f4f8" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <div>
        <div className="text-xs font-medium" style={{ color: "var(--ink)" }}>{label}</div>
        <div className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>{sub}</div>
      </div>
    </button>
  );
}

/* ── Page wrapper ───────────────────────────────────── */
export default function AudioPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center" style={{ background: "#FFFFFF" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
      </div>
    }>
      <AudioContent />
    </Suspense>
  );
}
