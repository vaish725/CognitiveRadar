import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WebSocketClient } from '@/lib/websocket-client';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  client: WebSocketClient | null;
}

interface WebSocketContextType {
  state: WebSocketState;
  connect: (sessionId: string) => void;
  disconnect: () => void;
  send: (data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    client: null,
  });

  const connect = (sessionId: string) => {
    if (state.client) {
      state.client.disconnect();
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const client = new WebSocketClient();

    client.on('connected', () => {
      setState({
        isConnected: true,
        isConnecting: false,
        error: null,
        client,
      });
    });

    client.on('disconnected', () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
      }));
    });

    client.on('error', (error: any) => {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'WebSocket error',
      }));
    });

    client.connect(sessionId);
  };

  const disconnect = () => {
    if (state.client) {
      state.client.disconnect();
      setState({
        isConnected: false,
        isConnecting: false,
        error: null,
        client: null,
      });
    }
  };

  const send = (data: any) => {
    if (state.client && state.isConnected) {
      state.client.send(data);
    }
  };

  const on = (event: string, handler: (data: any) => void) => {
    if (state.client) {
      state.client.on(event, handler);
    }
  };

  const off = (event: string, handler: (data: any) => void) => {
    if (state.client) {
      state.client.off(event, handler);
    }
  };

  useEffect(() => {
    return () => {
      if (state.client) {
        state.client.disconnect();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        state,
        connect,
        disconnect,
        send,
        on,
        off,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
