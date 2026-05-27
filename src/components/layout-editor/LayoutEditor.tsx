"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { computeIssuesList, computeLayoutReadiness } from "@/lib/fixtures/layout-validation";
import { PropListPanel } from "./PropListPanel";
import { LayoutEditorCanvas } from "./LayoutEditorCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { AddPropDialog } from "./AddPropDialog";

export default function LayoutEditor({
  nightPreview = false,
  showAddDialogExternal = false,
  onCloseAddDialog,
}: {
  nightPreview?: boolean;
  showAddDialogExternal?: boolean;
  onCloseAddDialog?: () => void;
}) {
  const fixtures = useEditorStore((s) => s.fixtures);
  const addFixture = useEditorStore((s) => s.addFixture);
  const updateFixture = useEditorStore((s) => s.updateFixture);
  const deleteFixture = useEditorStore((s) => s.deleteFixture);
  const houseCustomSvg = useEditorStore((s) => s.houseCustomSvg);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startMX: number; startMY: number; origX: number; origY: number } | null>(null);
  const [showAddDialogInternal, setShowAddDialogInternal] = useState(false);
  const showAddDialog = showAddDialogInternal || showAddDialogExternal;
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [leftTab, setLeftTab] = useState<"props" | "layers">("props");
  const [inspectorTab, setInspectorTab] = useState<"properties" | "mapping" | "channels" | "preview">("properties");
  const svgRef = useRef<SVGSVGElement>(null);

  const toggleVisibility = useCallback((id: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selected = fixtures.find((f) => f.id === selectedId) ?? null;

  // Filter fixtures by search
  const filteredFixtures = useMemo(() => {
    if (!searchQuery.trim()) return fixtures;
    const q = searchQuery.toLowerCase();
    return fixtures.filter((f) => f.name.toLowerCase().includes(q) || f.kind.toLowerCase().includes(q));
  }, [fixtures, searchQuery]);

  // Convert mouse event to SVG coords (0-720, 0-420)
  const toSvg = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 720,
      y: ((e.clientY - rect.top) / rect.height) * 420,
    };
  }, []);

  const handlePropMouseDown = useCallback((e: React.MouseEvent, fixtureId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(fixtureId);
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (!fixture?.layout?.points[0]) return;
    const pt = toSvg(e);
    if (!pt) return;
    setDragging({
      id: fixtureId,
      startMX: pt.x,
      startMY: pt.y,
      origX: fixture.layout.points[0].x,
      origY: fixture.layout.points[0].y,
    });
  }, [fixtures, toSvg]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const pt = toSvg(e);
    if (!pt) return;
    const dx = pt.x - dragging.startMX;
    const dy = pt.y - dragging.startMY;
    updateFixture(dragging.id, {
      layout: { points: [{ x: dragging.origX + dx, y: dragging.origY + dy }], closed: false },
    });
  }, [dragging, toSvg, updateFixture]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (!target.closest("[data-prop]")) {
      setSelectedId(null);
    }
  }, []);

  // Layout summary calculations
  const totalChannels = useMemo(() => {
    return fixtures.reduce((sum, f) => sum + f.pixelCount * 3, 0);
  }, [fixtures]);

  const issuesList = useMemo(() => computeIssuesList(fixtures), [fixtures]);

  const layoutReadiness = useMemo(() => computeLayoutReadiness(fixtures, issuesList), [fixtures, issuesList]);

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left panel — Props / Layers */}
      <PropListPanel
        filteredFixtures={filteredFixtures}
        selectedId={selectedId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hiddenIds={hiddenIds}
        toggleVisibility={toggleVisibility}
        setSelectedId={setSelectedId}
        leftTab={leftTab}
        setLeftTab={setLeftTab}
        setShowAddDialogInternal={setShowAddDialogInternal}
      />

      {/* Center — Canvas */}
      <LayoutEditorCanvas
        svgRef={svgRef}
        fixtures={fixtures}
        hiddenIds={hiddenIds}
        selectedId={selectedId}
        dragging={dragging}
        nightPreview={nightPreview}
        houseCustomSvg={houseCustomSvg}
        handlePropMouseDown={handlePropMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        handleCanvasClick={handleCanvasClick}
      />

      {/* Right panel — Inspector */}
      <InspectorPanel
        selected={selected}
        fixtures={fixtures}
        totalChannels={totalChannels}
        issuesList={issuesList}
        layoutReadiness={layoutReadiness}
        inspectorTab={inspectorTab}
        setInspectorTab={setInspectorTab}
        updateFixture={updateFixture}
        deleteFixture={deleteFixture}
        setSelectedId={setSelectedId}
      />

      {/* Add Prop Dialog */}
      {showAddDialog && (
        <AddPropDialog
          fixtures={fixtures}
          onAdd={(fixture) => {
            addFixture(fixture);
            setShowAddDialogInternal(false);
            onCloseAddDialog?.();
            setSelectedId(fixture.id);
          }}
          onClose={() => { setShowAddDialogInternal(false); onCloseAddDialog?.(); }}
        />
      )}
    </div>
  );
}
