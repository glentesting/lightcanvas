"use client";

import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

interface Project {
  id: string;
  name: string;
  audio_file: string | null;
  fixtures: unknown[];
  created_at: string;
  updated_at: string;
}

/* ─── Decorative house silhouette SVG ─────────────────────── */
function HouseSilhouette({ size = 64, opacity = 0.15 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ opacity }}>
      <polygon points="32,8 8,28 56,28" fill="white" />
      <rect x="12" y="28" width="40" height="26" fill="white" />
      <rect x="20" y="32" width="8" height="8" rx="1" fill="rgba(0,0,0,.3)" />
      <rect x="36" y="32" width="8" height="8" rx="1" fill="rgba(0,0,0,.3)" />
      <rect x="28" y="40" width="8" height="14" rx="1" fill="rgba(0,0,0,.3)" />
      <polygon points="52,38 52,18 62,28 62,38" fill="white" />
    </svg>
  );
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "onboarding") return;
    if (isLoaded && user && !user.publicMetadata?.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [isLoaded, user, router]);

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) { setNewName(""); setShowCreate(false); fetchProjects(); }
  }

  const handleRename = useCallback(async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: renameValue.trim() } : p)));
    setRenamingId(null);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (!res.ok) fetchProjects();
  }, [renameValue]);

  async function handleDelete(id: string) {
    setDeleteConfirm(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) fetchProjects();
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    if (res.ok) fetchProjects();
  }

  function relativeDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <header className="px-6 py-3.5 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs" style={{ background: "linear-gradient(135deg, var(--accent), oklch(72% 0.18 250))" }}>
            ✦
          </div>
          <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>LightCanvas</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            {user?.firstName || user?.emailAddresses[0]?.emailAddress}
          </span>
          <UserButton />
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
              Your Shows
            </h1>
            {!loading && projects.length > 0 && (
              <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        </div>

        {/* Create dialog */}
        {showCreate && (
          <form
            onSubmit={createProject}
            className="rounded-xl p-6 mb-8"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}
          >
            <h3 className="text-base font-semibold mb-4">Create New Project</h3>
            <input
              type="text"
              placeholder="e.g. Wizards in Winter 2026"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid var(--line)", background: "var(--bg)" }}
              required
              autoFocus
            />
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
                Create
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setNewName(""); }} className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "var(--ink-4)" }}>Loading projects...</p>
          </div>

        /* Empty state */
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-6">
              <HouseSilhouette size={120} opacity={0.25} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>No shows yet</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>Create your first light show to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Project
            </button>
          </div>

        /* Project grid */
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="relative rounded-xl overflow-hidden group"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(20,22,28,.10), 0 2px 6px rgba(20,22,28,.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "none";
                  (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
                }}
              >
                {/* Upper — dark preview area */}
                <Link href={`/project/${project.id}`} className="block relative" style={{ height: 160, background: "linear-gradient(180deg, #1a2440 0%, #0d1426 100%)" }}>
                  {/* Decorative house silhouette */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <HouseSilhouette size={80} opacity={0.12} />
                  </div>

                  {/* Hover: Open button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.3)" }}>
                      Open
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>

                  {/* Bottom overlay pills */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,.88)", backdropFilter: "blur(6px)", color: "var(--ink-2)", border: "1px solid rgba(255,255,255,.3)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12,2 3,18 21,18" /></svg>
                      {(project.fixtures as unknown[])?.length || 0} props
                    </span>
                    {project.audio_file && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium truncate" style={{ background: "rgba(255,255,255,.88)", backdropFilter: "blur(6px)", color: "var(--ink-2)", border: "1px solid rgba(255,255,255,.3)", maxWidth: 160 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M9 18V5l12-2v13" /></svg>
                        <span className="truncate">{project.audio_file}</span>
                      </span>
                    )}
                  </div>
                </Link>

                {/* Lower — metadata */}
                <div className="px-4 py-3.5">
                  {/* Rename inline */}
                  {renamingId === project.id ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(project.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(project.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="font-semibold w-full px-1.5 py-0.5 rounded-md text-[15px] focus:outline-none focus:ring-2"
                      style={{ border: "1px solid var(--accent)", background: "var(--bg)" }}
                    />
                  ) : (
                    <h3 className="font-semibold text-[15px] mb-0.5 truncate" style={{ color: "var(--ink)" }}>{project.name}</h3>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                      Updated {relativeDate(project.updated_at)}
                    </p>
                    {/* Action buttons */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Rename */}
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setRenameValue(project.name); setRenamingId(project.id); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel)]"
                        style={{ color: "var(--ink-3)" }}
                        title="Rename"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {/* Duplicate */}
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDuplicate(project.id); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel)]"
                        style={{ color: "var(--ink-3)" }}
                        title="Duplicate"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteConfirm(project.id); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel)]"
                        style={{ color: "var(--ink-3)" }}
                        title="Delete"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete confirmation overlay */}
                {deleteConfirm === project.id && (
                  <div className="absolute inset-0 z-50 rounded-xl flex flex-col items-center justify-center gap-3 p-6" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-3)" }}>
                      <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <p className="text-sm font-medium text-center">Delete &ldquo;{project.name}&rdquo;?</p>
                    <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>This will permanently delete the project and its audio.</p>
                    <div className="flex gap-2 mt-1">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: "#dc2626" }}>
                        Delete
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }} className="px-4 py-1.5 rounded-lg text-sm font-medium" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
