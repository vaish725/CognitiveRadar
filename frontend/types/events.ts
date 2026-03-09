export enum EventType {
  NODE_ADDED = 'node_added',
  EDGE_ADDED = 'edge_added',
  CONTRADICTION_DETECTED = 'contradiction_detected',
  GAP_DETECTED = 'gap_detected',
  ASSUMPTION_DETECTED = 'assumption_detected',
  QUESTION_GENERATED = 'question_generated',
  TRANSCRIPT_UPDATE = 'transcript_update'
}

export interface GraphEvent {
  type: EventType;
  sessionId: string;
  timestamp: number;
  data: unknown;
}

export interface NodeAddedEvent extends GraphEvent {
  type: EventType.NODE_ADDED;
  data: {
    nodeId: string;
    nodeType: string;
    text: string;
    confidence: number;
  };
}

export interface EdgeAddedEvent extends GraphEvent {
  type: EventType.EDGE_ADDED;
  data: {
    edgeId: string;
    source: string;
    target: string;
    edgeType: string;
    confidence: number;
  };
}

export interface InsightEvent extends GraphEvent {
  type: EventType.CONTRADICTION_DETECTED | EventType.GAP_DETECTED | EventType.ASSUMPTION_DETECTED;
  data: {
    insightId: string;
    title: string;
    description: string;
    relatedNodes: string[];
  };
}
