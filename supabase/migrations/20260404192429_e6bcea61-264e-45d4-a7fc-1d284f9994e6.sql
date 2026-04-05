
CREATE POLICY "Users can delete own nodes" ON public.nodes
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = nodes.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own edges" ON public.edges
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = edges.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own insights" ON public.insights
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = insights.session_id AND sessions.user_id = auth.uid())
  );
