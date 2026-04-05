import { supabase } from "@/integrations/supabase/client";

export interface AnalyzeResult {
  sessionId: string;
  title: string;
  nodeCount: number;
  edgeCount: number;
  insightCount: number;
}

export async function analyzeText(content: string): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke("analyze-text", {
    body: { content },
  });

  if (error) throw new Error(error.message || "Analysis failed");
  if (data?.error) throw new Error(data.error);
  return data as AnalyzeResult;
}

export async function analyzeYouTube(url: string): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke("analyze-youtube", {
    body: { url },
  });

  if (error) throw new Error(error.message || "YouTube analysis failed");
  if (data?.error) throw new Error(data.error);
  return data as AnalyzeResult;
}

export async function analyzeUpload(file: File): Promise<AnalyzeResult> {
  const path = `anonymous/${Date.now()}-${file.name}`;
  const { error: uploadErr } = await supabase.storage.from("uploads").upload(path, file);
  if (uploadErr) throw new Error("File upload failed: " + uploadErr.message);

  const { data, error } = await supabase.functions.invoke("analyze-upload", {
    body: { storagePath: path, fileName: file.name },
  });

  if (error) throw new Error(error.message || "File analysis failed");
  if (data?.error) throw new Error(data.error);
  return data as AnalyzeResult;
}

export async function analyzeAudio(audioBlob: Blob): Promise<AnalyzeResult> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || data?.error) throw new Error(data?.error || "Audio analysis failed");
  return data as AnalyzeResult;
}

export interface SessionNode {
  id: string;
  type: string;
  label: string;
  description: string | null;
  confidence: number | null;
}

export interface SessionEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relation: string;
  confidence: number | null;
}

export interface SessionInsight {
  id: string;
  type: string;
  severity: string;
  description: string;
  related_node_ids: string[] | null;
}

export interface SessionData {
  session: { id: string; title: string; input_type: string; raw_content: string | null };
  nodes: SessionNode[];
  edges: SessionEdge[];
  insights: SessionInsight[];
}

export interface ThinkingResult {
  newInsightCount: number;
}

export async function runThinkingEngine(sessionId: string): Promise<ThinkingResult> {
  const { data, error } = await supabase.functions.invoke("thinking-engine", {
    body: { sessionId },
  });

  if (error) throw new Error(error.message || "Thinking engine failed");
  if (data?.error) throw new Error(data.error);
  return data as ThinkingResult;
}

export async function fetchSession(sessionId: string): Promise<SessionData> {
  const [sessionRes, nodesRes, edgesRes, insightsRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", sessionId).single(),
    supabase.from("nodes").select("*").eq("session_id", sessionId),
    supabase.from("edges").select("*").eq("session_id", sessionId),
    supabase.from("insights").select("*").eq("session_id", sessionId),
  ]);

  if (sessionRes.error) throw sessionRes.error;

  return {
    session: sessionRes.data,
    nodes: nodesRes.data || [],
    edges: edgesRes.data || [],
    insights: insightsRes.data || [],
  };
}
