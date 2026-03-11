import { useCallback } from 'react';
import { useGraph } from '@/context/GraphContext';
import { Node } from '@/types/graph';

export function useNodeSelection() {
  const { state, selectNode, highlightNodes } = useGraph();

  const handleNodeClick = useCallback((nodeId: string) => {
    selectNode(nodeId);
    
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const relatedNodeIds = state.edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);

    highlightNodes([nodeId, ...relatedNodeIds]);
  }, [state.nodes, state.edges, selectNode, highlightNodes]);

  const clearSelection = useCallback(() => {
    selectNode(null);
    highlightNodes([]);
  }, [selectNode, highlightNodes]);

  const getSelectedNode = useCallback((): Node | null => {
    if (!state.selectedNodeId) return null;
    return state.nodes.find(n => n.id === state.selectedNodeId) || null;
  }, [state.selectedNodeId, state.nodes]);

  return {
    selectedNodeId: state.selectedNodeId,
    highlightedNodeIds: state.highlightedNodeIds,
    handleNodeClick,
    clearSelection,
    getSelectedNode,
  };
}
