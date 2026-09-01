"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEditorStore } from "@/lib/store/editor-store";
import { useTransportStore, requestSeek } from "@/lib/store/transport-store";
import { EFFECT_COLORS, EFFECT_NAMES, DEFAULT_EFFECT_PARAMS } from "@/lib/timeline/constants";
import { secondsToPx, pxToSeconds, snapToBeat } from "@/lib/timeline/snapping";
import type { EffectId, EffectBlock } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";
import { setPresets, nextGroupColor } from "@/lib/fixtures/sets";
import { barSeconds, pasteAt, repeatSelection, repeatCount } from "@/lib/timeline/repeat";
import { useClipboardStore } from "@/lib/timeline/clipboard-store";
import { summariseExportFidelity, FIDELITY_COLOR } from "@/lib/exports/loredit/fidelity";
import type { Fixture } from "@/lib/fixtures/types";
import { addUserPreset } from "@/components/PresetLibrary";
import { BUILTIN_PRESETS } from "@/lib/presets/builtins";
import type { EffectPreset } from "@/lib/presets/types";

interface TimelineProps {
  analysis: AudioAnalysis | null;
}

const ROW_HEIGHT = 42;
const LABEL_WIDTH = 160;
const DEFAULT_BLOCK_DURATION = 2;
const HANDLE_WIDTH = 6;

export default function Timeline({ analysis }: TimelineProps) {
  const tracks = useEditorStore((s) => s.sequence.tracks);
  const blocks = useEditorStore((s) => s.sequence.blocks);
  const fixtures = useEditorStore((s) => s.fixtures);
  const groups = useEditorStore((s) => s.groups);
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const zoom = useTransportStore((s) => s.zoom);

  const duration = analysis?.duration ?? 180;
  const totalWidth = secondsToPx(duration, zoom);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ background: "var(--bg)" }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-block]")) {
          clearSelection();
        }
        setContextMenu(null);
      }}
      onContextMenu={(e) => {
        // Show context menu on right-click if blocks are selected
        const target = e.target as HTMLElement;
        if (target.closest("[data-block]")) {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }
      }}
    >
      {/* Sets of lights — put one lighting move on a whole set at once */}
      <GroupBar />

      {/* Selection toolbar — copy, paste at the playhead, repeat every bar */}
      <SelectionToolbar analysis={analysis} duration={duration} />

      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div style={{ minWidth: LABEL_WIDTH + totalWidth + 40, position: "relative" }}>
          {/* Header row */}
          <div className="flex sticky top-0 z-10" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
            <div
              className="shrink-0 flex items-center px-3 sticky left-0 z-20"
              style={{
                width: LABEL_WIDTH,
                height: 32,
                background: "var(--surface)",
                borderRight: "1px solid var(--line)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--ink-3)",
              }}
            >
              Tracks
            </div>
            <div
              className="relative"
              style={{ width: totalWidth, height: 32, cursor: "pointer" }}
              onMouseDown={(e) => {
                // click (or drag) the ruler to jump the whole app to that moment
                const rect = e.currentTarget.getBoundingClientRect();
                requestSeek(Math.max(0, Math.min(duration, pxToSeconds(e.clientX - rect.left, zoom))));
              }}
            >
              {Array.from({ length: Math.ceil(duration / 4) + 1 }).map((_, i) => {
                const t = i * 4;
                const x = secondsToPx(t, zoom);
                return (
                  <div key={i} className="absolute top-0 bottom-0" style={{ left: x, borderLeft: "1px solid var(--line)" }}>
                    <span className="absolute text-xs font-mono" style={{ top: 4, left: 4, color: "var(--ink-4)", fontSize: 10 }}>
                      {Math.floor(t / 60)}:{String(Math.floor(t % 60)).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track rows */}
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center py-12" style={{ color: "var(--ink-4)", fontSize: 12 }}>
              No tracks — add fixtures to create tracks
            </div>
          ) : (
            tracks.map((track, trackIndex) => {
              const trackBlocks = blocks.filter((b) => b.trackId === track.id);
              if (track.kind === "group") {
                const group = groups.find((g) => g.id === track.id);
                if (!group) return null;
                return (
                  <TrackRow
                    key={track.id}
                    trackId={track.id}
                    trackIndex={trackIndex}
                    name={`\u2B21 ${group.name}`}
                    pixelCount={undefined}
                    blocks={trackBlocks}
                    selectedBlockIds={selectedBlockIds}
                    zoom={zoom}
                    totalWidth={totalWidth}
                    analysis={analysis}
                    isGroup
                    groupColor={group.color}
                    memberCount={group.fixtureIds.length}
                  />
                );
              }
              const fixture = fixtures.find((f) => f.id === track.id);
              return (
                <TrackRow
                  key={track.id}
                  trackId={track.id}
                  trackIndex={trackIndex}
                  name={fixture?.name ?? track.id}
                  pixelCount={fixture?.pixelCount}
                  blocks={trackBlocks}
                  selectedBlockIds={selectedBlockIds}
                  zoom={zoom}
                  totalWidth={totalWidth}
                  analysis={analysis}
                />
              );
            })
          )}

          {/* Playhead — follows the shared transport clock */}
          <TimelinePlayhead zoom={zoom} scrollRef={scrollRef} />
        </div>
      </div>

      {/* Parameter panel */}
      <ParameterPanel />

      {/* Context menu */}
      {contextMenu && (
        <TimelineContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}

/* ─── Selection toolbar: copy, paste at the playhead, repeat every bar ───
   Real shows are built from repetition, so copying a phrase and stamping it
   down the song is the main way work gets done here — not placing 3,000
   blocks by hand. Paste always lands on a beat; repeat always lands on a bar
   line, re-snapped each time so it cannot drift out of time. */
function SelectionToolbar({ analysis, duration }: { analysis: AudioAnalysis | null; duration: number }) {
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
  const allBlocks = useEditorStore((s) => s.sequence.blocks);
  const tracks = useEditorStore((s) => s.sequence.tracks);
  const deleteBlocks = useEditorStore((s) => s.deleteBlocks);
  const duplicateBlocks = useEditorStore((s) => s.duplicateBlocks);
  const addBlocks = useEditorStore((s) => s.addBlocks);
  const setSelection = useEditorStore((s) => s.setSelection);

  const clip = useClipboardStore((s) => s.clip);
  const copyToClipboard = useClipboardStore((s) => s.copy);

  const [repeatOpen, setRepeatOpen] = useState(false);
  const [everyBars, setEveryBars] = useState(1);
  const [times, setTimes] = useState(7);
  const [note, setNote] = useState<string | null>(null);

  const beats = useMemo(() => analysis?.beats ?? [], [analysis?.beats]);
  const bar = useMemo(() => barSeconds(analysis), [analysis]);
  const selected = useMemo(
    () => allBlocks.filter((b) => selectedBlockIds.includes(b.id)),
    [allBlocks, selectedBlockIds]
  );

  const doCopy = useCallback(() => {
    if (selected.length === 0) return;
    copyToClipboard(selected);
    setNote(`Copied ${selected.length} move${selected.length !== 1 ? "s" : ""}.`);
  }, [selected, copyToClipboard]);

  const doPaste = useCallback(() => {
    if (clip.entries.length === 0) return;
    const at = useTransportStore.getState().currentTime;
    const { blocks, droppedTracks } = pasteAt(
      clip, at, beats, new Set(tracks.map((t) => t.id)), duration
    );
    if (blocks.length === 0) {
      setNote("Nothing to paste here — those rows are gone.");
      return;
    }
    addBlocks(blocks);
    setSelection(blocks.map((b) => b.id));
    setNote(
      `Pasted ${blocks.length} move${blocks.length !== 1 ? "s" : ""} at ${fmtTime(blocks[0].start)}` +
      (droppedTracks ? ` (${droppedTracks} skipped — their row no longer exists)` : "")
    );
  }, [clip, beats, tracks, duration, addBlocks, setSelection]);

  const repeatOpts = useMemo(
    () => ({ everyBars, times, bar, beats, maxTime: duration }),
    [everyBars, times, bar, beats, duration]
  );
  const willAdd = useMemo(
    () => (repeatOpen ? repeatCount(selected, repeatOpts) : 0),
    [repeatOpen, selected, repeatOpts]
  );

  const doRepeat = useCallback(() => {
    const made = repeatSelection(selected, repeatOpts);
    if (made.length === 0) {
      setNote("That would run past the end of the song.");
      return;
    }
    addBlocks(made);
    setSelection([...selectedBlockIds, ...made.map((b) => b.id)]);
    setRepeatOpen(false);
    setNote(`Repeated ${made.length} move${made.length !== 1 ? "s" : ""} across the song.`);
  }, [selected, repeatOpts, addBlocks, setSelection, selectedBlockIds]);

  // Ctrl+C / Ctrl+V, alongside the existing Ctrl+D / Delete / Ctrl+Z
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const key = e.key.toLowerCase();
      if (key === "c" && selected.length > 0) {
        e.preventDefault();
        doCopy();
      } else if (key === "v" && clip.entries.length > 0) {
        e.preventDefault();
        doPaste();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, clip, doCopy, doPaste]);

  // the little confirmation line clears itself
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 5000);
    return () => clearTimeout(timer);
  }, [note]);

  const hasSelection = selectedBlockIds.length > 0;
  const canPaste = clip.entries.length > 0;
  if (!hasSelection && !canPaste && !note) return null;

  const btn = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    color: "var(--ink-2)",
    cursor: "pointer",
  } as const;

  return (
    <div
      className="flex items-center gap-2 px-3.5 shrink-0 relative flex-wrap"
      style={{ minHeight: 32, paddingTop: 3, paddingBottom: 3, background: "var(--accent-50)", borderBottom: "1px solid var(--accent-200)" }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
        {hasSelection ? `${selectedBlockIds.length} selected` : "Nothing selected"}
      </span>

      {note && (
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>· {note}</span>
      )}

      <div className="flex-1" />

      <button
        onClick={doCopy}
        disabled={!hasSelection}
        title="Copy the selected moves (Ctrl+C)"
        className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium"
        style={{ ...btn, opacity: hasSelection ? 1 : 0.45 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Copy
      </button>

      <button
        onClick={doPaste}
        disabled={!canPaste}
        title={canPaste
          ? `Paste ${clip.entries.length} move${clip.entries.length !== 1 ? "s" : ""} at the playhead, landed on the nearest beat (Ctrl+V)`
          : "Copy something first"}
        className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium"
        style={{ ...btn, opacity: canPaste ? 1 : 0.45 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
        </svg>
        Paste at playhead{canPaste ? ` (${clip.entries.length})` : ""}
      </button>

      <button
        onClick={() => setRepeatOpen((v) => !v)}
        disabled={!hasSelection}
        title="Stamp this selection down the song, once every bar"
        className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium"
        style={{ ...btn, opacity: hasSelection ? 1 : 0.45 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        Repeat…
      </button>

      <button
        onClick={() => duplicateBlocks(selectedBlockIds)}
        disabled={!hasSelection}
        className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium"
        style={{ ...btn, opacity: hasSelection ? 1 : 0.45 }}
        title="Drop one copy straight after this one (Ctrl+D)"
      >
        Duplicate
      </button>

      <button
        onClick={() => deleteBlocks(selectedBlockIds)}
        disabled={!hasSelection}
        className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium"
        style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", cursor: "pointer", opacity: hasSelection ? 1 : 0.45 }}
        title="Delete (Del)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </button>

      {repeatOpen && hasSelection && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setRepeatOpen(false)} />
          <div
            className="absolute z-40 rounded-lg p-3"
            style={{ top: 30, right: 12, width: 292, background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
          >
            <p className="text-xs font-semibold mb-1">Repeat this down the song</p>
            <p className="text-xs mb-2.5" style={{ color: "var(--ink-4)" }}>
              One bar of your song is about {bar.toFixed(2)} seconds. Each copy is nudged onto the
              nearest beat so it stays in time.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs shrink-0" style={{ color: "var(--ink-3)" }}>Every</span>
              <select
                value={everyBars}
                onChange={(e) => setEveryBars(Number(e.target.value))}
                className="h-7 px-1.5 rounded-md text-xs flex-1"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-2)" }}
              >
                <option value={1}>1 bar</option>
                <option value={2}>2 bars</option>
                <option value={4}>4 bars</option>
                <option value={8}>8 bars</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs shrink-0" style={{ color: "var(--ink-3)" }}>Repeat</span>
              <input
                type="number"
                min={1}
                max={512}
                value={times}
                onChange={(e) => setTimes(Math.max(1, Math.min(512, Number(e.target.value) || 1)))}
                className="h-7 px-1.5 rounded-md text-xs flex-1"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-2)" }}
              />
              <span className="text-xs shrink-0" style={{ color: "var(--ink-3)" }}>more times</span>
            </div>
            <p className="text-xs mb-2.5" style={{ color: willAdd > 0 ? "var(--ink-3)" : "#b45309" }}>
              {willAdd > 0
                ? `Adds ${willAdd.toLocaleString()} lighting move${willAdd !== 1 ? "s" : ""}. Ctrl+Z undoes the whole lot.`
                : "That would run past the end of the song."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRepeatOpen(false)}
                className="h-7 px-3 rounded-md text-xs font-medium"
                style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={doRepeat}
                disabled={willAdd === 0}
                className="h-7 px-3 rounded-md text-xs font-semibold"
                style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", cursor: "pointer", opacity: willAdd === 0 ? 0.5 : 1 }}
              >
                Repeat it
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function fmtTime(t: number): string {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}

/* ─── Sets of lights ──────────────────────────────────────
   A set is a row that stands for many light pieces at once. Drop one lighting
   move on the set's row and every piece in it does that move — which is how
   the purchased shows are built. The set row sits at the top of the track
   list; a piece's own row still wins over the set's, so you can group
   everything and then override one piece. */
function GroupBar() {
  const fixtures = useEditorStore((s) => s.fixtures);
  const groups = useEditorStore((s) => s.groups);
  const addGroup = useEditorStore((s) => s.addGroup);
  const deleteGroup = useEditorStore((s) => s.deleteGroup);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const presets = useMemo(() => setPresets(fixtures, groups), [fixtures, groups]);

  const makeGroup = useCallback(
    (name: string, fixtureIds: string[], color: string) => {
      addGroup({ id: crypto.randomUUID(), name, fixtureIds, color });
      setPickerOpen(false);
      setCustomOpen(false);
    },
    [addGroup]
  );

  return (
    <div
      className="flex items-center gap-2 px-3.5 shrink-0 relative flex-wrap"
      style={{ minHeight: 34, paddingTop: 4, paddingBottom: 4, background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-semibold shrink-0" style={{ color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10 }}>
        Sets of lights
      </span>

      {groups.map((g) => (
        <span
          key={g.id}
          className="inline-flex items-center gap-1.5 h-6 pl-2 pr-1 rounded-full text-xs font-medium"
          style={{ background: `${g.color ?? "#6366f1"}18`, color: g.color ?? "#6366f1", border: `1px solid ${g.color ?? "#6366f1"}55` }}
          title={`${g.name} — ${g.fixtureIds.length} light pieces. Drop a lighting move on its row to move them all together.`}
        >
          {g.name}
          <span style={{ opacity: 0.75 }}>{g.fixtureIds.length}</span>
          <button
            onClick={() => deleteGroup(g.id)}
            title={`Remove the "${g.name}" set (the light pieces stay; only the set row and its moves go)`}
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", opacity: 0.7 }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </span>
      ))}

      <button
        onClick={() => setPickerOpen((v) => !v)}
        disabled={fixtures.length < 2}
        className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-medium"
        style={{ background: "var(--panel)", border: "1px dashed var(--line)", color: "var(--ink-3)", cursor: fixtures.length < 2 ? "default" : "pointer" }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Make a set
      </button>

      {groups.length === 0 && (
        <span className="text-xs" style={{ color: "var(--ink-4)" }}>
          A set gives you one row that moves a whole batch of lights together.
        </span>
      )}

      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPickerOpen(false)} />
          <div
            className="absolute z-40 rounded-lg overflow-hidden"
            style={{ top: 32, left: 12, width: 300, background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
          >
            <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--line)", background: "var(--panel)" }}>
              <p className="text-xs font-semibold">Make a set of lights</p>
            </div>
            {presets.length === 0 && (
              <p className="text-xs px-3 py-2.5" style={{ color: "var(--ink-4)" }}>
                Every ready-made set already exists. Use &ldquo;Pick pieces myself&rdquo; for anything else.
              </p>
            )}
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => makeGroup(p.label, p.fixtureIds, p.color)}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors hover:bg-[var(--panel)]"
                style={{ background: "transparent", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium">{p.label}</span>
                  <span className="block text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>{p.hint}</span>
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--ink-4)" }}>{p.fixtureIds.length}</span>
              </button>
            ))}
            <button
              onClick={() => { setPickerOpen(false); setCustomOpen(true); }}
              className="w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--panel)]"
              style={{ background: "transparent", border: "none", color: "var(--accent-ink, #1e40af)", cursor: "pointer" }}
            >
              Pick pieces myself…
            </button>
          </div>
        </>
      )}

      {customOpen && (
        <CustomGroupDialog
          fixtures={fixtures}
          defaultColor={nextGroupColor(groups)}
          onCancel={() => setCustomOpen(false)}
          onCreate={makeGroup}
        />
      )}
    </div>
  );
}

function CustomGroupDialog({
  fixtures,
  defaultColor,
  onCancel,
  onCreate,
}: {
  fixtures: Fixture[];
  defaultColor: string;
  onCancel: () => void;
  onCreate: (name: string, ids: string[], color: string) => void;
}) {
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? fixtures.filter((f) => f.name.toLowerCase().includes(q)) : fixtures;
  }, [fixtures, search]);

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canCreate = name.trim().length > 0 && chosen.size >= 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-w-md flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-1">Make a set of lights</h3>
          <p className="text-xs mb-3" style={{ color: "var(--ink-4)" }}>
            Choose the pieces that should move together. You&apos;ll get one row on the timeline that
            drives all of them at once.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this set (e.g. Left side of the yard)"
            className="w-full h-8 px-2.5 rounded-md text-xs mb-2"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your lights..."
            className="w-full h-8 px-2.5 rounded-md text-xs"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
          />
        </div>
        <div className="px-5 flex-1 overflow-y-auto" style={{ minHeight: 120 }}>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
            {visible.map((f, i) => (
              <label
                key={f.id}
                className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-colors hover:bg-[var(--panel)]"
                style={{ borderBottom: i < visible.length - 1 ? "1px solid var(--line)" : undefined }}
              >
                <input type="checkbox" checked={chosen.has(f.id)} onChange={() => toggle(f.id)} className="rounded" />
                <span className="text-xs flex-1 truncate" style={{ color: "var(--ink-2)" }}>{f.name}</span>
                <span className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>{f.pixelCount}px</span>
              </label>
            ))}
            {visible.length === 0 && (
              <p className="text-xs px-2.5 py-2" style={{ color: "var(--ink-4)" }}>No lights match that search.</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
          <span className="text-xs" style={{ color: "var(--ink-4)" }}>
            {chosen.size} chosen{chosen.size === 1 ? " — pick at least two" : ""}
          </span>
          <div className="flex gap-2">
            <button onClick={onCancel} className="h-8 px-4 rounded-md text-xs font-medium" style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
              Cancel
            </button>
            <button
              onClick={() => onCreate(name.trim(), [...chosen], defaultColor)}
              disabled={!canCreate}
              className="h-8 px-4 rounded-md text-xs font-medium"
              style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", opacity: canCreate ? 1 : 0.5 }}
            >
              Make the set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Playhead (isolated: re-renders at the audio tick rate, the grid doesn't) ─── */
function TimelinePlayhead({
  zoom,
  scrollRef,
}: {
  zoom: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const currentTime = useTransportStore((s) => s.currentTime);
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const x = LABEL_WIDTH + secondsToPx(currentTime, zoom);

  // keep the playhead in view while playing
  useEffect(() => {
    if (!isPlaying) return;
    const el = scrollRef.current;
    if (!el) return;
    const margin = 80;
    if (x < el.scrollLeft + LABEL_WIDTH + margin || x > el.scrollLeft + el.clientWidth - margin) {
      el.scrollLeft = Math.max(0, x - el.clientWidth * 0.3);
    }
  }, [x, isPlaying, scrollRef]);

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-30"
      style={{ left: x, width: 0 }}
    >
      <div style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: "oklch(60% 0.18 25)", boxShadow: "0 0 6px oklch(60% 0.18 25 / .5)" }} />
      <div style={{ position: "absolute", top: 0, left: -5, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid oklch(60% 0.18 25)" }} />
    </div>
  );
}

/* ─── Track Row ──────────────────────────────────────────── */
function TrackRow({
  trackId,
  trackIndex,
  name,
  pixelCount,
  blocks,
  selectedBlockIds,
  zoom,
  totalWidth,
  analysis,
  isGroup,
  groupColor,
  memberCount,
}: {
  trackId: string;
  trackIndex: number;
  name: string;
  pixelCount?: number;
  blocks: EffectBlock[];
  selectedBlockIds: string[];
  zoom: number;
  totalWidth: number;
  analysis: AudioAnalysis | null;
  isGroup?: boolean;
  groupColor?: string;
  memberCount?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `track:${trackId}`,
    data: { type: "track", trackId },
  });

  const rowHeight = isGroup ? ROW_HEIGHT + 4 : ROW_HEIGHT;

  return (
    <div
      className="flex"
      style={{
        borderBottom: "1px solid var(--line)",
        background: isOver
          ? "var(--accent-50)"
          : trackIndex % 2 === 0
          ? "var(--surface)"
          : "var(--panel)",
      }}
    >
      <div
        className="shrink-0 flex items-center px-3 sticky left-0 z-10"
        style={{
          width: LABEL_WIDTH,
          height: rowHeight,
          borderRight: "1px solid var(--line)",
          borderLeft: isGroup ? `3px solid ${groupColor ?? "#6366f1"}` : undefined,
          background: "inherit",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={isGroup ? { color: groupColor ?? "#6366f1" } : undefined}>{name}</div>
          {pixelCount != null && (
            <div className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>
              {pixelCount} px
            </div>
          )}
          {isGroup && (
            <div className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>
              {memberCount} pieces together
            </div>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="relative"
        style={{ width: totalWidth, height: rowHeight, flexShrink: 0 }}
      >
        {blocks.map((block) => (
          <EffectBlockComponent
            key={block.id}
            block={block}
            selected={selectedBlockIds.includes(block.id)}
            zoom={zoom}
            analysis={analysis}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Effect Block with drag + resize ────────────────────── */
function EffectBlockComponent({
  block,
  selected,
  zoom,
  analysis,
}: {
  block: EffectBlock;
  selected: boolean;
  zoom: number;
  analysis: AudioAnalysis | null;
}) {
  const setSelection = useEditorStore((s) => s.setSelection);
  const moveBlocks = useEditorStore((s) => s.moveBlocks);
  const resizeBlock = useEditorStore((s) => s.resizeBlock);
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);

  const beats = useMemo(() => analysis?.beats ?? [], [analysis?.beats]);
  const [dragging, setDragging] = useState<"move" | "resize-left" | "resize-right" | null>(null);
  const dragStartRef = useRef<{ x: number; blockStart: number; blockDuration: number } | null>(null);

  const left = secondsToPx(block.start, zoom);
  const width = secondsToPx(block.duration, zoom);
  const color = EFFECT_COLORS[block.effectId];

  const handleMouseDown = (e: React.MouseEvent, action: "move" | "resize-left" | "resize-right") => {
    e.stopPropagation();
    e.preventDefault();

    // Select on mousedown
    if (action === "move") {
      if (e.shiftKey || e.metaKey) {
        setSelection([block.id], "toggle");
      } else if (!selected) {
        setSelection([block.id]);
      }
    }

    setDragging(action);
    dragStartRef.current = {
      x: e.clientX,
      blockStart: block.start,
      blockDuration: block.duration,
    };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaSeconds = pxToSeconds(deltaX, zoom);

      if (dragging === "move") {
        const ids = selected ? selectedBlockIds : [block.id];
        const newStart = Math.max(0, dragStartRef.current.blockStart + deltaSeconds);
        const snapped = e.altKey ? newStart : snapToBeat(newStart, beats);
        const actualDelta = snapped - block.start;
        if (Math.abs(actualDelta) > 0.001) {
          moveBlocks(ids, actualDelta, 0);
          dragStartRef.current.x = e.clientX;
          dragStartRef.current.blockStart = snapped;
        }
      } else if (dragging === "resize-left") {
        let newStart = dragStartRef.current.blockStart + deltaSeconds;
        newStart = e.altKey ? newStart : snapToBeat(newStart, beats);
        resizeBlock(block.id, "start", newStart);
      } else if (dragging === "resize-right") {
        let newEnd = dragStartRef.current.blockStart + dragStartRef.current.blockDuration + deltaSeconds;
        newEnd = e.altKey ? newEnd : snapToBeat(newEnd, beats);
        resizeBlock(block.id, "end", newEnd);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, block, selected, selectedBlockIds, zoom, beats, moveBlocks, resizeBlock]);

  return (
    <div
      className="absolute flex items-center overflow-hidden group"
      style={{
        left: left + 1,
        top: 4,
        height: ROW_HEIGHT - 8,
        width: Math.max(width - 2, 16),
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        color: "#fff",
        background: color,
        cursor: dragging === "move" ? "grabbing" : "grab",
        boxShadow: selected
          ? "0 0 0 2px var(--accent), 0 1px 3px rgba(20,22,28,.15)"
          : "0 1px 2px rgba(20,22,28,.12)",
        userSelect: "none",
      }}
      data-block={block.id}
      onMouseDown={(e) => handleMouseDown(e, "move")}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selected) setSelection([block.id]);
      }}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: HANDLE_WIDTH, cursor: "ew-resize", background: "rgba(255,255,255,0.3)", borderRadius: "5px 0 0 5px" }}
        onMouseDown={(e) => handleMouseDown(e, "resize-left")}
      />

      {/* Label */}
      <span className="truncate px-1.5 pointer-events-none">
        {EFFECT_NAMES[block.effectId]}
      </span>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: HANDLE_WIDTH, cursor: "ew-resize", background: "rgba(255,255,255,0.3)", borderRadius: "0 5px 5px 0" }}
        onMouseDown={(e) => handleMouseDown(e, "resize-right")}
      />
    </div>
  );
}

/* ─── Keyboard shortcuts hook ─────────────────────────────── */
export function useTimelineShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const state = useEditorStore.getState();
      const { selectedBlockIds } = state;

      // Delete / Backspace — delete selected blocks
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockIds.length > 0) {
        e.preventDefault();
        state.deleteBlocks(selectedBlockIds);
      }

      // Cmd+D — duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedBlockIds.length > 0) {
        e.preventDefault();
        state.duplicateBlocks(selectedBlockIds);
      }

      // Cmd+A — select all
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        state.setSelection(state.sequence.blocks.map((b) => b.id));
      }

      // Escape — clear selection
      if (e.key === "Escape") {
        state.clearSelection();
      }

      // Cmd+Z — undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.temporal.getState().undo();
      }

      // Cmd+Shift+Z or Cmd+Y — redo
      if (((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === "y")) {
        e.preventDefault();
        useEditorStore.temporal.getState().redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

/* ─── DnD wrapper — wraps the entire editor body ──────────── */
export function TimelineDndProvider({ children }: { children: React.ReactNode }) {
  const addBlock = useEditorStore((s) => s.addBlock);
  const setSelection = useEditorStore((s) => s.setSelection);
  const zoom = useTransportStore((s) => s.zoom);
  const analysis = useEditorStore((s) => s.audio);

  const [draggingEffect, setDraggingEffect] = useState<EffectId | null>(null);
  const beats = useMemo(() => analysis?.beats ?? [], [analysis?.beats]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "palette-effect") {
      setDraggingEffect(data.effectId as EffectId);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingEffect(null);
      const { over, active } = event;
      if (!over || !active.data.current) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData.type === "palette-effect" && overData?.type === "track") {
        const trackId = overData.trackId as string;
        const effectId = activeData.effectId as EffectId;

        const deltaX = event.delta.x;
        let dropTime = pxToSeconds(Math.max(0, deltaX), zoom);
        dropTime = snapToBeat(dropTime, beats);
        dropTime = Math.max(0, dropTime);

        const newBlock: EffectBlock = {
          id: crypto.randomUUID(),
          trackId,
          effectId,
          start: dropTime,
          duration: DEFAULT_BLOCK_DURATION,
          params: { ...DEFAULT_EFFECT_PARAMS },
        };

        addBlock(newBlock);
        setSelection([newBlock.id]);
      }
    },
    [zoom, beats, addBlock, setSelection]
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay>
        {draggingEffect && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-lg"
            style={{
              background: EFFECT_COLORS[draggingEffect],
              color: "#fff",
              opacity: 0.9,
            }}
          >
            {EFFECT_NAMES[draggingEffect]}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/* ─── Context Menu ─────────────────────────────────────── */
export function TimelineContextMenu({
  x,
  y,
  onClose,
}: {
  x: number;
  y: number;
  onClose: () => void;
}) {
  const state = useEditorStore.getState();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const items = [
    { label: "Duplicate", shortcut: "Ctrl+D", action: () => { state.duplicateBlocks(state.selectedBlockIds); onClose(); } },
    { label: "Delete", shortcut: "Del", action: () => { state.deleteBlocks(state.selectedBlockIds); onClose(); }, danger: true },
    { type: "separator" as const },
    { label: "Select All", shortcut: "Ctrl+A", action: () => { state.setSelection(state.sequence.blocks.map(b => b.id)); onClose(); } },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 py-1 rounded-lg overflow-hidden"
      style={{
        left: x,
        top: y,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-lg)",
        minWidth: 160,
      }}
    >
      {items.map((item, i) =>
        "type" in item && item.type === "separator" ? (
          <div key={i} className="my-1" style={{ height: 1, background: "var(--line)" }} />
        ) : (
          <button
            key={i}
            onClick={"action" in item ? item.action : undefined}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors hover:bg-[var(--panel)]"
            style={{ color: "danger" in item && item.danger ? "#b91c1c" : "var(--ink)" }}
          >
            <span>{"label" in item ? item.label : ""}</span>
            {"shortcut" in item && (
              <span className="text-xs font-mono" style={{ color: "var(--ink-4)" }}>
                {"shortcut" in item ? item.shortcut : ""}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}

/* ─── Parameter Panel ──────────────────────────────────── */
export function ParameterPanel() {
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
  const blocks = useEditorStore((s) => s.sequence.blocks);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  const fixtures = useEditorStore((s) => s.fixtures);
  const groups = useEditorStore((s) => s.groups);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockIds[0]);

  // What this move will really do on the house — the same table the export
  // dialog reads, shown here so a mismatch is spotted while building, not
  // after the file is already on the controller.
  const fidelity = useMemo(() => {
    if (!selectedBlock) return null;
    const targets = fixtures.filter(
      (f) =>
        f.id === selectedBlock.trackId ||
        groups.some((g) => g.id === selectedBlock.trackId && g.fixtureIds.includes(f.id))
    );
    if (targets.length === 0) return null;
    const rows = summariseExportFidelity([selectedBlock], targets, groups);
    // the plainest outcome is the one worth warning about
    return rows.find((r) => r.fidelity === "approximate") ?? rows.find((r) => r.fidelity === "close") ?? null;
  }, [selectedBlock, fixtures, groups]);

  if (!selectedBlock || selectedBlockIds.length !== 1) return null;

  const params = selectedBlock.params;

  // Check if block was created from a preset and has been modified
  const isModifiedFromPreset = (() => {
    if (!selectedBlock.presetId) return false;
    const allPresets = [...BUILTIN_PRESETS];
    // Also check localStorage presets
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("lightcanvas-user-presets") : null;
      if (raw) allPresets.push(...JSON.parse(raw));
    } catch { /* ignore */ }
    const original = allPresets.find((p: EffectPreset) => p.id === selectedBlock.presetId);
    if (!original) return true; // preset deleted, still show indicator
    // Compare params
    const origParams = original.parameters as Record<string, unknown>;
    for (const key of Object.keys(origParams)) {
      if ((params as unknown as Record<string, unknown>)[key] !== origParams[key]) return true;
    }
    return false;
  })();

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const preset: EffectPreset = {
      id: `user-preset-${crypto.randomUUID()}`,
      name: presetName.trim(),
      effectType: selectedBlock.effectId,
      parameters: { ...params },
      version: 1,
      compatibleFixtureTypes: ["roofline", "mega-tree", "mini-tree", "bush", "arch", "window-outline"],
      tags: [],
      createdAt: new Date().toISOString(),
      isSystem: false,
    };
    addUserPreset(preset);
    setPresetName("");
    setShowSavePreset(false);
  };

  return (
    <div
      className="shrink-0 px-4 py-3 flex flex-col gap-2"
      style={{
        borderTop: "1px solid var(--line)",
        background: "var(--surface)",
        minHeight: 48,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {fidelity && (
        <p className="text-xs" style={{ color: FIDELITY_COLOR[fidelity.fidelity].ink }}>
          <strong>On the house:</strong> {fidelity.asExported}
          {fidelity.loses ? ` Won't carry over: ${fidelity.loses}` : ""}
        </p>
      )}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Color</label>
          <input
            type="color"
            value={params.color1}
            onChange={(e) =>
              updateBlock(selectedBlock.id, {
                params: { ...params, color1: e.target.value },
              })
            }
            className="w-7 h-7 rounded border-none cursor-pointer"
            style={{ background: "none" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Intensity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={params.intensity}
            onChange={(e) =>
              updateBlock(selectedBlock.id, {
                params: { ...params, intensity: parseFloat(e.target.value) },
              })
            }
            className="w-20"
          />
          <span className="text-xs font-mono w-8" style={{ color: "var(--ink-4)" }}>
            {Math.round(params.intensity * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Speed</label>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={params.speed}
            onChange={(e) =>
              updateBlock(selectedBlock.id, {
                params: { ...params, speed: parseFloat(e.target.value) },
              })
            }
            className="w-20"
          />
          <span className="text-xs font-mono w-8" style={{ color: "var(--ink-4)" }}>
            {params.speed}x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Easing</label>
          <select
            value={params.easing}
            onChange={(e) =>
              updateBlock(selectedBlock.id, {
                params: { ...params, easing: e.target.value as typeof params.easing },
              })
            }
            className="h-6 px-2 rounded text-xs"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          >
            <option value="linear">Linear</option>
            <option value="ease-in">Ease In</option>
            <option value="ease-out">Ease Out</option>
            <option value="ease-in-out">Ease In-Out</option>
          </select>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: EFFECT_COLORS[selectedBlock.effectId], color: "#fff" }}
        >
          {EFFECT_NAMES[selectedBlock.effectId]}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => { setShowSavePreset(!showSavePreset); setPresetName(selectedBlock.presetName ? `${selectedBlock.presetName} (copy)` : EFFECT_NAMES[selectedBlock.effectId]); }}
          className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium transition-colors"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          title="Save as Preset"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save Preset
        </button>
      </div>

      {/* Modified from preset indicator */}
      {selectedBlock.presetName && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--ink-4)" }}>
            {isModifiedFromPreset ? "Modified from:" : "From preset:"}
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
            {selectedBlock.presetName}
          </span>
          {isModifiedFromPreset && (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} title="Parameters changed from original preset" />
          )}
        </div>
      )}

      {/* Save as Preset inline form */}
      {showSavePreset && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); if (e.key === "Escape") setShowSavePreset(false); }}
            className="h-7 px-2 rounded text-xs flex-1"
            style={{ border: "1px solid var(--line)", background: "var(--panel)", maxWidth: 200 }}
            autoFocus
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="h-7 px-3 rounded text-xs font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Save
          </button>
          <button
            onClick={() => setShowSavePreset(false)}
            className="h-7 px-2 rounded text-xs font-medium transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-3)" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Palette draggable chip (used in sidebar) ─────────── */
export function PaletteEffectChip({ effectId, name, color }: { effectId: EffectId; name: string; color: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${effectId}`,
    data: { type: "palette-effect", effectId },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium cursor-grab select-none"
      style={{
        border: "1px solid var(--line)",
        background: "var(--surface)",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span
        className="w-2 h-2 rounded-sm shrink-0"
        style={{ background: color }}
      />
      <span className="truncate">{name}</span>
    </div>
  );
}
