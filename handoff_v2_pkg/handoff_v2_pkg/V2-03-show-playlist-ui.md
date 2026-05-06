# V2-03 — Show & Playlist UI

Build the Show-first dashboard. The `shows` table and `parent_show_id` field were added in RL-06. This slice builds the UI on top of that foundation.

## Dashboard redesign

**Before:** Flat list of projects (songs).
**After:** Shows at the top level, each expandable to see its songs.

### Show card
- Show name (editable inline)
- Season year badge (e.g., "2026")
- Song count ("8 songs")
- Total duration
- Active/Inactive toggle
- Options: Rename, Duplicate, Delete, Export All

### Expanded show
- Ordered list of song cards (same style as current project cards)
- Drag to reorder songs within the show
- "+ Add Song" button — creates a new project and assigns it to this show
- "Add Existing" — assign an unattached project to this show

### Unattached projects
- Section at the bottom: "Songs not in a show"
- These are projects with `parent_show_id = null`
- Option to assign to a show or create a new show from them

### Create Show dialog
- Show name
- Season year (default: current year)
- Option to start empty or start from existing projects

## Show-level export

"Export Show" on a Show card exports all songs in one ZIP:
```
Holiday_2026_Show_Export.zip
  ├── Wizards_in_Winter/
  │   ├── Wizards_in_Winter.xsq (or .lms)
  │   └── wizards.mp3
  ├── Carol_of_the_Bells/
  │   ├── Carol_of_the_Bells.xsq
  │   └── carol.mp3
  ├── xlights_rgbeffects.xml  ← shared, generated once from fixture data
  └── README.txt
```

The shared `xlights_rgbeffects.xml` is generated from the user's fixture layout (same fixture data is used across all songs in a show — the house doesn't change between songs).

## Acceptance

- Dashboard shows Shows as primary unit
- Shows expand to reveal songs
- Songs can be reordered within a show
- Unattached projects shown separately
- Show-level export generates correct ZIP structure
- rgbeffects.xml included once at show level
- Active/inactive toggle on shows works
- All existing project CRUD (create, rename, delete, duplicate) still works
