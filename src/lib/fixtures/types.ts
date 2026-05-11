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
  layout?: {
    points: Array<{ x: number; y: number }>;
    closed?: boolean;
  };
  groupId?: string;
}

export interface FixtureGroup {
  id: string;
  name: string;
  fixtureIds: string[];
  color?: string;  // track color in timeline
}
