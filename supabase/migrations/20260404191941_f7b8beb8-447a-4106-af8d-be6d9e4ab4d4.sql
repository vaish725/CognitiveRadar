
-- Add user_id column to sessions
ALTER TABLE public.sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop old permissive policies on sessions
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;

-- New RLS for sessions: users see only their own
CREATE POLICY "Users can read own sessions" ON public.sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Drop old permissive policies on nodes
DROP POLICY IF EXISTS "Anyone can create nodes" ON public.nodes;
DROP POLICY IF EXISTS "Anyone can read nodes" ON public.nodes;

-- Nodes: read via session ownership
CREATE POLICY "Users can read own nodes" ON public.nodes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = nodes.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can create nodes" ON public.nodes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = nodes.session_id AND sessions.user_id = auth.uid())
  );

-- Drop old permissive policies on edges
DROP POLICY IF EXISTS "Anyone can create edges" ON public.edges;
DROP POLICY IF EXISTS "Anyone can read edges" ON public.edges;

CREATE POLICY "Users can read own edges" ON public.edges
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = edges.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can create edges" ON public.edges
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = edges.session_id AND sessions.user_id = auth.uid())
  );

-- Drop old permissive policies on insights
DROP POLICY IF EXISTS "Anyone can create insights" ON public.insights;
DROP POLICY IF EXISTS "Anyone can read insights" ON public.insights;

CREATE POLICY "Users can read own insights" ON public.insights
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = insights.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can create insights" ON public.insights
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = insights.session_id AND sessions.user_id = auth.uid())
  );

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('uploads', 'uploads', false, 20971520);

-- Storage RLS
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
