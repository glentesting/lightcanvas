-- 002_lumen_schema.sql
-- Migrate from multi-table to single-table JSONB project model.

-- 1. Add new columns to the existing projects table
alter table public.projects
  rename column user_id to owner_id;

alter table public.projects
  add column if not exists audio_url text,
  add column if not exists audio_file text,
  add column if not exists audio jsonb,
  add column if not exists fixtures jsonb not null default '[]'::jsonb,
  add column if not exists groups jsonb not null default '[]'::jsonb,
  add column if not exists sequence jsonb not null default '{"tracks":[],"blocks":[],"bpm":120,"beatGridOffset":0}'::jsonb,
  add column if not exists house_template text not null default 'default',
  add column if not exists house_custom_svg text,
  add column if not exists thumbnail_url text;

-- 2. Drop the description column (not in the new model)
alter table public.projects drop column if exists description;

-- 3. Update indexes
drop index if exists idx_projects_user_id;
create index if not exists projects_owner_idx on public.projects(owner_id);
create index if not exists projects_updated_idx on public.projects(updated_at desc);

-- 4. Auto-update trigger for updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- 5. RLS policies
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

-- 6. Fixture templates (shared catalog)
create table if not exists public.fixture_templates (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  name        text not null,
  pixel_count int not null,
  preview_svg text,
  is_public   boolean not null default true,
  owner_id    text
);

alter table public.fixture_templates enable row level security;

create policy "anyone reads public templates"
  on public.fixture_templates for select
  using (is_public or owner_id = (auth.jwt() ->> 'sub'));

-- Seed built-in fixtures
insert into public.fixture_templates (kind, name, pixel_count, is_public) values
  ('roofline',       'Roofline strip',  220, true),
  ('mega-tree',      'Mega tree',       480, true),
  ('mini-tree',      'Mini tree',        50, true),
  ('arch',           'Arch',             50, true),
  ('bush',           'Bush wrap',        60, true),
  ('window-outline', 'Window outline',   32, true);

-- 7. Storage buckets
insert into storage.buckets (id, name, public)
  values ('lumen-audio', 'lumen-audio', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('lumen-thumbnails', 'lumen-thumbnails', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('lumen-houses', 'lumen-houses', false)
  on conflict (id) do nothing;

-- Storage object policies
create policy "audio: owner read" on storage.objects for select
  using (bucket_id = 'lumen-audio' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy "audio: owner write" on storage.objects for insert
  with check (bucket_id = 'lumen-audio' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy "audio: owner delete" on storage.objects for delete
  using (bucket_id = 'lumen-audio' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));

-- 8. Drop legacy tables
drop table if exists effect_blocks cascade;
drop table if exists fixtures cascade;
drop table if exists sequences cascade;
drop table if exists layouts cascade;
drop table if exists songs cascade;
