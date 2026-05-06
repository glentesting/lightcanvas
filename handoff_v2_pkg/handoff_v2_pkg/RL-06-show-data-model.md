# RL-06 — Show Data Model (Groundwork)

Add the `parent_show_id` field to the projects table now. No UI yet. This prevents a painful migration later when we build the Show dashboard in v2.

## Why now

Every real user builds 8–12 song shows, not single songs. The dashboard needs to evolve into a Shows-first view. If we wait until v2 to add the field, we'll have thousands of projects in the database with no way to group them, and a migration becomes increasingly painful.

Adding the field now is a one-line migration. The UI comes in v2.

## Migration

```sql
-- Migration: add parent_show_id to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS parent_show_id UUID REFERENCES shows(id) ON DELETE SET NULL;

-- Also create the shows table for future use
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  season_year INTEGER,
  is_active BOOLEAN DEFAULT true,
  song_order JSONB DEFAULT '[]'::jsonb,  -- ordered array of project IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on shows
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own shows"
  ON shows FOR ALL
  USING (owner_id = auth.uid()::text)
  WITH CHECK (owner_id = auth.uid()::text);

-- Index for looking up a user's shows
CREATE INDEX IF NOT EXISTS shows_owner_id_idx ON shows(owner_id);

-- Index for looking up projects by show
CREATE INDEX IF NOT EXISTS projects_parent_show_id_idx ON projects(parent_show_id);
```

## TypeScript types

Add to `types/domain.ts`:

```typescript
export interface Show {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  seasonYear?: number;
  isActive: boolean;
  songOrder: string[];  // ordered project IDs
  createdAt: string;
  updatedAt: string;
}

// Update existing Project type to include:
export interface Project {
  // ... existing fields
  parentShowId?: string | null;
}
```

## Dashboard — no visible change yet

The dashboard still shows a flat project list for now. The `parent_show_id` field exists but is unused in the UI until V2-03. Do not add any Show UI in this slice.

## Regenerate Supabase types

After running the migration:
```bash
npx supabase gen types typescript --project-id [your-project-id] > lib/supabase/types.ts
```

## Acceptance

- Migration runs without errors on both local and production Supabase
- `shows` table exists with correct schema
- `projects.parent_show_id` column exists, nullable, references shows
- RLS policies are in place for shows table
- TypeScript types are regenerated and include Show interface
- Dashboard continues to work exactly as before — no visual change
- `next build` passes without TypeScript errors
