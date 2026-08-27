# LightCanvas — Hardware & LOR Reference

**Owner:** Glen
**Last updated:** August 23, 2026
**Purpose:** Single source of truth for the physical show. Hardware, addressing,
file locations, and the `.loredit` format. If it isn't in here, it isn't settled.

---

## 1. The short version

- Light-O-Rama **Pro**, S6 v6.6.12. Everything unlocked.
- Show runs standalone off the **G4-MP3 Director** via SD card. No PC at the house.
- Export target is **`.loredit`** (S6, saveFileVersion 15). Not `.lms`. Not `.fseq`.
- Props are **RGBPlus layout** and match the purchased sequences exactly.
- **Both Pixie16 unit IDs are already set correctly.** Nothing to change.
- Fallback show = 8 purchased sequences, playable as-is once audio is sourced.

---

## 2. Hardware inventory

Boxes numbered with sticky notes during the Aug 2026 garage inventory.

| Box | Device | Role |
|---|---|---|
| **1** | LOR Pixie16D | Pixel controller — **singing tree faces** |
| **2** | LOR G4-MP3 Director + Whole House FM Transmitter | Show playback, SD card, FM audio |
| **3** | LOR CTB16PCG3 (Ver 5, 22055) | 16-channel AC controller |
| **4** | LOR Pixie16D | Pixel controller — **trees, arches, stakes** |
| — | CPT 15W buck converter (7–22V in, 5V/3A out) | Powers the FM transmitter |
| — | USB485-HS adapter | **MISSING — reordered Aug 23, 2026, ~$43, ~6 business days** |

### Props

| Prop | Qty | Pixels each | Total pixels |
|---|---|---|---|
| Coro Mini Tree with Star | 8 | 100 | 800 |
| Coro Mini Arch | 8 | 25 | 200 |
| Coro Pixel Stake | 40 | 5 | 200 |
| Singing Tree characters (Elden, Felix, Ralphie, Zuzu) | 4 | 16 strands total | — |
| AC lights (roof, ridges, peaks) | — | — | 16 AC channels |

**Total pixels: 1,200.** Well under the 3,000-pixel limit for a high-speed LOR
network at 500k.

---

## 3. Unit IDs and DIP switches

LOR unit IDs are **hexadecimal**. A Pixie16 consumes **16 consecutive unit IDs**,
one per port, auto-numbering upward from whatever the DIP switches are set to.

DIP switch 1 is the most significant bit, switch 8 the least.

| Device | Unit ID | DIP switches ON | Verified |
|---|---|---|---|
| **Box 4** (Pixie16 — trees/arches/stakes) | `09` | 5 and 8 | ✅ visually confirmed Aug 2026 |
| **Box 1** (Pixie16 — faces) | `30` | 3 and 4 | ✅ visually confirmed Aug 2026 |
| **Box 3** (CTB16PCG3 — AC) | `01` (expected) | n/a — software-set | ❌ needs Hardware Utility |

> **Both Pixie16 boards were already set correctly.** Do not change them.
> The previous owner addressed this gear to match RGBPlus.

**If you ever do change a DIP switch:** unplug the controller first, flip, then
reapply power. Changes are not read until power cycle.

---

## 4. Network assignments

The Director has four high-speed networks (Net 1–4). These map to the network
names inside the `.loredit` file:

| Director port | `.loredit` name | Devices | In use |
|---|---|---|---|
| **Net 1** | `Regular` | Box 3 (CTB16 @ `01`), Box 1 (Pixie16 @ `30`) | ✅ |
| **Net 2** | `Aux A` | Box 4 (Pixie16 @ `09`) | ✅ |
| Net 3 | `Aux B` | — RGBPlus RGB rooflines (not owned) | ❌ |
| Net 4 | `Aux C` | — RGBPlus matrix/extras (not owned) | ❌ |

Controllers **daisy-chain** on a network with CAT5 between RJ45 jacks. Either
jack on a Pixie works; they're a pass-through pair.

> **CAT5 ≠ ethernet.** Never plug LOR network cable into a router, switch, or a
> computer's ethernet port.

> **A Pixie connects to the Director OR a computer — never both at once.**
> Unplug the Director's network cable before bench-testing from the PC.

---

## 5. Port-to-prop map

### Box 4 — Pixie16 @ base `09`, Aux A / Net 2

| Port | Unit | Prop(s) | Channels |
|---|---|---|---|
| 1 | `09` | Mini Tree 01 (base + star) | 1–240 base, 241–300 star |
| 2 | `0A` | Mini Tree 02 | same |
| 3 | `0B` | Mini Tree 03 | same |
| 4 | `0C` | Mini Tree 04 | same |
| 5 | `0D` | Mini Tree 05 | same |
| 6 | `0E` | Mini Tree 06 | same |
| 7 | `0F` | Mini Tree 07 | same |
| 8 | `10` | Mini Tree 08 | same |
| 9 | `11` | Arch 01 + Arch 02 | 1–75, 76–150 |
| 10 | `12` | Arch 03 + Arch 04 | 1–75, 76–150 |
| 11 | `13` | Arch 05 + Arch 06 | 1–75, 76–150 |
| 12 | `14` | Arch 07 + Arch 08 | 1–75, 76–150 |
| 13 | `15` | Pixel Stakes 01–10 | 15 channels each, sequential |
| 14 | `16` | Pixel Stakes 11–20 | same |
| 15 | `17` | Pixel Stakes 21–30 | same |
| 16 | `18` | Pixel Stakes 31–40 | same |

All 16 ports used. All 1,200 pixels accounted for.

### Box 1 — Pixie16 @ base `30`, Regular / Net 1

| Unit | Face |
|---|---|
| `30` | Elden |
| `32` | Felix |
| `34` | Ralphie |
| `36` | Zuzu |

Each face uses channels 1–66. Channels 1–24 are the legacy Face V1 props;
25–66 are FaceV2 (tree outline, star/bow, eyes open/closed, and ten phoneme
mouths: closed, E, AI, OU, Ah, MBP, FV, L, WQ, etc).

⚠️ **Open question:** why the addressing skips `31`, `33`, `35`, `37`. Each face
may span two ports, or the four strands may chain on one. Test Lights will
resolve it.

### Box 3 — CTB16PCG3 @ unit `01`, Regular / Net 1

What RGBPlus expects on each circuit:

| Circuits | RGBPlus name |
|---|---|
| 1–4 | AC Top Window 01–04 (Group A) |
| 5–8 | AC Bottom Window 01–04 (Group B) |
| 9–12 | AC Columns 01–04 (Group C) |
| 13–16 | AC Railing 01–04 (Group D) |

⚠️ **Known mismatch:** Glen's physical AC lights are roofline, ridges, and peaks
— not windows, columns, and railings. The lights will still fire; they'll just
be doing whatever the sequence wrote for those names. Visually fine, but the
names won't match reality. Decide later whether to rename in the Preview.

### Prop harness

The pixel dongles coming out of Boxes 1 and 4 are **numbered with white bands**
(1, 3, 4… observed). **Do not remove these.** They are the only surviving
port-to-prop map. Photograph the full set during deployment.

---

## 6. The `.loredit` file format

Verified by parsing a real purchased sequence and round-tripping it
byte-identically — six for six, including all five LOR sample files.

**Container:** UTF-8 XML **with BOM**, CRLF line endings, 2-space indent,
` />` self-closing, no trailing newline.

**Root:** `<sequence saveFileVersion="15" AppVersion="6.2.0.14" ...>`

**Children, in order:** `PreviewClass`, `BeatChannels`, `Subsequences`,
`SequenceProps`, `ArchivedProps`, `RgbAggregates`, `TimingGrids`, `BeatView`,
`PropViews`, `MotionPaks`, `pictures`

### Key structures

- **`<PreviewClass>`** — the layout. 265 `<PropClass>` elements in RGBPlus, each
  with `Name`, `DeviceType`, `StringType`, `ChannelGrid`, and a `<shape>` of
  `<point x= y=>` coordinates.
- **`ChannelGrid` format:** `Network,Unit(hex),StartChannel,EndChannel,?,Color`
  Multi-string props use semicolon-separated grids.
  **Channels, not pixels** — 3 channels per RGB pixel.
- **`<SequenceProps>`** — `<SeqProp>` per prop → rows → `<effect>` elements.
- **`<TimingGrids>`** — `TimingGridFree` holds beat marks (1,478 in Carol of the
  Bells), `TimingGridFixed` holds a fixed spacing grid.

### The critical grammar rule

**`<channel>` rows and `<track>` rows are separate worlds. Never mixed.**

| StringType | Row type | Effects allowed |
|---|---|---|
| Traditional (AC) | `<channel>` | `INTENSITY`, `SHIMMER`, `TWINKLE` only |
| DumbRGB (faces) | `<channel>` | Same, but color = signed 32-bit ARGB in `intensity` (e.g. `-65536` = full red) |
| RGB (smart pixels) | `<track>` | Motion effect settings strings only |

Confirmed across all 50,695 effects in the reference file. Zero exceptions.

### Effect vocabulary

`INTENSITY`, `SHIMMER`, `TWINKLE`, plus a full motion engine: colorwash, curtain,
ripple, bars, blendedbars, plasma, mystify, spirals, spinner, garland,
archimedesspiral. Also seen in LOR samples: picture, picturexy, text, audio,
spinfade, butterfly, hatchpattern, pinwheel, movingshapes, starfield.

Mixers: `Mix_Average`, `Mix_Alpha_Blend`, `Mix_Rt_Reveals_Lt`.
Settings string shape:
`Mix_Average|0|0|full|20|lightorama_colorwash:<6 ARGB colors>:full,full,single_color|lightorama_none:...`

### Export strategy

**Template-fill, not synthesis.** Take a `.loredit` that already contains the
right Preview, keep `PreviewClass` and `TimingGrids` verbatim, strip the effects,
and write new ones. Proven working — LOR S6 v6.6.12 opened a LightCanvas-written
file on Aug 21, 2026.

Do **not** try to generate `PropClass` geometry from scratch. Weeks of risk for
zero benefit.

---

## 7. File locations

```
C:\Users\glenh\Documents\Light-O-Rama\        ← LOR's data folder. Do not move.
├── Sequences\                                ← the 8 purchased sequences
├── Audio\                                    ← MP3s go here
├── CommonData\                               ← previews, palettes
├── Hardware\  Network\  Logs\  ...

C:\Users\glenh\Documents\LightCanvas\
├── AppRepo\                                  ← the code (GitHub: glentesting/lightcanvas)
├── Songs\                                    ← Glen's own music
├── LOR-6.6.12\                               ← installer
└── Light-O-Rama – Full Setup Overview

C:\Users\glenh\Documents\LightCanvas Old Stuff\   ← archived docs, ignore
```

Confirmed in LOR Control Panel → Settings → Folders. **Do not click "Change
Light-O-Rama Folder Location."** Do not point LOR at OneDrive — cloud sync and
show software don't mix.

---

## 8. Purchased sequences

All RGBPlus layout, all matched to this prop set. Downloaded as self-extracting
`.exe` installers from the LOR account.

| Code | Song |
|---|---|
| C1125 | Carol of the Bells — Pentatonix |
| C1209 | Light of Christmas |
| C1215 | Mary Did You Know |
| C1217 | Mistletoe |
| C1257 | Chipmunk Song |
| F2146 | We Don't Talk About Bruno |
| I1916 | Universal Fanfare (RGBPlus) |
| I1916 | Universal Fanfare (YCM / Traditional) |

**Audio is not included** — copyright. Buy each MP3 separately and place it in
`Documents\Light-O-Rama\Audio\` under the exact filename the sequence requests.
Carol of the Bells wants: `Carol Of The Bells-Pentatonix-SN.mp3`

Every sequence embeds the full 265-prop RGBPlus Preview. Any one of them can
serve as an export template.

---

## 9. Not yet verified

Ordered by risk.

1. **Nothing has been powered on** since the previous owner left. Untested:
   power supplies, pixel strings, controllers, Director, FM transmitter.
2. **CTB16 unit ID** — software-set, needs Hardware Utility to read.
3. **Face port topology** — the `31`/`33`/`35`/`37` gap.
4. **Which numbered dongle drives which physical prop** — Test Lights + a walk
   outside.
5. **Whether the Director's SD card still holds last season's show.**
6. **AC circuit naming mismatch** (§5).

### First bench test — when the adapter arrives

1. Plug USB485-HS into the PC. Let Windows install the driver, note the COM port.
2. **Unplug the Director's network cable.**
3. CAT5 from the adapter to either RJ45 on **Box 4**. Power it up.
4. Control Panel → Networks → add a **Light-O-Rama Adapter**, pick the COM port.
5. Control Panel → **Controller Setup** → refresh.
6. **Expected:** sixteen units, `09` through `18`.
7. Repeat on **Box 1** — expect `30` through `3F`.
8. Then **Box 3** — expect `01`.
9. Use **Test Lights** to fire one port at a time and map dongles to props.

---

## 10. Safety

- **Never exceed a pixel string's rated voltage.** LOR pixels are 5V or 12V with
  ±10% tolerance. Overvolting destroys them instantly.
- **Polarity matters.** On a pixel dangle, the wire with the stripe is always
  **Ground**. Next to it is **Data**. The opposite outside wire is **+Voltage**.
  On 4-wire strings, the remaining wire is Clock (unused on 3-wire).
- Controller terminal order is the same on every LOR pixel controller:
  **GND / DT / CL / V+**
- **Never connect two power supplies to the same bank.** They fight. A Pixie16
  has two independent banks; each can take its own supply.
- Unplug before changing DIP switches.
