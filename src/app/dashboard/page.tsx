"use client";

import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  audio_file: string | null;
  fixtures: unknown[];
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

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

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="px-6 py-3.5 flex items-center justify-between"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
      >
        <h1 className="text-lg font-bold">LightShow AI</h1>
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
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="rounded-lg p-5 transition-all"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3 className="font-semibold text-sm mb-1">{project.name}</h3>
                <p className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                  {(project.fixtures as unknown[])?.length || 0} fixtures
                  {project.audio_file ? ` · ${project.audio_file}` : ""}
                </p>
                <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
