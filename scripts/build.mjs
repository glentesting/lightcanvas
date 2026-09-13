/**
 * Production build / start, kept out of the dev server's way.
 *
 * `next dev` owns `.next`. A production build writes a completely different
 * set of files into the same folder, and if it does that while the dev
 * server is running, the dev server is left rebuilding forever — the app
 * hangs on "Loading project..." and nothing says why. That happened on
 * 2026-09-12 and cost the owner two days of a broken app.
 *
 * So builds go to `.next-build` instead, via NEXT_BUILD_DIR, which
 * next.config.ts reads. `npm run build` and `npm run start` both come
 * through here so they always agree on the directory.
 *
 *   node scripts/build.mjs build
 *   node scripts/build.mjs start
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const command = process.argv[2] === "start" ? "start" : "build";

// Run Next's own CLI with this same node binary. Going through `npx` needs a
// Windows shim that does not always forward stdio, which made a failing
// build look like a build that printed nothing at all.
const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");

const result = spawnSync(process.execPath, [nextCli, command, ...process.argv.slice(3)], {
  stdio: "inherit",
  env: { ...process.env, NEXT_BUILD_DIR: process.env.NEXT_BUILD_DIR || ".next-build" },
});

if (result.error) {
  console.error("Could not start the Next build:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
