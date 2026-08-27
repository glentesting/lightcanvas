/**
 * Real AI provider: a thin Anthropic Messages API caller plugged into the
 * shared sequencer orchestrator (Layer 1 planning happens per section batch;
 * everything else — expansion, streaming — is deterministic shared code).
 *
 * This project deliberately uses direct fetch instead of @anthropic-ai/sdk
 * (documented in CLAUDE.md / PROJECT-STATUS.md).
 */

import type { AIProvider, AIEvent, GenerateInput, GenerateOptions } from "./provider";
import { runSequencer } from "./sequencer/orchestrator";
import type { ModelCaller } from "./sequencer/orchestrator";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 16000;

/**
 * The real Layer-1 model caller. Exported so the verification script can
 * exercise the exact caller the app uses (and wrap it to capture raw plans).
 */
export function makeAnthropicCaller(apiKey: string): ModelCaller {
  return async (prompt: string) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // server-side refusal fallback, recommended default for Opus 5
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        fallbacks: "default",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      if (response.status === 429) {
        throw new Error("Rate limited by the AI service. Wait a moment and try again.");
      }
      if (response.status === 401) {
        throw new Error("AI service authentication failed — check ANTHROPIC_API_KEY.");
      }
      throw new Error(`AI service error (${response.status}): ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = Array.isArray(data.content)
      ? data.content
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("")
      : "";
    return { text, stopReason: data.stop_reason ?? null };
  };
}

export class AnthropicAIProvider implements AIProvider {
  private callModel: ModelCaller;

  constructor(apiKey: string) {
    this.callModel = makeAnthropicCaller(apiKey);
  }

  generateFromMusic(input: GenerateInput, options?: GenerateOptions): AsyncIterable<AIEvent> {
    return runSequencer(input, options, this.callModel);
  }
}
