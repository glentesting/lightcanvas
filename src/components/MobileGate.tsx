"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "lightcanvas-mobile-dismissed";

export default function MobileGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    const mq = window.matchMedia("(max-width: 767px)");

    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      const isDismissed = sessionStorage.getItem(DISMISS_KEY);
      if (!isDismissed && e.matches) {
        setShow(true);
      } else if (!e.matches) {
        setShow(false);
      }
    }

    // Initial check — one-shot mount sync from external matchMedia state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mq.matches) setShow(true);

    // Listen for changes (e.g. rotating device or resizing window)
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  if (!show) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ zIndex: 999, background: "#FFFFFF" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
          style={{ background: "linear-gradient(135deg, var(--accent), oklch(72% 0.18 250))" }}
        >
          ✦
        </div>
        <span
          className="text-xl font-semibold"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          LightCanvas
        </span>
      </div>

      {/* House illustration */}
      <div className="mb-8">
        <svg width={120} height={120} viewBox="0 0 64 64" fill="none" style={{ opacity: 0.25 }}>
          <polygon points="32,8 8,28 56,28" fill="currentColor" />
          <rect x="12" y="28" width="40" height="26" fill="currentColor" />
          <rect x="20" y="32" width="8" height="8" rx="1" fill="rgba(255,255,255,.5)" />
          <rect x="36" y="32" width="8" height="8" rx="1" fill="rgba(255,255,255,.5)" />
          <rect x="26" y="42" width="12" height="12" rx="1" fill="rgba(255,255,255,.4)" />
        </svg>
      </div>

      {/* Text */}
      <h2
        className="text-xl font-semibold mb-2 text-center"
        style={{ fontFamily: "var(--font-display)" }}
      >
        LightCanvas works best on desktop
      </h2>
      <p
        className="text-sm text-center mb-8 max-w-xs"
        style={{ color: "var(--ink-3)" }}
      >
        The sequencer needs a larger screen for the timeline and preview.
      </p>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleDismiss}
          className="h-11 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Continue anyway
        </button>
        <Link
          href="/dashboard"
          className="h-11 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
