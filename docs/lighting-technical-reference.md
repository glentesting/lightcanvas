# Lighting Technical Reference

Foundational technical reference for how Christmas light show software works under the hood. This is reference material, not a tutorial — structured for lookup during implementation.

---

## The Authoring vs Playback Split

The single most important concept in this ecosystem: **design software and playback software are different things.**

- **Authoring** (xLights, LOR, LightCanvas): Where you design layout, place effects, sync to music, and compile a binary playback file. Runs on a PC or in the browser.
- **Playback** (FPP, xSchedule): Where the compiled file actually runs the show. Lives on a Raspberry Pi or dedicated controller outside, runs at microsecond precision, no OS distractions.

A laptop running Windows Update mid-show will desync the music from the lights by hundreds of milliseconds. That's why nobody runs shows directly from a sequencer. The sequencer compiles a file; FPP plays it.

**LightCanvas's lane:** be the authoring tool that exports to FPP. We don't replace FPP. FPP is open-source, ultra-stable, and universally adopted in this community.

---

## Hardware Stack

### Light Types

- **Dumb AC/DC lights** — Old-school single-color strings. Entire string acts as one unit. One channel per string for brightness. Controlled by AC dimmer boxes (classic LOR controllers).
- **Intelligent pixels** — Each bulb has a tiny chip (WS2811 is the most common). Each bulb can be a different color. Three channels per pixel: R, G, B. Some are RGBW (4 channels).

### Controllers (the translators)

Controllers receive network data from the player and convert it to the serial protocol pixels understand.

- **Falcon (F16v4, F48)** — High-end, reliable, 16–48 ports, full HTTP API, used in serious displays.
- **Kulp** — Open-source, BeagleBone-based, runs FPP locally on the same unit that drives pixels.
- **WLED (ESP8266/ESP32)** — Cheap, Wi-Fi, JSON API, dominant for small displays and permanent roofline installs.
- **LOR controllers** — Legacy, RS-485 serial, designed for AC lights, daisy-chained over RJ45.

### Players

- **FPP (Falcon Player)** — Runs on Raspberry Pi, BeagleBone, or directly on Kulp. Reads .fseq files and streams to controllers via E1.31 or DDP. The de facto standard.
- **xSchedule** — PC-based playback (Windows). Less common for serious displays.

---

## Network Protocols

### E1.31 / sACN

Industry standard, originally for theatrical stage lighting. Wraps DMX-512 packets in UDP network packets.

- Data is segmented into **universes**, each holding exactly **512 channels**.
- ~170 pixels max per universe (512 ÷ 3 for RGB).
- High overhead: requires universe headers, forces arbitrary segmentation of contiguous pixel strings.
- Supports multicast (easy setup, saturates Wi-Fi) or unicast (efficient, requires static IPs).

### DDP (Distributed Display Protocol)

Modern protocol designed specifically for pixel control.

- Sends raw pixel data directly to an IP address. No universes, no DMX baggage.
- Much smaller packets, lower controller overhead.
- Preferred for modern pixel-heavy setups.
- **LightCanvas should default to DDP** where the target controller supports it — hides universe math from the user entirely.

---

## Channel and Universe Math

### Channel counts

- 1 dumb light = 1 channel
- 1 RGB pixel = 3 channels
- 1 RGBW pixel = 4 channels

### Universe math (E1.31 only)

Universes needed = `ceil(total_channels / 512)`

Example: A megatree with 16 strings × 50 pixels = 800 pixels = 2,400 channels = 5 universes (ceil(2400/512)).

### Data volume

At 40 FPS for a 3-minute song with 10,000 pixels:

- Total frames: 180s × 40 = 7,200 frames
- Bytes per frame: 10,000 × 3 = 30,000
- Total: 216 MB of raw channel data

This is why .fseq files are binary and often compressed.

---

## File Formats

### Design files (the "recipe")

| Format | Tool | What it is |
|--------|------|------------|
| `.xsq` | xLights | XML — sequence definition (timing, effects, model refs) |
| `xlights_rgbeffects.xml` | xLights | XML — layout, models, controller mappings (the blueprint) |
| `.lms` / `.las` | LOR S4 | XML — musical / animation sequence with embedded controller defs |
| `.loredit` | LOR S5 | Bundled sequence + preview (non-portable, harder to interop) |
| `.sup` | LOR SuperStar | XML — pixel effects, can export to xLights |

Design files are not playable on their own. They have to be rendered into a binary playback file.

### Playback file: FSEQ

`.fseq` is the universal compiled playback format. FPP reads this and streams it to controllers frame by frame.

**FSEQ v2 binary header (the export target):**

| Byte offset | Type | Description |
|-------------|------|-------------|
| 0–3 | 4-byte string | Magic identifier: `PSEQ` |
| 4–5 | uint16 LE | Channel data offset (where frame data begins) |
| 6 | uint8 | Minor version (typically 0) |
| 7 | uint8 | Major version (typically 2) |
| 10–13 | uint32 LE | Channel count per frame |
| 14–17 | uint32 LE | Total frame count |
| 18 | uint8 | Step time in milliseconds (25 or 50) |
| 20 | uint8 | Compression: 0=none, 1=zstd, 2=zlib |

**FSEQ versions:**

- **V1** — Legacy, uncompressed, large files. Required by some old LOR controllers. Locked to 50/25/20 ms frame timing.
- **V2 Uncompressed** — Larger but compatible with broader playback (e.g., Tesla light shows).
- **V2 zstd / V2 zlib** — Compressed. Smaller files, faster network transfer.
- **V2 Sparse** — Only stores channels actually used. FPP 2.0+ default.

---

## Timing

### Frame rates (FPS)

| FPS | Step time | Use case |
|-----|-----------|----------|
| 20 | 50 ms | Required by older LOR controllers and serial networks |
| 25 | 40 ms | Older xLights default |
| 40 | 25 ms | Modern standard for pixel displays |
| 50 | 20 ms | High-end, smooth motion effects |

### Time base conversion: centiseconds vs milliseconds

**Critical gotcha:** LOR uses centiseconds (1/100 sec). Everyone else uses milliseconds (1/1000 sec).

Converting between them without proper resampling shifts every timing mark and beat. When exporting from LightCanvas's internal ms-based timeline to LOR's centisecond grid, all time values must be divided by 10 with proper rounding. When importing LOR, multiply by 10.

This is one of the most common silent failures in cross-platform sequence migration.

---

## Color Order (RGB vs GRB)

WS2811 pixel strings can be wired in different color orders depending on the manufacturer and batch. The two most common:

- **RGB** — Red, Green, Blue (the obvious order)
- **GRB** — Green, Red, Blue (extremely common in cheap pixels from Amazon and AliExpress)

If the sequencer assumes RGB and the strip is wired GRB, every red becomes green and vice versa. The user has no idea why their "red and white Christmas tree" looks lime green.

**LightCanvas must:** detect or let the user specify color order per fixture, and apply the swap at export time so the .fseq file is correct for that physical pixel.

---

## Power Considerations (Reference)

This isn't directly an authoring tool concern, but Lumi should be able to answer questions about it.

- WS2811 pixels at full white draw ~60mA each (5V) or ~20mA (12V).
- Voltage drop becomes severe after ~50 pixels on 5V, ~100 pixels on 12V without injection.
- Power injection means connecting fresh power wires every N pixels to maintain voltage.
- Total power per supply: `(pixels × mA per pixel) / 1000 = amps required`.

Example: 500 pixels @ 60mA = 30 amps at 5V = needs a 350W supply at minimum.

---

## What FPP Connect Does

`FPP Connect` is xLights' upload mechanism to FPP devices. Understanding it helps us replicate the experience without using xLights as a middleman:

1. Discover FPP instances on the local network (mDNS / broadcast).
2. Upload the .fseq file via HTTP.
3. Upload any associated audio files.
4. Optionally push controller configurations (output mapping, universe assignments) to the FPP instance.
5. Optionally push the `xlights_rgbeffects.xml` layout for FPP's display preview.

LightCanvas's "Deploy to FPP" feature replicates this flow directly, bypassing xLights entirely.
