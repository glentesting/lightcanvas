export type GatingResult = {
  allowed: boolean
  reason: string | null
}

export function canAddController(
  currentCount: number,
  plan: 'free' | 'pro',
): GatingResult {
  if (plan === 'pro') return { allowed: true, reason: null }
  if (currentCount >= 2)
    return {
      allowed: false,
      reason: 'Free accounts support up to 2 controllers. Go Premium for unlimited.',
    }
  return { allowed: true, reason: null }
}

export function canAddSong(
  currentCount: number,
  plan: 'free' | 'pro',
): GatingResult {
  if (plan === 'pro') return { allowed: true, reason: null }
  if (currentCount >= 3)
    return {
      allowed: false,
      reason: 'Free accounts support up to 3 songs. Go Premium for unlimited.',
    }
  return { allowed: true, reason: null }
}

export function canRunAiAnalysis(
  analysesRunToday: number,
  plan: 'free' | 'pro',
): GatingResult {
  if (plan === 'pro') return { allowed: true, reason: null }
  if (analysesRunToday >= 1)
    return {
      allowed: false,
      reason: 'Free accounts get 1 AI analysis per day. Go Premium for unlimited.',
    }
  return { allowed: true, reason: null }
}

export function canExportFseq(plan: 'free' | 'pro'): GatingResult {
  if (plan === 'pro') return { allowed: true, reason: null }
  return {
    allowed: false,
    reason: 'FSEQ export is a Pro feature. Go Premium to download your show file.',
  }
}

export function canExportXlights(plan: 'free' | 'pro'): GatingResult {
  if (plan === 'pro') return { allowed: true, reason: null }
  return {
    allowed: false,
    reason: 'xLights export is a Pro feature.',
  }
}

export function isPro(plan: 'free' | 'pro'): boolean {
  return plan === 'pro'
}
