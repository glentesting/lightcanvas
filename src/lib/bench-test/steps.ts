/**
 * The guided bench test — every screen of it, as data.
 *
 * Content comes from BENCH-TEST-CHECKLIST.md and must stay faithful to it:
 * same procedure, same order, same safety rules, same unit numbers. That file
 * remains the reference; this is the walk-through form of it. Do not invent
 * procedure here.
 *
 * `scripts/verify-bench-test.mts` checks the numbers in this file against the
 * hardware doc's addressing (16 consecutive units per board, hex/decimal
 * pairs, port predictions) — run it after any edit.
 */

export type Tone = "good" | "warn" | "stop" | "neutral";

export interface StepOption {
  id: string;
  /** Big button label */
  label: string;
  tone: Tone;
  /** Shown after choosing, before Continue — reassurance or what-to-do */
  guidance?: string;
  /** Ask for a typed note when chosen */
  wantsNote?: boolean;
  /** Placeholder for the note box */
  notePrompt?: string;
}

export interface Step {
  id: string;
  kind: "safety" | "action" | "observe" | "numbers" | "porttable";
  /** Short title, shown big */
  title: string;
  /** What to physically do — the only instructions on the screen */
  action: string[];
  /** What should happen */
  expect?: string[];
  /** Small honest footnote (unverified-detail warnings etc.) */
  fineprint?: string;
  options: StepOption[];
  /** observe steps always show the note box, before any option is chosen */
  alwaysNote?: boolean;
  notePrompt?: string;
  /** numbers steps: the two candidate lists */
  numbers?: { boxLabel: string; hex: string[]; dec: number[] };
  /** porttable steps */
  table?: { boxLabel: string; rows: PortRow[]; footnote?: string };
}

export interface PortRow {
  port: number;
  unitHex: string;
  unitDec: number;
  expected: string;
}

/* ── the two controller boxes, addressed per the hardware doc ─────────── */

export interface BoxDef {
  key: "box4" | "box1";
  /** e.g. "Box 4" */
  name: string;
  /** what it runs, in his words */
  runs: string;
  baseDec: number;
  port1Hex: string;
  port1Dec: number;
  port9Hex: string;
  port9Dec: number;
  hexList: string[];
  decList: number[];
}

function makeBox(key: "box4" | "box1", name: string, runs: string, baseDec: number): BoxDef {
  const decList = Array.from({ length: 16 }, (_, i) => baseDec + i);
  const hexList = decList.map((n) => n.toString(16).toUpperCase().padStart(2, "0"));
  return {
    key,
    name,
    runs,
    baseDec,
    hexList,
    decList,
    port1Hex: hexList[0],
    port1Dec: decList[0],
    port9Hex: hexList[8],
    port9Dec: decList[8],
  };
}

export const BOX_4 = makeBox("box4", "Box 4", "your mini trees, arches and stakes", 0x09);
export const BOX_1 = makeBox("box1", "Box 1", "your four singing faces (Elden, Felix, Ralphie and Zuzu)", 0x30);

/* ── port predictions, copied from the hardware doc §5 via the checklist ── */

export const BOX_4_PORTS: PortRow[] = [
  "Mini Tree 01 (base + star)", "Mini Tree 02", "Mini Tree 03", "Mini Tree 04",
  "Mini Tree 05", "Mini Tree 06", "Mini Tree 07", "Mini Tree 08",
  "Arch 01 + Arch 02", "Arch 03 + Arch 04", "Arch 05 + Arch 06", "Arch 07 + Arch 08",
  "Pixel Stakes 01–10", "Pixel Stakes 11–20", "Pixel Stakes 21–30", "Pixel Stakes 31–40",
].map((expected, i) => ({
  port: i + 1,
  unitHex: BOX_4.hexList[i],
  unitDec: BOX_4.decList[i],
  expected,
}));

export const BOX_1_PORTS: PortRow[] = [
  "Elden",
  "unknown — possibly the second half of Elden",
  "Felix",
  "unknown — possibly the second half of Felix",
  "Ralphie",
  "unknown — possibly the second half of Ralphie",
  "Zuzu",
  "unknown — possibly the second half of Zuzu",
].map((expected, i) => ({
  port: i + 1,
  unitHex: BOX_1.hexList[i],
  unitDec: BOX_1.decList[i],
  expected,
}));

/* ── the five safety rules (from the checklist; acknowledged up front) ── */

export const SAFETY_RULES: { title: string; body: string }[] = [
  {
    title: "The Director's cable stays unplugged the whole time.",
    body: "A controller box can listen to your computer or to the Director box, but not to both. If both are connected, the software will not find your controller.",
  },
  {
    title: "Never touch the right-hand end of the power supply.",
    body: "Inside each box, under the green board, is a silver power supply. The end with the screw terminals marked N and L carries full wall voltage whenever the box is plugged in. It can kill you. Nothing in this test ever needs you to touch it.",
  },
  {
    title: "Lid closed before the plug goes in the wall. Always.",
    body: "Open the lid → look → close the lid → then plug in. Never the other way round. The box must never be open while it is connected to a wall outlet.",
  },
  {
    title: "Never plug or unplug a light prop while the box is powered.",
    body: "Pull the box's cord out of the wall first, every single time. Connecting lights to a live box is the most common way people destroy a port.",
  },
  {
    title: "Never plug the light-network cable into your computer's internet socket, a router, or a network switch.",
    body: "The plug looks identical but the signal is not. It can damage the adapter or the controller.",
  },
];

/* ── shared option builders ───────────────────────────────────────────── */

const UNSURE: StepOption = {
  id: "unsure",
  label: "My screen doesn't look like this / I'm not sure",
  tone: "neutral",
  wantsNote: true,
  notePrompt: "Type a few words about what you see instead. Then carry on — this gets sorted out at the end, not now.",
  guidance: "That's fine. Write down what you actually see, in your own words, and keep going. Nothing here is a dead end.",
};

/* ── per-box steps ────────────────────────────────────────────────────── */

function boxSteps(box: BoxDef): Step[] {
  const b = box.key;
  return [
    {
      id: `${b}-label`,
      kind: "action",
      title: `${box.name}: check the label inside, then close it up`,
      action: [
        `Make sure ${box.name}'s cord is OUT of the wall. Look at the plug end with your own eyes — don't assume.`,
        "Open the lid.",
        "Look at the silver box mounted underneath the green board. Don't touch anything — this step is eyes only.",
        "Take a photo of its label with your phone.",
        "Close the lid.",
      ],
      expect: [
        "The label should read MeanWell RSP-500-12, with an output of 12V.",
      ],
      options: [
        { id: "ok", label: "Label says RSP-500-12, 12V — and the lid is closed again", tone: "good" },
        {
          id: "different",
          label: "The label says something different",
          tone: "stop",
          wantsNote: true,
          notePrompt: "Type exactly what the label says (or just the model number).",
          guidance: "Leave the cord out of the wall for this box and note what the label says. You can keep going with the other box later — this one waits until Claude has seen your note.",
        },
        UNSURE,
      ],
    },
    {
      id: `${b}-connect`,
      kind: "action",
      title: `${box.name}: connect everything — cord still out of the wall`,
      action: [
        "With the cord still out of the wall:",
        "Plug your one test stake into Port 1. Leave every other port empty.",
        `Run the network cable from the USB adapter to either of the two network sockets on ${box.name} — both work.`,
        "Plug the USB adapter into your computer.",
      ],
      expect: [
        "Every plug should go in easily. Nothing should need force.",
      ],
      fineprint:
        "Why just one stake? It's only 5 lights. If a connection is wrong somewhere, better to find out with 5 lights on the line than 100. This box has power to spare — that's not the worry.",
      options: [
        { id: "ok", label: "Everything's connected, nothing forced", tone: "good" },
        {
          id: "wontfit",
          label: "A plug won't go in easily",
          tone: "stop",
          wantsNote: true,
          notePrompt: "Which plug, and where were you trying to put it?",
          guidance: "STOP — do not force it. A plug that resists is the wrong way round or the wrong plug, and forcing it destroys lights instantly. Leave it out, note which plug, and carry on to the summary so Claude can see it.",
        },
        UNSURE,
      ],
    },
    {
      id: `${b}-power`,
      kind: "observe",
      title: `${box.name}: power it up and watch the board`,
      action: [
        "Double-check the lid is closed.",
        `Plug ${box.name}'s cord into a wall outlet.`,
        "Look at the box (through any vent or window, or just listen) — what happened?",
      ],
      expect: [
        "At least one small light should come on somewhere on the green board. The power supply often has a small green light of its own.",
      ],
      fineprint:
        "Honest note: nobody has written down what this exact board's lights mean, so don't try to interpret them. Just describe them — that description is real data.",
      alwaysNote: true,
      notePrompt: "Describe the lights: how many, what colour, steady or blinking?",
      options: [
        { id: "lights", label: "I can see at least one light on", tone: "good" },
        {
          id: "dark",
          label: "The box is completely dark",
          tone: "stop",
          guidance: "STOP HERE for this box. Pull the cord out of the wall. Don't open the lid, don't try again — a dark board with wall power is exactly the thing Claude needs to hear about before anything else happens. Your answers are saved; go on to the summary when you're ready.",
          wantsNote: true,
          notePrompt: "Anything you noticed — a sound, a smell, a flicker?",
        },
        UNSURE,
      ],
    },
    {
      id: `${b}-find`,
      kind: "action",
      title: `${box.name}: make the software find it`,
      action: [
        "Open the Hardware Utility. It isn't its own program — go Start → Light-O-Rama Control Panel → Controller Setup → Hardware Utility. (Or right-click the LOR icon near the clock, behind the little ^ arrow, and pick it from there.)",
        "Under Ports to Scan, pick the COM port for the adapter — it's the one that appeared after you plugged the adapter in. Last time it was COM3. If it says no ports were found, press the refresh icon, the circle with an arrow.",
        "Under Scan For, choose the option that searches a range of controller numbers.",
        "Click Scan.",
      ],
      expect: [
        "One line should come back describing the whole board at once — the kind of board, its firmware, and a range of numbers, like: Pixie16, firmware 1.10, 09 - 18, COM3. Don't worry yet about what the numbers are — that's the next screen.",
      ],
      fineprint:
        "If nothing appears at all and the COM port is missing entirely, the adapter's driver may need reinstalling — that's the FTDI driver from ftdichip.com. It was installed on this computer on September 12, so it should already be there.",
      options: [
        { id: "found", label: "A list appeared", tone: "good" },
        {
          id: "nothing",
          label: "It found nothing",
          tone: "warn",
          wantsNote: true,
          notePrompt: "Which COM port did you pick, and is there a light on the board?",
          guidance: "The usual causes, in order: the Director's cable is still connected somewhere; the box isn't actually powered; the wrong COM port is picked; the search number is set too low. Check those four, try Refresh once more, then write down where it stands and carry on.",
        },
        UNSURE,
      ],
    },
    {
      id: `${b}-numbers`,
      kind: "numbers",
      title: `${box.name}: match the numbers on your screen`,
      action: [
        "Look at the list the software found. Compare it to the two sets below.",
      ],
      expect: [
        "Sixteen entries is CORRECT for this box — it is one board answering on sixteen numbers, one per port. Sixteen is the pass, not a problem.",
      ],
      fineprint:
        "The software can show these numbers two different ways, which is why there are two sets. Both are the same board. The tell: if you can see any letters mixed in (like 0A or 3F), yours is the first set.",
      numbers: { boxLabel: box.name, hex: box.hexList, dec: box.decList },
      options: [
        { id: "hex", label: "Mine matches the FIRST set (it has letters)", tone: "good" },
        { id: "dec", label: "Mine matches the SECOND set (numbers only)", tone: "good" },
        {
          id: "one-entry",
          label: "I only got ONE entry",
          tone: "warn",
          wantsNote: true,
          notePrompt: "Type exactly what that one entry says, word for word.",
          guidance: "One entry can still be a pass — some versions roll the whole board up into a single line. If it mentions Pixie16, or 16 ports, or shows a range of numbers, that counts. Type exactly what it says and carry on.",
        },
        {
          id: "neither",
          label: "Neither set matches what I see",
          tone: "stop",
          wantsNote: true,
          notePrompt: "Type the first number and the last number in your list, exactly as shown.",
          guidance: "Don't change anything — and don't touch the switches inside the box. Numbers starting in the wrong place is something Claude needs to see before anyone adjusts anything. Note what you see and carry on.",
        },
      ],
    },
    {
      id: `${b}-light1`,
      kind: "action",
      title: `${box.name}: light the stake on Port 1`,
      action: [
        "Click Configure next to your controller in the list, then the Test Pixels tab along the top. (Test Lights in the left sidebar will be greyed out — that's normal and not a problem.)",
        "Under Select Strings to Test, click Select None, then tick only Port 1.",
        "Under Color Cycle, click Select None, then tick one colour you'll recognise, like red. One steady colour is much easier to judge than a cycle.",
        "Flip Run Test to On. Flip it back off when you're done looking.",
      ],
      fineprint:
        "Don't touch Update Config, Change or Update on that screen — those write to the board, and nothing on it needs changing.",
      expect: [
        "The 5 lights on your stake should come on in the colour you picked.",
      ],
      options: [
        { id: "lit", label: "It lit up in my colour", tone: "good" },
        {
          id: "wrong-colour",
          label: "It lit, but in the WRONG colour",
          tone: "warn",
          wantsNote: true,
          notePrompt: "Which colour did you ask for, and which did you get?",
          guidance: "Good news: that's not a fault and nothing is damaged. Lights come in two colour-orderings and the software just needs telling which — a settings fix for later. Note the two colours and carry on.",
        },
        {
          id: "dark",
          label: "Nothing lit",
          tone: "warn",
          wantsNote: true,
          notePrompt: "Which controller number did you test?",
          guidance: "Check two things: the stake really is in Port 1, and you tested the number for Port 1 (shown above). If both are right and it's still dark — pull the cord out of the wall before touching anything, note it, and carry on.",
        },
        UNSURE,
      ],
    },
    {
      id: `${b}-light9`,
      kind: "action",
      title: `${box.name}: now move the stake to Port 9`,
      action: [
        "Pull the cord OUT of the wall first. Count to five.",
        "Move the stake from Port 1 to Port 9.",
        "Plug the cord back into the wall.",
        "On the Test Pixels tab, Select None again, then tick only Port 9. Same single colour. Run Test on.",
      ],
      expect: [
        "The stake should light again, same as before.",
      ],
      fineprint:
        "This step checks the far half of the board: the sixteen ports come in two halves (1–8 and 9–16), fed from one internal supply. Both halves of both boxes passed this on September 12, 2026 — so a dark Port 9 now would mean something has changed.",
      options: [
        { id: "lit", label: "It lit on Port 9 too", tone: "good" },
        {
          id: "half-dark",
          label: "Port 9 stayed dark, but Port 1 worked",
          tone: "stop",
          wantsNote: true,
          notePrompt: "Anything else you noticed?",
          guidance: "That's the answer to a real open question, not a mistake you made: it likely means only half the board is getting power. Pull the cord out of the wall and don't open the lid — Claude needs to see this before anything else happens. Note it and carry on to the summary.",
        },
        {
          id: "dark",
          label: "Nothing lit at all this time",
          tone: "warn",
          wantsNote: true,
          notePrompt: "Which controller number did you test?",
          guidance: "Check the number matches the one shown above for Port 9, and the stake is seated in Port 9. If it's still dark, pull the cord out of the wall, note it, and carry on.",
        },
        UNSURE,
      ],
    },
  ];
}

/* ── the full walk, in order ──────────────────────────────────────────── */

export const STEPS: Step[] = [
  {
    id: "safety",
    kind: "safety",
    title: "Five rules before anything gets plugged in",
    action: [],
    options: [
      { id: "ack", label: "I've read all five and I'll follow them", tone: "good" },
    ],
  },
  {
    id: "gather",
    kind: "action",
    title: "Put everything on the table",
    action: [
      "Box 4 — the controller that runs your trees, arches and stakes.",
      "Box 1 — the controller that runs your four singing faces.",
      "The USB adapter (the one that arrived recently).",
      "One network cable — the kind that looks like an internet cable.",
      "ONE pixel stake — just one, it's your test light.",
      "Your phone, for photos. A pen if you printed anything.",
      "This computer, close enough to the table to read.",
    ],
    expect: [
      "No power supplies to fetch — each box has its own inside and plugs straight into the wall.",
    ],
    fineprint:
      "You have done this before — both boxes passed on September 12, 2026. Nothing below has changed; run it again the same way.",
    options: [
      { id: "ok", label: "It's all on the table", tone: "good" },
      {
        id: "missing",
        label: "I'm missing something",
        tone: "warn",
        wantsNote: true,
        notePrompt: "What's missing?",
        guidance: "Note what's missing. If it's the stake or the network cable, the test can't start without it — better to stop now than improvise.",
      },
      UNSURE,
    ],
  },
  {
    id: "director",
    kind: "action",
    title: "Unplug the Director",
    action: [
      "Find the network cable that runs from Box 2 — the Director, the box with the SD card and the FM radio — to your controllers.",
      "Unplug it from the controllers.",
      "Put it somewhere out of the way so it can't sneak back in mid-test.",
    ],
    expect: [
      "It stays unplugged for this whole test. A controller listens to your computer OR the Director — never both. If it's connected, the software will find nothing.",
    ],
    options: [
      { id: "ok", label: "It's unplugged and out of the way", tone: "good" },
      {
        id: "cant-find",
        label: "I can't find that cable",
        tone: "warn",
        wantsNote: true,
        notePrompt: "Describe what cables you can see going into the controller boxes.",
        guidance: "If no cable runs from the Director to either controller box, there's nothing to unplug — note what you see and carry on. If you're not sure which box is the Director, it's the one the SD card goes into.",
      },
      UNSURE,
    ],
  },
  ...boxSteps(BOX_4),
  {
    id: "switch-boxes",
    kind: "action",
    title: "Swap over to Box 1",
    action: [
      "Pull Box 4's cord OUT of the wall. Count to five.",
      "Move the stake from Box 4 back into your hand — it's Box 1's test light now.",
      "Move the network cable from Box 4 over to either network socket on Box 1.",
    ],
    expect: [
      "One box at a time, always. Box 4 stays unplugged from here on.",
    ],
    options: [
      { id: "ok", label: "Done — Box 4 is unplugged, cable moved", tone: "good" },
      UNSURE,
      {
        id: "problem",
        label: "Something's not right",
        tone: "warn",
        wantsNote: true,
        notePrompt: "What happened?",
        guidance: "Note it and carry on if you safely can — cord out of the wall first if you need to touch anything.",
      },
    ],
  },
  ...boxSteps(BOX_1),
  {
    id: "box4-ports",
    kind: "porttable",
    title: "Box 4: which light is on which port?",
    action: [
      "This part is optional today — you can skip it and come back.",
      "To fill a row in: cord out of the wall, plug that prop's numbered plug into the port, cord back in, run Test Lights on that port's number, and write down what actually lit up.",
      "The white numbered bands on the plugs are the only record of this wiring — don't remove them, and photograph the full set.",
    ],
    expect: [
      "Each row shows what the reference papers say should be there. You're checking the prediction, not inventing the answer.",
    ],
    table: { boxLabel: "Box 4", rows: BOX_4_PORTS },
    options: [
      { id: "done", label: "I've filled in what I tested", tone: "good" },
      { id: "skip", label: "Skip this for now — I'll come back", tone: "neutral" },
      UNSURE,
    ],
  },
  {
    id: "box1-ports",
    kind: "porttable",
    title: "Box 1: which face is on which port?",
    action: [
      "Same idea, optional today. Cord out, plug a face in, cord in, Test Lights on that port's number, write down what lit.",
      "There's a real mystery here: the papers say the faces sit on every OTHER port, and nobody knows what the in-between ports do. If a face lights half on one number and half on the next, that solves it — write it down.",
    ],
    table: {
      boxLabel: "Box 1",
      rows: BOX_1_PORTS,
      footnote: "Ports 9–16 exist on this box too, but nothing is known to be plugged into them.",
    },
    options: [
      { id: "done", label: "I've filled in what I tested", tone: "good" },
      { id: "skip", label: "Skip this for now — I'll come back", tone: "neutral" },
      UNSURE,
    ],
  },
];

export const TOTAL_STEPS = STEPS.length;

/** Which box a step belongs to, for the summary grouping. */
export function stepBox(id: string): "Box 4" | "Box 1" | null {
  if (id.startsWith("box4")) return "Box 4";
  if (id.startsWith("box1")) return "Box 1";
  return null;
}
