"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEditorStore } from "@/lib/store/editor-store";

// Items that require an active project to navigate
const PROJECT_SCOPED_IDS = new Set(["designer", "layout", "timeline"]);

const NAV_ITEMS = [
  { id: "projects", label: "Projects", href: "/projects", icon: ProjectsIcon },
  { id: "designer", label: "Designer", href: "/designer", icon: DesignerIcon },
  { id: "layout", label: "Layout", href: "/projects", icon: LayoutIcon },
  { id: "timeline", label: "Timeline", href: "/timeline", icon: TimelineIcon },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const projectId = useEditorStore((s) => s.projectId);

  // When a project is loaded, rewrite project-scoped links to their real routes
  function getHref(item: (typeof NAV_ITEMS)[number]): string {
    if (!projectId || !PROJECT_SCOPED_IDS.has(item.id)) return item.href;
    if (item.id === "designer") return `/project/${projectId}`;
    if (item.id === "layout") return `/project/${projectId}/layout`;
    return `${item.href}?project=${projectId}`;
  }

  function isActive(id: string): boolean {
    if (id === "projects" && pathname === "/projects") return true;
    if (id === "designer" && pathname.startsWith("/project/") && !pathname.includes("/layout")) return true;
    if (id === "layout" && pathname.includes("/layout")) return true;
    if (id === "timeline" && pathname === "/timeline") return true;
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
        <Link href="/projects" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
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
          const active = isActive(item.id);
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
    </aside>
  );
}

/* ─── Icons ──────────────────────────────────────────── */

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

function LayoutIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#1e3a5f" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" />
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
