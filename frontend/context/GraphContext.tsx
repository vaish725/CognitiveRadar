import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Graph, Node, Edge } from '@/types/graph';

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  filter: {
    nodeTypes: string[];
    edgeTypes: string[];
  };
}

type GraphAction =
  | { type: 'ADD_NODE'; payload: Node }
  | { type: 'ADD_EDGE'; payload: Edge }
  | { type: 'SET_NODES'; payload: Node[] }
  | { type: 'SET_EDGES'; payload: Edge[] }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'HIGHLIGHT_NODES'; payload: string[] }
  | { type: 'SET_FILTER'; payload: Partial<GraphState['filter']> }
  | { type: 'CLEAR_GRAPH' };

const initialState: GraphState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  highlightedNodeIds: [],
  filter: {
    nodeTypes: [],
    edgeTypes: [],
  },
};

function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'ADD_NODE':
      if (state.nodes.some(n => n.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        nodes: [...state.nodes, action.payload],
      };
    
    case 'ADD_EDGE':
      if (state.edges.some(e => e.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        edges: [...state.edges, action.payload],
      };
    
    case 'SET_NODES':
      return {
        ...state,
        nodes: action.payload,
      };
    
    case 'SET_EDGES':
      return {
        ...state,
        edges: action.payload,
      };
    
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNodeId: action.payload,
      };
    
    case 'HIGHLIGHT_NODES':
      return {
        ...state,
        highlightedNodeIds: action.payload,
      };
    
    case 'SET_FILTER':
      return {
        ...state,
        filter: {
          ...state.filter,
          ...action.payload,
        },
      };
    
    case 'CLEAR_GRAPH':
      return initialState;
    
    default:
      return state;
  }
}

interface GraphContextType {
  state: GraphState;
  dispatch: React.Dispatch<GraphAction>;
  addNode: (node: Node) => void;
  addEdge: (edge: Edge) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  selectNode: (nodeId: string | null) => void;
  highlightNodes: (nodeIds: string[]) => void;
  setFilter: (filter: Partial<GraphState['filter']>) => void;
  clearGraph: () => void;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export function GraphProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(graphReducer, initialState);

  const addNode = (node: Node) => {
    dispatch({ type: 'ADD_NODE', payload: node });
  };

  const addEdge = (edge: Edge) => {
    dispatch({ type: 'ADD_EDGE', payload: edge });
  };

  const setNodes = (nodes: Node[]) => {
    dispatch({ type: 'SET_NODES', payload: nodes });
  };

  const setEdges = (edges: Edge[]) => {
    dispatch({ type: 'SET_EDGES', payload: edges });
  };

  const selectNode = (nodeId: string | null) => {
    dispatch({ type: 'SELECT_NODE', payload: nodeId });
  };

  const highlightNodes = (nodeIds: string[]) => {
    dispatch({ type: 'HIGHLIGHT_NODES', payload: nodeIds });
  };

  const setFilter = (filter: Partial<GraphState['filter']>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  };

  const clearGraph = () => {
    dispatch({ type: 'CLEAR_GRAPH' });
  };

  return (
    <GraphContext.Provider
      value={{
        state,
        dispatch,
        addNode,
        addEdge,
        setNodes,
        setEdges,
        selectNode,
        highlightNodes,
        setFilter,
        clearGraph,
      }}
    >
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
}
