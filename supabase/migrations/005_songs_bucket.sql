-- 005_songs_bucket.sql
-- Codify the `songs` storage bucket, which was manually created out-of-band
-- (predating migration 002) and is what production code actually uses for
-- audio uploads. The `lumen-audio` bucket from migration 002 is deprecated
-- and unused — it is left in place untouched for safety.
--
-- Idempotent: re-running this migration is a no-op.

-- 1. Bucket
insert into storage.buckets (id, name, public)
  values ('songs', 'songs', false)
  on conflict (id) do nothing;

-- 2. RLS policies — same shape as `lumen-audio` policies in migration 002
--    (tenant isolation via first path segment matching the Clerk JWT 'sub').
--    `create policy if not exists` is not supported in all Postgres versions,
--    so drop-and-recreate to keep things idempotent.
drop policy if exists "songs: owner read" on storage.objects;
create policy "songs: owner read" on storage.objects for select
  using (bucket_id = 'songs' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));

drop policy if exists "songs: owner write" on storage.objects;
create policy "songs: owner write" on storage.objects for insert
  with check (bucket_id = 'songs' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));

drop policy if exists "songs: owner delete" on storage.objects;
create policy "songs: owner delete" on storage.objects for delete
  using (bucket_id = 'songs' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
