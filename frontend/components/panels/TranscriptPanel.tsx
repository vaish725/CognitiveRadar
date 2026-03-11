'use client';

import React from 'react';
import { useTranscript } from '@/context/TranscriptContext';
import { TranscriptSegment } from '@/components/transcript/TranscriptSegment';
import { TranscriptSearch } from '@/components/transcript/TranscriptSearch';
// import { TranscriptTestControls } from '@/components/transcript/TranscriptTestControls'; // Uncomment for testing

export function TranscriptPanel() {
  const { state, exportTranscript } = useTranscript();

  const handleExport = () => {
    const text = exportTranscript();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Transcript</h2>
        <button
          onClick={handleExport}
          disabled={state.segments.length === 0}
          className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
        >
          Export
        </button>
      </div>

      {/* Uncomment for testing: <TranscriptTestControls /> */}

      <TranscriptSearch />

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {state.segments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-4">📝</div>
              <div className="text-sm">Transcript will appear here</div>
              <div className="text-xs text-gray-500 mt-2">
                Start processing content to see the transcript
              </div>
            </div>
          </div>
        ) : (
          state.segments.map((segment) => (
            <TranscriptSegment
              key={segment.id}
              segmentId={segment.id}
              text={segment.text}
              speaker={segment.speaker}
              timestamp={segment.timestamp}
              nodeIds={segment.nodeIds}
              highlighted={segment.highlighted}
              isActive={state.activeSegmentId === segment.id}
              isSearchResult={state.searchResults.includes(segment.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
