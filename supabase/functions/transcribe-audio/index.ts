import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { callGemini, callGeminiText } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a knowledge graph extraction engine. Given a transcribed audio recording, extract:
1. **Nodes**: concepts, claims, assumptions, evidence, questions, and contradictions.
2. **Edges**: relationships between nodes (supports, contradicts, depends_on, example_of).
3. **Insights**: gaps in reasoning, contradictions, hidden assumptions, and open questions.

Use the tool provided.`;

const GRAPH_TOOL = {
  name: "extract_knowledge_graph",
  description: "Extract a structured knowledge graph from text",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
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
    required: ["title", "nodes", "edges", "insights"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "audio file is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert audio to base64 for Gemini multimodal
    const arrayBuf = await audioFile.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
    const mime = audioFile.type || "audio/webm";

    // Transcribe with Gemini
    const transcript = await callGeminiText({
      multimodalParts: [
        { text: "Transcribe this audio recording accurately. Return only the transcript text." },
        { inlineData: { mimeType: mime, data: base64 } },
      ],
    });

    if (transcript.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Transcript is too short. Please record a longer audio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract knowledge graph
    const graph = await callGemini({
      systemPrompt: SYSTEM_PROMPT,
      userContent: `Analyze this audio transcript:\n\n${transcript.slice(0, 15000)}`,
      tools: [GRAPH_TOOL],
      forceTool: "extract_knowledge_graph",
    }) as any;

    // Create session
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .insert({ title: graph.title || "Audio Recording Analysis", input_type: "audio", raw_content: transcript })
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
      const valid = graph.edges.filter((e: any) => tempToReal[e.source] && tempToReal[e.target]);
      if (valid.length) {
        await supabase.from("edges").insert(valid.map((e: any) => ({
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
        sessionId: sid, title: graph.title || "Audio Recording Analysis",
        nodeCount: graph.nodes?.length || 0, edgeCount: graph.edges?.length || 0,
        insightCount: graph.insights?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
