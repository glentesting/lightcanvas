import type { Scene3DConfig, Vec3 } from "./types";

/** Ground grid extent in meters (square: GRID_SIZE x GRID_SIZE). */
export const GRID_SIZE = 30;

/** Grid cell size in meters. */
export const CELL_SIZE = 1;

/** All house templates use these as their base unit (1 unit = 1 meter). */
export const HOUSE_SCALE = 1;

export const DEFAULT_CAMERA_POSITION: Vec3 = { x: 0, y: 8, z: 14 };
export const DEFAULT_CAMERA_TARGET: Vec3 = { x: 0, y: 2, z: 0 };

/** Anchor snap radius in meters. */
export const ANCHOR_SNAP_RADIUS = 0.6;

/** Grid snap step in meters. */
export const GRID_SNAP_STEP = 0.5;

/** Polar angle limits in radians — keep camera between roughly 15° and 80° above ground. */
export const MIN_POLAR_ANGLE = (15 * Math.PI) / 180;
export const MAX_POLAR_ANGLE = (80 * Math.PI) / 180;

/** Warm cream wall material color. */
export const COLOR_WALL = "#F5F0E8";
/** Roof tile color. */
export const COLOR_ROOF = "#8B7355";
/** Garage door panel color. */
export const COLOR_GARAGE = "#E8E2D5";
/** Window pane tint. */
export const COLOR_WINDOW = "#D6E8F0";
/** Front door wood tone. */
export const COLOR_DOOR = "#8B4513";
/** Bush foliage color. */
export const COLOR_BUSH = "#2D5016";
/** Ground / lawn color. */
export const COLOR_GROUND = "#A8C896";
/** Grid line color on ground. */
export const COLOR_GRID = "#7BA070";
/** Warm amber highlight for selection & anchor visualizer. */
export const COLOR_HIGHLIGHT = "#FFB347";

export const DEFAULT_SCENE_CONFIG: Scene3DConfig = {
  gridSize: GRID_SIZE,
  cellSize: CELL_SIZE,
  cameraPosition: DEFAULT_CAMERA_POSITION,
  cameraTarget: DEFAULT_CAMERA_TARGET,
  ambientIntensity: 0.55,
  directionalIntensity: 0.85,
  fogNear: 18,
  fogFar: 55,
};
