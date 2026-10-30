// Types for the graph as drawn on screen (after mapping from database rows).
export interface GraphNode {
  id: string;
  label: string;
  type: "concept" | "claim" | "assumption" | "evidence" | "question" | "contradiction";
  confidence: number;
  connections: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: "supports" | "contradicts" | "depends_on" | "example_of";
}
