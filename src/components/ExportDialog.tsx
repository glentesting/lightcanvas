"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { exportLightCanvasJson } from "@/lib/exports/lightcanvas-json";
import { exportVideo } from "@/lib/exports/video";
import { validateFixtures } from "@/lib/exports/validation";
import type { ValidationIssue } from "@/lib/exports/validation";
import { exportLoredit, parseTemplate, seedDefaultMapping, serializeXml } from "@/lib/exports/loredit";
import type { LoreditTemplate, LoreditPropMap, LoreditExportReport } from "@/lib/exports/loredit";
import type { Project } from "@/types/domain";

type ExportFormat = "loredit" | "lightcanvas-json" | "video";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("loredit");
  const [step, setStep] = useState<"options" | "loredit-setup">("options");
  const [showGuidance, setShowGuidance] = useState(false);
  const [rangeMode, setRangeMode] = useState<"full" | "custom">("full");
  const [customStart, setCustomStart] = useState(0);
  const [customEnd, setCustomEnd] = useState(30);
  const [videoQuality, setVideoQuality] = useState<"low" | "med" | "high">("med");
  const [videoResolution, setVideoResolution] = useState<"720p" | "1080p">("720p");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  // .loredit flow state
  const [template, setTemplate] = useState<LoreditTemplate | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [propMap, setPropMap] = useState<LoreditPropMap>({});
  const [mappingReviewed, setMappingReviewed] = useState(false);
  const [lastReport, setLastReport] = useState<LoreditExportReport | null>(null);

  const state = useEditorStore.getState();
  const fixtures = useEditorStore((s) => s.fixtures);
  const storedPropMap = useEditorStore((s) => s.sequence.loreditPropMap);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormat("loredit");
      setStep("options");
      setShowGuidance(false);
      setTemplate(null);
      setTemplateFileName(null);
      setTemplateError(null);
      setMappingReviewed(false);
      setExportError(null);
      setLastReport(null);
    }
  }, [open]);

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  useEffect(() => {
    if (open) {
      // The owner's pixel hardware is fixed: LOR Pixie16 (hardware reference §2)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValidationIssues(validateFixtures(fixtures, "lor-pixie16"));
    }
  }, [open, fixtures]);

  // Seed the fixture → prop mapping once a template is parsed
  useEffect(() => {
    if (template) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPropMap(seedDefaultMapping(fixtures, template.props, storedPropMap ?? {}));
      setMappingReviewed(false);
    }
  }, [template, fixtures, storedPropMap]);

  const sortedPropNames = useMemo(() => {
    if (!template) return [];
    return template.props.map((p) => p.name).sort((a, b) => a.localeCompare(b));
  }, [template]);

  const propTypeByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of template?.props ?? []) m.set(p.name, p.stringType);
    return m;
  }, [template]);

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

  const handleTemplateFile = useCallback(async (file: File) => {
    setTemplateError(null);
    setTemplate(null);
    setTemplateFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseTemplate(text);
      if (parsed.props.length === 0) {
        throw new Error("Template contains no mappable props");
      }
      setTemplate(parsed);
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Could not read template");
    }
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setProgress(0);
    setExportError(null);

    try {
      const project = getProject();

      switch (format) {
        case "loredit": {
          if (!template) throw new Error("Choose a template .loredit file first");
          useEditorStore.getState().setLoreditPropMap(propMap);
          // The parsed template preserves the original bytes exactly, so
          // re-serializing it recovers the template text without keeping an
          // 11 MB string in component state.
          const { text, report } = exportLoredit(project, {
            templateText: serializeXml(template.doc),
            map: propMap,
          });
          setLastReport(report);
          downloadBlob(
            new Blob([text], { type: "application/xml" }),
            `${project.name || "sequence"}.loredit`
          );
          break;
        }
        case "lightcanvas-json": {
          const filtered =
            rangeMode === "custom"
              ? {
                  ...project,
                  sequence: {
                    ...project.sequence,
                    blocks: project.sequence.blocks.filter(
                      (b) => b.start + b.duration > customStart && b.start < customEnd
                    ),
                  },
                }
              : project;
          downloadBlob(exportLightCanvasJson(filtered), `${project.name || "project"}.lightcanvas.json`);
          break;
        }
        case "video": {
          const startTime = rangeMode === "custom" ? customStart : undefined;
          const endTime = rangeMode === "custom" ? customEnd : undefined;
          const dims =
            videoResolution === "1080p" ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
          const fps = videoQuality === "low" ? 15 : videoQuality === "high" ? 30 : 24;
          if (!project.audioUrl) throw new Error("Audio is required for video export");
          const blob = await exportVideo(project, project.audioUrl, { fps, ...dims, startTime, endTime }, setProgress);
          downloadBlob(blob, `${project.name || "project"}.webm`);
          break;
        }
      }

      setShowGuidance(true);
    } catch (err) {
      console.error("Export failed:", err);
      setExportError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, [format, rangeMode, customStart, customEnd, videoQuality, videoResolution, getProject, template, propMap, downloadBlob]);

  if (!open) return null;

  const audioDuration = state.audio?.duration ?? 0;

  // Post-export guidance modal
  if (showGuidance) {
    const isLoredit = format === "loredit";
    const guidanceSteps = isLoredit
      ? [
          "Open LOR S6 Sequencer",
          "File > Open > select the downloaded .loredit file",
          "Confirm the layout loads and effects sit on the right props",
          "Verify the audio file name matches an MP3 in Documents\\Light-O-Rama\\Audio",
          "Play it against the audio, then save from S6",
        ]
      : ["Your file has been downloaded", "Open it in the appropriate application"];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }} onClick={() => { setShowGuidance(false); onClose(); }}>
        <div className="rounded-xl overflow-hidden w-full max-w-md" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(96% 0.06 145)", color: "oklch(35% 0.12 145)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Export complete!</h3>
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>Your file has been downloaded</p>
              </div>
            </div>
            {isLoredit && lastReport && (
              <div className="mb-4 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
                {lastReport.filledProps.length} prop{lastReport.filledProps.length !== 1 ? "s" : ""} filled
                {lastReport.beatMarksWritten > 0 && <> &bull; {lastReport.beatMarksWritten} beat marks</>}
                {lastReport.skippedFixtures.length > 0 && (
                  <> &bull; {lastReport.skippedFixtures.length} fixture{lastReport.skippedFixtures.length !== 1 ? "s" : ""} skipped</>
                )}
              </div>
            )}
            <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {isLoredit ? "Next steps for LOR S6" : "Export complete"}
            </h4>
            <ol className="space-y-2.5">
              {guidanceSteps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--ink-2)" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold" style={{ background: "var(--accent-50)", color: "var(--accent-700)" }}>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex justify-end px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
            <button onClick={() => { setShowGuidance(false); onClose(); }} className="h-8 px-4 rounded-md text-xs font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // .loredit step: template file + fixture → prop mapping
  if (step === "loredit-setup") {
    const unmappedCount = fixtures.filter((f) => !propMap[f.id]).length;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }} onClick={onClose}>
        <div className="rounded-xl overflow-hidden w-full max-w-lg" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold mb-1">Export for Light-O-Rama S6</h3>
            <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
              Pick a template .loredit that already contains your S6 Preview (any of your purchased
              sequences works). Its layout and timing grids are kept; its effects are replaced with
              this project&apos;s sequence.
            </p>

            {/* Template picker */}
            <div className="mb-4">
              <label
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer"
                style={{ border: "1px dashed var(--line)", background: "var(--panel)" }}
              >
                <input
                  type="file"
                  accept=".loredit"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleTemplateFile(f);
                  }}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                  {templateFileName ?? "Choose template .loredit file..."}
                </span>
              </label>
              {templateError && (
                <p className="text-xs mt-1.5" style={{ color: "#b91c1c" }}>{templateError}</p>
              )}
              {template && (
                <p className="text-xs mt-1.5" style={{ color: "var(--ink-4)" }}>
                  {template.props.length} props found &bull; {template.timingMarkCount} timing marks
                  &bull;{" "}
                  <span style={{ color: "#15803d" }}>
                    {fixtures.filter((f) => propMap[f.id]).length} of {fixtures.length} fixtures matched
                    automatically — review below
                  </span>
                </p>
              )}
            </div>

            {/* Mapping table */}
            {template && (
              <>
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto" style={{ borderColor: "var(--line)" }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                        <th className="text-xs font-medium text-left px-3 py-2" style={{ color: "var(--ink-3)" }}>LightCanvas prop</th>
                        <th className="text-xs font-medium text-left px-3 py-2" style={{ color: "var(--ink-3)" }}>LOR prop</th>
                        <th className="text-xs font-medium text-left px-3 py-2 w-16" style={{ color: "var(--ink-3)" }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixtures.map((fixture, i) => (
                        <tr key={fixture.id} style={{ borderBottom: i < fixtures.length - 1 ? "1px solid var(--line)" : undefined }}>
                          <td className="px-3 py-1.5">
                            <span className="text-xs" style={{ color: "var(--ink-2)" }}>{fixture.name}</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              value={propMap[fixture.id] ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPropMap((prev) => {
                                  const next = { ...prev };
                                  if (v) next[fixture.id] = v;
                                  else delete next[fixture.id];
                                  return next;
                                });
                              }}
                              className="w-full h-7 px-1.5 rounded-md text-xs"
                              style={{ border: "1px solid var(--line)", background: "var(--surface)", color: propMap[fixture.id] ? "var(--ink-2)" : "var(--ink-4)" }}
                            >
                              <option value="">(skip — not exported)</option>
                              {sortedPropNames.map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            {propMap[fixture.id] && (
                              <span className="inline-flex items-center h-5 px-1.5 rounded text-xs font-medium" style={{ background: "oklch(96% 0.04 260)", color: "oklch(40% 0.12 260)" }}>
                                {propTypeByName.get(propMap[fixture.id]) === "Traditional" ? "AC" : propTypeByName.get(propMap[fixture.id])}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {unmappedCount > 0 && (
                  <p className="text-xs mt-2" style={{ color: "oklch(55% 0.15 45)" }}>
                    {unmappedCount} fixture{unmappedCount !== 1 ? "s" : ""} unmapped — they will be skipped.
                  </p>
                )}
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mappingReviewed}
                    onChange={(e) => setMappingReviewed(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs" style={{ color: "var(--ink-2)" }}>I&apos;ve reviewed the mapping</span>
                </label>
              </>
            )}

            {exportError && (
              <p className="text-xs mt-3" style={{ color: "#b91c1c" }}>Export failed: {exportError}</p>
            )}
          </div>

          <div className="flex justify-between px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
            <button
              onClick={() => setStep("options")}
              disabled={exporting}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", opacity: exporting ? 0.5 : 1 }}
            >
              Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={exporting}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", opacity: exporting ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || !template || !mappingReviewed}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", opacity: exporting || !template || !mappingReviewed ? 0.5 : 1 }}
              >
                {exporting ? "Exporting..." : "Export .loredit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Format selection + options
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
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-4">Export Project</h3>

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

          {/* Time Range — whole-song only for .loredit */}
          {format !== "loredit" && (
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

          {exportError && (
            <p className="text-xs mb-2" style={{ color: "#b91c1c" }}>Export failed: {exportError}</p>
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
            onClick={() => {
              if (format === "loredit") {
                setStep("loredit-setup");
              } else {
                handleExport();
              }
            }}
            disabled={exporting}
            className="h-8 px-4 rounded-md text-xs font-medium"
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "1px solid var(--accent)",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? "Exporting..." : format === "loredit" ? "Next" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; desc: string }[] = [
  {
    value: "loredit",
    label: "Light-O-Rama S6 (.loredit)",
    desc: "Fills your S6 template with this sequence — opens directly in S6 v6.6.12",
  },
  {
    value: "lightcanvas-json",
    label: "LightCanvas JSON",
    desc: "Full project file — re-importable into LightCanvas",
  },
  {
    value: "video",
    label: "Preview Video (WebM)",
    desc: "Recorded preview with audio — playable in VLC or browser",
  },
];
