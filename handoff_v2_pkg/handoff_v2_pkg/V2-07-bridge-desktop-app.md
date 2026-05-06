# V2-07 — LightCanvas Bridge Desktop App

Build the Bridge desktop app. This enables real-time hardware control — seeing your actual lights react as you design, and automated show scheduling.

**This is not needed for the core export workflow.** Users who export to xLights or LOR and play via FPP/LOR software don't need Bridge. Bridge is for the advanced use case: design with real lights responding live, and hands-free scheduled shows.

## Technology: Tauri (not Electron)

Build with Tauri. ~10MB install vs ~120MB for Electron. Opens in under a second. For users who just want to run their Christmas show, installer size matters enormously.

The Rust backend handles network I/O (UDP for E1.31). The frontend (React/TypeScript) is the same stack as the main app. Auth via OAuth device code flow — no separate account needed.

## Architecture

```
LightCanvas cloud (Next.js)
    ↓ WebSocket (WSS)
LightCanvas Bridge (Tauri desktop app)
    ↓ E1.31 / DDP / WLED HTTP
Physical controllers (Falcon, AlphaPix, WLED, etc.)
```

The cloud never sends E1.31 directly — Bridge is always the local relay.

## Output drivers to implement

**E1.31 / sACN (required)** — main protocol. UDP multicast or unicast. Standard for Falcon, AlphaPix, Pixlite, Kulp.

**WLED HTTP/JSON (required)** — for WLED-based setups. POST JSON to `http://[wled-ip]/json/state`.

**DDP (optional, stub)** — interface ready, implement after E1.31 is solid.

## Bridge features

### Controller discovery
- mDNS scan for xLights-compatible controllers (FPP, WLED, etc.)
- E1.31 ping sweep for E1.31-capable controllers
- Manual add by IP address

### Real-time mirror
Receive frame data from LightCanvas cloud via WebSocket, forward to controllers via E1.31/WLED.

Target: ≤80ms end-to-end latency (cloud → Bridge → controller).

### Test fixture
Send a 3-second rainbow chase to a single fixture. Used to verify wiring. One button per fixture in the Bridge UI.

### Show scheduling
Bridge has a local scheduler that reads schedules from the cloud via WebSocket:
- "Play this show at 5:00 PM every day December 1–January 2"
- Bridge wakes at the scheduled time, downloads/buffers the FSEQ, plays via E1.31

### Pairing flow
1. User installs Bridge
2. Bridge generates a device code
3. User enters code in LightCanvas Settings → Hardware
4. Bridge is now linked to the account
5. Bridge auto-reconnects on startup

## Cloud-side additions

- `bridges` table: id, owner_id, name, last_seen, status
- WebSocket gateway at `/bridge/v1` — authenticated sessions
- Frame streaming endpoint (for real-time mirror)
- Schedule sync endpoint

## Acceptance

- Bridge installs on Mac and Windows in under 30 seconds
- Pairing flow works end-to-end
- E1.31 packets are sent correctly to a Falcon or WLED controller
- Test fixture button causes physical lights to respond
- Real-time mirror: dragging an effect in LightCanvas causes lights to respond within 80ms
- Scheduled show runs at the correct time without user interaction
- Bridge auto-reconnects after a network dropout
