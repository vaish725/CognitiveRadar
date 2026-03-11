'use client';

import React from 'react';
import { GraphProvider } from '@/context/GraphContext';
import { SessionProvider } from '@/context/SessionContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { InsightProvider } from '@/context/InsightContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WebSocketProvider>
        <GraphProvider>
          <InsightProvider>
            {children}
          </InsightProvider>
        </GraphProvider>
      </WebSocketProvider>
    </SessionProvider>
  );
}
