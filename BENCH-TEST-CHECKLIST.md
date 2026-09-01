# Bench Test Checklist — First Power-Up

**For:** Glen &nbsp;·&nbsp; **Written:** August 31, 2026

**Status: NOT YET RUN.** Nothing in this document has been done. Nothing in
your show has ever been powered on.

This is the plain-English version of Section 9 of
`LIGHTCANVAS-HARDWARE-REFERENCE.md`. Everything here is either something you
do with your hands, something you click in a program, or something you look
at and tell me about. There are no commands to type and no files to open.

Print this. Take it to the table with the hardware.

---

## How to read the markings

Some of this is confirmed fact about your gear. Some of it is my best
knowledge of how Light-O-Rama equipment generally behaves, which I have not
been able to check against your actual boxes. Those are marked differently
so you always know which is which:

| Mark | Means |
|---|---|
| ✅ **CONFIRMED** | Verified on your hardware, or written in your own reference doc |
| 📖 **GENERAL LOR KNOWLEDGE** | How this equipment usually works. Educated, but not checked on your gear. If it doesn't match what you see, trust your eyes and tell me. |
| ❓ **OPEN QUESTION** | Genuinely cannot be known until you are at the bench. Not a guess — a thing to find out. |

---

## READ THIS FIRST — the four rules

If you remember nothing else from this document, remember these.

**1. The Director's network cable stays unplugged the whole time.**
A Pixie controller can listen to your computer *or* to the Director, but not
to both — if both are connected they talk over each other and the software
will not find the controller. Unplug it before you start and leave it out.

**2. Never touch the right-hand end of the power supply.**
Inside each box, underneath the green board, is a silver power supply. The
end of it with the screw terminals marked **N** and **L** carries full wall
voltage any time the box is plugged in. It can kill you. You never need to
touch it, adjust it, or connect anything to it during this test.

**3. Lid closed before the plug goes in the wall. Always.**
Open the lid → look → close the lid → *then* plug in. Never the other way
round. The box should never be open while it is connected to a wall outlet.

**4. Never plug or unplug a light prop while the box is powered.**
Pull the box's cord out of the wall first, every single time. Connecting
pixels to a live controller is the most common way people destroy a port.

---

## 1. What to put on the table before you start

Gather all of this first, so you are not walking around mid-test.

**Hardware**

- [ ] **Box 4** — the Pixie16D that runs your trees, arches and stakes
- [ ] **Box 1** — the Pixie16D that runs your four singing faces
- [ ] **The USB485-HS adapter** (the one that just arrived)
- [ ] **One network cable** — a standard patch cable with the square clip-in
      plugs, the kind that looks like an internet cable. One end goes into
      the adapter, the other into either socket on the controller.
      ✅ Your reference doc calls this CAT5. Any ordinary network patch cable
      of that type will do for a bench test.
- [ ] **One pixel stake** — a single stake, 5 pixels. This is your test prop.
      Not a mini tree. Not an arch. Just one stake. (Section 6 explains why.)
- [ ] **Your PC**, with Light-O-Rama already installed
- [ ] **Your phone**, for photos
- [ ] **This printout and a pen**

**You do NOT need to gather any power supplies.** ✅ Each box has its own
power supply mounted inside it, directly beneath the green board:

> **MeanWell RSP-500-12**
> Input: 100–240V AC · Output: 12V / 41.7A (500W)
> Red wire from **+V** to the board's **V+**
> Black wire from **−V** to the board's negative
> AC mains arrives on the **N** and **L** terminals on the supply's
> right-hand side

Both boxes are identical in this respect. Each one is completely
self-contained. **Powering a box up means plugging its cord into a wall
outlet — that is the whole operation.** Nothing inside the box needs to be
touched, adjusted, wired or connected by you at any point.

The voltage question is settled: 12V supply, 12V pixels, correct match.
41.7 amps is far more capacity than this test will ever draw. Nothing needs
to be bought.

### The program you will be using

**The Light-O-Rama Hardware Utility.**

📖 **GENERAL LOR KNOWLEDGE** — two ways to find it:

- Look at the bottom-right of your screen near the clock for a small
  Light-O-Rama icon. It may be hidden behind a small **^** arrow — click
  that to show hidden icons. Right-click the LOR icon and look for
  **Hardware Utility** in the menu.
- Or click Start, type `Light-O-Rama`, and look for **Light-O-Rama Hardware
  Utility** in the results.

❓ **OPEN QUESTION** — your reference doc describes a slightly different
route (Control Panel → Networks, then Control Panel → Controller Setup).
Version 6.6.12 may name these menus differently from what I expect. **Do not
hunt for exact wording.** Open whichever of these you can find, take a photo
of what you see, and tell me. I will guide you from your actual screen
rather than from a guess.

### Does the adapter need a driver?

📖 **GENERAL LOR KNOWLEDGE.** The USB485-HS uses a common USB-to-serial chip.
Windows 11 normally installs the driver by itself within a minute of you
plugging it in.

**How you will know it worked:** when you open the Hardware Utility, there is
a list or dropdown of **COM ports**. Plug the adapter in, then open that list.
If a COM port is there that was not there before (COM3, COM4, COM5 — the
number does not matter), the driver installed and you are fine.

**If no COM port appears:**

1. Unplug the adapter, wait ten seconds, plug it into a *different* USB
   socket on the PC. Give it a minute.
2. If still nothing — **stop and tell me.** The fix involves running the
   Light-O-Rama driver installer, and I would rather walk you through that
   step by step than have you guess at it.

*(Optional, only if you are curious: right-click the Start button → Device
Manager → expand **Ports (COM & LPT)**. The adapter shows up there as a USB
Serial Port with its COM number. You do not need to do this — the Hardware
Utility's own list is enough.)*

---

## 2. AC mains safety — read before you open anything

The AC mains wiring is **inside** each enclosure. It is already connected,
by the previous owner, to the power supply's **N** and **L** screw terminals
on the supply's **right-hand side**.

> ### ⚠️ Never touch the right-hand side of the power supply.
>
> Never touch those terminals. Never touch the wires going into them. Never
> put a screwdriver, a finger, or anything else near them. **They carry wall
> voltage whenever the box is plugged in, and they can kill you.**
>
> **There is no reason to touch them at any point in this test.** Nothing in
> this checklist asks you to.

**What "powering up" actually means:** you plug the enclosure's cord into a
wall outlet. That is it. That is the entire operation. You do not open
anything, connect anything, or adjust anything inside the box to power it on.

**What "powering down" means:** you pull that cord out of the wall.

If you ever find yourself thinking "I need to get at something inside the box
while it's plugged in" — stop. Pull the cord out of the wall first. There is
no exception to this.

---

## 3. The Director must be disconnected — do this before anything else

✅ **CONFIRMED** (your reference doc, §4).

**A Pixie controller can talk to your computer, or to the Director, but never
to both at the same time.** If both are connected, they interrupt each other
and the software will simply not find your controller.

**Do this now:**

- [ ] Find the network cable that runs from **Box 2** (the G4-MP3 Director,
      the box with the SD card and the FM transmitter) to your controllers.
- [ ] Unplug it from the controllers.
- [ ] Set it aside, out of the way, so you cannot absent-mindedly plug it
      back in mid-test.
- [ ] Leave it unplugged for the entire duration of this test.

If the software later finds nothing at all, this is the first thing to
re-check.

---

## 4. Check the label, close the lid, then plug in — in that exact order

This is a **look-only** step. You are confirming that both boxes really do
contain the same power supply, so that nothing later comes as a surprise.

**Do this for Box 4 first, then repeat for Box 1.**

- [ ] **Step 1 — Confirm the cord is OUT of the wall.** Look at the plug end
      with your own eyes. Do not assume.
- [ ] **Step 2 — Open the lid.**
- [ ] **Step 3 — Look at the silver box mounted underneath the green
      board.** Read the label on it. You are looking for:
      **MeanWell RSP-500-12**, with an output of **12V**.
- [ ] **Step 4 — Take a photo of the label.** Do not touch anything. Keep
      your hands out. This step is your eyes only.
- [ ] **Step 5 — Close the lid.**
- [ ] **Step 6 — Only now may the cord go into a wall outlet.**

> **The sequence is: lid open → look → lid closed → plug in.**
> Never the reverse. The box must never be open while plugged into the wall.

If either label reads something other than 12V, **stop and tell me** before
going any further. (I do not expect this — both supplies have already been
identified and confirmed correct. This is a two-minute visual double-check to
catch the one case that would matter: the two boxes not actually being
identical.)

---

## 5. Order of operations, and the things that break hardware

### The order, every time

**To set up or change anything:**

1. Enclosure cord **out of the wall**.
2. Connect (or disconnect) the pixel prop at the controller port.
3. Connect the network cable from the adapter to the controller.
4. Plug the USB adapter into the PC.
5. **Close the lid.**
6. **Plug the enclosure cord into the wall — last.**

**To change anything afterwards:** pull the cord out of the wall *first*,
count to five, and only then unplug or move anything else.

The rule in one line: **power goes on last and comes off first.**

### Never do these

- ❌ **Never plug or unplug a light prop while the box is powered.**
  ✅ This is the single most likely way to destroy a controller port or the
  first pixel in a string. Cord out of the wall, every time.
- ❌ **Never plug the LOR network cable into your PC's internet socket, a
  router, or a network switch.** ✅ Your reference doc is emphatic about
  this: the plug is identical but the signal is not. It can damage the
  adapter or the controller.
- ❌ **Never open the lid while the cord is in the wall.**
- ❌ **Never change a DIP switch while the box is powered.** ✅ And you do not
  need to — both Pixie boards are already set correctly. Do not touch the DIP
  switches at all.
- ❌ **Never force a connector.** If a pixel plug does not go in easily, it is
  the wrong way round or the wrong plug. Reversed polarity destroys pixels
  instantly.

---

## 6. First power-up uses the smallest possible load — one stake

For the very first power-on, connect **a single pixel stake — 5 pixels**.
Not a mini tree (100 pixels). Not an arch (25).

**Why:** if a connection is wrong somewhere, you would far rather find that
out with 5 pixels on the line than with 100. The supply has plenty of
capacity — 41.7 amps is enormous for this — so **this is not about running
out of power. It is purely about limiting the damage if something is
miswired.**

Once a stake lights correctly on a port, the board and that port are proven,
and you can move on to bigger props with confidence.

- [ ] Cord out of the wall.
- [ ] Connect **one pixel stake to Port 1** of Box 4.
- [ ] Leave every other port empty for now.

❓ **OPEN QUESTION — worth knowing before you start.** A Pixie16 board has
sixteen ports arranged in two halves, ports 1–8 and ports 9–16, and each half
can be fed power separately. Your supply has a single red wire and a single
black wire going to the board. **I cannot tell from here whether that one
pair feeds both halves, or only one half.** If ports 1–8 light up but 9–16
stay dark (or the other way round), that is almost certainly the reason and
it is not a fault you caused — **stop and tell me** and we will sort it out.
This is why the first test uses Port 1, and why it is worth testing a port in
the 9–16 half before you assume the whole board is good.

---

## 7. Test Box 4 on its own — expected base unit ID 09

✅ Box 4 is the Pixie16D that runs your **mini trees, arches and stakes**.
Its DIP switches are set to base unit **09**, and were visually confirmed in
August 2026. Do not change them.

**Plug the adapter straight into this box. No daisy chains. One controller at
a time for this entire test.**

### ⚠️ Sixteen unit IDs is CORRECT. It is not a fault.

✅ **CONFIRMED** (your reference doc, §3). A Pixie16 board occupies **sixteen
consecutive unit IDs — one per port** — counting upward from whatever the DIP
switches are set to.

So when the software shows you a wall of sixteen entries, **that is the
board working properly.** Do not think it is broken, or duplicated, or that
you have somehow connected it wrong. Sixteen is the right answer.

### ⚠️ These numbers are hexadecimal — and your software may show decimal

✅ LOR unit IDs are **hexadecimal**. That is a counting system that runs
0–9 and then uses the letters A, B, C, D, E, F before rolling over. It is why
Box 1's range runs 30, 31 … 39, **3A, 3B, 3C, 3D, 3E, 3F** rather than
30 through 45.

📖 **GENERAL LOR KNOWLEDGE** — the Hardware Utility has a display setting that
can show unit IDs in **decimal** (ordinary counting) instead. The very same
board will then show completely different-looking numbers. **Both are
correct. Neither means your hardware is misconfigured.**

**Box 4 — match whichever of these you see:**

| If the software is showing… | Box 4's sixteen units read |
|---|---|
| **Hexadecimal** | `09, 0A, 0B, 0C, 0D, 0E, 0F, 10, 11, 12, 13, 14, 15, 16, 17, 18` |
| **Decimal** | `9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24` |

> **The easy tell: if you see any letters, it's hexadecimal.** A `0A` or a
> `3F` can only be hex. If every entry is digits only and the last one is
> `24`, it's decimal.

📖 To check or change the setting, look in the Hardware Utility for an option
worded something like **"Show unit IDs in hexadecimal"**, or a **Hex /
Decimal** toggle, usually in a Preferences, Options or Settings menu.
**Do not spend time hunting for it.** Just tell me the numbers you see and
whether there were any letters among them — that alone tells me which mode
you are in.

### The steps

- [ ] Label checked, lid closed (Section 4). ✔
- [ ] Director's cable unplugged (Section 3). ✔
- [ ] One pixel stake on Port 1, box unplugged from the wall (Section 6). ✔
- [ ] Network cable from the **USB485-HS adapter** to **either** network
      socket on Box 4. ✅ Either socket works — they are a matched pair.
- [ ] Plug the **USB adapter into the PC**.
- [ ] **Now plug the enclosure's cord into a wall outlet.**

**What you should see on the box itself:**

📖 **GENERAL LOR KNOWLEDGE** — expect at least one small indicator light to
come on somewhere on the green board, and the power supply usually has a
small green light of its own. On LOR controllers a status light commonly
blinks slowly when powered but not receiving data, and changes to a faster or
different pattern once the software starts talking to it.

❓ I do not know the exact blink codes for a Pixie16D. **Do not try to
interpret them.** Just write down what you actually see — how many lights,
what colours, steady or blinking — and tell me. If the board is completely
dark with the cord in the wall, stop there and say so.

**Now find it in software:**

- [ ] Open the **Hardware Utility**.
- [ ] Select the **COM port** for the adapter.
- [ ] 📖 If there is a setting for the **highest unit ID to search**, set it
      to at least **64**. That covers both of your boxes. If it is left too
      low, the software will stop searching before it reaches Box 1's range
      and will appear to find nothing.
- [ ] Click **Refresh** (it may be called Search, Scan, or Auto Configure).

**PASS looks like:** sixteen units, starting at `09` and ending at `18`
(hex), or starting at `9` and ending at `24` (decimal).

📖 One honest caveat: some versions of the Hardware Utility summarise a Pixie
as a *single* entry that identifies it as a Pixie16 with a base of 09 and
notes that it occupies sixteen ports. **That is also a pass.** If you get one
entry, read it carefully — if it mentions "Pixie16" or "16 ports" or shows a
range, tell me the exact wording rather than assuming it failed.

**FAIL looks like:**

- Nothing found at all.
- A range that starts at the wrong number — anything other than `09`/`9`.
- A single entry with no mention of a Pixie16, no range, and no sixteen
  ports.
- Fewer than sixteen units, in a version that lists them individually.

Whichever you get, write it down exactly and photograph the screen.

### Light the stake

Once the unit IDs read back correctly:

- [ ] Go to the **Test Lights** section of the Hardware Utility.
- [ ] 📖 Choose the controller/unit for **Port 1** — that is unit `09` (hex)
      or `9` (decimal) — pick a colour, and turn the test on.
- [ ] **Expected: the 5 pixels on your stake light up in the colour you
      chose.**

📖 The exact controls in Test Lights vary by version — you generally pick a
unit, a channel range or "all channels", and a mode such as a fixed colour or
a slow chase. If the layout does not match what I have described, photograph
it and I will talk you through your actual screen.

**If the pixels light but the colour is wrong** (you asked for red and got
green, say) — 📖 that is a colour-order setting, not a fault. Pixels come in
RGB and GRB varieties. Note it down and carry on; it is fixed in software
later, and it does not mean anything is damaged.

---

## 8. Test Box 1 on its own — expected base unit ID 30

✅ Box 1 is the Pixie16D that runs your four **singing tree faces** (Elden,
Felix, Ralphie, Zuzu). Its DIP switches are set to base unit **30**, visually
confirmed in August 2026. Do not change them.

- [ ] **Unplug Box 4 from the wall first.** Then move the adapter's network
      cable over to Box 1. One controller at a time.
- [ ] Do the **label check** on Box 1 (Section 4) if you have not already:
      lid open → look → lid closed → plug in.
- [ ] Use the **same single pixel stake** as your test prop on **Port 1**.
      Do not connect the faces yet — smallest load first, same reasoning as
      before.
- [ ] Network cable from the adapter to either socket on Box 1.
- [ ] **Then** plug Box 1 into the wall.
- [ ] Refresh in the Hardware Utility.

Sixteen unit IDs again — same rule, same reason.

**Box 1 — match whichever of these you see:**

| If the software is showing… | Box 1's sixteen units read |
|---|---|
| **Hexadecimal** | `30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 3A, 3B, 3C, 3D, 3E, 3F` |
| **Decimal** | `48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63` |

**PASS:** sixteen units, `30` through `3F` (hex) or `48` through `63`
(decimal).

**FAIL:** nothing found; a range starting at any number other than
`30`/`48`; or fewer than sixteen with no Pixie16 summary entry.

### While you are here — one mystery to solve

❓ **OPEN QUESTION** carried over from your reference doc (§5). Your four
faces are recorded as living on units `30`, `32`, `34`, `36` — the doc notes
that this **skips** `31`, `33`, `35`, `37` and nobody knows why.

Working out the port numbers from the base gives this prediction:

| Port | Unit (hex / dec) | Expected |
|---|---|---|
| 1 | `30` / 48 | Elden |
| 2 | `31` / 49 | **unknown — possibly the second half of Elden** |
| 3 | `32` / 50 | Felix |
| 4 | `33` / 51 | **unknown — possibly the second half of Felix** |
| 5 | `34` / 52 | Ralphie |
| 6 | `35` / 53 | **unknown — possibly the second half of Ralphie** |
| 7 | `36` / 54 | Zuzu |
| 8 | `37` / 55 | **unknown — possibly the second half of Zuzu** |

**The likely answer** is that each face spans two ports. If, when you
eventually connect a face and run Test Lights, unit `30` lights part of Elden
and unit `31` lights the rest of him, that confirms it. Note down what you
see — this would close a real open question in the documentation.

This is a "when you get to it" item, not required for today's pass/fail.

---

## 9. Which prop is on which port

Do this **after** both boxes have passed their unit ID readback. It is the
slow, satisfying part: proving that the map in your reference doc is actually
true of your physical gear.

**How it works:** connect one prop, run Test Lights on that port's unit ID,
walk over and see what lit up, write it down. Then power down, move to the
next prop.

**Remember: cord out of the wall every time you change a prop.**

✅ The **claimed** mapping below comes straight out of
`LIGHTCANVAS-HARDWARE-REFERENCE.md` §5. You are confirming a prediction, not
inventing data — so if reality disagrees, that is a genuine finding worth
reporting.

✅ Your prop dongles are **numbered with white bands**. Do not remove them —
they are the only surviving record of the port-to-prop wiring. Photograph the
full set.

### Box 4 — fill this in by hand

```
PORT | UNIT ID     | REFERENCE DOC SAYS         | WHAT LIT UP        | OK?
     | hex / dec   |                            | (write it in)      | Y/N
-----+-------------+----------------------------+--------------------+----
 1   | 09 / 9      | Mini Tree 01 (base+star)   |                    |
 2   | 0A / 10     | Mini Tree 02               |                    |
 3   | 0B / 11     | Mini Tree 03               |                    |
 4   | 0C / 12     | Mini Tree 04               |                    |
 5   | 0D / 13     | Mini Tree 05               |                    |
 6   | 0E / 14     | Mini Tree 06               |                    |
 7   | 0F / 15     | Mini Tree 07               |                    |
 8   | 10 / 16     | Mini Tree 08               |                    |
 9   | 11 / 17     | Arch 01 + Arch 02          |                    |
 10  | 12 / 18     | Arch 03 + Arch 04          |                    |
 11  | 13 / 19     | Arch 05 + Arch 06          |                    |
 12  | 14 / 20     | Arch 07 + Arch 08          |                    |
 13  | 15 / 21     | Pixel Stakes 01-10         |                    |
 14  | 16 / 22     | Pixel Stakes 11-20         |                    |
 15  | 17 / 23     | Pixel Stakes 21-30         |                    |
 16  | 18 / 24     | Pixel Stakes 31-40         |                    |
```

Two notes on this table:

- ✅ **Ports 9–12 each drive two arches**, and **ports 13–16 each drive a
  chain of ten stakes.** So on port 13, a single stake plugged in on its own
  will light as the *first* stake of that chain. That is expected, not a
  fault.
- **Ports 9–16 are the second half of the board.** See the open question in
  Section 6 — if the whole of 9–16 is dead while 1–8 works, that is a power
  question, not sixteen broken ports.

### Box 1 — fill this in by hand

```
PORT | UNIT ID     | REFERENCE DOC SAYS         | WHAT LIT UP        | OK?
     | hex / dec   |                            | (write it in)      | Y/N
-----+-------------+----------------------------+--------------------+----
 1   | 30 / 48     | Elden                      |                    |
 2   | 31 / 49     | (unknown - see Section 8)  |                    |
 3   | 32 / 50     | Felix                      |                    |
 4   | 33 / 51     | (unknown - see Section 8)  |                    |
 5   | 34 / 52     | Ralphie                    |                    |
 6   | 35 / 53     | (unknown - see Section 8)  |                    |
 7   | 36 / 54     | Zuzu                       |                    |
 8   | 37 / 55     | (unknown - see Section 8)  |                    |
```

---

## 10. The CTB16PCG3 (Box 3) — deliberately NOT part of today's test

**Do not bench test Box 3 today.** This is a deliberate decision, not an
oversight. Two solid reasons:

**1. It appears to be hardwired into conduit rather than plugged in.**
Bench testing it would mean either dismounting it from the wall, or working
right next to live AC mains. Neither is a sensible thing to do on the first
day you have ever powered any of this equipment on. There is no upside to
rushing it.

**2. Its unit ID has never been confirmed.** ✅ Unlike the two Pixie boxes,
this controller's unit ID is **not set by DIP switches** — it is set in
software. Your reference doc lists it as `01`, but that is what your
*sequences expect*, not something anyone has ever read back off the
hardware. It is a prediction, not a known value.

### What happens if it eventually reads back something other than 01

**My recommendation: change the controller's unit ID to `01`. Do not change
your sequences.**

That is the clear answer, and here is why it is not close:

- **Changing the controller** is one setting, changed once, in the Hardware
  Utility. Five minutes. And `01` does not collide with anything else on that
  network — ✅ the only other device on Net 1 is Box 1, which occupies
  `30`–`3F`, nowhere near `01`.
- **Changing your sequences** would mean editing the embedded Preview inside
  all **eight purchased sequences** — 265 props each — plus the export
  mapping inside LightCanvas. That is hours of fiddly work on paid content
  you cannot easily re-download in modified form, with real risk of breaking
  something that currently works.

So: make the hardware match the sequences. Not the other way round.

⚠️ When the time comes, do that with **only that controller connected** to
the adapter, so there is no chance of reassigning the wrong device. And tell
me before you do it — I will walk you through it.

### What needs to be in place before Box 3 can be tested safely

This is what turns it from a vague worry into a clean, bookable job:

- [ ] **Work out how it is actually powered.** Is it truly hardwired into
      conduit, or is there a plug somewhere out of sight? A photo of how it
      is mounted and where its power enters would let me tell you.
- [ ] **Identify which breaker feeds it**, and confirm you can switch that
      breaker off and verify the controller is dead before anything is
      touched.
- [ ] **Decide on the approach**: either have someone comfortable with mains
      wiring fit it with a cord and plug so it can be tested like the Pixie
      boxes, or test it in place with the breaker controlled. I would lean
      toward the first — it makes every future test safe and easy.
- [ ] **A network cable route** from wherever your PC and adapter are to
      wherever the controller lives.
- [ ] **Nothing connected to its AC outputs** for the first read, or at most
      one known lamp. Reading a unit ID needs the controller powered but
      needs no lights attached at all.

❓ **OPEN QUESTION** — I do not know how Box 3 is physically mounted or fed.
Everything above is written from your description that it appears hardwired.
Send me photos and I will make this concrete.

---

## 11. When something doesn't work

For each of these: the likely cause in plain English, and **the one thing to
try.** Where the honest answer is "stop and tell me," it says so — I would
rather you stop than go down a rabbit hole and change five things at once.

### The adapter doesn't show up as a COM port

**Likely:** Windows hasn't installed the driver yet.
**Try one thing:** unplug it, wait ten seconds, plug it into a different USB
socket, wait a full minute, then re-open the Hardware Utility's port list.
**If still nothing → stop and tell me.** The next step is running LOR's driver
installer, and I will walk you through it.

### The software finds nothing at all

**Likely, in this order:** the Director's cable is still connected; the box
isn't actually powered; the wrong COM port is selected; the search range is
set too low to reach your unit numbers.
**Try one thing:** check the Director's cable is genuinely unplugged — this is
the most common cause and ✅ your own reference doc flags it. Then confirm the
box has a light on it and the COM port is the right one.
**Still nothing → stop and tell me** what you see, including the COM port and
any lights on the board.

### A wrong unit ID reads back

**Likely:** you are looking at decimal when you expect hex, or the other way
round. **Check that before anything else** — `9` through `24` and `09`
through `18` are the same board (Section 7).
**If the numbers genuinely start somewhere else** — not `09`/`9` for Box 4,
not `30`/`48` for Box 1 — **stop and tell me the exact numbers.**
❌ **Do not change the DIP switches.** ✅ Both boards were confirmed correct in
August 2026, so an unexpected number means something else is going on and I
want to see it first.

### Only one unit ID shows instead of sixteen

**Likely:** your version of the Hardware Utility is summarising the board as
a single Pixie16 entry rather than listing all sixteen — 📖 which is normal
behaviour in some versions and **not a fault**.
**Try one thing:** read that single entry carefully. If it says "Pixie16", or
mentions sixteen ports, or shows a range, you have passed.
**If it is just one bare unit number with nothing else → tell me**, with a
photo of the screen.

### The controller powers up but no pixels light

**Likely:** the prop is plugged into a different port from the unit you are
testing; or the test is running on the wrong unit ID; or the prop is not
seated properly.
**Try one thing:** confirm the stake is in **Port 1** and that you are testing
**unit 09** (Box 4) or **unit 30** (Box 1) — the first port's unit is the same
as the board's base number.
**If the port and unit match and it is still dark → power down (cord out of
the wall first) and tell me.** Do not start swapping props between ports
while powered.

### Only some pixels light

**Likely:** a break in the string, or a bad connection partway along.
**Try one thing:** note exactly **how many** pixels lit before it stopped —
that number tells me where the break is.
Then **tell me.** With a 5-pixel stake this is quick to diagnose and worth
getting right before you connect anything larger.

### Pixels light in the wrong colours

**Likely:** 📖 a colour-order setting. Pixels come in RGB and GRB orders, and
the controller has to be told which. Asking for red and getting green is the
classic sign.
**Try one thing:** nothing physical — **this is not a fault and nothing is
damaged.** Note which colour you asked for and which you got, and tell me. It
is a software setting, fixed later.

### Ports 1–8 work but 9–16 don't (or the reverse)

**Likely:** ❓ the power-bank question from Section 6 — only one half of the
board may be fed by the internal supply.
**Try one thing:** nothing. **Stop and tell me**, noting exactly which ports
worked and which didn't. This one needs a look inside the box with the cord
out of the wall, and I want to see photos before you do anything.

### Anything smells hot, makes a noise, or gets warm fast

**Pull the cord out of the wall immediately.** Then tell me. Do not power it
back on to "check again."

---

## 12. What to report back to me

Keep it simple. These five things:

1. **The unit ID ranges that read back** for each box — and crucially,
   **whether the software was showing hex or decimal.** (Remember the tell:
   if you saw any letters, it was hex.) Just write down the first number and
   the last number you saw for each box.

2. **The filled-in port tables** from Section 9 — even partially filled is
   useful. The "what actually lit up" column is the valuable part.

3. **What the lights on each board did** — how many, what colour, steady or
   blinking, before and after the software connected. I did not want to guess
   at these, so your description is the real data.

4. **Photos of anything that looked wrong or confusing** — the Hardware
   Utility screen, the board, the power supply labels, how Box 3 is mounted.
   Photos of screens are more useful than descriptions of screens.

5. **Anything from the "stop and tell me" list** that you hit, and what you
   had done immediately before it.

---

## Open questions I could not answer from here

Listed honestly, so you know what is genuinely unknown rather than
under-explained:

- ❓ **Whether the internal supply feeds both halves of the Pixie board** or
  only one. Affects whether ports 9–16 work. (Section 6.)
- ❓ **The exact menu wording in Hardware Utility 6.6.12** — where the COM
  port is chosen, where the hex/decimal setting lives, and what the Test
  Lights controls look like. Your reference doc and my knowledge describe
  slightly different routes. Photos of your actual screen will settle it.
- ❓ **What the status LEDs on a Pixie16D mean** — how many there are, their
  colours, and their blink patterns. I know LOR boards generally have a
  status light; I do not know this board's specific codes.
- ❓ **How Box 3 (the CTB16PCG3) is physically mounted and powered**, and
  therefore what a safe test setup for it looks like. (Section 10.)
- ❓ **Whether each singing face spans one port or two** — the `31`/`33`/`35`/
  `37` gap. (Section 8.)

None of these block today's test. All of them get easier the moment you send
me what you actually see.
