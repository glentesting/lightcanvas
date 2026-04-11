CREATE TABLE public.house_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_profile_id uuid REFERENCES public.display_profiles(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  filename text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX house_photos_user_id_idx ON public.house_photos(user_id);
CREATE INDEX house_photos_profile_id_idx ON public.house_photos(display_profile_id);

ALTER TABLE public.house_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "house_photos_select_own"
ON public.house_photos FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "house_photos_insert_own"
ON public.house_photos FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "house_photos_delete_own"
ON public.house_photos FOR DELETE TO authenticated
USING (user_id = auth.uid());

COMMENT ON TABLE public.house_photos IS
'Uploaded house background photos per user. Multiple photos allowed.';
