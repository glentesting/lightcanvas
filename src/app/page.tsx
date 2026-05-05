"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen px-4"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "var(--accent-50)", color: "var(--accent)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
        </svg>
      </div>

      <h1
        className="text-5xl font-semibold mb-3 tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        LightShow AI
      </h1>
      <p className="text-base mb-8 text-center max-w-md" style={{ color: "var(--ink-3)" }}>
        Create stunning synchronized light shows with AI-assisted sequencing.
        The easiest way to design your Christmas display.
      </p>

      {!isLoaded ? null : isSignedIn ? (
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Go to Dashboard
        </Link>
      ) : (
        <div className="flex gap-4">
          <Link
            href="/sign-in"
            className="px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--surface)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
            }}
          >
            Sign Up
          </Link>
        </div>
      )}
    </main>
  );
}
