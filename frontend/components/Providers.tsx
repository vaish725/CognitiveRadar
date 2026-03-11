'use client';

import React from 'react';
import { GraphProvider } from '@/context/GraphContext';
import { SessionProvider } from '@/context/SessionContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { InsightProvider } from '@/context/InsightContext';
import { TranscriptProvider } from '@/context/TranscriptContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WebSocketProvider>
        <GraphProvider>
          <InsightProvider>
            <TranscriptProvider>
              {children}
            </TranscriptProvider>
          </InsightProvider>
        </GraphProvider>
      </WebSocketProvider>
    </SessionProvider>
  );
}
