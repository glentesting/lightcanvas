import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { AnthropicAIProvider } from "./anthropic-provider";

/**
 * No silent fallback: without ANTHROPIC_API_KEY this throws a clear error
 * unless the mock is explicitly requested via AI_USE_MOCK=1 (dev flag; the
 * mock announces itself in the UI).
 */
export function getAIProvider(): AIProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    return new AnthropicAIProvider(apiKey);
  }
  if (process.env.AI_USE_MOCK === "1") {
    return new MockAIProvider();
  }
  throw new Error(
    "AI generation requires ANTHROPIC_API_KEY. Set it in the environment " +
      "(or set AI_USE_MOCK=1 to explicitly use the deterministic mock planner for development)."
  );
}

export type { AIProvider, AIEvent, GenerateInput, GenerateOptions, ProjectPatch } from "./provider";
