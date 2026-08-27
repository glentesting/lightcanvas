/**
 * Task 1: parse the reference .loredit and report structure statistics.
 * Usage: node scripts/loredit-spike/inventory.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseXml, attr, walk, findChild } from "./xml.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "test-fixtures", "Carol Of The Bells-Pentatonix-LOR-RGBPlus.loredit");

const t0 = Date.now();
const text = fs.readFileSync(FIXTURE, "utf8");
const doc = parseXml(text);
const root = doc.root.children.find((c) => c.name === "sequence");
console.log(`Parsed ${(text.length / 1e6).toFixed(1)} MB in ${Date.now() - t0} ms`);
console.log(`BOM: ${doc.bom}, decl: ${doc.decl}`);
console.log(`Root <${root.name}> attrs:`);
for (const [k, v] of root.attrs) console.log(`  ${k} = ${v.length > 80 ? v.slice(0, 80) + "…" : v}`);

// --- top-level children ---
console.log("\nRoot children (in order):");
for (const c of root.children.filter((c) => c.name)) {
  console.log(`  <${c.name}> selfClosing=${c.selfClosing} childElements=${c.children.filter((x) => x.name).length}`);
}

// --- element/attribute schema inventory ---
const schema = new Map(); // elementName -> Map<attrName, {count, example}>
const elementCounts = new Map();
walk(root, (node, pathArr) => {
  const key = node.name;
  elementCounts.set(key, (elementCounts.get(key) ?? 0) + 1);
  if (!schema.has(key)) schema.set(key, new Map());
  const attrs = schema.get(key);
  for (const [k, v] of node.attrs) {
    if (!attrs.has(k)) attrs.set(k, { count: 0, example: v });
    attrs.get(k).count++;
  }
});

console.log("\nElement inventory (name: count — attributes):");
for (const [name, count] of [...elementCounts.entries()].sort((a, b) => b[1] - a[1])) {
  const attrs = [...schema.get(name).entries()]
    .map(([k, { count: c, example }]) => `${k}${c < count ? `(${c}/${count})` : ""}`)
    .join(", ");
  console.log(`  ${name}: ${count}\n     ${attrs || "(no attrs)"}`);
}

// --- props by StringType ---
const preview = findChild(root, "PreviewClass");
const byStringType = new Map();
const byDeviceType = new Map();
const networks = new Map();
walk(preview, (node) => {
  if (node.name !== "PropClass") return;
  const st = attr(node, "StringType") ?? "(none)";
  const dt = attr(node, "DeviceType") ?? "(none)";
  byStringType.set(st, (byStringType.get(st) ?? 0) + 1);
  byDeviceType.set(dt, (byDeviceType.get(dt) ?? 0) + 1);
  const grid = attr(node, "ChannelGrid");
  if (grid) {
    for (const part of grid.split(";")) {
      const net = part.split(",")[0];
      networks.set(net, (networks.get(net) ?? 0) + 1);
    }
  }
});
console.log("\nPropClass by StringType:", Object.fromEntries(byStringType));
console.log("PropClass by DeviceType:", Object.fromEntries(byDeviceType));
console.log("ChannelGrid segments by Network:", Object.fromEntries(networks));

// --- SequenceProps / effects ---
const seqProps = findChild(root, "SequenceProps");
let seqPropCount = 0;
let channelCount = 0;
let effectCount = 0;
const settingsPrefixes = new Map();
const motionEffectNames = new Map();
const mixModes = new Map();
const effectAttrSets = new Map();
walk(seqProps, (node) => {
  if (node.name === "SeqProp") seqPropCount++;
  if (node.name === "channel") channelCount++;
  if (node.name === "effect") {
    effectCount++;
    const keys = node.attrs.map(([k]) => k).join(",");
    effectAttrSets.set(keys, (effectAttrSets.get(keys) ?? 0) + 1);
    const settings = attr(node, "settings") ?? "(none)";
    if (settings.includes("|")) {
      const mix = settings.split("|")[0];
      mixModes.set(mix, (mixModes.get(mix) ?? 0) + 1);
      for (const m of settings.matchAll(/lightorama_([a-z0-9]+):/g)) {
        motionEffectNames.set(m[1], (motionEffectNames.get(m[1]) ?? 0) + 1);
      }
      settingsPrefixes.set("(motion effect)", (settingsPrefixes.get("(motion effect)") ?? 0) + 1);
    } else {
      settingsPrefixes.set(settings, (settingsPrefixes.get(settings) ?? 0) + 1);
    }
  }
});
console.log(`\nSeqProp count: ${seqPropCount}, channel count: ${channelCount}, effect count: ${effectCount}`);
console.log("settings values:", Object.fromEntries(settingsPrefixes));
console.log("motion mix modes:", Object.fromEntries(mixModes));
console.log("motion effect names:", Object.fromEntries(motionEffectNames));
console.log("effect attribute combinations:");
for (const [keys, n] of effectAttrSets) console.log(`  [${keys}]: ${n}`);

// --- timing grids ---
const grids = findChild(root, "TimingGrids");
for (const g of grids.children.filter((c) => c.name)) {
  const marks = g.children.filter((c) => c.name === "timing").length;
  console.log(`\n<${g.name}> attrs=${JSON.stringify(Object.fromEntries(g.attrs.map(([k, v]) => [k, v])))} timing marks=${marks}`);
}

// --- other top-level sections, brief ---
for (const name of ["BeatChannels", "Subsequences", "ArchivedProps", "RgbAggregates", "BeatView", "PropViews", "MotionPaks", "pictures"]) {
  const n = findChild(root, name);
  if (!n) { console.log(`\n<${name}> MISSING`); continue; }
  const kids = n.children.filter((c) => c.name);
  console.log(`\n<${name}>: ${kids.length} child elements${kids.length ? ` (first: <${kids[0].name}>)` : ""}`);
}
