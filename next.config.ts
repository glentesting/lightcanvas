import type { NextConfig } from "next";

// @huggingface/transformers ships Node bindings (onnxruntime-node) that must
// never be bundled — depth estimation runs client-side only (WebGPU/WASM).
// The alias below neutralizes the Node backend for both bundlers.
const ONNX_NODE_STUB = "./src/lib/scene/depth/onnxruntime-node-stub.ts";

// A production build and a running dev server must never share a build
// directory. On 2026-09-12 a verification `next build` was run while the
// owner's dev server was live on port 3000; the build overwrote `.next`
// underneath it, and the dev server spent two days rebuilding in a loop
// while his project page sat on "Loading project..." forever.
//
// `npm run build` now sets NEXT_BUILD_DIR, so builds land in `.next-build`
// and `next dev` keeps `.next` to itself. Verification can run at any time,
// with the app open, and nothing collides.
const DIST_DIR = process.env.NEXT_BUILD_DIR || ".next";

const nextConfig: NextConfig = {
  distDir: DIST_DIR,
  serverExternalPackages: ["@huggingface/transformers"],
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": ONNX_NODE_STUB,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
