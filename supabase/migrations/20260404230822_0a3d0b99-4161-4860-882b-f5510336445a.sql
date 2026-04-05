
-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can create own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can read own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;

DROP POLICY IF EXISTS "Users can create nodes" ON public.nodes;
DROP POLICY IF EXISTS "Users can read own nodes" ON public.nodes;
DROP POLICY IF EXISTS "Users can delete own nodes" ON public.nodes;

DROP POLICY IF EXISTS "Users can create edges" ON public.edges;
DROP POLICY IF EXISTS "Users can read own edges" ON public.edges;
DROP POLICY IF EXISTS "Users can delete own edges" ON public.edges;

DROP POLICY IF EXISTS "Users can create insights" ON public.insights;
DROP POLICY IF EXISTS "Users can read own insights" ON public.insights;
DROP POLICY IF EXISTS "Users can delete own insights" ON public.insights;

-- Allow anonymous (public) access to all tables
CREATE POLICY "Public read sessions" ON public.sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert sessions" ON public.sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update sessions" ON public.sessions FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Public delete sessions" ON public.sessions FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Public read nodes" ON public.nodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert nodes" ON public.nodes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public delete nodes" ON public.nodes FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Public read edges" ON public.edges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert edges" ON public.edges FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public delete edges" ON public.edges FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Public read insights" ON public.insights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert insights" ON public.insights FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public delete insights" ON public.insights FOR DELETE TO anon, authenticated USING (true);

-- Make user_id nullable default null (no longer required)
ALTER TABLE public.sessions ALTER COLUMN user_id SET DEFAULT null;
