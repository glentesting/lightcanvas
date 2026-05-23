import Link from "next/link";

export default function ComingSoon({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ padding: 60, background: "#FFFFFF" }}>
      <div className="text-center" style={{ maxWidth: 440 }}>
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "#f0f4f8", border: "1px solid var(--line)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>

        <h1
          className="text-2xl font-semibold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)", letterSpacing: "-0.02em" }}
        >
          {name}
        </h1>
        <p className="text-sm mb-5" style={{ color: "var(--ink-2)" }}>{description}</p>

        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
          <span className="text-xs font-medium" style={{ color: "#92400e" }}>In Development</span>
        </div>

        <p className="text-xs mb-6" style={{ color: "var(--ink-4)", lineHeight: 1.6 }}>
          This page is actively being built and will be available soon.
          <br />
          You can continue working in the Designer and Layout Editor.
        </p>

        <div className="flex items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium"
            style={{ background: "#FFFFFF", border: "1px solid var(--line)", color: "var(--ink)", textDecoration: "none" }}
          >
            Dashboard
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold"
            style={{ background: "#1e3a5f", color: "#FFFFFF", textDecoration: "none" }}
          >
            Open a Project
          </Link>
        </div>
      </div>
    </div>
  );
}
