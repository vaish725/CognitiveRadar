import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
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

Return structured data using the tool provided.`;

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
            type: { type: "string", enum: ["concept", "claim", "assumption", "evidence", "question", "contradiction"] },
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
    const { content, sessionId } = await req.json();

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

    // Create or update session
    let sid = sessionId;
    if (!sid) {
      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .insert({ title: graph.title || "Untitled Analysis", input_type: "text", raw_content: content })
        .select("id")
        .single();
      if (sessionErr) throw sessionErr;
      sid = session.id;
    } else {
      await supabase.from("sessions").update({ title: graph.title, raw_content: content }).eq("id", sid);
    }

    // Insert nodes and build temp_id → real_id map
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

    // Insert edges
    if (graph.edges?.length) {
      const validEdges = graph.edges.filter((e: any) => tempToReal[e.source] && tempToReal[e.target]);
      if (validEdges.length) {
        await supabase.from("edges").insert(validEdges.map((e: any) => ({
          session_id: sid, source_node_id: tempToReal[e.source], target_node_id: tempToReal[e.target],
          relation: e.relation, confidence: e.confidence,
        })));
      }
    }

    // Insert insights
    if (graph.insights?.length) {
      await supabase.from("insights").insert(graph.insights.map((i: any) => ({
        session_id: sid, type: i.type, severity: i.severity, description: i.description,
        related_node_ids: (i.related_temp_ids || []).map((t: string) => tempToReal[t]).filter(Boolean),
      })));
    }

    return new Response(
      JSON.stringify({
        sessionId: sid, title: graph.title,
        nodeCount: graph.nodes?.length || 0, edgeCount: graph.edges?.length || 0,
        insightCount: graph.insights?.length || 0,
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
