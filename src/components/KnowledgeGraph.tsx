import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { type GraphNode, type GraphEdge } from "@/lib/graph-types";

export interface KnowledgeGraphHandle {
  getCanvas: () => HTMLCanvasElement | null;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
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
  highlightNodes?: Set<string>;
  onNodeClick?: (nodeId: string) => void;
}

type SimNode = { x?: number; y?: number; vx?: number; vy?: number };

/** A node as the force simulation sees it: our fields plus its x/y position. */
type DrawNode = SimNode & { id?: string | number; label?: string; type?: string; val?: number; confidence?: number };
type DrawLink = { relation?: string; source?: string | number | DrawNode; target?: string | number | DrawNode };

/** A d3-style force pulling every node toward the origin. */
function centerPull(strength: number) {
  let nodes: SimNode[] = [];
  const force = (alpha: number) => {
    for (const n of nodes) {
      n.vx = (n.vx ?? 0) - (n.x ?? 0) * strength * alpha;
      n.vy = (n.vy ?? 0) - (n.y ?? 0) * strength * alpha;
    }
  };
  force.initialize = (ns: SimNode[]) => {
    nodes = ns;
  };
  return force;
}

/** Keeps nodes at least their radius plus `pad` apart, so circles and labels don't stack. */
function collide(radius: (n: SimNode & { val?: number }) => number, pad: number) {
  let nodes: Array<SimNode & { val?: number }> = [];
  const force = () => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = (b.x ?? 0) - (a.x ?? 0) || 0.01;
        const dy = (b.y ?? 0) - (a.y ?? 0) || 0.01;
        const dist = Math.hypot(dx, dy);
        const min = radius(a) + radius(b) + pad;
        if (dist < min) {
          const push = ((min - dist) / dist) * 0.5;
          a.x = (a.x ?? 0) - dx * push; a.y = (a.y ?? 0) - dy * push;
          b.x = (b.x ?? 0) + dx * push; b.y = (b.y ?? 0) + dy * push;
        }
      }
    }
  };
  force.initialize = (ns: Array<SimNode & { val?: number }>) => {
    nodes = ns;
  };
  return force;
}

const nodeRadius = (n: { val?: number }) => Math.sqrt(n.val || 4) * 3;

const KnowledgeGraph = forwardRef<KnowledgeGraphHandle, Props>(function KnowledgeGraph({ nodes, edges, highlightNodes, onNodeClick }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Fit everything in view, but never zoom in past 1.5x: on a compact graph a
  // big zoom makes the circles huge relative to the labels and they collide.
  const fit = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.zoomToFit(400, 90);
    setTimeout(() => {
      if (fg.zoom() > 1.5) fg.zoom(1.5, 300);
    }, 450);
  }, []);
  const zoomBy = useCallback((factor: number) => {
    const fg = fgRef.current;
    if (fg) fg.zoom(fg.zoom() * factor, 250);
  }, []);

  useImperativeHandle(ref, () => ({
    getCanvas: () => containerRef.current?.querySelector("canvas") || null,
    zoomIn: () => zoomBy(1.4),
    zoomOut: () => zoomBy(1 / 1.4),
    fit,
  }));

  // Layout forces. Nodes repel, links pull, and a gentle pull toward the centre
  // keeps unconnected clusters close together instead of drifting apart (which
  // forced fit-to-view to zoom far out and made labels overlap).
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-260);
    fg.d3Force("link")?.distance(85);
    fg.d3Force("gravity", centerPull(0.03));
    fg.d3Force("collide", collide(nodeRadius, 34));
    fg.d3ReheatSimulation();
  }, []);

  // Fit the whole graph into view once the layout settles for new data.
  const needsFit = useRef(true);
  useEffect(() => {
    needsFit.current = true;
  }, [nodes, edges]);

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

  // Memoized so re-renders (e.g. highlighting) don't restart the simulation.
  const graphData = useMemo(() => ({
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
  }), [nodes, edges]);

  const paintNode = useCallback(
    (node: DrawNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = Math.sqrt(node.val || 4) * 3;
      const isHighlighted = highlightNodes?.has(String(node.id));
      const color = NODE_COLORS[node.type as GraphNode["type"]] || "#999";

      // Glow for contradictions or highlighted
      if (node.type === "contradiction" || isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI);
        ctx.fillStyle = isHighlighted
          ? `${color}44`
          : `${NODE_COLORS.contradiction}33`;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
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
        ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + r + 3);
      }
    },
    [highlightNodes]
  );

  const paintLink = useCallback((link: DrawLink, ctx: CanvasRenderingContext2D) => {
    const source = link.source as DrawNode;
    const target = link.target as DrawNode;
    const color = EDGE_COLORS[link.relation as GraphEdge["relation"]] || "#ccc";
    ctx.beginPath();
    ctx.moveTo(source.x ?? 0, source.y ?? 0);
    ctx.lineTo(target.x ?? 0, target.y ?? 0);
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
        nodePointerAreaPaint={(node: DrawNode, color, ctx) => {
          const r = Math.sqrt(node.val || 4) * 3 + 4;
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeClick={(node: DrawNode) => onNodeClick?.(String(node.id))}
        enableZoomInteraction
        enablePanInteraction
        warmupTicks={120}
        cooldownTicks={200}
        onEngineStop={() => {
          if (needsFit.current) {
            needsFit.current = false;
            fit();
          }
        }}
        backgroundColor="rgba(0,0,0,0)"
      />
    </div>
  );
});

export default KnowledgeGraph;
