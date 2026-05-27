"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/lib/store/editor-store";

export default function DesignerPage() {
  const projectId = useEditorStore((s) => s.projectId);
  const router = useRouter();

  // If a project is loaded in the store, redirect to it
  useEffect(() => {
    if (projectId) {
      router.replace(`/project/${projectId}`);
    }
  }, [projectId, router]);

  if (projectId) {
    return null;
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "#FFFFFF" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "#f0f4f8", border: "1px solid var(--line)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>No project selected</p>
      <p className="text-xs" style={{ color: "var(--ink-4)" }}>Open a project to start designing your show.</p>
      <Link href="/projects" className="text-xs px-4 py-2 rounded-lg font-semibold"
        style={{ background: "#1e3a5f", color: "#fff", textDecoration: "none" }}>
        Open a Project
      </Link>
    </div>
  );
}
