/**
 * Fixture → template-prop mapping for the .loredit exporter.
 *
 * The mapping is keyed by LightCanvas fixture id and stores the template
 * SeqProp *name* (names are human-readable and stable across template
 * re-saves; ids are GUIDs that differ between templates). The user confirms
 * the mapping once in the export dialog and it persists on the sequence.
 *
 * Default seeding follows the owner's real hardware (see
 * LIGHTCANVAS-HARDWARE-REFERENCE.md §5) against the RGBPlus layout that all
 * eight purchased sequences embed:
 *   - 8 mini trees   → "RGB Mini Tree Base 01"…"08"  (Pixie16 @ 09, ports 1–8)
 *   - 8 arches       → "RGB Arch 01"…"08"            (ports 9–12)
 *   - 40 stakes      → "RGB Pixel Stake 01"…"40"     (ports 13–16)
 *   - AC fixtures    → the 16 CTB16 circuits, in RGBPlus circuit order:
 *                      Top Window 01–04, Bottom Window 01–04, Columns 01–04,
 *                      Railing 01–04. (Glen's physical AC is roofline/ridges/
 *                      peaks — the names won't match reality but the circuits
 *                      fire; known mismatch, hardware doc §5.)
 */

import type { Fixture } from "@/lib/fixtures/types";
import type { TemplateProp } from "./template";

/** fixtureId → template SeqProp name */
export type LoreditPropMap = Record<string, string>;

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * The unit-01 CTB16 props in circuit order (1–16) as named in the RGBPlus
 * layout. Matched as prefixes because the full names carry suffixes like
 * "01.01 AC Top Window 01-Group A".
 */
function acCircuitPrefixes(): string[] {
  const names: string[] = [];
  for (let i = 1; i <= 4; i++) names.push(`01.${pad2(i)} AC Top Window`);
  for (let i = 5; i <= 8; i++) names.push(`01.${pad2(i)} AC Bottom Window`);
  for (let i = 9; i <= 12; i++) names.push(`01.${pad2(i)} AC Columns`);
  for (let i = 13; i <= 16; i++) names.push(`01.${pad2(i)} AC Railing`);
  return names;
}

function findByPrefix(props: TemplateProp[], prefix: string): TemplateProp | undefined {
  return props.find((p) => p.name.startsWith(prefix));
}

function findExact(props: TemplateProp[], name: string): TemplateProp | undefined {
  return props.find((p) => p.name === name);
}

/**
 * Seed a default mapping for fixtures that don't have one yet.
 * Existing entries in `current` are preserved; fixtures that can't be
 * confidently matched stay unmapped (the exporter skips them and reports it).
 */
export function seedDefaultMapping(
  fixtures: Fixture[],
  props: TemplateProp[],
  current: LoreditPropMap = {}
): LoreditPropMap {
  const map: LoreditPropMap = {};
  // keep confirmed entries that still exist in this template
  for (const [fixtureId, propName] of Object.entries(current)) {
    if (findExact(props, propName)) map[fixtureId] = propName;
  }

  const taken = new Set(Object.values(map));
  const claim = (fixture: Fixture, prop: TemplateProp | undefined) => {
    if (!prop || taken.has(prop.name)) return;
    map[fixture.id] = prop.name;
    taken.add(prop.name);
  };

  // 1) exact name match wins (user named fixtures after template props)
  for (const f of fixtures) {
    if (map[f.id]) continue;
    claim(f, findExact(props, f.name));
  }

  // 2) kind-based ordinal seeding
  const acPool = acCircuitPrefixes();
  let acNext = 0;
  const ordinals: Record<string, number> = {};
  const nextOrdinal = (kind: string) => (ordinals[kind] = (ordinals[kind] ?? 0) + 1);

  for (const f of fixtures) {
    if (map[f.id]) continue;
    switch (f.kind) {
      case "mini-tree": {
        const n = nextOrdinal("mini-tree");
        claim(f, findExact(props, `RGB Mini Tree Base ${pad2(n)}`));
        break;
      }
      case "arch": {
        const n = nextOrdinal("arch");
        claim(f, findExact(props, `RGB Arch ${pad2(n)}`));
        break;
      }
      case "mega-tree": {
        for (const name of ["RGB Tree 16x25-360", "RGB Tree 32x50-360", "RGB Tree 16x50-180"]) {
          const p = findExact(props, name);
          if (p && !taken.has(p.name)) {
            claim(f, p);
            break;
          }
        }
        break;
      }
      case "matrix": {
        claim(f, findByPrefix(props, "RGB Matrix"));
        break;
      }
      case "bush": {
        const n = nextOrdinal("bush");
        claim(f, findExact(props, `RGB Pixel Stake ${pad2(n)}`));
        break;
      }
      case "roofline":
      case "window-outline": {
        // Glen's rooflines/ridges/peaks are AC circuits on the CTB16 @ unit 01.
        while (acNext < acPool.length) {
          const p = findByPrefix(props, acPool[acNext++]);
          if (p && !taken.has(p.name)) {
            claim(f, p);
            break;
          }
        }
        break;
      }
      default:
        // custom — no confident default; leave unmapped for the user to pick
        break;
    }
  }

  return map;
}
