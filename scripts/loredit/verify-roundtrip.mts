/**
 * Verifies the promoted exporter code (src/lib/exports/loredit/) still
 * round-trips real .loredit files byte-identically — the spike's guarantee,
 * re-proven against the refactored library.
 *
 * Runs every *.loredit in scripts/loredit-spike/test-fixtures/ (gitignored
 * paid content) through:
 *   1. raw-preserving serialize  (parser loses nothing)
 *   2. structural regeneration   (we can emit LOR's format from structure)
 *
 * Usage: npx tsx scripts/loredit/verify-roundtrip.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseXml, serializeXml, generateXml } from "../../src/lib/exports/loredit/xml";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(here, "..", "loredit-spike", "test-fixtures");

const files = fs
  .readdirSync(FIXTURE_DIR)
  .filter((f) => f.toLowerCase().endsWith(".loredit"))
  .map((f) => path.join(FIXTURE_DIR, f));

if (files.length === 0) {
  console.error(`No .loredit fixtures found in ${FIXTURE_DIR}`);
  process.exit(1);
}

let failures = 0;
for (const file of files) {
  const original = fs.readFileSync(file);
  const text = original.toString("utf8");
  const t0 = Date.now();
  const doc = parseXml(text);
  const raw = Buffer.from(serializeXml(doc), "utf8");
  const gen = Buffer.from(generateXml(doc), "utf8");
  const rawOk = original.equals(raw);
  const genOk = original.equals(gen);
  if (!rawOk || !genOk) failures++;
  console.log(
    `${path.basename(file)} (${(original.length / 1e6).toFixed(2)} MB, ${Date.now() - t0} ms): ` +
      `raw=${rawOk ? "BYTE-IDENTICAL" : "FAIL"} structural=${genOk ? "BYTE-IDENTICAL" : "FAIL"}`
  );
  if (!genOk) {
    const n = Math.min(original.length, gen.length);
    for (let i = 0; i < n; i++) {
      if (original[i] !== gen[i]) {
        console.log(`  first diff at byte ${i}:`);
        console.log(`  orig: ${JSON.stringify(text.slice(Math.max(0, i - 50), i + 50))}`);
        console.log(`  gen : ${JSON.stringify(gen.toString("utf8").slice(Math.max(0, i - 50), i + 50))}`);
        break;
      }
    }
    if (original.length !== gen.length) console.log(`  length delta: ${gen.length - original.length}`);
  }
}

process.exit(failures ? 1 : 0);
