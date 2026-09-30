'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { updateAdminPage, batchUpdateElements } from '@/services/adminApi';
import { Page } from '@/types/book';

export type AutosaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface UseAutosavePageOptions {
  pageId: string;
  isViewer?: boolean;
  debounceMs?: number;
}

export function useAutosavePage(
  page: Page | null,
  options: UseAutosavePageOptions
) {
  const { pageId, isViewer = false, debounceMs = 800 } = options;

  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reference to track initial loaded snapshot & avoid saving on mount
  const lastSavedStateRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);
  const isSavingRef = useRef(false);
  const hasPendingUpdateRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Latest page ref to guarantee latest state wins (avoid stale closure)
  const latestPageRef = useRef<Page | null>(page);
  latestPageRef.current = page;

  // Track request sequence to prevent stale out-of-order response overwriting newer state
  const saveSequenceRef = useRef(0);

  // Serialize comparable state (background, metadata, elements data/transform/style)
  const serializePageState = (p: Page | null): string => {
    if (!p) return '';
    return JSON.stringify({
      background: p.background,
      isCustomized: p.isCustomized,
      layoutTemplateId: p.layoutTemplateId,
      sourceTemplateId: p.sourceTemplateId,
      layoutMode: p.layoutMode,
      elements: (p.elements || []).map((el) => ({
        id: el.id,
        zIndex: el.zIndex,
        order: el.order,
        visible: el.visible,
        locked: el.locked,
        opacity: el.opacity,
        transform: el.transform,
        style: el.style,
        data: el.data,
        interaction: el.interaction,
      })),
    });
  };

  // Perform actual PATCH of changed data
  const executeSave = useCallback(
    async (targetPage: Page, shouldThrow = false): Promise<boolean> => {
      if (isViewer) return false;

      // If already in flight, mark pending update and let current cycle re-trigger
      if (isSavingRef.current) {
        hasPendingUpdateRef.current = true;
        return false;
      }

      const currentSeq = ++saveSequenceRef.current;
      isSavingRef.current = true;
      hasPendingUpdateRef.current = false;
      setStatus('saving');
      setErrorMessage(null);

      try {
        const serialized = serializePageState(targetPage);

        // 1. PATCH page metadata & background
        const pageUpdatePayload: Record<string, any> = {
          background: targetPage.background,
          isCustomized: targetPage.isCustomized,
        };
        if (targetPage.layoutTemplateId) pageUpdatePayload.layoutTemplateId = targetPage.layoutTemplateId;
        if (targetPage.sourceTemplateId) pageUpdatePayload.sourceTemplateId = targetPage.sourceTemplateId;
        if (targetPage.layoutMode) pageUpdatePayload.layoutMode = targetPage.layoutMode;

        await updateAdminPage(pageId, pageUpdatePayload, true);

        // 2. Batch update elements
        const elementsPayload = (targetPage.elements || []).map((el) => ({
          id: el.id,
          zIndex: el.zIndex,
          order: el.order,
          visible: el.visible,
          locked: el.locked,
          opacity: el.opacity,
          transform: el.transform,
          style: el.style,
          data: el.data,
          interaction: el.interaction,
        }));

        await batchUpdateElements(pageId, elementsPayload);

        // Check if a newer save request has been queued while we were in flight
        if (currentSeq === saveSequenceRef.current) {
          lastSavedStateRef.current = serialized;
          setStatus('saved');
          setLastSavedTime(new Date());
          setErrorMessage(null);
        }
        return true;
      } catch (err: any) {
        if (currentSeq === saveSequenceRef.current) {
          setStatus('error');
          setErrorMessage(err?.message || 'Không thể lưu tự động');
        }
        if (shouldThrow) {
          throw err;
        }
        return false;
      } finally {
        isSavingRef.current = false;

        // If changes arrived while saving or pending update flag was set, immediately trigger next save cycle
        if (
          hasPendingUpdateRef.current ||
          (latestPageRef.current && serializePageState(latestPageRef.current) !== lastSavedStateRef.current)
        ) {
          setStatus('unsaved');
          if (latestPageRef.current) {
            executeSave(latestPageRef.current, false);
          }
        }
      }
    },
    [pageId, isViewer]
  );

  // Manual retry trigger
  const retrySave = useCallback(() => {
    if (latestPageRef.current && !isViewer) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      executeSave(latestPageRef.current, false);
    }
  }, [executeSave, isViewer]);

  // Force immediate save (e.g. user clicks Save button): strictly throws on failure so caller doesn't show false success!
  const forceSave = useCallback(async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (latestPageRef.current && !isViewer) {
      await executeSave(latestPageRef.current, true);
    }
  }, [executeSave, isViewer]);

  // Effect to watch changes on `page` and trigger debounced autosave
  useEffect(() => {
    if (!page || isViewer) return;

    const currentSerialized = serializePageState(page);

    // Initial mount setup
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      lastSavedStateRef.current = currentSerialized;
      setStatus('saved');
      return;
    }

    // Compare with last saved state
    if (currentSerialized === lastSavedStateRef.current) {
      if (status !== 'saving') {
        setStatus('saved');
      }
      return;
    }

    // Page changed: mark unsaved and schedule debounce timer (500-1000ms)
    setStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (latestPageRef.current) {
        executeSave(latestPageRef.current, false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [page, isViewer, debounceMs, executeSave]);

  // Browser beforeunload protection: warn leaving page if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'unsaved' || status === 'saving') {
        e.preventDefault();
        e.returnValue = 'Bạn có các thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [status]);

  return {
    status,
    lastSavedTime,
    errorMessage,
    retrySave,
    forceSave,
  };
}
