'use client';

import React from 'react';
import { useInsights } from '@/context/InsightContext';

export function InsightsPanel() {
  const { getFilteredInsights } = useInsights();
  const insights = getFilteredInsights();

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'gap':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'contradiction':
        return 'border-red-500 bg-red-500/10';
      case 'assumption':
        return 'border-purple-500 bg-purple-500/10';
      case 'question':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'gap':
        return '⚠️';
      case 'contradiction':
        return '❌';
      case 'assumption':
        return '💭';
      case 'question':
        return '❓';
      default:
        return '💡';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Insights</h2>
        <p className="text-xs text-gray-400 mt-1">
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {insights.length === 0 ? (
          <div className="text-gray-400 text-sm text-center mt-8">
            No insights yet...
          </div>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-3 rounded-lg border-l-4 ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 capitalize mb-1">
                    {insight.type}
                  </div>
                  <div className="text-sm">
                    {typeof insight.data === 'string'
                      ? insight.data
                      : insight.data.text || insight.data.description || JSON.stringify(insight.data)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
