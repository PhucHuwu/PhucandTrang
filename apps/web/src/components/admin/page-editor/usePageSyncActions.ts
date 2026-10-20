'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminPage } from '@/services/adminApi';
import { Page } from '@/types/book';
import { clearPageDraft, PageDraft } from '@/hooks/useAutosavePage';
import type { useAutosavePage } from '@/hooks/useAutosavePage';

type Autosave = ReturnType<typeof useAutosavePage>;

export interface PageSyncActionsContext {
  pageId: string;
  pageRef: React.MutableRefObject<Page | null>;
  router: ReturnType<typeof useRouter>;
  navigating: boolean;
  setNavigating: (navigating: boolean) => void;
  setPage: (next: Page | null) => void;
  recordHistory: (page: Page, description: string) => void;
  adoptServerPage: (fresh: Page) => void;
  setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (message: string, tone?: 'success' | 'warning', ms?: number) => void;
  setSaving: (saving: boolean) => void;
  setResolvingConflict: (resolving: boolean) => void;
  setConflictDismissed: (dismissed: boolean) => void;
  draftOffer: { draft: PageDraft; serverIds: string[] } | null;
  setDraftOffer: (offer: { draft: PageDraft; serverIds: string[] } | null) => void;
  refreshJournal: () => void;
  flushAutosave: Autosave['flush'];
  forceSave: Autosave['forceSave'];
  writeDraft: Autosave['writeDraft'];
  overwriteConflict: Autosave['overwriteConflict'];
  limitKnownServerIds: Autosave['limitKnownServerIds'];
  adoptDraftBase: Autosave['adoptDraftBase'];
}

/**
 * Keeping local edits and the server in sync: navigation with flush, manual save, conflict
 * resolution, draft restore and version rollback. Only `navigateAway` is a React hook (useCallback).
 */
export function usePageSyncActions({
  pageId,
  pageRef,
  router,
  navigating,
  setNavigating,
  setPage,
  recordHistory,
  adoptServerPage,
  setSelectedElementId,
  showToast,
  setSaving,
  setResolvingConflict,
  setConflictDismissed,
  draftOffer,
  setDraftOffer,
  refreshJournal,
  flushAutosave,
  forceSave,
  writeDraft,
  overwriteConflict,
  limitKnownServerIds,
  adoptDraftBase,
}: PageSyncActionsContext) {
  /** In-app navigation away from this page: persist first so nothing is lost or written elsewhere. */
  const navigateAway = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (navigating) return;
      setNavigating(true);
      try {
        const saved = await flushAutosave();
        if (!saved) {
          const leave = confirm(
            'Chưa lưu được thay đổi của trang hiện tại lên máy chủ. Bản nháp sẽ được giữ trên trình duyệt này và được đề nghị khôi phục khi bạn mở lại trang.\n\nVẫn rời khỏi trang?'
          );
          if (!leave) return;
          writeDraft();
        }
        router.push(href);
      } finally {
        setNavigating(false);
      }
    },
    [navigating, flushAutosave, writeDraft, router]
  );

  const handleReloadLatest = async () => {
    setResolvingConflict(true);
    try {
      const fresh = await getAdminPage(pageId);
      adoptServerPage(fresh);
      clearPageDraft(pageId);
      showToast('Đã tải bản mới nhất từ máy chủ. Lịch sử hoàn tác đã được đặt lại.', 'success', 4000);
    } catch (err: any) {
      alert(err?.message || 'Không thể tải bản mới nhất');
    } finally {
      setResolvingConflict(false);
    }
  };

  const handleOverwrite = async () => {
    setResolvingConflict(true);
    try {
      if (await overwriteConflict()) {
        showToast('Đã ghi đè bản trên máy chủ bằng nội dung hiện tại.');
      } else {
        alert('Không thể ghi đè. Vui lòng thử lại.');
      }
    } finally {
      setResolvingConflict(false);
    }
  };

  const handleRestoreDraft = () => {
    if (!draftOffer) return;
    const { draft, serverIds } = draftOffer;
    const draftIds = new Set((draft.page.elements || []).map((el) => el.id));
    // Elements added on the server after the draft was written are left alone
    limitKnownServerIds(serverIds.filter((id) => draftIds.has(id)));
    // Save against the version the draft was edited from: if the server moved on since, the
    // save raises the conflict prompt instead of silently overwriting those changes
    adoptDraftBase(draft.baseUpdatedAt);
    const current = pageRef.current;
    const restored: Page = { ...draft.page, ...(current ? { updatedAt: (current as any).updatedAt } : {}) } as Page;
    setPage(restored);
    recordHistory(restored, 'Khôi phục bản nháp');
    setSelectedElementId(restored.elements?.[0]?.id ?? null);
    setDraftOffer(null);
    showToast('Đã khôi phục bản nháp. Nội dung sẽ được lưu lên máy chủ.');
  };

  const handleDiscardDraft = () => {
    clearPageDraft(pageId);
    setDraftOffer(null);
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      await forceSave();
      showToast('Đã lưu trang thành công!', 'success', 2500);
    } catch (err: any) {
      // A conflict opens its own prompt
      if (err?.status === 409 || err?.name === 'PageConflictPendingError') {
        setConflictDismissed(false);
        return;
      }
      alert(`Lỗi khi lưu trang: ${err?.message || 'Vui lòng kiểm tra lại'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRollbackSuccess = async () => {
    try {
      const refreshed = await getAdminPage(pageId);
      // Undo stack and autosave baseline hold pre-rollback element IDs; start fresh
      adoptServerPage(refreshed);
      setSelectedElementId(refreshed.elements?.[0]?.id ?? null);
      clearPageDraft(pageId);
      refreshJournal();
    } catch {
      // This page did not exist in the restored version
      window.location.href = '/admin/pages';
    }
  };

  return {
    navigateAway,
    handleReloadLatest,
    handleOverwrite,
    handleRestoreDraft,
    handleDiscardDraft,
    handleSaveClick,
    handleRollbackSuccess,
  };
}
