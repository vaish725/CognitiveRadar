// Validates model output and saves one analysis. Shared by every analyze function.
//
// The model invents temp_ids (n1, n2, ...) so edges can refer to nodes before
// they exist. Each node gets its own UUID here, so references are resolved
// through an exact lookup table rather than by row order. Anything that points
// at a node the model never created, or uses a value outside the schema, is
// rejected and counted. The counts are stored on the session and shown in the UI.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const NODE_TYPES = new Set(["concept", "claim", "assumption", "evidence", "question", "contradiction"]);
const RELATIONS = new Set(["supports", "contradicts", "depends_on", "example_of"]);
const INSIGHT_TYPES = new Set(["gap", "contradiction", "assumption", "question"]);
const SEVERITIES = new Set(["high", "medium", "low"]);

export interface ValidationReport {
  nodes: { received: number; saved: number; rejected: number };
  edges: { received: number; saved: number; rejected: number };
  insights: { received: number; saved: number; rejected: number; unresolvedRefs: number };
  input?: { totalChars: number; analyzedChars: number };
}

const clamp01 = (v: unknown, fallback = 0.8) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

export async function saveGraph(
  supabase: SupabaseClient,
  session: { title: string; input_type: string; raw_content: string },
  graph: any,
  input?: { totalChars: number; analyzedChars: number },
): Promise<{ sessionId: string; title: string; validation: ValidationReport }> {
  const rawNodes: any[] = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const rawEdges: any[] = Array.isArray(graph?.edges) ? graph.edges : [];
  const rawInsights: any[] = Array.isArray(graph?.insights) ? graph.insights : [];

  // 1. Nodes: valid type, non-empty label, unique temp_id.
  const idFor: Record<string, string> = {};
  const nodes: any[] = [];
  for (const n of rawNodes) {
    const tempId = typeof n?.temp_id === "string" ? n.temp_id : "";
    const label = typeof n?.label === "string" ? n.label.trim() : "";
    if (!tempId || idFor[tempId] || !NODE_TYPES.has(n?.type) || !label) continue;
    const id = crypto.randomUUID();
    idFor[tempId] = id;
    nodes.push({ id, type: n.type, label, description: n.description ?? null, confidence: clamp01(n.confidence) });
  }

  // 2. Edges: both ends must be nodes we accepted, and the relation must be in the schema.
  const edges: any[] = [];
  for (const e of rawEdges) {
    const source = idFor[e?.source];
    const target = idFor[e?.target];
    if (!source || !target || source === target || !RELATIONS.has(e?.relation)) continue;
    edges.push({ source_node_id: source, target_node_id: target, relation: e.relation, confidence: clamp01(e.confidence) });
  }

  // 3. Insights: valid type; references resolved, unknown ones dropped and counted.
  let unresolvedRefs = 0;
  const insights: any[] = [];
  for (const i of rawInsights) {
    if (!INSIGHT_TYPES.has(i?.type) || typeof i?.description !== "string" || !i.description.trim()) continue;
    const refs: string[] = Array.isArray(i.related_temp_ids) ? i.related_temp_ids : [];
    const resolved = refs.map((t) => idFor[t]).filter(Boolean);
    unresolvedRefs += refs.length - resolved.length;
    insights.push({
      type: i.type,
      severity: SEVERITIES.has(i.severity) ? i.severity : "medium",
      description: i.description.trim(),
      related_node_ids: resolved,
    });
  }

  if (nodes.length === 0) {
    throw new Error(`The model returned no valid nodes (${rawNodes.length} received, all rejected).`);
  }

  const validation: ValidationReport = {
    nodes: { received: rawNodes.length, saved: nodes.length, rejected: rawNodes.length - nodes.length },
    edges: { received: rawEdges.length, saved: edges.length, rejected: rawEdges.length - edges.length },
    insights: {
      received: rawInsights.length,
      saved: insights.length,
      rejected: rawInsights.length - insights.length,
      unresolvedRefs,
    },
    ...(input ? { input } : {}),
  };

  // 4. Save. If any step fails, delete the session (children cascade) so no
  //    half-saved graph is left behind, then report the error.
  const { data: s, error: sessionErr } = await supabase
    .from("sessions")
    .insert({ ...session, title: session.title.slice(0, 120), validation })
    .select("id")
    .single();
  if (sessionErr) throw new Error("Failed to create session: " + sessionErr.message);
  const sessionId: string = s.id;

  try {
    const steps: Array<[string, any[]]> = [["nodes", nodes], ["edges", edges], ["insights", insights]];
    for (const [table, rows] of steps) {
      if (!rows.length) continue;
      const { error } = await supabase.from(table).insert(rows.map((r) => ({ ...r, session_id: sessionId })));
      if (error) throw new Error(`Failed to save ${table}: ${error.message}`);
    }
  } catch (err) {
    await supabase.from("sessions").delete().eq("id", sessionId);
    throw err;
  }

  if (validation.edges.rejected || validation.nodes.rejected || unresolvedRefs) {
    console.warn("Rejected model output:", JSON.stringify(validation));
  }
  return { sessionId, title: session.title, validation };
}
