import { useEffect } from 'react';
import { useGraph } from '@/context/GraphContext';
import { useInsights } from '@/context/InsightContext';
import { useWebSocket } from '@/context/WebSocketContext';
import { Node, Edge } from '@/types/graph';

export function useRealtimeUpdates(sessionId: string | null) {
  const { addNode, addEdge } = useGraph();
  const { addInsight } = useInsights();
  const { state: wsState, on, off } = useWebSocket();

  useEffect(() => {
    if (!sessionId || !wsState.isConnected) return;

    const handleNodeAdded = (data: any) => {
      if (data.event_type === 'node_added' && data.data?.node) {
        addNode(data.data.node as Node);
      }
    };

    const handleEdgeAdded = (data: any) => {
      if (data.event_type === 'edge_added' && data.data?.edge) {
        addEdge(data.data.edge as Edge);
      }
    };

    const handleInsight = (data: any) => {
      const insightTypes = [
        'gap_detected',
        'contradiction_found',
        'assumption_detected',
        'question_generated',
      ];

      if (insightTypes.includes(data.event_type) && data.data?.insight) {
        const type = data.event_type.replace('_detected', '').replace('_found', '').replace('_generated', '');
        addInsight({
          id: data.event_id || `${type}_${Date.now()}`,
          type: type as any,
          data: data.data.insight,
          timestamp: data.timestamp || Date.now(),
          priority: data.data.insight.priority || 'medium',
        });
      }
    };

    const handleBatch = (data: any) => {
      if (data.event_type === 'batch' && data.events) {
        data.events.forEach((event: any) => {
          handleNodeAdded(event);
          handleEdgeAdded(event);
          handleInsight(event);
        });
      }
    };

    on('message', handleNodeAdded);
    on('message', handleEdgeAdded);
    on('message', handleInsight);
    on('message', handleBatch);

    return () => {
      off('message', handleNodeAdded);
      off('message', handleEdgeAdded);
      off('message', handleInsight);
      off('message', handleBatch);
    };
  }, [sessionId, wsState.isConnected, addNode, addEdge, addInsight, on, off]);
}
