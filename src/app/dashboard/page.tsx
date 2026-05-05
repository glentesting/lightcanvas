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

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Redirect to onboarding if not completed
  // Skip if "from=onboarding" param is present (session may still be refreshing)
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "onboarding") return;
    if (isLoaded && user && !user.publicMetadata?.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName("");
      setShowCreate(false);
      fetchProjects();
    }
  }

  const handleRename = useCallback(async (id: string) => {
    if (!renameValue.trim()) return;
    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: renameValue.trim() } : p))
    );
    setRenamingId(null);

    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (!res.ok) {
      // Rollback on error
      fetchProjects();
    }
  }, [renameValue]);

  async function handleDelete(id: string) {
    setDeleteConfirm(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));

    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      fetchProjects();
    }
  }

  async function handleDuplicate(id: string) {
    setMenuOpen(null);
    const res = await fetch(`/api/projects/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    if (res.ok) {
      fetchProjects();
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="px-6 py-3.5 flex items-center justify-between"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
      >
        <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>LightShow AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            {user?.firstName || user?.emailAddresses[0]?.emailAddress}
          </span>
          <UserButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Projects</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
          >
            New Project
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={createProject}
            className="rounded-lg p-6 mb-6"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
          >
            <h3 className="text-lg font-medium mb-4">Create New Project</h3>
            <input
              type="text"
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-md px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
              required
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p style={{ color: "var(--ink-4)" }}>Loading projects...</p>
        ) : projects.length === 0 ? (
          <div
            className="rounded-lg p-12 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--accent-50)", color: "var(--accent-ink)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
              </svg>
            </div>
            <p className="text-sm mb-1" style={{ color: "var(--ink-3)" }}>No projects yet</p>
            <p className="text-xs" style={{ color: "var(--ink-4)" }}>Create your first light show to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="relative rounded-lg p-5 transition-all group"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Card content — clickable link */}
                <Link href={`/project/${project.id}`} className="block">
                  {renamingId === project.id ? (
                    <div onClick={(e) => e.preventDefault()}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(project.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="font-semibold text-sm w-full px-1 py-0.5 rounded focus:outline-none focus:ring-2"
                        style={{ border: "1px solid var(--accent)", background: "var(--bg)" }}
                        autoFocus
                        onClick={(e) => e.preventDefault()}
                      />
                    </div>
                  ) : (
                    <h3 className="font-semibold text-sm mb-1 pr-8">{project.name}</h3>
                  )}
                  <p className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                    {(project.fixtures as unknown[])?.length || 0} fixtures
                    {project.audio_file ? ` · ${project.audio_file}` : ""}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </p>
                </Link>

                {/* More menu button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === project.id ? null : project.id);
                  }}
                  className="absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--ink-3)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--panel)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="13" r="1.5" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {menuOpen === project.id && (
                  <div
                    ref={menuRef}
                    className="absolute top-12 right-4 z-50 rounded-lg py-1 min-w-[140px]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      boxShadow: "0 8px 28px rgba(20,22,28,.10), 0 2px 6px rgba(20,22,28,.05)",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(null);
                        setRenameValue(project.name);
                        setRenamingId(project.id);
                      }}
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      style={{ color: "var(--ink)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "var(--panel)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(project.id);
                      }}
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      style={{ color: "var(--ink)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "var(--panel)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      Duplicate
                    </button>
                    <div style={{ borderTop: "1px solid var(--line)", margin: "2px 0" }} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(null);
                        setDeleteConfirm(project.id);
                      }}
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      style={{ color: "#dc2626" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "var(--panel)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Delete confirmation */}
                {deleteConfirm === project.id && (
                  <div
                    className="absolute inset-0 z-50 rounded-lg flex flex-col items-center justify-center gap-3 p-4"
                    style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                  >
                    <p className="text-sm font-medium text-center">
                      Delete &ldquo;{project.name}&rdquo;?
                    </p>
                    <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>
                      This will permanently delete the project and its audio.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="px-3 py-1.5 rounded-md text-sm font-medium text-white"
                        style={{ background: "#dc2626" }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(null);
                        }}
                        className="px-3 py-1.5 rounded-md text-sm font-medium"
                        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                      >
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
