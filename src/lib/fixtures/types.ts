export type FixtureKind =
  | "roofline"
  | "mega-tree"
  | "mini-tree"
  | "arch"
  | "bush"
  | "window-outline"
  | "matrix"
  | "custom";

export interface FixtureGeometry {
  // Matrix
  rows?: number;
  cols?: number;
  wiringDirection?: "horizontal" | "vertical";
  wiringPattern?: "linear" | "alternating";
  startCorner?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  // Tree
  strandCount?: number;
  pixelsPerStrand?: number;
  strandDirection?: "topDown" | "bottomUp";
  rotationDirection?: "clockwise" | "counterClockwise";
  // Arch
  curveOrientation?: "leftArch" | "rightArch" | "mirrored";
  startEnd?: "left" | "right";
}

export interface Fixture {
  id: string;
  kind: FixtureKind;
  name: string;
  pixelCount: number;
  startChannel: number;
  universe?: number;
  direction?: "ltr" | "rtl";
  geometry?: FixtureGeometry;
  /** Legacy 2D layout (SVG editor) — kept for backward compatibility. */
  layout?: {
    points: Array<{ x: number; y: number }>;
    closed?: boolean;
  };
  /** 3D placement: ordered world-space waypoints (meters). Populated by the
   * 3D layout view. Optional; absent until the user places the fixture in 3D. */
  layout3d?: {
    points: Array<{ x: number; y: number; z: number }>;
    closed?: boolean;
    anchorSurfaceId?: string;
    rotation?: { x: number; y: number; z: number };
  };
  groupId?: string;
}

export interface FixtureGroup {
  id: string;
  name: string;
  fixtureIds: string[];
  color?: string;  // track color in timeline
}
