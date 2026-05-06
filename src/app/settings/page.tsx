"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

type Sequencer = "xlights" | "lor" | "vixen" | "other";

const SEQUENCER_OPTIONS: Array<{ value: Sequencer; label: string; desc: string }> = [
  { value: "xlights", label: "xLights", desc: "Most popular — largest community" },
  { value: "lor", label: "Light-O-Rama", desc: "LOR hardware and software" },
  { value: "vixen", label: "Vixen Lights", desc: "Free, Windows-based sequencer" },
  { value: "other", label: "I'm new / not sure", desc: "Defaults to xLights guidance" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const currentSequencer = (user?.publicMetadata?.sequencer as Sequencer) || "xlights";
  const [sequencer, setSequencer] = useState<Sequencer>(currentSequencer);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequencer }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#faf8f5" }}>
      {/* Nav */}
      <header className="px-6 py-3.5 flex items-center justify-between" style={{ background: "#ffffff", borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs" style={{ background: "linear-gradient(135deg, var(--accent), oklch(72% 0.18 250))" }}>
              ✦
            </div>
            <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>LightCanvas</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            {user?.firstName || user?.emailAddresses[0]?.emailAddress}
          </span>
          <UserButton />
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-[var(--panel)]" style={{ color: "var(--ink-3)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>Settings</h1>
        </div>

        {/* Hardware section */}
        <section className="rounded-xl p-6" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
          <h2 className="text-sm font-semibold mb-1">Hardware Profile</h2>
          <p className="text-xs mb-5" style={{ color: "var(--ink-3)" }}>
            Your sequencing software determines export defaults and setup instructions.
          </p>

          <div className="grid gap-2.5 mb-5">
            {SEQUENCER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSequencer(opt.value); setSaved(false); }}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
                style={{
                  background: sequencer === opt.value ? "var(--accent-50)" : "var(--panel)",
                  border: sequencer === opt.value ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold" style={{
                  background: sequencer === opt.value ? "var(--accent)" : "var(--panel-2)",
                  color: sequencer === opt.value ? "#fff" : "var(--ink-3)",
                }}>
                  {opt.value === "xlights" ? "xL" : opt.value === "lor" ? "LOR" : opt.value === "vixen" ? "Vx" : "?"}
                </div>
                <div>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || sequencer === currentSequencer}
              className="h-9 px-5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: sequencer !== currentSequencer ? "var(--accent)" : "var(--panel)",
                color: sequencer !== currentSequencer ? "#fff" : "var(--ink-3)",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {saved && (
              <span className="text-xs font-medium" style={{ color: "oklch(50% 0.13 145)" }}>
                Saved!
              </span>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
