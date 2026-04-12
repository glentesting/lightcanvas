import { useCallback, useRef } from 'react'

export interface AudioSnapshot {
  beatStrength: number   // 0–1
  bassStrength: number   // 0–1
  trebleStrength: number // 0–1
  vocalConfidence: number // 0–1
  timestamp: number       // seconds
  activePropIds?: Set<string>
  effectsByPropId?: Map<string, string>
  intensityByPropId?: Map<string, number>
}

export interface PropAnimState {
  glowIntensity: number  // 0–1
  scale: number          // multiplier, 1 = normal
  colorBrightness: number // 0–1
  /** Face mouth open amount 0 = closed, 1 = wide open */
  mouthOpen: number
  /** Roofline chase position 0–1 for sequential bulb lighting */
  chasePosition: number
}

const AMBIENT_SPEED = 0.8 // Hz for idle pulse

/**
 * Drives per-prop animation during playback and idle.
 * Call getAnimState(propType, timestamp, propId?) each frame to get current values.
 */
export function usePropsAnimation() {
  const lastBeatTime = useRef(0)
  const chasePos = useRef(0)
  const snapshotRef = useRef<AudioSnapshot | null>(null)

  const updateSnapshot = useCallback((snap: AudioSnapshot | null) => {
    if (snap && snap.beatStrength > 0.6) {
      lastBeatTime.current = snap.timestamp
    }
    snapshotRef.current = snap
  }, [])

  const getAnimState = useCallback((propType: string, now: number, propId?: string): PropAnimState => {
    const snap = snapshotRef.current
    const t = propType.toLowerCase()

    // Ambient idle pulse — always present
    const ambientPulse = 0.6 + 0.15 * Math.sin(now * AMBIENT_SPEED * Math.PI * 2)

    if (!snap) {
      // No playback — ambient only
      return {
        glowIntensity: ambientPulse,
        scale: 1.0,
        colorBrightness: ambientPulse,
        mouthOpen: 0,
        chasePosition: 0,
      }
    }

    // --- Per-prop animation when activePropIds is available ---
    if (propId && snap.activePropIds) {
      if (!snap.activePropIds.has(propId)) {
        // Prop is not active — dim ambient
        return {
          glowIntensity: 0.15,
          scale: 1.0,
          colorBrightness: 0.15,
          mouthOpen: 0,
          chasePosition: 0,
        }
      }

      // Prop is active — drive animation from its specific effect
      const effect = snap.effectsByPropId?.get(propId) ?? ''
      const intensity = snap.intensityByPropId?.get(propId) ?? 0.7

      switch (effect) {
        case 'Chase': {
          const timeSinceBeat = snap.timestamp - lastBeatTime.current
          chasePos.current = (chasePos.current + timeSinceBeat * 3.0) % 1.0
          return {
            glowIntensity: 0.6 + 0.4 * intensity,
            scale: 1.0,
            colorBrightness: 0.7 + 0.3 * intensity,
            mouthOpen: 0,
            chasePosition: chasePos.current,
          }
        }
        case 'Mouth Sync':
          return {
            glowIntensity: 0.5 + 0.4 * snap.vocalConfidence,
            scale: 1.0,
            colorBrightness: 0.6 + 0.4 * snap.vocalConfidence,
            mouthOpen: snap.vocalConfidence,
            chasePosition: 0,
          }
        case 'Pulse':
          return {
            glowIntensity: 0.3 + 0.7 * snap.beatStrength * intensity,
            scale: 1.0 + 0.1 * snap.beatStrength,
            colorBrightness: 0.4 + 0.6 * snap.beatStrength,
            mouthOpen: 0,
            chasePosition: 0,
          }
        case 'Twinkle':
          return {
            glowIntensity: 0.4 + 0.5 * Math.abs(Math.sin(now * 7)) * intensity,
            scale: 1.0 + 0.03 * Math.sin(now * 5),
            colorBrightness: 0.5 + 0.5 * Math.abs(Math.sin(now * 7)),
            mouthOpen: 0,
            chasePosition: 0,
          }
        case 'Shimmer':
          return {
            glowIntensity: 0.5 + 0.3 * Math.sin(now * 2) * intensity,
            scale: 1.0,
            colorBrightness: 0.6 + 0.3 * Math.sin(now * 2),
            mouthOpen: 0,
            chasePosition: 0,
          }
        case 'Hold':
          return {
            glowIntensity: 0.5 * intensity,
            scale: 1.0,
            colorBrightness: 0.5 * intensity,
            mouthOpen: 0,
            chasePosition: 0,
          }
        default: {
          // Sweep, Ripple, Color Pop, Fan, etc — use general energy
          const energy = (snap.bassStrength + snap.trebleStrength) / 2
          return {
            glowIntensity: 0.4 + 0.6 * energy * intensity,
            scale: 1.0 + 0.06 * energy,
            colorBrightness: 0.5 + 0.5 * energy,
            mouthOpen: 0,
            chasePosition: 0,
          }
        }
      }
    }

    // --- Fallback: prop-type-based animation (no per-prop data) ---

    // Mega Tree / Mini Tree: pulse on bass
    if (t.includes('mega') || t.includes('mini') || t.includes('tree')) {
      const bassGlow = 0.4 + 0.6 * snap.bassStrength
      return {
        glowIntensity: bassGlow,
        scale: 1.0 + 0.08 * snap.bassStrength,
        colorBrightness: bassGlow,
        mouthOpen: 0,
        chasePosition: 0,
      }
    }

    // Roofline: chase on beat
    if (t.includes('roof')) {
      const timeSinceBeat = snap.timestamp - lastBeatTime.current
      const chaseSpeed = 2.0
      chasePos.current = (chasePos.current + timeSinceBeat * chaseSpeed) % 1.0
      return {
        glowIntensity: 0.5 + 0.5 * snap.beatStrength,
        scale: 1.0,
        colorBrightness: 0.7 + 0.3 * snap.beatStrength,
        mouthOpen: 0,
        chasePosition: chasePos.current,
      }
    }

    // Stake: pulse on treble
    if (t.includes('stake') || t.includes('ground')) {
      const trebleGlow = 0.4 + 0.6 * snap.trebleStrength
      return {
        glowIntensity: trebleGlow,
        scale: 1.0 + 0.05 * snap.trebleStrength,
        colorBrightness: trebleGlow,
        mouthOpen: 0,
        chasePosition: 0,
      }
    }

    // Face / Talking Face: mouth on vocals
    if (t.includes('face') || t.includes('talking')) {
      return {
        glowIntensity: 0.5 + 0.3 * snap.vocalConfidence,
        scale: 1.0,
        colorBrightness: 0.6 + 0.4 * snap.vocalConfidence,
        mouthOpen: snap.vocalConfidence,
        chasePosition: 0,
      }
    }

    // Default: pulse on overall energy
    const energy = (snap.bassStrength + snap.trebleStrength) / 2
    return {
      glowIntensity: 0.4 + 0.6 * energy,
      scale: 1.0 + 0.04 * energy,
      colorBrightness: 0.5 + 0.5 * energy,
      mouthOpen: 0,
      chasePosition: 0,
    }
  }, [])

  return { updateSnapshot, getAnimState }
}
