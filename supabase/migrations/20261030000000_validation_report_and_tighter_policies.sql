-- 1. Store what validation rejected for each analysis, so the UI can show it.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS validation jsonb;

-- 2. The browser only reads and deletes. All writes go through edge functions,
--    which use the service-role key, so anonymous insert/update is unnecessary.
DROP POLICY IF EXISTS "Public insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "Public update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Public insert nodes" ON public.nodes;
DROP POLICY IF EXISTS "Public insert edges" ON public.edges;
DROP POLICY IF EXISTS "Public insert insights" ON public.insights;

-- 3. Uploads: the app has no sign-in, so the per-user storage policies from the
--    auth migration blocked every upload. Allow anonymous uploads into the
--    anonymous/ folder only; the edge function reads them with the service role.
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
CREATE POLICY "Anonymous uploads to anonymous folder" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'anonymous');

-- 4. Files are sent to Gemini inline (base64, ~33% larger, ~20 MB request cap),
--    so cap uploads at 14 MB instead of 20 MB.
UPDATE storage.buckets SET file_size_limit = 14680064 WHERE id = 'uploads';
