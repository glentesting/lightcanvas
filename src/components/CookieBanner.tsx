"use client";

import { useState, useEffect, useCallback } from "react";

type ConsentState = "all" | "essential" | null;

export default function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>("all"); // default to hide
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsToggle, setAnalyticsToggle] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("lightcanvas-cookie-consent");
    if (stored === "all" || stored === "essential") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConsent(stored);
    } else {
      setConsent(null); // no consent yet — show banner
    }
  }, []);

  const acceptAll = useCallback(() => {
    localStorage.setItem("lightcanvas-cookie-consent", "all");
    localStorage.setItem("lightcanvas-analytics", "true");
    setConsent("all");
  }, []);

  const rejectAll = useCallback(() => {
    localStorage.setItem("lightcanvas-cookie-consent", "essential");
    localStorage.setItem("lightcanvas-analytics", "false");
    setConsent("essential");
  }, []);

  const savePreferences = useCallback(() => {
    if (analyticsToggle) {
      localStorage.setItem("lightcanvas-cookie-consent", "all");
      localStorage.setItem("lightcanvas-analytics", "true");
    } else {
      localStorage.setItem("lightcanvas-cookie-consent", "essential");
      localStorage.setItem("lightcanvas-analytics", "false");
    }
    setConsent(analyticsToggle ? "all" : "essential");
  }, [analyticsToggle]);

  // Don't render if consent already given
  if (consent !== null) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div
        className="w-full max-w-[600px] mx-4 mb-4 rounded-xl p-5 sm:rounded-t-xl"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--line)",
          border: "1px solid var(--line)",
          boxShadow: "0 -4px 24px rgba(20,22,28,.10), 0 2px 6px rgba(20,22,28,.05)",
        }}
      >
        <p className="text-sm mb-4" style={{ color: "var(--ink-2)" }}>
          We use cookies to improve your experience and monitor errors.
        </p>

        {showCustomize ? (
          <div className="mb-4">
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2.5"
              style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
            >
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>
                  Analytics
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>
                  Helps us understand how you use LightCanvas
                </p>
              </div>
              <button
                onClick={() => setAnalyticsToggle(!analyticsToggle)}
                className="relative shrink-0 w-10 h-5 rounded-full transition-colors"
                style={{
                  background: analyticsToggle ? "var(--accent)" : "var(--line-2)",
                }}
                role="switch"
                aria-checked={analyticsToggle}
                aria-label="Toggle analytics"
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                  style={{
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,.15)",
                    left: analyticsToggle ? 22 : 2,
                  }}
                />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={savePreferences}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Save preferences
              </button>
              <button
                onClick={() => setShowCustomize(false)}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={acceptAll}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Accept All
            </button>
            <button
              onClick={rejectAll}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              Reject All
            </button>
            <button
              onClick={() => setShowCustomize(true)}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ color: "var(--ink-3)", background: "transparent" }}
            >
              Customize
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
