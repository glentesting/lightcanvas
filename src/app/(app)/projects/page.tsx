"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectRow {
  id: string;
  name: string;
  audio_file: string | null;
  updated_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
      setProjects(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    // async fetch — state updates land after await, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`Failed to create project (${res.status})`);
      const project = await res.json();
      router.push(`/project/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCreating(false);
    }
  }, [newName, router]);

  const handleDelete = useCallback(
    async (project: ProjectRow) => {
      if (!confirm(`Delete "${project.name}"? This also deletes its audio and cannot be undone.`)) return;
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => (prev ? prev.filter((p) => p.id !== project.id) : prev));
      } else {
        setError(`Failed to delete (${res.status})`);
      }
    },
    []
  );

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}
          >
            Projects
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            One project per song.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-1.5"
          style={{ background: "#1e3a5f", color: "#fff", cursor: "pointer" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {showNew && (
        <div
          className="flex items-center gap-2 mb-5 p-3 rounded-xl"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowNew(false);
            }}
            placeholder="Song or project name..."
            className="flex-1 h-9 px-3 rounded-lg text-sm"
            style={{ border: "1px solid var(--line)", background: "#fff" }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="h-9 px-4 rounded-lg text-sm font-semibold"
            style={{
              background: "#1e3a5f",
              color: "#fff",
              opacity: creating || !newName.trim() ? 0.5 : 1,
              cursor: "pointer",
            }}
          >
            {creating ? "Creating..." : "Create"}
          </button>
          <button
            onClick={() => setShowNew(false)}
            className="h-9 px-3 rounded-lg text-sm font-medium"
            style={{ border: "1px solid var(--line)", background: "#fff", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#fee2e2", color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {projects === null && !error && (
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          Loading...
        </p>
      )}

      {projects && projects.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
            No projects yet
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
            Create one to start designing a show.
          </p>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
          {projects.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                background: "#fff",
                borderBottom: i < projects.length - 1 ? "1px solid var(--line)" : undefined,
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                  {p.audio_file ? `${p.audio_file} · ` : ""}
                  updated {new Date(p.updated_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => router.push(`/project/${p.id}`)}
                className="h-8 px-4 rounded-lg text-xs font-semibold"
                style={{ background: "#1e3a5f", color: "#fff", cursor: "pointer" }}
              >
                Open
              </button>
              <button
                onClick={() => handleDelete(p)}
                aria-label={`Delete ${p.name}`}
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ border: "1px solid var(--line)", background: "#fff", color: "var(--ink-3)", cursor: "pointer" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
