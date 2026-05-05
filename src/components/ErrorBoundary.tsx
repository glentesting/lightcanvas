"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: "var(--bg)" }}
        >
          <div
            className="max-w-md w-full rounded-xl p-8 text-center"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--panel)", color: "var(--ink-3)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: "var(--ink-3)" }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
