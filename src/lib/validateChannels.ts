import type { DisplayProp } from '../types/display'

export type ChannelValidationIssue = {
  severity: 'error' | 'warning'
  message: string
  propId?: string
  propName?: string
}

export function validateChannelMapping(
  props: DisplayProp[],
  controllers: number,
  channelsPerController: number,
): ChannelValidationIssue[] {
  const issues: ChannelValidationIssue[] = []
  const totalCapacity = controllers * channelsPerController

  // Check 1: No props defined
  if (props.length === 0) {
    issues.push({
      severity: 'error',
      message: 'No props defined. Add props in Display Setup before exporting.',
    })
    return issues
  }

  // Check 2: Total channels used vs capacity
  const totalUsed = props.reduce((sum, p) => sum + p.channels, 0)
  if (totalUsed > totalCapacity) {
    issues.push({
      severity: 'error',
      message: `Total channels used (${totalUsed}) exceeds controller capacity (${totalCapacity}). Remove props or increase controllers.`,
    })
  }

  // Check 3: Channel overlap detection
  const channelRanges: Array<{ start: number; end: number; prop: DisplayProp }> = []
  for (const prop of props) {
    const start = prop.start
    const end = prop.start + prop.channels - 1
    for (const existing of channelRanges) {
      if (start <= existing.end && end >= existing.start) {
        issues.push({
          severity: 'error',
          message: `Channel conflict: "${prop.name}" (ch ${start}-${end}) overlaps with "${existing.prop.name}" (ch ${existing.start}-${existing.end}).`,
          propId: prop.id,
          propName: prop.name,
        })
      }
    }
    channelRanges.push({ start, end, prop })
  }

  // Check 4: RGB props should have channels divisible by 3
  for (const prop of props) {
    const t = prop.type.toLowerCase()
    const isRgb = t.includes('rgb') || t.includes('pixel') ||
                  t.includes('matrix') || t.includes('tree') ||
                  t.includes('face') || t.includes('arch')
    if (isRgb && prop.channels % 3 !== 0) {
      issues.push({
        severity: 'warning',
        message: `"${prop.name}" looks like an RGB prop but has ${prop.channels} channels (not divisible by 3). RGB props need 3 channels per pixel.`,
        propId: prop.id,
        propName: prop.name,
      })
    }
  }

  // Check 5: Props with zero channels
  for (const prop of props) {
    if (prop.channels < 1) {
      issues.push({
        severity: 'error',
        message: `"${prop.name}" has 0 channels. Every prop needs at least 1 channel.`,
        propId: prop.id,
        propName: prop.name,
      })
    }
  }

  return issues
}
