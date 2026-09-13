"use client";

/**
 * The shared "your show is loading / your show didn't load" screen.
 *
 * Paired with `useProjectLoad`. Every page that loads a project renders this
 * the same way, so a failure always looks the same and always offers a way
 * out — a Try again button and a route back to Projects. An error screen
 * with no exit is the defect this replaces.
 */

import Link from "next/link";

export function ProjectLoading() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg)" }}>
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--line)", borderTopColor: "transparent" }}
      />
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Loading your show...
      </p>
    </div>
  );
}

export function ProjectLoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "var(--bg)" }}>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "var(--panel)", color: "var(--ink-3)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ maxWidth: 520, lineHeight: 1.6 }}>
        {message}
      </p>
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm px-4 py-2 rounded-md font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Try again
          </button>
        )}
        <Link
          href="/projects"
          className="text-sm px-4 py-2 rounded-md"
          style={{ background: "var(--panel)", color: "var(--ink-1)", border: "1px solid var(--line)" }}
        >
          Back to Projects
        </Link>
      </div>
    </div>
  );
}
