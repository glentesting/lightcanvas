import type { FixtureKind } from "@/lib/fixtures/types";
import type { RGB } from "@/lib/render/effects/types";
import type { LightFrame, LightPoint } from "@/lib/scene/types";
import { STAGE_H, STAGE_W } from "@/lib/scene/types";

export interface PhotographicCompositorSettings {
  nightExposure: number;
  shadowFloor: number;
  coolness: number;
  coreSize: number;
  haloSize: number;
  haloStrength: number;
  spillSize: number;
  spillStrength: number;
  saturation: number;
}

export const DEFAULT_PHOTOGRAPHIC_SETTINGS: PhotographicCompositorSettings = {
  nightExposure: 0.29,
  shadowFloor: 0.018,
  coolness: 0.16,
  coreSize: 0.78,
  haloSize: 4.8,
  haloStrength: 0.42,
  spillSize: 20,
  spillStrength: 0.2,
  saturation: 0.82,
};

interface PreparedPoint extends LightPoint {
  kind: FixtureKind;
}

interface LoadedPhoto {
  image: HTMLImageElement;
  crop: { sx: number; sy: number; sw: number; sh: number };
}

/**
 * A stable, screen-space photographic compositor.
 *
 * The base photo never enters the glow pipeline. Light is split into:
 * surface spill -> broad halo -> near halo -> bulb core. This keeps the
 * backdrop crisp while allowing bright fixtures to feel luminous.
 */
export class PhotographicCompositor {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly source = makeCanvas(STAGE_W, STAGE_H);
  private readonly base = makeCanvas(STAGE_W, STAGE_H);
  private readonly receiverMask = makeCanvas(STAGE_W, STAGE_H);
  private readonly spill = makeCanvas(STAGE_W, STAGE_H);
  private readonly halo = makeCanvas(STAGE_W, STAGE_H);
  private readonly core = makeCanvas(STAGE_W, STAGE_H);
  private readonly composite = makeCanvas(STAGE_W, STAGE_H);

  private settings: PhotographicCompositorSettings;
  private points: PreparedPoint[] = [];
  private frame: LightFrame = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private rafId = 0;
  private disposed = false;
  private onFrame: (() => void) | null = null;
  private width = STAGE_W;
  private height = STAGE_H;
  private dpr = 1;

  constructor(settings: Partial<PhotographicCompositorSettings> = {}) {
    this.settings = { ...DEFAULT_PHOTOGRAPHIC_SETTINGS, ...settings };
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    this.ctx = ctx;
  }

  async mount(container: HTMLElement, photoUrl: string): Promise<void> {
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    container.appendChild(this.canvas);

    const photo = await loadPhoto(photoUrl);
    if (this.disposed) return;
    this.preparePhoto(photo);

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.resize(width, height);
    });
    this.resizeObserver.observe(container);
    const rect = container.getBoundingClientRect();
    this.resize(rect.width || STAGE_W, rect.height || STAGE_H);

    const loop = () => {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(loop);
      this.onFrame?.();
      this.render();
    };
    loop();
  }

  setLightPoints(
    points: LightPoint[],
    fixtureKinds: ReadonlyMap<string, FixtureKind>
  ): void {
    this.points = points.map((point) => ({
      ...point,
      kind: fixtureKinds.get(point.fixtureId) ?? "custom",
    }));
  }

  setLightFrame(frame: LightFrame): void {
    this.frame = frame;
  }

  setOnFrame(callback: (() => void) | null): void {
    this.onFrame = callback;
  }

  setSettings(settings: Partial<PhotographicCompositorSettings>): void {
    this.settings = { ...this.settings, ...settings };
    const image = this.source.getContext("2d")?.getImageData(0, 0, STAGE_W, STAGE_H);
    if (image) this.buildNightPlate(image);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.remove();
  }

  private preparePhoto(photo: LoadedPhoto): void {
    const sourceCtx = requiredContext(this.source);
    sourceCtx.clearRect(0, 0, STAGE_W, STAGE_H);
    sourceCtx.drawImage(
      photo.image,
      photo.crop.sx,
      photo.crop.sy,
      photo.crop.sw,
      photo.crop.sh,
      0,
      0,
      STAGE_W,
      STAGE_H
    );
    this.buildNightPlate(sourceCtx.getImageData(0, 0, STAGE_W, STAGE_H));
  }

  private buildNightPlate(sourceImage: ImageData): void {
    const baseImage = new ImageData(
      new Uint8ClampedArray(sourceImage.data.length),
      STAGE_W,
      STAGE_H
    );
    const maskImage = new ImageData(
      new Uint8ClampedArray(sourceImage.data.length),
      STAGE_W,
      STAGE_H
    );

    const source = sourceImage.data;
    const base = baseImage.data;
    const mask = maskImage.data;
    const { nightExposure, shadowFloor, coolness, saturation } = this.settings;

    for (let y = 0; y < STAGE_H; y++) {
      const yn = y / (STAGE_H - 1);
      for (let x = 0; x < STAGE_W; x++) {
        const i = (y * STAGE_W + x) * 4;
        const r = srgbToLinear(source[i] / 255);
        const g = srgbToLinear(source[i + 1] / 255);
        const b = srgbToLinear(source[i + 2] / 255);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const blueDominance = b - Math.max(r, g);

        const upper = smoothstep(0.64, 0.08, yn);
        const skyPhoto =
          smoothstep(0.02, 0.15, blueDominance) * smoothstep(0.12, 0.72, lum);
        const blownSky = smoothstep(0.69, 0.96, lum) * upper;
        const sky = clamp01(Math.max(skyPhoto * upper, blownSky));

        const compressed = (lum * nightExposure) / (1 + lum * 1.9);
        const detail = Math.pow(Math.max(compressed, shadowFloor), 0.92);
        const chromaR = lum > 0 ? r / lum : 1;
        const chromaG = lum > 0 ? g / lum : 1;
        const chromaB = lum > 0 ? b / lum : 1;

        let nr = detail * mix(1, chromaR, saturation);
        let ng = detail * mix(1, chromaG, saturation);
        let nb = detail * mix(1, chromaB, saturation);
        nr *= 1 - coolness * 0.28;
        ng *= 1 - coolness * 0.12;
        nb *= 1 + coolness * 0.44;

        const horizon = smoothstep(0.05, 0.72, yn);
        const skyR = mix(0.006, 0.018, horizon);
        const skyG = mix(0.012, 0.031, horizon);
        const skyB = mix(0.034, 0.075, horizon);
        nr = mix(nr, skyR, sky);
        ng = mix(ng, skyG, sky);
        nb = mix(nb, skyB, sky);

        const dx = (x / STAGE_W - 0.5) / 0.72;
        const dy = (yn - 0.48) / 0.76;
        const vignette = 1 - 0.2 * clamp01(dx * dx + dy * dy);
        nr *= vignette;
        ng *= vignette;
        nb *= vignette;

        base[i] = linearToSrgbByte(nr);
        base[i + 1] = linearToSrgbByte(ng);
        base[i + 2] = linearToSrgbByte(nb);
        base[i + 3] = 255;

        const edge = localEdgeStrength(source, x, y);
        const groundWeight = smoothstep(0.35, 0.92, yn);
        const architectureWeight = 0.58 + 0.42 * smoothstep(0.04, 0.42, edge);
        const receiver = (1 - sky) * mix(architectureWeight, 0.92, groundWeight);
        const mv = Math.round(clamp01(receiver) * 255);
        mask[i] = mv;
        mask[i + 1] = mv;
        mask[i + 2] = mv;
        mask[i + 3] = 255;
      }
    }

    requiredContext(this.base).putImageData(baseImage, 0, 0);
    requiredContext(this.receiverMask).putImageData(maskImage, 0, 0);
  }

  private resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  private render(): void {
    this.clearLayer(this.spill);
    this.clearLayer(this.halo);
    this.clearLayer(this.core);

    const active = this.collectActiveLights();
    this.drawSurfaceSpill(active);
    this.drawHalos(active);
    this.drawCores(active);

    const out = requiredContext(this.composite);
    out.globalCompositeOperation = "source-over";
    out.globalAlpha = 1;
    out.filter = "none";
    out.clearRect(0, 0, STAGE_W, STAGE_H);
    out.drawImage(this.base, 0, 0);

    out.globalCompositeOperation = "screen";
    out.globalAlpha = 1;
    out.drawImage(this.spill, 0, 0);
    out.drawImage(this.halo, 0, 0);
    out.drawImage(this.core, 0, 0);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const fit = containRect(this.width, this.height, STAGE_W / STAGE_H);
    this.ctx.fillStyle = "#03050b";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.composite, fit.x, fit.y, fit.w, fit.h);
  }

  private collectActiveLights(): Array<{
    point: PreparedPoint;
    rgb: RGB;
    strength: number;
  }> {
    const active: Array<{ point: PreparedPoint; rgb: RGB; strength: number }> = [];
    for (const point of this.points) {
      const rgb = this.frame.get(point.fixtureId)?.[point.pixelIndex];
      if (!rgb) continue;
      const strength = Math.max(rgb[0], rgb[1], rgb[2]) / 255;
      if (strength < 0.025) continue;
      active.push({ point, rgb, strength });
    }
    return active;
  }

  private drawSurfaceSpill(
    active: Array<{ point: PreparedPoint; rgb: RGB; strength: number }>
  ): void {
    const ctx = requiredContext(this.spill);
    const maxSources = 320;
    const stride = Math.max(1, Math.ceil(active.length / maxSources));

    for (let i = 0; i < active.length; i += stride) {
      const { point, rgb, strength } = active[i];
      const profile = fixtureProfile(point.kind);
      const radius =
        this.settings.spillSize * profile.spillRadius * (0.6 + strength * 0.65);
      const yOffset = profile.spillYOffset * radius;
      const color = displayColor(rgb, 0.78);
      const gradient = ctx.createRadialGradient(
        point.x,
        point.y + yOffset,
        0,
        point.x,
        point.y + yOffset,
        radius
      );
      gradient.addColorStop(
        0,
        rgba(color, this.settings.spillStrength * strength * profile.spillStrength)
      );
      gradient.addColorStop(
        0.38,
        rgba(color, this.settings.spillStrength * strength * profile.spillStrength * 0.42)
      );
      gradient.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(
        point.x - radius,
        point.y + yOffset - radius,
        radius * 2,
        radius * 2
      );
    }

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(this.receiverMask, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  private drawHalos(
    active: Array<{ point: PreparedPoint; rgb: RGB; strength: number }>
  ): void {
    const ctx = requiredContext(this.halo);
    ctx.globalCompositeOperation = "lighter";
    for (const { point, rgb, strength } of active) {
      const radius =
        this.settings.haloSize * (0.7 + point.size * 0.16) * (0.65 + strength * 0.5);
      const color = displayColor(rgb, 0.88);
      const gradient = ctx.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        radius
      );
      gradient.addColorStop(
        0,
        rgba(color, this.settings.haloStrength * strength * 0.55)
      );
      gradient.addColorStop(
        0.28,
        rgba(color, this.settings.haloStrength * strength * 0.22)
      );
      gradient.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  private drawCores(
    active: Array<{ point: PreparedPoint; rgb: RGB; strength: number }>
  ): void {
    const ctx = requiredContext(this.core);
    ctx.globalCompositeOperation = "lighter";
    for (const { point, rgb, strength } of active) {
      const radius =
        Math.max(0.46, this.settings.coreSize * (0.62 + point.size * 0.12)) *
        (0.88 + strength * 0.18);
      const color = displayColor(rgb, 1);
      const hot = mixColor(color, [255, 250, 238], 0.48 + strength * 0.32);

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 1.75, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 0.22 * strength);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = rgba(hot, 0.84 + strength * 0.16);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  private clearLayer(canvas: HTMLCanvasElement): void {
    const ctx = requiredContext(canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function fixtureProfile(kind: FixtureKind): {
  spillRadius: number;
  spillStrength: number;
  spillYOffset: number;
} {
  switch (kind) {
    case "roofline":
      return { spillRadius: 1.2, spillStrength: 1, spillYOffset: 0.42 };
    case "window-outline":
      return { spillRadius: 0.9, spillStrength: 0.72, spillYOffset: 0.08 };
    case "mega-tree":
    case "mini-tree":
      return { spillRadius: 1.15, spillStrength: 0.72, spillYOffset: 0.1 };
    case "arch":
      return { spillRadius: 0.94, spillStrength: 0.68, spillYOffset: 0.24 };
    case "bush":
      return { spillRadius: 0.82, spillStrength: 0.65, spillYOffset: 0.08 };
    default:
      return { spillRadius: 0.9, spillStrength: 0.62, spillYOffset: 0.12 };
  }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function requiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");
  return ctx;
}

async function loadPhoto(url: string): Promise<LoadedPhoto> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the visualizer photo"));
    img.src = url;
  });

  const targetAspect = STAGE_W / STAGE_H;
  const photoAspect = image.naturalWidth / image.naturalHeight;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (photoAspect > targetAspect) sw = sh * targetAspect;
  else sh = sw / targetAspect;

  return {
    image,
    crop: {
      sx: (image.naturalWidth - sw) / 2,
      sy: (image.naturalHeight - sh) / 2,
      sw,
      sh,
    },
  };
}

function containRect(
  width: number,
  height: number,
  aspect: number
): { x: number; y: number; w: number; h: number } {
  let w = width;
  let h = w / aspect;
  if (h > height) {
    h = height;
    w = h * aspect;
  }
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function localEdgeStrength(
  pixels: Uint8ClampedArray,
  x: number,
  y: number
): number {
  if (x === 0 || y === 0 || x === STAGE_W - 1 || y === STAGE_H - 1) return 0;
  const left = luminanceAt(pixels, x - 1, y);
  const right = luminanceAt(pixels, x + 1, y);
  const up = luminanceAt(pixels, x, y - 1);
  const down = luminanceAt(pixels, x, y + 1);
  return Math.min(1, Math.abs(right - left) + Math.abs(down - up));
}

function luminanceAt(pixels: Uint8ClampedArray, x: number, y: number): number {
  const i = (y * STAGE_W + x) * 4;
  return (
    0.2126 * (pixels[i] / 255) +
    0.7152 * (pixels[i + 1] / 255) +
    0.0722 * (pixels[i + 2] / 255)
  );
}

function displayColor(rgb: RGB, saturation: number): RGB {
  const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return [
    Math.round(mix(lum, rgb[0], saturation)),
    Math.round(mix(lum, rgb[1], saturation)),
    Math.round(mix(lum, rgb[2], saturation)),
  ];
}

function mixColor(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(mix(a[0], b[0], t)),
    Math.round(mix(a[1], b[1], t)),
    Math.round(mix(a[2], b[2], t)),
  ];
}

function rgba(rgb: RGB, alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp01(alpha)})`;
}

function srgbToLinear(value: number): number {
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function linearToSrgbByte(value: number): number {
  const v = Math.max(0, value);
  const srgb = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(clamp01(srgb) * 255);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
