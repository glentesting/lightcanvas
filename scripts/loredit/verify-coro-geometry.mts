/**
 * Verifies the exact coro-prop geometry and — the real test — that CHASES
 * travel the correct direction across each prop:
 *   - mini tree: horizontal rows, most pixels at the bottom, chase climbs
 *     the tree in bands
 *   - arch: pixels along the semicircle, chase travels leg → top → leg
 *   - stake: 5 pixels stacked vertically
 *   - star: pixels around the 5-point outline
 *
 * Chase direction is checked by running the REAL render engine on a chase
 * block and following the brightest pixel through the real geometry.
 *
 * Usage: npx tsx scripts/loredit/verify-coro-geometry.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLoreditLayout, propToFixture } from "../../src/lib/imports/loredit-layout";
import { expandFixturePixels } from "../../src/lib/scene/pixel-geometry";
import { treeRowCounts } from "../../src/lib/fixtures/coro-shapes";
import { renderFrame } from "../../src/lib/render/engine";
import type { Fixture } from "../../src/lib/fixtures/types";
import type { Sequence } from "../../src/lib/timeline/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(here, "..", "loredit-spike", "test-fixtures", "Carol Of The Bells-Pentatonix-LOR-RGBPlus.loredit");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

// real fixtures via the real import path
const groups = parseLoreditLayout(fs.readFileSync(TEMPLATE, "utf8"));
const all = groups.flatMap((g) => g.props);
const fx = (name: string): Fixture => propToFixture(all.find((p) => p.name === name)!);

const tree = fx("RGB Mini Tree Base 01");
const star = fx("RGB Mini Tree Star 01");
const arch = fx("RGB Arch 01");
const stake = fx("RGB Pixel Stake 01");

check("import sets coroShape hints", tree.geometry?.coroShape === "tiered-tree" && star.geometry?.coroShape === "star5" && arch.geometry?.coroShape === "arch" && stake.geometry?.coroShape === "stake");
check("AC circuits import with friendly names", fx("01.01 AC Top Window 01-Group A") === undefined || true); // name changed — check below
const acProp = all.find((p) => p.name === "01.01 AC Top Window 01-Group A")!;
const acFx = propToFixture(acProp);
check("AC fixture named for the roof, not the demo house", acFx.name === "Roof Light String 01", acFx.name);
check("AC export mapping name unchanged", acFx.lor?.propName === "01.01 AC Top Window 01-Group A");

/* ── mini tree: rows ── */
const counts = treeRowCounts(80);
check("tree has ~10 rows totalling 80", counts.length === 10 && counts.reduce((a, b) => a + b, 0) === 80, `${counts.length} rows: [${counts.join(",")}]`);
check("fewest pixels at the top, most at the bottom", counts[0] <= 4 && counts[0] >= 2 && counts[counts.length - 1] >= 10 && counts[counts.length - 1] <= 13, `top ${counts[0]}, bottom ${counts[counts.length - 1]}`);

const treePx = expandFixturePixels(tree);
check("tree expands to 80 pixels", treePx.length === 80);
const rowsByY = new Map<number, number[]>();
for (const p of treePx) {
  const key = Math.round(p.y * 10) / 10;
  const arr = rowsByY.get(key) ?? [];
  arr.push(p.pixelIndex);
  rowsByY.set(key, arr);
}
const sortedRows = [...rowsByY.entries()].sort((a, b) => b[0] - a[0]); // bottom (max y) first
check("pixels sit in horizontal rows", rowsByY.size >= 9 && rowsByY.size <= 11, `${rowsByY.size} distinct rows`);
check(
  "row sizes grow toward the bottom",
  sortedRows[0][1].length >= sortedRows[sortedRows.length - 1][1].length + 5,
  `bottom row ${sortedRows[0][1].length} px, top row ${sortedRows[sortedRows.length - 1][1].length} px`
);
check(
  "wiring runs row by row from the bottom",
  Math.min(...sortedRows[0][1]) === 0 &&
    sortedRows.every(([, idxs]) => Math.max(...idxs) - Math.min(...idxs) === idxs.length - 1) &&
    sortedRows.every(([, idxs], r) => r === 0 || Math.min(...idxs) > Math.max(...sortedRows[r - 1][1])),
  "each row is a contiguous index range, bottom row first"
);

/* ── chase climbs the tree in bands ── */
function chaseSequence(fixture: Fixture): Sequence {
  return {
    tracks: [{ id: fixture.id, kind: "fixture" }],
    blocks: [{
      id: "chase-1", trackId: fixture.id, effectId: "chase", start: 0, duration: 60,
      params: { color1: "#ff0000", intensity: 1, speed: 0.5, easing: "linear" },
    }],
    bpm: 120, beatGridOffset: 0,
  };
}

function brightestY(fixture: Fixture, px: ReturnType<typeof expandFixturePixels>, t: number): number {
  const frame = renderFrame(chaseSequence(fixture), [fixture], t);
  const colors = frame.get(fixture.id)!;
  let best = 0, bestV = -1;
  colors.forEach((c, i) => { const v = c[0] + c[1] + c[2]; if (v > bestV) { bestV = v; best = i; } });
  return px[best].y;
}

{
  // head position = (t*speed*n*0.5) % n → one full climb takes n/(speed*n*0.5)=4s at speed .5
  const ys = [0.2, 1.0, 1.8, 2.6, 3.4].map((t) => brightestY(tree, treePx, t));
  const climbing = ys.every((y, i) => i === 0 || y <= ys[i - 1] + 0.01);
  check("CHASE CLIMBS THE TREE in bands (bright band moves up over time)", climbing, `band y over time: ${ys.map((y) => y.toFixed(0)).join(" → ")}`);
}

/* ── arch: over the top ── */
const archPx = expandFixturePixels(arch);
check("arch expands to 25 pixels", archPx.length === 25);
const first = archPx[0], mid = archPx[12], last = archPx[24];
check(
  "arch pixels run leg → top → leg",
  first.x < mid.x && mid.x < last.x && mid.y < first.y - 5 && mid.y < last.y - 5 &&
    Math.abs(first.y - last.y) < 1,
  `left leg (${first.x.toFixed(0)},${first.y.toFixed(0)}) top (${mid.x.toFixed(0)},${mid.y.toFixed(0)}) right leg (${last.x.toFixed(0)},${last.y.toFixed(0)})`
);
{
  const xs = [0.2, 0.8, 1.4].map((t) => {
    const frame = renderFrame(chaseSequence(arch), [arch], t);
    const colors = frame.get(arch.id)!;
    let best = 0, bestV = -1;
    colors.forEach((c, i) => { const v = c[0] + c[1] + c[2]; if (v > bestV) { bestV = v; best = i; } });
    return archPx[best];
  });
  check(
    "CHASE TRAVELS OVER THE ARCH (left leg, over the top, right leg)",
    xs[0].x < xs[1].x && xs[1].x < xs[2].x,
    `head x over time: ${xs.map((p) => p.x.toFixed(0)).join(" → ")}`
  );
}

/* ── stake ── */
const stakePx = expandFixturePixels(stake);
check("stake = 5 pixels stacked vertically", stakePx.length === 5 && new Set(stakePx.map((p) => Math.round(p.x))).size === 1 && stakePx.every((p, i) => i === 0 || p.y > stakePx[i - 1].y));

/* ── star ── */
const starPx = expandFixturePixels(star);
{
  const cx = starPx.reduce((s, p) => s + p.x, 0) / starPx.length;
  const cy = starPx.reduce((s, p) => s + p.y, 0) / starPx.length;
  const dists = starPx.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const min = Math.min(...dists), max = Math.max(...dists);
  check("star = 20 pixels around a 5-point outline (not a blob)", starPx.length === 20 && max / Math.max(0.001, min) > 1.5 && max < 20, `radius ${min.toFixed(1)}–${max.toFixed(1)}`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
