import { useEffect, useRef } from 'react';
import { useGraph } from '@/context/GraphContext';

export function useGraphZoom() {
  const { state } = useGraph();
  const zoomLevelRef = useRef(1);

  const zoomIn = () => {
    zoomLevelRef.current = Math.min(zoomLevelRef.current * 1.2, 10);
  };

  const zoomOut = () => {
    zoomLevelRef.current = Math.max(zoomLevelRef.current / 1.2, 0.1);
  };

  const resetZoom = () => {
    zoomLevelRef.current = 1;
  };

  return { zoomIn, zoomOut, resetZoom, zoomLevel: zoomLevelRef.current };
}
