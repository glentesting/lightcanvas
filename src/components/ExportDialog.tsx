"use client";

import { useState, useCallback } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { exportLightCanvasJson } from "@/lib/exports/lightcanvas-json";
import { exportXlights } from "@/lib/exports/xlights";
import { exportVideo } from "@/lib/exports/video";
import type { Project } from "@/types/domain";

type ExportFormat = "lightcanvas-json" | "xlights" | "video";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("lightcanvas-json");
  const [rangeMode, setRangeMode] = useState<"full" | "custom">("full");
  const [customStart, setCustomStart] = useState(0);
  const [customEnd, setCustomEnd] = useState(30);
  const [xlightsFrameRate, setXlightsFrameRate] = useState<20 | 40>(20);
  const [videoQuality, setVideoQuality] = useState<"low" | "med" | "high">("med");
  const [videoResolution, setVideoResolution] = useState<"720p" | "1080p">("720p");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const state = useEditorStore.getState();

  const getProject = useCallback((): Project => {
    const s = useEditorStore.getState();
    return {
      id: s.projectId,
      ownerId: "",
      name: s.name,
      audioUrl: s.audioUrl,
      audioFile: s.audioFile,
      audio: s.audio,
      fixtures: s.fixtures,
      groups: s.groups,
      sequence: s.sequence,
      houseTemplate: s.houseTemplate ?? "default",
      houseCustomSvg: s.houseCustomSvg,
      createdAt: "",
      updatedAt: "",
    };
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setProgress(0);

    try {
      const project = getProject();
      const startTime = rangeMode === "custom" ? customStart : undefined;
      const endTime = rangeMode === "custom" ? customEnd : undefined;

      let blob: Blob;
      let filename: string;

      switch (format) {
        case "lightcanvas-json": {
          // For time range, we filter blocks if custom range
          const filtered =
            rangeMode === "custom"
              ? {
                  ...project,
                  sequence: {
                    ...project.sequence,
                    blocks: project.sequence.blocks.filter(
                      (b) =>
                        b.start + b.duration > customStart &&
                        b.start < customEnd
                    ),
                  },
                }
              : project;
          blob = exportLightCanvasJson(filtered);
          filename = `${project.name || "project"}.lightcanvas.json`;
          break;
        }
        case "xlights": {
          const filtered =
            rangeMode === "custom"
              ? {
                  ...project,
                  sequence: {
                    ...project.sequence,
                    blocks: project.sequence.blocks
                      .filter(
                        (b) =>
                          b.start + b.duration > customStart &&
                          b.start < customEnd
                      )
                      .map((b) => ({
                        ...b,
                        start: Math.max(0, b.start - customStart),
                        duration: Math.max(
                          0,
                          Math.min(b.start + b.duration, customEnd) -
                            Math.max(b.start, customStart)
                        ),
                      })),
                  },
                  audio: project.audio
                    ? {
                        ...project.audio,
                        beats: project.audio.beats
                          .filter((t) => t >= customStart && t < customEnd)
                          .map((t) => t - customStart),
                        downbeats: project.audio.downbeats
                          .filter((t) => t >= customStart && t < customEnd)
                          .map((t) => t - customStart),
                        duration: customEnd - customStart,
                      }
                    : null,
                }
              : project;
          blob = exportXlights(filtered, { frameRate: xlightsFrameRate });
          filename = `${project.name || "project"}.xsq`;
          break;
        }
        case "video": {
          const dims =
            videoResolution === "1080p"
              ? { width: 1920, height: 1080 }
              : { width: 1280, height: 720 };
          const fps = videoQuality === "low" ? 15 : videoQuality === "high" ? 30 : 24;

          if (!project.audioUrl) {
            throw new Error("Audio is required for video export");
          }

          blob = await exportVideo(project, project.audioUrl, {
            fps,
            ...dims,
            startTime,
            endTime,
          }, setProgress);
          filename = `${project.name || "project"}.webm`;
          break;
        }
      }

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error("Export failed:", err);
      alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, [format, rangeMode, customStart, customEnd, xlightsFrameRate, videoQuality, videoResolution, getProject, onClose]);

  if (!open) return null;

  const audioDuration = state.audio?.duration ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-w-md"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-4">Export Project</h3>

          {/* Format */}
          <fieldset className="mb-4">
            <legend className="text-xs font-medium mb-2" style={{ color: "var(--ink-3)" }}>
              Format
            </legend>
            <div className="flex flex-col gap-1.5">
              {FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    border: format === opt.value ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                    background: format === opt.value ? "var(--accent-50)" : "var(--surface)",
                  }}
                >
                  <input
                    type="radio"
                    name="format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => setFormat(opt.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>
                      {opt.desc}
                    </div>
                  </div>
                  {format === opt.value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Time Range */}
          <fieldset className="mb-4">
            <legend className="text-xs font-medium mb-2" style={{ color: "var(--ink-3)" }}>
              Time Range
            </legend>
            <div className="flex gap-2">
              <button
                onClick={() => setRangeMode("full")}
                className="h-7 px-3 rounded-md text-xs font-medium"
                style={{
                  border: rangeMode === "full" ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  background: rangeMode === "full" ? "var(--accent-50)" : "var(--surface)",
                  color: rangeMode === "full" ? "var(--accent)" : "var(--ink)",
                }}
              >
                Whole song
              </button>
              <button
                onClick={() => setRangeMode("custom")}
                className="h-7 px-3 rounded-md text-xs font-medium"
                style={{
                  border: rangeMode === "custom" ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  background: rangeMode === "custom" ? "var(--accent-50)" : "var(--surface)",
                  color: rangeMode === "custom" ? "var(--accent)" : "var(--ink)",
                }}
              >
                Custom
              </button>
            </div>
            {rangeMode === "custom" && (
              <div className="flex gap-3 mt-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--ink-4)" }}>
                    Start (s)
                  </label>
                  <input
                    type="number"
                    value={customStart}
                    onChange={(e) => setCustomStart(Math.max(0, parseFloat(e.target.value) || 0))}
                    min={0}
                    max={audioDuration}
                    step={0.1}
                    className="w-24 h-7 px-2 rounded-md text-xs"
                    style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--ink-4)" }}>
                    End (s)
                  </label>
                  <input
                    type="number"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(Math.max(customStart, parseFloat(e.target.value) || 0))}
                    min={customStart}
                    max={audioDuration}
                    step={0.1}
                    className="w-24 h-7 px-2 rounded-md text-xs"
                    style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* xLights Options */}
          {format === "xlights" && (
            <fieldset className="mb-4">
              <legend className="text-xs font-medium mb-2" style={{ color: "var(--ink-3)" }}>
                xLights Options
              </legend>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--ink-4)" }}>Frame rate</label>
                <div className="flex gap-2">
                  {([20, 40] as const).map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setXlightsFrameRate(rate)}
                      className="h-7 px-3 rounded-md text-xs font-medium"
                      style={{
                        border: xlightsFrameRate === rate ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                        background: xlightsFrameRate === rate ? "var(--accent-50)" : "var(--surface)",
                        color: xlightsFrameRate === rate ? "var(--accent)" : "var(--ink)",
                      }}
                    >
                      {rate} fps ({rate === 20 ? "50ms" : "25ms"})
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          )}

          {/* Video Options */}
          {format === "video" && (
            <fieldset className="mb-4">
              <legend className="text-xs font-medium mb-2" style={{ color: "var(--ink-3)" }}>
                Video Options
              </legend>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--ink-4)" }}>Quality</label>
                  <div className="flex gap-2">
                    {(["low", "med", "high"] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => setVideoQuality(q)}
                        className="h-7 px-3 rounded-md text-xs font-medium capitalize"
                        style={{
                          border: videoQuality === q ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                          background: videoQuality === q ? "var(--accent-50)" : "var(--surface)",
                          color: videoQuality === q ? "var(--accent)" : "var(--ink)",
                        }}
                      >
                        {q === "med" ? "Medium" : q === "low" ? "Low" : "High"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--ink-4)" }}>Resolution</label>
                  <div className="flex gap-2">
                    {(["720p", "1080p"] as const).map((res) => (
                      <button
                        key={res}
                        onClick={() => setVideoResolution(res)}
                        className="h-7 px-3 rounded-md text-xs font-medium"
                        style={{
                          border: videoResolution === res ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                          background: videoResolution === res ? "var(--accent-50)" : "var(--surface)",
                          color: videoResolution === res ? "var(--accent)" : "var(--ink)",
                        }}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </fieldset>
          )}
        </div>

        {/* Progress bar */}
        {exporting && format === "video" && (
          <div className="px-5 pb-2">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: "var(--accent)" }}
              />
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
              Recording... {Math.round(progress)}%
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}
        >
          <button
            onClick={onClose}
            disabled={exporting}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              opacity: exporting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "1px solid var(--accent)",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; desc: string }[] = [
  {
    value: "lightcanvas-json",
    label: "LightCanvas JSON",
    desc: "Full project file — re-importable into LightCanvas",
  },
  {
    value: "xlights",
    label: "xLights Sequence (.xsq)",
    desc: "Open in xLights with effects, models, and timing",
  },
  {
    value: "video",
    label: "Preview Video (WebM)",
    desc: "Recorded preview with audio — playable in VLC or browser",
  },
];
