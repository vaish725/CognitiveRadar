export enum NodeType {
  CONCEPT = 'concept',
  CLAIM = 'claim',
  ASSUMPTION = 'assumption',
  QUESTION = 'question',
  EVIDENCE = 'evidence',
  GAP = 'gap',
  CONTRADICTION = 'contradiction'
}

export enum EdgeType {
  SUPPORTS = 'supports',
  CONTRADICTS = 'contradicts',
  DEPENDS_ON = 'depends_on',
  EXAMPLE_OF = 'example_of'
}

export interface Node {
  id: string;
  type: NodeType;
  text: string;
  confidence: number;
  timestamp: number;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  confidence: number;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface Insight {
  id: string;
  type: 'gap' | 'assumption' | 'contradiction' | 'question';
  title: string;
  description: string;
  relatedNodes: string[];
  timestamp: number;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  nodeIds?: string[];
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  graph: Graph;
  transcript: TranscriptSegment[];
  insights: Insight[];
}
