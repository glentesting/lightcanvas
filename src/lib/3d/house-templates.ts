/**
 * Parametric house templates for the 3D layout system.
 *
 * Coordinate convention:
 *   - House origin (0, 0, 0) sits at the front-center of the footprint on the ground.
 *   - X+ runs to the right along the front wall.
 *   - Z+ runs back into the scene (away from the viewer / camera).
 *   - Y+ is up.
 *
 * All units are meters. Wall offsets ("x" on a WindowSpec/DoorSpec) are
 * measured from the LEFT end of that wall (looking from outside in).
 */

import type {
  BushRowSpec,
  DoorSpec,
  GarageSpec,
  HouseTemplate3D,
  WindowSpec,
} from "./types";

// ---------------------------------------------------------------------------
// Colonial — classic two-story-ish look with peaked roof + two-car garage
// ---------------------------------------------------------------------------

const COLONIAL_WIDTH = 8;
const COLONIAL_DEPTH = 6;
const COLONIAL_WALL_HEIGHT = 3;

const colonialGarage: GarageSpec = {
  width: 3.2,
  depth: 5,
  // sit garage flush with the right end of the front wall
  offsetX: COLONIAL_WIDTH - 3.2,
  height: 2.4,
};

// 4 front windows (skip span occupied by garage + front door), 2 on each side
const colonialWindows: WindowSpec[] = [
  // front wall — left of the door
  { wall: "front", x: 0.6, y: 1.1, width: 0.9, height: 1.2 },
  { wall: "front", x: 1.8, y: 1.1, width: 0.9, height: 1.2 },
  // front wall — right of the door but to the left of the garage door
  { wall: "front", x: 3.4, y: 1.1, width: 0.9, height: 1.2 },
  // upper window above the entry
  { wall: "front", x: 2.55, y: 2.2, width: 0.9, height: 0.6 },
  // side walls
  { wall: "left", x: 1.5, y: 1.1, width: 0.9, height: 1.2 },
  { wall: "right", x: 1.5, y: 1.1, width: 0.9, height: 1.2 },
];

const colonialDoor: DoorSpec = {
  wall: "front",
  x: 2.7,
  width: 0.9,
  height: 2.1,
};

const colonialBushRow: BushRowSpec = {
  y: 0.6, // 0.6m in front of the front wall
  count: 6,
  spacing: 1.0,
};

const colonial: HouseTemplate3D = {
  id: "colonial",
  name: "Colonial",
  width: COLONIAL_WIDTH,
  depth: COLONIAL_DEPTH,
  wallHeight: COLONIAL_WALL_HEIGHT,
  roofPitch: 0.6,
  garage: colonialGarage,
  windows: colonialWindows,
  doors: [colonialDoor],
  bushRow: colonialBushRow,
};

// ---------------------------------------------------------------------------
// Modern — flat roof, single garage, larger glazing
// ---------------------------------------------------------------------------

const MODERN_WIDTH = 10;
const MODERN_DEPTH = 7;
const MODERN_WALL_HEIGHT = 3.2;

const modernGarage: GarageSpec = {
  width: 2.8,
  depth: 5.5,
  offsetX: MODERN_WIDTH - 2.8,
  height: 2.5,
};

const modernWindows: WindowSpec[] = [
  // big picture windows on the front
  { wall: "front", x: 0.6, y: 0.9, width: 2.2, height: 1.8 },
  { wall: "front", x: 3.2, y: 0.9, width: 2.2, height: 1.8 },
  { wall: "front", x: 5.8, y: 0.9, width: 1.2, height: 1.8 },
  // big side glazing
  { wall: "left", x: 1.2, y: 0.9, width: 1.6, height: 1.8 },
  { wall: "left", x: 3.4, y: 0.9, width: 1.6, height: 1.8 },
  { wall: "right", x: 1.2, y: 0.9, width: 1.6, height: 1.8 },
];

const modernDoor: DoorSpec = {
  wall: "front",
  x: 6.5,
  width: 1.0,
  height: 2.3,
};

const modernBushRow: BushRowSpec = {
  y: 0.8,
  count: 7,
  spacing: 1.2,
};

const modern: HouseTemplate3D = {
  id: "modern",
  name: "Modern",
  width: MODERN_WIDTH,
  depth: MODERN_DEPTH,
  wallHeight: MODERN_WALL_HEIGHT,
  roofPitch: 0,
  garage: modernGarage,
  windows: modernWindows,
  doors: [modernDoor],
  bushRow: modernBushRow,
};

// ---------------------------------------------------------------------------
// Cottage — small, steep roof, no garage
// ---------------------------------------------------------------------------

const COTTAGE_WIDTH = 6;
const COTTAGE_DEPTH = 5;
const COTTAGE_WALL_HEIGHT = 2.6;

const cottageWindows: WindowSpec[] = [
  { wall: "front", x: 0.7, y: 0.9, width: 1.0, height: 1.2 },
  { wall: "front", x: 4.3, y: 0.9, width: 1.0, height: 1.2 },
  { wall: "left", x: 1.8, y: 0.9, width: 0.9, height: 1.1 },
  { wall: "right", x: 1.8, y: 0.9, width: 0.9, height: 1.1 },
];

const cottageDoor: DoorSpec = {
  wall: "front",
  x: 2.5,
  width: 1.0,
  height: 2.0,
};

const cottageBushRow: BushRowSpec = {
  y: 0.5,
  count: 4,
  spacing: 1.2,
};

const cottage: HouseTemplate3D = {
  id: "cottage",
  name: "Cottage",
  width: COTTAGE_WIDTH,
  depth: COTTAGE_DEPTH,
  wallHeight: COTTAGE_WALL_HEIGHT,
  roofPitch: 0.9,
  garage: null,
  windows: cottageWindows,
  doors: [cottageDoor],
  bushRow: cottageBushRow,
};

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export const HOUSE_TEMPLATES: Record<string, HouseTemplate3D> = {
  colonial,
  modern,
  cottage,
};

export const HOUSE_TEMPLATE_LIST: HouseTemplate3D[] = Object.values(HOUSE_TEMPLATES);

export function getHouseTemplate(id: string): HouseTemplate3D {
  const tpl = HOUSE_TEMPLATES[id];
  if (!tpl) {
    throw new Error(
      `Unknown house template id "${id}". Known ids: ${Object.keys(HOUSE_TEMPLATES).join(", ")}`,
    );
  }
  return tpl;
}
