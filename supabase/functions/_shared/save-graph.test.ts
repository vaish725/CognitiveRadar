// Run: deno test supabase/functions/_shared/save-graph.test.ts
// deno-lint-ignore-file no-explicit-any
import { saveGraph } from "./save-graph.ts";

function assertEquals(actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`Expected ${e}\n     got ${a}`);
}

/** Minimal in-memory stand-in for the Supabase client. */
function fakeSupabase(failTable?: string) {
  const db: Record<string, any[]> = { sessions: [], nodes: [], edges: [], insights: [] };
  const client = {
    from(table: string) {
      return {
        insert(rows: any) {
          const list = Array.isArray(rows) ? rows : [rows];
          if (table === failTable) return Promise.resolve({ error: { message: "boom" } });
          if (table === "sessions") list.forEach((r) => (r.id = "s1"));
          db[table].push(...list);
          return Object.assign(Promise.resolve({ error: null }), {
            select: () => ({ single: () => Promise.resolve({ data: list[0], error: null }) }),
          });
        },
        delete() {
          return { eq: (_c: string, id: string) => { db.sessions = db.sessions.filter((s) => s.id !== id); return Promise.resolve({ error: null }); } };
        },
      };
    },
  };
  return { client: client as any, db };
}

const session = { title: "t", input_type: "text", raw_content: "x" };

Deno.test("rejects edges and insight refs that point at nodes the model never created", async () => {
  const { client, db } = fakeSupabase();
  const graph = {
    nodes: [
      { temp_id: "n1", type: "claim", label: "Remote work boosts output", confidence: 0.9 },
      { temp_id: "n2", type: "evidence", label: "Fewer sick days", confidence: 0.7 },
      { temp_id: "n3", type: "opinion", label: "Not a valid type" },
    ],
    edges: [
      { source: "n2", target: "n1", relation: "supports", confidence: 0.8 },
      { source: "n2", target: "n9", relation: "supports", confidence: 0.8 }, // n9 doesn't exist
      { source: "n1", target: "n3", relation: "supports" }, // n3 was rejected
      { source: "n1", target: "n2", relation: "causes" }, // relation not in schema
    ],
    insights: [{ type: "gap", severity: "high", description: "No output data", related_temp_ids: ["n1", "n7"] }],
  };

  const { validation } = await saveGraph(client, session, graph);

  assertEquals(validation.nodes, { received: 3, saved: 2, rejected: 1 });
  assertEquals(validation.edges, { received: 4, saved: 1, rejected: 3 });
  assertEquals(validation.insights.unresolvedRefs, 1);
  // The saved edge references the real IDs of the saved nodes, by lookup, not position.
  const claim = db.nodes.find((n) => n.label === "Remote work boosts output");
  const evidence = db.nodes.find((n) => n.label === "Fewer sick days");
  assertEquals(db.edges[0].source_node_id, evidence.id);
  assertEquals(db.edges[0].target_node_id, claim.id);
  assertEquals(db.insights[0].related_node_ids, [claim.id]);
});

Deno.test("removes the session if a later insert fails, leaving no half-saved graph", async () => {
  const { client, db } = fakeSupabase("edges");
  const graph = {
    nodes: [{ temp_id: "a", type: "concept", label: "A" }, { temp_id: "b", type: "concept", label: "B" }],
    edges: [{ source: "a", target: "b", relation: "example_of" }],
    insights: [],
  };
  let threw = false;
  try {
    await saveGraph(client, session, graph);
  } catch (e) {
    threw = (e as Error).message.includes("Failed to save edges");
  }
  assertEquals(threw, true);
  assertEquals(db.sessions.length, 0);
});

Deno.test("fails clearly when every node is invalid", async () => {
  const { client } = fakeSupabase();
  let msg = "";
  try {
    await saveGraph(client, session, { nodes: [{ temp_id: "x", type: "bogus", label: "?" }], edges: [], insights: [] });
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.startsWith("The model returned no valid nodes"), true);
});
