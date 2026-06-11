import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { DepthMap, LightFrame, LightPoint, SceneProvider } from "./types";
import { STAGE_H, STAGE_W, sampleDepth } from "./types";

/**
 * PhotoDepthScene — the photo night-stage.
 *
 * The uploaded house photo becomes a depth-displaced plane (real parallax from
 * a monocular depth map), graded down to night in-shader, with light pixels
 * composited as additive glowing points plus a bloom pass. Camera does a
 * clamped lean-and-slide, never an orbit.
 */

// World dimensions: stage 720×420 maps to 7.2×4.2 world units.
const WORLD_W = 7.2;
const WORLD_H = 4.2;
const STAGE_TO_WORLD = WORLD_W / STAGE_W;
// Plane is rendered slightly larger than the frustum so panning never reveals edges.
const OVERSCAN = 1.07;
const FOV = 38;
// How far the nearest depth pops toward the camera, in world units.
const DEPTH_AMP = 1.0;
// Lights float just in front of the surface they're mounted on.
const LIGHT_LIFT = 0.06;

const PLANE_SEGMENTS_X = 220;
const PLANE_SEGMENTS_Y = 128;

const photoVertexShader = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uDepthAmp;
  uniform vec2 uCoverScale;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    float d = texture2D(uDepth, uv).r;
    vDepth = d;
    vec3 displaced = position + vec3(0.0, 0.0, d * uDepthAmp);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const photoFragmentShader = /* glsl */ `
  uniform sampler2D uPhoto;
  uniform vec2 uCoverScale;
  uniform float uExposure;
  uniform float uNight;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    // Cover-crop: sample the photo the same way the layout editor's
    // object-fit: cover does, so anchor points line up with photo features.
    vec2 uv = 0.5 + (vUv - 0.5) * uCoverScale;
    vec3 c = texture2D(uPhoto, uv).rgb;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));

    // ── Night tone mapping ──
    // Most uploads are bright daytime photos, so a multiplicative dim isn't
    // enough — near-white pixels (sunlit brick, pale lawn) must be CRUSHED.
    // Exposure drop, then a hard highlight shoulder, then deepened shadows:
    // full daylight white lands around 0.18, shadows keep readable detail.
    vec3 t = c * uExposure;
    t = t / (1.0 + 1.55 * t);
    t = pow(t, vec3(1.18));

    // Moonlight: partially desaturate, cool the whole frame.
    float tl = dot(t, vec3(0.2126, 0.7152, 0.0722));
    t = mix(t, vec3(tl), 0.30);
    t *= vec3(0.70, 0.77, 1.06);

    vec3 night = mix(c, t, uNight);

    // Distant non-sky content (background trees, fences) falls off darker.
    float far = 1.0 - vDepth;
    night *= mix(1.0, 0.72, far * far * uNight);

    // ── Sky replacement ──
    // Combine geometry (far + upper frame) with photometry (blue-dominant or
    // blown-bright pixels), so a midday sky dies even where depth is fuzzy.
    float topW = smoothstep(0.30, 0.75, vUv.y);
    float geoSky = smoothstep(0.55, 0.90, far);
    float blueDom = smoothstep(0.02, 0.18, c.b - max(c.r, c.g));
    float photoSky = max(
      blueDom * smoothstep(0.25, 0.55, lum),
      smoothstep(0.82, 0.97, lum) * 0.9
    );
    float sky = topW * clamp(max(geoSky * 0.85, photoSky), 0.0, 1.0);
    // Night sky with a faint horizon glow at the bottom of the sky band.
    vec3 skyCol = mix(vec3(0.030, 0.045, 0.085), vec3(0.010, 0.016, 0.040), vUv.y);
    night = mix(night, skyCol, sky * uNight);

    // Tiny ambient floor so deep shadows stay velvet, not void.
    night += vec3(0.007, 0.010, 0.018) * uNight;

    // Gentle vignette to seat the stage.
    float vd = distance(vUv, vec2(0.5, 0.45));
    night *= 0.84 + 0.16 * smoothstep(0.85, 0.35, vd);

    gl_FragColor = vec4(night, 1.0);
  }
`;

const lightsVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uScale;
  uniform float uSizeBoost;
  varying vec3 vColor;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float pts = aSize * uSizeBoost * uScale / -mvPosition.z;
    gl_PointSize = clamp(pts, 0.0, 64.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const lightsFragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    // Hot core + soft gaussian-ish halo — a real bulb, not a flat dot.
    float core = smoothstep(0.42, 0.0, r);
    float halo = exp(-r * r * 4.5) * 0.6;
    vec3 col = vColor * (core * 1.7 + halo);
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface PointerState {
  nx: number;
  ny: number;
  active: boolean;
}

export interface PhotoDepthSceneOptions {
  photoUrl: string;
  /** null → flat stage (no parallax), still fully functional. */
  depth: DepthMap | null;
  /** Debug: render the photo ungraded (uNight=0) to check light alignment. */
  debugDaylight?: boolean;
}

export class PhotoDepthScene implements SceneProvider {
  private opts: PhotoDepthSceneOptions;

  private renderer: THREE.WebGLRenderer | null = null;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, WORLD_W / WORLD_H, 0.1, 50);

  private photoTexture: THREE.Texture | null = null;
  private depthTexture: THREE.DataTexture | null = null;
  private planeMaterial: THREE.ShaderMaterial | null = null;
  private planeGeometry: THREE.PlaneGeometry | null = null;

  private points: LightPoint[] = [];
  private lightsGeometry: THREE.BufferGeometry | null = null;
  private lightsMaterial: THREE.ShaderMaterial | null = null;
  private lightsObject: THREE.Points | null = null;

  private pointer: PointerState = { nx: 0, ny: 0, active: false };
  private rig = { nx: 0, ny: 0 };
  private lastTickMs: number | null = null;
  private elapsed = 0;
  private rafId = 0;
  private disposed = false;
  private onFrame: ((elapsedSeconds: number) => void) | null = null;
  private container: HTMLElement | null = null;

  constructor(opts: PhotoDepthSceneOptions) {
    this.opts = opts;
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    // Camera distance so the (un-overscanned) plane exactly fills the frustum.
    const dist = WORLD_H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);

    this.photoTexture = await loadTexture(this.opts.photoUrl);
    this.photoTexture.colorSpace = THREE.SRGBColorSpace;
    this.photoTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.photoTexture.magFilter = THREE.LinearFilter;
    if (this.disposed) return;

    this.depthTexture = buildDepthTexture(this.opts.depth);

    // Adaptive night exposure: a midday photo needs a hard crush, a dusk
    // photo only a gentle dim — anchor both to the same post-grade target.
    const avgLum = averageLuminance(this.photoTexture.image as CanvasImageSource & { width: number; height: number });
    const exposure = THREE.MathUtils.clamp(0.40 / Math.max(avgLum, 0.05), 0.62, 2.1);

    const img = this.photoTexture.image as { width: number; height: number };
    const photoAspect = img.width / img.height;
    const stageAspect = WORLD_W / WORLD_H;
    const coverScale = new THREE.Vector2(
      photoAspect > stageAspect ? stageAspect / photoAspect : 1,
      photoAspect > stageAspect ? 1 : photoAspect / stageAspect
    );

    this.planeGeometry = new THREE.PlaneGeometry(
      WORLD_W * OVERSCAN,
      WORLD_H * OVERSCAN,
      PLANE_SEGMENTS_X,
      PLANE_SEGMENTS_Y
    );
    this.planeMaterial = new THREE.ShaderMaterial({
      vertexShader: photoVertexShader,
      fragmentShader: photoFragmentShader,
      uniforms: {
        uPhoto: { value: this.photoTexture },
        uDepth: { value: this.depthTexture },
        uDepthAmp: { value: this.opts.depth ? DEPTH_AMP : 0 },
        uCoverScale: { value: coverScale },
        uExposure: { value: exposure },
        uNight: { value: this.opts.debugDaylight ? 0.0 : 1.0 },
      },
    });
    const plane = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.scene.add(plane);

    // Lights points object (geometry filled by setLightPoints)
    this.lightsMaterial = new THREE.ShaderMaterial({
      vertexShader: lightsVertexShader,
      fragmentShader: lightsFragmentShader,
      uniforms: {
        uScale: { value: 1 },
        uSizeBoost: { value: 2.6 },
      },
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthWrite: false,
      transparent: true,
    });
    this.lightsGeometry = new THREE.BufferGeometry();
    this.lightsObject = new THREE.Points(this.lightsGeometry, this.lightsMaterial);
    this.lightsObject.frustumCulled = false;
    this.scene.add(this.lightsObject);
    if (this.points.length > 0) this.rebuildLightBuffers();

    // Post: render → bloom (lights only realistically clear the threshold
    // against the darkened photo) → tonemap/sRGB output.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(720, 420), 0.85, 0.55, 0.6);
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass());
    this.composer = composer;

    const rect = container.getBoundingClientRect();
    this.resize(rect.width || 720, rect.height || 420);

    const loop = () => {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  setLightPoints(points: LightPoint[]): void {
    this.points = points;
    if (this.lightsGeometry) this.rebuildLightBuffers();
  }

  setLightFrame(frame: LightFrame): void {
    const geo = this.lightsGeometry;
    if (!geo) return;
    const colorAttr = geo.getAttribute("aColor") as THREE.BufferAttribute | undefined;
    if (!colorAttr) return;
    const arr = colorAttr.array as Float32Array;
    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      const rgb = frame.get(pt.fixtureId)?.[pt.pixelIndex];
      if (rgb) {
        // Push above 1.0 so lit bulbs clear the bloom threshold.
        arr[i * 3] = (rgb[0] / 255) * 1.9;
        arr[i * 3 + 1] = (rgb[1] / 255) * 1.9;
        arr[i * 3 + 2] = (rgb[2] / 255) * 1.9;
      } else {
        arr[i * 3] = 0;
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = 0;
      }
    }
    colorAttr.needsUpdate = true;
  }

  setPointer(nx: number, ny: number, active: boolean): void {
    this.pointer = { nx, ny, active };
  }

  setOnFrame(cb: ((elapsedSeconds: number) => void) | null): void {
    this.onFrame = cb;
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.composer) return;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.lightsMaterial) {
      const pr = this.renderer.getPixelRatio();
      this.lightsMaterial.uniforms.uScale.value =
        (height * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    }
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.onFrame = null;
    this.planeGeometry?.dispose();
    this.planeMaterial?.dispose();
    this.lightsGeometry?.dispose();
    this.lightsMaterial?.dispose();
    this.photoTexture?.dispose();
    this.depthTexture?.dispose();
    this.composer?.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.renderer = null;
    this.composer = null;
    this.container = null;
  }

  // ── internals ─────────────────────────────────────────────

  private tick(): void {
    const now = performance.now();
    const dt = this.lastTickMs === null ? 0.016 : Math.min((now - this.lastTickMs) / 1000, 0.1);
    this.lastTickMs = now;
    this.elapsed += dt;

    this.onFrame?.(this.elapsed);

    // Lean-and-slide rig: pointer drives it; idle gets a slow drift so the
    // stage always feels dimensional. Clamped — never an orbit.
    const target = this.pointer.active
      ? { nx: THREE.MathUtils.clamp(this.pointer.nx, -1, 1), ny: THREE.MathUtils.clamp(this.pointer.ny, -1, 1) }
      : { nx: Math.sin(this.elapsed * 0.13) * 0.4, ny: Math.sin(this.elapsed * 0.085) * 0.22 };
    const k = 1 - Math.exp(-dt * 2.8);
    this.rig.nx += (target.nx - this.rig.nx) * k;
    this.rig.ny += (target.ny - this.rig.ny) * k;

    const dist = WORLD_H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    this.camera.position.x = this.rig.nx * 0.32;
    this.camera.position.y = -this.rig.ny * 0.16;
    this.camera.position.z = dist;
    // Look slightly into the depth volume so the lean pivots around the house.
    this.camera.lookAt(this.rig.nx * 0.06, -this.rig.ny * 0.03, DEPTH_AMP * 0.45);

    this.composer?.render();
  }

  private rebuildLightBuffers(): void {
    const geo = this.lightsGeometry;
    if (!geo) return;
    const n = this.points.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const pt = this.points[i];
      const u = pt.x / STAGE_W;
      const v = pt.y / STAGE_H;
      // Lights mount on surfaces (eaves, walls, yard). A point exactly on a
      // silhouette edge can sample the sky behind it, so probe a small
      // neighborhood biased downward and keep the nearest surface.
      let d = 0;
      if (this.opts.depth) {
        d = Math.max(
          sampleDepth(this.opts.depth, u, v),
          sampleDepth(this.opts.depth, u, v + 0.015),
          sampleDepth(this.opts.depth, u - 0.008, v + 0.008),
          sampleDepth(this.opts.depth, u + 0.008, v + 0.008)
        );
      }
      positions[i * 3] = (u - 0.5) * WORLD_W;
      positions[i * 3 + 1] = (0.5 - v) * WORLD_H;
      positions[i * 3 + 2] = d * DEPTH_AMP + LIGHT_LIFT;
      sizes[i] = pt.size * STAGE_TO_WORLD;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  }
}

// ── helpers ─────────────────────────────────────────────────

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(url, resolve, undefined, reject);
  });
}

/**
 * Mean luminance of the photo (0..1), sampled via a small offscreen canvas.
 * Drives the adaptive night exposure.
 */
function averageLuminance(image: CanvasImageSource & { width: number; height: number }): number {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0.4;
  try {
    ctx.drawImage(image, 0, 0, 32, 32);
    const px = ctx.getImageData(0, 0, 32, 32).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) {
      sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    }
    return sum / (px.length / 4) / 255;
  } catch {
    return 0.4; // tainted canvas etc. — assume a middling photo
  }
}

/** Depth as an R8 texture (filters linearly everywhere, unlike float textures). */
function buildDepthTexture(depth: DepthMap | null): THREE.DataTexture {
  if (!depth) {
    const flat = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat);
    flat.needsUpdate = true;
    return flat;
  }
  // DepthMap rows are top-down; texture v=0 is the bottom row. flipY is not
  // reliable for typed-array uploads, so flip rows on the CPU.
  const bytes = new Uint8Array(depth.data.length);
  for (let y = 0; y < depth.height; y++) {
    const src = (depth.height - 1 - y) * depth.width;
    const dst = y * depth.width;
    for (let x = 0; x < depth.width; x++) {
      bytes[dst + x] = Math.round(THREE.MathUtils.clamp(depth.data[src + x], 0, 1) * 255);
    }
  }
  const tex = new THREE.DataTexture(bytes, depth.width, depth.height, THREE.RedFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
