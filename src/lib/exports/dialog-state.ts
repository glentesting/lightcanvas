import type { FrameTimeMs } from "@/lib/exports/xlights";

export type ExportFormat = "lightcanvas-json" | "xlights" | "lor" | "video";

export type ExportStep =
  | "options"
  | "name-mapping"
  | "lor-degraded"
  | "lor-mapping";

export type RangeMode = "full" | "custom";

export type VideoQuality = "low" | "med" | "high";

export type VideoResolution = "720p" | "1080p";

export function getDefaultFormat(sequencer?: string): ExportFormat {
  if (sequencer === "lor") return "lor";
  return "xlights"; // xlights, vixen, other, or unset all default to xlights
}

export const FRAME_TIME_OPTIONS: Array<{ value: FrameTimeMs; label: string }> = [
  { value: 20, label: "20ms (50fps)" },
  { value: 25, label: "25ms (40fps)" },
  { value: 40, label: "40ms (25fps)" },
  { value: 50, label: "50ms (20fps)" },
];

export const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  desc: string;
}[] = [
  {
    value: "lightcanvas-json",
    label: "LightCanvas JSON",
    desc: "Full project file — re-importable into LightCanvas",
  },
  {
    value: "xlights",
    label: "xLights Package (.zip)",
    desc: "ZIP with .xsq, models, audio, and README for xLights",
  },
  {
    value: "lor",
    label: "Light-O-Rama (.lms)",
    desc: "Open in LOR Sequence Editor with channels and timing",
  },
  {
    value: "video",
    label: "Preview Video (WebM)",
    desc: "Recorded preview with audio — playable in VLC or browser",
  },
];
