import fs from "node:fs";
import puppeteer from "puppeteer-core";

const out = process.argv[2] ?? "dev-screenshots/visualizer-v2.png";
const url = process.argv[3] ?? "http://localhost:3000/dev/visualizer-v2";
const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = chromePaths.find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error("No Chrome or Edge installation found");

fs.mkdirSync(out.split(/[\\/]/).slice(0, -1).join("/") || ".", { recursive: true });
const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  defaultViewport: { width: 1680, height: 1000 },
  args: ["--window-size=1680,1000", "--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (error) => console.error("[pageerror]", String(error)));
await page.goto(url, { waitUntil: "networkidle2", timeout: 120_000 });
await page.waitForSelector("canvas", { timeout: 30_000 });
await new Promise((resolve) => setTimeout(resolve, 2500));
await page.screenshot({ path: out });
console.log(`Saved ${out}`);
await browser.close();
