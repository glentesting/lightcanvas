-- LightShow AI - Initial Database Schema

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table songs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  file_url text not null,
  duration_seconds numeric,
  bpm numeric,
  analysis_json jsonb,
  created_at timestamptz default now()
);

create table layouts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  background_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table fixtures (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid references layouts(id) on delete cascade,
  name text not null,
  type text not null,
  coordinates jsonb not null,
  channel_start integer,
  channel_end integer,
  created_at timestamptz default now()
);

create table sequences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table effect_blocks (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references sequences(id) on delete cascade,
  fixture_id uuid references fixtures(id) on delete set null,
  start_time_ms integer not null,
  end_time_ms integer not null,
  effect_type text not null,
  params jsonb,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index idx_projects_user_id on projects(user_id);
create index idx_songs_project_id on songs(project_id);
create index idx_layouts_project_id on layouts(project_id);
create index idx_fixtures_layout_id on fixtures(layout_id);
create index idx_sequences_project_id on sequences(project_id);
create index idx_effect_blocks_sequence_id on effect_blocks(sequence_id);

-- Storage bucket for song files (run in Supabase dashboard or via CLI)
-- insert into storage.buckets (id, name, public) values ('songs', 'songs', true);
