import type { NextConfig } from "next";

// @huggingface/transformers ships Node bindings (onnxruntime-node) that must
// never be bundled — depth estimation runs client-side only (WebGPU/WASM).
// The alias below neutralizes the Node backend for both bundlers.
const ONNX_NODE_STUB = "./src/lib/scene/depth/onnxruntime-node-stub.ts";

const nextConfig: NextConfig = {
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
