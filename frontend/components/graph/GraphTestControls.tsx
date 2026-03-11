'use client';

import React from 'react';
import { useGraph } from '@/context/GraphContext';
import { NodeType, EdgeType } from '@/types/graph';

export function GraphTestControls() {
  const { addNode, addEdge, clearGraph } = useGraph();

  const addSampleData = () => {
    const nodes = [
      { id: '1', type: NodeType.CONCEPT, text: 'AI Scaling', confidence: 0.9, timestamp: Date.now() },
      { id: '2', type: NodeType.CLAIM, text: 'Compute drives progress', confidence: 0.85, timestamp: Date.now() },
      { id: '3', type: NodeType.ASSUMPTION, text: 'More compute = better AI', confidence: 0.7, timestamp: Date.now() },
      { id: '4', type: NodeType.CONTRADICTION, text: 'But efficiency matters more', confidence: 0.8, timestamp: Date.now() },
      { id: '5', type: NodeType.GAP, text: 'Missing data on energy costs', confidence: 0.75, timestamp: Date.now() },
      { id: '6', type: NodeType.EVIDENCE, text: 'GPT-4 used 10x compute', confidence: 0.95, timestamp: Date.now() },
      { id: '7', type: NodeType.QUESTION, text: 'What about diminishing returns?', confidence: 0.6, timestamp: Date.now() },
    ];

    const edges = [
      { id: 'e1', source: '2', target: '1', type: EdgeType.SUPPORTS, confidence: 0.85 },
      { id: 'e2', source: '3', target: '2', type: EdgeType.DEPENDS_ON, confidence: 0.8 },
      { id: 'e3', source: '4', target: '2', type: EdgeType.CONTRADICTS, confidence: 0.9 },
      { id: 'e4', source: '6', target: '2', type: EdgeType.EXAMPLE_OF, confidence: 0.95 },
      { id: 'e5', source: '5', target: '3', type: EdgeType.SUPPORTS, confidence: 0.7 },
    ];

    nodes.forEach(node => addNode(node));
    setTimeout(() => {
      edges.forEach(edge => addEdge(edge));
    }, 500);
  };

  const addNodeSequentially = () => {
    const nodeTypes = [
      NodeType.CONCEPT,
      NodeType.CLAIM,
      NodeType.ASSUMPTION,
      NodeType.CONTRADICTION,
      NodeType.GAP,
      NodeType.EVIDENCE,
      NodeType.QUESTION,
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index >= nodeTypes.length) {
        clearInterval(interval);
        return;
      }
      
      const type = nodeTypes[index];
      addNode({
        id: `test-${Date.now()}-${index}`,
        type,
        text: `Sample ${type} ${index + 1}`,
        confidence: 0.8,
        timestamp: Date.now(),
      });
      
      index++;
    }, 800);
  };

  return (
    <div className="absolute top-20 left-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 space-y-2">
      <div className="text-xs font-semibold mb-2 text-gray-300">Test Controls</div>
      <button
        onClick={addSampleData}
        className="w-full px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
      >
        Add Sample Graph
      </button>
      <button
        onClick={addNodeSequentially}
        className="w-full px-3 py-2 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
      >
        Add Nodes (Animated)
      </button>
      <button
        onClick={clearGraph}
        className="w-full px-3 py-2 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
      >
        Clear Graph
      </button>
    </div>
  );
}
