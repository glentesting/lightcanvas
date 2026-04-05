-- Persisted audio analysis summary + sections on songs (Phase 2)
-- Each statement is idempotent (IF NOT EXISTS on the column).

alter table public.songs
  add column if not exists beat_confidence integer
    check (beat_confidence is null or (beat_confidence >= 0 and beat_confidence <= 100));

alter table public.songs
  add column if not exists bass_strength integer
    check (bass_strength is null or (bass_strength >= 0 and bass_strength <= 100));

alter table public.songs
  add column if not exists treble_strength integer
    check (treble_strength is null or (treble_strength >= 0 and treble_strength <= 100));

alter table public.songs
  add column if not exists vocal_confidence integer
    check (vocal_confidence is null or (vocal_confidence >= 0 and vocal_confidence <= 100));

alter table public.songs
  add column if not exists dynamics integer
    check (dynamics is null or (dynamics >= 0 and dynamics <= 100));

alter table public.songs
  add column if not exists detected_bpm integer
    check (detected_bpm is null or (detected_bpm >= 1 and detected_bpm <= 999));

alter table public.songs
  add column if not exists sections jsonb;

comment on column public.songs.beat_confidence is 'Saved beat/onset confidence % from last successful analysis (null = never analyzed).';
comment on column public.songs.bass_strength is 'Saved bass strength % from last successful analysis.';
comment on column public.songs.treble_strength is 'Saved treble strength % from last successful analysis.';
comment on column public.songs.vocal_confidence is 'Saved vocal confidence % from last successful analysis.';
comment on column public.songs.dynamics is 'Saved dynamics % from last successful analysis.';
comment on column public.songs.detected_bpm is 'Tempo from last successful analysis.';
comment on column public.songs.sections is 'JSON array of section objects {name,start,end,energy,vocals} from last analysis.';
