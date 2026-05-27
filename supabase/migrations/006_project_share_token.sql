-- Add share token columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz;

-- Index for fast lookups by share token
CREATE INDEX IF NOT EXISTS projects_share_token_idx ON projects (share_token)
  WHERE share_token IS NOT NULL;
