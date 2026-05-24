"use client";

import { Suspense, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";
import { validateFixtures } from "@/lib/exports/validation";

/* ── Helpers ────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide"
      style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}>
      {children}
    </div>
  );
}

type ExportType = "xlights" | "lor" | "video";

const EXPORT_TYPES: { id: ExportType; label: string; desc: string; badge?: string; iconColor: string }[] = [
  { id: "xlights", label: "xLights Show", desc: "Export sequence, effects, and models in xLights format.", badge: "Recommended", iconColor: "#1e3a5f" },
  { id: "lor", label: "Light-O-Rama Show", desc: "Export sequence and configuration for Light-O-Rama controllers.", iconColor: "#ea580c" },
  { id: "video", label: "Preview Video", desc: "Render a high-quality preview video of your show.", iconColor: "#7c3aed" },
];

/* ── Main content ───────────────────────────────────── */
function ExportsContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const storeProjectId = useEditorStore((s) => s.projectId);
  const loadProject = useEditorStore((s) => s.loadProject);
  const fixtures = useEditorStore((s) => s.fixtures);
  const audio = useEditorStore((s) => s.audio);
  const audioUrl = useEditorStore((s) => s.audioUrl);
  const name = useEditorStore((s) => s.name);

  const [step, setStep] = useState(1);
  const [exportType, setExportType] = useState<ExportType>("xlights");
  const [includeAssets, setIncludeAssets] = useState(true);
  const [compress, setCompress] = useState(false);

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
      .then((res) => { if (!res.ok) throw new Error("Failed to load"); return res.json(); })
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

  const validationIssues = useMemo(() => validateFixtures(fixtures), [fixtures]);
  const totalChannels = useMemo(() => fixtures.reduce((sum, f) => sum + f.pixelCount * 3, 0), [fixtures]);

  const handleNext = useCallback(() => { if (step < 4) setStep(step + 1); }, [step]);
  const handleBack = useCallback(() => { if (step > 1) setStep(step - 1); }, [step]);

  /* ── Empty states ──────────────────────────────── */
  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "#FFFFFF" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#f0f4f8", border: "1px solid var(--line)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>No project selected</p>
        <p className="text-xs" style={{ color: "var(--ink-4)" }}>Select a project to export your show.</p>
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

  const STEPS = [
    { num: 1, label: "Destination", sub: "Choose export type" },
    { num: 2, label: "Validation", sub: "Check & fix issues" },
    { num: 3, label: "Package", sub: "Build your package" },
    { num: 4, label: "Export", sub: "Download your files" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#FFFFFF" }}>
      {/* Page header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid var(--line)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>Exports</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>Package and deliver your show in 4 simple steps.</p>
        </div>
        <button onClick={() => setStep(1)} className="h-9 px-5 rounded-lg text-xs font-semibold"
          style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
          Start Export →
        </button>
      </div>

      {/* Wizard progress strip */}
      <div className="shrink-0 px-8 py-4" style={{ borderBottom: "1px solid var(--line)", background: "#fafafa" }}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: step >= s.num ? "#1e3a5f" : "#FFFFFF",
                    color: step >= s.num ? "#FFFFFF" : "var(--ink-4)",
                    border: step >= s.num ? "none" : "1.5px solid var(--line)",
                  }}>
                  {step > s.num ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : s.num}
                </div>
                <span className="text-xs font-medium mt-1.5" style={{ color: step >= s.num ? "var(--ink)" : "var(--ink-4)" }}>{s.label}</span>
                <span className="text-xs" style={{ color: "var(--ink-4)", fontSize: 9 }}>{s.sub}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-16 h-px mx-2 mt-[-20px]" style={{ background: step > s.num ? "#1e3a5f" : "var(--line)" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left — step content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--ink-4)", letterSpacing: "0.06em" }}>Step {step} of 4</div>

          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>Choose Destination</h2>
              <p className="text-xs mt-1 mb-5" style={{ color: "var(--ink-3)" }}>Select where you&#39;re exporting to and the type of output you need.</p>

              <SectionLabel>Export Type</SectionLabel>
              <p className="text-xs mb-3 mt-0.5" style={{ color: "var(--ink-4)" }}>Choose the best output for your workflow.</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {EXPORT_TYPES.map((et) => (
                  <button key={et.id} onClick={() => setExportType(et.id)}
                    className="flex flex-col p-4 rounded-xl text-left transition-all relative"
                    style={{
                      border: exportType === et.id ? "2px solid #3b82f6" : "1px solid var(--line)",
                      background: exportType === et.id ? "#f0f7ff" : "#FFFFFF",
                    }}>
                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ border: exportType === et.id ? "none" : "1.5px solid var(--line)", background: exportType === et.id ? "#3b82f6" : "transparent" }}>
                      {exportType === et.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${et.iconColor}15` }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={et.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {et.id === "xlights" && <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>}
                        {et.id === "lor" && <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>}
                        {et.id === "video" && <polygon points="5 3 19 12 5 21" />}
                      </svg>
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>{et.label}</p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>{et.desc}</p>
                    {et.badge && (
                      <span className="mt-2 inline-flex text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#dbeafe", color: "#1e40af", fontSize: 10 }}>{et.badge}</span>
                    )}
                  </button>
                ))}
              </div>

              <SectionLabel>Package Options</SectionLabel>
              <div className="flex flex-col gap-3 mt-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={includeAssets} onChange={(e) => setIncludeAssets(e.target.checked)} className="mt-0.5 accent-[#3b82f6]" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Include All Assets</p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>Include audio, images, custom models, and configuration files.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={compress} onChange={(e) => setCompress(e.target.checked)} className="mt-0.5 accent-[#3b82f6]" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Compress Package</p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>Create a compressed .zip file for easy sharing.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>Validation</h2>
              <p className="text-xs mt-1 mb-5" style={{ color: "var(--ink-3)" }}>We&#39;ll check your project for any issues before exporting.</p>

              {validationIssues.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#15803d" }}>All checks passed</p>
                    <p className="text-xs" style={{ color: "#16a34a" }}>Your project is ready to export with no issues.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {validationIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: issue.type === "error" ? "#fef2f2" : "#fffbeb", border: `1px solid ${issue.type === "error" ? "#fecaca" : "#fde68a"}` }}>
                      <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={issue.type === "error" ? "#dc2626" : "#d97706"} strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium" style={{ color: issue.type === "error" ? "#991b1b" : "#92400e" }}>{issue.message}</p>
                        {issue.details && <p className="text-xs mt-0.5" style={{ color: issue.type === "error" ? "#b91c1c" : "#a16207" }}>{issue.details}</p>}
                      </div>
                      <button className="text-xs font-medium px-2 py-1 rounded-md shrink-0"
                        style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}>
                        Auto-fix
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>Package</h2>
              <p className="text-xs mt-1 mb-5" style={{ color: "var(--ink-3)" }}>Building your export package...</p>
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#f0f4f8", border: "1px solid var(--line)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                  {exportType === "xlights" ? "xLights" : exportType === "lor" ? "Light-O-Rama" : "Preview Video"} package
                </p>
                <div className="w-48 h-2 rounded-full overflow-hidden" style={{ background: "#f0f0f0" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "#3b82f6" }} />
                </div>
                <p className="text-xs" style={{ color: "#16a34a" }}>Package ready</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>Export</h2>
              <p className="text-xs mt-1 mb-5" style={{ color: "var(--ink-3)" }}>Your package is ready to download.</p>
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Export Complete</p>
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {name || "Christmas 2026"} · {exportType === "xlights" ? ".xsq" : exportType === "lor" ? ".lms" : ".webm"} format
                </p>
                <button className="h-10 px-6 rounded-lg text-sm font-semibold flex items-center gap-2"
                  style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Package
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right rail — Export Summary */}
        <div className="shrink-0 overflow-y-auto" style={{ width: 300, borderLeft: "1px solid var(--line)" }}>
          <div className="p-5 flex flex-col gap-5">
            <div>
              <SectionLabel>Export Summary</SectionLabel>
              <div className="mt-3 rounded-xl overflow-hidden" style={{ height: 140, background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)", position: "relative" }}>
                <div className="absolute inset-0 flex items-end p-3">
                  <div>
                    <p className="text-white text-sm font-semibold">{name || "Christmas 2026"}</p>
                    <p className="text-white text-xs opacity-70">Roofline + Mega Tree + Bushes</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <SummaryRow label="Show Duration" value={audio ? `${Math.floor(audio.duration / 60)}:${String(Math.floor(audio.duration % 60)).padStart(2, "0")}` : "—"} />
                <SummaryRow label="Sequence" value={`${totalChannels.toLocaleString()} Channels`} />
                <SummaryRow label="Controllers" value="1 Controller" />
                <SummaryRow label="Props" value={String(fixtures.length)} />
                <SummaryRow label="Audio" value={audioUrl ? "1 Track" : "None"} />
              </div>
              <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
                style={{ background: validationIssues.length === 0 ? "#f0fdf4" : "#fef2f2", color: validationIssues.length === 0 ? "#15803d" : "#991b1b" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {validationIssues.length === 0 ? <polyline points="20 6 9 17 4 12" /> : <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>}
                </svg>
                <span className="text-xs font-medium">{validationIssues.length === 0 ? "No blocking issues" : `${validationIssues.length} issue${validationIssues.length !== 1 ? "s" : ""}`}</span>
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>Last Preflight</span>
                  <Link href={`/preflight?project=${projectId}`} className="text-xs font-medium flex items-center gap-1" style={{ color: "#3b82f6", textDecoration: "none" }}>
                    View Report <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </Link>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>All checks passed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 flex items-center justify-between px-8 py-3" style={{ borderTop: "1px solid var(--line)", background: "#fafafa" }}>
        <button onClick={() => setStep(1)} className="h-8 px-4 rounded-lg text-xs font-medium"
          style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>
          Cancel Export
        </button>
        <div className="flex gap-2">
          {step > 1 && (
            <button onClick={handleBack} className="h-8 px-4 rounded-lg text-xs font-medium"
              style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={handleNext} className="h-8 px-5 rounded-lg text-xs font-semibold"
              style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
              Continue →
            </button>
          ) : (
            <button className="h-8 px-5 rounded-lg text-xs font-semibold"
              style={{ background: "#16a34a", color: "#FFFFFF" }}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1" style={{ borderBottom: "1px solid #f5f5f5" }}>
      <span className="text-xs" style={{ color: "var(--ink-3)" }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

/* ── Page wrapper ───────────────────────────────────── */
export default function ExportsPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center" style={{ background: "#FFFFFF" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
      </div>
    }>
      <ExportsContent />
    </Suspense>
  );
}
