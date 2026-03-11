'use client';

import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <div className="h-full grid grid-cols-12 grid-rows-12 gap-2 p-2">
        {/* Left Panel - Transcript */}
        <div className="col-span-3 row-span-12 bg-gray-800 rounded-lg overflow-hidden">
          <div id="transcript-panel" className="h-full">
            {children}
          </div>
        </div>

        {/* Center Panel - Graph Visualization */}
        <div className="col-span-6 row-span-9 bg-gray-800 rounded-lg overflow-hidden">
          <div id="graph-panel" className="h-full relative">
            {/* Graph will be rendered here */}
          </div>
        </div>

        {/* Right Panel - Insights */}
        <div className="col-span-3 row-span-12 bg-gray-800 rounded-lg overflow-hidden">
          <div id="insights-panel" className="h-full">
            {/* Insights will be rendered here */}
          </div>
        </div>

        {/* Bottom Panel - Timeline */}
        <div className="col-span-6 row-span-3 bg-gray-800 rounded-lg overflow-hidden">
          <div id="timeline-panel" className="h-full">
            {/* Timeline will be rendered here */}
          </div>
        </div>
      </div>
    </div>
  );
}
