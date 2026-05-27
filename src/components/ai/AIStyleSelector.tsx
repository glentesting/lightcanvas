"use client";

import { AI_STYLES } from "@/lib/ai/styles";

interface AIStyleSelectorProps {
  styleId: string;
  setStyleId: (id: string) => void;
}

export default function AIStyleSelector({ styleId, setStyleId }: AIStyleSelectorProps) {
  return (
    <div className="mb-4">
      <label
        className="text-xs font-medium block mb-2"
        style={{ color: "var(--ink-3)" }}
      >
        Style Preset
      </label>
      <div className="flex flex-col gap-1.5">
        {AI_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStyleId(s.id)}
            className="text-left px-3 py-2 rounded-md text-xs transition-colors"
            style={{
              background:
                styleId === s.id
                  ? "var(--accent-50)"
                  : "var(--surface)",
              border:
                styleId === s.id
                  ? "1px solid var(--accent-200)"
                  : "1px solid var(--line)",
              color:
                styleId === s.id
                  ? "var(--accent-ink)"
                  : "var(--ink-2)",
            }}
          >
            <span className="font-medium">{s.name}</span>
            <span
              className="block mt-0.5"
              style={{
                color:
                  styleId === s.id
                    ? "var(--accent-ink)"
                    : "var(--ink-4)",
              }}
            >
              {s.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
