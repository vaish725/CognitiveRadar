
-- Create enum types
CREATE TYPE public.node_type AS ENUM ('concept', 'claim', 'assumption', 'evidence', 'question', 'contradiction');
CREATE TYPE public.edge_relation AS ENUM ('supports', 'contradicts', 'depends_on', 'example_of');
CREATE TYPE public.insight_type AS ENUM ('gap', 'contradiction', 'assumption', 'question');
CREATE TYPE public.insight_severity AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.input_type AS ENUM ('text', 'youtube', 'upload', 'audio');

-- Sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Analysis',
  input_type public.input_type NOT NULL DEFAULT 'text',
  raw_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Nodes table
CREATE TABLE public.nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  type public.node_type NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  confidence REAL DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Edges table
CREATE TABLE public.edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  relation public.edge_relation NOT NULL,
  confidence REAL DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insights table
CREATE TABLE public.insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  type public.insight_type NOT NULL,
  severity public.insight_severity NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  related_node_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- Public access policies (MVP - no auth required)
CREATE POLICY "Anyone can read sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true);

CREATE POLICY "Anyone can read nodes" ON public.nodes FOR SELECT USING (true);
CREATE POLICY "Anyone can create nodes" ON public.nodes FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read edges" ON public.edges FOR SELECT USING (true);
CREATE POLICY "Anyone can create edges" ON public.edges FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read insights" ON public.insights FOR SELECT USING (true);
CREATE POLICY "Anyone can create insights" ON public.insights FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_nodes_session ON public.nodes(session_id);
CREATE INDEX idx_edges_session ON public.edges(session_id);
CREATE INDEX idx_insights_session ON public.insights(session_id);
CREATE INDEX idx_edges_source ON public.edges(source_node_id);
CREATE INDEX idx_edges_target ON public.edges(target_node_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
