"use client";

import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";

/**
 * Global top bar for the app shell.
 * Shows project selector, search, save status, and primary actions.
 */
export default function AppTopBar() {
  const projectId = useEditorStore((s) => s.projectId);
  const projectName = useEditorStore((s) => s.name);
  const saveStatus = useEditorStore((s) => s.saveStatus);

  const statusLabel =
    saveStatus === "saving" ? "Saving..." :
    saveStatus === "saved" ? "All changes saved" :
    saveStatus === "error" ? "Save error" :
    "All changes saved";

  return (
    <header
      className="flex items-center gap-4 px-5 shrink-0"
      style={{
        height: 52,
        background: "#FFFFFF",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {/* Project selector */}
      <div
        className="flex items-center gap-2 px-3 h-8 rounded-lg text-sm cursor-default"
        style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 3,18 21,18" />
        </svg>
        <span className="font-medium text-xs">{projectName || "Christmas 2026"}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.4 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center">
        <div
          className="flex items-center gap-2 px-3 h-8 rounded-lg text-xs cursor-pointer max-w-xs w-full"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-4)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search everything...</span>
          <span
            className="ml-auto inline-flex items-center justify-center px-1.5 rounded font-mono"
            style={{ height: 18, background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink-4)", fontSize: 10 }}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2.5">
        {/* Save status */}
        <span className="text-xs" style={{ color: saveStatus === "error" ? "#b91c1c" : "var(--ink-4)" }} aria-label="Save status" aria-live="polite">
          {statusLabel}
        </span>

        {/* Preview button */}
        <button
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Preview
        </button>

        {/* Primary CTA */}
        {projectId ? (
          <Link
            href={`/project/${projectId}`}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "#1e3a5f", color: "#FFFFFF", textDecoration: "none" }}
          >
            Open Designer
          </Link>
        ) : (
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "#1e3a5f", color: "#FFFFFF", textDecoration: "none" }}
          >
            Open Designer
          </Link>
        )}
      </div>
    </header>
  );
}
