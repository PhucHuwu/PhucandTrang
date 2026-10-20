'use client';

import { useEffect, useRef, useState } from 'react';
import type { SnapGuideLine } from '@phucandtrang/shared';

export function useSnapGuides() {
  // Active magnetic snapping guide lines. dragmove fires per pointer event; the guides are
  // committed to state at most once per animation frame and only when they actually change.
  const [activeGuides, setActiveGuides] = useState<SnapGuideLine[]>([]);
  const pendingGuidesRef = useRef<SnapGuideLine[]>([]);
  const committedGuidesKeyRef = useRef('[]');
  const guidesFrameRef = useRef<number | null>(null);

  const scheduleGuides = (guides: SnapGuideLine[]) => {
    pendingGuidesRef.current = guides;
    if (guidesFrameRef.current !== null) return;
    guidesFrameRef.current = window.requestAnimationFrame(() => {
      guidesFrameRef.current = null;
      const next = pendingGuidesRef.current;
      const key = JSON.stringify(next);
      if (key === committedGuidesKeyRef.current) return;
      committedGuidesKeyRef.current = key;
      setActiveGuides(next);
    });
  };

  const clearGuides = () => {
    if (guidesFrameRef.current !== null) {
      window.cancelAnimationFrame(guidesFrameRef.current);
      guidesFrameRef.current = null;
    }
    pendingGuidesRef.current = [];
    if (committedGuidesKeyRef.current !== '[]') {
      committedGuidesKeyRef.current = '[]';
      setActiveGuides([]);
    }
  };

  useEffect(
    () => () => {
      if (guidesFrameRef.current !== null) window.cancelAnimationFrame(guidesFrameRef.current);
    },
    []
  );

  return { activeGuides, scheduleGuides, clearGuides };
}
