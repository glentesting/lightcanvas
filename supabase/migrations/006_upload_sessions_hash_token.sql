-- 006_upload_sessions_hash_token.sql
-- Security fix: store only the SHA-256 hash of the upload token, not the
-- plaintext value. The desktop client subscribes to upload_sessions row
-- changes via Supabase Realtime using the anon key (RLS allows public
-- SELECT). With the plaintext token stored in the row, that meant any
-- anon client could read active tokens and POST a forged upload to
-- /api/mobile-upload/<token>. Storing only the hash means even a full
-- table read leaks nothing useful — the bearer token only exists in the
-- response to the desktop session-creation call.
--
-- No backfill needed: the table was created in migration 005 today and
-- has zero rows in production yet.

alter table upload_sessions drop column token;
alter table upload_sessions add column token_hash text not null;
create unique index idx_upload_sessions_token_hash on upload_sessions(token_hash);
