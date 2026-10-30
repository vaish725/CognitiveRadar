import { describe, expect, it } from "vitest";
import { computeSupport } from "./support";
import type { SessionEdge, SessionNode } from "./api";

const node = (id: string, type: string): SessionNode => ({ id, type, label: id, description: null, confidence: 0.95 });
const edge = (s: string, t: string, relation: string): SessionEdge => ({
  id: `${s}-${t}`, source_node_id: s, target_node_id: t, relation, confidence: 0.9,
});

// Shaped like the dining-room-cameras test run.
const nodes = [
  node("cameras", "claim"), node("wait", "evidence"), node("reviews", "evidence"),
  node("response", "claim"), node("morale", "claim"), node("payback", "claim"), node("profit", "assumption"),
];
const edges = [
  edge("wait", "cameras", "supports"), edge("reviews", "cameras", "supports"),
  edge("response", "cameras", "supports"), edge("morale", "cameras", "contradicts"),
  edge("payback", "profit", "depends_on"),
];

describe("computeSupport", () => {
  it("counts evidence, other reasons and challenges for the main claim", () => {
    expect(computeSupport(nodes[0], nodes, edges)).toEqual({
      evidenceFor: 2, reasonsFor: 1, challenges: 1, status: "contested",
    });
  });

  it("marks a claim with nothing pointing at it as unsupported, whatever the model's confidence", () => {
    expect(computeSupport(nodes[5], nodes, edges).status).toBe("unsupported");
  });

  it("gives no status to evidence nodes", () => {
    expect(computeSupport(nodes[1], nodes, edges).status).toBeNull();
  });

  it("separates evidence-backed from reasoned-only claims", () => {
    const e = [edge("wait", "response", "supports")];
    expect(computeSupport(nodes[3], nodes, e).status).toBe("backed");
    expect(computeSupport(nodes[3], nodes, [edge("cameras", "response", "supports")]).status).toBe("reasoned");
  });
});
