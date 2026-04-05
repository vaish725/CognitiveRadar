import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { type GraphNode, type GraphEdge } from "@/lib/demo-data";

export interface KnowledgeGraphHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const NODE_COLORS: Record<GraphNode["type"], string> = {
  concept: "#29b6c6",    // cyan
  claim: "#5b6abf",      // indigo
  assumption: "#e5930a",  // amber
  evidence: "#0ea371",   // emerald
  question: "#6b7b8d",   // slate
  contradiction: "#d44270", // rose
};

const EDGE_COLORS: Record<GraphEdge["relation"], string> = {
  supports: "#0ea371",
  contradicts: "#d44270",
  depends_on: "#e5930a",
  example_of: "#b0b8c1",
};

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: "force" | "radial";
  highlightNodes?: Set<string>;
  onNodeClick?: (nodeId: string) => void;
}

const KnowledgeGraph = forwardRef<KnowledgeGraphHandle, Props>(function KnowledgeGraph({ nodes, edges, layout, highlightNodes, onNodeClick }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useImperativeHandle(ref, () => ({
    getCanvas: () => containerRef.current?.querySelector("canvas") || null,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Apply radial layout as initial positions
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    if (layout === "radial") {
      fg.d3Force("charge")?.strength(-120);
      fg.d3ReheatSimulation();
    } else {
      fg.d3Force("charge")?.strength(-80);
      fg.d3ReheatSimulation();
    }
  }, [layout]);

  const graphData = {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      val: 2 + n.connections * 1.2,
      confidence: n.confidence,
    })),
    links: edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
    })),
  };

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = Math.sqrt(node.val || 4) * 3;
      const isHighlighted = highlightNodes?.has(node.id);
      const color = NODE_COLORS[node.type as GraphNode["type"]] || "#999";

      // Glow for contradictions or highlighted
      if (node.type === "contradiction" || isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
        ctx.fillStyle = isHighlighted
          ? `${color}44`
          : `${NODE_COLORS.contradiction}33`;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // White border
      ctx.strokeStyle = document.documentElement.classList.contains("dark") ? "#1e293b" : "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      if (globalScale > 0.7) {
        const label = node.label.length > 24 ? node.label.slice(0, 22) + "…" : node.label;
        const fontSize = Math.max(10 / globalScale, 3);
        ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = document.documentElement.classList.contains("dark") ? "#e2e8f0" : "#374151";
        ctx.fillText(label, node.x, node.y + r + 3);
      }
    },
    [highlightNodes]
  );

  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const color = EDGE_COLORS[link.relation as GraphEdge["relation"]] || "#ccc";
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = `${color}66`;
    ctx.lineWidth = link.relation === "contradicts" ? 1.8 : 1;
    if (link.relation === "depends_on") {
      ctx.setLineDash([4, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const r = Math.sqrt(node.val || 4) * 3 + 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeClick={(node: any) => onNodeClick?.(node.id)}
        enableZoomInteraction
        enablePanInteraction
        cooldownTicks={100}
        backgroundColor="rgba(0,0,0,0)"
      />
    </div>
  );
});

export default KnowledgeGraph;
