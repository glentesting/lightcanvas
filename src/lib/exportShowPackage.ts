import { zipSync } from 'fflate'
import type { TimelineEvent } from '../components/sequencer/types'
import type { DisplayProp } from '../types/display'
import { generateFseqV2 } from './exportFseq'

export async function downloadShowPackage(
  events: TimelineEvent[],
  props: DisplayProp[],
  songTitle: string,
  durationSeconds: number,
  audioBlob: Blob | null,
): Promise<void> {
  const safeName = songTitle.replace(/[^a-z0-9]/gi, '_')

  // 1. Generate FSEQ
  const fseqBlob = generateFseqV2(events, props, songTitle, durationSeconds)
  const fseqBytes = new Uint8Array(await fseqBlob.arrayBuffer())

  // 2. Generate channel mapping CSV
  let csv = 'Prop Name,Type,Controller,Start Channel,Channels,End Channel\n'
  for (const prop of props) {
    const end = prop.start + prop.channels - 1
    csv += `"${prop.name}","${prop.type}","${prop.controller}",`
    csv += `${prop.start},${prop.channels},${end}\n`
  }
  const csvBytes = new TextEncoder().encode(csv)

  // 3. Generate README
  const durMin = Math.floor(durationSeconds / 60)
  const durSec = String(Math.round(durationSeconds % 60)).padStart(2, '0')
  const readme = `LightCanvas Show Package
========================
Song: ${songTitle}
Duration: ${durMin}:${durSec}
Props: ${props.length}
Events: ${events.length}
Generated: ${new Date().toLocaleDateString()}

FILES IN THIS PACKAGE
---------------------
${safeName}.fseq        - Sequence file for Falcon Player (FPP) or xLights
channel_map.csv         - Channel assignments for your controller setup
README.txt              - This file

PLAYING WITH FALCON PLAYER (FPP)
---------------------------------
1. Copy ${safeName}.fseq to your FPP media/sequences folder
2. Copy your audio file to FPP media/music folder
3. In FPP, go to Content Setup > Sequences
4. Create a new playlist and add your sequence
5. Set the media file to your audio track
6. Press Play

IMPORTING INTO xLights
------------------------
1. Open xLights
2. File > Open Sequence > select ${safeName}.fseq
3. Map channels to your controller setup
4. Use the channel_map.csv as reference

SUPPORT
-------
docs.lightcanvas.co
`
  const readmeBytes = new TextEncoder().encode(readme)

  // 4. Build ZIP
  const zipData: Record<string, Uint8Array> = {
    [`${safeName}.fseq`]: fseqBytes,
    'channel_map.csv': csvBytes,
    'README.txt': readmeBytes,
  }

  if (audioBlob) {
    const audioBytes = new Uint8Array(await audioBlob.arrayBuffer())
    zipData[`${safeName}_audio.mp3`] = audioBytes
  }

  const zipped = zipSync(zipData, { level: 6 })
  const blob = new Blob([zipped as BlobPart], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}_show_package.zip`
  a.click()
  URL.revokeObjectURL(url)
}
