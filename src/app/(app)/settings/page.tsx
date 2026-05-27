"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useEffect } from "react";

type Sequencer = "xlights" | "lor" | "vixen" | "other";
type ControllerType = "falcon-f16v3" | "alphapix-16" | "wled-esp32" | "lor-controller" | "other";
type SettingsTab = "account" | "hardware" | "billing";

const SEQUENCER_OPTIONS: Array<{ value: Sequencer; label: string; desc: string }> = [
  { value: "xlights", label: "xLights", desc: "Most popular — largest community" },
  { value: "lor", label: "Light-O-Rama", desc: "LOR hardware and software" },
  { value: "vixen", label: "Vixen Lights", desc: "Free, Windows-based sequencer" },
  { value: "other", label: "I'm new / not sure", desc: "Defaults to xLights guidance" },
];

const CONTROLLER_OPTIONS: Array<{ value: ControllerType; label: string; desc: string }> = [
  { value: "falcon-f16v3", label: "Falcon F16v3", desc: "Popular pixel controller" },
  { value: "alphapix-16", label: "AlphaPix 16", desc: "HolidayCoro pixel controller" },
  { value: "wled-esp32", label: "WLED (ESP32)", desc: "Open-source Wi-Fi controller" },
  { value: "lor-controller", label: "LOR Controller", desc: "Light-O-Rama hardware" },
  { value: "other", label: "Other / Not sure", desc: "We'll help you figure it out" },
];

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "account", label: "Account" },
  { id: "hardware", label: "Hardware" },
  { id: "billing", label: "Billing" },
];

const FREE_FEATURES = [
  "Unlimited projects",
  "Up to 1,000 pixels per project",
  "10 built-in effects",
  "LightCanvas JSON export",
  "xLights .xsq export",
  "Video preview export",
];

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [tab, setTab] = useState<SettingsTab>("account");

  // Hardware state — initialize to null until Clerk has loaded the user
  const [sequencer, setSequencer] = useState<Sequencer | null>(null);
  const [controller, setController] = useState<ControllerType | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // One-shot hydration from async Clerk user — sync-on-load pattern.
  useEffect(() => {
    if (isLoaded && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSequencer((user.publicMetadata?.sequencer as Sequencer) || "xlights");
      setController((user.publicMetadata?.controllerType as ControllerType) || "other");
    }
  }, [isLoaded, user]);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveHardware() {
    if (!sequencer || !controller) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequencer, controllerType: controller }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const savedSequencer = (user?.publicMetadata?.sequencer as Sequencer) || "xlights";
  const savedController = (user?.publicMetadata?.controllerType as ControllerType) || "other";
  const hardwareChanged = sequencer !== null && controller !== null && (sequencer !== savedSequencer || controller !== savedController);

  return (
    <div style={{ background: "#FFFFFF" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
        <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>Settings</h1>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--panel)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 h-8 rounded-md text-sm font-medium transition-all"
              style={{
                background: tab === t.id ? "#ffffff" : "transparent",
                color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
                boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Account tab */}
        {tab === "account" && (
          <div className="flex flex-col gap-5">
            <section className="rounded-xl p-6" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
              <h2 className="text-sm font-semibold mb-4">Profile</h2>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-3)" }}>Display name</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={[user?.firstName, user?.lastName].filter(Boolean).join(" ") || ""}
                      className="flex-1 h-9 px-3 rounded-lg text-sm"
                      style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
                    />
                    <a
                      href="https://accounts.clerk.dev/user"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium shrink-0"
                      style={{ color: "var(--accent)" }}
                    >
                      Manage in Clerk
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-3)" }}>Email</label>
                  <input
                    type="text"
                    readOnly
                    value={user?.emailAddresses[0]?.emailAddress || ""}
                    className="w-full h-9 px-3 rounded-lg text-sm"
                    style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl p-6" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
              <h2 className="text-sm font-semibold mb-1">Data</h2>
              <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>Export or delete your account data.</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => showToast("Coming soon")}
                  className="h-9 px-5 rounded-lg text-sm font-medium transition-colors self-start"
                  style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
                >
                  Download my data
                </button>
              </div>
            </section>

            <section className="rounded-xl p-6" style={{ background: "#ffffff", border: "1px solid oklch(70% 0.15 25 / 0.3)" }}>
              <h2 className="text-sm font-semibold mb-1" style={{ color: "oklch(50% 0.15 25)" }}>Danger zone</h2>
              <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>Permanently delete your account and all data.</p>

              {showDeleteConfirm ? (
                <div className="flex flex-col gap-3 p-4 rounded-lg" style={{ background: "oklch(97% 0.01 25)", border: "1px solid oklch(70% 0.15 25 / 0.3)" }}>
                  <p className="text-sm" style={{ color: "oklch(45% 0.15 25)" }}>
                    To delete your account, contact <strong>support@lightcanvas.app</strong>
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-8 px-4 rounded-lg text-xs font-medium self-start"
                    style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-3)" }}
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-9 px-5 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: "oklch(55% 0.2 25)", color: "#fff" }}
                >
                  Delete account
                </button>
              )}
            </section>
          </div>
        )}

        {/* Hardware tab */}
        {tab === "hardware" && (
          <div className="flex flex-col gap-5">
            <section className="rounded-xl p-6" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
              <h2 className="text-sm font-semibold mb-1">Sequencing Software</h2>
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
            </section>

            <section className="rounded-xl p-6" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
              <h2 className="text-sm font-semibold mb-1">Controller Type</h2>
              <p className="text-xs mb-5" style={{ color: "var(--ink-3)" }}>
                Select the hardware controller you use for your light display.
              </p>

              <div className="grid gap-2.5 mb-5">
                {CONTROLLER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setController(opt.value); setSaved(false); }}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
                    style={{
                      background: controller === opt.value ? "var(--accent-50)" : "var(--panel)",
                      border: controller === opt.value ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold" style={{
                      background: controller === opt.value ? "var(--accent)" : "var(--panel-2)",
                      color: controller === opt.value ? "#fff" : "var(--ink-3)",
                    }}>
                      {opt.value === "falcon-f16v3" ? "F16" : opt.value === "alphapix-16" ? "AP" : opt.value === "wled-esp32" ? "W" : opt.value === "lor-controller" ? "LOR" : "?"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs" style={{ color: "var(--ink-3)" }}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveHardware}
                disabled={saving || !hardwareChanged}
                className="h-9 px-5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: hardwareChanged ? "var(--accent)" : "var(--panel)",
                  color: hardwareChanged ? "#fff" : "var(--ink-3)",
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
          </div>
        )}

        {/* Billing tab */}
        {tab === "billing" && (
          <div className="flex flex-col gap-5">
            <section className="rounded-xl p-6" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
              <h2 className="text-sm font-semibold mb-1">Current Plan</h2>
              <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
                You are on the Free plan.
              </p>

              <div className="rounded-lg p-4 mb-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center h-5 px-2 rounded-full text-xs font-semibold" style={{ background: "var(--accent-50)", color: "var(--accent)" }}>
                    Free
                  </span>
                  <span className="text-lg font-semibold">$0</span>
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>/month</span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "oklch(55% 0.15 145)", flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-xl p-6" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
              <h2 className="text-sm font-semibold mb-1">Upgrade</h2>
              <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
                Unlock more features with a paid plan.
              </p>

              <div className="grid gap-3">
                <Link
                  href="/#pricing"
                  className="flex items-center justify-between rounded-lg px-4 py-3 transition-all"
                  style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
                >
                  <div>
                    <p className="font-medium text-sm">Pro</p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>Unlimited pixels, AI generation, priority support</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-3)" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
                <Link
                  href="/#pricing"
                  className="flex items-center justify-between rounded-lg px-4 py-3 transition-all"
                  style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
                >
                  <div>
                    <p className="font-medium text-sm">Team</p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>Collaborate with your light show crew</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-3)" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>

              <p className="text-xs mt-5 text-center" style={{ color: "var(--ink-4)" }}>
                Billing powered by Stripe — coming soon
              </p>
            </section>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg" style={{ background: "var(--ink)", color: "#fff" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
