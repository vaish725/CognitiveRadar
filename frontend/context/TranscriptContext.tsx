import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TranscriptSegment, TranscriptState } from '@/types/transcript';

type TranscriptAction =
  | { type: 'ADD_SEGMENT'; payload: TranscriptSegment }
  | { type: 'SET_SEGMENTS'; payload: TranscriptSegment[] }
  | { type: 'SET_ACTIVE_SEGMENT'; payload: string | null }
  | { type: 'HIGHLIGHT_SEGMENT'; payload: string }
  | { type: 'CLEAR_HIGHLIGHTS' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: string[] }
  | { type: 'LINK_NODE_TO_SEGMENT'; payload: { segmentId: string; nodeId: string } };

const initialState: TranscriptState = {
  segments: [],
  activeSegmentId: null,
  searchQuery: '',
  searchResults: [],
};

function transcriptReducer(state: TranscriptState, action: TranscriptAction): TranscriptState {
  switch (action.type) {
    case 'ADD_SEGMENT':
      return {
        ...state,
        segments: [...state.segments, action.payload],
      };
    
    case 'SET_SEGMENTS':
      return {
        ...state,
        segments: action.payload,
      };
    
    case 'SET_ACTIVE_SEGMENT':
      return {
        ...state,
        activeSegmentId: action.payload,
      };
    
    case 'HIGHLIGHT_SEGMENT':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.payload
            ? { ...seg, highlighted: true }
            : { ...seg, highlighted: false }
        ),
      };
    
    case 'CLEAR_HIGHLIGHTS':
      return {
        ...state,
        segments: state.segments.map(seg => ({ ...seg, highlighted: false })),
      };
    
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };
    
    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload,
      };
    
    case 'LINK_NODE_TO_SEGMENT':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.payload.segmentId
            ? { ...seg, nodeIds: [...seg.nodeIds, action.payload.nodeId] }
            : seg
        ),
      };
    
    default:
      return state;
  }
}

interface TranscriptContextType {
  state: TranscriptState;
  dispatch: React.Dispatch<TranscriptAction>;
  addSegment: (segment: TranscriptSegment) => void;
  setSegments: (segments: TranscriptSegment[]) => void;
  setActiveSegment: (segmentId: string | null) => void;
  highlightSegment: (segmentId: string) => void;
  clearHighlights: () => void;
  setSearchQuery: (query: string) => void;
  linkNodeToSegment: (segmentId: string, nodeId: string) => void;
  searchTranscript: (query: string) => void;
  exportTranscript: () => string;
}

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(transcriptReducer, initialState);

  const addSegment = (segment: TranscriptSegment) => {
    dispatch({ type: 'ADD_SEGMENT', payload: segment });
  };

  const setSegments = (segments: TranscriptSegment[]) => {
    dispatch({ type: 'SET_SEGMENTS', payload: segments });
  };

  const setActiveSegment = (segmentId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SEGMENT', payload: segmentId });
  };

  const highlightSegment = (segmentId: string) => {
    dispatch({ type: 'HIGHLIGHT_SEGMENT', payload: segmentId });
  };

  const clearHighlights = () => {
    dispatch({ type: 'CLEAR_HIGHLIGHTS' });
  };

  const setSearchQuery = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const linkNodeToSegment = (segmentId: string, nodeId: string) => {
    dispatch({ type: 'LINK_NODE_TO_SEGMENT', payload: { segmentId, nodeId } });
  };

  const searchTranscript = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }

    const results = state.segments
      .filter(seg =>
        seg.text.toLowerCase().includes(query.toLowerCase()) ||
        seg.speaker?.toLowerCase().includes(query.toLowerCase())
      )
      .map(seg => seg.id);

    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
  };

  const exportTranscript = (): string => {
    return state.segments
      .map(seg => {
        const timestamp = new Date(seg.timestamp).toISOString();
        const speaker = seg.speaker ? `${seg.speaker}: ` : '';
        return `[${timestamp}] ${speaker}${seg.text}`;
      })
      .join('\n');
  };

  return (
    <TranscriptContext.Provider
      value={{
        state,
        dispatch,
        addSegment,
        setSegments,
        setActiveSegment,
        highlightSegment,
        clearHighlights,
        setSearchQuery,
        linkNodeToSegment,
        searchTranscript,
        exportTranscript,
      }}
    >
      {children}
    </TranscriptContext.Provider>
  );
}

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error('useTranscript must be used within a TranscriptProvider');
  }
  return context;
}
