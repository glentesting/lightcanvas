/**
 * Dev utility: screenshot the /dev/stage night-stage harness.
 * Waits for the depth model + scene mount (the loading pill disappears and the
 * canvas fades in), then captures frames.
 *
 * Usage: node scripts/stage-screenshot.mjs [outPath] [url]
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const out = process.argv[2] ?? "dev-screenshots/stage.png";
const url = process.argv[3] ?? "http://localhost:3000/dev/stage";

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found");

fs.mkdirSync(out.split(/[\\/]/).slice(0, -1).join("/") || ".", { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: [
    "--window-size=1680,1000",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "--enable-features=Vulkan",
    "--no-sandbox",
  ],
  defaultViewport: { width: 1680, height: 1000 },
});

const page = await browser.newPage();
page.on("console", (m) => {
  const t = m.text();
  if (!t.includes("Download the React DevTools")) console.log("[page]", t.slice(0, 300));
});
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 500)));

console.log("Opening", url);
await page.goto(url, { waitUntil: "networkidle2", timeout: 120_000 });

// Dismiss the cookie banner if it shows up.
await page
  .evaluate(() => {
    for (const btn of document.querySelectorAll("button")) {
      if (/accept/i.test(btn.textContent ?? "")) {
        btn.click();
        return;
      }
    }
  })
  .catch(() => {});

// Wait for the scene canvas to be mounted and faded in (opacity 1 on wrapper).
console.log("Waiting for scene mount (depth model load + estimation)...");
await page.waitForFunction(
  () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return false;
    const wrapper = canvas.parentElement;
    return wrapper && getComputedStyle(wrapper).opacity === "1";
  },
  { timeout: 240_000, polling: 1000 }
);

// Let a few animation frames settle, then capture.
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: out });
console.log("Saved", out);

// A second frame a moment later to confirm animation is advancing.
await new Promise((r) => setTimeout(r, 2500));
const out2 = out.replace(/\.png$/, "-b.png");
await page.screenshot({ path: out2 });
console.log("Saved", out2);

await browser.close();
