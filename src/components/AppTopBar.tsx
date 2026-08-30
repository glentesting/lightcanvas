"use client";

import Link from "next/link";
import { useEditorStore } from "@/lib/store/editor-store";

/**
 * Global top bar: which project is open, save status, and a jump into the
 * editor. Everything here is live — no decorative controls.
 */
export default function AppTopBar() {
  const projectId = useEditorStore((s) => s.projectId);
  const projectName = useEditorStore((s) => s.name);
  const saveStatus = useEditorStore((s) => s.saveStatus);

  const statusLabel =
    saveStatus === "saving" ? "Saving..." :
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
      {/* Current project */}
      <Link
        href="/projects"
        className="flex items-center gap-2 px-3 h-8 rounded-lg text-sm"
        style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)", textDecoration: "none" }}
        title="Back to the project list"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 3,18 21,18" />
        </svg>
        <span className="font-medium text-xs">{projectName || "No project open"}</span>
      </Link>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs" style={{ color: saveStatus === "error" ? "#b91c1c" : "var(--ink-4)" }} aria-label="Save status" aria-live="polite">
          {statusLabel}
        </span>

        <Link
          href={projectId ? `/project/${projectId}` : "/projects"}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "#1e3a5f", color: "#FFFFFF", textDecoration: "none" }}
        >
          Open Designer
        </Link>
      </div>
    </header>
  );
}
