'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  saveAdminPage,
  deleteAdminElement,
  getAdminPage,
  isPageConflictError,
  isAtomicSaveKnownMissing,
  onBeforeUnauthorizedRedirect,
  AdminApiError,
  SavePagePayload,
} from '@/services/adminApi';
import { Page } from '@/types/book';

export type AutosaveStatus = 'saved' | 'saving' | 'unsaved' | 'error' | 'conflict';

interface UseAutosavePageOptions {
  pageId: string;
  isViewer?: boolean;
  debounceMs?: number;
}

export interface PageConflictInfo {
  currentUpdatedAt?: string;
}

/** Local draft stored when edits could not reach the server (401 redirect, tab closed mid-save). */
export interface PageDraft {
  pageId: string;
  page: Page;
  baseUpdatedAt: string | null;
  savedAt: number;
}

// Never equal to a real page.updatedAt, so a save based on it always raises the conflict prompt.
const UNKNOWN_DRAFT_BASE = '1970-01-01T00:00:00.000Z';

// Browsers cap the total in-flight keepalive body size at 64KB.
const KEEPALIVE_MAX_BYTES = 60 * 1024;

export function pageDraftKey(pageId: string) {
  return `draft:page:${pageId}`;
}

export function readPageDraft(pageId: string): PageDraft | null {
  try {
    const raw = window.localStorage.getItem(pageDraftKey(pageId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as PageDraft;
    if (!draft || draft.pageId !== pageId || !draft.page || draft.page.id !== pageId) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearPageDraft(pageId: string) {
  try {
    window.localStorage.removeItem(pageDraftKey(pageId));
  } catch {
    // Storage unavailable (private mode / quota) — nothing to clear
  }
}

function writePageDraft(draft: PageDraft) {
  try {
    window.localStorage.setItem(pageDraftKey(draft.pageId), JSON.stringify(draft));
  } catch {
    // Quota exceeded: the beforeunload warning is the remaining safety net
  }
}

/** Serialize comparable state (background, metadata, elements data/transform/style). */
export function serializePageState(p: Page | null): string {
  if (!p) return '';
  return JSON.stringify({
    title: p.title,
    chapter: p.chapter,
    quote: p.quote,
    handwriting: p.handwriting,
    audioTrackId: p.audioTrackId,
    background: p.background,
    isCustomized: p.isCustomized,
    layoutTemplateId: p.layoutTemplateId,
    sourceTemplateId: p.sourceTemplateId,
    layoutMode: p.layoutMode,
    elements: (p.elements || []).map((el) => ({
      id: el.id,
      type: el.type,
      slot: el.slot,
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
}

/**
 * Full-state payload for POST /pages/:id/save. JSON fields are replaced wholesale on the server, so
 * cleared style/interaction are sent as explicit null, and `type`/`slot` are always included so an
 * element removed on the server (e.g. undo of a delete) can be re-created with the same id.
 */
export function buildSavePayload(p: Page, baseUpdatedAt: string | null): SavePagePayload {
  const pageFields: Record<string, any> = {
    isCustomized: Boolean(p.isCustomized),
  };
  if (p.background !== undefined) pageFields.background = p.background;
  if (p.title !== undefined) pageFields.title = p.title;
  if (p.chapter !== undefined) pageFields.chapter = p.chapter;
  if (p.quote !== undefined) pageFields.quote = p.quote;
  if (p.handwriting !== undefined) pageFields.handwriting = p.handwriting;
  if ('audioTrackId' in p) pageFields.audioTrackId = p.audioTrackId ?? null;
  if (p.layoutTemplateId) pageFields.layoutTemplateId = p.layoutTemplateId;
  if (p.sourceTemplateId) pageFields.sourceTemplateId = p.sourceTemplateId;
  if (p.layoutMode) pageFields.layoutMode = p.layoutMode;

  return {
    page: pageFields,
    elements: (p.elements || []).map((el) => ({
      id: el.id,
      type: el.type,
      slot: el.slot ?? null,
      zIndex: el.zIndex,
      order: el.order,
      visible: el.visible,
      locked: el.locked,
      opacity: el.opacity,
      transform: el.transform as any,
      style: (el.style as any) ?? null,
      data: (el.data as any) ?? {},
      interaction: (el.interaction as any) ?? null,
    })),
    ...(baseUpdatedAt ? { baseUpdatedAt } : {}),
  };
}

class PageConflictPendingError extends Error {
  constructor() {
    super('Trang đang có xung đột chỉnh sửa. Hãy chọn tải bản mới nhất hoặc ghi đè trước.');
    this.name = 'PageConflictPendingError';
  }
}

type PersistMode = 'normal' | 'keepalive-preferred' | 'keepalive-only';

export function useAutosavePage(page: Page | null, options: UseAutosavePageOptions) {
  const { pageId, isViewer = false, debounceMs = 800 } = options;

  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<PageConflictInfo | null>(null);
  // Elements the server refused in the last save (e.g. re-create unsupported by an older backend)
  const [skippedElementIds, setSkippedElementIds] = useState<string[]>([]);

  // Serialized state the server is known to hold; null until the first page for pageId is loaded
  const lastSavedStateRef = useRef<string | null>(null);
  // Page the baseline above belongs to; a different page id is always treated as a fresh load
  const baselinePageIdRef = useRef<string | null>(null);
  // Optimistic-concurrency token (page.updatedAt). null = unknown, saves go without the check.
  const baseUpdatedAtRef = useRef<string | null>(null);
  // Element ids known to exist on the server for this page (loaded, created or re-created here).
  // Ids in here but missing from local state (undo of add/duplicate) are deleted on the next save.
  const knownServerIdsRef = useRef<Set<string>>(new Set());
  // Ids the server refused to (re-)create; not retried until the baseline is reset
  const skippedIdsRef = useRef<Set<string>>(new Set());
  // Bumped by resetBaseline so a request started for a previous baseline cannot overwrite it
  const generationRef = useRef(0);
  const conflictRef = useRef<PageConflictInfo | null>(null);
  const forceOverwriteRef = useRef(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Single-flight: the save / server mutation currently on the wire, if any
  const inFlightSaveRef = useRef<Promise<unknown> | null>(null);
  const inFlightKeepaliveRef = useRef(false);

  // Latest page ref to guarantee latest state wins (avoid stale closure)
  const latestPageRef = useRef<Page | null>(page);
  latestPageRef.current = page;

  const pendingDeleteIds = useCallback((p: Page | null): string[] => {
    if (!p) return [];
    const localIds = new Set((p.elements || []).map((el) => el.id));
    return Array.from(knownServerIdsRef.current).filter((id) => !localIds.has(id));
  }, []);

  // Local elements the server does not hold (undo of a delete, restored draft) must be (re-)created
  const hasUnknownLocalElements = useCallback((p: Page): boolean => {
    return (p.elements || []).some(
      (el) => !knownServerIdsRef.current.has(el.id) && !skippedIdsRef.current.has(el.id)
    );
  }, []);

  const isDirty = useCallback(
    (p: Page | null = latestPageRef.current): boolean => {
      if (!p || lastSavedStateRef.current === null || p.id !== baselinePageIdRef.current) return false;
      return (
        serializePageState(p) !== lastSavedStateRef.current ||
        pendingDeleteIds(p).length > 0 ||
        hasUnknownLocalElements(p)
      );
    },
    [pendingDeleteIds, hasUnknownLocalElements]
  );

  const clearDebounce = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  /**
   * Declares `p` as the state the server currently holds (initial load, reload after conflict,
   * rollback, apply-layout). Nothing is saved for it and any in-flight result is ignored.
   */
  const resetBaseline = useCallback((p: Page) => {
    generationRef.current += 1;
    clearDebounce();
    baselinePageIdRef.current = p.id;
    lastSavedStateRef.current = serializePageState(p);
    baseUpdatedAtRef.current = (p as any).updatedAt ?? null;
    knownServerIdsRef.current = new Set((p.elements || []).map((el) => el.id));
    skippedIdsRef.current = new Set();
    conflictRef.current = null;
    forceOverwriteRef.current = false;
    setConflict(null);
    setErrorMessage(null);
    setStatus('saved');
  }, []);

  const enterConflict = useCallback((err: unknown) => {
    const info: PageConflictInfo = {
      currentUpdatedAt: err instanceof AdminApiError ? err.body?.currentUpdatedAt : undefined,
    };
    conflictRef.current = info;
    clearDebounce();
    setConflict(info);
    setStatus('conflict');
    setErrorMessage('Trang đã được thay đổi ở nơi khác');
  }, []);

  /** Re-reads page.updatedAt after a non-save mutation (create/duplicate/delete bump it server-side). */
  const refreshBaseUpdatedAt = useCallback(async () => {
    if (baseUpdatedAtRef.current === null) return;
    try {
      const fresh = await getAdminPage(pageId);
      baseUpdatedAtRef.current = fresh?.updatedAt ?? null;
    } catch {
      // Unknown token: the next save goes without the check rather than raising a false conflict
      baseUpdatedAtRef.current = null;
    }
  }, [pageId]);

  // Performs the save. Never call directly: use saveLatest().
  const persist = useCallback(
    async (targetPage: Page, mode: PersistMode): Promise<boolean> => {
      // A page object that does not belong to this editor must never be written to pageId
      if (targetPage.id !== pageId || baselinePageIdRef.current !== pageId) {
        console.warn('[autosave] Bỏ qua lưu: dữ liệu trang không khớp với trang đang mở', {
          pageId,
          targetPageId: targetPage.id,
        });
        return false;
      }

      const generation = generationRef.current;
      const overwrite = forceOverwriteRef.current;
      const serialized = serializePageState(targetPage);
      const payload = buildSavePayload(targetPage, overwrite ? null : baseUpdatedAtRef.current);

      let keepalive = false;
      if (mode !== 'normal') {
        const bytes = new Blob([JSON.stringify(payload)]).size;
        // The legacy two-request fallback is not sent with keepalive, so it cannot survive an unload
        keepalive = bytes <= KEEPALIVE_MAX_BYTES && !isAtomicSaveKnownMissing();
        if (!keepalive && mode === 'keepalive-only') return false;
      }

      setStatus('saving');
      setErrorMessage(null);
      inFlightKeepaliveRef.current = keepalive;

      try {
        const result = await saveAdminPage(pageId, payload, { keepalive });
        if (generation !== generationRef.current) return true;

        if (overwrite) {
          forceOverwriteRef.current = false;
          conflictRef.current = null;
          setConflict(null);
        }
        const skipped = new Set(result.skippedElementIds);
        if (skipped.size > 0) {
          console.warn('[autosave] Máy chủ bỏ qua các phần tử:', Array.from(skipped));
        }
        for (const el of targetPage.elements || []) {
          if (skipped.has(el.id)) skippedIdsRef.current.add(el.id);
          else knownServerIdsRef.current.add(el.id);
        }
        // The legacy two-request path bumps updatedAt without telling us the new value
        baseUpdatedAtRef.current = result.atomic ? result.page?.updatedAt ?? null : null;

        // Undo of add/duplicate: those elements still exist on the server
        const localIds = new Set((targetPage.elements || []).map((el) => el.id));
        const toDelete = Array.from(knownServerIdsRef.current).filter((id) => !localIds.has(id));
        if (toDelete.length > 0) {
          let tokenKnown = baseUpdatedAtRef.current !== null;
          for (const id of toDelete) {
            try {
              const deleted = await deleteAdminElement(id, baseUpdatedAtRef.current);
              if (deleted?.pageUpdatedAt) baseUpdatedAtRef.current = deleted.pageUpdatedAt;
              else tokenKnown = false;
            } catch (err) {
              if (!(err instanceof AdminApiError && err.status === 404)) throw err;
            }
            knownServerIdsRef.current.delete(id);
          }
          if (!tokenKnown) await refreshBaseUpdatedAt();
          if (generation !== generationRef.current) return true;
        }

        lastSavedStateRef.current = serialized;
        setLastSavedTime(new Date());
        setSkippedElementIds(Array.from(skipped));
        const stillDirty = isDirty(latestPageRef.current);
        if (!stillDirty) clearPageDraft(pageId);
        setStatus(stillDirty ? 'unsaved' : 'saved');
        return true;
      } catch (err: any) {
        if (generation !== generationRef.current) throw err;
        if (isPageConflictError(err)) {
          enterConflict(err);
        } else {
          setStatus('error');
          setErrorMessage(err?.message || 'Không thể lưu tự động');
        }
        throw err;
      } finally {
        inFlightKeepaliveRef.current = false;
      }
    },
    [pageId, isDirty, enterConflict, refreshBaseUpdatedAt]
  );

  /**
   * Saves the latest page state, waiting for any in-flight request first so the newest state
   * always lands last. Resolves once everything is persisted; rejects if the save fails.
   * Failures are not retried automatically: the next edit or an explicit retry triggers a new save.
   */
  const saveLatest = useCallback(
    async (opts: { mode?: PersistMode; force?: boolean } = {}): Promise<void> => {
      if (isViewer) return;
      clearDebounce();

      while (inFlightSaveRef.current) {
        try {
          await inFlightSaveRef.current;
        } catch {
          // The previous attempt's failure is superseded by this attempt
        }
      }

      if (conflictRef.current && !forceOverwriteRef.current) throw new PageConflictPendingError();

      const target = latestPageRef.current;
      if (!target || (!opts.force && !isDirty(target))) return;

      const run = persist(target, opts.mode ?? 'normal');
      inFlightSaveRef.current = run;
      try {
        await run;
      } finally {
        if (inFlightSaveRef.current === run) inFlightSaveRef.current = null;
      }

      // Edits made while this request was on the wire get their own debounced save
      if (!conflictRef.current && isDirty(latestPageRef.current)) {
        debounceTimerRef.current = setTimeout(() => {
          saveLatestRef.current().catch(() => {});
        }, debounceMs);
      }
    },
    [isViewer, persist, debounceMs, isDirty]
  );

  const saveLatestRef = useRef(saveLatest);
  saveLatestRef.current = saveLatest;

  /**
   * Runs a server mutation that bypasses the save endpoint (create / duplicate / delete element,
   * apply layout) in the single-flight queue: pending edits are flushed first, and the
   * concurrency token is refreshed afterwards so the next autosave does not see a false conflict.
   * `updatedAtFrom` can supply the new page.updatedAt from the mutation response.
   */
  const runServerMutation = useCallback(
    async <T,>(
      /** Receives the concurrency token to send along, so the server rejects the change on a stale page. */
      op: (baseUpdatedAt: string | null) => Promise<T>,
      opts: {
        /** Applies the result locally; the returned page becomes the latest state before any other save can run. */
        apply?: (result: T) => Page | null | void;
        /** New page.updatedAt from the response; null = the server page did not change. */
        updatedAtFrom?: (result: T) => string | null | undefined;
      } = {}
    ): Promise<T> => {
      if (isViewer) {
        const result = await op(null);
        opts.apply?.(result);
        return result;
      }
      await saveLatest();

      while (inFlightSaveRef.current) {
        try {
          await inFlightSaveRef.current;
        } catch {
          // Superseded
        }
      }
      if (conflictRef.current) throw new PageConflictPendingError();

      // Everything was just flushed, so the state before the mutation is what the server holds
      const generation = generationRef.current;
      const preOpState = serializePageState(latestPageRef.current);
      const run = (async () => {
        let result: T;
        try {
          result = await op(baseUpdatedAtRef.current);
        } catch (err) {
          if (generation === generationRef.current && isPageConflictError(err)) enterConflict(err);
          throw err;
        }
        const fromResult = opts.updatedAtFrom?.(result);
        if (fromResult) baseUpdatedAtRef.current = fromResult;
        const editedDuringOp = serializePageState(latestPageRef.current) !== preOpState;
        // Apply before releasing the single-flight slot so a queued save never sees the pre-mutation page
        const next = opts.apply?.(result);
        if (next) {
          latestPageRef.current = next;
          // The server now holds the mutated page; without this, undoing a delete would equal the
          // stale baseline and never be saved. Edits made during the request keep the page dirty.
          if (!editedDuringOp && generation === generationRef.current && lastSavedStateRef.current === preOpState) {
            lastSavedStateRef.current = serializePageState(next);
          }
        }
        // Older API without the token in the response: re-read it (best effort)
        if (fromResult === undefined) await refreshBaseUpdatedAt();
        return result;
      })();
      inFlightSaveRef.current = run;
      try {
        return await run;
      } finally {
        if (inFlightSaveRef.current === run) inFlightSaveRef.current = null;
      }
    },
    [isViewer, saveLatest, refreshBaseUpdatedAt, enterConflict]
  );

  const markElementOnServer = useCallback((id: string) => {
    knownServerIdsRef.current.add(id);
  }, []);

  const markElementDeleted = useCallback((id: string) => {
    knownServerIdsRef.current.delete(id);
  }, []);

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

  /** Conflict resolution: resend the local state without the concurrency check. */
  const overwriteConflict = useCallback(async (): Promise<boolean> => {
    if (!conflictRef.current) return true;
    forceOverwriteRef.current = true;
    try {
      await saveLatest({ force: true });
      return !conflictRef.current;
    } catch {
      return false;
    } finally {
      forceOverwriteRef.current = false;
    }
  }, [saveLatest]);

  /** Stores the unsaved state in localStorage (offered for restore when the editor loads again). */
  const writeDraft = useCallback(() => {
    const latest = latestPageRef.current;
    if (!latest || latest.id !== pageId || !isDirty(latest)) return;
    writePageDraft({ pageId, page: latest, baseUpdatedAt: baseUpdatedAtRef.current, savedAt: Date.now() });
  }, [pageId, isDirty]);

  /**
   * After restoring a local draft, only elements that are both in the draft and on the server count
   * as server-known, so elements added on the server since the draft are never deleted by it.
   */
  const limitKnownServerIds = useCallback((ids: string[]) => {
    const keep = new Set(ids);
    knownServerIdsRef.current = new Set(Array.from(knownServerIdsRef.current).filter((id) => keep.has(id)));
  }, []);

  /**
   * A restored draft is saved against the version it was edited from, so if the server changed
   * since then the save raises the conflict prompt instead of silently overwriting. A draft without
   * a known version always asks.
   */
  const adoptDraftBase = useCallback((draftBaseUpdatedAt: string | null) => {
    baseUpdatedAtRef.current = draftBaseUpdatedAt ?? UNKNOWN_DRAFT_BASE;
  }, []);

  // Session expiry: keep the unsaved edits locally before adminFetch redirects to the login page
  useEffect(() => {
    if (isViewer) return;
    return onBeforeUnauthorizedRedirect(writeDraft);
  }, [isViewer, writeDraft]);

  // Flush on unmount so in-app navigation within the debounce window does not drop edits.
  // Whatever cannot reach the server is kept as a local draft.
  const writeDraftRef = useRef(writeDraft);
  writeDraftRef.current = writeDraft;
  useEffect(() => {
    return () => {
      if (!isDirty(latestPageRef.current)) return;
      if (conflictRef.current) {
        writeDraftRef.current();
        return;
      }
      saveLatestRef.current().catch(() => writeDraftRef.current());
    };
  }, [isDirty]);

  // Effect to watch changes on `page` and trigger debounced autosave
  useEffect(() => {
    if (!page || isViewer) return;

    // A newly loaded page (first load or a different page id) is the baseline, never a change
    if (baselinePageIdRef.current !== page.id || lastSavedStateRef.current === null) {
      if (page.id === pageId) resetBaseline(page);
      return;
    }

    if (conflictRef.current) return;

    if (!isDirty(page)) {
      if (!inFlightSaveRef.current) setStatus('saved');
      return;
    }

    // Page changed: mark unsaved (unless a request is on the wire) and schedule debounce timer
    if (!inFlightSaveRef.current) setStatus('unsaved');

    clearDebounce();
    debounceTimerRef.current = setTimeout(() => {
      saveLatest().catch(() => {});
    }, debounceMs);

    return clearDebounce;
  }, [page, pageId, isViewer, debounceMs, saveLatest, isDirty, resetBaseline]);

  // Leaving the tab: try to get pending edits out with a keepalive request (survives unload)
  useEffect(() => {
    if (isViewer) return;

    const canFlushNow = () =>
      !conflictRef.current && !inFlightSaveRef.current && isDirty(latestPageRef.current);

    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden' || !canFlushNow()) return;
      saveLatestRef.current({ mode: 'keepalive-preferred' }).catch(() => {});
    };

    const handlePageHide = () => {
      if (!isDirty(latestPageRef.current)) return;
      if (canFlushNow()) {
        // saveLatest reaches fetch synchronously when nothing is in flight
        saveLatestRef.current({ mode: 'keepalive-only' }).catch(() => {});
      }
      // Anything not travelling in a keepalive request may be cut off by the unload: keep a draft
      if (!(inFlightSaveRef.current && inFlightKeepaliveRef.current)) writeDraft();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isViewer, isDirty, writeDraft]);

  // Browser beforeunload protection: warn leaving page if anything is not on the server
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        status === 'unsaved' ||
        status === 'saving' ||
        status === 'error' ||
        status === 'conflict' ||
        isDirty(latestPageRef.current)
      ) {
        e.preventDefault();
        e.returnValue = 'Bạn có các thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [status, isDirty]);

  return {
    status,
    lastSavedTime,
    errorMessage,
    conflict,
    skippedElementIds,
    retrySave,
    forceSave,
    flush,
    overwriteConflict,
    resetBaseline,
    runServerMutation,
    markElementOnServer,
    markElementDeleted,
    isDirty,
    writeDraft,
    limitKnownServerIds,
    adoptDraftBase,
  };
}
