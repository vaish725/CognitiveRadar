import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { saveGraph } from "../_shared/save-graph.ts";
import { INSIGHT_TYPE_DESC, NODE_TYPE_DESC, ONTOLOGY_GUIDE, RELATION_DESC, SEVERITY_DESC } from "../_shared/ontology.ts";
import { MAX_INLINE_BYTES, toBase64 } from "../_shared/base64.ts";
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

Use the tool provided.${ONTOLOGY_GUIDE}`;

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
            type: { type: "string", enum: ["concept", "claim", "assumption", "evidence", "question", "contradiction"], description: NODE_TYPE_DESC },
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
            relation: { type: "string", enum: ["supports", "contradicts", "depends_on", "example_of"], description: RELATION_DESC },
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
            type: { type: "string", enum: ["gap", "contradiction", "assumption", "question"], description: INSIGHT_TYPE_DESC },
            severity: { type: "string", enum: ["high", "medium", "low"], description: SEVERITY_DESC },
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
    if (audioFile.size > MAX_INLINE_BYTES) {
      return new Response(
        JSON.stringify({ error: "Recording is too long. Please keep it under about 14 MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const arrayBuf = await audioFile.arrayBuffer();
    const base64 = toBase64(arrayBuf);
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

    const saved = await saveGraph(
      supabase,
      { title: graph.title || "Audio Recording Analysis", input_type: "audio", raw_content: transcript },
      graph, { totalChars: transcript.length, analyzedChars: Math.min(transcript.length, 15000) },
    );

    return new Response(
      JSON.stringify({
        sessionId: saved.sessionId,
        title: saved.title,
        nodeCount: saved.validation.nodes.saved,
        edgeCount: saved.validation.edges.saved,
        insightCount: saved.validation.insights.saved,
        validation: saved.validation,
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
