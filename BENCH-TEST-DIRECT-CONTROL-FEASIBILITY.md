# Could LightCanvas talk to the controllers directly? — Feasibility

**Date:** September 7, 2026
**Question:** instead of you driving the LOR Hardware Utility by hand, could
the app open the USB485-HS adapter itself and run the bench test?
**Answer up front: technically part-way possible, and not worth doing before
the season. Recommendation at the bottom. Nothing was built.**

How to read this: claims below are my knowledge of these technologies, not
things tested on your hardware or verified in code this session. Where a
claim is genuinely uncertain, it says so.

---

## 1. Can a browser open the adapter at all?

**Yes, most likely.** Chrome (and Edge) on Windows have a feature called Web
Serial that lets a web page open a serial port, and your USB485-HS shows up
to Windows as exactly that — a COM port. The app already runs on
`localhost`, which qualifies for the feature.

What it would require of you:

- Use **Chrome or Edge** for that page (Firefox doesn't support it).
- Click one **permission box** choosing the port, each session.
- **Close the Hardware Utility first** — a COM port can only be held by one
  program at a time. The app and the Utility could never be used together.

One honest caveat: LOR's high-speed network runs at an unusual speed
(500,000 bits per second), and I have not verified that this exact
adapter-plus-browser combination handles that speed cleanly. And here's the
deeper version of that problem: **we have never read back what speed your
controllers are actually configured for.** The reference doc assumes
high-speed. If that assumption is wrong, a homemade tool would just get
silence and we wouldn't know why.

So: opening the port is the easy 10%. The other 90% is what to say down it.

## 2. What is actually known about the wire protocol?

This is where your understanding is **correct**, and the distinction you
drew is the right one:

**"Send a colour to a known unit and port" — partially documented, buyable
with effort.** LOR has never published its protocol, but hobbyists have
reverse-engineered the command format well enough that xLights (the big
open-source sequencer) ships a working LOR output mode, including for Pixie
controllers. That means a known-good open-source implementation exists to
learn from. Porting it into LightCanvas is real work — framing bytes, unit
addressing, the enhanced-network variant the Pixies use — but it's work with
a reference answer.

**"Discover which units are out there" — much harder, and much less
documented. You are right.** What the Hardware Utility does when it scans —
query a unit, get back its type, firmware, configuration — is essentially
undocumented outside LOR. xLights doesn't do it; no meaningful open-source
implementation exists that I know of. Building it would mean blind
reverse-engineering against your own controllers, with your own controllers
as the guinea pigs. Worse: the same command family that *reads* controller
configuration also *writes* it (that's how a CTB16's unit ID gets set in
software). Sending half-understood commands at hardware your season depends
on is exactly the kind of risk this project doesn't need.

## 3. What could realistically be built, and what could not

**Could be built:** a "Test Lights inside LightCanvas" page — you pick a
box, a port, a colour; the app blasts that command out the adapter and the
prop lights. Send-only, no listening. That would partially substitute for
the readback test in a sneaky way: if you tell unit 09 to turn red and the
stake turns red, unit 09 provably exists at that address.

**But here's the catch that undercuts it:** send-only can't tell you *why*
nothing happened. Silence could mean wrong speed, wrong protocol variant,
wrong unit number, a dead board, or a bug in my brand-new code — all
identical from the outside. The Hardware Utility can tell those apart. On a
first-ever power-up, when nothing is trusted yet, an ambiguous tool is the
worst tool. You'd be debugging my protocol code and your hardware at the
same time, and neither of us could tell which one was broken.

**Could not be built this season:** discovery, unit readback, CTB16 unit ID
confirmation — the actual point of the bench test.

## 4. Size

- Send-only test lights: **3–7 days**, and I'd call **half of it genuinely
  uncertain** — the uncertain half being the enhanced-network protocol
  details and the 500k speed through Web Serial, which can only be debugged
  with the hardware on your bench, over many slow round-trips of "run this,
  tell me what happened."
- Discovery/readback: **weeks, outcome not guaranteed**, with a nonzero risk
  of misconfiguring a controller along the way.

## 5. Recommendation

**Not worth it. Don't build any of it before the season.**

- You have a hard deadline, and the Hardware Utility already does 100% of
  this job today — including the parts that cannot realistically be rebuilt.
- The first power-up should use the most boring, most proven tool available,
  because its whole purpose is to isolate hardware questions. Adding a
  homemade protocol stack on top would mean two unknowns stacked on each
  other.
- The guided walkthrough built this session removes the actual pain — the
  745-line document — while keeping the proven tool in the loop.

If, in the off-season, you want the app to light props directly (it would be
genuinely pleasant — click a prop in LightCanvas, watch it light in the
yard), the smallest useful version is the send-only test-lights page,
Chrome-only, built by porting xLights' LOR output code. That's a
January project. It is not a September one.
