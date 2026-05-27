"use client";

import type { FrameTimeMs } from "@/lib/exports/xlights";
import type { ValidationIssue } from "@/lib/exports/validation";
import {
  FORMAT_OPTIONS,
  FRAME_TIME_OPTIONS,
  type ExportFormat,
  type RangeMode,
  type VideoQuality,
  type VideoResolution,
} from "@/lib/exports/dialog-state";

interface ExportOptionsStepProps {
  validationIssues: ValidationIssue[];
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  rangeMode: RangeMode;
  setRangeMode: (m: RangeMode) => void;
  customStart: number;
  setCustomStart: (n: number) => void;
  customEnd: number;
  setCustomEnd: (n: number) => void;
  audioDuration: number;
  frameTimeMs: FrameTimeMs;
  setFrameTimeMs: (f: FrameTimeMs) => void;
  videoQuality: VideoQuality;
  setVideoQuality: (q: VideoQuality) => void;
  videoResolution: VideoResolution;
  setVideoResolution: (r: VideoResolution) => void;
  exporting: boolean;
  progress: number;
  onClose: () => void;
  onNext: () => void;
}

export default function ExportOptionsStep({
  validationIssues,
  format,
  setFormat,
  rangeMode,
  setRangeMode,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  audioDuration,
  frameTimeMs,
  setFrameTimeMs,
  videoQuality,
  setVideoQuality,
  videoResolution,
  setVideoResolution,
  exporting,
  progress,
  onClose,
  onNext,
}: ExportOptionsStepProps) {
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

          {/* Validation results */}
          {validationIssues.length > 0 && (
            <div className="mb-4 rounded-lg overflow-hidden" style={{ border: "1px solid #f59e0b", background: "#fffbeb" }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #fde68a" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="text-xs font-semibold" style={{ color: "#92400e" }}>
                  {validationIssues.length} warning{validationIssues.length !== 1 ? "s" : ""} found
                </span>
              </div>
              <div className="px-3 py-2 flex flex-col gap-2">
                {validationIssues.map((issue, i) => (
                  <div key={i} className="text-xs" style={{ color: "#92400e" }}>
                    <p className="font-medium">{issue.message}</p>
                    {issue.details && <p style={{ color: "#b45309", marginTop: 2 }}>{issue.details}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationIssues.length === 0 && (
            <div className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "oklch(96% 0.06 145)", border: "1px solid oklch(88% 0.08 145)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(45% 0.13 145)" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-xs font-medium" style={{ color: "oklch(35% 0.1 145)" }}>No channel conflicts found</span>
            </div>
          )}

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

          {/* xLights / LOR Options */}
          {(format === "xlights" || format === "lor") && (
            <fieldset className="mb-4">
              <legend className="text-xs font-medium mb-2" style={{ color: "var(--ink-3)" }}>
                {format === "lor" ? "LOR Options" : "xLights Options"}
              </legend>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--ink-4)" }}>Step time</label>
                <div className="flex flex-wrap gap-2">
                  {FRAME_TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFrameTimeMs(opt.value)}
                      className="h-7 px-3 rounded-md text-xs font-medium"
                      style={{
                        border: frameTimeMs === opt.value ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                        background: frameTimeMs === opt.value ? "var(--accent-50)" : "var(--surface)",
                        color: frameTimeMs === opt.value ? "var(--accent)" : "var(--ink)",
                      }}
                    >
                      {opt.label}
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
            onClick={onNext}
            disabled={exporting}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "1px solid var(--accent)",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? "Exporting..." : (format === "xlights" || format === "lor") ? "Next" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
