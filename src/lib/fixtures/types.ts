export type FixtureKind =
  | "roofline"
  | "mega-tree"
  | "mini-tree"
  | "arch"
  | "bush"
  | "window-outline"
  | "custom";

export interface Fixture {
  id: string;
  kind: FixtureKind;
  name: string;
  pixelCount: number;
  startChannel: number;
  universe?: number;
  direction?: "ltr" | "rtl";
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
}
