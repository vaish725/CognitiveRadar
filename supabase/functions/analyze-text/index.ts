import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { saveGraph } from "../_shared/save-graph.ts";
import { INSIGHT_TYPE_DESC, NODE_TYPE_DESC, ONTOLOGY_GUIDE, RELATION_DESC, SEVERITY_DESC } from "../_shared/ontology.ts";
import { callGemini } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a knowledge graph extraction engine. Given text input, extract:
1. **Nodes**: concepts, claims, assumptions, evidence, questions, and contradictions found in the text.
2. **Edges**: relationships between nodes (supports, contradicts, depends_on, example_of).
3. **Insights**: gaps in reasoning, contradictions, hidden assumptions, and open questions.

Return structured data using the tool provided.${ONTOLOGY_GUIDE}`;

const GRAPH_TOOL = {
  name: "extract_knowledge_graph",
  description: "Extract a structured knowledge graph from text",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "A short title summarizing the text (max 60 chars)" },
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            temp_id: { type: "string", description: "Temporary ID like n1, n2, etc." },
            type: { type: "string", enum: ["concept", "claim", "assumption", "evidence", "question", "contradiction"], description: NODE_TYPE_DESC },
            label: { type: "string", description: "Short label (2-5 words)" },
            description: { type: "string", description: "One sentence explanation" },
            confidence: { type: "number", description: "0-1 confidence score" },
          },
          required: ["temp_id", "type", "label", "description", "confidence"],
        },
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: { type: "string", description: "temp_id of source node" },
            target: { type: "string", description: "temp_id of target node" },
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
    const { content } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Content must be at least 20 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call Google Gemini directly
    const graph = await callGemini({
      systemPrompt: SYSTEM_PROMPT,
      userContent: `Analyze this text and extract the knowledge graph:\n\n${content}`,
      tools: [GRAPH_TOOL],
      forceTool: "extract_knowledge_graph",
    }) as any;

    const saved = await saveGraph(
      supabase,
      { title: graph.title || "Untitled Analysis", input_type: "text", raw_content: content },
      graph,
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
    console.error("analyze-text error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
