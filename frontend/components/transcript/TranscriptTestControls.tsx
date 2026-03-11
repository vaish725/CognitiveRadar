'use client';

import React from 'react';
import { useTranscript } from '@/context/TranscriptContext';

export function TranscriptTestControls() {
  const { addSegment } = useTranscript();

  const addSampleTranscript = () => {
    const samples = [
      { speaker: 'Alice', text: 'AI scaling is fundamentally about increasing compute power to improve model performance.' },
      { speaker: 'Bob', text: 'But there are diminishing returns. More compute does not always equal better results.' },
      { speaker: 'Alice', text: 'That is true, but we have not reached those limits yet with current architectures.' },
      { speaker: 'Bob', text: 'What about the energy costs? Scaling compute has environmental implications.' },
      { speaker: 'Alice', text: 'GPT-4 used approximately 10x more compute than GPT-3, and the improvements were substantial.' },
      { speaker: 'Bob', text: 'We need better metrics to measure efficiency, not just raw performance gains.' },
    ];

    samples.forEach((sample, index) => {
      setTimeout(() => {
        addSegment({
          id: `sample-${Date.now()}-${index}`,
          text: sample.text,
          speaker: sample.speaker,
          timestamp: Date.now(),
          nodeIds: [],
        });
      }, index * 1000);
    });
  };

  return (
    <div className="p-3 border-b border-gray-700">
      <button
        onClick={addSampleTranscript}
        className="w-full px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
      >
        Add Sample Transcript
      </button>
    </div>
  );
}
