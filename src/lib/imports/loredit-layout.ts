/**
 * Layout import from a .loredit template.
 *
 * Every purchased sequence embeds the full display definition: 265 PropClass
 * elements with names, StringType, ChannelGrid addressing, and shape
 * geometry. This module parses PreviewClass into importable prop descriptors
 * and turns selected ones into LightCanvas fixtures — real pixel counts, real
 * unit/circuit addressing, real shapes — so the owner's display exists in the
 * app and export mapping becomes automatic.
 *
 * Templates are paid content: the file always arrives through a user file
 * picker, never a hardcoded path.
 */

import type { Fixture, FixtureKind } from "@/lib/fixtures/types";
import { parseXml, attr, findChild, findChildren } from "@/lib/exports/loredit/xml";

export interface ImportableProp {
  /** PropClass id — same GUID as the SeqProp the exporter fills */
  id: string;
  name: string;
  stringType: "Traditional" | "DumbRGB" | "RGB";
  network: string;
  unit: string;
  startCircuit: number;
  /** total channels across all ChannelGrid segments */
  channelCount: number;
  /** real pixels for RGB props (channels/3); display bulbs for channel props */
  pixelCount: number;
  kind: FixtureKind;
  /** stage-space (720×420) shape points; empty = position-only prop */
  points: Array<{ x: number; y: number }>;
  closed: boolean;
  /** single anchor position in stage space (used when points is empty) */
  anchor: { x: number; y: number };
  /** picker group key */
  group: string;
  /** true for the props the hardware reference says the owner owns */
  preselected: boolean;
}

export interface PropPickerGroup {
  key: string;
  label: string;
  props: ImportableProp[];
}

const STRING_TYPES = new Set(["Traditional", "DumbRGB", "RGB"]);

/** LOR preview space is [-1,1]² with y up; the stage is 720×420 with y down. */
function toStage(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(((x + 1) / 2) * 720 * 10) / 10,
    y: Math.round(((1 - y) / 2) * 420 * 10) / 10,
  };
}

/** The props the hardware reference (§5) says the owner physically has. */
function isOwnedProp(name: string): boolean {
  if (/^RGB Mini Tree (Base|Star) 0[1-8]$/.test(name)) return true;
  if (/^RGB Arch 0[1-8]$/.test(name)) return true;
  if (/^RGB Pixel Stake \d{2}$/.test(name)) return true;
  // one whole-tree outline per singing character; mouths/eyes stay optional
  if (/^FaceV2-(Elden|Felix|Ralphie|Zuzu) Tree Outline$/.test(name)) return true;
  if (/^01\.(0[1-9]|1[0-6]) AC /.test(name)) return true;
  return false;
}

function classifyKind(name: string, stringType: string): FixtureKind {
  const n = name.toLowerCase();
  if (/mini tree base/.test(n)) return "mini-tree";
  if (/arch/.test(n)) return "arch";
  if (/pixel stake/.test(n)) return "bush";
  if (/roofline/.test(n)) return "roofline";
  if (/matrix/.test(n)) return "matrix";
  if (/rgb tree/.test(n)) return "mega-tree";
  if (/window/.test(n)) return "window-outline";
  if (stringType === "Traditional") return "roofline";
  return "custom";
}

function pickerGroup(name: string, stringType: string): { key: string; label: string } {
  if (/^RGB Mini Tree/.test(name)) return { key: "mini-trees", label: "Mini Trees (bases + stars)" };
  if (/^RGB Arch/.test(name)) return { key: "arches", label: "Arches" };
  if (/^RGB Pixel Stake/.test(name)) return { key: "stakes", label: "Pixel Stakes" };
  if (/^FaceV2-.* (Tree Outline|Bow)$/.test(name)) return { key: "faces", label: "Singing Faces (tree outlines)" };
  if (/^FaceV2-/.test(name)) return { key: "face-parts", label: "Singing Face details (eyes, mouths)" };
  if (/^Face-/.test(name)) return { key: "faces-v1", label: "Singing Faces V1 (legacy)" };
  if (/^01\./.test(name)) return { key: "ac-unit-01", label: "AC Circuits — Unit 01 (the CTB16)" };
  if (stringType === "Traditional") return { key: "ac-other", label: "AC Circuits — other controllers (not owned)" };
  if (/^RGB Roofline/.test(name)) return { key: "rooflines-rgb", label: "RGB Rooflines (not owned)" };
  if (/^RGB Tree /.test(name)) return { key: "mega-trees", label: "Mega Trees (not owned)" };
  if (stringType === "DumbRGB") return { key: "dumb-rgb", label: "Dumb RGB props (floods, legacy)" };
  return { key: "other-rgb", label: "Other RGB props (not owned)" };
}

const GROUP_ORDER = [
  "mini-trees", "arches", "stakes", "faces", "ac-unit-01",
  "face-parts", "faces-v1", "mega-trees", "rooflines-rgb",
  "other-rgb", "dumb-rgb", "ac-other",
];

/** Parse a .loredit template's PreviewClass into grouped, importable props. */
export function parseLoreditLayout(templateText: string): PropPickerGroup[] {
  const doc = parseXml(templateText);
  const sequence = findChild(doc.root, "sequence");
  if (!sequence) throw new Error("Not a .loredit file: missing <sequence> root");
  const preview = findChild(sequence, "PreviewClass");
  if (!preview) throw new Error("Template has no PreviewClass (display layout)");

  const props: ImportableProp[] = [];
  for (const pc of findChildren(preview, "PropClass")) {
    const id = attr(pc, "id");
    const name = attr(pc, "Name");
    const stringType = attr(pc, "StringType") ?? "";
    const grid = attr(pc, "ChannelGrid") ?? "";
    if (!id || !name || !STRING_TYPES.has(stringType) || !grid) continue;

    // ChannelGrid: Network,Unit(hex),StartChannel,EndChannel,?,Color — ";"-joined
    const segments = grid.split(";").map((s) => s.split(","));
    const first = segments[0];
    if (!first || first.length < 4) continue;
    const channelCount = segments.reduce((sum, seg) => {
      const start = parseInt(seg[2], 10);
      const end = parseInt(seg[3], 10);
      return sum + (Number.isFinite(start) && Number.isFinite(end) ? end - start + 1 : 0);
    }, 0);
    if (channelCount <= 0) continue;

    // shape: explicit point list, or a parametric shape with an offset anchor
    const shape = findChild(pc, "shape");
    let points: Array<{ x: number; y: number }> = [];
    let closed = false;
    let anchor = { x: 360, y: 210 };
    if (shape) {
      const rawPts = findChildren(shape, "point")
        .map((p) => ({ x: parseFloat(attr(p, "x") ?? ""), y: parseFloat(attr(p, "y") ?? "") }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (rawPts.length >= 2) {
        points = rawPts.map((p) => toStage(p.x, p.y));
        const firstPt = points[0];
        const lastPt = points[points.length - 1];
        if (points.length > 2 && Math.hypot(firstPt.x - lastPt.x, firstPt.y - lastPt.y) < 1) {
          points = points.slice(0, -1);
          closed = true;
        }
        anchor = {
          x: points.reduce((s, p) => s + p.x, 0) / points.length,
          y: points.reduce((s, p) => s + p.y, 0) / points.length,
        };
      } else {
        const ox = parseFloat(attr(shape, "OffsetX") ?? "");
        const oy = parseFloat(attr(shape, "OffsetY") ?? "");
        if (Number.isFinite(ox) && Number.isFinite(oy)) anchor = toStage(ox, oy);
        // Firestick stakes read as short vertical sticks rather than blobs
        if ((attr(shape, "ShapeName") ?? "").toLowerCase() === "firestick") {
          points = [
            { x: anchor.x, y: anchor.y },
            { x: anchor.x, y: anchor.y - 12 },
          ];
        }
      }
    }

    // Real pixels for RGB; channel props get display bulbs along their outline
    // (the wire truth stays in channelCount — an AC circuit is one dimmer).
    let pixelCount: number;
    if (stringType === "RGB") {
      pixelCount = Math.max(1, Math.round(channelCount / 3));
    } else if (points.length >= 2) {
      let len = 0;
      const verts = closed ? [...points, points[0]] : points;
      for (let i = 0; i < verts.length - 1; i++) {
        len += Math.hypot(verts[i + 1].x - verts[i].x, verts[i + 1].y - verts[i].y);
      }
      pixelCount = Math.max(6, Math.min(60, Math.round(len / 6)));
    } else {
      pixelCount = 8;
    }

    const group = pickerGroup(name, stringType);
    props.push({
      id,
      name,
      stringType: stringType as ImportableProp["stringType"],
      network: first[0],
      unit: first[1],
      startCircuit: parseInt(first[2], 10) || 1,
      channelCount,
      pixelCount,
      kind: classifyKind(name, stringType),
      points,
      closed,
      anchor,
      group: group.key,
      preselected: isOwnedProp(name),
    });
  }

  // group + sort: preselected groups first, props in natural name order
  const byGroup = new Map<string, PropPickerGroup>();
  for (const p of props) {
    const meta = pickerGroup(p.name, p.stringType);
    let g = byGroup.get(meta.key);
    if (!g) {
      g = { key: meta.key, label: meta.label, props: [] };
      byGroup.set(meta.key, g);
    }
    g.props.push(p);
  }
  const groups = [...byGroup.values()];
  for (const g of groups) {
    g.props.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }
  groups.sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.key);
    const bi = GROUP_ORDER.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return groups;
}

/** Turn a selected prop into a LightCanvas fixture. */
export function propToFixture(p: ImportableProp): Fixture {
  return {
    id: crypto.randomUUID(),
    kind: p.kind,
    name: p.name,
    pixelCount: p.pixelCount,
    startChannel: p.startCircuit,
    layout: {
      points: p.points.length >= 2 ? p.points : [p.anchor],
      closed: p.closed,
    },
    lor: {
      propId: p.id,
      propName: p.name,
      stringType: p.stringType,
      network: p.network,
      unit: p.unit,
      startCircuit: p.startCircuit,
      channelCount: p.channelCount,
    },
  };
}
