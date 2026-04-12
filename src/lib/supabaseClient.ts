import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url && typeof url === 'string' && url.length > 0 && anonKey && typeof anonKey === 'string' && anonKey.length > 0,
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

/** Current session JWT for `Authorization: Bearer …` on server routes. Returns null if Supabase is off or there is no session (logs a warning). */
export async function getSupabaseAccessTokenForApi(): Promise<string | null> {
  if (!supabase) {
    console.warn('[LightCanvas] Supabase is not configured; cannot add Authorization to API calls.')
    return null
  }
  const { data, error } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (error || !token) {
    console.warn(
      '[LightCanvas] User is not authenticated; skipping API call.',
      error?.message ?? 'No session access token',
    )
    return null
  }
  return token
}
