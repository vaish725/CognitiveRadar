'use client';

import React, { useRef, useEffect } from 'react';
import { useTranscript } from '@/context/TranscriptContext';
import { useGraph } from '@/context/GraphContext';
import { formatTimestamp } from '@/lib/utils';

export function TranscriptSegment({ 
  segmentId, 
  text, 
  speaker, 
  timestamp, 
  nodeIds,
  highlighted,
  isActive,
  isSearchResult,
}: {
  segmentId: string;
  text: string;
  speaker?: string;
  timestamp: number;
  nodeIds: string[];
  highlighted?: boolean;
  isActive?: boolean;
  isSearchResult?: boolean;
}) {
  const { setActiveSegment, highlightSegment } = useTranscript();
  const { selectNode, highlightNodes } = useGraph();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  const handleClick = () => {
    setActiveSegment(segmentId);
    highlightSegment(segmentId);
    
    if (nodeIds.length > 0) {
      selectNode(nodeIds[0]);
      highlightNodes(nodeIds);
    }
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`
        p-3 rounded-lg cursor-pointer transition-all duration-200
        ${highlighted ? 'bg-yellow-500/20 border-2 border-yellow-500' : ''}
        ${isActive ? 'bg-blue-500/10 border-2 border-blue-500' : 'border border-gray-700'}
        ${isSearchResult ? 'bg-green-500/10' : ''}
        ${!highlighted && !isActive && !isSearchResult ? 'hover:bg-gray-800/50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-xs text-gray-500 whitespace-nowrap pt-1">
          {formatTimestamp(timestamp)}
        </div>
        <div className="flex-1">
          {speaker && (
            <div className="text-sm font-semibold text-cyan-400 mb-1">
              {speaker}
            </div>
          )}
          <div className="text-sm text-gray-200 leading-relaxed">
            {text}
          </div>
          {nodeIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {nodeIds.map(nodeId => (
                <span
                  key={nodeId}
                  className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300"
                >
                  Linked
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
