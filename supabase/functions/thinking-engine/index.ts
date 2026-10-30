import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { callGemini } from "../_shared/gemini.ts";
import { INSIGHT_TYPE_DESC, SEVERITY_DESC } from "../_shared/ontology.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a critical thinking analysis engine. You receive a knowledge graph (nodes and edges) extracted from text. Your job is to perform DEEP logical analysis:

1. **Circular Reasoning**: Detect any chains where A supports B supports C supports A. Flag the cycle.
2. **Logical Fallacies**: Identify common fallacies — ad hominem, straw man, false dichotomy, appeal to authority, slippery slope, hasty generalization, red herring, etc.
3. **Unsupported Claims**: Find claims that have no supporting evidence nodes connected.
4. **Weak Evidence**: Flag evidence that is anecdotal, a single data point, or too weak for the claim it supports. The confidence numbers are the extraction model's own uncalibrated guesses; do not treat them as evidence strength.
5. **Follow-up Questions**: Generate probing questions that would strengthen or challenge the argument structure.
6. **Hidden Assumptions**: Identify implicit premises that the argument relies on but doesn't state.

Be thorough and specific. Refer to nodes by their IDs (e.g. "n3") in related_node_ids, using only IDs that appear in the NODES list. In descriptions, refer to nodes by their labels, never by ID.

Insight types: ${INSIGHT_TYPE_DESC}
Severity: ${SEVERITY_DESC}`;

const THINKING_TOOL = {
  name: "report_thinking_analysis",
  description: "Report the results of deep critical thinking analysis",
  parameters: {
    type: "object",
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["gap", "contradiction", "assumption", "question"],
              description: "Type of insight. Use 'contradiction' for circular reasoning and fallacies, 'gap' for unsupported claims and weak evidence, 'assumption' for hidden assumptions, 'question' for follow-up questions.",
            },
            severity: { type: "string", enum: ["high", "medium", "low"] },
            description: {
              type: "string",
              description: "Detailed description. For fallacies, name the fallacy. For circular reasoning, describe the cycle. For questions, phrase as a question.",
            },
            related_node_ids: {
              type: "array",
              items: { type: "string" },
              description: "IDs of nodes involved in this insight, exactly as listed (e.g. n3)",
            },
          },
          required: ["type", "severity", "description", "related_node_ids"],
        },
      },
    },
    required: ["insights"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing graph data
    const [nodesRes, edgesRes, existingInsights] = await Promise.all([
      supabase.from("nodes").select("*").eq("session_id", sessionId),
      supabase.from("edges").select("*").eq("session_id", sessionId),
      supabase.from("insights").select("*").eq("session_id", sessionId),
    ]);

    if (!nodesRes.data?.length) {
      return new Response(
        JSON.stringify({ error: "No nodes found for this session" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Give each node a short ID (n1, n2, ...). The model refers to nodes by these
    // IDs, which map back exactly; matching by label broke whenever it reworded one.
    const shortId: Record<string, string> = {};
    const realId: Record<string, string> = {};
    const labelOf: Record<string, string> = {};
    nodesRes.data.forEach((n: any, i: number) => {
      shortId[n.id] = `n${i + 1}`;
      realId[`n${i + 1}`] = n.id;
      labelOf[`n${i + 1}`] = n.label;
    });
    // Short IDs are internal; replace any the model writes in its text with the node's label.
    const readable = (text: string) =>
      text
        .replace(/\s*\((n\d+(?:\s*,\s*n\d+)*)\)/g, "")
        .replace(/\b(n\d+)\b/g, (m) => (labelOf[m] ? `"${labelOf[m]}"` : m));
    const graphDescription = nodesRes.data.map((n: any) =>
      `[${shortId[n.id]}] ${n.type.toUpperCase()}: "${n.label}" (confidence: ${n.confidence}) — ${n.description || "no description"}`
    ).join("\n");

    const edgeDescription = (edgesRes.data || []).map((e: any) =>
      `${shortId[e.source_node_id]} —[${e.relation}]→ ${shortId[e.target_node_id]} (confidence: ${e.confidence})`
    ).join("\n");

    const existingInsightDesc = (existingInsights.data || []).map((i: any) =>
      `[${i.type}/${i.severity}] ${i.description}`
    ).join("\n");

    const userPrompt = `Analyze this knowledge graph for logical issues:

NODES:
${graphDescription}

EDGES (relationships):
${edgeDescription}

EXISTING INSIGHTS (avoid duplicating these):
${existingInsightDesc || "None yet"}

Perform deep critical thinking analysis. Find circular reasoning, logical fallacies, unsupported claims, and generate follow-up questions.`;

    // Call Google Gemini directly
    const result = await callGemini({
      systemPrompt: SYSTEM_PROMPT,
      userContent: userPrompt,
      tools: [THINKING_TOOL],
      forceTool: "report_thinking_analysis",
    }) as any;

    // Validate and resolve references; anything unknown is rejected and counted.
    const TYPES = new Set(["gap", "contradiction", "assumption", "question"]);
    const SEVERITIES = new Set(["high", "medium", "low"]);
    const received: any[] = Array.isArray(result.insights) ? result.insights : [];
    let unresolvedRefs = 0;
    const newInsights = received
      .filter((i: any) => TYPES.has(i?.type) && typeof i?.description === "string" && i.description.trim())
      .map((i: any) => {
        const refs: string[] = Array.isArray(i.related_node_ids) ? i.related_node_ids : [];
        const resolved = refs.map((r) => realId[r]).filter(Boolean);
        unresolvedRefs += refs.length - resolved.length;
        return {
          session_id: sessionId,
          type: i.type,
          severity: SEVERITIES.has(i.severity) ? i.severity : "medium",
          description: readable(i.description.trim()),
          related_node_ids: resolved,
        };
      });

    if (newInsights.length) {
      const { error: insertErr } = await supabase.from("insights").insert(newInsights);
      if (insertErr) throw new Error("Failed to save insights: " + insertErr.message);
    }

    return new Response(
      JSON.stringify({
        newInsightCount: newInsights.length,
        validation: { received: received.length, saved: newInsights.length, rejected: received.length - newInsights.length, unresolvedRefs },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("thinking-engine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
