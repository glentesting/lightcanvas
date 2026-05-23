"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useEditorStore } from "@/lib/store/editor-store";

// Items that require an active project to navigate
const PROJECT_SCOPED_IDS = new Set(["designer", "timeline", "ai-studio", "audio", "preflight", "exports"]);

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { id: "projects", label: "Projects", href: "/projects", icon: ProjectsIcon },
  { id: "designer", label: "Designer", href: "/designer", icon: DesignerIcon },
  { id: "timeline", label: "Timeline", href: "/timeline", icon: TimelineIcon },
  { id: "ai-studio", label: "AI Studio", href: "/ai-studio", icon: AIStudioIcon },
  { id: "audio", label: "Audio", href: "/audio", icon: AudioIcon },
  { id: "preflight", label: "Preflight", href: "/preflight", icon: PreflightIcon },
  { id: "exports", label: "Exports", href: "/exports", icon: ExportsIcon },
  { id: "settings", label: "Settings", href: "/settings", icon: SettingsIcon },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const projectId = useEditorStore((s) => s.projectId);

  // When a project is loaded, rewrite project-scoped links to their real routes
  function getHref(item: typeof NAV_ITEMS[number]): string {
    if (!projectId || !PROJECT_SCOPED_IDS.has(item.id)) return item.href;
    if (item.id === "designer") return `/project/${projectId}`;
    if (item.id === "timeline") return `/timeline?project=${projectId}`;
    // Stubs keep their standalone route — they show "Coming Soon" with project context
    return item.href;
  }

  function isActive(_href: string, id: string): boolean {
    if (id === "dashboard" && pathname === "/dashboard") return true;
    if (id === "projects" && pathname === "/projects") return true;
    if (id === "designer" && pathname.startsWith("/project/") && !pathname.includes("/layout")) return true;
    if (id === "timeline" && pathname === "/timeline") return true;
    if (id === "settings" && pathname.startsWith("/settings")) return true;
    if (id === "ai-studio" && pathname === "/ai-studio") return true;
    if (id === "audio" && pathname === "/audio") return true;
    if (id === "preflight" && pathname === "/preflight") return true;
    if (id === "exports" && pathname === "/exports") return true;
    return false;
  }

  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0"
      style={{
        width: 220,
        background: "#FFFFFF",
        borderRight: "1px solid var(--line)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
            style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}
          >
            ✦
          </div>
          <span
            className="text-[17px] font-semibold"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em", color: "var(--ink)" }}
          >
            LightCanvas
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const href = getHref(item);
          const active = isActive(href, item.id);
          const Icon = item.icon;
          const needsProject = PROJECT_SCOPED_IDS.has(item.id) && !projectId;
          return (
            <Link
              key={item.id}
              href={needsProject ? "/projects" : href}
              className="flex items-center gap-3 px-3 h-9 rounded-lg text-[13.5px] font-medium transition-colors"
              style={{
                color: active ? "#1e3a5f" : needsProject ? "var(--ink-4)" : "var(--ink-3)",
                background: active ? "#f0f4f8" : "transparent",
                fontWeight: active ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "#f8f8f8";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
              title={needsProject ? "Select a project first" : undefined}
            >
              <Icon active={active} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Profile chip */}
      <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <UserButton />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--ink)" }}>
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.firstName || user?.emailAddresses[0]?.emailAddress || ""}
            </p>
            <p className="text-[11px] truncate" style={{ color: "var(--ink-4)" }}>
              {user?.emailAddresses[0]?.emailAddress || ""}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Icons ──────────────────────────────────────────── */

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function ProjectsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function DesignerIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

function TimelineIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="6" x2="22" y2="6" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="18" x2="22" y2="18" />
      <rect x="4" y="4" width="6" height="4" rx="1" fill={active ? "#1e3a5f" : "currentColor"} opacity="0.2" />
      <rect x="12" y="10" width="8" height="4" rx="1" fill={active ? "#1e3a5f" : "currentColor"} opacity="0.2" />
    </svg>
  );
}

function AIStudioIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function AudioIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function PreflightIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ExportsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
