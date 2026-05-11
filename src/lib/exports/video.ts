import type { Project } from "@/types/domain";
import { renderFrame } from "@/lib/render/engine";
import type { RGB } from "@/lib/render/effects";

export interface VideoExportOptions {
  fps: number;
  width: number;
  height: number;
  startTime?: number;
  endTime?: number;
}

/**
 * Export a project as a WebM video blob using canvas capture + MediaRecorder.
 * Audio is mixed from the project's audio URL.
 *
 * Must be called from a user gesture context (click handler) for autoplay.
 */
export async function exportVideo(
  project: Project,
  audioUrl: string,
  options: VideoExportOptions,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const { fps, width, height } = options;
  const startTime = options.startTime ?? 0;
  const endTime =
    options.endTime ?? project.audio?.duration ?? getMaxBlockEnd(project);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Set up audio element + routing for capture
  const audioCtx = new AudioContext();
  const audioEl = new Audio();
  audioEl.crossOrigin = "anonymous";
  audioEl.src = audioUrl;
  audioEl.currentTime = startTime;

  await new Promise<void>((resolve, reject) => {
    audioEl.oncanplaythrough = () => resolve();
    audioEl.onerror = () => reject(new Error("Failed to load audio"));
    audioEl.load();
  });

  const audioSource = audioCtx.createMediaElementSource(audioEl);
  const audioDest = audioCtx.createMediaStreamDestination();
  audioSource.connect(audioDest);
  audioSource.connect(audioCtx.destination);

  const canvasStream = canvas.captureStream(fps);
  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  const recorder = new MediaRecorder(combined, {
    mimeType: getSupportedMimeType(),
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Recording failed"));
    recorder.onstop = () => {
      audioCtx.close();
      const mimeType = recorder.mimeType || "video/webm";
      resolve(new Blob(chunks, { type: mimeType }));
    };

    recorder.start(100); // 100ms timeslice
    audioEl.play();

    const totalDuration = endTime - startTime;
    const _frameInterval = 1000 / fps;

    const renderTick = () => {
      const currentTime = audioEl.currentTime;
      if (currentTime >= endTime || audioEl.ended) {
        recorder.stop();
        audioEl.pause();
        return;
      }

      // Report progress
      if (onProgress) {
        const pct = Math.min(
          100,
          ((currentTime - startTime) / totalDuration) * 100
        );
        onProgress(pct);
      }

      // Render the frame
      drawFrame(ctx, project, currentTime, width, height);

      requestAnimationFrame(renderTick);
    };

    requestAnimationFrame(renderTick);
  });
}

function getSupportedMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "video/webm";
}

function getMaxBlockEnd(project: Project): number {
  return project.sequence.blocks.reduce(
    (max, b) => Math.max(max, b.start + b.duration),
    30
  );
}

/**
 * Draw one frame of the preview onto the canvas.
 * Uses the same render engine as PreviewPanel.
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  t: number,
  width: number,
  height: number
) {
  // Dark background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText(project.name, 24, 36);

  // Timestamp
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#aaa";
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 100);
  ctx.fillText(
    `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`,
    24,
    56
  );

  // Render all fixtures
  const frame = renderFrame(
    project.sequence,
    project.fixtures,
    t,
    project.audio?.beats,
    project.groups
  );

  const fixtureAreaY = 80;
  const fixtureAreaHeight = height - fixtureAreaY - 20;
  const fixtureSpacing = Math.min(
    60,
    fixtureAreaHeight / Math.max(1, project.fixtures.length)
  );

  project.fixtures.forEach((fixture, fixtureIdx) => {
    const y = fixtureAreaY + fixtureIdx * fixtureSpacing;
    const pixels = frame.get(fixture.id) || [];
    const pixelSize = Math.min(
      8,
      (width - 180) / Math.max(1, fixture.pixelCount)
    );
    const startX = 160;

    // Fixture label
    ctx.fillStyle = "#888";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(fixture.name, 16, y + pixelSize / 2 + 4);

    // Pixels
    pixels.forEach((rgb: RGB, px: number) => {
      const x = startX + px * pixelSize;
      ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      ctx.fillRect(x, y, Math.max(1, pixelSize - 1), Math.max(4, pixelSize - 1));
    });
  });
}

// Re-export renderFrame's RGB type isn't needed — we import from engine
