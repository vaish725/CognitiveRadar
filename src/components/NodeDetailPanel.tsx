import { motion } from "framer-motion";
import { X, Link2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type SessionNode, type SessionEdge } from "@/lib/api";

const NODE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  concept: { bg: "bg-cr-cyan/10", text: "text-cr-cyan" },
  claim: { bg: "bg-cr-indigo/10", text: "text-cr-indigo" },
  assumption: { bg: "bg-cr-amber/10", text: "text-cr-amber" },
  evidence: { bg: "bg-cr-emerald/10", text: "text-cr-emerald" },
  question: { bg: "bg-cr-slate/10", text: "text-cr-slate" },
  contradiction: { bg: "bg-cr-rose/10", text: "text-cr-rose" },
};

const RELATION_LABELS: Record<string, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  depends_on: "Depends on",
  example_of: "Example of",
};

interface Props {
  node: SessionNode;
  allNodes: SessionNode[];
  allEdges: SessionEdge[];
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}

export default function NodeDetailPanel({ node, allNodes, allEdges, onClose, onNavigate }: Props) {
  const colors = NODE_TYPE_COLORS[node.type] || { bg: "bg-muted", text: "text-muted-foreground" };

  // Find connected edges and nodes
  const connections = allEdges
    .filter((e) => e.source_node_id === node.id || e.target_node_id === node.id)
    .map((e) => {
      const isSource = e.source_node_id === node.id;
      const connectedId = isSource ? e.target_node_id : e.source_node_id;
      const connectedNode = allNodes.find((n) => n.id === connectedId);
      return {
        edge: e,
        direction: isSource ? ("outgoing" as const) : ("incoming" as const),
        connectedNode,
      };
    })
    .filter((c) => c.connectedNode);

  const confidence = node.confidence ?? 0.8;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute right-0 top-0 bottom-0 w-[360px] z-30 glass border-l overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`text-[10px] capitalize ${colors.bg} ${colors.text} border-0`}>
                {node.type}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {confidencePercent}% confidence
              </span>
            </div>
            <h2 className="font-display text-sm font-semibold leading-tight">{node.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Confidence bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                confidencePercent >= 80 ? "bg-cr-emerald" :
                confidencePercent >= 50 ? "bg-cr-amber" : "bg-cr-rose"
              }`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      {node.description && (
        <div className="px-5 py-4 border-b">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Description</p>
          <p className="text-sm leading-relaxed text-foreground/80">{node.description}</p>
        </div>
      )}

      {/* Connected nodes */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              {connections.length} Connection{connections.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-2">
            {connections.map(({ edge, direction, connectedNode }) => {
              if (!connectedNode) return null;
              const cColors = NODE_TYPE_COLORS[connectedNode.type] || { bg: "bg-muted", text: "text-muted-foreground" };

              return (
                <button
                  key={edge.id}
                  onClick={() => onNavigate(connectedNode.id)}
                  className="w-full text-left p-3 rounded-xl border hover:shadow-sm hover:border-foreground/10 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {direction === "outgoing" ? "" : "← "}
                      {RELATION_LABELS[edge.relation] || edge.relation}
                      {direction === "outgoing" ? " →" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] capitalize ${cColors.bg} ${cColors.text} border-0 px-1.5`}>
                      {connectedNode.type}
                    </Badge>
                    <span className="text-xs font-medium truncate flex-1">{connectedNode.label}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </button>
              );
            })}

            {connections.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No connections</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
