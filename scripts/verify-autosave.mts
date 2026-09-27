/**
 * Autosave guard suite.
 *
 * The defect this exists to prevent, found 22 September 2026 and fixed on the
 * 27th: opening a project wrote the whole project straight back to Supabase.
 * `use-autosave.ts` started its "last saved" baseline as an empty string, and
 * `loadProject` writes the entire watched slice in one go, so ~1.2 s after a
 * project appeared on screen the app POSTed it back with nobody touching
 * anything. The owner's `updated_at` moved every time he opened his own show.
 *
 * Every scenario below runs TWICE — once against `legacyListener`, a verbatim
 * reproduction of the pre-fix logic (git 702ef1c), and once against the
 * shipped `createAutosaveController`. The legacy arm is expected to FAIL; it
 * is kept here so the fix can never be quietly reverted without this suite
 * going red.
 *
 * Run: npx tsx scripts/verify-autosave.mts
 */

import { useEditorStore } from "../src/lib/store/editor-store";
import {
  countsOf,
  createAutosaveController,
  type AutosaveSlice,
} from "../src/lib/store/autosave-engine";
import type { Project, Fixture } from "../src/types/domain";
import type { EffectBlock } from "../src/lib/timeline/types";

/** Short so the suite runs fast; the shipped hook uses 1200 ms. */
const DEBOUNCE_MS = 20;
const SETTLE_MS = DEBOUNCE_MS * 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── the watched slice, identical to the hook's ──────────────────────────────
type StoreState = ReturnType<typeof useEditorStore.getState>;
const sliceOf = (s: StoreState): AutosaveSlice => ({
  name: s.name,
  audioUrl: s.audioUrl,
  audioFile: s.audioFile,
  audio: s.audio,
  fixtures: s.fixtures,
  groups: s.groups,
  sequence: s.sequence,
  houseTemplate: s.houseTemplate,
  houseCustomSvg: s.houseCustomSvg,
});

// ── test data ───────────────────────────────────────────────────────────────
function makeProject(id: string, name: string): Project {
  const fixtures: Fixture[] = [1, 2, 3].map((n) => ({
    id: `fix-${id}-${n}`,
    kind: "mini-tree",
    name: `Tree 0${n}`,
    pixelCount: 80,
    startChannel: n * 100,
  }));
  const blocks: EffectBlock[] = fixtures.flatMap((f, i) =>
    [0, 1].map((k) => ({
      id: `blk-${f.id}-${k}`,
      trackId: f.id,
      effectId: "chase" as EffectBlock["effectId"],
      start: i * 4 + k * 2,
      duration: 2,
      params: { color1: "#ff0000", intensity: 1, speed: 0.5, easing: "linear" },
    }))
  );
  return {
    id,
    ownerId: "local",
    name,
    audioUrl: null,
    audioFile: "song.mp3",
    audio: null,
    fixtures,
    groups: [],
    sequence: { tracks: fixtures.map((f) => ({ id: f.id, kind: "fixture" as const })), blocks, bpm: 120, beatGridOffset: 0 },
    houseTemplate: "default",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

/** Reset the store to its empty state between scenarios. */
function resetStore() {
  useEditorStore.setState({
    projectId: "",
    name: "",
    audioUrl: null,
    audioFile: null,
    audio: null,
    fixtures: [],
    groups: [],
    sequence: { tracks: [], blocks: [], bpm: 120, beatGridOffset: 0 },
    houseTemplate: "default",
    houseCustomSvg: undefined,
    saveStatus: "idle",
    saveMessage: null,
  });
}

// ── the two implementations under test ──────────────────────────────────────
interface Post {
  projectId: string;
  fixtures: number;
  blocks: number;
}

interface Arm {
  /** Called by the scenario where the real hook's seed effect would run. */
  seed(): void;
  stop(): void;
}

interface Gate {
  loaded: boolean;
  loadError: string | null;
}

/**
 * VERBATIM pre-fix logic (git 702ef1c, src/lib/store/use-autosave.ts).
 * No gate, no baseline, `lastSaved` starts empty. Kept only as the control.
 */
function legacyListener(projectId: string, _gate: { g: Gate }, posts: Post[]): Arm {
  let lastSaved = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = useEditorStore.subscribe(sliceOf, (slice) => {
    const serialized = JSON.stringify(slice);
    if (serialized === lastSaved) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      posts.push({ projectId, fixtures: slice.fixtures.length, blocks: slice.sequence.blocks.length });
      lastSaved = serialized;
    }, DEBOUNCE_MS);
  });
  return {
    seed: () => {},
    stop: () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    },
  };
}

/** The shipped controller, driven exactly as `use-autosave.ts` drives it. */
function fixedController(projectId: string, gate: { g: Gate }, posts: Post[], refusals: string[]): Arm {
  const controller = createAutosaveController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const decide = (slice: AutosaveSlice, serialized: string) =>
    controller.decide({
      loaded: gate.g.loaded,
      loadError: gate.g.loadError,
      pageProjectId: projectId,
      storeProjectId: useEditorStore.getState().projectId,
      slice,
      serialized,
    });

  const flush = () => {
    const state = useEditorStore.getState();
    const slice = sliceOf(state);
    const serialized = JSON.stringify(slice);
    const decision = decide(slice, serialized);
    if (decision.action === "refuse") {
      refusals.push(decision.message);
      return;
    }
    if (decision.action !== "save") return;
    posts.push({ projectId, fixtures: slice.fixtures.length, blocks: slice.sequence.blocks.length });
    controller.commit(serialized, countsOf(slice));
  };

  const unsubscribe = useEditorStore.subscribe(sliceOf, (slice) => {
    const serialized = JSON.stringify(slice);
    const decision = decide(slice, serialized);
    if (decision.action === "refuse") {
      if (timer) clearTimeout(timer);
      refusals.push(decision.message);
      return;
    }
    if (decision.action !== "save") return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  });

  return {
    // Mirrors the hook's seed effect: runs after the load, only when the page
    // says the project is loaded and the store actually holds it.
    seed: () => {
      if (!gate.g.loaded || gate.g.loadError) return;
      if (controller.seededFor() === projectId) return;
      const state = useEditorStore.getState();
      if (state.projectId !== projectId) return;
      controller.seed(projectId, sliceOf(state));
    },
    stop: () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    },
  };
}

// ── scenarios ───────────────────────────────────────────────────────────────
type Build = (projectId: string, gate: { g: Gate }, posts: Post[], refusals: string[]) => Arm;

interface Outcome {
  pass: boolean;
  detail: string;
}

async function scenarioLoadSendsNoSave(build: Build): Promise<Outcome> {
  resetStore();
  const posts: Post[] = [];
  const gate = { g: { loaded: false, loadError: null } as Gate };
  const arm = build("proj-A", gate, posts, []);

  useEditorStore.getState().loadProject(makeProject("proj-A", "My Christmas Show 2026"));
  gate.g = { loaded: true, loadError: null };
  arm.seed();

  await sleep(SETTLE_MS);
  arm.stop();
  return { pass: posts.length === 0, detail: `${posts.length} save(s) after opening the project, expected 0` };
}

async function scenarioOneEditOneSave(build: Build): Promise<Outcome> {
  resetStore();
  const posts: Post[] = [];
  const gate = { g: { loaded: false, loadError: null } as Gate };
  const arm = build("proj-A", gate, posts, []);

  useEditorStore.getState().loadProject(makeProject("proj-A", "My Christmas Show 2026"));
  gate.g = { loaded: true, loadError: null };
  arm.seed();
  await sleep(SETTLE_MS);

  useEditorStore.getState().setName("My Christmas Show 2026 (edited)");
  await sleep(SETTLE_MS);

  arm.stop();
  return { pass: posts.length === 1, detail: `${posts.length} save(s) for one edit, expected exactly 1` };
}

async function scenarioFailedLoadSendsNone(build: Build): Promise<Outcome> {
  resetStore();
  const posts: Post[] = [];

  // Project A is open and loaded.
  useEditorStore.getState().loadProject(makeProject("proj-A", "Show A"));

  // The page navigates to project B, which fails to load. The store still
  // holds A. Any store movement now must not be written — least of all under
  // B's id, which is what the old code did.
  const gate = { g: { loaded: false, loadError: "Could not load your show." } as Gate };
  const arm = build("proj-B", gate, posts, []);
  arm.seed();

  useEditorStore.getState().setName("Show A touched while B was failing");
  await sleep(SETTLE_MS);

  arm.stop();
  const wrongProject = posts.filter((p) => p.projectId === "proj-B").length;
  return {
    pass: posts.length === 0,
    detail: `${posts.length} save(s) after a failed load, expected 0` +
      (wrongProject ? ` — ${wrongProject} of them wrote project A's data under project B's id` : ""),
  };
}

async function scenarioEmptyingSaveRefused(build: Build): Promise<Outcome> {
  resetStore();
  const posts: Post[] = [];
  const refusals: string[] = [];
  const gate = { g: { loaded: false, loadError: null } as Gate };
  const arm = build("proj-A", gate, posts, refusals);

  const project = makeProject("proj-A", "My Christmas Show 2026");
  useEditorStore.getState().loadProject(project);
  gate.g = { loaded: true, loadError: null };
  arm.seed();
  await sleep(SETTLE_MS);

  // Wipe every prop — which also takes every effect block with it.
  useEditorStore.getState().deleteFixtures(project.fixtures.map((f) => f.id));
  await sleep(SETTLE_MS);

  arm.stop();
  const emptied = posts.filter((p) => p.fixtures === 0 || p.blocks === 0);
  return {
    pass: posts.length === 0 && refusals.length > 0,
    detail: `${posts.length} save(s) (${emptied.length} would have emptied the show), ${refusals.length} refusal message(s)`,
  };
}

const SCENARIOS: Array<{ name: string; run: (b: Build) => Promise<Outcome> }> = [
  { name: "loading a project sends no save", run: scenarioLoadSendsNoSave },
  { name: "one real edit after loading sends exactly one save", run: scenarioOneEditOneSave },
  { name: "a failed load sends none", run: scenarioFailedLoadSendsNone },
  { name: "a save that would empty the show is refused", run: scenarioEmptyingSaveRefused },
];

// ── run both arms ───────────────────────────────────────────────────────────
async function main() {
  console.log("Autosave guard suite — the OLD code is expected to fail every scenario.\n");

  console.log("── OLD code (verbatim pre-fix listener, git 702ef1c) ──");
  const oldResults: Outcome[] = [];
  for (const s of SCENARIOS) {
    const r = await s.run(legacyListener);
    oldResults.push(r);
    console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${s.name}\n          ${r.detail}`);
  }

  console.log("\n── NEW code (shipped createAutosaveController) ──");
  const newResults: Outcome[] = [];
  for (const s of SCENARIOS) {
    const r = await s.run(fixedController);
    newResults.push(r);
    console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${s.name}\n          ${r.detail}`);
  }

  const newAllPass = newResults.every((r) => r.pass);
  const oldCaught = oldResults.filter((r) => !r.pass).length;

  console.log(`\nold code failed ${oldCaught}/${SCENARIOS.length} scenarios (that is the bug)`);
  console.log(`new code passed ${newResults.filter((r) => r.pass).length}/${SCENARIOS.length} scenarios`);

  if (!newAllPass) {
    console.log("\nAUTOSAVE SUITE FAILED");
    process.exit(1);
  }
  if (oldCaught === 0) {
    console.log("\nAUTOSAVE SUITE FAILED — the control arm passed, so these scenarios no longer prove anything");
    process.exit(1);
  }
  console.log("\nALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
