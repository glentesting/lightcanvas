-- 005_songs_bucket_rls.sql
-- Create RLS policies for the "songs" storage bucket used by the app.
--
-- NOTE: Migration 002 (002_lumen_schema.sql) created "lumen-audio", "lumen-thumbnails",
-- and "lumen-houses" buckets with corresponding RLS policies. Those buckets are dead
-- code — the app has always used "songs" (and "lightcanvas-images") instead.
-- The policies below cover the actual buckets in use.

-- 1. Ensure the "songs" bucket exists (private, not public)
insert into storage.buckets (id, name, public)
  values ('songs', 'songs', false)
  on conflict (id) do update set public = false;

-- 2. RLS policies for the "songs" bucket
--    Objects are stored under {user_id}/{project_id}/{filename}
--    so (storage.foldername(name))[1] is the owner's Clerk user id.

-- Allow authenticated users to read their own audio files
create policy "songs: owner read"
  on storage.objects for select
  using (
    bucket_id = 'songs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

-- Allow authenticated users to upload into their own folder
create policy "songs: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'songs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

-- Allow authenticated users to replace their own audio files
create policy "songs: owner update"
  on storage.objects for update
  using (
    bucket_id = 'songs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

-- Allow authenticated users to delete their own audio files
create policy "songs: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'songs'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
