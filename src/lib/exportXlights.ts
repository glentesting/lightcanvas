import type { TimelineEvent } from '../components/sequencer/types'
import type { DisplayProp } from '../types/display'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function generateXlightsXml(
  events: TimelineEvent[],
  props: DisplayProp[],
  songTitle: string,
  durationSeconds: number,
): string {
  const fps = 20
  const totalFrames = Math.ceil(durationSeconds * fps)

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<xsequence version="2.20">\n`

  xml += `  <head>\n`
  xml += `    <version>2.20</version>\n`
  xml += `    <author>LightCanvas</author>\n`
  xml += `    <description>${escapeXml(songTitle)}</description>\n`
  xml += `    <timing>50</timing>\n`
  xml += `    <totalframes>${totalFrames}</totalframes>\n`
  xml += `  </head>\n`

  xml += `  <models>\n`
  for (const prop of props) {
    xml += `    <model name="${escapeXml(prop.name)}" `
    xml += `startChannel="${prop.start}" `
    xml += `channelCount="${prop.channels}" `
    xml += `type="${escapeXml(prop.type)}" />\n`
  }
  xml += `  </models>\n`

  xml += `  <ElementEffects>\n`
  for (const prop of props) {
    const propEvents = events.filter(e => e.propId === prop.id)
    if (propEvents.length === 0) continue

    xml += `    <Element type="model" name="${escapeXml(prop.name)}">\n`
    xml += `      <EffectLayer>\n`

    for (const event of propEvents) {
      const startFrame = Math.floor(event.start * fps)
      const endFrame = Math.ceil(event.end * fps)
      const color = (event as TimelineEvent & { color?: string }).color ?? '#ffffff'
      xml += `        <Effect type="${escapeXml(event.effect)}" `
      xml += `startFrame="${startFrame}" `
      xml += `endFrame="${endFrame}" `
      xml += `intensity="${event.intensity}" `
      xml += `color="${color}" />\n`
    }

    xml += `      </EffectLayer>\n`
    xml += `    </Element>\n`
  }
  xml += `  </ElementEffects>\n`
  xml += `</xsequence>\n`

  return xml
}

export function downloadXlightsXml(
  events: TimelineEvent[],
  props: DisplayProp[],
  songTitle: string,
  durationSeconds: number,
): void {
  const xml = generateXlightsXml(events, props, songTitle, durationSeconds)
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${songTitle.replace(/[^a-z0-9]/gi, '_')}_xlights.xml`
  a.click()
  URL.revokeObjectURL(url)
}
