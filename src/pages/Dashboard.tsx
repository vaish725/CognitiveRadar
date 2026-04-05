import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  PanelLeftClose,
  PanelRightClose,
  AlertTriangle,
  HelpCircle,
  Eye,
  Lightbulb,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Brain,
  Image as ImageIcon,
  FileJson,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import KnowledgeGraph, { type KnowledgeGraphHandle } from "@/components/KnowledgeGraph";
import NodeDetailPanel from "@/components/NodeDetailPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { fetchSession, runThinkingEngine, type SessionData } from "@/lib/api";
import { toast } from "sonner";

const insightIcons: Record<string, typeof AlertTriangle> = {
  gap: Eye,
  contradiction: AlertTriangle,
  assumption: Lightbulb,
  question: HelpCircle,
};

const insightColors: Record<string, string> = {
  gap: "bg-cr-amber/10 text-cr-amber",
  contradiction: "bg-cr-rose/10 text-cr-rose",
  assumption: "bg-cr-indigo/10 text-cr-indigo",
  question: "bg-cr-slate/10 text-cr-slate",
};

const severityColors: Record<string, string> = {
  high: "bg-cr-rose/15 text-cr-rose border-cr-rose/20",
  medium: "bg-cr-amber/15 text-cr-amber border-cr-amber/20",
  low: "bg-muted text-muted-foreground",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [layout, setLayout] = useState<"force" | "radial">("force");
  const [showTranscript, setShowTranscript] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [insightFilter, setInsightFilter] = useState<string>("all");
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thinkingLoading, setThinkingLoading] = useState(false);
  const graphRef = useRef<KnowledgeGraphHandle>(null);

  const exportPNG = useCallback(() => {
    const canvas = graphRef.current?.getCanvas();
    if (!canvas) { toast.error("Graph not ready"); return; }
    const link = document.createElement("a");
    link.download = `${data?.session.title || "knowledge-graph"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("PNG downloaded");
  }, [data]);

  const exportJSON = useCallback(() => {
    if (!data) return;
    const payload = {
      title: data.session.title,
      inputType: data.session.input_type,
      nodes: data.nodes,
      edges: data.edges,
      insights: data.insights,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `${data.session.title || "knowledge-graph"}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("JSON downloaded");
  }, [data]);

  const handleThinkingEngine = async () => {
    if (!sessionId) return;
    setThinkingLoading(true);
    try {
      const result = await runThinkingEngine(sessionId);
      toast.success(`Thinking Engine found ${result.newInsightCount} new insights`);
      // Refresh data to show new insights
      const refreshed = await fetchSession(sessionId);
      setData(refreshed);
      setShowInsights(true);
    } catch (e: any) {
      toast.error(e.message || "Thinking engine failed");
    } finally {
      setThinkingLoading(false);
    }
  };

  // Fetch session data
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetchSession(sessionId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Map DB data to graph format
  const graphNodes = useMemo(
    () =>
      data?.nodes.map((n) => ({
        id: n.id,
        type: n.type as any,
        label: n.label,
        description: n.description || "",
        confidence: n.confidence ?? 0.8,
        connections: data.edges.filter((e) => e.source_node_id === n.id || e.target_node_id === n.id).length,
      })) || [],
    [data]
  );

  const graphEdges = useMemo(
    () =>
      data?.edges.map((e) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        relation: e.relation as any,
      })) || [],
    [data]
  );

  const insights = useMemo(
    () =>
      data?.insights.map((i) => ({
        id: i.id,
        type: i.type as "gap" | "contradiction" | "assumption" | "question",
        severity: i.severity as "high" | "medium" | "low",
        description: i.description,
        relatedNodes: i.related_node_ids || [],
      })) || [],
    [data]
  );

  const filteredInsights = useMemo(
    () => (insightFilter === "all" ? insights : insights.filter((i) => i.type === insightFilter)),
    [insightFilter, insights]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "t" || e.key === "T") setShowTranscript((v) => !v);
      if (e.key === "i" || e.key === "I") setShowInsights((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cr-cyan" />
          <p className="text-sm text-muted-foreground">Loading analysis…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Session not found"}</p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="glass z-40 flex items-center justify-between px-4 h-12 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-display text-sm font-semibold">{data.session.title}</span>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {graphNodes.length} nodes · {graphEdges.length} edges
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTranscript((v) => !v)}
            className={showTranscript ? "text-cr-cyan" : "text-muted-foreground"}
          >
            <PanelLeftClose className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline text-xs">Transcript</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInsights((v) => !v)}
            className={showInsights ? "text-cr-indigo" : "text-muted-foreground"}
          >
            <span className="hidden sm:inline text-xs">Insights</span>
            <PanelRightClose className="w-4 h-4 ml-1.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleThinkingEngine}
            disabled={thinkingLoading}
            className="text-cr-amber hover:text-cr-amber"
          >
            {thinkingLoading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-1.5" />
            )}
            <span className="hidden sm:inline text-xs">
              {thinkingLoading ? "Thinking…" : "Deep Analysis"}
            </span>
          </Button>

          <Button variant="ghost" size="sm" onClick={exportPNG} className="text-muted-foreground" title="Export as PNG">
            <ImageIcon className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline text-xs">PNG</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={exportJSON} className="text-muted-foreground" title="Export as JSON">
            <FileJson className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline text-xs">JSON</span>
          </Button>

          <div className="ml-3 flex rounded-full border bg-muted p-0.5">
            <button
              onClick={() => setLayout("force")}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                layout === "force" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
              }`}
            >
              Force
            </button>
            <button
              onClick={() => setLayout("radial")}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                layout === "radial" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
              }`}
            >
              Radial
            </button>
          <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <KnowledgeGraph
            ref={graphRef}
            nodes={graphNodes}
            edges={graphEdges}
            layout={layout}
            highlightNodes={highlightNodes}
            onNodeClick={(id) => {
              setSelectedNodeId(id);
              setHighlightNodes(new Set([id]));
              setShowInsights(false);
            }}
          />
        </div>

        {/* Transcript drawer - show raw content */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ x: -380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -380, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 bottom-0 w-[360px] z-30 glass border-r overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 border-b shrink-0">
                <h2 className="font-display text-sm font-semibold">Source Content</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{data.session.input_type}</p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3">
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {data.session.raw_content || "No content available"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insights drawer */}
        <AnimatePresence>
          {showInsights && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-[360px] z-30 glass border-l overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 border-b shrink-0">
                <h2 className="font-display text-sm font-semibold">Insights</h2>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {(["all", "contradiction", "gap", "assumption", "question"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setInsightFilter(f)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors capitalize ${
                        insightFilter === f
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {f === "all" ? "All" : f + "s"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                {filteredInsights.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No insights found</p>
                )}
                {filteredInsights.map((insight) => {
                  const Icon = insightIcons[insight.type] || HelpCircle;
                  return (
                    <button
                      key={insight.id}
                      onClick={() => setHighlightNodes(new Set(insight.relatedNodes))}
                      className="block w-full text-left p-4 rounded-xl border hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg shrink-0 ${insightColors[insight.type] || ""}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-medium capitalize">{insight.type}</span>
                            <Badge className={`text-[9px] px-1.5 py-0 h-4 border ${severityColors[insight.severity] || ""}`}>
                              {insight.severity}
                            </Badge>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/80">{insight.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Node detail panel */}
        <AnimatePresence>
          {selectedNodeId && data && (() => {
            const selectedNode = data.nodes.find((n) => n.id === selectedNodeId);
            if (!selectedNode) return null;
            return (
              <NodeDetailPanel
                node={selectedNode}
                allNodes={data.nodes}
                allEdges={data.edges}
                onClose={() => {
                  setSelectedNodeId(null);
                  setHighlightNodes(new Set());
                }}
                onNavigate={(id) => {
                  setSelectedNodeId(id);
                  setHighlightNodes(new Set([id]));
                }}
              />
            );
          })()}
        </AnimatePresence>

        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-1.5">
          <div className="glass rounded-xl flex flex-col overflow-hidden">
            <button className="p-2 hover:bg-accent/60 transition-colors">
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="border-t" />
            <button className="p-2 hover:bg-accent/60 transition-colors">
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="border-t" />
            <button
              className="p-2 hover:bg-accent/60 transition-colors"
              onClick={() => setHighlightNodes(new Set())}
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Node type legend */}
        <div className="absolute bottom-6 left-6 z-20 glass rounded-xl px-4 py-3">
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["concept", "#29b6c6"],
                ["claim", "#5b6abf"],
                ["assumption", "#e5930a"],
                ["evidence", "#0ea371"],
                ["question", "#6b7b8d"],
                ["contradiction", "#d44270"],
              ] as const
            ).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
