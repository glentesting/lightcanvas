/**
 * Builds the plain-text bench-test report — the thing the Copy button copies,
 * written so it can be pasted straight into a chat with Claude and read
 * without the app open.
 *
 * Pure function; exercised by scripts/verify-bench-test.mts.
 */

import { STEPS, stepBox } from "./steps";
import type { Step, StepOption } from "./steps";
import type { StepAnswer } from "./store";

export interface ReportInput {
  answers: Record<string, StepAnswer>;
  portNotes: Record<string, string>;
  startedAt: string | null;
}

function findOption(step: Step, choice: string): StepOption | undefined {
  return step.options.find((o) => o.id === choice);
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "(not recorded)";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function buildReport(input: ReportInput): string {
  const lines: string[] = [];
  const answered = STEPS.filter((s) => input.answers[s.id]);
  const flagged = answered.filter((s) => {
    const opt = findOption(s, input.answers[s.id].choice);
    return opt && (opt.tone === "stop" || opt.tone === "warn");
  });

  lines.push("LIGHTCANVAS BENCH TEST — RESULTS");
  lines.push(`Started: ${fmtWhen(input.startedAt)}`);
  lines.push(`Copied:  ${new Date().toLocaleString()}`);
  lines.push(`Steps answered: ${answered.length} of ${STEPS.length}`);
  lines.push("");

  if (flagged.length > 0) {
    lines.push("== NEEDS ATTENTION FIRST ==");
    for (const s of flagged) {
      const a = input.answers[s.id];
      const opt = findOption(s, a.choice);
      lines.push(`* ${s.title}`);
      lines.push(`    Answer: ${opt?.label ?? a.choice}`);
      if (a.note) lines.push(`    Note: ${a.note}`);
    }
    lines.push("");
  } else if (answered.length > 0) {
    lines.push("Nothing was flagged as a problem.");
    lines.push("");
  }

  let lastBoxHeader: string | null = null;
  for (const step of STEPS) {
    const a = input.answers[step.id];
    const box = stepBox(step.id);
    if (box !== lastBoxHeader && box !== null && step.kind !== "porttable") {
      lines.push(`---- ${box} ----`);
      lastBoxHeader = box;
    }

    if (step.kind === "porttable" && step.table) {
      lines.push(`---- ${step.title} ----`);
      lastBoxHeader = null;
      for (const row of step.table.rows) {
        const saw = input.portNotes[`${step.id}:${row.port}`]?.trim();
        lines.push(
          `Port ${String(row.port).padStart(2)} (number ${row.unitHex} / ${row.unitDec})` +
            ` — expected: ${row.expected}` +
            ` — saw: ${saw || "(not tested)"}`
        );
      }
      if (a?.note) lines.push(`Note: ${a.note}`);
      lines.push("");
      continue;
    }

    lines.push(`[${a ? "x" : " "}] ${step.title}`);
    if (a) {
      const opt = findOption(step, a.choice);
      lines.push(`    Answer: ${opt?.label ?? a.choice}`);
      if (a.note) lines.push(`    Note: ${a.note}`);
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
