"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@clerk/nextjs";

const DECORATING_OPTIONS = [
  { value: "house", label: "House", icon: "🏠", desc: "Rooflines, windows, arches" },
  { value: "yard", label: "Yard", icon: "🌲", desc: "Trees, bushes, pathways" },
  { value: "both", label: "Both", icon: "🎄", desc: "Full property display" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { session } = useSession();
  const [step, setStep] = useState(1);
  const [decorating, setDecorating] = useState("house");
  const [lightCount, setLightCount] = useState(500);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFinish() {
    setSubmitting(true);

    try {
      // 1. Mark onboarding complete via Clerk metadata
      const onboardRes = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decorating, lightCount }),
      });
      if (!onboardRes.ok) {
        throw new Error("Failed to save onboarding preferences");
      }

      // Refresh Clerk session so dashboard sees updated publicMetadata
      await session?.reload();

      // 2. If user uploaded audio, create a project with it
      if (audioFile) {
        const createRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "My First Show" }),
        });
        if (createRes.ok) {
          const project = await createRes.json();

          // Upload the audio file
          const formData = new FormData();
          formData.append("file", audioFile);
          formData.append("projectId", project.id);
          await fetch("/api/upload-audio", { method: "POST", body: formData });

          router.push(`/project/${project.id}`);
          return;
        }
      }

      router.push("/dashboard?from=onboarding");
    } catch {
      setSubmitting(false);
    }
  }

  const lightLabels = [
    { val: 100, label: "100" },
    { val: 500, label: "500" },
    { val: 1000, label: "1K" },
    { val: 2500, label: "2.5K" },
    { val: 5000, label: "5K" },
    { val: 10000, label: "10K" },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-lg rounded-xl p-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className="h-1.5 rounded-full flex-1 transition-colors"
                style={{
                  background: s <= step ? "var(--accent)" : "var(--line)",
                }}
              />
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">What are you decorating?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
              This helps us set up your first project.
            </p>
            <div className="grid gap-3">
              {DECORATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDecorating(opt.value)}
                  className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-left transition-all"
                  style={{
                    background:
                      decorating === opt.value ? "var(--accent-50)" : "var(--panel)",
                    border:
                      decorating === opt.value
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                  }}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                      {opt.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Roughly how many lights?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
              Don&apos;t worry — you can always change this later.
            </p>
            <div className="mb-4">
              <input
                type="range"
                min={100}
                max={10000}
                step={100}
                value={lightCount}
                onChange={(e) => setLightCount(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            <div className="flex justify-between text-xs mb-4" style={{ color: "var(--ink-4)" }}>
              {lightLabels.map((l) => (
                <span key={l.val}>{l.label}</span>
              ))}
            </div>
            <div
              className="rounded-lg px-4 py-3 text-center"
              style={{ background: "var(--panel)" }}
            >
              <span className="text-2xl font-semibold">
                {lightCount.toLocaleString()}
              </span>
              <span className="text-sm ml-1" style={{ color: "var(--ink-3)" }}>
                pixels
              </span>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Got an audio file ready?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
              Upload an MP3 to start sequencing, or skip and add one later.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="audio/mpeg,audio/mp3"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAudioFile(f);
              }}
            />

            {audioFile ? (
              <div
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ background: "var(--accent-50)", border: "1px solid var(--accent-200)" }}
              >
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--accent)" }}>
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">{audioFile.name}</p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                      {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAudioFile(null)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: "var(--ink-3)" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg px-4 py-8 text-center transition-colors"
                style={{
                  background: "var(--panel)",
                  border: "2px dashed var(--line-2)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mx-auto mb-2"
                  style={{ color: "var(--ink-3)" }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
                  Click to upload MP3
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
                  or drag and drop
                </p>
              </button>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Continue
            </button>
          ) : (
            <div className="flex gap-3">
              {!audioFile && (
                <button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  Skip for now
                </button>
              )}
              <button
                onClick={handleFinish}
                disabled={submitting}
                className="px-5 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting
                  ? "Setting up..."
                  : audioFile
                    ? "Create show"
                    : "Get started"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
