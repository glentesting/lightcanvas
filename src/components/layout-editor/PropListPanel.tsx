"use client";

import type { Fixture } from "@/lib/fixtures/types";
import { KIND_CATEGORIES } from "@/lib/fixtures/layout-constants";
import { CategoryIcon } from "./components";

export function PropListPanel({
  filteredFixtures,
  selectedId,
  searchQuery,
  setSearchQuery,
  hiddenIds,
  toggleVisibility,
  setSelectedId,
  leftTab,
  setLeftTab,
  setShowAddDialogInternal,
}: {
  filteredFixtures: Fixture[];
  selectedId: string | null;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  hiddenIds: Set<string>;
  toggleVisibility: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  leftTab: "props" | "layers";
  setLeftTab: (v: "props" | "layers") => void;
  setShowAddDialogInternal: (v: boolean) => void;
}) {
  return (
    <div
      className="shrink-0 flex flex-col overflow-hidden"
      style={{ width: 260, background: "#FFFFFF", borderRight: "1px solid var(--line)" }}
    >
      {/* Header with tabs */}
      <div className="px-3 pt-3 pb-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-0 mb-2">
          <button
            onClick={() => setLeftTab("props")}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors"
            style={{
              letterSpacing: "0.06em",
              fontSize: 11,
              color: leftTab === "props" ? "var(--ink)" : "var(--ink-4)",
              background: leftTab === "props" ? "var(--panel)" : "transparent",
            }}
          >
            Props
          </button>
          <button
            onClick={() => setLeftTab("layers")}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors"
            style={{
              letterSpacing: "0.06em",
              fontSize: 11,
              color: leftTab === "layers" ? "var(--ink)" : "var(--ink-4)",
              background: leftTab === "layers" ? "var(--panel)" : "transparent",
            }}
          >
            Layers
          </button>
        </div>
        <input
          type="text"
          placeholder="Search props..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-7 px-2.5 rounded-md text-xs mb-2.5"
          style={{ border: "1px solid var(--line)", background: "#fafafa", color: "var(--ink)" }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {KIND_CATEGORIES.map((cat) => {
          const catFixtures = filteredFixtures.filter((f) => (cat.kinds as string[]).includes(f.kind));
          if (catFixtures.length === 0 && searchQuery.trim()) return null;
          return (
            <div key={cat.label}>
              {/* Category header */}
              <div
                className="flex items-center justify-between px-3 py-1.5"
                style={{ background: "#fafafa", borderBottom: "1px solid var(--line)" }}
              >
                <div className="flex items-center gap-1.5">
                  <CategoryIcon label={cat.label} />
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 10 }}
                  >
                    {cat.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>
                    {catFixtures.length}
                  </span>
                </div>
              </div>

              {/* Prop rows */}
              {catFixtures.map((f) => {
                const isPlaced = !!(f.layout?.points.length);
                const isHidden = hiddenIds.has(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors group"
                    style={{
                      background: f.id === selectedId ? "#f0f4ff" : "transparent",
                      borderBottom: "1px solid #f5f5f5",
                      opacity: isHidden ? 0.45 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (f.id !== selectedId) (e.currentTarget.style.background = "#f8f8f8");
                    }}
                    onMouseLeave={(e) => {
                      if (f.id !== selectedId) (e.currentTarget.style.background = "transparent");
                    }}
                  >
                    {/* Status dot */}
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      title={isPlaced ? "Placed" : "Needs placement"}
                      style={{ background: isPlaced ? "#16a34a" : "#d97706" }}
                    />
                    {/* Name */}
                    <span
                      className="flex-1 truncate font-medium"
                      style={{ color: f.id === selectedId ? "var(--ink)" : "var(--ink-2)" }}
                    >
                      {f.name}
                    </span>
                    {/* Pixel count */}
                    <span className="shrink-0" style={{ color: "var(--ink-4)", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
                      {f.pixelCount}px
                    </span>
                    {/* Visibility toggle */}
                    <span
                      role="button"
                      tabIndex={-1}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: isHidden ? "var(--ink-4)" : "var(--ink-3)" }}
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(f.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleVisibility(f.id); } }}
                    >
                      {isHidden ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="1" y1="1" x2="23" y2="23" />
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}

              {/* Per-group Add Prop */}
              <button
                onClick={() => setShowAddDialogInternal(true)}
                className="w-full flex items-center gap-1.5 px-3 py-1 text-left text-xs transition-colors hover:bg-[#f8f8f8]"
                style={{ color: "var(--ink-4)", borderBottom: "1px solid #f0f0f0" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add {cat.label === "Other" ? "Prop" : cat.label.replace(/s$/, "")}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add prop button at bottom */}
      <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--line)" }}>
        <button
          onClick={() => setShowAddDialogInternal(true)}
          className="w-full flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold"
          style={{ background: "#1e3a5f", color: "#fff" }}
        >
          + Add Prop
        </button>
      </div>
    </div>
  );
}
