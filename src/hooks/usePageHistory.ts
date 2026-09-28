'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Page } from '@/types/book';

export interface HistoryOperation {
  description?: string;
  snapshot: Page;
}

interface UsePageHistoryOptions {
  maxHistory?: number;
  onHistoryChange?: (page: Page) => void;
}

export function usePageHistory(
  initialPage: Page | null,
  options: UsePageHistoryOptions = {}
) {
  const { maxHistory = 40, onHistoryChange } = options;

  // Past stack and Future stack
  const pastRef = useRef<Page[]>([]);
  const futureRef = useRef<Page[]>([]);

  // State flags for UI enable/disable
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Keep track of current committed state
  const currentSnapshotRef = useRef<Page | null>(null);

  // Initialize or reset history when initialPage is first loaded
  const initHistory = useCallback((page: Page) => {
    // Deep clone to isolate snapshots
    currentSnapshotRef.current = JSON.parse(JSON.stringify(page));
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const updateFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  /**
   * Records a distinct operation into history:
   * Moves current snapshot to past, clears future, sets new state.
   */
  const recordHistory = useCallback(
    (nextPage: Page, description?: string) => {
      if (!currentSnapshotRef.current) {
        currentSnapshotRef.current = JSON.parse(JSON.stringify(nextPage));
        return;
      }

      // Check if state actually changed before pushing to stack
      const prevSerialized = JSON.stringify(currentSnapshotRef.current);
      const nextSerialized = JSON.stringify(nextPage);
      if (prevSerialized === nextSerialized) {
        return;
      }

      // Push current snapshot to past
      pastRef.current.push(currentSnapshotRef.current);
      if (pastRef.current.length > maxHistory) {
        pastRef.current.shift(); // Trim oldest entry
      }

      // Clear redo stack on new user action
      futureRef.current = [];

      // Update current snapshot
      currentSnapshotRef.current = JSON.parse(nextSerialized);

      updateFlags();
    },
    [maxHistory, updateFlags]
  );

  /**
   * Undo: pop past -> push current to future -> restore past state
   */
  const undo = useCallback((): Page | null => {
    if (pastRef.current.length === 0 || !currentSnapshotRef.current) return null;

    const previousPage = pastRef.current.pop()!;
    futureRef.current.push(currentSnapshotRef.current);
    currentSnapshotRef.current = previousPage;

    updateFlags();

    if (onHistoryChange) {
      onHistoryChange(previousPage);
    }

    return previousPage;
  }, [onHistoryChange, updateFlags]);

  /**
   * Redo: pop future -> push current to past -> restore future state
   */
  const redo = useCallback((): Page | null => {
    if (futureRef.current.length === 0 || !currentSnapshotRef.current) return null;

    const nextPage = futureRef.current.pop()!;
    pastRef.current.push(currentSnapshotRef.current);
    currentSnapshotRef.current = nextPage;

    updateFlags();

    if (onHistoryChange) {
      onHistoryChange(nextPage);
    }

    return nextPage;
  }, [onHistoryChange, updateFlags]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    recordHistory,
    initHistory,
  };
}
