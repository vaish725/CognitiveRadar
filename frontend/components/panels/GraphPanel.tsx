'use client';

import React, { useState } from 'react';
import { useGraph } from '@/context/GraphContext';
import { GraphVisualization } from '@/components/graph/GraphVisualization';
import { GraphControls } from '@/components/graph/GraphControls';
// import { GraphTestControls } from '@/components/graph/GraphTestControls'; // Uncomment for testing

export function GraphPanel() {
  const { state } = useGraph();
  const [showControls, setShowControls] = useState(false);

  return (
    <div className="h-full flex flex-col relative">
      {/* Uncomment for testing: <GraphTestControls /> */}
      
      <div className="absolute top-4 left-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <div>Nodes: {state.nodes.length}</div>
          <div>Edges: {state.edges.length}</div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col items-end">
        <button
          onClick={() => setShowControls(!showControls)}
          className="px-3 py-2 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 text-xs hover:bg-gray-800 transition-colors"
        >
          {showControls ? 'Hide' : 'Show'} Controls
        </button>
        {showControls && <GraphControls />}
      </div>
      
      {state.nodes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">🕸️</div>
            <div className="text-sm">Knowledge graph will appear here</div>
            <div className="text-xs text-gray-500 mt-2">
              Start processing content to see the graph
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <GraphVisualization />
        </div>
      )}
      
      <div className="absolute bottom-4 right-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
        <div className="text-xs text-gray-400 space-y-2">
          <div className="font-semibold mb-2">Legend</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span>Concept</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white"></div>
            <span>Claim</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Assumption</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Contradiction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span>Gap</span>
          </div>
        </div>
      </div>
    </div>
  );
}
