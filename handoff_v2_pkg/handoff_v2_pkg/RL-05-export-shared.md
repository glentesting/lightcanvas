# RL-05 — Shared Export Infrastructure

Validation, post-export guidance modal, and shared ZIP packaging logic used by both the xLights and LOR exporters.

## Channel Validation (runs before any export)

Fire these checks when the user opens the export dialog. Show inline warnings in the export modal — not blocking, but visible and clear.

### 1. Channel overlap detection

Check every pair of fixtures. Two fixtures overlap if they share the same universe AND their channel ranges intersect.

```
Fixture A: Universe 1, Start Channel 1, Pixels 100 → channels 1-300
Fixture B: Universe 1, Start Channel 150, Pixels 50 → channels 150-300
→ OVERLAP: channels 150-300 shared between Fixture A and Fixture B
```

Warning UI: orange banner in export modal — "⚠️ Channel conflict: Roofline and Window Left share channels 150–300 on Universe 1. Fix in Layout before exporting."

### 2. Universe overflow detection

A universe holds 512 channels (use 510 as the safe limit). If a single universe contains fixtures whose total channel count exceeds 510, warn.

Warning UI: "⚠️ Universe 2 contains 528 channels — exceeds the 510 channel limit. Move some fixtures to a new universe."

### 3. Controller port limit validation (if hardware profile has controller type)

Per controller, warn if any single port exceeds:
- Falcon F16v3: 1,700 pixels (5,100 channels)
- AlphaPix 16: 680 pixels (2,040 channels)
- LOR PixCon16: 170 pixels per port

Warning: "⚠️ Your Mega Tree (1,920 pixels) exceeds the Falcon F16v3 port limit of 1,700 pixels. Split it across two ports in xLights."

### Validation state

Show validation results in the export modal before the user can proceed:
- ✅ No conflicts found — proceed to export
- ⚠️ Warnings found — "Export anyway" available, issues listed
- ❌ Errors (future: for truly blocking issues) — must fix first

## Post-Export Guidance Modal

After ZIP download, show a full-screen modal (or a large slide-in panel) with step-by-step instructions. Content is driven by hardware profile.

### xLights profile guidance

**"You're almost there — here's what to do next"**

1. **Unzip your download** — you'll find your sequence file, audio, and display layout
2. **Create your show directory** — a folder on your computer where your show lives (e.g., `C:\xLights\Holiday2026\`)
3. **Copy all files** into that show directory
4. **Open xLights** and set your Show Directory to that folder (Settings → Show Directory)
5. **Load your layout** — in the Layout tab, your fixtures should appear automatically
6. **Open your sequence** — in the Sequencer tab, open your .xsq file
7. **Render your show** — click Render → Render All Sequences. xLights creates a .fseq playback file.
8. **Set up FPP** (Falcon Player) on your controller computer, point it at your .fseq file, and hit Play

Link at bottom: "Full xLights setup guide → xlights.org/manual"

### LOR profile guidance

**"You're almost there — here's what to do next"**

1. **Unzip your download** — sequence file and audio inside
2. **Open LOR Sequence Editor** — File → Open → select your .lms file
3. **Check channel assignments** — Edit → Channel Properties. Make sure unit and circuit numbers match your LOR network configuration
4. **Play your preview** — hit Play in the Sequence Editor to check timing
5. **Use LOR Control Panel** to send your show to hardware — or schedule it in LOR Scheduler

Link at bottom: "LOR help forum → forums.lightorama.com"

### "I'm new / not sure" guidance

Simplified version of xLights guidance with more explanation of each step and links to beginner tutorials.

## Shared ZIP Packaging

Both exporters use a common ZIP utility:

```typescript
async function buildExportZip(files: ExportFile[]): Promise<Blob> {
  // files: [{ name: string, content: string | Blob }]
  // Downloads audio from Supabase signed URL
  // Packs all files into a single ZIP
  // Returns as downloadable Blob
}
```

The audio file is always included. Never link to the Supabase URL in the export — always embed the file.

## Acceptance

- Channel overlap warnings appear in export modal before export proceeds
- Universe overflow warnings appear in export modal
- Controller port warnings appear if hardware profile has controller type set
- "Export anyway" works when only warnings (not errors) are present
- Post-export guidance modal appears after every successful download
- Guidance content matches the user's hardware profile
- Audio file is present in every exported ZIP
- ZIP downloads correctly in Chrome, Firefox, and Safari
