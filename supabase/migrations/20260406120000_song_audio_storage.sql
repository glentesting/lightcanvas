-- Song audio files in Storage + columns on public.songs
-- Run in Supabase SQL Editor after Phase 1 migrations.

-- ---------------------------------------------------------------------------
-- Songs table: link to Storage object
-- ---------------------------------------------------------------------------
alter table public.songs
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists original_filename text;

comment on column public.songs.storage_bucket is 'Supabase Storage bucket id (e.g. song-audio).';
comment on column public.songs.storage_path is 'Object path within the bucket, e.g. {user_id}/{song_id}.mp3';
comment on column public.songs.original_filename is 'Filename as chosen on the user device.';

-- ---------------------------------------------------------------------------
-- Private bucket for per-user audio (path prefix = auth user id)
-- ---------------------------------------------------------------------------
-- allowed_mime_types left null so browsers that omit or vary MIME type still work; size limit only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('song-audio', 'song-audio', false, 52428800, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage RLS: users only access objects under their user id folder
-- Path must be: {auth.uid()}/...
-- ---------------------------------------------------------------------------
drop policy if exists "song_audio_select_own" on storage.objects;
drop policy if exists "song_audio_insert_own" on storage.objects;
drop policy if exists "song_audio_update_own" on storage.objects;
drop policy if exists "song_audio_delete_own" on storage.objects;

create policy "song_audio_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'song-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "song_audio_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'song-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "song_audio_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'song-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'song-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "song_audio_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'song-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );
