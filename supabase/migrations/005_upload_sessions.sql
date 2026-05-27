-- 005_upload_sessions.sql
-- Temporary upload sessions for the "scan QR with phone" house-photo flow.
--
-- Flow:
--   1. Desktop creates a row (owner_id = Clerk userId, token = random 32 chars).
--   2. Desktop renders a QR code pointing to /mobile-upload/<token>.
--   3. Phone opens that URL, posts a photo to /api/mobile-upload/<token>.
--   4. Server validates token, uploads to lightcanvas-images, updates this row
--      (status='uploaded', photo_url=<public url>) AND updates projects.house_custom_svg.
--   5. Desktop is subscribed via Supabase Realtime to this row's UPDATE events,
--      sees status flip, refreshes the house photo in the editor.

create table upload_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  owner_id text not null,                 -- Clerk user id of desktop user
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null default 'house_photo',
  status text not null default 'pending', -- pending | uploaded | expired
  photo_url text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_upload_sessions_token on upload_sessions(token);
create index idx_upload_sessions_project on upload_sessions(project_id);
create index idx_upload_sessions_expires on upload_sessions(expires_at);

alter table upload_sessions enable row level security;

-- Realtime subscribers (browser using the anon key) need to be able to SELECT
-- the row they care about. The session id is itself an unguessable uuid and
-- the token is unguessable; rows are short-lived (15 min). Allowing public
-- SELECT is acceptable here — the row contains a URL + status, no PII.
create policy "anyone can read upload sessions"
  on upload_sessions for select
  using (true);

-- Add upload_sessions to the realtime publication so UPDATE events fire.
alter publication supabase_realtime add table upload_sessions;
