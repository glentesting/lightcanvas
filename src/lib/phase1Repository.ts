import type { AnalyzedSection } from './audioAnalysis'
import type { DisplayProp } from '../types/display'
import type { Song, SongSectionSnapshot } from '../types/song'
import { supabase } from './supabaseClient'

export const SONG_AUDIO_BUCKET = 'song-audio'

type DisplayPropRow = {
  id: string
  display_profile_id: string
  name: string
  type: string
  channels: number
  controller: string
  start_channel: number
  priority: string
  notes: string
  sort_order: number
  canvas_x: number | null
  canvas_y: number | null
  color: string | null
  angle: number | null
  length: number | null
  house_type: string | null
}

type SongRow = {
  id: string
  user_id: string
  title: string
  duration_seconds: number
  bpm: number | null
  status: string
  storage_bucket?: string | null
  storage_path?: string | null
  original_filename?: string | null
  beat_confidence?: number | null
  bass_strength?: number | null
  treble_strength?: number | null
  vocal_confidence?: number | null
  dynamics?: number | null
  detected_bpm?: number | null
  sections?: unknown | null
}

function parseSectionsJson(raw: unknown): SongSectionSnapshot[] {
  if (raw == null || !Array.isArray(raw)) return []
  const out: SongSectionSnapshot[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.name !== 'string') continue
    const start = typeof o.start === 'number' ? o.start : Number(o.start)
    const end = typeof o.end === 'number' ? o.end : Number(o.end)
    const energy = typeof o.energy === 'number' ? o.energy : Number(o.energy)
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(energy)) continue
    out.push({
      name: o.name,
      start,
      end,
      energy,
      vocals: Boolean(o.vocals),
    })
  }
  return out
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

function clampBpm(n: number): number {
  return Math.min(999, Math.max(1, Math.round(n)))
}

export function rowToDisplayProp(row: DisplayPropRow): DisplayProp {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    channels: row.channels,
    controller: row.controller,
    start: row.start_channel,
    priority: row.priority,
    notes: row.notes,
    canvasX: row.canvas_x ?? undefined,
    canvasY: row.canvas_y ?? undefined,
    color: row.color ?? undefined,
    angle: row.angle ?? undefined,
    length: row.length ?? undefined,
    houseType: row.house_type ?? undefined,
  }
}

export function rowToSong(row: SongRow): Song {
  const analysisSaved = row.beat_confidence != null
  const persistedSections = parseSectionsJson(row.sections)
  const analysis = analysisSaved
    ? {
        beat: clampPct(row.beat_confidence!),
        bass: clampPct(row.bass_strength ?? 0),
        treble: clampPct(row.treble_strength ?? 0),
        vocals: clampPct(row.vocal_confidence ?? 0),
        dynamics: clampPct(row.dynamics ?? 0),
      }
    : { beat: 0, bass: 0, treble: 0, vocals: 0, dynamics: 0 }

  const bpmFromAnalysis =
    row.detected_bpm != null ? clampBpm(row.detected_bpm) : row.bpm

  return {
    id: row.id,
    title: row.title,
    duration: row.duration_seconds,
    bpm: bpmFromAnalysis,
    key: '—',
    energy: '—',
    status: row.status,
    analysis,
    analysisSaved: analysisSaved || undefined,
    persistedSections:
      analysisSaved && persistedSections.length > 0 ? persistedSections : undefined,
    storageBucket: row.storage_bucket ?? null,
    storagePath: row.storage_path ?? null,
    originalFilename: row.original_filename ?? null,
  }
}

/** Load or create the user’s default display profile. */
export async function getOrCreateDisplayProfile(userId: string): Promise<{
  id: string
  controllers: number
  channels_per_controller: number
  photo_url: string | null
}> {
  if (!supabase) throw new Error('Supabase not configured')

  const { data: byDefault, error: e1 } = await supabase
    .from('display_profiles')
    .select('id, controllers, channels_per_controller, photo_url')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (e1) { console.error('getOrCreateDisplayProfile: select default', e1); throw new Error(e1.message) }
  if (byDefault) {
    return {
      id: byDefault.id,
      controllers: byDefault.controllers,
      channels_per_controller: byDefault.channels_per_controller,
      photo_url: byDefault.photo_url ?? null,
    }
  }

  const { data: anyProfile, error: e2 } = await supabase
    .from('display_profiles')
    .select('id, controllers, channels_per_controller, photo_url')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (e2) { console.error('getOrCreateDisplayProfile: select any', e2); throw new Error(e2.message) }
  if (anyProfile) {
    return {
      id: anyProfile.id,
      controllers: anyProfile.controllers,
      channels_per_controller: anyProfile.channels_per_controller,
      photo_url: anyProfile.photo_url ?? null,
    }
  }

  const { data: created, error: e3 } = await supabase
    .from('display_profiles')
    .insert({
      user_id: userId,
      name: 'My display',
      controllers: 3,
      channels_per_controller: 16,
      is_default: true,
    })
    .select('id, controllers, channels_per_controller, photo_url')
    .single()

  if (e3) { console.error('getOrCreateDisplayProfile: insert', e3); throw new Error(e3.message) }
  return {
    id: created.id,
    controllers: created.controllers,
    channels_per_controller: created.channels_per_controller,
    photo_url: created.photo_url ?? null,
  }
}

export async function updateProfilePhotoUrl(
  profileId: string,
  photoUrl: string,
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') }
  const { error } = await supabase
    .from('display_profiles')
    .update({ photo_url: photoUrl })
    .eq('id', profileId)
  return { error: error ? new Error(error.message) : null }
}

export async function loadDisplayProps(profileId: string): Promise<DisplayProp[]> {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('display_props')
    .select('*')
    .eq('display_profile_id', profileId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) { console.error('loadDisplayProps', error); throw new Error(error.message) }
  return (data as DisplayPropRow[]).map(rowToDisplayProp)
}

export async function persistDisplayProfile(
  profileId: string,
  payload: {
    controllers: number
    channels_per_controller: number
    props: DisplayProp[]
  },
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') }
  }

  const { error: u1 } = await supabase
    .from('display_profiles')
    .update({
      controllers: Math.min(999, Math.max(1, Math.round(payload.controllers))),
      channels_per_controller: Math.min(
        999,
        Math.max(1, Math.round(payload.channels_per_controller)),
      ),
    })
    .eq('id', profileId)

  if (u1) return { error: new Error(u1.message) }

  const { error: del } = await supabase
    .from('display_props')
    .delete()
    .eq('display_profile_id', profileId)

  if (del) return { error: new Error(del.message) }

  if (payload.props.length === 0) {
    return { error: null }
  }

  const rows = payload.props.map((p, i) => ({
    id: p.id,
    display_profile_id: profileId,
    name: p.name,
    type: p.type,
    channels: Math.min(10000, Math.max(1, Math.round(p.channels))),
    controller: p.controller,
    start_channel: Math.max(1, Math.round(p.start)),
    priority: p.priority,
    notes: p.notes,
    sort_order: i,
    canvas_x: p.canvasX ?? null,
    canvas_y: p.canvasY ?? null,
    color: p.color ?? null,
    angle: p.angle ?? null,
    length: p.length ?? null,
    house_type: p.houseType ?? null,
  }))

  const { error: ins } = await supabase.from('display_props').insert(rows)

  if (ins) return { error: new Error(ins.message) }
  return { error: null }
}

export async function loadSongs(userId: string): Promise<Song[]> {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) { console.error('loadSongs', error); throw new Error(error.message) }
  return (data as SongRow[]).map(rowToSong)
}

export async function createSong(
  userId: string,
  input: { title: string; duration_seconds?: number; bpm?: number | null; status?: string },
): Promise<{ song: Song | null; error: Error | null }> {
  if (!supabase) {
    return { song: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase
    .from('songs')
    .insert({
      user_id: userId,
      title: input.title,
      duration_seconds: input.duration_seconds ?? 0,
      bpm: input.bpm ?? null,
      status: input.status ?? 'Uploaded',
    })
    .select('*')
    .single()

  if (error) return { song: null, error: new Error(error.message) }
  return { song: rowToSong(data as SongRow), error: null }
}

function extensionForUpload(file: File): string {
  const match = file.name.match(/\.([a-zA-Z0-9]+)$/)
  if (match) return match[1].toLowerCase()
  if (file.type.includes('wav')) return 'wav'
  return 'mp3'
}

/**
 * Upload audio to Storage and insert a songs row (path: `{userId}/{songId}.{ext}`).
 */
export async function uploadSongFromFile(
  userId: string,
  file: File,
  durationSeconds: number,
): Promise<{ song: Song | null; error: Error | null }> {
  if (!supabase) {
    return { song: null, error: new Error('Supabase not configured') }
  }

  const songId = crypto.randomUUID()
  const ext = extensionForUpload(file)
  const storagePath = `${userId}/${songId}.${ext}`
  const titleBase = file.name.replace(/\.[^/.]+$/, '').trim() || file.name
  const contentType = file.type || (ext === 'wav' ? 'audio/wav' : 'audio/mpeg')

  const { error: upErr } = await supabase.storage
    .from(SONG_AUDIO_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    })

  if (upErr) {
    return { song: null, error: new Error(upErr.message) }
  }

  const { data, error: insErr } = await supabase
    .from('songs')
    .insert({
      id: songId,
      user_id: userId,
      title: titleBase,
      original_filename: file.name,
      duration_seconds: Math.max(0, Math.round(durationSeconds)),
      bpm: null,
      status: 'Uploaded',
      storage_bucket: SONG_AUDIO_BUCKET,
      storage_path: storagePath,
    })
    .select('*')
    .single()

  if (insErr) {
    await supabase.storage.from(SONG_AUDIO_BUCKET).remove([storagePath])
    return { song: null, error: new Error(insErr.message) }
  }

  return { song: rowToSong(data as SongRow), error: null }
}

export async function getSongAudioSignedUrl(
  song: Pick<Song, 'storageBucket' | 'storagePath'>,
  expiresIn = 3600,
): Promise<string | null> {
  if (!supabase || !song.storagePath || !song.storageBucket) return null

  const { data, error } = await supabase.storage
    .from(song.storageBucket)
    .createSignedUrl(song.storagePath, expiresIn)

  if (error || !data?.signedUrl) {
    console.error('getSongAudioSignedUrl', error)
    return null
  }
  return data.signedUrl
}

export async function updateSongStatus(
  songId: string,
  patch: { status?: string; bpm?: number | null },
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') }
  }

  const { error } = await supabase.from('songs').update(patch).eq('id', songId)

  return { error: error ? new Error(error.message) : null }
}

/** Persist successful audio analysis to the song row (summary, sections, BPM, status). */
export async function persistSongAudioAnalysis(
  songId: string,
  payload: {
    beat_confidence: number
    bass_strength: number
    treble_strength: number
    vocal_confidence: number
    dynamics: number
    detected_bpm: number
    sections: AnalyzedSection[]
  },
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') }
  }

  const { error } = await supabase
    .from('songs')
    .update({
      status: 'Ready',
      bpm: clampBpm(payload.detected_bpm),
      beat_confidence: clampPct(payload.beat_confidence),
      bass_strength: clampPct(payload.bass_strength),
      treble_strength: clampPct(payload.treble_strength),
      vocal_confidence: clampPct(payload.vocal_confidence),
      dynamics: clampPct(payload.dynamics),
      detected_bpm: clampBpm(payload.detected_bpm),
      sections: payload.sections,
    })
    .eq('id', songId)

  return { error: error ? new Error(error.message) : null }
}

/** Remove the song row and delete its Storage object when present. */
export async function deleteSongFromLibrary(song: Song): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') }
  }

  if (song.storageBucket && song.storagePath) {
    const { error: stErr } = await supabase.storage
      .from(song.storageBucket)
      .remove([song.storagePath])
    if (stErr) {
      console.warn('deleteSongFromLibrary storage:', stErr.message)
    }
  }

  const { error } = await supabase.from('songs').delete().eq('id', song.id)
  return { error: error ? new Error(error.message) : null }
}

// ---------------------------------------------------------------------------
// House photos
// ---------------------------------------------------------------------------

export type HousePhotoRow = {
  id: string
  user_id: string
  display_profile_id: string | null
  storage_path: string
  public_url: string
  filename: string | null
  uploaded_at: string
}

export async function saveHousePhoto(
  userId: string,
  profileId: string | null,
  storagePath: string,
  publicUrl: string,
  filename?: string,
): Promise<{ id: string | null; error: Error | null }> {
  if (!supabase) return { id: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase
    .from('house_photos')
    .insert({
      user_id: userId,
      display_profile_id: profileId,
      storage_path: storagePath,
      public_url: publicUrl,
      filename: filename ?? null,
    })
    .select('id')
    .single()
  if (error) return { id: null, error: new Error(error.message) }
  return { id: data.id, error: null }
}

export async function loadHousePhotos(
  userId: string,
): Promise<HousePhotoRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('house_photos')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
  if (error) return []
  return data as HousePhotoRow[]
}

export async function deleteHousePhoto(
  photoId: string,
  storagePath: string,
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') }
  await supabase.storage.from('house-photos').remove([storagePath])
  const { error } = await supabase
    .from('house_photos')
    .delete()
    .eq('id', photoId)
  return { error: error ? new Error(error.message) : null }
}

// ---------------------------------------------------------------------------
// Sequences
// ---------------------------------------------------------------------------

export async function saveSequence(
  userId: string,
  songId: string,
  profileId: string | null,
  events: unknown[],
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') }
  const { error } = await supabase
    .from('sequences')
    .upsert({
      user_id: userId,
      song_id: songId,
      display_profile_id: profileId,
      events,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,song_id,display_profile_id' })
  return { error: error ? new Error(error.message) : null }
}

export async function loadSequence(
  userId: string,
  songId: string,
  profileId: string | null,
): Promise<unknown[] | null> {
  if (!supabase) return null
  let query = supabase
    .from('sequences')
    .select('events')
    .eq('user_id', userId)
    .eq('song_id', songId)
  if (profileId != null) {
    query = query.eq('display_profile_id', profileId)
  } else {
    query = query.is('display_profile_id', null)
  }
  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return data.events as unknown[]
}

// ── User Plans ───────────────────────────────────────────────────────

export type UserPlan = {
  plan: 'free' | 'pro'
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  sequenceCreditsRemaining: number
  sequenceCreditsTotal: number
}

const FREE_PLAN: UserPlan = {
  plan: 'free',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  sequenceCreditsRemaining: 0,
  sequenceCreditsTotal: 0,
}

export async function loadUserPlan(userId: string): Promise<UserPlan> {
  if (!supabase) return FREE_PLAN
  const { data, error } = await supabase
    .from('user_plans')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return FREE_PLAN
  return {
    plan: data.plan as 'free' | 'pro',
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    subscriptionStatus: data.subscription_status,
    currentPeriodEnd: data.current_period_end,
    sequenceCreditsRemaining: data.sequence_credits_remaining,
    sequenceCreditsTotal: data.sequence_credits_total,
  }
}

export async function ensureUserPlanExists(userId: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from('user_plans')
    .upsert(
      { user_id: userId, plan: 'free' },
      { onConflict: 'user_id', ignoreDuplicates: true },
    )
}
