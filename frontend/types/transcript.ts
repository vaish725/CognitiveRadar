export interface TranscriptSegment {
  id: string;
  text: string;
  speaker?: string;
  timestamp: number;
  nodeIds: string[];
  highlighted?: boolean;
}

export interface TranscriptState {
  segments: TranscriptSegment[];
  activeSegmentId: string | null;
  searchQuery: string;
  searchResults: string[];
}
