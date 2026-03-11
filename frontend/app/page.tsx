'use client';

import React, { useEffect } from 'react';
import { Providers } from '@/components/Providers';
import { TranscriptPanel } from '@/components/panels/TranscriptPanel';
import { GraphPanel } from '@/components/panels/GraphPanel';
import { InsightsPanel } from '@/components/panels/InsightsPanel';
import { TimelinePanel } from '@/components/panels/TimelinePanel';
import { useSession } from '@/context/SessionContext';
import { useWebSocket } from '@/context/WebSocketContext';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useTranscriptSync } from '@/hooks/useTranscriptSync';
import { apiClient } from '@/lib/api-client';

function MainPage() {
  const { session, createSession } = useSession();
  const { connect } = useWebSocket();

  useRealtimeUpdates(session.sessionId);
  useTranscriptSync();

  useEffect(() => {
    const initSession = async () => {
      try {
        const response: any = await apiClient.post('/sessions', {
          name: 'New Session',
          metadata: {},
        });
        const sessionId = response.session_id;
        createSession(sessionId);
        connect(sessionId);
      } catch (error) {
        console.error('Error creating session:', error);
      }
    };

    if (!session.sessionId) {
      initSession();
    }
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <div className="h-full grid grid-cols-12 grid-rows-12 gap-2 p-2">
        {/* Left Panel - Transcript */}
        <div className="col-span-3 row-span-12 bg-gray-800 rounded-lg overflow-hidden">
          <TranscriptPanel />
        </div>

        {/* Center Panel - Graph */}
        <div className="col-span-6 row-span-9 bg-gray-800 rounded-lg overflow-hidden">
          <GraphPanel />
        </div>

        {/* Right Panel - Insights */}
        <div className="col-span-3 row-span-12 bg-gray-800 rounded-lg overflow-hidden">
          <InsightsPanel />
        </div>

        {/* Bottom Panel - Timeline */}
        <div className="col-span-6 row-span-3 bg-gray-800 rounded-lg overflow-hidden">
          <TimelinePanel />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Providers>
      <MainPage />
    </Providers>
  );
}
