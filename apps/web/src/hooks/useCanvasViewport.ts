'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCanvasViewport(ready: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.42);
  const [autoFit, setAutoFit] = useState(true);
  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !viewport.clientWidth || !viewport.clientHeight) return;
    setScale(Math.max(0.05, Math.min(1, (viewport.clientWidth - 32) / 1024, (viewport.clientHeight - 32) / 1360)));
  }, []);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!ready || !viewport || !autoFit) return;
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    fit();
    return () => observer.disconnect();
  }, [ready, autoFit, fit]);
  const zoom = useCallback((update: React.SetStateAction<number>) => {
    setAutoFit(false);
    setScale(update);
  }, []);
  const fitViewport = useCallback(() => { setAutoFit(true); fit(); }, [fit]);
  return { viewportRef, scale, zoom, fitViewport };
}
