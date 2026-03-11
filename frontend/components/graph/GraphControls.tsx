'use client';

import React from 'react';
import { useGraph } from '@/context/GraphContext';
import { NodeType, EdgeType } from '@/types/graph';

export function GraphControls() {
  const { state, setFilter, clearGraph } = useGraph();

  const nodeTypes = Object.values(NodeType);
  const edgeTypes = Object.values(EdgeType);

  const toggleNodeType = (type: string) => {
    const current = state.filter.nodeTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilter({ nodeTypes: updated });
  };

  const toggleEdgeType = (type: string) => {
    const current = state.filter.edgeTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilter({ edgeTypes: updated });
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700 max-w-xs mt-2">
      <h3 className="text-sm font-semibold mb-3">Graph Controls</h3>
      
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-gray-400 mb-2">Node Types</div>
          <div className="space-y-1">
            {nodeTypes.map(type => (
              <label key={type} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={!state.filter.nodeTypes.includes(type)}
                  onChange={() => toggleNodeType(type)}
                  className="rounded"
                />
                <span className="capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-gray-400 mb-2">Edge Types</div>
          <div className="space-y-1">
            {edgeTypes.map(type => (
              <label key={type} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={!state.filter.edgeTypes.includes(type)}
                  onChange={() => toggleEdgeType(type)}
                  className="rounded"
                />
                <span className="capitalize">{type.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={clearGraph}
          className="w-full px-3 py-2 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Clear Graph
        </button>
      </div>
    </div>
  );
}
