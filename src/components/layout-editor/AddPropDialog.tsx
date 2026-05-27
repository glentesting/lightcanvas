"use client";

import { useState } from "react";
import type { Fixture, FixtureKind } from "@/lib/fixtures/types";
import { FIXTURE_TEMPLATES, nextStartChannel, autoName } from "@/lib/fixtures/library";
import { PROP_DEFAULTS, KIND_CATEGORIES } from "@/lib/fixtures/layout-constants";
import { PropTypeIcon } from "./components";

/* --- Add Prop Dialog --- */
export function AddPropDialog({
  fixtures,
  onAdd,
  onClose,
}: {
  fixtures: Fixture[];
  onAdd: (fixture: Fixture) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedKind, setSelectedKind] = useState<FixtureKind>("roofline");
  const [name, setName] = useState(() => autoName("roofline", fixtures));
  const [pixelCount, setPixelCount] = useState(FIXTURE_TEMPLATES[0].pixelCount);
  const [group, setGroup] = useState("Rooflines");
  const [placement, setPlacement] = useState<"draw" | "ai" | "copy">("draw");

  const handleKindChange = (kind: FixtureKind) => {
    setSelectedKind(kind);
    const tmpl = FIXTURE_TEMPLATES.find((t) => t.kind === kind)!;
    setName(autoName(kind, fixtures));
    setPixelCount(tmpl.pixelCount);
    const cat = KIND_CATEGORIES.find((c) => (c.kinds as string[]).includes(kind));
    if (cat) setGroup(cat.label);
  };

  const handleSubmit = () => {
    const defaults = PROP_DEFAULTS[selectedKind] || { cx: 360, cy: 210 };
    const fixture: Fixture = {
      id: crypto.randomUUID(),
      kind: selectedKind,
      name,
      pixelCount,
      startChannel: nextStartChannel(fixtures),
      layout: { points: [{ x: defaults.cx, y: defaults.cy }], closed: false },
    };
    onAdd(fixture);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-w-md"
        style={{ background: "#FFFFFF", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Add Prop</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            {step === 1 ? "Choose the type of prop to add." : step === 2 ? "Set the basic details." : "How would you like to place it?"}
          </p>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="h-1 flex-1 rounded-full transition-all"
                style={{ background: s <= step ? "#1e3a5f" : "#e5e7eb" }} />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 pb-4">
          {step === 1 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {FIXTURE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.kind}
                  onClick={() => handleKindChange(tmpl.kind)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl text-xs transition-all"
                  style={{
                    border: selectedKind === tmpl.kind ? "2px solid #1e3a5f" : "1px solid var(--line)",
                    background: selectedKind === tmpl.kind ? "#f0f4f8" : "#FFFFFF",
                  }}
                >
                  <PropTypeIcon kind={tmpl.kind} selected={selectedKind === tmpl.kind} />
                  <span className="font-medium truncate w-full text-center" style={{ fontSize: 10 }}>{tmpl.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3 mt-2">
              <div>
                <label className="text-xs mb-1 block font-medium" style={{ color: "var(--ink-2)" }}>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg text-sm"
                  style={{ border: "1px solid var(--line)", background: "#fafafa" }} />
              </div>
              <div>
                <label className="text-xs mb-1 block font-medium" style={{ color: "var(--ink-2)" }}>Pixel Count</label>
                <input type="number" value={pixelCount} onChange={(e) => setPixelCount(parseInt(e.target.value) || 1)}
                  className="w-full h-9 px-3 rounded-lg text-sm"
                  style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
              </div>
              <div>
                <label className="text-xs mb-1 block font-medium" style={{ color: "var(--ink-2)" }}>Group</label>
                <select value={group} onChange={(e) => setGroup(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg text-sm"
                  style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                  {KIND_CATEGORIES.map((cat) => (
                    <option key={cat.label} value={cat.label}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-2 mt-2">
              {([
                { id: "draw" as const, label: "Draw manually", desc: "Place the prop on your house photo and draw its shape.", icon: <><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></> },
                { id: "ai" as const, label: "Use AI detection", desc: "Let AI detect and place this prop type automatically.", icon: <><path d="M12 2a4 4 0 0 1 4 4c0 1.95-2 3-2 5h-4c0-2-2-3.05-2-5a4 4 0 0 1 4-4z" /><line x1="10" y1="14" x2="14" y2="14" /></>, coming: true },
                { id: "copy" as const, label: "Copy from existing", desc: "Duplicate an existing prop and adjust it.", icon: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>, coming: true },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => !opt.coming && setPlacement(opt.id)}
                  className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    border: placement === opt.id && !opt.coming ? "2px solid #1e3a5f" : "1px solid var(--line)",
                    background: placement === opt.id && !opt.coming ? "#f0f4f8" : "#FFFFFF",
                    opacity: opt.coming ? 0.5 : 1,
                    cursor: opt.coming ? "default" : "pointer",
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#f0f4f8" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {opt.icon}
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
                      {opt.label}
                      {opt.coming && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#f0f0f0", color: "var(--ink-4)", fontSize: 9 }}>Coming soon</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: "1px solid var(--line)", background: "#fafafa" }}>
          <div className="text-xs" style={{ color: "var(--ink-4)" }}>Step {step} of 3</div>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="h-8 px-4 rounded-lg text-xs font-medium"
                style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>
                Back
              </button>
            )}
            {step === 1 && (
              <button onClick={onClose} className="h-8 px-4 rounded-lg text-xs font-medium"
                style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>
                Cancel
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="h-8 px-4 rounded-lg text-xs font-semibold"
                style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} className="h-8 px-4 rounded-lg text-xs font-semibold"
                style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
                Add Prop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
