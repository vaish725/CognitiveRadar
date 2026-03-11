'use client';

import React from 'react';

export function TranscriptPanel() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Transcript</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-gray-400 text-sm text-center mt-8">
          Start a session to see transcript...
        </div>
      </div>
    </div>
  );
}
