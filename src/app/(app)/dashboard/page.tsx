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
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const heroProject = projects[0];
  const fixtureCount = heroProject ? (heroProject.fixtures as unknown[])?.length || 0 : 0;

  const fixtureCounts = { rooflines: 0, trees: 0, bushes: 0, accents: 0, total: 0 };
  if (heroProject?.fixtures) {
    for (const f of heroProject.fixtures as Array<{ kind: string }>) {
      fixtureCounts.total++;
      if (f.kind === "roofline") fixtureCounts.rooflines++;
      else if (f.kind === "mega-tree" || f.kind === "mini-tree") fixtureCounts.trees++;
      else if (f.kind === "bush") fixtureCounts.bushes++;
      else fixtureCounts.accents++;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <div className="mb-8 rounded-2xl overflow-hidden" style={{ width: 400, height: 240, background: "linear-gradient(180deg, #1a2440 0%, #0d1426 100%)", position: "relative" }}>
          <Starfield />
          <svg viewBox="0 0 400 240" width="400" height="240" style={{ position: "relative", zIndex: 1 }}>
            <polygon points="200,40 60,120 340,120" fill="none" stroke="white" strokeWidth="1.2" opacity="0.25" />
            <rect x="70" y="120" width="260" height="100" fill="none" stroke="white" strokeWidth="1.2" opacity="0.25" />
            <rect x="120" y="135" width="28" height="28" fill="none" stroke="white" strokeWidth="0.8" opacity="0.2" />
            <rect x="252" y="135" width="28" height="28" fill="none" stroke="white" strokeWidth="0.8" opacity="0.2" />
            <rect x="183" y="170" width="34" height="50" fill="none" stroke="white" strokeWidth="0.8" opacity="0.2" />
            {[90,120,150,180,210,240,280,310].map((x, i) => (
              <circle key={i} cx={x} cy={115} r="2.5" fill="white" opacity="0.12" />
            ))}
          </svg>
        </div>
        <h2 className="text-3xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>No shows yet</h2>
        <p className="text-base mb-8" style={{ color: "var(--ink-3)" }}>Create your first one in two minutes</p>
        <div className="flex gap-3">
          <Link href="/projects" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold transition-colors" style={{ background: "#2563eb", color: "#fff" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Start a new show
          </Link>
          <button className="h-11 px-6 rounded-xl text-sm font-medium" style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}>
            Try the demo song
          </button>
        </div>
      </div>
    );
  }

  // ── Main dashboard ───────────────────────────────────
  const hasPhoto = !!heroProject?.house_custom_svg;

  return (
    <div style={{ padding: "40px 48px 56px" }}>
      {/* Welcome */}
      <div className="mb-10">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.1, color: "var(--ink)" }}>
          Welcome back, {user?.firstName || "there"}! 👋
        </h1>
        <p className="mt-2" style={{ fontSize: 17, color: "var(--ink-3)" }}>
          Let&apos;s make your home shine this holiday season.
        </p>
      </div>

      <div className="flex gap-8" style={{ alignItems: "flex-start" }}>
        {/* ── Left column ─────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Hero project card */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--line)", boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.02)" }}>
            <div className="relative" style={{ height: 400, background: "linear-gradient(180deg, #1a2440 0%, #0d1426 100%)" }}>
              {hasPhoto ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroProject.house_custom_svg} alt="House" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                  {/* Dusk/night overlay — deep navy top, warm amber glow bottom */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,20,40,.55) 0%, rgba(15,20,40,.35) 40%, rgba(30,25,15,.45) 70%, rgba(40,30,10,.65) 100%)" }} />
                  {/* Warm light glow vignette in lower third */}
                  <div className="absolute bottom-0 left-0 right-0 h-2/5" style={{ background: "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(255,180,50,.12), transparent 70%)" }} />
                  {/* Dynamic prop pills from real fixtures */}
                  {(() => {
                    const fixtures = (heroProject.fixtures as Array<{ kind: string; name: string }>) || [];
                    const byKind = new Map<string, string>();
                    for (const f of fixtures) {
                      if (!byKind.has(f.kind) && byKind.size < 3) byKind.set(f.kind, f.name);
                    }
                    const positions = [
                      { top: "22%", left: "30%" },
                      { top: "40%", left: "72%" },
                      { top: "68%", left: "25%" },
                    ];
                    let i = 0;
                    return Array.from(byKind.entries()).map(([kind, name]) => (
                      <PropPill key={kind} label={name} top={positions[i]?.top || "50%"} left={positions[i++]?.left || "50%"} />
                    ));
                  })()}
                </>
              ) : (
                <>
                  <Starfield />
                  {/* Warm amber glow suggesting "this is where your lit-up house will appear" */}
                  <div className="absolute bottom-0 left-0 right-0 h-2/5" style={{ background: "linear-gradient(180deg, transparent, rgba(255,180,50,.08))", zIndex: 1 }} />
                  {/* Upload prompt card */}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
                    <div className="rounded-xl px-10 py-8 text-center" style={{ background: "rgba(255,255,255,.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.12)" }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" className="mx-auto mb-3">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <p className="text-sm font-medium text-white/80 mb-1">See your home come alive</p>
                      <p className="text-xs text-white/40 mb-4">Upload a photo to start designing your show</p>
                      <Link href={`/project/${heroProject.id}/layout`} className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold" style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.2)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Upload Photo
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {/* Bottom overlay — always visible */}
              <div className="absolute bottom-0 left-0 right-0 p-7" style={{ zIndex: 3 }}>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mb-2" style={{ background: "rgba(34,197,94,.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,.3)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
                      Active
                    </span>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                      {heroProject.name}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,.5)" }}>123 Holly Lane</p>
                  </div>
                  <Link href={`/project/${heroProject.id}`} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-semibold shrink-0" style={{ background: "#2563eb", color: "#fff" }}>
                    Continue Editing
                  </Link>
                </div>
              </div>
            </div>
            {/* Footer stats */}
            <div className="flex items-center gap-8 px-7 py-4" style={{ background: "#fafafa", borderTop: "1px solid var(--line)" }}>
              <FooterStat label="Design Style" value="Holiday Classic" />
              <FooterStat label="Last Edited" value={relativeDate(heroProject.updated_at)} />
              <FooterStat label="Segments" value={`${fixtureCount} props`} />
              <FooterStat label="Devices" value={`${Math.max(1, Math.ceil(fixtureCount * 3 / 512))} universe${Math.max(1, Math.ceil(fixtureCount * 3 / 512)) !== 1 ? "s" : ""}`} />
            </div>
          </div>

          {/* Design Overview */}
          <div className="mt-8">
            <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--ink-3)", marginBottom: 16 }}>
              Design Overview
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <OverviewTile label="Rooflines" count={fixtureCounts.rooflines} total={fixtureCounts.total} color="#f59e0b" icon={<RooflineIcon />} />
              <OverviewTile label="Trees" count={fixtureCounts.trees} total={fixtureCounts.total} color="#22c55e" icon={<TreeIcon />} />
              <OverviewTile label="Bushes" count={fixtureCounts.bushes} total={fixtureCounts.total} color="#8b5cf6" icon={<BushIcon />} />
              <OverviewTile label="Accents" count={fixtureCounts.accents} total={fixtureCounts.total} color="#2563eb" icon={<AccentIcon />} />
            </div>
          </div>
        </div>

        {/* ── Right sidebar ────────────────────────────── */}
        <div className="shrink-0" style={{ width: 300 }}>
          {/* Show Readiness */}
          <div className="rounded-2xl p-6 mb-5" style={{ border: "1px solid var(--line)", background: "#fafafa", boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.02)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--ink-3)", marginBottom: 20 }}>
              Show Readiness
            </h3>
            <div className="flex items-center gap-5 mb-5">
              <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
                <svg viewBox="0 0 36 36" width="96" height="96">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--line)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#2563eb" strokeWidth="3.5" strokeDasharray="87 100" strokeLinecap="round" transform="rotate(-90 18 18)" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--ink)" }}>87</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
                Great progress! You&apos;re almost show ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <CheckRow label="Design" status="complete" />
              <CheckRow label="Layout" status="in-progress" />
              <CheckRow label="Preflight" status="pending" />
              <CheckRow label="Schedule" status="pending" />
            </div>
            <Link href="/preflight" className="text-xs font-medium" style={{ color: "#2563eb" }}>
              View Readiness Details →
            </Link>
          </div>

          {/* Next Action */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--line)", background: "#fafafa", boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.02)" }}>
            <div className="px-5 py-3" style={{ background: "oklch(96% 0.04 250)", borderBottom: "1px solid oklch(90% 0.06 250)" }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                  <line x1="9" y1="21" x2="15" y2="21" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: "#1e3a5f" }}>Next Action</span>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--ink)" }}>Run Preflight Check</p>
              <p className="text-xs mb-5" style={{ color: "var(--ink-3)" }}>
                Validate your design and catch issues before you go live.
              </p>
              <div className="flex gap-2">
                <Link href="/preflight" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold" style={{ background: "#2563eb", color: "#fff" }}>
                  Run Preflight →
                </Link>
                <button className="h-9 px-4 rounded-xl text-xs font-medium" style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}>
                  View Checklist
                </button>
              </div>
            </div>
          </div>

          <AISuggestionsCard />
        </div>
      </div>
    </div>
  );
}

/* ─── AI Suggestions card ────────────────────────────── */
function AISuggestionsCard() {
  return (
    <div className="rounded-2xl overflow-hidden mt-5" style={{ border: "1px solid var(--line)", background: "#fafafa", boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.02)" }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--line)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--ink-3)" }}>AI Suggestions</span>
      </div>
      <div className="p-5">
        {/* Featured suggestion */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "oklch(97% 0.04 85)", border: "1px solid oklch(90% 0.06 85)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#92400e" }}>Enhance Your Chorus</p>
          <p className="text-xs mb-3" style={{ color: "var(--ink-3)" }}>
            Add chase effects to the roofline during the chorus for more energy. Lumi detected 4 high-energy sections.
          </p>
          <button className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold" style={{ background: "#eab308", color: "#fff" }}>
            Apply Suggestion
          </button>
        </div>

        {/* Smaller suggestions */}
        <div className="flex flex-col gap-2.5">
          <SuggestionRow icon="balance" text="Balance roofline brightness across all segments" />
          <SuggestionRow icon="extend" text="Consider extending the outro by 30 seconds" />
          <SuggestionRow icon="check" text="Nice! Your transitions are smooth" />
        </div>

        <Link href="/ai-studio" className="text-xs font-medium mt-4 inline-block" style={{ color: "#2563eb" }}>
          View all suggestions →
        </Link>
      </div>
    </div>
  );
}

function SuggestionRow({ icon, text }: { icon: string; text: string }) {
  const iconColor = icon === "check" ? "#22c55e" : icon === "balance" ? "#2563eb" : "#f59e0b";
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${iconColor}15` }}>
        {icon === "check" ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
        ) : icon === "balance" ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--ink-2)", lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

/* ─── Starfield background ────────────────────────────── */
function Starfield() {
  const stars = [
    { x: 8, y: 12 }, { x: 22, y: 8 }, { x: 35, y: 18 }, { x: 48, y: 6 },
    { x: 62, y: 14 }, { x: 75, y: 22 }, { x: 88, y: 10 }, { x: 15, y: 28 },
    { x: 42, y: 32 }, { x: 68, y: 26 }, { x: 92, y: 30 }, { x: 28, y: 42 },
    { x: 55, y: 38 }, { x: 80, y: 44 }, { x: 5, y: 50 }, { x: 38, y: 55 },
    { x: 65, y: 48 }, { x: 95, y: 52 }, { x: 18, y: 65 }, { x: 50, y: 60 },
  ];
  return (
    <div className="absolute inset-0" style={{ zIndex: 1 }}>
      {stars.map((s, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: `${s.x}%`, top: `${s.y}%`, width: i % 3 === 0 ? 2 : 1.5, height: i % 3 === 0 ? 2 : 1.5,
          background: "#fff", opacity: 0.15 + (i % 4) * 0.08,
        }} />
      ))}
    </div>
  );
}

/* ─── Prop label pill (overlay on photo) ──────────────── */
function PropPill({ label, top, left }: { label: string; top: string; left: string }) {
  return (
    <div className="absolute flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{
      top, left, zIndex: 4,
      background: "rgba(0,0,0,.45)", backdropFilter: "blur(8px)",
      color: "rgba(255,255,255,.9)", border: "1px solid rgba(255,255,255,.15)",
    }}>
      <span className="w-2 h-2 rounded-full" style={{ background: "#60a5fa", boxShadow: "0 0 6px #60a5fa" }} />
      {label}
    </div>
  );
}

/* ─── Footer stat ─────────────────────────────────────── */
function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--ink-4)" }}>{label}</p>
      <p className="font-medium mt-0.5" style={{ fontSize: 13, color: "var(--ink)" }}>{value}</p>
    </div>
  );
}

/* ─── Overview tile ───────────────────────────────────── */
function OverviewTile({ label, count, total, color, icon }: { label: string; count: number; total: number; color: string; icon: React.ReactNode }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-2xl p-5 transition-shadow hover:shadow-md" style={{ border: "1px solid var(--line)", background: "#fafafa", boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.02)" }}>
      <div className="mb-3" style={{ color }}>{icon}</div>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 500, lineHeight: 1, color: "var(--ink)", letterSpacing: "-0.02em" }}>{pct}%</p>
      <div className="mt-3 rounded-full overflow-hidden" style={{ height: 4, background: "var(--line)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

/* ─── Checklist row ───────────────────────────────────── */
function CheckRow({ label, status }: { label: string; status: "complete" | "in-progress" | "pending" }) {
  const cfg = {
    complete: { dot: "#22c55e", text: "Complete", color: "#16a34a" },
    "in-progress": { dot: "#eab308", text: "In progress", color: "#a16207" },
    pending: { dot: "#94a3b8", text: "Pending", color: "#64748b" },
  }[status];
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>{label}</span>
      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: cfg.color }}>
        <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
        {cfg.text}
      </span>
    </div>
  );
}

/* ─── Category icons ──────────────────────────────────── */
function RooflineIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12l10-8 10 8" /><path d="M4 10v10h16V10" /></svg>;
}
function TreeIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12,2 4,18 20,18" /><line x1="12" y1="18" x2="12" y2="22" /></svg>;
}
function BushIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z" /></svg>;
}
function AccentIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3" /></svg>;
}

/* ─── Utility ─────────────────────────────────────────── */
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
