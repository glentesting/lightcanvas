import { useEditorStore } from "../src/lib/store/editor-store";
import type { Project } from "../src/types/domain";

const mkProject = (n: number): Project => ({
  id: "p1", ownerId: "", name: "t", audioUrl: null, audioFile: null, audio: null,
  fixtures: Array.from({ length: n }, (_, i) => ({
    id: `f${i}`, kind: "arch" as const, name: `Arch ${i}`, pixelCount: 25, startChannel: 1,
  })),
  groups: [],
  sequence: { tracks: Array.from({ length: n }, (_, i) => ({ id: `f${i}`, kind: "fixture" as const })), blocks: [], bpm: 120, beatGridOffset: 0 },
  houseTemplate: "default", createdAt: "", updatedAt: "",
});

const s = useEditorStore;
const t = () => s.temporal.getState();
let fails = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) fails++;
};

s.getState().loadProject(mkProject(83));
await new Promise((r) => setTimeout(r, 10));
check("history is empty right after opening a project", t().pastStates.length === 0,
  `past=${t().pastStates.length}`);

// what actually happens in the app: delete, then autosave flips the save badge
s.getState().deleteFixtures(["f0", "f1"]);
s.getState().setSaveStatus("saving");
s.getState().setSaveStatus("saved");
s.getState().setSaveStatus("idle");
check("save-status flips do not create undo steps", t().pastStates.length === 1,
  `past=${t().pastStates.length}`);

// selection changes must not either
s.getState().setSelection(["x"]);
s.getState().clearSelection();
check("selection changes do not create undo steps", t().pastStates.length === 1,
  `past=${t().pastStates.length}`);

t().undo();
check("one undo brings back BOTH deleted pieces", s.getState().fixtures.length === 83,
  `${s.getState().fixtures.length} pieces`);

t().redo();
check("redo removes them again", s.getState().fixtures.length === 81,
  `${s.getState().fixtures.length} pieces`);

// bulk placement is one step too
const before = JSON.stringify(s.getState().fixtures.map((f) => f.layout ?? null));
s.getState().updateFixtures(
  s.getState().fixtures.slice(0, 10).map((f, i) => ({ id: f.id, patch: { layout: { points: [{ x: i * 10, y: 5 }], closed: false } } }))
);
check("bulk placement moved 10 pieces", s.getState().fixtures.filter((f) => f.layout).length === 10);
t().undo();
check("one undo puts the whole row back",
  JSON.stringify(s.getState().fixtures.map((f) => f.layout ?? null)) === before);

console.log(fails ? `\n${fails} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(fails ? 1 : 0);
