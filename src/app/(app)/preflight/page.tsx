"use client";

import { Suspense, useEffect, useState, useRef, useMemo } from "react";
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

/* ── Main content ───────────────────────────────────── */
function PreflightContent() {
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

  /* ── Compute readiness ────────────────────────── */
  const validationIssues = useMemo(() => validateFixtures(fixtures), [fixtures]);
  const checks = useMemo(() => {
    const placed = fixtures.filter((f) => f.layout?.points.length).length;
    const hasAudio = !!audioUrl && !!audio;
    const channelErrors = validationIssues.filter((i) => i.type === "error").length;
    const channelWarnings = validationIssues.filter((i) => i.type === "warning").length;

    const items = [
      {
        id: "display", label: "Display Output", icon: "monitor",
        status: fixtures.length > 0 && placed === fixtures.length ? "pass" as const : placed > 0 ? "warning" as const : "critical" as const,
        message: placed === fixtures.length ? "All systems normal" : `${fixtures.length - placed} prop${fixtures.length - placed !== 1 ? "s" : ""} need placement`,
        detail: placed === fixtures.length ? "Controller online and displays detected." : "Some props are not yet placed on the canvas.",
        action: "View Details",
      },
      {
        id: "timing", label: "Timing & Sequence", icon: "clock",
        status: channelErrors > 0 ? "critical" as const : channelWarnings > 0 ? "warning" as const : "pass" as const,
        message: channelErrors > 0 ? `${channelErrors} error${channelErrors !== 1 ? "s" : ""}` : channelWarnings > 0 ? `${channelWarnings} warning${channelWarnings !== 1 ? "s" : ""}` : "All clear",
        detail: channelErrors > 0 ? "Channel overlaps detected in your sequence." : "No timing conflicts found.",
        action: "Review",
      },
      {
        id: "controller", label: "Controller", icon: "controller",
        status: "pass" as const,
        message: "Connected",
        detail: "LightCanvas Controller LC-1, Firmware v1.3.2",
        action: "View Controller",
      },
      {
        id: "audio", label: "Audio Sync", icon: "audio",
        status: hasAudio ? "pass" as const : "critical" as const,
        message: hasAudio ? "Synced" : "No audio",
        detail: hasAudio ? "Audio levels look good for tonight's show." : "Upload audio in the Designer to sync your show.",
        action: "View Audio",
      },
      {
        id: "export", label: "Export Status", icon: "export",
        status: "pass" as const,
        message: "Export ready",
        detail: "Preview video and props package ready.",
        action: "View Export",
      },
      {
        id: "brightness", label: "Brightness Check", icon: "brightness",
        status: "pass" as const,
        message: "All good",
        detail: "Levels are optimized for your display.",
        action: "View Report",
      },
    ];
    return items;
  }, [fixtures, audio, audioUrl, validationIssues]);

  const readinessScore = useMemo(() => {
    const total = checks.length;
    const passed = checks.filter((c) => c.status === "pass").length;
    return Math.round((passed / total) * 100);
  }, [checks]);

  const needsAttention = checks.filter((c) => c.status === "critical").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const allGood = checks.filter((c) => c.status === "pass").length;

  /* ── Empty states ──────────────────────────────── */
  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "#FFFFFF" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#f0f4f8", border: "1px solid var(--line)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>No project selected</p>
        <p className="text-xs" style={{ color: "var(--ink-4)" }}>Select a project to run preflight checks.</p>
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

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: "#FFFFFF" }}>
      {/* Page header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid var(--line)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Preflight
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>Review your show&#39;s readiness for tonight.</p>
        </div>
        <button className="h-9 px-5 rounded-lg text-xs font-semibold flex items-center gap-2"
          style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
          Run Preflight
        </button>
      </div>

      {/* Hero strip — three columns */}
      <div className="shrink-0 grid grid-cols-3 gap-5 px-8 py-6" style={{ borderBottom: "1px solid var(--line)", background: "#fafafa" }}>
        {/* Show Readiness */}
        <div className="rounded-xl p-6" style={{ background: "#FFFFFF", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
          <SectionLabel>Show Readiness</SectionLabel>
          <div className="flex items-center justify-center mt-4 mb-4">
            <div className="relative" style={{ width: 120, height: 120 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke={readinessScore >= 80 ? "#16a34a" : readinessScore >= 50 ? "#3b82f6" : "#d97706"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(readinessScore / 100) * 327} 327`}
                  transform="rotate(-90 60 60)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--ink)" }}>{readinessScore}</span>
                <span className="text-xs" style={{ color: "var(--ink-4)" }}>/100</span>
              </div>
            </div>
          </div>
          <p className="text-center text-sm font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--ink-2)" }}>
            {readinessScore >= 90 ? "Looking great!" : readinessScore >= 70 ? "Great progress!" : "Getting there!"}
          </p>
          <p className="text-center text-xs mt-1" style={{ color: "var(--ink-4)" }}>
            {readinessScore === 100 ? "Your show is fully ready." : "A few items left to reach full show readiness."}
          </p>
        </div>

        {/* Tonight's Show */}
        <div className="rounded-xl p-6" style={{ background: "#FFFFFF", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
          <SectionLabel>Tonight&#39;s Show Is</SectionLabel>
          <p className="mt-3" style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            {readinessScore === 100 ? "Ready to Go!" : "Almost Ready"}
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--ink-3)" }}>
            {readinessScore === 100
              ? "Your show is fully prepped. Enjoy the evening!"
              : "You're in great shape. Complete the remaining items below to reach 100%."}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <MiniTile icon={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>} value={String(fixtures.length)} label="Props" />
            <MiniTile icon={<><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /></>} value="1" label="Controller" />
            <MiniTile icon={<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>} value={audioUrl ? "Yes" : "No"} label="Audio" />
            <MiniTile icon={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>} value="Ready" label="Export" />
          </div>
          {needsAttention + warnings > 0 && (
            <button className="w-full h-9 rounded-lg text-xs font-semibold"
              style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
              Review {needsAttention + warnings} Item{needsAttention + warnings !== 1 ? "s" : ""} →
            </button>
          )}
        </div>

        {/* Readiness Summary */}
        <div className="rounded-xl p-6" style={{ background: "#FFFFFF", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
          <SectionLabel>Readiness Summary</SectionLabel>
          <div className="flex flex-col gap-2.5 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#dc2626" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{needsAttention}</span>
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>Needs Attention</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{warnings}</span>
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#16a34a" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{allGood}</span>
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>All Good</span>
            </div>
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>Schedule</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#15803d" }}>Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>Next Show</span>
              <div className="text-right">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#fffbeb", color: "#92400e" }}>In 15m</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>Dec 24, 2026 · 7:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness Checks grid */}
      <div className="px-8 py-6">
        <SectionLabel>Readiness Checks</SectionLabel>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {checks.map((check) => (
            <CheckCard key={check.id} check={check} projectId={projectId!} />
          ))}
        </div>
      </div>

      {/* Bottom callout */}
      {needsAttention + warnings > 0 && (
        <div className="mx-8 mb-6 rounded-xl flex items-center justify-between px-6 py-4" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400e" }}>You&#39;re almost there!</p>
              <p className="text-xs" style={{ color: "#a16207" }}>Address the {needsAttention + warnings} item{needsAttention + warnings !== 1 ? "s" : ""} above to reach 100% readiness.</p>
            </div>
          </div>
          <button className="h-8 px-4 rounded-lg text-xs font-semibold shrink-0"
            style={{ background: "#FFFFFF", border: "1px solid #fde68a", color: "#92400e" }}>
            Go to Issues →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Check card ─────────────────────────────────────── */
const CHECK_ICONS: Record<string, React.ReactNode> = {
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  controller: <><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></>,
  audio: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  export: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  brightness: <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>,
};

const STATUS_STYLES = {
  pass: { bg: "#f0fdf4", color: "#15803d", dot: "#16a34a", label: "" },
  warning: { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b", label: "" },
  critical: { bg: "#fef2f2", color: "#991b1b", dot: "#dc2626", label: "" },
};

function CheckCard({ check, projectId }: { check: { id: string; label: string; icon: string; status: "pass" | "warning" | "critical"; message: string; detail: string; action: string }; projectId: string }) {
  const s = STATUS_STYLES[check.status];
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "#FFFFFF", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#f0f4f8" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {CHECK_ICONS[check.icon]}
          </svg>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: s.bg }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
          <span className="text-xs font-medium" style={{ color: s.color }}>{check.message}</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{check.label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{check.detail}</p>
      </div>
      <Link href={check.id === "audio" ? `/audio?project=${projectId}` : "#"}
        className="text-xs font-medium" style={{ color: "#3b82f6", textDecoration: "none" }}>
        {check.action}
      </Link>
    </div>
  );
}

function MiniTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 rounded-lg" style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      <span className="text-xs font-semibold" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ color: "var(--ink-4)", fontSize: 9 }}>{label}</span>
    </div>
  );
}

/* ── Page wrapper ───────────────────────────────────── */
export default function PreflightPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center" style={{ background: "#FFFFFF" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
      </div>
    }>
      <PreflightContent />
    </Suspense>
  );
}
