-- LightCanvas Phase 1 — display profiles, props, songs
-- Run once in Supabase SQL Editor (or via Supabase CLI: supabase db push)

-- ---------------------------------------------------------------------------
-- Optional: remove legacy single-table prototype (JSONB props) if it exists
-- ---------------------------------------------------------------------------
drop table if exists public.user_display_config;

-- ---------------------------------------------------------------------------
-- Display profiles (per user: controller count + channels per controller)
-- ---------------------------------------------------------------------------
create table public.display_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'My display',
  controllers integer not null default 3
    check (controllers >= 1 and controllers <= 999),
  channels_per_controller integer not null default 16
    check (channels_per_controller >= 1 and channels_per_controller <= 999),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.display_profiles is 'User display hardware layout (controller count and channel bank size).';

create index display_profiles_user_id_idx on public.display_profiles (user_id);

-- At most one default profile per user (optional; app can set is_default when creating the first profile)
create unique index display_profiles_one_default_per_user
  on public.display_profiles (user_id)
  where is_default = true;

-- ---------------------------------------------------------------------------
-- Props (belong to a display profile; ownership enforced via profile.user_id)
-- ---------------------------------------------------------------------------
create table public.display_props (
  id uuid primary key default gen_random_uuid(),
  display_profile_id uuid not null references public.display_profiles (id) on delete cascade,
  name text not null,
  type text not null,
  channels integer not null
    check (channels >= 1 and channels <= 10000),
  controller text not null,
  start_channel integer not null
    check (start_channel >= 1),
  priority text not null default 'General',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.display_props is 'Light/prop assignments for a display profile.';
comment on column public.display_props.controller is 'Human-readable controller label, e.g. Controller A.';
comment on column public.display_props.start_channel is 'Starting channel number for this prop.';

create index display_props_profile_id_idx on public.display_props (display_profile_id);

-- ---------------------------------------------------------------------------
-- Songs (per user)
-- ---------------------------------------------------------------------------
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  duration_seconds integer not null default 0
    check (duration_seconds >= 0),
  bpm integer
    check (bpm is null or (bpm >= 1 and bpm <= 999)),
  status text not null default 'Uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.songs is 'Uploaded or library songs for sequencing.';

create index songs_user_id_idx on public.songs (user_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger display_profiles_set_updated_at
  before update on public.display_profiles
  for each row execute function public.set_updated_at();

create trigger display_props_set_updated_at
  before update on public.display_props
  for each row execute function public.set_updated_at();

create trigger songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.display_profiles enable row level security;
alter table public.display_props enable row level security;
alter table public.songs enable row level security;

-- display_profiles: users only see and manage their own rows
create policy "display_profiles_select_own"
  on public.display_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "display_profiles_insert_own"
  on public.display_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "display_profiles_update_own"
  on public.display_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "display_profiles_delete_own"
  on public.display_profiles
  for delete
  to authenticated
  using (user_id = auth.uid());

-- display_props: only if the parent profile belongs to the current user
create policy "display_props_select_own"
  on public.display_props
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.display_profiles p
      where p.id = display_props.display_profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "display_props_insert_own"
  on public.display_props
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.display_profiles p
      where p.id = display_props.display_profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "display_props_update_own"
  on public.display_props
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.display_profiles p
      where p.id = display_props.display_profile_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.display_profiles p
      where p.id = display_props.display_profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "display_props_delete_own"
  on public.display_props
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.display_profiles p
      where p.id = display_props.display_profile_id
        and p.user_id = auth.uid()
    )
  );

-- songs: users only see and manage their own rows
create policy "songs_select_own"
  on public.songs
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "songs_insert_own"
  on public.songs
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "songs_update_own"
  on public.songs
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "songs_delete_own"
  on public.songs
  for delete
  to authenticated
  using (user_id = auth.uid());
