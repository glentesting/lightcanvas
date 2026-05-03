# 01 — Supabase Schema, RLS, Storage

The user already has Supabase wired up with Clerk JWT integration. You're adding tables, policies, and storage buckets on top.

## Migration files

Create these in `supabase/migrations/` in order. Use the timestamp prefix Supabase generates.

### `xxxx_lumen_init.sql`

```sql
-- Lumen schema. Auth: Clerk JWT, user id is auth.jwt() ->> 'sub' (text).

create extension if not exists "pgcrypto";

-- Projects: top-level container
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null,           -- Clerk user id
  name          text not null,
  audio_url     text,                    -- Supabase Storage path
  audio_file    text,                    -- original filename
  audio         jsonb,                   -- AudioAnalysis (duration, bpm, beats[], onsets[])
  fixtures      jsonb not null default '[]'::jsonb,
  groups        jsonb not null default '[]'::jsonb,
  sequence      jsonb not null default '{"tracks":[],"blocks":[],"bpm":120,"beatGridOffset":0}'::jsonb,
  house_template text not null default 'default',
  house_custom_svg text,
  thumbnail_url text,                    -- generated on save
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index projects_owner_idx on public.projects(owner_id);
create index projects_updated_idx on public.projects(updated_at desc);

-- Triggers: bump updated_at on every UPDATE
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger projects_touch
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- RLS: every row scoped to its owner via Clerk JWT sub claim
alter table public.projects enable row level security;

create policy "owner reads own projects"
  on public.projects for select
  using (owner_id = (auth.jwt() ->> 'sub'));

create policy "owner inserts own projects"
  on public.projects for insert
  with check (owner_id = (auth.jwt() ->> 'sub'));

create policy "owner updates own projects"
  on public.projects for update
  using (owner_id = (auth.jwt() ->> 'sub'))
  with check (owner_id = (auth.jwt() ->> 'sub'));

create policy "owner deletes own projects"
  on public.projects for delete
  using (owner_id = (auth.jwt() ->> 'sub'));

-- Fixture library: optional shared catalog of fixture templates
create table public.fixture_templates (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,             -- 'roofline' | 'mega-tree' | …
  name        text not null,
  pixel_count int not null,
  preview_svg text,                      -- inline SVG
  is_public   boolean not null default true,
  owner_id    text                       -- null if built-in
);

alter table public.fixture_templates enable row level security;

create policy "anyone reads public templates"
  on public.fixture_templates for select
  using (is_public or owner_id = (auth.jwt() ->> 'sub'));

-- Seed the 6 built-in fixture kinds (run once)
insert into public.fixture_templates (kind, name, pixel_count, is_public) values
  ('roofline',       'Roofline strip',  220, true),
  ('mega-tree',      'Mega tree',       480, true),
  ('mini-tree',      'Mini tree',        50, true),
  ('arch',           'Arch',             50, true),
  ('bush',           'Bush wrap',        60, true),
  ('window-outline', 'Window outline',   32, true);
```

## Storage buckets

Create in `supabase/migrations/xxxx_lumen_storage.sql` or via Supabase dashboard:

```sql
-- Audio bucket: private, owner-scoped
insert into storage.buckets (id, name, public) values ('lumen-audio', 'lumen-audio', false);

-- Thumbnails: public-read so dashboard cards can render without signed URLs
insert into storage.buckets (id, name, public) values ('lumen-thumbnails', 'lumen-thumbnails', true);

-- Custom house SVGs: private
insert into storage.buckets (id, name, public) values ('lumen-houses', 'lumen-houses', false);

-- Object policies: path is `{owner_id}/{project_id}/...`
create policy "audio: owner read" on storage.objects for select
  using (bucket_id = 'lumen-audio' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy "audio: owner write" on storage.objects for insert
  with check (bucket_id = 'lumen-audio' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy "audio: owner delete" on storage.objects for delete
  using (bucket_id = 'lumen-audio' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));

-- Same pattern for lumen-houses; thumbnails are public-read so only insert/delete need policies.
```

## Generated types

After running migrations:

```bash
npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
```

Then `types/database.ts` re-exports `Database` and convenience aliases:

```ts
import type { Database } from '@/lib/supabase/types';
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
```

## Acceptance

- [ ] Migrations apply cleanly to a fresh DB
- [ ] Signed-in user A cannot SELECT user B's project (verify with two browsers)
- [ ] Audio upload to `lumen-audio/{userA}/...` from user B's session is rejected by RLS
- [ ] `fixture_templates` has the 6 built-in rows after seed
