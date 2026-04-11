CREATE TABLE public.sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  display_profile_id uuid REFERENCES public.display_profiles(id)
    ON DELETE SET NULL,
  events jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id, display_profile_id)
);

CREATE INDEX sequences_user_song_idx
  ON public.sequences(user_id, song_id);

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sequences_select_own"
  ON public.sequences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sequences_insert_own"
  ON public.sequences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sequences_update_own"
  ON public.sequences FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sequences_delete_own"
  ON public.sequences FOR DELETE TO authenticated
  USING (user_id = auth.uid());
