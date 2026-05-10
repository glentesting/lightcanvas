import type { Fixture, FixtureGroup } from "@/lib/fixtures/types";
import type { Sequence } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";

export type { Fixture, FixtureGroup } from "@/lib/fixtures/types";
export type { EffectBlock, Track, Sequence, EffectId, EffectParams, Easing } from "@/lib/timeline/types";
export type { AudioAnalysis } from "@/lib/audio/types";

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  audioUrl: string | null;
  audioFile: string | null;
  audio: AudioAnalysis | null;
  fixtures: Fixture[];
  groups: FixtureGroup[];
  sequence: Sequence;
  houseTemplate: string;
  houseCustomSvg?: string;
  parentShowId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Show {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  seasonYear?: number;
  isActive: boolean;
  songOrder: string[];
  createdAt: string;
  updatedAt: string;
}

/** Maps a Supabase row to our domain Project type */
export function projectFromRow(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    audioUrl: (row.audio_url as string) || null,
    audioFile: (row.audio_file as string) || null,
    audio: (row.audio as AudioAnalysis) || null,
    fixtures: (row.fixtures as Fixture[]) || [],
    groups: (row.groups as FixtureGroup[]) || [],
    sequence: (row.sequence as Sequence) || { tracks: [], blocks: [], bpm: 120, beatGridOffset: 0 },
    houseTemplate: (row.house_template as string) || "default",
    houseCustomSvg: row.house_custom_svg as string | undefined,
    parentShowId: (row.parent_show_id as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
