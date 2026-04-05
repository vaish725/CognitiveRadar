import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { callGemini } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const SYSTEM_PROMPT = `You are a knowledge graph extraction engine. You will be given a YouTube video URL. Watch/analyze the video and extract:
1. **Nodes**: concepts, claims, assumptions, evidence, questions, and contradictions found in the video.
2. **Edges**: relationships between nodes (supports, contradicts, depends_on, example_of).
3. **Insights**: gaps in reasoning, contradictions, hidden assumptions, and open questions.
4. **Transcript**: A summary of the video content (at least 500 words).

Use the tool provided to return the structured data.`;

const GRAPH_TOOL = {
  name: "extract_knowledge_graph",
  description: "Extract a structured knowledge graph from a YouTube video",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "A short title summarizing the content (max 60 chars)" },
      transcript_summary: { type: "string", description: "A detailed summary of the video content (500+ words)" },
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            temp_id: { type: "string" },
            type: { type: "string", enum: ["concept", "claim", "assumption", "evidence", "question", "contradiction"] },
            label: { type: "string" },
            description: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["temp_id", "type", "label", "description", "confidence"],
        },
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: { type: "string" },
            target: { type: "string" },
            relation: { type: "string", enum: ["supports", "contradicts", "depends_on", "example_of"] },
            confidence: { type: "number" },
          },
          required: ["source", "target", "relation", "confidence"],
        },
      },
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["gap", "contradiction", "assumption", "question"] },
            severity: { type: "string", enum: ["high", "medium", "low"] },
            description: { type: "string" },
            related_temp_ids: { type: "array", items: { type: "string" } },
          },
          required: ["type", "severity", "description", "related_temp_ids"],
        },
      },
    },
    required: ["title", "transcript_summary", "nodes", "edges", "insights"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "YouTube URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get video title
    const titleRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const titleData = await titleRes.json();
    const videoTitle = titleData.title || "YouTube Analysis";

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Call Google Gemini directly
    const graph = await callGemini({
      systemPrompt: SYSTEM_PROMPT,
      userContent: `Analyze this YouTube video and extract the knowledge graph. Video URL: ${youtubeUrl}\n\nVideo title: ${videoTitle}`,
      tools: [GRAPH_TOOL],
      forceTool: "extract_knowledge_graph",
    }) as any;

    const transcript = graph.transcript_summary || `Analysis of: ${videoTitle}`;

    // Create session
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .insert({ title: graph.title || videoTitle, input_type: "youtube", raw_content: transcript })
      .select("id")
      .single();
    if (sessionErr) throw sessionErr;
    const sid = session.id;

    // Insert nodes
    const tempToReal: Record<string, string> = {};
    if (graph.nodes?.length) {
      const { data: insertedNodes, error: nodesErr } = await supabase
        .from("nodes")
        .insert(graph.nodes.map((n: any) => ({
          session_id: sid, type: n.type, label: n.label, description: n.description, confidence: n.confidence,
        })))
        .select("id");
      if (nodesErr) throw nodesErr;
      graph.nodes.forEach((n: any, i: number) => { tempToReal[n.temp_id] = insertedNodes[i].id; });
    }

    if (graph.edges?.length) {
      const validEdges = graph.edges.filter((e: any) => tempToReal[e.source] && tempToReal[e.target]);
      if (validEdges.length) {
        await supabase.from("edges").insert(validEdges.map((e: any) => ({
          session_id: sid, source_node_id: tempToReal[e.source], target_node_id: tempToReal[e.target],
          relation: e.relation, confidence: e.confidence,
        })));
      }
    }

    if (graph.insights?.length) {
      await supabase.from("insights").insert(graph.insights.map((i: any) => ({
        session_id: sid, type: i.type, severity: i.severity, description: i.description,
        related_node_ids: (i.related_temp_ids || []).map((t: string) => tempToReal[t]).filter(Boolean),
      })));
    }

    return new Response(
      JSON.stringify({
        sessionId: sid, title: graph.title || videoTitle,
        nodeCount: graph.nodes?.length || 0, edgeCount: graph.edges?.length || 0,
        insightCount: graph.insights?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-youtube error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
