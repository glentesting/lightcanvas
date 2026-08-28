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
  /** Set when the fixture was imported from a .loredit template — carries the
   *  real LOR addressing and makes export mapping automatic. */
  lor?: {
    /** PropClass/SeqProp GUID in the source template */
    propId: string;
    /** SeqProp name — the stable key the export mapping uses */
    propName: string;
    stringType: "Traditional" | "DumbRGB" | "RGB";
    network: string;
    /** LOR unit id, hex string (e.g. "0A") */
    unit: string;
    startCircuit: number;
    /** real channel count on the wire (Traditional/DumbRGB fixtures may use a
     *  larger display pixelCount so their outline reads in the preview) */
    channelCount: number;
  };
}

export interface FixtureGroup {
  id: string;
  name: string;
  fixtureIds: string[];
  color?: string;  // track color in timeline
}
