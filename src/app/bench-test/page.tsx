"use client";

/**
 * The guided bench test — BENCH-TEST-CHECKLIST.md as one-step-per-screen.
 *
 * Design rules (from the owner, who runs this standing at a bench):
 *   - ONE step per screen. Big text, big buttons.
 *   - Every step: what to do, what should happen, buttons for what DID happen.
 *   - Every step has an escape hatch that takes a typed note and moves on.
 *   - Progress saves on every tap (localStorage — see store.ts) and the
 *     walk resumes exactly where it left off after any refresh or restart.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  STEPS,
  TOTAL_STEPS,
  SAFETY_RULES,
  type Step,
  type Tone,
} from "@/lib/bench-test/steps";
import { useBenchTestStore } from "@/lib/bench-test/store";
import { buildReport } from "@/lib/bench-test/report";

const TONE_STYLE: Record<Tone, { border: string; bg: string; ink: string }> = {
  good: { border: "#a7f3d0", bg: "#ecfdf5", ink: "#065f46" },
  warn: { border: "#fde68a", bg: "#fffbeb", ink: "#92400e" },
  stop: { border: "#fecaca", bg: "#fef2f2", ink: "#991b1b" },
  neutral: { border: "var(--line)", bg: "var(--panel)", ink: "var(--ink-2)" },
};

export default function BenchTestPage() {
  // localStorage state only exists on the client — render nothing until then
  // so the server and first client paint agree.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  const stepIndex = useBenchTestStore((s) => s.stepIndex);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--ink-4)", fontSize: 16 }}>Loading your test…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {stepIndex >= TOTAL_STEPS ? <SummaryScreen /> : <StepScreen step={STEPS[stepIndex]} index={stepIndex} />}
    </div>
  );
}

/* ─── one step ───────────────────────────────────────────── */

function StepScreen({ step, index }: { step: Step; index: number }) {
  const saved = useBenchTestStore((s) => s.answers[step.id]);
  const back = useBenchTestStore((s) => s.back);
  const next = useBenchTestStore((s) => s.next);
  const answer = useBenchTestStore((s) => s.answer);

  const [choice, setChoice] = useState<string | null>(saved?.choice ?? null);
  const [note, setNote] = useState(saved?.note ?? "");

  // restore this step's saved answer when landing on it (including via Back)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved answer on step change is the point
    setChoice(saved?.choice ?? null);
    setNote(saved?.note ?? "");
    window.scrollTo(0, 0);
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = step.options.find((o) => o.id === choice) ?? null;
  const showNote = Boolean(step.alwaysNote || chosen?.wantsNote);
  const canContinue = choice !== null;

  const commit = () => {
    if (!choice) return;
    answer(step.id, choice, note);
    next();
  };

  return (
    <>
      <WalkHeader index={index} onBack={index > 0 ? back : undefined} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 pb-16">
        <h1
          className="mt-6 mb-5"
          style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.01em" }}
        >
          {step.title}
        </h1>

        {step.kind === "safety" && <SafetyRules />}

        {step.action.length > 0 && (
          <section className="mb-5">
            <SectionLabel>What to do</SectionLabel>
            <ol className="flex flex-col gap-2.5">
              {step.action.map((a, i) => (
                <li key={i} className="flex gap-3 items-start rounded-xl px-4 py-3" style={{ background: "#fff", border: "1px solid var(--line)" }}>
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-semibold"
                    style={{ background: "#1e3a5f", color: "#fff", fontSize: 15 }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 17, lineHeight: 1.5 }}>{a}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {step.numbers && <NumberSets numbers={step.numbers} />}
        {step.table && <PortTable step={step} />}

        {step.expect && step.expect.length > 0 && (
          <section className="mb-5">
            <SectionLabel>What should happen</SectionLabel>
            <div className="rounded-xl px-4 py-3" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              {step.expect.map((e, i) => (
                <p key={i} style={{ fontSize: 17, lineHeight: 1.5, color: "#1e3a5f", marginTop: i > 0 ? 8 : 0 }}>
                  {e}
                </p>
              ))}
            </div>
          </section>
        )}

        {step.fineprint && (
          <p className="mb-5 px-1" style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink-3)" }}>
            {step.fineprint}
          </p>
        )}

        <section className="mb-4">
          <SectionLabel>{step.kind === "safety" ? "Ready?" : "What happened?"}</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {step.options.map((o) => {
              const active = choice === o.id;
              const t = TONE_STYLE[o.tone];
              return (
                <button
                  key={o.id}
                  onClick={() => setChoice(o.id)}
                  className="text-left rounded-xl px-4 py-4 transition-colors"
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    background: active ? t.bg : "#fff",
                    border: `2px solid ${active ? t.ink : "var(--line)"}`,
                    color: active ? t.ink : "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </section>

        {chosen?.guidance && (
          <div
            className="mb-4 rounded-xl px-4 py-3"
            style={{ background: TONE_STYLE[chosen.tone].bg, border: `1px solid ${TONE_STYLE[chosen.tone].border}` }}
          >
            <p style={{ fontSize: 16, lineHeight: 1.55, color: TONE_STYLE[chosen.tone].ink }}>{chosen.guidance}</p>
          </div>
        )}

        {showNote && (
          <div className="mb-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={chosen?.notePrompt ?? step.notePrompt ?? "Type what you saw, in your own words."}
              rows={3}
              className="w-full rounded-xl px-4 py-3"
              style={{ fontSize: 17, lineHeight: 1.5, border: "2px solid var(--line)", background: "#fff", color: "var(--ink)", resize: "vertical" }}
            />
          </div>
        )}

        <button
          onClick={commit}
          disabled={!canContinue}
          className="w-full rounded-xl py-4 font-semibold"
          style={{
            fontSize: 19,
            background: canContinue ? "#1e3a5f" : "var(--panel)",
            color: canContinue ? "#fff" : "var(--ink-4)",
            border: "none",
            cursor: canContinue ? "pointer" : "default",
          }}
        >
          {canContinue ? (index + 1 >= TOTAL_STEPS ? "Finish → see my results" : "Next step →") : "Pick an answer above first"}
        </button>

        <p className="text-center mt-3" style={{ fontSize: 13, color: "var(--ink-4)" }}>
          Every answer saves itself. Close this any time — you&apos;ll come back to this exact step.
        </p>
      </main>
    </>
  );
}

/* ─── pieces ─────────────────────────────────────────────── */

function WalkHeader({ index, onBack }: { index: number; onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-10 w-full" style={{ background: "rgba(248,247,244,0.95)", backdropFilter: "blur(6px)", borderBottom: "1px solid var(--line)" }}>
      <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="h-11 px-4 rounded-lg font-semibold flex items-center gap-1.5"
            style={{ fontSize: 16, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", cursor: "pointer" }}
          >
            ← Back
          </button>
        ) : (
          <Link
            href="/projects"
            className="h-11 px-4 rounded-lg font-semibold flex items-center"
            style={{ fontSize: 16, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)" }}
          >
            ← Leave
          </Link>
        )}
        <div className="flex-1">
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(((index + 1) / (TOTAL_STEPS + 1)) * 100)}%`, background: "#1e3a5f", transition: "width .25s" }}
            />
          </div>
        </div>
        <span className="shrink-0 font-semibold" style={{ fontSize: 16, color: "var(--ink-2)" }}>
          Step {index + 1} of {TOTAL_STEPS}
        </span>
      </div>
    </header>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-semibold" style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
      {children}
    </p>
  );
}

function SafetyRules() {
  return (
    <section className="mb-6 flex flex-col gap-3">
      {SAFETY_RULES.map((r, i) => (
        <div key={i} className="rounded-xl px-4 py-4" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#991b1b", lineHeight: 1.35 }}>
            {i + 1}. {r.title}
          </p>
          <p className="mt-1.5" style={{ fontSize: 16, lineHeight: 1.55, color: "var(--ink-2)" }}>
            {r.body}
          </p>
        </div>
      ))}
    </section>
  );
}

function NumberSets({ numbers }: { numbers: NonNullable<Step["numbers"]> }) {
  return (
    <section className="mb-5">
      <SectionLabel>The two possible sets for {numbers.boxLabel}</SectionLabel>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 rounded-xl px-4 py-4" style={{ background: "#fff", border: "2px solid var(--line)" }}>
          <p className="font-bold mb-2" style={{ fontSize: 17 }}>First set — has letters</p>
          <p className="font-mono" style={{ fontSize: 18, lineHeight: 1.7, letterSpacing: "0.02em", wordSpacing: "0.3em" }}>
            {numbers.hex.join("  ")}
          </p>
        </div>
        <div className="flex-1 rounded-xl px-4 py-4" style={{ background: "#fff", border: "2px solid var(--line)" }}>
          <p className="font-bold mb-2" style={{ fontSize: 17 }}>Second set — numbers only</p>
          <p className="font-mono" style={{ fontSize: 18, lineHeight: 1.7, letterSpacing: "0.02em", wordSpacing: "0.3em" }}>
            {numbers.dec.join("  ")}
          </p>
        </div>
      </div>
      <p className="mt-3 px-1" style={{ fontSize: 16, lineHeight: 1.5, color: "var(--ink-2)" }}>
        <strong>The tell:</strong> if you can see any letters in your list — like{" "}
        <span className="font-mono">0A</span> or <span className="font-mono">3F</span> — yours is the first set. Both
        sets mean the exact same thing; the software just counts two different ways.
      </p>
    </section>
  );
}

function PortTable({ step }: { step: Step }) {
  const table = step.table!;
  const portNotes = useBenchTestStore((s) => s.portNotes);
  const setPortNote = useBenchTestStore((s) => s.setPortNote);
  return (
    <section className="mb-5">
      <SectionLabel>{table.boxLabel} — write in what actually lit up</SectionLabel>
      <div className="flex flex-col gap-2">
        {table.rows.map((row) => (
          <div key={row.port} className="rounded-xl px-4 py-3" style={{ background: "#fff", border: "1px solid var(--line)" }}>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span style={{ fontSize: 17, fontWeight: 700 }}>Port {row.port}</span>
              <span className="font-mono" style={{ fontSize: 14, color: "var(--ink-3)" }}>
                number {row.unitHex} / {row.unitDec}
              </span>
            </div>
            <p className="mt-0.5" style={{ fontSize: 15, color: "var(--ink-3)" }}>
              Should be: {row.expected}
            </p>
            <input
              value={portNotes[`${step.id}:${row.port}`] ?? ""}
              onChange={(e) => setPortNote(step.id, row.port, e.target.value)}
              placeholder="What lit up?"
              className="mt-2 w-full rounded-lg px-3 py-2.5"
              style={{ fontSize: 16, border: "1.5px solid var(--line)", background: "var(--bg)" }}
            />
          </div>
        ))}
      </div>
      {table.footnote && (
        <p className="mt-2 px-1" style={{ fontSize: 14, color: "var(--ink-3)" }}>
          {table.footnote}
        </p>
      )}
    </section>
  );
}

/* ─── summary ────────────────────────────────────────────── */

function SummaryScreen() {
  const answers = useBenchTestStore((s) => s.answers);
  const portNotes = useBenchTestStore((s) => s.portNotes);
  const startedAt = useBenchTestStore((s) => s.startedAt);
  const goTo = useBenchTestStore((s) => s.goTo);
  const reset = useBenchTestStore((s) => s.reset);

  const [copied, setCopied] = useState<"no" | "yes" | "manual">("no");
  const [confirmReset, setConfirmReset] = useState(false);

  // arriving from the last (long) step leaves the page scrolled down
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const report = useMemo(
    () => buildReport({ answers, portNotes, startedAt }),
    [answers, portNotes, startedAt]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied("yes");
      setTimeout(() => setCopied("no"), 4000);
    } catch {
      // clipboard can be blocked — select the text and say what to press instead
      const pre = document.getElementById("bench-report");
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setCopied("manual");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 w-full" style={{ background: "rgba(248,247,244,0.95)", backdropFilter: "blur(6px)", borderBottom: "1px solid var(--line)" }}>
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => goTo(TOTAL_STEPS - 1)}
            className="h-11 px-4 rounded-lg font-semibold"
            style={{ fontSize: 16, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", cursor: "pointer" }}
          >
            ← Back to the steps
          </button>
          <span className="flex-1" />
          <Link
            href="/projects"
            className="h-11 px-4 rounded-lg font-semibold flex items-center"
            style={{ fontSize: 16, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)" }}
          >
            Done — back to the app
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 pb-16">
        <h1
          className="mt-6 mb-2"
          style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600, lineHeight: 1.2 }}
        >
          Your results
        </h1>
        <p className="mb-5" style={{ fontSize: 17, lineHeight: 1.5, color: "var(--ink-2)" }}>
          Everything you answered, in one block of text. Copy it and paste the whole thing into your chat with Claude —
          that&apos;s the report.
        </p>

        <button
          onClick={copy}
          className="w-full rounded-xl py-4 font-semibold mb-2"
          style={{ fontSize: 19, background: copied === "yes" ? "#065f46" : "#1e3a5f", color: "#fff", border: "none", cursor: "pointer" }}
        >
          {copied === "yes" ? "✓ Copied — now paste it to Claude" : "Copy my results"}
        </button>
        {copied === "manual" && (
          <p className="mb-2 rounded-xl px-4 py-3" style={{ fontSize: 16, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
            Your browser wouldn’t let the button copy by itself, so the whole report below is now
            selected for you — press <strong>Ctrl and C together</strong> to copy it, then paste it to Claude.
          </p>
        )}

        <pre
          id="bench-report"
          className="rounded-xl px-4 py-4 overflow-x-auto mb-6"
          style={{ background: "#fff", border: "1px solid var(--line)", fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}
        >
          {report}
        </pre>

        <div className="rounded-xl px-4 py-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <p style={{ fontSize: 15, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Want to run the whole test again from a clean slate? This erases every answer above — copy them out first.
          </p>
          {confirmReset ? (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { reset(); setConfirmReset(false); }}
                className="h-11 px-4 rounded-lg font-semibold"
                style={{ fontSize: 15, background: "#991b1b", color: "#fff", border: "none", cursor: "pointer" }}
              >
                Yes, erase it all and start over
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="h-11 px-4 rounded-lg font-semibold"
                style={{ fontSize: 15, border: "1px solid var(--line)", background: "#fff", cursor: "pointer" }}
              >
                Keep my answers
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="h-11 px-4 rounded-lg font-semibold mt-3"
              style={{ fontSize: 15, border: "1px solid var(--line)", background: "#fff", color: "var(--ink-2)", cursor: "pointer" }}
            >
              Start over…
            </button>
          )}
        </div>
      </main>
    </>
  );
}
