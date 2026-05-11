-- 004_images_bucket.sql
-- Separate bucket for house photos (not audio)

INSERT INTO storage.buckets (id, name, public)
VALUES ('lightcanvas-images', 'lightcanvas-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users can manage own images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'lightcanvas-images' AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'))
  WITH CHECK (bucket_id = 'lightcanvas-images' AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
