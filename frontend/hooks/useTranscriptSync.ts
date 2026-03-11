import { useEffect } from 'react';
import { useTranscript } from '@/context/TranscriptContext';
import { useWebSocket } from '@/context/WebSocketContext';

export function useTranscriptSync() {
  const { addSegment, linkNodeToSegment } = useTranscript();
  const { state: wsState } = useWebSocket();

  useEffect(() => {
    if (!wsState.client) return;

    const handleTranscriptSegment = (data: any) => {
      addSegment({
        id: data.segment_id || `seg-${Date.now()}`,
        text: data.text,
        speaker: data.speaker,
        timestamp: data.timestamp || Date.now(),
        nodeIds: data.node_ids || [],
      });
    };

    const handleNodeAdded = (data: any) => {
      if (data.source_segment_id) {
        linkNodeToSegment(data.source_segment_id, data.node.id);
      }
    };

    wsState.client.on('transcript_segment', handleTranscriptSegment);
    wsState.client.on('node_added', handleNodeAdded);

    return () => {
      wsState.client?.off('transcript_segment', handleTranscriptSegment);
      wsState.client?.off('node_added', handleNodeAdded);
    };
  }, [wsState.client, addSegment, linkNodeToSegment]);
}
