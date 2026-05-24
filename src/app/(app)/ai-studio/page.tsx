"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";
import { useAutosave } from "@/lib/store/use-autosave";
import { projectFromRow } from "@/types/domain";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";

/* ── Helpers ────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide"
      style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}>
      {children}
    </div>
  );
}

/* Mock generated variants */
const MOCK_VARIANTS = [
  { id: "v1", title: "Magical Warm Glow", desc: "Soft amber warmth cascading across rooflines with gentle twinkling accents.", tags: ["Warm", "Elegant", "Cinematic", "Balanced"], best: true },
  { id: "v2", title: "Frosted Elegance", desc: "Cool blue and white tones with icy shimmer effects across all props.", tags: ["Cool", "Minimal", "Crisp", "Smooth"], best: false },
  { id: "v3", title: "Festive Celebration", desc: "Vibrant red, green, and gold with energetic chase patterns and sparkle.", tags: ["Vibrant", "Festive", "Energetic", "Bold"], best: false },
];

const FILTER_PILLS = [
  { id: "mood", label: "Mood", value: "Warm & Magical", icon: <circle cx="12" cy="12" r="4" /> },
  { id: "energy", label: "Energy", value: "Medium", icon: <><rect x="4" y="14" width="4" height="6" rx="1" /><rect x="10" y="10" width="4" height="10" rx="1" /><rect x="16" y="6" width="4" height="14" rx="1" /></> },
  { id: "palette", label: "Palette", value: "Warm", icon: <><circle cx="8" cy="12" r="3" /><circle cx="14" cy="12" r="3" /><circle cx="11" cy="8" r="3" /></> },
  { id: "duration", label: "Duration", value: "8s", icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> },
  { id: "beat", label: "Beat Aware", value: "On", icon: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /></> },
  { id: "targets", label: "Targets", value: "All", icon: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></> },
];

/* ── Main content ───────────────────────────────────── */
function AIStudioContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const storeProjectId = useEditorStore((s) => s.projectId);
  const loadProject = useEditorStore((s) => s.loadProject);
  const houseCustomSvg = useEditorStore((s) => s.houseCustomSvg);

  const [prompt, setPrompt] = useState("A warm, magical Christmas look with soft twinkle across the roofline, gentle cascading icicles, and a sweeping sparkle on the mega tree. Elegant and cinematic.");
  const [selectedVariant, setSelectedVariant] = useState("v1");
  const [intensity, setIntensity] = useState(85);
  const [speed, setSpeed] = useState(110);
  const [complexity, setComplexity] = useState(68);

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

  /* ── Empty states ──────────────────────────────── */
  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "#FFFFFF" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#f0f4f8", border: "1px solid var(--line)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>No project selected</p>
        <p className="text-xs" style={{ color: "var(--ink-4)" }}>Select a project to generate AI effects.</p>
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
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#FFFFFF" }}>
      {/* Page header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid var(--line)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>AI Studio</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>Describe the effect you want, and we&#39;ll generate magic.</p>
        </div>
        <button className="h-9 px-5 rounded-lg text-xs font-semibold flex items-center gap-2"
          style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
          Generate with AI
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left — main */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
          {/* Prompt box */}
          <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <SectionLabel>Describe Your Effect</SectionLabel>
            <div className="relative mt-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-lg p-3 text-sm resize-none"
                style={{ border: "1px solid var(--line)", background: "#fafafa", color: "var(--ink)", lineHeight: 1.6 }}
                placeholder="A warm, magical Christmas look with soft twinkle..."
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="1.5" style={{ opacity: 0.5 }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
                <span className="text-xs" style={{ color: "var(--ink-4)", fontVariantNumeric: "tabular-nums" }}>{prompt.length} / 400</span>
              </div>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_PILLS.map((pill) => (
              <button key={pill.id}
                className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors"
                style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink-2)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{pill.icon}</svg>
                <span style={{ color: "var(--ink-4)" }}>{pill.label}:</span>
                <span>{pill.value}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.4 }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            ))}
          </div>

          {/* Generated Effects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SectionLabel>Generated Effects</SectionLabel>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0f4f8", color: "var(--ink-3)" }}>3 options</span>
              </div>
              <button className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>
                Refine
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {MOCK_VARIANTS.map((v) => (
                <button key={v.id} onClick={() => setSelectedVariant(v.id)}
                  className="rounded-xl overflow-hidden text-left transition-all"
                  style={{
                    border: selectedVariant === v.id ? "2px solid #3b82f6" : "1px solid var(--line)",
                    background: "#FFFFFF",
                    boxShadow: selectedVariant === v.id ? "0 4px 20px rgba(59,130,246,0.12)" : "var(--shadow-sm)",
                  }}>
                  {/* Preview thumbnail */}
                  <div className="relative" style={{
                    height: 140,
                    background: houseCustomSvg
                      ? `url(${houseCustomSvg}) center/cover`
                      : v.id === "v1" ? "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)"
                      : v.id === "v2" ? "linear-gradient(135deg, #0f172a, #1e40af, #3b82f6)"
                      : "linear-gradient(135deg, #1a1a2e, #7f1d1d, #15803d)",
                  }}>
                    {/* Dark overlay for readability */}
                    {houseCustomSvg && <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />}
                    {/* Play icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="6 3 20 12 6 21" /></svg>
                      </div>
                    </div>
                    {/* Duration badge */}
                    <span className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10 }}>0:08</span>
                    {/* Best match badge */}
                    {v.best && selectedVariant === v.id && (
                      <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#3b82f6", color: "#fff", fontSize: 10 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>
                        Best match
                      </span>
                    )}
                    {/* Checkmark */}
                    {selectedVariant === v.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#3b82f6" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--ink)" }}>{v.title}</p>
                    <p className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>{v.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {v.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0f4f8", color: "var(--ink-3)", fontSize: 10 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Helper line */}
            <div className="flex items-center gap-2 mt-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="1.5">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-2 3-2 5h-4c0-2-2-3.05-2-5a4 4 0 0 1 4-4z" /><line x1="10" y1="14" x2="14" y2="14" />
              </svg>
              <span className="text-xs" style={{ color: "var(--ink-4)" }}>Not quite right? Refine your prompt or adjust the settings to generate again.</span>
            </div>
          </div>
        </div>

        {/* Right rail — Edit Effect */}
        <div className="shrink-0 overflow-y-auto" style={{ width: 300, borderLeft: "1px solid var(--line)" }}>
          <div className="p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <SectionLabel>Edit Effect</SectionLabel>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06" />
              </svg>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-4">
              <SliderField label="Intensity" value={intensity} onChange={setIntensity} />
              <SliderField label="Speed" value={speed} onChange={setSpeed} suffix="x" scale={100} />
              <SliderField label="Complexity" value={complexity} onChange={setComplexity} />
            </div>

            {/* Palette */}
            <div>
              <SectionLabel>Palette</SectionLabel>
              <div className="flex items-center gap-2 mt-2">
                {["#f59e0b", "#fbbf24", "#fef3c7", "#1e3a5f", "#0f172a"].map((c) => (
                  <div key={c} className="w-7 h-7 rounded-lg cursor-pointer" style={{ background: c, border: "1px solid rgba(0,0,0,0.1)" }} />
                ))}
                <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: "1px dashed var(--line)", color: "var(--ink-4)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
            </div>

            {/* Beat Awareness */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>Beat Awareness</p>
                <p className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>Sync to timeline audio and cues.</p>
              </div>
              <div className="w-9 h-5 rounded-full relative cursor-pointer" style={{ background: "#3b82f6" }}>
                <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

            {/* Apply To */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionLabel>Apply To</SectionLabel>
                <span className="text-xs" style={{ color: "var(--ink-4)" }}>4 selected</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {["Rooflines", "Windows", "Mega Tree", "Landscape"].map((name) => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#3b82f6]" />
                    <span className="text-xs" style={{ color: "var(--ink-2)" }}>{name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Apply CTA */}
            <button className="w-full h-9 rounded-lg text-xs font-semibold"
              style={{ background: "#3b82f6", color: "#FFFFFF" }}>
              Apply to Timeline →
            </button>
            <p className="text-xs text-center" style={{ color: "var(--ink-4)" }}>This will create a new effect layer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderField({ label, value, onChange, suffix, scale }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; scale?: number }) {
  const display = scale ? (value / scale).toFixed(2) : String(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>{label}</span>
        <span className="text-xs font-medium" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{display}{suffix ?? "%"}</span>
      </div>
      <input type="range" min={0} max={scale ? 200 : 100} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 accent-[#3b82f6]" />
    </div>
  );
}

/* ── Page wrapper ───────────────────────────────────── */
export default function AIStudioPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center" style={{ background: "#FFFFFF" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
      </div>
    }>
      <AIStudioContent />
    </Suspense>
  );
}
