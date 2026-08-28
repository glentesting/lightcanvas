"use client";

import { useCallback, useMemo, useState } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { parseLoreditLayout, propToFixture } from "@/lib/imports/loredit-layout";
import type { PropPickerGroup } from "@/lib/imports/loredit-layout";

interface LoreditImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

/**
 * "Import from Light-O-Rama": pick a .loredit template, choose which of its
 * props to bring in as fixtures. The owner's real props (per the hardware
 * reference) come pre-selected; everything else is grouped and unchecked.
 */
export default function LoreditImportDialog({ open, onClose, onImported }: LoreditImportDialogProps) {
  const fixtures = useEditorStore((s) => s.fixtures);
  const importFixtures = useEditorStore((s) => s.importFixtures);

  const [groups, setGroups] = useState<PropPickerGroup[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"replace" | "add">("replace");

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setGroups(null);
    setFileName(file.name);
    try {
      const parsed = parseLoreditLayout(await file.text());
      if (parsed.length === 0) throw new Error("No importable props found in this file");
      setGroups(parsed);
      const pre = new Set<string>();
      for (const g of parsed) for (const p of g.props) if (p.preselected) pre.add(p.id);
      setSelected(pre);
      // collapse groups with nothing pre-selected so the owned props lead
      setCollapsed(new Set(parsed.filter((g) => !g.props.some((p) => p.preselected)).map((g) => g.key)));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Could not read this file");
    }
  }, []);

  const stats = useMemo(() => {
    if (!groups) return { count: 0, pixels: 0 };
    let count = 0;
    let pixels = 0;
    for (const g of groups) {
      for (const p of g.props) {
        if (selected.has(p.id)) {
          count++;
          if (p.stringType === "RGB") pixels += p.pixelCount;
        }
      }
    }
    return { count, pixels };
  }, [groups, selected]);

  const toggleProp = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((g: PropPickerGroup) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = g.props.every((p) => next.has(p.id));
      for (const p of g.props) {
        if (allIn) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }, []);

  const handleImport = useCallback(() => {
    if (!groups) return;
    const chosen = groups.flatMap((g) => g.props).filter((p) => selected.has(p.id));
    if (chosen.length === 0) return;
    importFixtures(chosen.map(propToFixture), mode);
    onImported(chosen.length);
    onClose();
  }, [groups, selected, mode, importFixtures, onImported, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-w-xl flex flex-col"
        style={{ background: "#fff", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-sm font-semibold mb-1">Import from Light-O-Rama</h3>
          <p className="text-xs mb-4" style={{ color: "var(--ink-4)" }}>
            Pick any of your purchased .loredit sequences — it contains your full display. Your
            props come pre-checked; import brings them in with their real pixel counts, wiring,
            and shapes, and export mapping becomes automatic.
          </p>

          <label
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer"
            style={{ border: "1px dashed var(--line)", background: "var(--panel)" }}
          >
            <input
              type="file"
              accept=".loredit"
              className="sr-only"
              data-testid="loredit-import-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              {fileName ?? "Choose a .loredit file..."}
            </span>
          </label>
          {parseError && (
            <p className="text-xs mt-1.5" style={{ color: "#b91c1c" }}>{parseError}</p>
          )}
        </div>

        {groups && (
          <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-0">
            {groups.map((g) => {
              const selCount = g.props.filter((p) => selected.has(p.id)).length;
              const isCollapsed = collapsed.has(g.key);
              return (
                <div key={g.key} className="mb-2 rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                  <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--panel)" }}>
                    <input
                      type="checkbox"
                      checked={selCount === g.props.length}
                      ref={(el) => {
                        if (el) el.indeterminate = selCount > 0 && selCount < g.props.length;
                      }}
                      onChange={() => toggleGroup(g)}
                      className="rounded"
                    />
                    <button
                      onClick={() =>
                        setCollapsed((prev) => {
                          const next = new Set(prev);
                          if (next.has(g.key)) next.delete(g.key);
                          else next.add(g.key);
                          return next;
                        })
                      }
                      className="flex-1 flex items-center gap-1.5 text-left"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <svg
                        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ transform: isCollapsed ? "rotate(-90deg)" : "none", color: "var(--ink-4)" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: "var(--ink-2)" }}>{g.label}</span>
                      <span className="text-xs ml-auto" style={{ color: "var(--ink-4)" }}>
                        {selCount}/{g.props.length}
                      </span>
                    </button>
                  </div>
                  {!isCollapsed && (
                    <div className="px-3 py-1.5 grid grid-cols-2 gap-x-3">
                      {g.props.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 py-0.5 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleProp(p.id)}
                            className="rounded shrink-0"
                          />
                          <span className="text-xs truncate" style={{ color: "var(--ink-2)" }}>{p.name}</span>
                          <span className="text-xs ml-auto shrink-0" style={{ color: "var(--ink-4)" }}>
                            {p.stringType === "RGB" ? `${p.pixelCount}px` : p.stringType === "Traditional" ? "AC" : "RGB×1"}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {groups && (
          <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
            {fixtures.length > 0 && (
              <div className="flex flex-col gap-1 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
                  <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                    Replace the current {fixtures.length} prop{fixtures.length !== 1 ? "s" : ""}
                    <span style={{ color: "#b45309" }}> — their timeline effects are removed too</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="import-mode" checked={mode === "add"} onChange={() => setMode("add")} />
                  <span className="text-xs" style={{ color: "var(--ink-2)" }}>Add alongside the current props</span>
                </label>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                {stats.count} prop{stats.count !== 1 ? "s" : ""} selected
                {stats.pixels > 0 ? ` · ${stats.pixels.toLocaleString()} pixels` : ""}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="h-8 px-4 rounded-md text-xs font-medium"
                  style={{ border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={stats.count === 0}
                  className="h-8 px-4 rounded-md text-xs font-semibold"
                  style={{
                    background: "#1e3a5f",
                    color: "#fff",
                    opacity: stats.count === 0 ? 0.5 : 1,
                    cursor: stats.count === 0 ? "default" : "pointer",
                  }}
                >
                  Import {stats.count > 0 ? stats.count : ""} props
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
