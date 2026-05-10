"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useEditorStore } from "@/lib/store/editor-store";
import { exportLightCanvasJson } from "@/lib/exports/lightcanvas-json";
import { exportXlightsZip } from "@/lib/exports/xlights";
import type { FrameTimeMs } from "@/lib/exports/xlights";
import { exportLorZip, getLorDegradedEffects } from "@/lib/exports/lor";
import type { LorMapping } from "@/lib/exports/lor";
import { exportVideo } from "@/lib/exports/video";
import { validateFixtures } from "@/lib/exports/validation";
import type { ValidationIssue } from "@/lib/exports/validation";
import type { Project } from "@/types/domain";

type ExportFormat = "lightcanvas-json" | "xlights" | "lor" | "video";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

function getDefaultFormat(sequencer?: string): ExportFormat {
  if (sequencer === "lor") return "lor";
  return "xlights"; // xlights, vixen, other, or unset all default to xlights
}

const FRAME_TIME_OPTIONS: Array<{ value: FrameTimeMs; label: string }> = [
  { value: 20, label: "20ms (50fps)" },
  { value: 25, label: "25ms (40fps)" },
  { value: 40, label: "40ms (25fps)" },
  { value: 50, label: "50ms (20fps)" },
];

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { user } = useUser();
  const sequencer = (user?.publicMetadata?.sequencer as string) || "xlights";
  const [format, setFormat] = useState<ExportFormat>(getDefaultFormat(sequencer));
  // Reset default format when dialog opens based on user profile
  useEffect(() => {
    if (open) {
      setFormat(getDefaultFormat(sequencer));
      setStep("options");
      setShowGuidance(false);
      setNamesReviewed(false);
    }
  }, [open, sequencer]);

  const [step, setStep] = useState<"options" | "name-mapping" | "lor-degraded" | "lor-mapping">("options");
  const [showGuidance, setShowGuidance] = useState(false);
  const [rangeMode, setRangeMode] = useState<"full" | "custom">("full");
  const [customStart, setCustomStart] = useState(0);
  const [customEnd, setCustomEnd] = useState(30);
  const [frameTimeMs, setFrameTimeMs] = useState<FrameTimeMs>(50);
  const [videoQuality, setVideoQuality] = useState<"low" | "med" | "high">("med");
  const [videoResolution, setVideoResolution] = useState<"720p" | "1080p">("720p");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [namesReviewed, setNamesReviewed] = useState(false);

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const [lorMapLocal, setLorMapLocal] = useState<LorMapping>({});
  const [lorMappingReviewed, setLorMappingReviewed] = useState(false);
  const [lorDegradedExpanded, setLorDegradedExpanded] = useState(false);

  const state = useEditorStore.getState();
  const fixtures = useEditorStore((s) => s.fixtures);
  const storedNameMap = useEditorStore((s) => s.sequence.xlightsNameMap);
  const storedLorMapping = useEditorStore((s) => s.sequence.lorMapping);

  // Run validation when dialog opens
  useEffect(() => {
    if (open) {
      const controllerType = (user?.publicMetadata?.controllerType as string) || null;
      const issues = validateFixtures(fixtures, controllerType);
      setValidationIssues(issues);
    }
  }, [open, fixtures, user]);

  // Local editable name map state — initialized from store or fixture names
  const [localNameMap, setLocalNameMap] = useState<Record<string, string>>({});

  // Initialize localNameMap when entering the mapping step
  useEffect(() => {
    if (step === "name-mapping") {
      const map: Record<string, string> = {};
      for (const f of fixtures) {
        map[f.id] = storedNameMap?.[f.id] ?? f.name;
      }
      setLocalNameMap(map);
      setNamesReviewed(false);
    }
  }, [step, fixtures, storedNameMap]);

  // Initialize lorMapLocal when entering the LOR mapping step
  useEffect(() => {
    if (step === "lor-mapping") {
      const map: LorMapping = {};
      for (const f of fixtures) {
        map[f.id] = storedLorMapping?.[f.id] ?? {
          unit: f.universe ?? 1,
          circuit: f.startChannel ?? 1,
        };
      }
      setLorMapLocal(map);
      setLorMappingReviewed(false);
    }
  }, [step, fixtures, storedLorMapping]);

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
          // Save the name map to the store (triggers autosave)
          useEditorStore.getState().setXlightsNameMap(localNameMap);

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

          // Download audio file
          let audioBlob: Blob;
          let audioFilename = project.audioFile || "audio.mp3";

          if (project.audioUrl) {
            // Fetch signed URL from API
            const signedRes = await fetch(`/api/audio/${project.id}`);
            if (!signedRes.ok) throw new Error("Failed to get audio URL");
            const signedData = await signedRes.json();
            const audioUrl = signedData.url || signedData.signedUrl;
            if (!audioUrl) throw new Error("No audio URL returned");
            const audioRes = await fetch(audioUrl);
            if (!audioRes.ok) throw new Error("Failed to download audio");
            audioBlob = await audioRes.blob();
          } else {
            // No audio — create empty blob
            audioBlob = new Blob([], { type: "audio/mpeg" });
            audioFilename = "audio.mp3";
          }

          blob = await exportXlightsZip(
            filtered,
            localNameMap,
            frameTimeMs,
            audioBlob,
            audioFilename
          );
          filename = `${project.name || "project"}-xlights.zip`;
          break;
        }
        case "lor": {
          // Save the LOR mapping to the store (triggers autosave)
          useEditorStore.getState().setLorMapping(lorMapLocal);

          const lorFiltered =
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
                }
              : project;

          // Download audio file
          let lorAudioBlob: Blob;
          let lorAudioFilename = project.audioFile || "audio.mp3";

          if (project.audioUrl) {
            const signedRes = await fetch(`/api/audio/${project.id}`);
            if (!signedRes.ok) throw new Error("Failed to get audio URL");
            const signedData = await signedRes.json();
            const audioUrl = signedData.url || signedData.signedUrl;
            if (!audioUrl) throw new Error("No audio URL returned");
            const audioRes = await fetch(audioUrl);
            if (!audioRes.ok) throw new Error("Failed to download audio");
            lorAudioBlob = await audioRes.blob();
          } else {
            lorAudioBlob = new Blob([], { type: "audio/mpeg" });
            lorAudioFilename = "audio.mp3";
          }

          blob = await exportLorZip(
            lorFiltered,
            lorMapLocal,
            frameTimeMs,
            lorAudioBlob,
            lorAudioFilename
          );
          filename = `${project.name || "project"}-lor.zip`;
          break;
        }
        case "video": {
          const startTime = rangeMode === "custom" ? customStart : undefined;
          const endTime = rangeMode === "custom" ? customEnd : undefined;
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

      setShowGuidance(true);
    } catch (err) {
      console.error("Export failed:", err);
      alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, [format, rangeMode, customStart, customEnd, frameTimeMs, videoQuality, videoResolution, getProject, localNameMap, lorMapLocal]);

  if (!open) return null;

  const audioDuration = state.audio?.duration ?? 0;

  // Post-export guidance modal
  if (showGuidance) {
    const isXlights = format === "xlights";
    const isLor = format === "lor";
    const guidanceTitle = isLor
      ? "Next steps for Light-O-Rama"
      : isXlights
        ? "Next steps for xLights"
        : "Export complete";
    const guidanceSteps = isLor ? [
      "Open Light-O-Rama Sequence Editor",
      "File > Open > select the .lms file",
      "Verify channel assignments match your LOR controller",
      "Edit > Channel Properties to adjust Unit/Circuit if needed",
      "Hit Play to preview your show",
    ] : isXlights ? [
      "Create a show directory (e.g., C:\\xLights\\MyShow\\)",
      "Extract the ZIP contents into that directory",
      "Open xLights and set Show Directory to that folder",
      "Layout tab: your fixtures should appear as models",
      "Sequencer tab: open the .xsq file",
      "Render > Render All to generate pixel data",
      "Load the .fseq file in FPP or xSchedule and play",
    ] : [
      "Your file has been downloaded",
      "Open it in the appropriate application",
    ];

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
            <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{guidanceTitle}</h4>
            <ol className="space-y-2.5">
              {guidanceSteps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--ink-2)" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold" style={{ background: "var(--accent-50)", color: "var(--accent-700)" }}>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="text-xs mt-4" style={{ color: "var(--ink-4)" }}>
              Detailed instructions coming soon. You can change your sequencer in <a href="/settings" style={{ color: "var(--accent)", textDecoration: "underline" }}>Settings</a>.
            </p>
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

  // LOR Step 1: Degradation warning
  if (step === "lor-degraded") {
    const project = getProject();
    const degraded = getLorDegradedEffects(project);
    const totalBlocks = project.sequence.blocks.length;
    const nativeCount = totalBlocks - degraded.length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }} onClick={onClose}>
        <div className="rounded-xl overflow-hidden w-full max-w-lg" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold mb-1">LOR Export Compatibility</h3>
            <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
              Light-O-Rama supports fewer effect types than LightCanvas. Some effects will be approximated.
            </p>

            <div className="rounded-lg p-3 mb-3" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium" style={{ color: "var(--ink)" }}>
                  {nativeCount} effect{nativeCount !== 1 ? "s" : ""} export directly
                </span>
                {degraded.length > 0 && (
                  <>
                    <span style={{ color: "var(--ink-4)" }}>&bull;</span>
                    <span style={{ color: "oklch(55% 0.15 45)" }}>
                      {degraded.length} will be approximated
                    </span>
                  </>
                )}
              </div>
            </div>

            {degraded.length > 0 && (
              <div>
                <button
                  onClick={() => setLorDegradedExpanded(!lorDegradedExpanded)}
                  className="flex items-center gap-1.5 text-xs font-medium mb-2"
                  style={{ color: "var(--accent)" }}
                >
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{ transform: lorDegradedExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  {lorDegradedExpanded ? "Hide details" : "Show details"}
                </button>
                {lorDegradedExpanded && (
                  <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto" style={{ borderColor: "var(--line)" }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                          <th className="text-xs font-medium text-left px-3 py-1.5" style={{ color: "var(--ink-3)" }}>Fixture</th>
                          <th className="text-xs font-medium text-left px-3 py-1.5" style={{ color: "var(--ink-3)" }}>Effect</th>
                          <th className="text-xs font-medium text-left px-3 py-1.5" style={{ color: "var(--ink-3)" }}>Approximation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {degraded.map((d, i) => (
                          <tr key={d.blockId} style={{ borderBottom: i < degraded.length - 1 ? "1px solid var(--line)" : undefined }}>
                            <td className="px-3 py-1.5 text-xs" style={{ color: "var(--ink-2)" }}>{d.fixtureName}</td>
                            <td className="px-3 py-1.5 text-xs" style={{ color: "var(--ink-2)" }}>{d.effectId}</td>
                            <td className="px-3 py-1.5 text-xs" style={{ color: "var(--ink-4)" }}>{d.approximation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-between px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
            <button
              onClick={() => setStep("options")}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            >
              Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setStep("lor-mapping")}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
              >
                Continue to mapping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOR Step 2: Unit/Circuit mapping
  if (step === "lor-mapping") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }} onClick={onClose}>
        <div className="rounded-xl overflow-hidden w-full max-w-lg" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold mb-1">Map fixtures to LOR channels</h3>
            <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
              Set the Unit and Circuit numbers to match your LOR controller configuration.
            </p>

            <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--line)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                    <th className="text-xs font-medium text-left px-3 py-2" style={{ color: "var(--ink-3)" }}>Fixture Name</th>
                    <th className="text-xs font-medium text-left px-3 py-2 w-20" style={{ color: "var(--ink-3)" }}>Unit #</th>
                    <th className="text-xs font-medium text-left px-3 py-2 w-20" style={{ color: "var(--ink-3)" }}>Circuit #</th>
                    <th className="text-xs font-medium text-left px-3 py-2 w-14" style={{ color: "var(--ink-3)" }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {fixtures.map((fixture, i) => (
                    <tr key={fixture.id} style={{ borderBottom: i < fixtures.length - 1 ? "1px solid var(--line)" : undefined }}>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: "var(--ink-2)" }}>{fixture.name}</span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={lorMapLocal[fixture.id]?.unit ?? 1}
                          onChange={(e) => {
                            setLorMapLocal((prev) => ({
                              ...prev,
                              [fixture.id]: {
                                ...prev[fixture.id],
                                unit: Math.max(1, parseInt(e.target.value) || 1),
                              },
                            }));
                          }}
                          className="w-full h-7 px-2 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={lorMapLocal[fixture.id]?.circuit ?? 1}
                          onChange={(e) => {
                            setLorMapLocal((prev) => ({
                              ...prev,
                              [fixture.id]: {
                                ...prev[fixture.id],
                                circuit: Math.max(1, parseInt(e.target.value) || 1),
                              },
                            }));
                          }}
                          className="w-full h-7 px-2 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center h-5 px-1.5 rounded text-xs font-medium" style={{ background: "oklch(96% 0.04 260)", color: "oklch(40% 0.12 260)" }}>
                          RGB
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={lorMappingReviewed}
                onChange={(e) => setLorMappingReviewed(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>I&apos;ve reviewed the mapping</span>
            </label>
          </div>

          {exporting && (
            <div className="px-5 pb-2">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: "100%", background: "var(--accent)", animation: "pulse 1.5s ease-in-out infinite" }}
                />
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
                Building ZIP package...
              </div>
            </div>
          )}

          <div className="flex justify-between px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
            <button
              onClick={() => setStep("lor-degraded")}
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
                disabled={exporting || !lorMappingReviewed}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", opacity: exporting || !lorMappingReviewed ? 0.5 : 1 }}
              >
                {exporting ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: xLights name mapping
  if (step === "name-mapping") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <div
          className="rounded-xl overflow-hidden w-full max-w-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold mb-1">Match your fixtures to xLights model names</h3>
            <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
              Your xLights sequence won&apos;t show effects for fixtures whose names don&apos;t match exactly. Fix any differences here.
            </p>

            {/* Mapping table */}
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--line)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                    <th className="text-xs font-medium text-left px-3 py-2" style={{ color: "var(--ink-3)" }}>LightCanvas</th>
                    <th className="text-xs font-medium text-left px-3 py-2" style={{ color: "var(--ink-3)" }}>xLights Model Name</th>
                  </tr>
                </thead>
                <tbody>
                  {fixtures.map((fixture, i) => (
                    <tr key={fixture.id} style={{ borderBottom: i < fixtures.length - 1 ? "1px solid var(--line)" : undefined }}>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: "var(--ink-2)" }}>{fixture.name}</span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={localNameMap[fixture.id] ?? fixture.name}
                          onChange={(e) => {
                            setLocalNameMap((prev) => ({
                              ...prev,
                              [fixture.id]: e.target.value,
                            }));
                          }}
                          className="w-full h-7 px-2 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Review checkbox */}
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={namesReviewed}
                onChange={(e) => setNamesReviewed(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>I&apos;ve reviewed the names</span>
            </label>
          </div>

          {/* Progress bar */}
          {exporting && (
            <div className="px-5 pb-2">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: "100%", background: "var(--accent)", animation: "pulse 1.5s ease-in-out infinite" }}
                />
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
                Building ZIP package...
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            className="flex justify-between px-5 py-3"
            style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}
          >
            <button
              onClick={() => setStep("options")}
              disabled={exporting}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                opacity: exporting ? 0.5 : 1,
              }}
            >
              Back
            </button>
            <div className="flex gap-2">
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
                disabled={exporting || !namesReviewed}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "1px solid var(--accent)",
                  opacity: exporting || !namesReviewed ? 0.5 : 1,
                }}
              >
                {exporting ? "Exporting..." : "Export"}
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
            onClick={() => {
              if (format === "xlights") {
                setStep("name-mapping");
              } else if (format === "lor") {
                setStep("lor-degraded");
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
            {exporting ? "Exporting..." : (format === "xlights" || format === "lor") ? "Next" : "Export"}
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
    desc: "Full project file \u2014 re-importable into LightCanvas",
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
    desc: "Recorded preview with audio \u2014 playable in VLC or browser",
  },
];
