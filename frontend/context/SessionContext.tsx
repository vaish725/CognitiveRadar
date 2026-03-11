import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SessionState {
  sessionId: string | null;
  isActive: boolean;
  createdAt: number | null;
  updatedAt: number | null;
}

interface SessionContextType {
  session: SessionState;
  createSession: (sessionId: string) => void;
  endSession: () => void;
  updateSession: () => void;
}

const initialState: SessionState = {
  sessionId: null,
  isActive: false,
  createdAt: null,
  updatedAt: null,
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(initialState);

  const createSession = (sessionId: string) => {
    const now = Date.now();
    setSession({
      sessionId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  };

  const endSession = () => {
    setSession({
      ...session,
      isActive: false,
    });
  };

  const updateSession = () => {
    setSession({
      ...session,
      updatedAt: Date.now(),
    });
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        createSession,
        endSession,
        updateSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
