# LightCanvas — Hardware & LOR Reference

**Owner:** Glen
**Last updated:** September 12, 2026
**Purpose:** Single source of truth for the physical show. Hardware, addressing,
file locations, and the `.loredit` format. If it isn't in here, it isn't settled.

---

> **Bench testing?** The step-by-step procedure lives in
> **`BENCH-TEST-CHECKLIST.md`** — written in plain English for the owner to
> follow at a table with the hardware in front of him.
> **Glen ran it on 12 September 2026 and both Pixie16 boards passed.** What
> came off the hardware that night is recorded in §3; the PC-side procedure
> that worked is §11. Box 3 (the AC controller) was deliberately skipped.
>
> To be clear about what that test was: **this display ran a full season
> already**, set up and operated by someone else. The gear is proven. The
> bench test was Glen driving it himself for the first time.

---

## 1. The short version

- Light-O-Rama **Pro**, S6 v6.6.12. Everything unlocked.
- Show runs standalone off the **G4-MP3 Director** via SD card. No PC at the house.
- Export target is **`.loredit`** (S6, saveFileVersion 15). Not `.lms`. Not `.fseq`.
- Props are **RGBPlus layout** and match the purchased sequences exactly.
- **Both Pixie16 unit IDs are already set correctly.** Nothing to change.
- **This gear ran a full season.** The whole display — these controllers,
  these props, this wiring, the Director and its SD card workflow — was set
  up and run successfully for a previous season by the previous operator.
  **The equipment is proven. What is new is Glen running it himself.**
  Nothing in these docs should read as "nobody knows whether this works" —
  it worked. Where something is untested, say untested *by him*.
- **Both Pixie16 boards were bench-tested 12 Sept 2026 and passed** — first
  time Glen had powered them up himself: they answer on the network, both
  power halves work, pixels light in the colour asked for. The AC controller
  (Box 3) is the one he has not powered up yet.
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
| — | USB485-HS adapter | Arrived Aug 31, 2026. ✅ **Working — proved 12 Sept 2026.** Needs the FTDI VCP driver (§11); came up as COM3. |
| — | 2 × MeanWell RSP-500-12 | One **inside each Pixie16D enclosure** — see below |

### Power supplies — internal to each Pixie enclosure

✅ **Confirmed by inspection, Aug 31, 2026.** Each Pixie16D enclosure contains
its own power supply, mounted inside the box **directly beneath the green
controller board**. Both boxes are identical.

| | |
|---|---|
| Model | **MeanWell RSP-500-12** |
| Input | 100–240V AC |
| Output | **12V / 41.7A (500W)** |
| To the board | Red wire from **+V** → board **V+**; black from **−V** → board negative |
| AC mains | Arrives on the **N** and **L** terminals on the supply's **right-hand side** |

**Consequences, all load-bearing:**

- **The voltage question is settled.** 12V supply, 12V pixels. Correct match.
  Nothing needs to be bought.
- **Each box is self-contained.** Powering one up means plugging the
  enclosure's cord into a standard wall outlet — that is the entire
  operation. Nothing inside the box needs to be touched or connected.
- 41.7A is far more headroom than the 1,200-pixel show needs.
- ⚠️ **The N/L terminals on the supply's right-hand side carry live wall
  voltage whenever the box is plugged in.** Never touch that end. The lid
  must be closed before the cord goes into the wall, and the cord must be out
  of the wall before the lid is opened. See §10.

✅ **Settled 12 Sept 2026.** A Pixie16 has two power banks (ports 1–8 and
9–16) and each *can* take its own feed, but only a single red/black pair to
the board was ever observed — so it was an open question whether that one
pair feeds both banks. It does: on both boxes, a pixel lit on **port 1 and on
port 9** (§3, §11). One internal supply runs the whole board.

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

## 3. Unit IDs, DIP switches, and controller settings

LOR unit IDs are **hexadecimal**. A Pixie16 consumes **16 consecutive unit IDs**,
one per port, auto-numbering upward from whatever the DIP switches are set to.

DIP switch 1 is the most significant bit, switch 8 the least.

### What "16 consecutive IDs" means in practice

Port *n* answers on `base + (n − 1)`. So a Pixie16 reporting sixteen units is
**working correctly** — it is not duplicated and it is not faulty. Seeing only
one, or a range starting at the wrong number, is the fault condition.

| Board | Base | Occupies (hex) | Occupies (decimal) |
|---|---|---|---|
| Box 4 | `09` | `09`–`18` | 9–24 |
| Box 1 | `30` | `30`–`3F` | 48–63 |

⚠️ **Hex vs decimal is a live trap.** The Hardware Utility can display unit IDs
in **either** hexadecimal or decimal, and the same board looks completely
different in each. `09`–`18` and `9`–`24` are the same sixteen units. Before
concluding anything is misaddressed, establish which mode the software is in.
**The quick tell: any letter in a unit ID (`0A`, `3F`) means it is showing
hex.** This doc is written in hex throughout, matching the `.loredit` files.

| Device | Unit ID | DIP switches ON | Verified |
|---|---|---|---|
| **Box 4** (Pixie16 — trees/arches/stakes) | `09` | 5 and 8 | ✅ **read back off the board 12 Sept 2026** (`09`–`18`) |
| **Box 1** (Pixie16 — faces) | `30` | 3 and 4 | ✅ **read back off the board 12 Sept 2026** (`30`–`3F`) |
| **Box 3** (CTB16PCG3 — AC) | `01` — **assumed, never read** | n/a — **software-set, not DIP** | ⚠️ never read back by anyone; the AC lights ran last season, so `01` is a fair assumption, not a measurement |

> **Both Pixie16 boards were already set correctly.** Do not change them.
> The previous operator addressed this gear to match RGBPlus and ran a full
> season on it.

> ⚠️ **Box 3's unit ID is an assumption, not a reading.** Unlike the Pixie
> boards it has no DIP switches — its ID is set in software and has **never
> been read back off the hardware by anyone.** `01` is what the purchased
> sequences expect, and the AC lights did run last season, so it was very
> probably already `01` — but "it must have been, because the lights worked"
> is inference, not a number anyone has seen.
> **If it turns out to be something else, change the controller to `01` — do
> not change the sequences.** That is one setting in the Hardware Utility
> versus editing the embedded Preview inside all eight purchased sequences
> (265 props each) plus the LightCanvas export mapping. `01` collides with
> nothing: the only other device on Net 1 is Box 1 at `30`–`3F`.
> Rationale and a safe-testing prerequisite list: `BENCH-TEST-CHECKLIST.md` §10.

**If you ever do change a DIP switch:** unplug the controller first, flip, then
reapply power. Changes are not read until power cycle.

### Controller settings — read off the hardware

These were read directly off each board on **12 September 2026** using the
Hardware Utility. Nobody had written them down before — the boards have been
running correctly for a season, but their settings existed only on the boards
themselves. **This is the authoritative record** — it replaces every
prediction about them.

**Box 4 — mini trees, arches, stakes**

| Setting | Value |
|---|---|
| Device | Pixie16 |
| Firmware | 1.10 |
| Unit ID range | `09` – `18` |
| Pixel IC | **WS2811** (800 KHz) |
| Colour order | RGB |
| Pixels per port | 100 |
| Power halves | Both confirmed working — ports 1 and 9 tested |
| Internal supply | MeanWell RSP-500-12, 12V / 41.7A |

**Box 1 — the four singing faces**

| Setting | Value |
|---|---|
| Device | Pixie16 |
| Firmware | 1.10 |
| Unit ID range | `30` – `3F` |
| Pixel IC | **UCS1903** (800 KHz) |
| Colour order | RGB |
| Pixels per port | 100 |
| Power halves | Both confirmed working — ports 1 and 9 tested |
| Internal supply | MeanWell RSP-500-12, 12V / 41.7A |

> ⚠️ **The two boards use different pixel chips** — WS2811 on Box 4, UCS1903
> on Box 1. **Both are correct for what is wired to them. Do not "fix" one to
> match the other.** LOR documentation notes that a Pixie controlling singing
> faces must have Pixels Per Port set to 100; Box 1 is set to 100 — correct
> as-is.

### What the bench test proved

- Both controllers answer on the network with the expected unit ID ranges.
- Both halves of both boards are powered from their single internal supply.
- Pixels light in the colour requested — colour order is correct on both boards.
- The USB485-HS adapter, its driver, and the CAT5 path all work.
- Each singing face occupies **two consecutive ports**, which explains the gaps
  in the unit numbering (§5).

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

**Each face spans two consecutive ports.** Confirmed 12 September 2026 by
reading the board's own configuration — and it explains why the face unit IDs
skip `31`, `33`, `35` and `37`: those are the second half of each character.

| Ports | Units | Character | Notes |
|---|---|---|---|
| 1 and 2 | `30`, `31` | Elden | Channels 1–66 |
| 3 and 4 | `32`, `33` | Felix | Channels 1–66 |
| 5 and 6 | `34`, `35` | Ralphie | Channels 1–66 |
| 7 and 8 | `36`, `37` | Zuzu | Channels 1–66 |
| 9–16 | `38`–`3F` | Unused | No prop assigned |

Within each face: channels 1–24 are the legacy Face V1 props; 25–66 are
FaceV2 — tree outline, star and bow, eyes open and closed, and ten phoneme
mouths (closed, E, AI, OU, Ah, MBP, FV, L, WQ and others).

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

Because the dongles are already labelled, the **port-by-port physical
verification has not been done, and is low priority** — it is far quicker to
confirm once the props are out in the yard than to drag each one out of
storage.

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
C:\dev\light-o-rama\                          ← LOR's data folder (moved 2026-09-10)
├── Sequences\                                ← the 8 purchased sequences (all 8 present)
├── Audio\                                    ← MP3s go here. ✅ Holds the show's
│                                                song as of 2026-09-12
├── Songs\                                    ← working copies of Glen's 5 MP3s
│                                                (duplicated from C:\dev\lightcanvas\Songs)
├── CommonData\                               ← previews, palettes
├── Hardware\  Network\  Logs\  ...

C:\dev\lightcanvas\
├── AppRepo\                                  ← the code (GitHub: glentesting/lightcanvas)
├── Songs\                                    ← Glen's own music (5 MP3s)
├── LOR-6.6.12.exe                            ← installer
├── My Christmas Show 2026.loredit            ← the exported show (+ .bak)
└── Light-O-Rama – Full Setup Overview.docx

C:\dev\LightCanvas Old Stuff\                 ← archived docs, ignore
```

**Both trees moved out of `Documents\` (and out of OneDrive) on 2026-09-10.**
Keeping show software off cloud sync is the right call — sync and show
software don't mix.

✅ **S6 has been repointed.** Verified in the registry 2026-09-12:
`HKCU\Software\Light-O-Rama\Shared` now reads `C:\dev\light-o-rama\`
throughout. S6 finds its own sequences, previews, audio and hardware config.
**If the folder ever moves again, S6 must be told** — LOR Control Panel →
Settings → **"Change Light-O-Rama Folder Location"**. It will not find
anything until that is done. (An earlier version of this doc said never to
click that button; that was written when the folder was where LOR expected
it, and no longer applies.)

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
`C:\dev\light-o-rama\Audio\` under the exact filename the sequence requests.
Carol of the Bells wants: `Carol Of The Bells-Pentatonix-SN.mp3`

The same applies to the owner's own show. His project's `musicFilename` is
`Wreaths Like Horseshoes.mp3` — ✅ a copy is now in
`C:\dev\light-o-rama\Audio\` (confirmed 2026-09-12), so S6 can play it.
A sequence opens fine without its MP3; it just plays silent.

Every sequence embeds the full 265-prop RGBPlus Preview. Any one of them can
serve as an export template.

---

## 9. Not yet verified

**Read the distinction first.** This equipment ran a full season
successfully — same controllers, same props, same wiring, same Director.
Nothing below questions whether the gear works; it worked. What is being
rebuilt is the **operator knowledge**: Glen doing himself what someone else
used to do. Each item says whose unknown it is.

Ordered by risk.

1. **A LightCanvas-generated sequence has never played on this hardware.**
   This is the real remaining unknown, and it is about the software, not the
   gear. Purchased sequences ran on these controllers for a whole season. A
   file this app wrote has opened cleanly in S6 (2026-08-31) but has never
   been put on the SD card and played through the Director onto the props.
   Nothing else on this list carries as much risk as this one.
2. **CTB16 unit ID** — software-set, and **never read back by anyone**.
   `01` is what the purchased sequences expect. It was presumably correct
   last season, since the AC lights ran — but presumed-from-behaviour is not
   the same as read off the board, and it stays an assumption until someone
   reads it. Box 3 is also **the one controller Glen has not powered up**:
   deliberately skipped on 12 Sept because it appears hardwired into conduit.
   **Before he can test it safely:** work out how it is actually powered
   (truly hardwired, or is there a plug out of sight?); identify which
   breaker feeds it and confirm the controller goes dead when that breaker is
   off; ideally have someone comfortable with mains fit it with a cord and
   plug so it can be tested like the Pixie boxes. Nothing needs to be
   connected to its AC outputs just to read its ID.
3. **The ELOR network setting.** The Control Panel's Networks screen had
   **"Use Enhanced LOR (ELOR)" switched on** when first opened, with the
   Regular network on COM3 at 500K. ELOR is a faster protocol only some
   controllers support. It was left untouched during the bench test because
   the adapter was plugged straight into each controller, so network settings
   did not apply. **Before wiring the house, confirm whether these boards
   support ELOR and set it deliberately** — a controller that does not
   support it simply goes quiet, which looks identical to dead hardware.
   Genuinely untested, by anyone.
4. **The Director and the FM transmitter — Glen has not powered them up.**
   They ran the show last season, so they are not suspect equipment; he has
   simply not driven them himself yet. The 12 Sept bench test covered the two
   Pixie16 boards and the USB adapter only.
5. **Whether the Director's SD card still holds last season's show** — an
   unopened question, not a doubt about the card working.
6. **Which numbered dongle drives which physical prop** — *low priority*: the
   dongles are already band-labelled, so this is a job for deployment day in
   the yard, not the bench (§5).
7. **AC circuit naming mismatch** (§5).

Settled by the 12 Sept 2026 bench test and no longer open: both power halves
run off the single internal supply; colour order on both boards; and the face
port topology — each face spans two ports (§3, §5). Note that "whether
anything powers on at all" was never genuinely open — the display ran a full
season. What Glen settled was that he can bring it up himself.

### Glen's first bench test — RUN 12 SEPTEMBER 2026, BOTH PIXIE BOARDS PASSED

The USB485-HS arrived **August 31, 2026**; the test was run **12 September
2026**. Results are in §3 ("Controller settings — read off the hardware" and
"What the bench test proved"); the PC-side procedure that actually worked,
including the driver step nobody had anticipated, is **§11**.

The full plain-English procedure lives in **`BENCH-TEST-CHECKLIST.md`**, with
safety ordering, a smallest-load first power-up, the hex/decimal trap,
fill-in port tables, and a troubleshooting section. **Keep that file as the
working copy** for any future controller. The technical summary of the plan
that was followed:

1. Plug USB485-HS into the PC. **Windows does not supply the driver** — install
   the FTDI VCP driver first, then note the COM port (§11).
2. **Unplug the Director's network cable.** A Pixie talks to a PC *or* a
   Director, never both.
3. Confirm the internal supply label (§2), **lid closed**, then mains.
4. CAT5 from the adapter to either RJ45 on **Box 4**. One controller at a
   time — no daisy chains for this test.
5. Start with the **smallest possible load: one pixel stake (5 pixels)**,
   not a tree or an arch. This limits damage if *he* miswires something while
   learning; it is not a power-headroom question and not a doubt about the
   boards.
6. **Start → Light-O-Rama Control Panel → Controller Setup → Hardware
   Utility**, pick the COM port under *Ports to Scan*, Scan For =
   **Unit ID range**, Scan. (Menu wording confirmed on 6.6.12, 12 Sept 2026
   — full detail in §11.)
7. **Expected:** sixteen units, `09`–`18` hex / 9–24 decimal. ✅ Got exactly
   that: `Pixie16, firmware 1.10, Unit ID 09 - 18, COM3`.
8. Repeat on **Box 1** — expect `30`–`3F` hex / 48–63 decimal. ✅ Confirmed.
9. **Box 3 is deliberately deferred** — it appears hardwired into conduit and
   its unit ID has never been read back by anyone. See the checklist §10 for
   why and for what must be in place first.
10. Fire one port at a time to test. **It is the Configure → Test Pixels tab,
    not the greyed-out "Test Lights" sidebar item** — see §11. Ports 1 and 9
    were tested on each board to cover both power halves.

**Answered by the run:** both power halves do come off the single internal
supply (§2), and each singing face spans **two** ports (§3, §5). **Still
unwritten:** what the status LEDs on a Pixie16D actually mean.

---

## 10. Safety

- ⚠️ **AC mains is live inside each Pixie enclosure.** The **N** and **L**
  terminals on the right-hand end of the internal MeanWell supply carry wall
  voltage whenever the box is plugged in, and can kill. Never touch that end.
  **The order is absolute: lid open → look → lid closed → plug into the wall.**
  The box must never be open while connected to an outlet.
- **Never plug or unplug a pixel prop while a controller is powered.** Pull
  the enclosure cord from the wall first, every time. Power goes on last and
  comes off first.
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

---

## 11. Connecting a controller to a PC

This is the procedure that worked on **12 September 2026**, start to finish.
It is also how to test any controller in future.

### First time on a new PC: install the driver

Windows does **not** install a driver for the USB485-HS by itself. Without it
the adapter never becomes a COM port, and the Hardware Utility reports that no
ports were found.

1. Plug the adapter into the PC.
2. Right-click Start → **Device Manager**. With no driver, the adapter appears
   under **Other devices** as `FT232R USB UART` with a yellow warning triangle.
3. Download the **FTDI VCP driver** from
   <https://ftdichip.com/drivers/vcp-drivers/> — take the Windows **setup
   executable**, not the zip.
4. Run it, then unplug and replug the adapter.
5. Confirm a **Ports (COM & LPT)** section now exists in Device Manager with a
   **USB Serial Port** under it. It came up as **COM3** on this PC.

### Finding the Hardware Utility

It is not a separate program and does not appear in the Start menu — it lives
inside the Control Panel:

**Start → Light-O-Rama Control Panel → Controller Setup → Hardware Utility**

The Control Panel also runs in the system tray near the clock; right-clicking
that icon offers the Hardware Utility directly. **Closing the Control Panel
window does not exit it** — use **Exit** from the tray icon if you need it to
restart and re-scan for adapters.

### Scanning for a controller

1. **Cord out of the wall.** Connect CAT5 from the adapter to either RJ45 jack
   on the controller. Connect a test prop to a pigtail.
2. **Lid on. Cord into the wall.**
3. In the Hardware Utility the COM port should appear under **Ports to Scan**.
   If it says no ports were found, press the refresh icon (circle with arrow).
4. Choose **Unit ID range** under *Scan For*, and click **Scan**.
5. A working Pixie16 reports as a **single row showing its full range** — e.g.
   `Pixie16, firmware 1.10, Unit ID 09 - 18, COM3`. Sixteen units is the pass
   condition, not a fault (§3).

### Lighting a prop to test it

1. Click **Configure** next to the controller in the scan results.
2. Click the **Test Pixels** tab along the top. (The *Test Lights* item in the
   left sidebar is greyed out while the Hardware Utility holds the port —
   that is expected.)
3. Under **Select Strings to Test**, click **Select None**, then tick only the
   port you want.
4. Under **Color Cycle**, click **Select None**, then tick **one** colour. A
   single steady colour is far easier to judge than a cycle.
5. Flip **Run Test** to **On**. Flip it back off when done.

> To confirm **both power halves** of a board, test a port in each half —
> **port 1 and port 9**. Both boards passed this on 12 September 2026.
> ⚠️ **Do not use the Update Config, Change or Update buttons** on the
> Configure tab. Those write to the board, and nothing on it needs changing.
