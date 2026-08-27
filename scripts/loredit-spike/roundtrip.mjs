/**
 * Task 2: parse the reference file, serialize it back, byte-compare.
 * Two modes:
 *   1. Raw-preserving serialize (proves the parser loses nothing)
 *   2. Structural re-generation (proves we can produce LOR's formatting from
 *      structure alone — this is what a real exporter must do)
 * Usage: node scripts/loredit-spike/roundtrip.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseXml, serializeXml, generateXml } from "./xml.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "test-fixtures", "Carol Of The Bells-Pentatonix-LOR-RGBPlus.loredit");
const OUT_DIR = path.join(here, "test-fixtures", "output");
fs.mkdirSync(OUT_DIR, { recursive: true });

const original = fs.readFileSync(FIXTURE);
const originalText = original.toString("utf8");
const doc = parseXml(originalText);

function compare(label, producedText) {
  const produced = Buffer.from(producedText, "utf8");
  console.log(`\n=== ${label} ===`);
  console.log(`original: ${original.length} bytes, produced: ${produced.length} bytes`);
  if (original.equals(produced)) {
    console.log("BYTE-IDENTICAL ✔");
    return;
  }
  // Locate differences
  const n = Math.min(original.length, produced.length);
  let diffs = 0;
  let i = 0;
  while (i < n && diffs < 10) {
    if (original[i] !== produced[i]) {
      diffs++;
      const from = Math.max(0, i - 60);
      console.log(`diff at byte ${i}:`);
      console.log(`  orig: …${JSON.stringify(originalText.slice(from, i + 60))}`);
      console.log(`  prod: …${JSON.stringify(producedText.slice(from, i + 60))}`);
      // resync: skip to next line boundary in both (crude but fine for a report)
      const nlO = original.indexOf(0x0a, i);
      const nlP = produced.indexOf(0x0a, i);
      if (nlO === -1 || nlP === -1) break;
      // If line counts stay aligned this works; otherwise report and stop.
      i = nlO;
      if (nlO !== nlP) {
        console.log(`  (line lengths diverge: next NL orig@${nlO} prod@${nlP} — stopping detailed scan)`);
        break;
      }
    }
    i++;
  }
  if (original.length !== produced.length) {
    console.log(`length difference: ${produced.length - original.length} bytes`);
  }
  console.log(`(reported first ${diffs} difference regions)`);
}

const t0 = Date.now();
const rawOut = serializeXml(doc);
console.log(`raw serialize: ${Date.now() - t0} ms`);
compare("Raw-preserving round-trip", rawOut);

const t1 = Date.now();
const genOut = generateXml(doc);
console.log(`\nstructural generate: ${Date.now() - t1} ms`);
fs.writeFileSync(path.join(OUT_DIR, "roundtrip-generated.loredit"), genOut);
compare("Structural re-generation", genOut);
