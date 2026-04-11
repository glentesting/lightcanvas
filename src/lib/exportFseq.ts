import type { TimelineEvent } from '../components/sequencer/types'
import type { DisplayProp } from '../types/display'

export function generateFseqV2(
  events: TimelineEvent[],
  props: DisplayProp[],
  songTitle: string,
  durationSeconds: number,
): Blob {
  const FPS = 50
  const totalFrames = Math.ceil(durationSeconds * FPS)

  // Build channel map: propId → starting channel index
  const channelMap = new Map<string, number>()
  let channelOffset = 0
  for (const prop of props) {
    channelMap.set(prop.id, channelOffset)
    channelOffset += prop.channels
  }
  const totalChannels = Math.max(1, channelOffset)

  // Build frame data
  const frameData = new Uint8Array(totalFrames * totalChannels)

  for (const event of events) {
    const chanStart = channelMap.get(event.propId)
    if (chanStart == null) continue
    const prop = props.find(p => p.id === event.propId)
    if (!prop) continue

    const startFrame = Math.floor(event.start * FPS)
    const endFrame = Math.min(totalFrames, Math.ceil(event.end * FPS))
    const intensity = Math.round((event.intensity / 100) * 255)

    for (let f = startFrame; f < endFrame; f++) {
      for (let c = 0; c < prop.channels; c++) {
        frameData[f * totalChannels + chanStart + c] = intensity
      }
    }
  }

  // Build FSEQ v2 header
  const HEADER_SIZE = 32
  const buffer = new ArrayBuffer(HEADER_SIZE + frameData.byteLength)
  const view = new DataView(buffer)
  const enc = new TextEncoder()

  // Magic: "PSEQ"
  enc.encodeInto('PSEQ', new Uint8Array(buffer, 0, 4))
  // Data offset (uint16 LE)
  view.setUint16(4, HEADER_SIZE, true)
  // Minor version: 0
  view.setUint8(6, 0)
  // Major version: 2
  view.setUint8(7, 2)
  // Variable header offset (uint16): 0
  view.setUint16(8, 0, true)
  // Channel count (uint32)
  view.setUint32(10, totalChannels, true)
  // Frame count (uint32)
  view.setUint32(14, totalFrames, true)
  // Step time in ms (uint8): 20 = 50fps
  view.setUint8(18, 20)
  // Flags: 0
  view.setUint8(19, 0)
  // Compression type: 0 = none
  view.setUint8(20, 0)
  // Number of compression blocks: 0
  view.setUint8(21, 0)
  // Number of sparse ranges: 0
  view.setUint8(22, 0)
  // Reserved: 0
  view.setUint8(23, 0)
  // UUID (8 bytes): zeros
  for (let i = 24; i < 32; i++) view.setUint8(i, 0)

  // Copy frame data
  new Uint8Array(buffer, HEADER_SIZE).set(frameData)

  return new Blob([buffer], { type: 'application/octet-stream' })
}

export function downloadFseq(
  events: TimelineEvent[],
  props: DisplayProp[],
  songTitle: string,
  durationSeconds: number,
): void {
  const blob = generateFseqV2(events, props, songTitle, durationSeconds)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${songTitle.replace(/[^a-z0-9]/gi, '_')}.fseq`
  a.click()
  URL.revokeObjectURL(url)
}
