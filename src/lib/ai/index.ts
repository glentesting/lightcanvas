import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";

export function getAIProvider(): AIProvider {
  // In the future, swap to AnthropicProvider when NEXT_PUBLIC_AI_PROVIDER=anthropic
  return new MockAIProvider();
}

export type { AIProvider, AIEvent, GenerateInput, ProjectPatch } from "./provider";
