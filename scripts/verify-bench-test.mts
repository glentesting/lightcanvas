/**
 * The guided bench test's content, checked by running it.
 *
 * The walkthrough is a safety document as much as a UI, so this asserts the
 * things that must never drift: unit numbers matching the hardware doc's
 * addressing, both boxes fully covered, an escape hatch on every step, the
 * five safety rules present and first, port predictions matching the
 * reference doc, and the copyable report carrying every answer and note.
 *
 * Usage: npx tsx scripts/verify-bench-test.mts
 */
import {
  STEPS,
  TOTAL_STEPS,
  SAFETY_RULES,
  BOX_4,
  BOX_1,
  BOX_4_PORTS,
  BOX_1_PORTS,
} from "../src/lib/bench-test/steps";
import { buildReport } from "../src/lib/bench-test/report";
import type { StepAnswer } from "../src/lib/bench-test/store";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

/* ── addressing: must match the hardware doc exactly ── */
console.log("── unit numbers ──");
check("Box 4 occupies hex 09–18", BOX_4.hexList.join(",") ===
  "09,0A,0B,0C,0D,0E,0F,10,11,12,13,14,15,16,17,18", BOX_4.hexList.join(","));
check("Box 4 occupies decimal 9–24", BOX_4.decList.join(",") ===
  "9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24");
check("Box 1 occupies hex 30–3F", BOX_1.hexList.join(",") ===
  "30,31,32,33,34,35,36,37,38,39,3A,3B,3C,3D,3E,3F", BOX_1.hexList.join(","));
check("Box 1 occupies decimal 48–63", BOX_1.decList.join(",") ===
  "48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63");
check("Box 4 Port 1 is unit 09 / 9", BOX_4.port1Hex === "09" && BOX_4.port1Dec === 9);
check("Box 4 Port 9 is unit 11 / 17", BOX_4.port9Hex === "11" && BOX_4.port9Dec === 17);
check("Box 1 Port 1 is unit 30 / 48", BOX_1.port1Hex === "30" && BOX_1.port1Dec === 48);
check("Box 1 Port 9 is unit 38 / 56", BOX_1.port9Hex === "38" && BOX_1.port9Dec === 56);

/* ── port predictions vs the hardware doc §5 ── */
console.log("\n── port predictions ──");
check("Box 4 table has all 16 ports", BOX_4_PORTS.length === 16 &&
  BOX_4_PORTS.every((r, i) => r.port === i + 1));
check("Box 4 port 1 predicts Mini Tree 01", BOX_4_PORTS[0].expected.includes("Mini Tree 01"));
check("Box 4 port 9 predicts Arch 01 + Arch 02", BOX_4_PORTS[8].expected === "Arch 01 + Arch 02");
check("Box 4 port 13 predicts Pixel Stakes 01–10", BOX_4_PORTS[12].expected === "Pixel Stakes 01–10");
check("Box 4 port 16 predicts Pixel Stakes 31–40", BOX_4_PORTS[15].expected === "Pixel Stakes 31–40");
check("Box 1 table covers ports 1–8", BOX_1_PORTS.length === 8);
check("Box 1 faces sit on the odd ports", ["Elden", "Felix", "Ralphie", "Zuzu"].every(
  (face, i) => BOX_1_PORTS[i * 2].expected === face));
check("Box 1 even ports say unknown", [1, 3, 5, 7].every(
  (i) => BOX_1_PORTS[i].expected.startsWith("unknown")));

/* ── step structure ── */
console.log("\n── step structure ──");
const ids = STEPS.map((s) => s.id);
check("step ids are unique", new Set(ids).size === ids.length);
check("TOTAL_STEPS matches", TOTAL_STEPS === STEPS.length, `${TOTAL_STEPS}`);
check("safety comes first and there are five rules",
  STEPS[0].id === "safety" && SAFETY_RULES.length === 5);
check("gather and director precede any box work",
  ids.indexOf("gather") === 1 && ids.indexOf("director") === 2 &&
  ids.indexOf("director") < ids.indexOf("box4-label"));

const perBox = ["label", "connect", "power", "find", "numbers", "light1", "light9"];
for (const box of ["box4", "box1"]) {
  const boxIds = perBox.map((p) => `${box}-${p}`);
  check(`${box} covers the full flow in order`,
    boxIds.every((id) => ids.includes(id)) &&
    boxIds.every((id, i) => i === 0 || ids.indexOf(id) === ids.indexOf(boxIds[i - 1]) + 1),
    boxIds.filter((id) => !ids.includes(id)).join(","));
}
check("Box 4 is tested before Box 1, with a swap step between",
  ids.indexOf("box4-light9") < ids.indexOf("switch-boxes") &&
  ids.indexOf("switch-boxes") < ids.indexOf("box1-label"));
check("port tables come last, before the summary",
  ids.indexOf("box1-ports") === STEPS.length - 1 &&
  ids.indexOf("box4-ports") === STEPS.length - 2);

/* ── every step is escapable and honest ── */
console.log("\n── options ──");
let optProblems = 0;
for (const s of STEPS) {
  if (s.id === "safety") continue; // acknowledge-only by design
  const hasEscape = s.options.some((o) => o.tone !== "good" && (o.wantsNote || o.id === "unsure"));
  if (s.options.length < 3) { optProblems++; console.log(`  ${s.id}: only ${s.options.length} options`); }
  if (!hasEscape) { optProblems++; console.log(`  ${s.id}: no escape hatch`); }
  for (const o of s.options) {
    if ((o.tone === "stop" || o.tone === "warn") && !o.guidance) {
      optProblems++; console.log(`  ${s.id}/${o.id}: ${o.tone} option with no guidance`);
    }
  }
}
check("every step has ≥3 options, an escape hatch, and guidance on every stop/warn", optProblems === 0);

const numberSteps = STEPS.filter((s) => s.kind === "numbers");
check("both number-matching screens offer hex, decimal, one-entry and neither",
  numberSteps.length === 2 && numberSteps.every((s) =>
    ["hex", "dec", "one-entry", "neither"].every((id) => s.options.some((o) => o.id === id))));

const darkOpt = STEPS.find((s) => s.id === "box4-power")!.options.find((o) => o.id === "dark");
check("'board is dark' is a stop with instructions", darkOpt?.tone === "stop" && !!darkOpt.guidance);

/* ── jargon guard: walkthrough copy stays in the app's plain register ── */
console.log("\n── copy register ──");
const allText = JSON.stringify(STEPS) + JSON.stringify(SAFETY_RULES);
const banned = ["unit ID", "RS485", "enumerate", "hexadecimal", "readback", "DIP"];
const found = banned.filter((w) => allText.toLowerCase().includes(w.toLowerCase()));
check("no jargon in on-screen copy", found.length === 0, found.join(", "));

/* ── the report carries everything ── */
console.log("\n── report ──");
const answers: Record<string, StepAnswer> = {};
for (const s of STEPS) {
  answers[s.id] = {
    choice: s.options[0].id,
    note: `note for ${s.id}`,
    at: new Date().toISOString(),
  };
}
answers["box4-power"] = { choice: "dark", note: "totally dark, faint click", at: new Date().toISOString() };
const portNotes = { "box4-ports:1": "the little tree by the porch lit up", "box1-ports:3": "Felix" };
const report = buildReport({ answers, portNotes, startedAt: new Date().toISOString() });

check("report flags the dark board at the top",
  report.indexOf("NEEDS ATTENTION") < report.indexOf("Box 4:") &&
  report.includes("totally dark, faint click"));
check("report carries every step title", STEPS.every((s) => report.includes(s.title)));
check("report carries every note", STEPS.filter((s) => s.id !== "box4-power")
  .every((s) => report.includes(`note for ${s.id}`)));
check("report carries the port entries and marks untested ports",
  report.includes("the little tree by the porch lit up") &&
  report.includes("Felix") && report.includes("(not tested)"));
check("report shows both boxes' port numbers",
  report.includes("number 09 / 9") && report.includes("number 30 / 48"));

const empty = buildReport({ answers: {}, portNotes: {}, startedAt: null });
check("an empty run still produces a readable report", empty.includes("Steps answered: 0"));

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
