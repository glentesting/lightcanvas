export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const consent = localStorage.getItem("lightcanvas-analytics");
  if (consent !== "true") return;
  // In production, this would call posthog.capture(name, properties)
  // For now, just log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", name, properties);
  }
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("lightcanvas-analytics") === "true";
}
