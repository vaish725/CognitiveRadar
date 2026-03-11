import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Insight {
  id: string;
  type: 'gap' | 'contradiction' | 'assumption' | 'question';
  data: any;
  timestamp: number;
  priority?: 'high' | 'medium' | 'low';
}

interface InsightState {
  insights: Insight[];
  filter: {
    types: string[];
  };
}

type InsightAction =
  | { type: 'ADD_INSIGHT'; payload: Insight }
  | { type: 'SET_INSIGHTS'; payload: Insight[] }
  | { type: 'SET_FILTER'; payload: Partial<InsightState['filter']> }
  | { type: 'CLEAR_INSIGHTS' };

const initialState: InsightState = {
  insights: [],
  filter: {
    types: [],
  },
};

function insightReducer(state: InsightState, action: InsightAction): InsightState {
  switch (action.type) {
    case 'ADD_INSIGHT':
      if (state.insights.some(i => i.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        insights: [action.payload, ...state.insights],
      };
    
    case 'SET_INSIGHTS':
      return {
        ...state,
        insights: action.payload,
      };
    
    case 'SET_FILTER':
      return {
        ...state,
        filter: {
          ...state.filter,
          ...action.payload,
        },
      };
    
    case 'CLEAR_INSIGHTS':
      return initialState;
    
    default:
      return state;
  }
}

interface InsightContextType {
  state: InsightState;
  dispatch: React.Dispatch<InsightAction>;
  addInsight: (insight: Insight) => void;
  setInsights: (insights: Insight[]) => void;
  setFilter: (filter: Partial<InsightState['filter']>) => void;
  clearInsights: () => void;
  getFilteredInsights: () => Insight[];
}

const InsightContext = createContext<InsightContextType | undefined>(undefined);

export function InsightProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(insightReducer, initialState);

  const addInsight = (insight: Insight) => {
    dispatch({ type: 'ADD_INSIGHT', payload: insight });
  };

  const setInsights = (insights: Insight[]) => {
    dispatch({ type: 'SET_INSIGHTS', payload: insights });
  };

  const setFilter = (filter: Partial<InsightState['filter']>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  };

  const clearInsights = () => {
    dispatch({ type: 'CLEAR_INSIGHTS' });
  };

  const getFilteredInsights = () => {
    if (state.filter.types.length === 0) {
      return state.insights;
    }
    return state.insights.filter(insight =>
      state.filter.types.includes(insight.type)
    );
  };

  return (
    <InsightContext.Provider
      value={{
        state,
        dispatch,
        addInsight,
        setInsights,
        setFilter,
        clearInsights,
        getFilteredInsights,
      }}
    >
      {children}
    </InsightContext.Provider>
  );
}

export function useInsights() {
  const context = useContext(InsightContext);
  if (!context) {
    throw new Error('useInsights must be used within an InsightProvider');
  }
  return context;
}
