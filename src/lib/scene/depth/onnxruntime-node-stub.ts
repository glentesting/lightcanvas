/**
 * Empty stand-in for `onnxruntime-node`, which @huggingface/transformers
 * references for Node environments. Depth estimation only ever runs in the
 * browser (onnxruntime-web via WebGPU/WASM), so the native backend is aliased
 * to this stub in next.config.ts for both Turbopack and webpack.
 */
const onnxruntimeNodeStub = {};
export default onnxruntimeNodeStub;
