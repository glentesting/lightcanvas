import { useCallback, useRef } from 'react'

export interface AudioSnapshot {
  beatStrength: number   // 0–1
  bassStrength: number   // 0–1
  trebleStrength: number // 0–1
  vocalConfidence: number // 0–1
  timestamp: number       // seconds
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
 * Call getAnimState(propType, timestamp) each frame to get current values.
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

  const getAnimState = useCallback((propType: string, now: number): PropAnimState => {
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

    // --- Playback mode ---

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
      // Advance chase on each beat
      const timeSinceBeat = snap.timestamp - lastBeatTime.current
      const chaseSpeed = 2.0 // full cycle in 0.5s
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

    // Default: pulse on overall energy (average of bass + treble)
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
