-- Per-user display setup: controllers, channel bank size, and prop list (JSON).
-- Run in Supabase SQL Editor, or use Supabase CLI: supabase db push

create table if not exists public.user_display_config (
  user_id uuid primary key references auth.users (id) on delete cascade,
  controllers integer not null default 3
    check (controllers >= 1 and controllers <= 999),
  channels_per_controller integer not null default 16
    check (channels_per_controller >= 1 and channels_per_controller <= 999),
  props jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_display_config is 'Saved display hardware layout for LightCanvas (per user).';

alter table public.user_display_config enable row level security;

create policy "Users can read own display config"
  on public.user_display_config
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own display config"
  on public.user_display_config
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own display config"
  on public.user_display_config
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
