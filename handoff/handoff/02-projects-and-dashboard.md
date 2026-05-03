# 02 — Projects & Dashboard

## Routes

- `GET /dashboard` — list current user's projects, sorted by `updated_at desc`
- `POST` (server action) — create project
- `DELETE` (server action) — delete project
- `PATCH` (server action) — rename, duplicate

## Server actions (`app/(app)/dashboard/actions.ts`)

```ts
'use server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createSchema = z.object({ name: z.string().min(1).max(80) });

export async function createProject(input: z.infer<typeof createSchema>) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');
  const data = createSchema.parse(input);
  const supabase = createServerClient();

  // Seed with the 6 default fixtures so the editor isn't empty
  const defaultFixtures = await getDefaultFixtures(supabase);

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      owner_id: userId,
      name: data.name,
      fixtures: defaultFixtures,
      sequence: { tracks: defaultFixtures.map(f => ({ id: f.id, kind: 'fixture' })), blocks: [], bpm: 120, beatGridOffset: 0 },
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/dashboard');
  return project;
}

export async function deleteProject(id: string) { /* … */ }
export async function renameProject(id: string, name: string) { /* … */ }
export async function duplicateProject(id: string) { /* … */ }
```

## Dashboard UI

Match the prototype exactly:
- Top bar: logo (left), search (center), "+ New project" primary button (right)
- Empty state: large illustration + "Create your first show" CTA
- Project grid: cards with thumbnail, name, last-edited timestamp, fixture count, "Open" button
- Card hover: reveal "..." menu → Rename / Duplicate / Export / Delete

```tsx
// app/(app)/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { ProjectCard } from './_components/project-card';
import { NewProjectDialog } from './_components/new-project-dialog';

export default async function DashboardPage() {
  const { userId } = auth();
  const supabase = createServerClient();
  const { data: projects } = await supabase
    .from('projects').select('*').order('updated_at', { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Your shows</h1>
        <NewProjectDialog />
      </header>
      {projects?.length === 0 ? <EmptyState /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}
```

## Project card

Thumbnail strategy: when the editor autosaves, capture a small PNG of the Preview canvas at `t = 8s` and upload to `lumen-thumbnails/{userId}/{projectId}.png`. If no thumbnail yet, render a CSS gradient based on the first effect block's color.

## New project dialog

shadcn `<Dialog>`. Fields:
- Name (required)
- Starter (radio): "Empty" / "Demo: Wizards in Winter" — Demo seeds the project with the SEQ data from the prototype's `editor-data.jsx`

## Onboarding flow (`/onboarding`)

3 steps from the prototype:
1. **What are you decorating?** — radio: House / Yard / Both
2. **Roughly how many lights?** — slider 100–10,000
3. **Got an audio file ready?** — file upload (optional, can skip)

On finish: `clerkClient.users.updateUser(userId, { publicMetadata: { onboardingComplete: true } })`. Middleware redirects to `/onboarding` if metadata is missing.

If a song was uploaded in step 3, create a project with that song already attached and route to its editor.

## Acceptance

- [ ] Brand-new user lands on `/onboarding`, completes it, lands on `/dashboard`
- [ ] Creating a project routes to `/projects/[id]/edit`
- [ ] Deleting a project removes both DB row AND the audio file in Storage
- [ ] Rename is optimistic (updates UI immediately, rolls back on error)
- [ ] User B cannot see User A's projects in the URL `/projects/{A's id}/edit` (404 from RLS-empty SELECT)
