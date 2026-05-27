"use client";

import { useState, useCallback, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import type { AIEvent } from "@/lib/ai/provider";
import type { EffectBlock } from "@/lib/timeline/types";

export type Vibe = "classic" | "jazz" | "edm" | "cinematic" | "whimsical";
export type Intensity = "subtle" | "balanced" | "wild";

interface UseAIGenerationParams {
  vibe: Vibe;
  intensity: Intensity;
  styleId: string;
}

export function useAIGeneration({ vibe, intensity, styleId }: UseAIGenerationParams) {
  const audio = useEditorStore((s) => s.audio);
  const fixtures = useEditorStore((s) => s.fixtures);
  const sequence = useEditorStore((s) => s.sequence);
  const addBlock = useEditorStore((s) => s.addBlock);
  const deleteBlocks = useEditorStore((s) => s.deleteBlocks);

  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AIEvent[]>([]);
  const [generatedBlockIds, setGeneratedBlockIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const runGeneration = useCallback(
    async (refinementPrompt?: string) => {
      if (!audio) return;
      setRunning(true);
      setEvents([]);

      // If refining, keep existing generated block IDs; otherwise reset
      if (!refinementPrompt) {
        setGeneratedBlockIds([]);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio,
            fixtures,
            vibe,
            intensity,
            style: styleId,
            refinementPrompt,
            existingBlocks: refinementPrompt ? sequence?.blocks : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errorText = await res.text().catch(() => "Unknown error");
          setEvents((prev) => [
            ...prev,
            {
              type: "error",
              message: `Failed to connect (${res.status}): ${errorText.slice(0, 200)}`,
            },
          ]);
          setRunning(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const blockIds: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);
            try {
              const event: AIEvent = JSON.parse(json);
              setEvents((prev) => [...prev, event]);

              // Apply patches immediately
              if (event.type === "patch" && event.patch.addBlocks) {
                for (const block of event.patch.addBlocks) {
                  addBlock(block as EffectBlock);
                  blockIds.push(block.id);
                }
              }
            } catch {
              // skip malformed events
            }
          }
        }

        setGeneratedBlockIds((prev) =>
          refinementPrompt ? [...prev, ...blockIds] : blockIds
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setEvents((prev) => [
            ...prev,
            { type: "error", message: String(e) },
          ]);
        }
      }
      setRunning(false);
    },
    [audio, fixtures, sequence, vibe, intensity, styleId, addBlock]
  );

  const handleGenerate = useCallback(() => {
    runGeneration();
  }, [runGeneration]);

  const handleRefine = useCallback(
    (prompt: string) => {
      runGeneration(prompt);
    },
    [runGeneration]
  );

  const handleUndo = useCallback(() => {
    if (generatedBlockIds.length > 0) {
      deleteBlocks(generatedBlockIds);
      setGeneratedBlockIds([]);
      setEvents([]);
    }
  }, [generatedBlockIds, deleteBlocks]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const handleKeep = useCallback(() => {
    setEvents([]);
    setGeneratedBlockIds([]);
  }, []);

  const handleClearError = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    audio,
    running,
    events,
    handleGenerate,
    handleRefine,
    handleUndo,
    handleCancel,
    handleKeep,
    handleClearError,
  };
}
