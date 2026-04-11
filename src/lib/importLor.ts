import { unzipSync } from 'fflate'

export type LorImportResult = {
  props: Array<{
    name: string
    type: string
    channels: number
    startChannel: number
  }>
  events: Array<{
    propName: string
    effect: string
    start: number
    end: number
    intensity: number
    color: string
  }>
  durationSeconds: number
  bpm: number | null
  errors: string[]
}

export async function importLorFile(file: File): Promise<LorImportResult> {
  const errors: string[] = []

  try {
    const buffer = await file.arrayBuffer()
    const uint8 = new Uint8Array(buffer)

    // Try to unzip (loredit files are ZIP archives)
    let xmlContent = ''
    try {
      const decompressed = unzipSync(uint8)
      const xmlFile = Object.keys(decompressed).find(
        k => k.endsWith('.xml') || k === 'sequence.xml'
      )
      if (xmlFile) {
        xmlContent = new TextDecoder().decode(decompressed[xmlFile])
      } else {
        xmlContent = new TextDecoder().decode(uint8)
      }
    } catch {
      // Not a ZIP — try as raw XML
      xmlContent = new TextDecoder().decode(uint8)
    }

    if (!xmlContent) {
      return { props: [], events: [], durationSeconds: 0, bpm: null, errors: ['Could not read file'] }
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')

    // Extract duration
    const seqEl = doc.querySelector('sequence')
    const durationMs = parseInt(seqEl?.getAttribute('duration') ?? '0', 10)
    const durationSeconds = durationMs / 1000

    // Extract channels/props
    const channelEls = doc.querySelectorAll('channel')
    const props: LorImportResult['props'] = []

    channelEls.forEach((ch) => {
      const name = ch.getAttribute('name') ?? 'Unknown'
      const savedIndex = ch.getAttribute('savedIndex') ?? '0'

      let type = 'Roofline'
      const nameLower = name.toLowerCase()
      if (nameLower.includes('tree')) type = 'Mega Tree'
      if (nameLower.includes('mini')) type = 'Mini Tree'
      if (nameLower.includes('face') || nameLower.includes('mouth')) type = 'Talking Tree Face'
      if (nameLower.includes('stake') || nameLower.includes('candy')) type = 'Stake'
      if (nameLower.includes('arch')) type = 'Arch'
      if (nameLower.includes('matrix')) type = 'Matrix'

      props.push({
        name,
        type,
        channels: 1,
        startChannel: parseInt(savedIndex, 10) + 1,
      })
    })

    // Extract timing effects
    const events: LorImportResult['events'] = []
    channelEls.forEach((ch) => {
      const name = ch.getAttribute('name') ?? 'Unknown'
      const effectEls = ch.querySelectorAll('effect')

      effectEls.forEach((eff) => {
        const type = eff.getAttribute('type') ?? 'intensity'
        const startCentisecs = parseInt(eff.getAttribute('startCentisecond') ?? '0', 10)
        const endCentisecs = parseInt(eff.getAttribute('endCentisecond') ?? '0', 10)
        const intensity = parseInt(
          eff.getAttribute('intensity') ?? eff.getAttribute('endIntensity') ?? '100', 10
        )

        let effect = 'Hold'
        if (type === 'intensity') effect = 'Pulse'
        if (type === 'shimmer') effect = 'Shimmer'
        if (type === 'twinkle') effect = 'Twinkle'
        if (type === 'chase') effect = 'Chase'

        if (endCentisecs > startCentisecs && intensity > 0) {
          events.push({
            propName: name,
            effect,
            start: startCentisecs / 100,
            end: endCentisecs / 100,
            intensity,
            color: '#ffe8c0',
          })
        }
      })
    })

    return { props, events, durationSeconds, bpm: null, errors }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { props: [], events: [], durationSeconds: 0, bpm: null, errors: [msg] }
  }
}
