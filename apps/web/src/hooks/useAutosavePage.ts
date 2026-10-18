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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Single-flight: the promise of the save currently on the wire, if any
  const inFlightSaveRef = useRef<Promise<void> | null>(null);

  // Latest page ref to guarantee latest state wins (avoid stale closure)
  const latestPageRef = useRef<Page | null>(page);
  latestPageRef.current = page;

  // Serialize comparable state (background, metadata, elements data/transform/style)
  const serializePageState = (p: Page | null): string => {
    if (!p) return '';
    const pAny = p as any;
    return JSON.stringify({
      title: p.title,
      chapter: p.chapter,
      quote: p.quote,
      handwriting: p.handwriting,
      audioTrackId: pAny.audioTrackId,
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

  // Perform actual PATCH of changed data. Never call directly: use saveLatest().
  const persist = useCallback(
    async (targetPage: Page): Promise<void> => {
      setStatus('saving');
      setErrorMessage(null);

      try {
        const serialized = serializePageState(targetPage);
        const pAny = targetPage as any;

        // 1. PATCH page metadata & background & page-level audio
        const pageUpdatePayload: Record<string, any> = {
          background: targetPage.background,
          isCustomized: targetPage.isCustomized,
        };
        if (targetPage.title !== undefined) pageUpdatePayload.title = targetPage.title;
        if (targetPage.chapter !== undefined) pageUpdatePayload.chapter = targetPage.chapter;
        if (targetPage.quote !== undefined) pageUpdatePayload.quote = targetPage.quote;
        if (targetPage.handwriting !== undefined) pageUpdatePayload.handwriting = targetPage.handwriting;
        if ('audioTrackId' in pAny) pageUpdatePayload.audioTrackId = pAny.audioTrackId;
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

        lastSavedStateRef.current = serialized;
        setLastSavedTime(new Date());
        const latest = latestPageRef.current;
        setStatus(latest && serializePageState(latest) !== serialized ? 'unsaved' : 'saved');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Không thể lưu tự động');
        throw err;
      }
    },
    [pageId]
  );

  /**
   * Saves the latest page state, waiting for any in-flight save first so the newest state
   * always lands last. Resolves once everything is persisted; rejects if the save fails.
   * Failures are not retried automatically: the next edit or an explicit retry triggers a new save.
   */
  const saveLatest = useCallback(async (): Promise<void> => {
    if (isViewer) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    while (inFlightSaveRef.current) {
      try {
        await inFlightSaveRef.current;
      } catch {
        // The previous attempt's failure is superseded by this attempt
      }
    }

    const target = latestPageRef.current;
    if (!target || serializePageState(target) === lastSavedStateRef.current) return;

    const run = persist(target);
    inFlightSaveRef.current = run;
    try {
      await run;
    } finally {
      if (inFlightSaveRef.current === run) inFlightSaveRef.current = null;
    }

    // Edits made while this request was on the wire get their own debounced save
    const latest = latestPageRef.current;
    if (latest && serializePageState(latest) !== lastSavedStateRef.current) {
      debounceTimerRef.current = setTimeout(() => {
        saveLatest().catch(() => {});
      }, debounceMs);
    }
  }, [isViewer, persist, debounceMs]);

  // Manual retry trigger
  const retrySave = useCallback(() => {
    saveLatest().catch(() => {});
  }, [saveLatest]);

  // Force immediate save (e.g. user clicks Save button): throws on failure so caller doesn't show false success
  const forceSave = useCallback(async () => {
    await saveLatest();
  }, [saveLatest]);

  /** Persists pending edits before leaving the editor, publishing or previewing. Returns false on failure. */
  const flush = useCallback(async (): Promise<boolean> => {
    try {
      await saveLatest();
      return true;
    } catch {
      return false;
    }
  }, [saveLatest]);

  // Flush on unmount so in-app navigation within the debounce window does not drop edits
  const saveLatestRef = useRef(saveLatest);
  saveLatestRef.current = saveLatest;
  useEffect(() => {
    return () => {
      const latest = latestPageRef.current;
      if (latest && lastSavedStateRef.current !== null && serializePageState(latest) !== lastSavedStateRef.current) {
        saveLatestRef.current().catch(() => {});
      }
    };
  }, []);

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
      if (!inFlightSaveRef.current) {
        setStatus('saved');
      }
      return;
    }

    // Page changed: mark unsaved (unless a request is on the wire) and schedule debounce timer
    if (!inFlightSaveRef.current) setStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveLatest().catch(() => {});
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [page, isViewer, debounceMs, saveLatest]);

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
    flush,
  };
}
