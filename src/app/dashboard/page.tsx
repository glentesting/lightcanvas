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
  parent_show_id: string | null;
  created_at: string;
  updated_at: string;
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

/* ─── Animated light dots for card preview ────────────────── */
const LIGHT_DOTS: Array<{ x: string; y: string; color: string; dur: string; delay: string; size: number }> = [
  // Roofline cluster
  { x: "22%", y: "28%", color: "#ff3b30", dur: "2.1s", delay: "0s", size: 5 },
  { x: "32%", y: "22%", color: "#ffd60a", dur: "1.7s", delay: "0.4s", size: 4 },
  { x: "42%", y: "20%", color: "#34c759", dur: "2.5s", delay: "0.8s", size: 5 },
  { x: "52%", y: "22%", color: "#0a84ff", dur: "1.9s", delay: "0.2s", size: 4 },
  { x: "62%", y: "28%", color: "#ffffff", dur: "2.3s", delay: "1.1s", size: 4 },
  // Tree area (right)
  { x: "78%", y: "35%", color: "#34c759", dur: "2.8s", delay: "0.5s", size: 5 },
  { x: "75%", y: "50%", color: "#ff3b30", dur: "1.6s", delay: "1.3s", size: 4 },
  { x: "82%", y: "45%", color: "#ffd60a", dur: "2.2s", delay: "0.7s", size: 5 },
  { x: "80%", y: "60%", color: "#0a84ff", dur: "2.6s", delay: "0.1s", size: 4 },
  // Scattered around
  { x: "15%", y: "55%", color: "#ffd60a", dur: "2.4s", delay: "0.9s", size: 4 },
  { x: "28%", y: "62%", color: "#ff3b30", dur: "1.8s", delay: "1.5s", size: 5 },
  { x: "55%", y: "58%", color: "#ffffff", dur: "3.0s", delay: "0.3s", size: 4 },
  { x: "45%", y: "45%", color: "#34c759", dur: "2.0s", delay: "0.6s", size: 5 },
  { x: "68%", y: "68%", color: "#0a84ff", dur: "1.5s", delay: "1.0s", size: 4 },
];

function CardLightDots() {
  return (
    <>
      <style>{`
        @keyframes twinkle-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
      {LIGHT_DOTS.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            background: dot.color,
            boxShadow: `0 0 ${dot.size + 2}px ${dot.color}`,
            animation: `twinkle-dot ${dot.dur} ease-in-out ${dot.delay} infinite`,
          }}
        />
      ))}
    </>
  );
}

/* ─── Icons ──────────────────────────────────────────────── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ─── Project Card (reused in both sections) ─────────────── */
function ProjectCard({
  project,
  renamingId,
  renameValue,
  renameInputRef,
  setRenameValue,
  setRenamingId,
  handleRename,
  handleDuplicate,
  deleteConfirm,
  setDeleteConfirm,
  handleDelete,
  relativeDate,
  shows,
  onAssignToShow,
  onRemoveFromShow,
  onCreateShowFromProject,
}: {
  project: Project;
  renamingId: string | null;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  setRenameValue: (v: string) => void;
  setRenamingId: (v: string | null) => void;
  handleRename: (id: string) => void;
  handleDuplicate: (id: string) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (v: string | null) => void;
  handleDelete: (id: string) => void;
  relativeDate: (d: string) => string;
  shows?: Show[];
  onAssignToShow?: (projectId: string, showId: string) => void;
  onRemoveFromShow?: (projectId: string) => void;
  onCreateShowFromProject?: (projectId: string) => void;
}) {
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  return (
    <div
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
      {/* Upper -- dark preview area with twinkling lights */}
      <Link href={`/project/${project.id}`} className="block relative" style={{ height: 160, background: "linear-gradient(180deg, #1a2440 0%, #0d1426 100%)" }}>
        {/* Decorative house silhouette */}
        <div className="absolute inset-0 flex items-center justify-center">
          <HouseSilhouette size={80} opacity={0.12} />
        </div>
        {/* Twinkling light dots */}
        <CardLightDots />

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

      {/* Lower -- metadata */}
      <div className="px-4 py-3.5" style={{ background: "#ffffff" }}>
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
            {/* Show assignment */}
            {shows && onAssignToShow && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowAssignMenu(!showAssignMenu); }}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel)]"
                  style={{ color: "var(--ink-3)" }}
                  title={project.parent_show_id ? "Move to show" : "Add to show"}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
                {showAssignMenu && (
                  <div
                    className="absolute right-0 top-8 z-50 rounded-lg py-1 min-w-[180px]"
                    style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 8px 28px rgba(20,22,28,.12)" }}
                    onMouseLeave={() => setShowAssignMenu(false)}
                  >
                    {shows.length > 0 && shows.map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAssignToShow(project.id, s.id); setShowAssignMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--panel)] transition-colors"
                        style={{ color: "var(--ink-2)" }}
                      >
                        {s.name}
                      </button>
                    ))}
                    {project.parent_show_id && onRemoveFromShow && (
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemoveFromShow(project.id); setShowAssignMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--panel)] transition-colors"
                        style={{ color: "#dc2626", borderTop: shows.length > 0 ? "1px solid var(--line)" : "none" }}
                      >
                        Remove from show
                      </button>
                    )}
                    {onCreateShowFromProject && !project.parent_show_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCreateShowFromProject(project.id); setShowAssignMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--panel)] transition-colors"
                        style={{ color: "var(--accent)", borderTop: shows.length > 0 ? "1px solid var(--line)" : "none" }}
                      >
                        Create show from this
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
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
  );
}

/* ─── Show Export Placeholder Modal ──────────────────────── */
function ShowExportModal({ showName, onClose }: { showName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,.35)" }} onClick={onClose}>
      <div
        className="rounded-xl p-6 max-w-sm w-full mx-4"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}
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
          className="w-full px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
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
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameShowInputRef = useRef<HTMLInputElement>(null);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "onboarding") return;
    if (isLoaded && user && !user.publicMetadata?.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [isLoaded, user, router]);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);

  useEffect(() => {
    if (renamingShowId && renameShowInputRef.current) renameShowInputRef.current.focus();
  }, [renamingShowId]);

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
    // Create the project
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSongName.trim() }),
    });
    if (res.ok) {
      const project = await res.json();
      // Assign to show
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
    // Optimistic update
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
    // Optimistic updates
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, parent_show_id: null } : p)));
    setShows((prev) => prev.map((s) => s.id === showId ? { ...s, song_order: s.song_order.filter((sid) => sid !== projectId) } : s));
    // Server: unassign project from show
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
    // Optimistic: unlink projects
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

  // Group projects
  const showIds = new Set(shows.map((s) => s.id));
  const unattachedProjects = projects.filter((p) => !p.parent_show_id || !showIds.has(p.parent_show_id));
  const projectsByShow = new Map<string, Project[]>();
  for (const show of shows) {
    const showProjects = projects.filter((p) => p.parent_show_id === show.id);
    // Sort by song_order
    const ordered: Project[] = [];
    for (const sid of show.song_order) {
      const proj = showProjects.find((p) => p.id === sid);
      if (proj) ordered.push(proj);
    }
    // Add any that are in the show but not in song_order
    for (const proj of showProjects) {
      if (!ordered.includes(proj)) ordered.push(proj);
    }
    projectsByShow.set(show.id, ordered);
  }

  const totalProjects = projects.length;
  const totalShows = shows.length;

  return (
    <div className="min-h-screen" style={{ background: "#faf8f5" }}>
      {/* Nav */}
      <header className="px-6 py-3.5 flex items-center justify-between" style={{ background: "#ffffff", borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs" style={{ background: "linear-gradient(135deg, var(--accent), oklch(72% 0.18 250))" }}>
            ✦
          </div>
          <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>LightCanvas</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            {user?.firstName || user?.emailAddresses[0]?.emailAddress}
          </span>
          <Link
            href="/settings"
            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel)]"
            style={{ color: "var(--ink-3)" }}
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <UserButton />
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2.5" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
              Your Shows
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--accent)" }}>
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
              </svg>
            </h1>
            {!loading && (totalProjects > 0 || totalShows > 0) && (
              <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
                {totalShows > 0 && <>{totalShows} show{totalShows !== 1 ? "s" : ""}</>}
                {totalShows > 0 && totalProjects > 0 && " · "}
                {totalProjects > 0 && <>{totalProjects} song{totalProjects !== 1 ? "s" : ""}</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateShow(true)}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Show
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Song
            </button>
          </div>
        </div>

        {/* Create Song dialog */}
        {showCreate && (
          <form
            onSubmit={createProject}
            className="rounded-xl p-6 mb-8"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}
          >
            <h3 className="text-base font-semibold mb-4">Create New Song</h3>
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

        {/* Create Show dialog */}
        {showCreateShow && (
          <form
            onSubmit={createShow}
            className="rounded-xl p-6 mb-8"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}
          >
            <h3 className="text-base font-semibold mb-4">Create New Show</h3>
            <input
              type="text"
              placeholder="e.g. Christmas 2026"
              value={newShowName}
              onChange={(e) => setNewShowName(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid var(--line)", background: "var(--bg)" }}
              required
              autoFocus
            />
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-3)" }}>Season Year</label>
            <input
              type="number"
              value={newShowYear}
              onChange={(e) => setNewShowYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-32 rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid var(--line)", background: "var(--bg)" }}
              min={2020}
              max={2099}
            />
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
                Create
              </button>
              <button type="button" onClick={() => { setShowCreateShow(false); setNewShowName(""); setNewShowYear(new Date().getFullYear()); }} className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
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

        /* Empty state -- no shows and no projects */
        ) : projects.length === 0 && shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-6">
              <HouseSilhouette size={120} opacity={0.25} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>No shows yet</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>Create your first light show to get started</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateShow(true)}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium"
                style={{ background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Show
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Song
              </button>
            </div>
          </div>

        ) : (
          <>
            {/* ═══ Shows Section ═══ */}
            {shows.length > 0 && (
              <section className="mb-10">
                {shows.map((show) => {
                  const isExpanded = expandedShows.has(show.id);
                  const songCount = projectsByShow.get(show.id)?.length || 0;

                  return (
                    <div
                      key={show.id}
                      className="rounded-xl mb-4 overflow-hidden"
                      style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
                    >
                      {/* Show header */}
                      <div className="px-5 py-4 flex items-center justify-between">
                        <button
                          onClick={() => toggleShowExpanded(show.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <ChevronIcon open={isExpanded} />
                          {renamingShowId === show.id ? (
                            <input
                              ref={renameShowInputRef}
                              type="text"
                              value={renameShowValue}
                              onChange={(e) => setRenameShowValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => handleRenameShow(show.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameShow(show.id);
                                if (e.key === "Escape") setRenamingShowId(null);
                              }}
                              className="font-semibold px-1.5 py-0.5 rounded-md text-[15px] focus:outline-none focus:ring-2 min-w-[200px]"
                              style={{ border: "1px solid var(--accent)", background: "var(--bg)" }}
                            />
                          ) : (
                            <span className="font-semibold text-[15px] truncate" style={{ color: "var(--ink)" }}>
                              {show.name}
                            </span>
                          )}
                          {show.season_year && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>
                              {show.season_year}
                            </span>
                          )}
                          <span className="shrink-0 text-xs" style={{ color: "var(--ink-4)" }}>
                            {songCount} song{songCount !== 1 ? "s" : ""}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 ml-3">
                          {/* Export Show */}
                          <button
                            onClick={() => setExportShowName(show.name)}
                            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel)]"
                            style={{ color: "var(--ink-3)" }}
                            title="Export Show"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                          {/* Rename Show */}
                          <button
                            onClick={() => { setRenameShowValue(show.name); setRenamingShowId(show.id); }}
                            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel)]"
                            style={{ color: "var(--ink-3)" }}
                            title="Rename Show"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {/* Delete Show */}
                          <button
                            onClick={() => setShowDeleteConfirm(show.id)}
                            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--panel)]"
                            style={{ color: "var(--ink-3)" }}
                            title="Delete Show"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Delete show confirmation */}
                      {showDeleteConfirm === show.id && (
                        <div className="px-5 pb-4 pt-0">
                          <div className="rounded-lg p-4 flex items-center gap-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                            <p className="text-sm flex-1" style={{ color: "var(--ink-2)" }}>
                              Delete &ldquo;{show.name}&rdquo;? Songs will be kept but unlinked.
                            </p>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => handleDeleteShow(show.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: "#dc2626" }}>
                                Delete
                              </button>
                              <button onClick={() => setShowDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expanded songs */}
                      {isExpanded && (
                        <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--line)" }}>
                          {songCount === 0 ? (
                            <p className="text-sm py-6 text-center" style={{ color: "var(--ink-4)" }}>
                              No songs yet. Add one to get started.
                            </p>
                          ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
                              {(projectsByShow.get(show.id) || []).map((project) => (
                                <ProjectCard
                                  key={project.id}
                                  project={project}
                                  renamingId={renamingId}
                                  renameValue={renameValue}
                                  renameInputRef={renameInputRef}
                                  setRenameValue={setRenameValue}
                                  setRenamingId={setRenamingId}
                                  handleRename={handleRename}
                                  handleDuplicate={handleDuplicate}
                                  deleteConfirm={deleteConfirm}
                                  setDeleteConfirm={setDeleteConfirm}
                                  handleDelete={handleDelete}
                                  relativeDate={relativeDate}
                                  shows={shows}
                                  onAssignToShow={handleAssignToShow}
                                  onRemoveFromShow={handleRemoveFromShow}
                                />
                              ))}
                            </div>
                          )}
                          {/* Add Song to Show */}
                          {createSongForShowId === show.id ? (
                            <form onSubmit={createSongForShow} className="flex items-center gap-2 mt-4">
                              <input
                                type="text"
                                placeholder="Song name..."
                                value={newSongName}
                                onChange={(e) => setNewSongName(e.target.value)}
                                className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 flex-1"
                                style={{ border: "1px solid var(--line)", background: "var(--bg)" }}
                                required
                                autoFocus
                              />
                              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
                                Add
                              </button>
                              <button type="button" onClick={() => { setCreateSongForShowId(null); setNewSongName(""); }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={() => setCreateSongForShowId(show.id)}
                              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                              style={{ color: "var(--accent)" }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                              Add Song
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            {/* ═══ Unattached Songs Section ═══ */}
            {unattachedProjects.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--ink-2)" }}>
                    Songs not in a show
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: "var(--panel)", color: "var(--ink-4)", border: "1px solid var(--line)" }}>
                    {unattachedProjects.length}
                  </span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {unattachedProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      renameInputRef={renameInputRef}
                      setRenameValue={setRenameValue}
                      setRenamingId={setRenamingId}
                      handleRename={handleRename}
                      handleDuplicate={handleDuplicate}
                      deleteConfirm={deleteConfirm}
                      setDeleteConfirm={setDeleteConfirm}
                      handleDelete={handleDelete}
                      relativeDate={relativeDate}
                      shows={shows}
                      onAssignToShow={handleAssignToShow}
                      onRemoveFromShow={handleRemoveFromShow}
                      onCreateShowFromProject={createShowFromProject}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* When there are shows but no unattached projects, and all shows are empty */}
            {shows.length > 0 && projects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: "var(--ink-4)" }}>
                  Create a song to add to your shows.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Show Export placeholder modal */}
      {exportShowName && (
        <ShowExportModal showName={exportShowName} onClose={() => setExportShowName(null)} />
      )}
    </div>
  );
}
