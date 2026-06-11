import type { DepthMap } from "../types";
import { STAGE_ASPECT } from "../types";

/**
 * Client-side monocular depth estimation via Transformers.js running
 * Depth Anything V2 Small (WebGPU when available, WASM otherwise).
 *
 * Runs ONCE per photo — the result is persisted as a grayscale PNG next to
 * the house photo and simply re-fetched on later loads (see persist.ts).
 * Must only ever be imported from client code.
 */

// Depth is estimated on the cover-cropped stage image so depth UVs, photo
// display UVs, and the 720×420 anchor space all align 1:1.
export const DEPTH_W = 960;
export const DEPTH_H = Math.round(DEPTH_W / STAGE_ASPECT); // 560

const MODEL_ID = "onnx-community/depth-anything-v2-small";

export type DepthProgress =
  | { stage: "loading-model"; pct: number }
  | { stage: "estimating" };

/** Load an image and center-crop it to the stage aspect (object-fit: cover). */
async function coverCropToCanvas(photoUrl: string): Promise<HTMLCanvasElement> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load house photo for depth estimation"));
    el.src = photoUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = DEPTH_W;
  canvas.height = DEPTH_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const photoAspect = img.naturalWidth / img.naturalHeight;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (photoAspect > STAGE_ASPECT) {
    sw = img.naturalHeight * STAGE_ASPECT;
  } else {
    sh = img.naturalWidth / STAGE_ASPECT;
  }
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, DEPTH_W, DEPTH_H);
  return canvas;
}

/**
 * Estimate a depth map for the photo. Output is DEPTH_W×DEPTH_H, values 0..1,
 * 1 = nearest to camera, rows top-down.
 */
export async function estimateDepth(
  photoUrl: string,
  onProgress?: (p: DepthProgress) => void
): Promise<DepthMap> {
  const canvas = await coverCropToCanvas(photoUrl);

  const { pipeline, RawImage } = await import("@huggingface/transformers");

  const progressCallback = (info: { status?: string; progress?: number }) => {
    if (info.status === "progress" && typeof info.progress === "number") {
      onProgress?.({ stage: "loading-model", pct: Math.round(info.progress) });
    }
  };

  // WebGPU when truly usable; otherwise (or on any init failure) WASM.
  // navigator.gpu existing is not enough — headless/older GPUs advertise it
  // and then fail on adapter or fp16 support.
  let estimator;
  const webgpu = typeof navigator !== "undefined" && "gpu" in navigator;
  try {
    if (!webgpu) throw new Error("no WebGPU");
    estimator = await pipeline("depth-estimation", MODEL_ID, {
      device: "webgpu",
      dtype: "fp16",
      progress_callback: progressCallback,
    });
  } catch {
    // Model weights stream from the HF CDN — transient network failures are
    // real, so give WASM a couple of attempts before giving up.
    let lastError: unknown;
    for (let attempt = 0; attempt < 3 && !estimator; attempt++) {
      try {
        estimator = await pipeline("depth-estimation", MODEL_ID, {
          device: "wasm",
          dtype: "q8",
          progress_callback: progressCallback,
        });
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    if (!estimator) throw lastError;
  }

  onProgress?.({ stage: "estimating" });

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
  const image = await RawImage.fromBlob(blob);
  const result = (await estimator(image)) as { depth: { width: number; height: number; data: Uint8Array | Uint8ClampedArray } };

  // The pipeline resizes the prediction back to input dims and normalizes to
  // 0..255 where 255 = nearest.
  const { width, height, data: raw } = result.depth;
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = raw[i] / 255;

  // Free the WASM/WebGPU session — depth runs once, no reason to hold memory.
  await (estimator as { dispose?: () => Promise<void> }).dispose?.();

  return { width, height, data };
}

/** Encode a DepthMap as a grayscale PNG blob for persistence. */
export async function depthToPng(depth: DepthMap): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = depth.width;
  canvas.height = depth.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  const img = ctx.createImageData(depth.width, depth.height);
  for (let i = 0; i < depth.data.length; i++) {
    const v = Math.round(Math.min(1, Math.max(0, depth.data[i])) * 255);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}

/** Decode a persisted depth PNG back into a DepthMap. */
export async function pngToDepth(url: string): Promise<DepthMap> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load depth map"));
    el.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const data = new Float32Array(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i++) data[i] = pixels[i * 4] / 255;
  return { width: canvas.width, height: canvas.height, data };
}
