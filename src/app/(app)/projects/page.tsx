"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import ImportDialog from "@/components/ImportDialog";

interface Project {
  id: string;
  name: string;
  audio_file: string | null;
  fixtures: unknown[];
  parent_show_id: string | null;
  created_at: string;
  updated_at: string;
  house_custom_svg?: string | null;
}

interface Show {
  id: string;
  name: string;
  description: string | null;
  season_year: number | null;
  is_active: boolean;
  song_order: string[];
  created_at: string;
  updated_at: string;
}

/* ─── Templates ─────────────────────────────────────────── */
const TEMPLATES = [
  { name: "Classic Warm White", desc: "Elegant & Timeless", color: "#fbbf24" },
  { name: "Candy Cane", desc: "Red & White Magic", color: "#ef4444" },
  { name: "North Pole", desc: "Whimsical & Bright", color: "#22c55e" },
  { name: "Winter Wonderland", desc: "Cool & Icy Blues", color: "#3b82f6" },
  { name: "Golden Glow", desc: "Warm & Radiant", color: "#f59e0b" },
  { name: "Minimal Modern", desc: "Clean & Contemporary", color: "#6b7280" },
];

/* ─── Fixture kind labels ───────────────────────────────── */
function getFixtureKinds(fixtures: unknown[]): string {
  if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) return "No props yet";
  const kinds = fixtures
    .slice(0, 3)
    .map((f) => {
      const fix = f as { kind?: string; name?: string };
      return fix.kind || fix.name || "Prop";
    });
  return kinds.join(" + ");
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

/* ─── Three-dot menu ────────────────────────────────────── */
function ThreeDotMenu({
  projectId: _projectId,
  projectName: _projectName,
  onRename,
  onDuplicate,
  onDelete,
}: {
  projectId: string;
  projectName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(!open); }}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: "var(--ink-3)", background: open ? "var(--panel)" : "transparent" }}
        title="More actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-50 rounded-xl py-1.5 min-w-[160px]"
          style={{ background: "#ffffff", border: "1px solid var(--line)", boxShadow: "0 8px 28px rgba(20,22,28,.12)" }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRename(); setOpen(false); }}
            className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2.5"
            style={{ color: "var(--ink-2)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Rename
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDuplicate(); setOpen(false); }}
            className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2.5"
            style={{ color: "var(--ink-2)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Duplicate
          </button>
          <div style={{ borderTop: "1px solid var(--line)", margin: "4px 0" }} />
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); setOpen(false); }}
            className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-red-50 transition-colors flex items-center gap-2.5"
            style={{ color: "#dc2626" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Show Export Placeholder Modal ──────────────────────── */
function ShowExportModal({ showName, onClose }: { showName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,.35)" }} onClick={onClose}>
      <div
        className="rounded-2xl p-6 max-w-sm w-full mx-4"
        style={{ background: "#ffffff", border: "1px solid var(--line)", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>Export Show</h3>
        <p className="text-sm mb-2" style={{ color: "var(--ink-2)" }}>
          &ldquo;{showName}&rdquo;
        </p>
        <div className="rounded-lg p-4 mb-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            Show export (multi-song ZIP with shared fixture config) is coming soon. For now, open each song individually and use the Export button in the editor.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "#1e3a5f", color: "#fff" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateShow, setShowCreateShow] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShowName, setNewShowName] = useState("");
  const [newShowYear, setNewShowYear] = useState(new Date().getFullYear());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [renamingShowId, setRenamingShowId] = useState<string | null>(null);
  const [renameShowValue, setRenameShowValue] = useState("");
  const [exportShowName, setExportShowName] = useState<string | null>(null);
  const [createSongForShowId, setCreateSongForShowId] = useState<string | null>(null);
  const [newSongName, setNewSongName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "drafts" | "archived" | "templates">("active");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameShowInputRef = useRef<HTMLInputElement>(null);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "onboarding") return;
    if (isLoaded && user && !user.publicMetadata?.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [isLoaded, user, router]);

  async function fetchAll() {
    const [projRes, showRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/shows"),
    ]);
    if (projRes.ok) setProjects(await projRes.json());
    if (showRes.ok) setShows(await showRes.json());
    setLoading(false);
  }

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }

  async function fetchShows() {
    const res = await fetch("/api/shows");
    if (res.ok) setShows(await res.json());
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);

  useEffect(() => {
    if (renamingShowId && renameShowInputRef.current) renameShowInputRef.current.focus();
  }, [renamingShowId]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) { setNewName(""); setShowCreate(false); fetchProjects(); }
  }

  async function createSongForShow(e: React.FormEvent) {
    e.preventDefault();
    if (!createSongForShowId || !newSongName.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSongName.trim() }),
    });
    if (res.ok) {
      const project = await res.json();
      await fetch(`/api/shows/${createSongForShowId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign-project", project_id: project.id }),
      });
      setNewSongName("");
      setCreateSongForShowId(null);
      fetchAll();
    }
  }

  async function createShow(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newShowName.trim(), season_year: newShowYear }),
    });
    if (res.ok) {
      const newShow = await res.json();
      setNewShowName("");
      setNewShowYear(new Date().getFullYear());
      setShowCreateShow(false);
      setExpandedShows((prev) => new Set(prev).add(newShow.id));
      fetchShows();
    }
  }

  async function createShowFromProject(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const res = await fetch("/api/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${project.name} Show`, season_year: new Date().getFullYear() }),
    });
    if (res.ok) {
      const newShow = await res.json();
      await fetch(`/api/shows/${newShow.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign-project", project_id: projectId }),
      });
      setExpandedShows((prev) => new Set(prev).add(newShow.id));
      fetchAll();
    }
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

  async function handleAssignToShow(projectId: string, showId: string) {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, parent_show_id: showId } : p)));
    const res = await fetch(`/api/shows/${showId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign-project", project_id: projectId }),
    });
    if (!res.ok) fetchAll();
  }

  async function handleRemoveFromShow(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project?.parent_show_id) return;
    const showId = project.parent_show_id;
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, parent_show_id: null } : p)));
    setShows((prev) => prev.map((s) => s.id === showId ? { ...s, song_order: s.song_order.filter((sid) => sid !== projectId) } : s));
    const res = await fetch(`/api/shows/${showId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unassign-project", project_id: projectId }),
    });
    if (!res.ok) fetchAll();
  }

  async function handleDeleteShow(id: string) {
    setShowDeleteConfirm(null);
    setShows((prev) => prev.filter((s) => s.id !== id));
    setProjects((prev) => prev.map((p) => (p.parent_show_id === id ? { ...p, parent_show_id: null } : p)));
    const res = await fetch(`/api/shows/${id}`, { method: "DELETE" });
    if (!res.ok) fetchAll();
  }

  const handleRenameShow = useCallback(async (id: string) => {
    if (!renameShowValue.trim()) { setRenamingShowId(null); return; }
    setShows((prev) => prev.map((s) => (s.id === id ? { ...s, name: renameShowValue.trim() } : s)));
    setRenamingShowId(null);
    const res = await fetch(`/api/shows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameShowValue.trim() }),
    });
    if (!res.ok) fetchShows();
  }, [renameShowValue]);

  function toggleShowExpanded(id: string) {
    setExpandedShows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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

  // Preserve show CRUD handlers and state for future UI wiring (show management, song assignment, etc.)
  void createSongForShow; void createShowFromProject; void handleAssignToShow;
  void handleRemoveFromShow; void handleDeleteShow; void handleRenameShow; void toggleShowExpanded;
  void expandedShows; void showDeleteConfirm; void setRenameShowValue;

  // Group projects by show
  const showIds = new Set(shows.map((s) => s.id));
  const unattachedProjects = projects.filter((p) => !p.parent_show_id || !showIds.has(p.parent_show_id));
  const projectsByShow = new Map<string, Project[]>();
  for (const show of shows) {
    const showProjects = projects.filter((p) => p.parent_show_id === show.id);
    const ordered: Project[] = [];
    for (const sid of show.song_order) {
      const proj = showProjects.find((p) => p.id === sid);
      if (proj) ordered.push(proj);
    }
    for (const proj of showProjects) {
      if (!ordered.includes(proj)) ordered.push(proj);
    }
    projectsByShow.set(show.id, ordered);
  }

  // Build show labels for projects
  const showNameById = new Map<string, string>();
  for (const s of shows) showNameById.set(s.id, s.name);

  // Tab counts
  const activeCount = projects.length;
  const draftsCount = 0;
  const archivedCount = 0;
  const templatesCount = TEMPLATES.length;

  const tabs: Array<{ key: typeof activeTab; label: string; count: number }> = [
    { key: "active", label: "Active", count: activeCount },
    { key: "drafts", label: "Drafts", count: draftsCount },
    { key: "archived", label: "Archived", count: archivedCount },
    { key: "templates", label: "Templates", count: templatesCount },
  ];

  // Group active projects: show-grouped first, then unattached
  function renderProjectCard(project: Project, showLabel?: string) {
    const fixtureCount = Array.isArray(project.fixtures) ? project.fixtures.length : 0;
    const scopeLabel = getFixtureKinds(project.fixtures as unknown[]);

    return (
      <div
        key={project.id}
        className="relative rounded-2xl overflow-hidden group"
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(20,22,28,.10), 0 4px 12px rgba(20,22,28,.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)";
        }}
      >
        {/* Upper -- dark preview area */}
        <div
          className="relative"
          style={{
            height: 180,
            background: "linear-gradient(180deg, #1a2440 0%, #0d1426 100%)",
          }}
        >
          {/* House silhouette */}
          <div className="absolute inset-0 flex items-center justify-center">
            <HouseSilhouette size={90} opacity={0.10} />
          </div>

          {/* Nighttime glow at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 40,
              background: "linear-gradient(180deg, transparent 0%, rgba(56,189,248,.08) 100%)",
            }}
          />

          {/* Active badge top-left */}
          <div className="absolute top-3 left-3">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: "rgba(34,197,94,.9)", color: "#fff" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Active
            </span>
          </div>

          {/* Readiness score top-right */}
          <div className="absolute top-3 right-3">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(255,255,255,.15)", color: "#fff", backdropFilter: "blur(8px)" }}
            >
              87
            </span>
          </div>

          {/* Show label if grouped */}
          {showLabel && (
            <div className="absolute bottom-3 left-3">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.7)", backdropFilter: "blur(4px)" }}
              >
                {showLabel}
              </span>
            </div>
          )}
        </div>

        {/* Lower -- metadata */}
        <div className="px-4 py-4" style={{ background: "#ffffff" }}>
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
              className="w-full px-2 py-1 rounded-lg text-lg focus:outline-none focus:ring-2"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500, border: "1px solid #1e3a5f", background: "#f8fafc" }}
            />
          ) : (
            <h3
              className="text-lg truncate mb-0.5"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--ink)", lineHeight: 1.3 }}
            >
              {project.name}
            </h3>
          )}

          {/* Scope line */}
          <p className="text-[13px] truncate mb-1" style={{ color: "var(--ink-3)", fontFamily: "var(--font-body)" }}>
            {scopeLabel}
          </p>

          {/* Updated timestamp */}
          <p className="text-[12px] mb-3" style={{ color: "var(--ink-4)" }}>
            Updated {relativeDate(project.updated_at)}
          </p>

          {/* Prop count + readiness bar */}
          <div className="flex items-center gap-2 mb-3.5">
            <span className="text-[12px] font-medium shrink-0" style={{ color: "var(--ink-3)" }}>
              {fixtureCount} props
            </span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: "87%", background: "#38bdf8" }}
              />
            </div>
            <span className="text-[12px] font-medium shrink-0" style={{ color: "var(--ink-3)" }}>
              87%
            </span>
          </div>

          {/* Bottom row: Open + three-dot */}
          <div className="flex items-center justify-between">
            <Link
              href={`/project/${project.id}`}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium transition-colors"
              style={{ background: "#f1f5f9", color: "#1e3a5f" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#e2e8f0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
            >
              Open
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </Link>
            <ThreeDotMenu
              projectId={project.id}
              projectName={project.name}
              onRename={() => { setRenameValue(project.name); setRenamingId(project.id); }}
              onDuplicate={() => handleDuplicate(project.id)}
              onDelete={() => setDeleteConfirm(project.id)}
            />
          </div>
        </div>

        {/* Delete confirmation overlay */}
        {deleteConfirm === project.id && (
          <div
            className="absolute inset-0 z-50 rounded-2xl flex flex-col items-center justify-center gap-3 p-6"
            style={{ background: "#ffffff", border: "1px solid var(--line)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-3)" }}>
              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <p className="text-sm font-medium text-center" style={{ color: "var(--ink)" }}>Delete &ldquo;{project.name}&rdquo;?</p>
            <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>This will permanently delete the project and its audio.</p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: "#dc2626" }}
              >
                Delete
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "#ffffff", border: "1px solid var(--line)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderTemplateCard(template: typeof TEMPLATES[number]) {
    return (
      <div
        key={template.name}
        className="relative rounded-2xl overflow-hidden group cursor-pointer"
        style={{
          border: "1px solid var(--line)",
          boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(20,22,28,.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,.04)";
        }}
      >
        {/* Gradient thumbnail */}
        <div
          className="relative"
          style={{
            height: 100,
            background: `linear-gradient(135deg, ${template.color}44 0%, ${template.color} 100%)`,
          }}
        >
          {/* Hover overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,.4)" }}
          >
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#1e3a5f" }}>
              Use Template
            </span>
          </div>
        </div>
        <div className="p-3" style={{ background: "#ffffff" }}>
          <p className="text-[14px] font-semibold truncate" style={{ color: "var(--ink)" }}>{template.name}</p>
          <p className="text-[12px] truncate" style={{ color: "var(--ink-4)" }}>{template.desc}</p>
        </div>
      </div>
    );
  }

  // Build the active-tab project list grouped by show
  function renderActiveProjects() {
    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="mb-6">
            <HouseSilhouette size={120} opacity={0.2} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>No projects yet</h2>
          <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>Create your first light show to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-medium"
            style={{ background: "#1e3a5f", color: "#fff" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        </div>
      );
    }

    const sections: React.ReactNode[] = [];

    // Show-grouped projects
    for (const show of shows) {
      const showProjects = projectsByShow.get(show.id) || [];
      if (showProjects.length === 0) continue;
      sections.push(
        <div key={`show-${show.id}`} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[13px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--ink-4)", fontFamily: "var(--font-body)" }}
            >
              {show.name}
            </span>
            {show.season_year && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--panel)", color: "var(--ink-4)" }}>
                {show.season_year}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {showProjects.map((p) => renderProjectCard(p, show.name))}
          </div>
        </div>
      );
    }

    // Unattached projects
    if (unattachedProjects.length > 0) {
      sections.push(
        <div key="unattached">
          {shows.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[13px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--ink-4)", fontFamily: "var(--font-body)" }}
              >
                Standalone
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {unattachedProjects.map((p) => renderProjectCard(p))}
          </div>
        </div>
      );
    }

    return <>{sections}</>;
  }

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        {/* Page Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1
              className="tracking-tight mb-1"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 48,
                fontWeight: 500,
                color: "var(--ink)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              Projects
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--ink-3)", lineHeight: 1.5 }}>
              Manage your holiday lighting shows. Create, edit, and organize your projects.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "#ffffff", color: "var(--ink-2)", border: "1px solid var(--line)" }}
              title="Import from xLights (.xsq) or Light-O-Rama (.lms)"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#ffffff"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "#1e3a5f", color: "#fff" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#162d4a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#1e3a5f"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Project
            </button>
          </div>
        </div>

        {/* Tab Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  background: activeTab === tab.key ? "#1e3a5f" : "transparent",
                  color: activeTab === tab.key ? "#fff" : "var(--ink-3)",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.key) (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.key) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {tab.label}
                <span
                  className="text-[12px] font-normal"
                  style={{
                    color: activeTab === tab.key ? "rgba(255,255,255,.7)" : "var(--ink-4)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sort + view controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--ink-3)" }}>
              <span>Sort by:</span>
              <button
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: "var(--ink-2)" }}
              >
                Last edited
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
              <button
                className="w-8 h-8 flex items-center justify-center"
                style={{ background: "#1e3a5f", color: "#fff" }}
                title="Grid view"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center"
                style={{ background: "#ffffff", color: "var(--ink-3)" }}
                title="List view"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Create Project dialog */}
        {showCreate && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,.35)" }}
            onClick={() => { setShowCreate(false); setNewName(""); }}
          >
            <form
              onSubmit={createProject}
              className="rounded-2xl p-6 max-w-md w-full mx-4"
              style={{ background: "#ffffff", border: "1px solid var(--line)", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>Create New Project</h3>
              <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>Give your project a name to get started.</p>
              <input
                type="text"
                placeholder="e.g. Christmas 2026"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 mb-5 text-sm focus:outline-none focus:ring-2"
                style={{ border: "1px solid var(--line)", background: "#f8fafc" }}
                required
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewName(""); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "#ffffff", border: "1px solid var(--line)", color: "var(--ink-2)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "#1e3a5f", color: "#fff" }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Create Show dialog */}
        {showCreateShow && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,.35)" }}
            onClick={() => { setShowCreateShow(false); setNewShowName(""); setNewShowYear(new Date().getFullYear()); }}
          >
            <form
              onSubmit={createShow}
              className="rounded-2xl p-6 max-w-md w-full mx-4"
              style={{ background: "#ffffff", border: "1px solid var(--line)", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>Create New Show</h3>
              <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>Group multiple songs into one show.</p>
              <input
                type="text"
                placeholder="e.g. Christmas 2026"
                value={newShowName}
                onChange={(e) => setNewShowName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 mb-3 text-sm focus:outline-none focus:ring-2"
                style={{ border: "1px solid var(--line)", background: "#f8fafc" }}
                required
                autoFocus
              />
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-3)" }}>Season Year</label>
              <input
                type="number"
                value={newShowYear}
                onChange={(e) => setNewShowYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-32 rounded-xl px-4 py-3 mb-5 text-sm focus:outline-none focus:ring-2"
                style={{ border: "1px solid var(--line)", background: "#f8fafc" }}
                min={2020}
                max={2099}
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowCreateShow(false); setNewShowName(""); setNewShowYear(new Date().getFullYear()); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "#ffffff", border: "1px solid var(--line)", color: "var(--ink-2)" }}
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: "#1e3a5f", color: "#fff" }}>
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--line)", borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "var(--ink-4)" }}>Loading projects...</p>
          </div>
        ) : activeTab === "active" ? (
          renderActiveProjects()
        ) : activeTab === "templates" ? (
          <div>
            <div className="mb-5">
              <h2
                className="text-[13px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--ink-4)", fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
              >
                Templates
              </h2>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                Start with a professional design made for home displays
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {TEMPLATES.map((t) => renderTemplateCard(t))}
            </div>
          </div>
        ) : (
          /* Drafts or Archived empty state */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-4">
              <HouseSilhouette size={80} opacity={0.15} />
            </div>
            <p className="text-sm" style={{ color: "var(--ink-4)" }}>
              No {activeTab} projects yet.
            </p>
          </div>
        )}
      </div>

      {/* Show Export placeholder modal */}
      {exportShowName && (
        <ShowExportModal showName={exportShowName} onClose={() => setExportShowName(null)} />
      )}

      {/* Import dialog */}
      <ImportDialog
        open={showImport}
        onClose={() => {
          setShowImport(false);
          fetchProjects();
        }}
      />
    </div>
  );
}
