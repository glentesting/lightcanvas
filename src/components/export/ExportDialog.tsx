"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useEditorStore } from "@/lib/store/editor-store";
import { exportLightCanvasJson } from "@/lib/exports/lightcanvas-json";
import { exportXlightsZip } from "@/lib/exports/xlights";
import type { FrameTimeMs } from "@/lib/exports/xlights";
import { exportLorZip } from "@/lib/exports/lor";
import type { LorMapping } from "@/lib/exports/lor";
import { exportVideo } from "@/lib/exports/video";
import { validateFixtures } from "@/lib/exports/validation";
import type { ValidationIssue } from "@/lib/exports/validation";
import type { Project } from "@/types/domain";
import { trackEvent } from "@/lib/analytics";
import {
  getDefaultFormat,
  type ExportFormat,
  type ExportStep,
  type RangeMode,
  type VideoQuality,
  type VideoResolution,
} from "@/lib/exports/dialog-state";
import ExportOptionsStep from "./ExportOptionsStep";
import ExportNameMappingStep from "./ExportNameMappingStep";
import ExportLorDegradedStep from "./ExportLorDegradedStep";
import ExportLorMappingStep from "./ExportLorMappingStep";
import ExportGuidanceModal from "./ExportGuidanceModal";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { user } = useUser();
  const sequencer = (user?.publicMetadata?.sequencer as string) || "xlights";
  const [format, setFormat] = useState<ExportFormat>(getDefaultFormat(sequencer));
  const [step, setStep] = useState<ExportStep>("options");
  const [showGuidance, setShowGuidance] = useState(false);
  const [rangeMode, setRangeMode] = useState<RangeMode>("full");
  const [customStart, setCustomStart] = useState(0);
  const [customEnd, setCustomEnd] = useState(30);
  const [frameTimeMs, setFrameTimeMs] = useState<FrameTimeMs>(50);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("med");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("720p");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [namesReviewed, setNamesReviewed] = useState(false);

  // Reset default format when dialog opens based on user profile
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormat(getDefaultFormat(sequencer));
      setStep("options");
      setShowGuidance(false);
      setNamesReviewed(false);
    }
  }, [open, sequencer]);

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const [lorMapLocal, setLorMapLocal] = useState<LorMapping>({});
  const [lorMappingReviewed, setLorMappingReviewed] = useState(false);

  const state = useEditorStore.getState();
  const fixtures = useEditorStore((s) => s.fixtures);
  const storedNameMap = useEditorStore((s) => s.sequence.xlightsNameMap);
  const storedLorMapping = useEditorStore((s) => s.sequence.lorMapping);

  // Run validation when dialog opens
  useEffect(() => {
    if (open) {
      const controllerType = (user?.publicMetadata?.controllerType as string) || null;
      const issues = validateFixtures(fixtures, controllerType);
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      trackEvent("first_export", { format });
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
    return (
      <ExportGuidanceModal
        format={format}
        onDismiss={() => {
          setShowGuidance(false);
          onClose();
        }}
      />
    );
  }

  // LOR Step 1: Degradation warning
  if (step === "lor-degraded") {
    return (
      <ExportLorDegradedStep
        project={getProject()}
        onBack={() => setStep("options")}
        onContinue={() => setStep("lor-mapping")}
        onClose={onClose}
      />
    );
  }

  // LOR Step 2: Unit/Circuit mapping
  if (step === "lor-mapping") {
    return (
      <ExportLorMappingStep
        fixtures={fixtures}
        lorMapLocal={lorMapLocal}
        setLorMapLocal={setLorMapLocal}
        lorMappingReviewed={lorMappingReviewed}
        setLorMappingReviewed={setLorMappingReviewed}
        exporting={exporting}
        onBack={() => setStep("lor-degraded")}
        onClose={onClose}
        onExport={handleExport}
      />
    );
  }

  // Step 2: xLights name mapping
  if (step === "name-mapping") {
    return (
      <ExportNameMappingStep
        fixtures={fixtures}
        localNameMap={localNameMap}
        setLocalNameMap={setLocalNameMap}
        namesReviewed={namesReviewed}
        setNamesReviewed={setNamesReviewed}
        exporting={exporting}
        onBack={() => setStep("options")}
        onClose={onClose}
        onExport={handleExport}
      />
    );
  }

  // Step 1: Format selection + options
  return (
    <ExportOptionsStep
      validationIssues={validationIssues}
      format={format}
      setFormat={setFormat}
      rangeMode={rangeMode}
      setRangeMode={setRangeMode}
      customStart={customStart}
      setCustomStart={setCustomStart}
      customEnd={customEnd}
      setCustomEnd={setCustomEnd}
      audioDuration={audioDuration}
      frameTimeMs={frameTimeMs}
      setFrameTimeMs={setFrameTimeMs}
      videoQuality={videoQuality}
      setVideoQuality={setVideoQuality}
      videoResolution={videoResolution}
      setVideoResolution={setVideoResolution}
      exporting={exporting}
      progress={progress}
      onClose={onClose}
      onNext={() => {
        if (format === "xlights") {
          setStep("name-mapping");
        } else if (format === "lor") {
          setStep("lor-degraded");
        } else {
          handleExport();
        }
      }}
    />
  );
}
