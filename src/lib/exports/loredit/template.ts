/**
 * Template loading for the .loredit exporter.
 *
 * Strategy (proven by the Aug 2026 spike): we never synthesize PropClass
 * geometry. The user supplies an existing .loredit whose PreviewClass already
 * describes their display (any purchased RGBPlus sequence works). We keep
 * PreviewClass and TimingGrids verbatim, strip every effect, and write new
 * ones onto the props the user mapped.
 *
 * Templates are paid content: they are never bundled, committed, or read from
 * a hardcoded path. The file comes in as text from a user-supplied File.
 */

import { parseXml, attr, findChild, findChildren, isElement } from "./xml";
import type { XmlDocument, XmlElement } from "./xml";

export type LorStringType = "Traditional" | "DumbRGB" | "RGB";

/** One mappable prop in the template (a SeqProp backed by a PropClass). */
export interface TemplateProp {
  /** GUID shared by the PropClass and its SeqProp */
  id: string;
  name: string;
  stringType: LorStringType;
  /** The row grammar this prop's effects must use. Absolute rule — never mixed. */
  rowType: "channel" | "track";
  /** Network,Unit(hex),StartChannel,EndChannel,?,Color — semicolon-joined for multi-string props */
  channelGrid: string;
  /** Number of <channel> rows (Traditional/DumbRGB) */
  channelRowCount: number;
  /** Names of <track> rows (RGB pixel props); first row is the whole prop */
  trackNames: string[];
}

export interface LoreditTemplate {
  doc: XmlDocument;
  /** The <sequence> root element */
  sequence: XmlElement;
  /** Mappable props, in file order */
  props: TemplateProp[];
  /** Number of timing marks in the first TimingGridFree */
  timingMarkCount: number;
}

const STRING_TYPES = new Set(["Traditional", "DumbRGB", "RGB"]);

export function parseTemplate(text: string): LoreditTemplate {
  const doc = parseXml(text);
  const sequence = findChild(doc.root, "sequence");
  if (!sequence) throw new Error("Not a .loredit file: missing <sequence> root");
  const version = attr(sequence, "saveFileVersion");
  if (version !== "15") {
    throw new Error(`Unsupported saveFileVersion "${version}" (expected 15 — LOR S5/S6)`);
  }
  const preview = findChild(sequence, "PreviewClass");
  const seqProps = findChild(sequence, "SequenceProps");
  if (!preview || !seqProps) {
    throw new Error("Not a usable template: missing PreviewClass or SequenceProps");
  }

  const propClassById = new Map<string, XmlElement>();
  for (const pc of findChildren(preview, "PropClass")) {
    const id = attr(pc, "id");
    if (id) propClassById.set(id, pc);
  }

  const props: TemplateProp[] = [];
  for (const sp of findChildren(seqProps, "SeqProp")) {
    const id = attr(sp, "id") ?? "";
    const pc = propClassById.get(id);
    if (!pc) continue; // PropGroups have SeqProps too; they are not mapping targets
    const stringType = attr(pc, "StringType") ?? "";
    if (!STRING_TYPES.has(stringType)) continue;
    const channelRows = findChildren(sp, "channel");
    const trackRows = findChildren(sp, "track");
    props.push({
      id,
      name: attr(sp, "name") ?? attr(pc, "Name") ?? id,
      stringType: stringType as LorStringType,
      rowType: stringType === "RGB" ? "track" : "channel",
      channelGrid: attr(pc, "ChannelGrid") ?? "",
      channelRowCount: channelRows.length,
      trackNames: trackRows.map((t) => attr(t, "name") ?? ""),
    });
  }

  const grids = findChild(sequence, "TimingGrids");
  const freeGrid = grids ? findChildren(grids, "TimingGridFree")[0] : undefined;
  const timingMarkCount = freeGrid ? findChildren(freeGrid, "timing").length : 0;

  return { doc, sequence, props, timingMarkCount };
}

/**
 * Delete every effect from every row of every SeqProp. Emptied rows become
 * self-closing, matching how LOR itself writes unused rows.
 * Returns the number of effects removed.
 */
export function stripAllEffects(template: LoreditTemplate): number {
  const seqProps = findChild(template.sequence, "SequenceProps");
  if (!seqProps) return 0;
  let stripped = 0;
  for (const sp of findChildren(seqProps, "SeqProp")) {
    for (const row of sp.children.filter(isElement)) {
      if (row.name !== "channel" && row.name !== "track") continue;
      const before = row.children.filter((c) => isElement(c) && c.name === "effect").length;
      stripped += before;
      row.children = row.children.filter((c) => isElement(c) && c.name !== "effect");
      if (row.children.length === 0) {
        row.selfClosing = true;
      }
    }
  }
  return stripped;
}
