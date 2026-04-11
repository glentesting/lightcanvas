ALTER TABLE public.display_profiles
ADD COLUMN IF NOT EXISTS photo_url text;

comment on column public.display_profiles.photo_url
is 'Persisted URL of uploaded house photo background.';
