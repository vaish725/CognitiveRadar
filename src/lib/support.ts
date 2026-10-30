import type { SessionEdge, SessionNode } from "@/lib/api";

export type SupportStatus = "contested" | "backed" | "reasoned" | "unsupported";

export interface Support {
  evidenceFor: number;
  reasonsFor: number;
  challenges: number;
  /** Only claims and assumptions get a status; other node types aren't arguable. */
  status: SupportStatus | null;
}

/** Counts what the saved graph says about a node. No model numbers involved. */
export function computeSupport(node: SessionNode, nodes: SessionNode[], edges: SessionEdge[]): Support {
  const typeOf = (id: string) => nodes.find((n) => n.id === id)?.type;
  const supportsIn = edges.filter((e) => e.target_node_id === node.id && e.relation === "supports");
  const evidenceFor = supportsIn.filter((e) => typeOf(e.source_node_id) === "evidence").length;
  const reasonsFor = supportsIn.length - evidenceFor;
  const challenges = edges.filter(
    (e) => e.relation === "contradicts" && (e.target_node_id === node.id || e.source_node_id === node.id),
  ).length;

  const arguable = node.type === "claim" || node.type === "assumption";
  const status: SupportStatus | null = !arguable
    ? null
    : challenges > 0
      ? "contested"
      : evidenceFor > 0
        ? "backed"
        : reasonsFor > 0
          ? "reasoned"
          : "unsupported";

  return { evidenceFor, reasonsFor, challenges, status };
}
