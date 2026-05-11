"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  audio_file: string | null;
  fixtures: unknown[];
  parent_show_id: string | null;
  created_at: string;
  updated_at: string;
  house_custom_svg?: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => { setProjects(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const heroProject = projects[0]; // most recently updated (API sorts by updated_at desc)
  const fixtureCount = heroProject ? (heroProject.fixtures as unknown[])?.length || 0 : 0;

  // Count fixtures by category for Design Overview
  const fixtureCounts = { rooflines: 0, trees: 0, bushes: 0, accents: 0 };
  if (heroProject?.fixtures) {
    for (const f of heroProject.fixtures as Array<{ kind: string }>) {
      if (f.kind === "roofline") fixtureCounts.rooflines++;
      else if (f.kind === "mega-tree" || f.kind === "mini-tree") fixtureCounts.trees++;
      else if (f.kind === "bush") fixtureCounts.bushes++;
      else fixtureCounts.accents++;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        {/* Dark house silhouette */}
        <div className="mb-8 rounded-2xl overflow-hidden" style={{ width: 320, height: 200, background: "linear-gradient(180deg, #1a2440 0%, #0d1426 100%)", position: "relative" }}>
          {/* Unlit house outline */}
          <svg viewBox="0 0 320 200" width="320" height="200" style={{ opacity: 0.3 }}>
            <polygon points="160,30 40,100 280,100" fill="none" stroke="white" strokeWidth="1.5" />
            <rect x="50" y="100" width="220" height="90" fill="none" stroke="white" strokeWidth="1.5" />
            <rect x="90" y="115" width="30" height="30" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            <rect x="200" y="115" width="30" height="30" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            <rect x="145" y="140" width="30" height="50" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            {/* Subtle unlit dots */}
            {[80,110,140,170,200,230].map((x,i) => (
              <circle key={i} cx={x} cy={95} r="2" fill="white" opacity="0.15" />
            ))}
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>No shows yet</h2>
        <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>Create your first one in two minutes</p>
        <div className="flex gap-3">
          <Link href="/projects" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-semibold" style={{ background: "#2563eb", color: "#fff" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Start a new show
          </Link>
          <button className="h-10 px-5 rounded-lg text-sm font-medium" style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}>
            Try the demo song
          </button>
        </div>
      </div>
    );
  }

  // Main dashboard with hero project
  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          Welcome back, {user?.firstName || "there"}!
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          Let&apos;s make your home shine this holiday season.
        </p>
      </div>

      <div className="flex gap-6" style={{ alignItems: "flex-start" }}>
        {/* Left: primary content */}
        <div className="flex-1 min-w-0">
          {/* Hero project card */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--line)", boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 4px 14px rgba(0,0,0,.04)" }}>
            {/* Hero image */}
            <div className="relative" style={{ height: 280, background: "linear-gradient(180deg, #1a2440 0%, #0d1426 100%)" }}>
              {heroProject?.house_custom_svg ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroProject.house_custom_svg} alt="House" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </>
              ) : (
                /* SVG house fallback */
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 720 420" width="480" height="280" style={{ opacity: 0.15 }}>
                    <polygon points="340,108 170,200 510,200" fill="white" />
                    <rect x="180" y="200" width="320" height="120" fill="white" />
                    <polygon points="615,158 568,322 662,322" fill="white" />
                  </svg>
                </div>
              )}
              {/* Overlay gradient */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,.6) 100%)" }} />
              {/* Project info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(34,197,94,.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,.3)" }}>
                        Active
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                      {heroProject.name}
                    </h2>
                    <p className="text-sm text-white/60 mt-0.5">123 Holly Lane</p>
                  </div>
                  <Link href={`/project/${heroProject.id}`} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold" style={{ background: "#2563eb", color: "#fff" }}>
                    Continue Editing
                  </Link>
                </div>
              </div>
            </div>
            {/* Footer stats */}
            <div className="flex items-center gap-6 px-6 py-3" style={{ background: "#fafafa", borderTop: "1px solid var(--line)" }}>
              <FooterStat label="Design Style" value="Holiday Classic" />
              <FooterStat label="Last Edited" value={relativeDate(heroProject.updated_at)} />
              <FooterStat label="Segments" value={`${fixtureCount} props`} />
              <FooterStat label="Devices" value={`${Math.ceil(fixtureCount * 3 / 512)} universe${Math.ceil(fixtureCount * 3 / 512) !== 1 ? "s" : ""}`} />
            </div>
          </div>

          {/* Design Overview */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-3)", letterSpacing: "0.06em" }}>Design Overview</h3>
            <div className="grid grid-cols-4 gap-3">
              <OverviewTile label="Rooflines" count={fixtureCounts.rooflines} />
              <OverviewTile label="Trees" count={fixtureCounts.trees} />
              <OverviewTile label="Bushes" count={fixtureCounts.bushes} />
              <OverviewTile label="Accents" count={fixtureCounts.accents} />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="shrink-0" style={{ width: 300 }}>
          {/* Show Readiness */}
          <div className="rounded-2xl p-5 mb-4" style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
            <h3 className="text-sm font-semibold mb-4">Show Readiness</h3>
            <div className="flex items-center gap-4 mb-4">
              {/* Circular progress ring */}
              <div className="relative" style={{ width: 64, height: 64 }}>
                <svg viewBox="0 0 36 36" width="64" height="64">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--line)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="87, 100" strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>87</span>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                  Great progress! You&apos;re almost show ready.
                </p>
              </div>
            </div>
            {/* Checklist */}
            <div className="flex flex-col gap-2">
              <CheckItem label="Design" status="complete" />
              <CheckItem label="Layout" status="in-progress" />
              <CheckItem label="Preflight" status="pending" />
              <CheckItem label="Schedule" status="pending" />
            </div>
            <Link href="/preflight" className="text-xs font-medium mt-3 inline-block" style={{ color: "#2563eb" }}>
              View Readiness Details →
            </Link>
          </div>

          {/* Next Action */}
          <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
            <h3 className="text-sm font-semibold mb-3">Next Action</h3>
            <p className="text-xs mb-1 font-medium" style={{ color: "var(--ink)" }}>Run Preflight Check</p>
            <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
              Validate your design and catch issues before you go live.
            </p>
            <div className="flex gap-2">
              <Link href="/preflight" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold" style={{ background: "#2563eb", color: "#fff" }}>
                Run Preflight →
              </Link>
              <button className="h-8 px-3 rounded-lg text-xs font-medium" style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}>
                View Checklist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────── */

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--ink-4)", letterSpacing: "0.06em" }}>{label}</p>
      <p className="text-xs font-medium mt-0.5" style={{ color: "var(--ink)" }}>{value}</p>
    </div>
  );
}

function OverviewTile({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-xl p-3.5" style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>{label}</p>
      <p className="text-xl font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>{count}</p>
    </div>
  );
}

function CheckItem({ label, status }: { label: string; status: "complete" | "in-progress" | "pending" }) {
  const colors = {
    complete: { bg: "rgba(34,197,94,.1)", text: "#16a34a", dot: "#22c55e", label: "Complete" },
    "in-progress": { bg: "rgba(234,179,8,.1)", text: "#a16207", dot: "#eab308", label: "In progress" },
    pending: { bg: "rgba(148,163,184,.1)", text: "#64748b", dot: "#94a3b8", label: "Pending" },
  };
  const c = colors[status];
  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: "var(--ink)" }}>{label}</span>
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
        {c.label}
      </span>
    </div>
  );
}

function relativeDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}
