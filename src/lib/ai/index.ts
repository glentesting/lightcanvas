import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { AnthropicAIProvider } from "./anthropic-provider";

export function getAIProvider(): AIProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    return new AnthropicAIProvider(apiKey);
  }
  // Fallback to mock when no API key is configured
  return new MockAIProvider();
}

export type { AIProvider, AIEvent, GenerateInput, GenerateOptions, ProjectPatch } from "./provider";
