-- 003_shows_table.sql
-- Create shows table and add parent_show_id to projects
-- Groundwork for v2 Show dashboard (no UI yet)

-- Create the shows table
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  season_year INTEGER,
  is_active BOOLEAN DEFAULT true,
  song_order JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on shows
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own shows"
  ON shows FOR ALL
  USING (owner_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

-- Indexes
CREATE INDEX IF NOT EXISTS shows_owner_id_idx ON shows(owner_id);

-- Add parent_show_id to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS parent_show_id UUID REFERENCES shows(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_parent_show_id_idx ON projects(parent_show_id);
