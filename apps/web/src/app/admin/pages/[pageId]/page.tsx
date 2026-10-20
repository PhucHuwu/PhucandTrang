'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import EditorWorkspace from '@/components/admin/EditorWorkspace';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  getAdminPage,
  getAdminPages,
  applyAdminLayout,
  createAdminElement,
  deleteAdminElement,
  duplicateAdminElement,
  getAdminAudioTracks,
  getAdminMedia,
  validateJournalForPublish,
  ValidationReport,
} from '@/services/adminApi';
import { useJournal } from '@/context/JournalContext';
import { Page, PageElement, PageElementType } from '@/types/book';
import LayoutPresetPicker from '@/components/admin/LayoutPresetPicker';
import SaveAsLayoutModal from '@/components/admin/SaveAsLayoutModal';
import BackgroundEditor from '@/components/admin/BackgroundEditor';
import AdvancedTextEditor from '@/components/admin/AdvancedTextEditor';
import AdvancedImageEditor from '@/components/admin/AdvancedImageEditor';
import AdvancedVideoEditor from '@/components/admin/AdvancedVideoEditor';
import AdvancedShapeEditor from '@/components/admin/AdvancedShapeEditor';
import InteractionEditor from '@/components/admin/InteractionEditor';
import DialogPortal from '@/components/admin/DialogPortal';
import { useAdminDialog } from '@/hooks/useAdminDialog';
import {
  applyLayoutTemplate,
  extractContentFromPage,
  LayoutPresetDefinition,
} from '@/templates/layoutPresets';
import {
  ArrowLeft,
  Save,
  Type,
  Image as ImageIcon,
  Video,
  Square,
  Sparkles,
  Sliders,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Palette,
  LayoutGrid,
  BookmarkPlus,
  Send,
  History,
  Undo2,
  Redo2,
  Magnet,
  Music,
} from 'lucide-react';
import VersionHistoryModal from '@/components/admin/VersionHistoryModal';
import PublishValidationModal from '@/components/admin/PublishValidationModal';
import { useAutosavePage, readPageDraft, clearPageDraft, PageDraft } from '@/hooks/useAutosavePage';
import AutosaveIndicator from '@/components/admin/AutosaveIndicator';
import { usePageHistory } from '@/hooks/usePageHistory';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { usePageTabPresence } from '@/hooks/usePageTabPresence';
import LayersPanel from '@/components/admin/LayersPanel';

// Dynamic import KonvaPageCanvas with ssr: false because Konva requires DOM window & canvas
const KonvaPageCanvas = dynamic(() => import('@/components/admin/KonvaPageCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-[min(430px,90%)] aspect-[1024/1360] rounded-2xl bg-[#140B10] border border-rosewood-900/40 flex flex-col items-center justify-center text-stone-500 text-xs">
      <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
      <span>Khởi tạo Visual Canvas...</span>
    </div>
  ),
});

type Toast = { message: string; tone: 'success' | 'warning' };

export default function VisualPageEditorDirectPage() {
  const params = useParams();
  const pageId = params.pageId as string;
  // Remount per page: no state, history, autosave baseline or in-flight save can leak across pages
  return <PageEditor key={pageId} pageId={pageId} />;
}

function ConflictDialog({
  open,
  busy,
  onReload,
  onOverwrite,
  onClose,
}: {
  open: boolean;
  busy: boolean;
  onReload: () => void;
  onOverwrite: () => void;
  onClose: () => void;
}) {
  const dialogRef = useAdminDialog(open, onClose);
  if (!open) return null;
  return (
    <DialogPortal>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Xung đột chỉnh sửa"
        className="cms-dialog fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md select-none"
      >
        <div className="cms-dialog-panel relative w-full sm:max-w-md bg-[#180E14] border border-amber-700/60 rounded-t-2xl sm:rounded-2xl shadow-2xl text-parchment-100 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-sm">
              <h2 className="font-serif font-bold text-champagne-300">Trang đã được thay đổi ở nơi khác</h2>
              <p className="text-stone-300 text-xs leading-relaxed">
                Trang này vừa được lưu từ một tab hoặc thiết bị khác. Tự động lưu đã tạm dừng để không ghi đè
                lên thay đổi đó.
              </p>
              <p className="text-stone-400 text-xs leading-relaxed">
                Chọn <strong>Tải bản mới nhất</strong> để bỏ các chỉnh sửa chưa lưu ở đây, hoặc <strong>Ghi đè</strong>{' '}
                để thay bản trên máy chủ bằng nội dung bạn đang thấy.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-10 px-3 rounded-lg text-xs text-stone-400 hover:text-stone-200 disabled:opacity-50"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={onReload}
              disabled={busy}
              className="h-10 px-3 rounded-lg bg-[#25151F] hover:bg-[#331C2A] border border-rosewood-800/60 text-xs font-medium text-parchment-100 disabled:opacity-50"
            >
              Tải bản mới nhất
            </button>
            <button
              type="button"
              onClick={onOverwrite}
              disabled={busy}
              className="h-10 px-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-xs font-semibold text-white disabled:opacity-50"
            >
              Ghi đè
            </button>
          </div>
        </div>
      </div>
    </DialogPortal>
  );
}

function PageEditor({ pageId }: { pageId: string }) {
  const router = useRouter();
  const { journal, refreshJournal } = useJournal();

  const [allPages, setAllPages] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [validationModal, setValidationModal] = useState<{
    bookId: string;
    report: ValidationReport;
  } | null>(null);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [videoMedia, setVideoMedia] = useState<any[]>([]);
  const [page, setPageState] = useState<Page | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { viewportRef: canvasViewportRef, scale: canvasScale, zoom: setCanvasScale, fitViewport } = useCanvasViewport(!loading);
  const [mobilePanel, setMobilePanel] = useState<'canvas' | 'layers' | 'properties'>('canvas');
  const [navigating, setNavigating] = useState(false);
  const [draftOffer, setDraftOffer] = useState<{ draft: PageDraft; serverIds: string[] } | null>(null);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [resolvingConflict, setResolvingConflict] = useState(false);

  // Layout Picker Modal state
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  // Save As Layout Modal state
  const [showSaveAsLayout, setShowSaveAsLayout] = useState(false);

  // Active Inspector Tab
  const [inspectorTab, setInspectorTab] = useState<'element' | 'interaction' | 'background' | 'metadata'>('element');
  const [editingActiveArea, setEditingActiveArea] = useState(false);

  // Snapping Toggle
  const [snappingEnabled, setSnappingEnabled] = useState(true);

  // True while a drag / transform gesture is in progress on the canvas
  const gestureRef = useRef(false);

  // Synchronous mirror of `page`: edits are computed from it so history is recorded outside setState updaters
  const pageRef = useRef<Page | null>(null);
  const setPage = useCallback((next: Page | null) => {
    pageRef.current = next;
    setPageState(next);
  }, []);

  const showToast = useCallback((message: string, tone: Toast['tone'] = 'success', ms = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Undo / Redo History Hook
  const {
    canUndo,
    canRedo,
    undo: performUndo,
    redo: performRedo,
    recordHistory,
    initHistory,
  } = usePageHistory(page, {
    maxHistory: 40,
    onHistoryChange: (restoredPage) => {
      setPage(restoredPage);
      setSelectedElementId((current) => {
        if (!current) return current;
        const elements = restoredPage.elements || [];
        if (elements.some((el) => el.id === current)) return current;
        return elements[0]?.id ?? null;
      });
    },
  });

  // Autosave
  const {
    status: autosaveStatus,
    lastSavedTime,
    errorMessage: autosaveError,
    conflict,
    skippedElementIds,
    retrySave,
    forceSave,
    flush: flushAutosave,
    overwriteConflict,
    resetBaseline,
    runServerMutation,
    markElementOnServer,
    markElementDeleted,
    writeDraft,
    limitKnownServerIds,
  } = useAutosavePage(page, {
    pageId,
    isViewer: false,
    debounceMs: 800,
  });

  const otherTabOpen = usePageTabPresence(pageId);

  /** Applies `update` to the latest page and records one undo step when `description` is given. */
  const updatePage = useCallback(
    (update: (prev: Page) => Page, description?: string) => {
      const prev = pageRef.current;
      if (!prev) return;
      const next = update(prev);
      if (next === prev) return;
      setPage(next);
      if (description) recordHistory(next, description);
    },
    [setPage, recordHistory]
  );

  /** Server state replaces the local state: fresh autosave baseline and fresh undo history. */
  const adoptServerPage = useCallback(
    (fresh: Page) => {
      setPage(fresh);
      resetBaseline(fresh);
      initHistory(fresh);
      setSelectedElementId((current) =>
        current && (fresh.elements || []).some((el) => el.id === current)
          ? current
          : fresh.elements?.[0]?.id ?? null
      );
    },
    [setPage, resetBaseline, initHistory]
  );

  // Load page and related journal data
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const [pageData, tracks, videos] = await Promise.all([
          getAdminPage(pageId),
          getAdminAudioTracks(),
          getAdminMedia({ type: 'VIDEO', limit: 100 }),
        ]);
        if (cancelled) return;
        // Baseline before the first render with this page, so the load itself is never "a change"
        resetBaseline(pageData);
        setPage(pageData);
        initHistory(pageData);
        setAudioTracks(tracks);
        setVideoMedia(videos.items || []);
        if (pageData.elements && pageData.elements.length > 0) {
          setSelectedElementId(pageData.elements[0].id);
        }

        const draft = readPageDraft(pageId);
        if (draft) {
          const serverUpdatedAt = Date.parse(pageData.updatedAt ?? '');
          if (Number.isNaN(serverUpdatedAt) || draft.savedAt > serverUpdatedAt) {
            setDraftOffer({ draft, serverIds: (pageData.elements || []).map((el: PageElement) => el.id) });
          } else {
            // The server already holds something newer than the draft
            clearPageDraft(pageId);
          }
        }

        // Fetch pages list of this journal
        const pagesList = await getAdminPages(pageData.bookId);
        if (!cancelled) setAllPages(pagesList);
      } catch (err: any) {
        if (!cancelled) alert(err?.message || 'Không thể nạp dữ liệu trang');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [pageId, initHistory, resetBaseline, setPage]);

  useEffect(() => {
    if (skippedElementIds.length === 0) return;
    showToast(
      `Máy chủ không khôi phục được ${skippedElementIds.length} phần tử. Hãy tải lại trang để kiểm tra.`,
      'warning',
      6000
    );
  }, [skippedElementIds, showToast]);

  useEffect(() => {
    if (conflict) setConflictDismissed(false);
  }, [conflict]);

  const selectedElement = (page?.elements || []).find((el) => el.id === selectedElementId);

  // Update selected element property locally
  const updateSelectedElement = useCallback((updater: (el: any) => any) => {
    if (!selectedElementId) return;
    updatePage(
      (prevPage) => ({
        ...prevPage,
        isCustomized: true,
        elements: (prevPage.elements || []).map((el) =>
          el.id === selectedElementId ? (updater(el) as PageElement) : el
        ),
      }),
      'Chỉnh sửa thuộc tính phần tử'
    );
  }, [selectedElementId, updatePage]);

  // Update normalized transform when dragged or resized on Konva Canvas
  const handleUpdateElementTransform = useCallback(
    (id: string, normalizedTransform: { x: number; y: number; width: number; height: number; rotation: number }) => {
      updatePage(
        (prevPage) => ({
          ...prevPage,
          isCustomized: true,
          elements: (prevPage.elements || []).map((el) =>
            el.id === id ? { ...el, transform: { ...el.transform, ...normalizedTransform } } : el
          ),
        }),
        'Thay đổi vị trí / kích thước phần tử'
      );
    },
    [updatePage]
  );

  const handleUpdateActiveArea = useCallback(
    (id: string, activeArea: { left: number; top: number; width: number; height: number }) => {
      updatePage(
        (prevPage) => ({
          ...prevPage,
          isCustomized: true,
          elements: prevPage.elements.map((el) =>
            el.id === id
              ? {
                  ...el,
                  interaction: {
                    ...(el.interaction || { enabled: true, action: 'none' }),
                    activeArea,
                  },
                }
              : el
          ),
        }),
        'Cập nhật vùng bấm tương tác'
      );
    },
    [updatePage]
  );

  /** Metadata fields: every keystroke updates the page, one undo step is recorded when the field loses focus. */
  const updateMetadata = useCallback(
    (fields: Partial<Page>) => {
      updatePage((prev) => ({ ...prev, isCustomized: true, ...fields }));
    },
    [updatePage]
  );
  const commitMetadataHistory = useCallback(() => {
    if (pageRef.current) recordHistory(pageRef.current, 'Cập nhật thông tin trang');
  }, [recordHistory]);

  const handleGestureChange = useCallback((active: boolean) => {
    gestureRef.current = active;
  }, []);

  useUndoRedoShortcuts({
    canUndo,
    canRedo,
    undo: performUndo,
    redo: performRedo,
    isBlocked: () => gestureRef.current,
  });

  const mutationErrorMessage = (err: any, fallback: string) =>
    err?.name === 'PageConflictPendingError' ? err.message : err?.message || fallback;

  // Apply Layout Template
  const handleApplyLayoutTemplate = async (templateDef: LayoutPresetDefinition) => {
    const current = pageRef.current;
    if (!current) return;
    setSaving(true);
    setToast(null);

    try {
      const extractedContent = extractContentFromPage(current);
      const newlyArrangedPage = applyLayoutTemplate(
        {
          ...current,
          pageNumber: current.pageNumber,
          side: current.side,
        },
        templateDef,
        extractedContent
      );

      const elementsToSave = newlyArrangedPage.elements.map((el) => ({
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
      }));

      // Atomic Apply Layout (single transaction replaces elements & sets isCustomized=false).
      // All element ids change, so the undo stack would point at elements that no longer exist.
      await runServerMutation(() => applyAdminLayout(pageId, templateDef.id, elementsToSave), {
        updatedAtFrom: (refreshed: any) => refreshed?.updatedAt,
        apply: (refreshed: Page) => {
          adoptServerPage(refreshed);
          setSelectedElementId(refreshed.elements?.[0]?.id ?? null);
          return refreshed;
        },
      });

      showToast(
        `Đã áp dụng bố cục "${templateDef.name}". Lịch sử hoàn tác đã được đặt lại.`,
        'success',
        4000
      );
    } catch (err: any) {
      alert(mutationErrorMessage(err, 'Lỗi áp dụng bố cục mới'));
    } finally {
      setSaving(false);
    }
  };

  const handlePublishClick = async () => {
    if (publishing) return;
    try {
      setPublishing(true);
      if (!(await flushAutosave())) {
        alert('Chưa lưu được thay đổi mới nhất của trang. Vui lòng thử lưu lại trước khi xuất bản.');
        return;
      }
      const report = await validateJournalForPublish();
      setValidationModal({
        bookId: journal?.id || (page as any)?.bookId || '',
        report,
      });
    } catch (err: any) {
      alert(`Lỗi kiểm tra tính toàn vẹn: ${err?.message || 'Vui lòng thử lại.'}`);
    } finally {
      setPublishing(false);
    }
  };

  // Add new element to page
  const handleAddElement = async (type: PageElementType) => {
    const current = pageRef.current;
    if (!current) return;
    const maxZ = (current.elements || []).reduce((max, el) => Math.max(max, el.zIndex ?? 1), 0);
    const newZ = maxZ + 1;

    let defaultData: any = {};
    let defaultStyle: any = {};

    switch (type) {
      case 'TEXT':
        defaultData = { text: 'Nội dung kỷ niệm mới', variant: 'body' };
        defaultStyle = {
          fontFamily: 'Cormorant Garamond',
          fontSize: 24,
          color: '#292522',
          textAlign: 'left',
        };
        break;
      case 'IMAGE':
        defaultData = {
          src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389698/phuc_trang_memories/her-pic-1.jpg',
          objectFit: 'contain',
        };
        defaultStyle = { polaroidFrame: true, washiTape: true };
        break;
      case 'VIDEO':
        defaultData = {
          src: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1789389686/phuc_trang_memories/26-06-2323.mp4',
          thumbnailUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789390296/phuc_trang_memories/26-06-2323_thumb.jpg',
        };
        defaultStyle = { polaroidFrame: true, washiTape: true };
        break;
      case 'SHAPE':
        defaultData = { shapeType: 'line', strokeColor: '#C99A9A', strokeWidth: 2 };
        break;
      case 'DECORATION':
        defaultData = { decorationType: 'washi-tape' };
        break;
    }

    const newElementPayload = {
      pageId,
      type,
      zIndex: newZ,
      visible: true,
      locked: false,
      opacity: 1.0,
      transform: { x: 0.1, y: 0.3, width: 0.4, height: 0.2, rotation: 0, scale: 1 },
      style: defaultStyle,
      data: defaultData,
    };

    try {
      await runServerMutation(() => createAdminElement(newElementPayload), {
        apply: (created: PageElement) => {
          // Known on the server: undoing the add deletes it there on the next save
          markElementOnServer(created.id);
          updatePage(
            (prev) => ({ ...prev, isCustomized: true, elements: [...prev.elements, created] }),
            `Thêm phần tử ${type}`
          );
          setSelectedElementId(created.id);
          return pageRef.current;
        },
      });
    } catch (err: any) {
      alert(mutationErrorMessage(err, 'Lỗi thêm phần tử mới'));
    }
  };

  // Duplicate selected element
  const handleDuplicateSelected = async () => {
    if (!selectedElementId) return;
    const sourceId = selectedElementId;
    // A local-only element (e.g. restored by undo, not saved yet) cannot be duplicated server-side
    if (!(await flushAutosave())) {
      alert('Chưa lưu được trang hiện tại. Vui lòng thử lại trước khi nhân bản.');
      return;
    }
    try {
      await runServerMutation(() => duplicateAdminElement(sourceId, 0.03, 0.03), {
        apply: (dup: PageElement) => {
          markElementOnServer(dup.id);
          updatePage(
            (prev) => ({ ...prev, isCustomized: true, elements: [...prev.elements, dup] }),
            'Nhân bản phần tử'
          );
          setSelectedElementId(dup.id);
          return pageRef.current;
        },
      });
      showToast('Đã nhân bản phần tử!', 'success', 2500);
    } catch (err: any) {
      alert(mutationErrorMessage(err, 'Lỗi nhân bản phần tử'));
    }
  };

  // Delete element
  const handleDeleteElement = async (elementId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phần tử này khỏi trang?')) return;
    try {
      await runServerMutation(
        async () => {
          try {
            return await deleteAdminElement(elementId);
          } catch (err: any) {
            // Never reached the server (e.g. added then undone/redone before saving): local removal is enough
            if (err?.status === 404) return null;
            throw err;
          }
        },
        {
          apply: () => {
            // Gone on the server: undoing the delete re-creates it through the save endpoint (type + slot)
            markElementDeleted(elementId);
            updatePage(
              (prev) => ({
                ...prev,
                isCustomized: true,
                elements: prev.elements.filter((el) => el.id !== elementId),
              }),
              'Xóa phần tử'
            );
            return pageRef.current;
          },
        }
      );
      setSelectedElementId(null);
    } catch (err: any) {
      alert(mutationErrorMessage(err, 'Lỗi xóa phần tử'));
    }
  };

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

  if (loading || !page) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
        <span>Đang nạp Visual Studio...</span>
      </div>
    );
  }

  return (
    <div className="page-editor editor-root flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-[#0C0609] select-none text-parchment-100 font-sans">
      {/* Top Application Bar */}
      <div className="editor-header bg-[#160D12] border-b border-rosewood-900/50 px-2 py-1.5 lg:px-4 flex items-center gap-2 shrink-0 z-30">
        <Link
          href="/admin/pages"
          onClick={(e) => navigateAway(e, '/admin/pages')}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 border border-rosewood-900/40 transition-colors"
          title="Quay lại danh sách trang"
          aria-label="Quay lại danh sách trang"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif font-bold text-sm tracking-wide text-parchment-100 truncate" title={page.title || ''}>
            {page.pageNumber === 0 ? 'Lời ngỏ' : `Trang ${page.pageNumber}`}: {page.title || '(Không tiêu đề)'}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <span className="px-1.5 rounded text-[10px] font-mono bg-rosewood-950 text-champagne-300 border border-rosewood-800/40">
              {page.side}
            </span>
            <span
              className={`px-1.5 rounded text-[10px] font-mono border truncate ${
                page.isCustomized
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {page.isCustomized ? 'Tùy biến' : `Template: ${page.layoutTemplateId || page.layout || 'Chưa chọn'}`}
            </span>
          </div>
        </div>

        <div className="editor-header-actions flex items-center gap-1.5 shrink-0">
          <AutosaveIndicator
            status={autosaveStatus}
            lastSavedTime={lastSavedTime}
            errorMessage={autosaveError}
            onRetry={retrySave}
          />

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="h-10 flex items-center gap-1.5 px-2.5 rounded-lg bg-[#20111A] hover:bg-[#2C1923] text-amber-300 border border-rosewood-900/40 text-xs font-medium transition"
            title="Lịch sử phiên bản và Rollback"
            aria-label="Lịch sử phiên bản"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span className="editor-header-label">Lịch sử</span>
          </button>

          <Link
            href="/admin/preview"
            target="_blank"
            onClick={(e) => {
              if (autosaveStatus === 'saved') return;
              // Open the tab synchronously (popup blockers), then navigate once pending edits are saved
              e.preventDefault();
              const previewTab = window.open('about:blank', '_blank');
              flushAutosave().finally(() => {
                if (previewTab) previewTab.location.href = '/admin/preview';
                else window.location.href = '/admin/preview';
              });
            }}
            className="h-10 flex items-center gap-1.5 px-2.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-xs font-medium transition"
            title="Xem trước bản nháp trên 3D Flipbook"
            aria-label="Xem trước bản nháp"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span className="editor-header-label">Preview</span>
          </Link>

          <button
            type="button"
            onClick={handlePublishClick}
            disabled={publishing}
            className="h-10 flex items-center gap-1.5 px-2.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-medium transition disabled:opacity-50"
            title="Đóng gói snapshot và xuất bản công khai"
            aria-label="Publish"
          >
            <Send className="w-4 h-4" />
            <span className="editor-header-label">{publishing ? 'Đang xuất bản...' : 'Publish'}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
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
            }}
            disabled={saving || autosaveStatus === 'saving'}
            className="h-10 flex items-center gap-1.5 px-3 rounded-lg bg-rosewood-600 hover:bg-rosewood-500 text-white text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving || autosaveStatus === 'saving' ? 'Đang lưu...' : 'Lưu'}</span>
          </button>
        </div>
      </div>

      {(otherTabOpen || draftOffer || (conflict && conflictDismissed)) && (
        <div className="shrink-0 z-20 flex flex-col">
          {otherTabOpen && (
            <div
              role="alert"
              className="px-3 py-2 bg-amber-950/80 border-b border-amber-700/50 text-amber-200 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Trang này đang được mở ở một tab khác. Chỉnh sửa ở hai nơi cùng lúc có thể ghi đè lên nhau — hãy đóng
                bớt một tab.
              </span>
            </div>
          )}
          {draftOffer && (
            <div
              role="alert"
              aria-label="Bản nháp chưa lưu"
              className="px-3 py-2 bg-sky-950/80 border-b border-sky-700/50 text-sky-200 text-xs flex flex-wrap items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-sky-400" />
              <span className="flex-1 min-w-0">
                Có bản nháp chưa lưu trên trình duyệt này (
                {new Date(draftOffer.draft.savedAt).toLocaleString('vi-VN')}), mới hơn bản trên máy chủ.
              </span>
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="h-8 px-3 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-medium"
              >
                Khôi phục bản nháp
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="h-8 px-3 rounded-lg text-sky-300 hover:text-white"
              >
                Bỏ bản nháp
              </button>
            </div>
          )}
          {conflict && conflictDismissed && (
            <div
              role="alert"
              className="px-3 py-2 bg-amber-950/80 border-b border-amber-700/50 text-amber-200 text-xs flex flex-wrap items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="flex-1 min-w-0">Tự động lưu đang tạm dừng vì trang đã được thay đổi ở nơi khác.</span>
              <button
                type="button"
                onClick={() => setConflictDismissed(false)}
                className="h-8 px-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-medium"
              >
                Giải quyết xung đột
              </button>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] max-w-[calc(100vw-2rem)] px-4 py-2 rounded-xl border text-xs flex items-center gap-2 shadow-lg ${
            toast.tone === 'warning'
              ? 'bg-amber-950/95 border-amber-600/50 text-amber-200'
              : 'bg-emerald-950/95 border-emerald-600/50 text-emerald-300'
          }`}
        >
          {toast.tone === 'warning' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 3-Column Visual Layout */}
      <EditorWorkspace
        panel={mobilePanel}
        onPanelChange={setMobilePanel}
        toolbar={
          <>
            <div className="editor-scroll flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setShowLayoutPicker(true)}
                className="h-10 shrink-0 flex items-center gap-1.5 px-3 rounded-lg bg-[#2A1220] hover:border-champagne-400 text-champagne-300 text-xs font-medium border border-rosewood-700/60 transition-colors"
                title="Đổi bố cục trang"
              >
                <LayoutGrid className="w-4 h-4 text-champagne-400" />
                <span>Đổi bố cục</span>
              </button>

              <div className="shrink-0 flex items-center gap-0.5 bg-[#20111A] p-0.5 rounded-lg border border-rosewood-900/40 text-xs" role="group" aria-label="Thêm phần tử">
                {([
                  ['TEXT', 'Chữ', Type, 'text-champagne-300'],
                  ['IMAGE', 'Ảnh', ImageIcon, 'text-pink-400'],
                  ['VIDEO', 'Video', Video, 'text-amber-400'],
                  ['SHAPE', 'Đường kẻ', Square, 'text-rosewood-400'],
                ] as const).map(([type, label, Icon, color]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddElement(type)}
                    className="h-9 min-w-9 flex items-center justify-center gap-1 px-2 rounded-md hover:bg-rosewood-800/60 text-parchment-200 transition"
                    title={`Thêm ${label.toLowerCase()}`}
                    aria-label={`Thêm ${label.toLowerCase()}`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="editor-label">{label}</span>
                  </button>
                ))}
              </div>

              <div className="shrink-0 flex items-center gap-0.5 bg-[#20111A] p-0.5 rounded-lg border border-rosewood-900/40">
                <button
                  type="button"
                  onClick={() => performUndo()}
                  disabled={!canUndo}
                  className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800/60 text-parchment-200 transition disabled:opacity-30"
                  title="Hoàn tác (Ctrl+Z)"
                  aria-label="Hoàn tác"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => performRedo()}
                  disabled={!canRedo}
                  className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800/60 text-parchment-200 transition disabled:opacity-30"
                  title="Làm lại (Ctrl+Shift+Z)"
                  aria-label="Làm lại"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSnappingEnabled(!snappingEnabled)}
                aria-pressed={snappingEnabled}
                className={`h-10 shrink-0 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs transition-all ${
                  snappingEnabled
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
                    : 'bg-[#20111A] border-rosewood-900/40 text-stone-500 hover:text-stone-300'
                }`}
                title="Bật/tắt hít từ tính"
                aria-label="Hít từ tính"
              >
                <Magnet className="w-4 h-4" />
                <span className="editor-label">Snap</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSaveAsLayout(true)}
                className="h-10 shrink-0 flex items-center gap-1.5 px-2.5 rounded-lg bg-[#22101A] hover:bg-[#2D1623] text-parchment-200 text-xs font-medium border border-rosewood-800/60 transition"
                title="Lưu bố cục hiện tại thành template tùy biến"
                aria-label="Lưu Template"
              >
                <BookmarkPlus className="w-4 h-4 text-pink-400" />
                <span className="editor-label">Lưu Template</span>
              </button>
            </div>

            <div className="shrink-0 flex items-center gap-0.5 bg-[#20111A] p-0.5 rounded-lg border border-rosewood-900/40 text-stone-300">
              <button
                type="button"
                onClick={() => setCanvasScale((s) => Math.max(0.2, parseFloat((s - 0.05).toFixed(2))))}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800 transition-colors"
                title="Thu nhỏ canvas"
                aria-label="Thu nhỏ canvas"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono w-10 text-center text-[11px]" aria-live="polite">{Math.round(canvasScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setCanvasScale((s) => Math.min(1.2, parseFloat((s + 0.05).toFixed(2))))}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800 transition-colors"
                title="Phóng to canvas"
                aria-label="Phóng to canvas"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={fitViewport}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800 transition-colors"
                title="Vừa vùng làm việc"
                aria-label="Vừa vùng làm việc"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </>
        }
      >
        {/* LEFT COLUMN: Layers Panel */}
        <aside className="editor-layers bg-[#140B10] border-r border-rosewood-900/40 flex-col justify-between shrink-0 overflow-y-auto min-h-0">
          <LayersPanel
            elements={page.elements || []}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={(elId, updater) => {
              updatePage(
                (prevPage) => ({
                  ...prevPage,
                  isCustomized: true,
                  elements: (prevPage.elements || []).map((el) => (el.id === elId ? updater(el) : el)),
                }),
                'Cập nhật layer'
              );
            }}
            onReorderElements={(newElements) => {
              updatePage(
                (prevPage) => ({ ...prevPage, isCustomized: true, elements: newElements }),
                'Sắp xếp lại thứ tự z-index layers'
              );
            }}
            onDuplicateElement={handleDuplicateSelected}
            onDeleteElement={handleDeleteElement}
            isViewer={false}
          />

          {/* Quick Pages Navigation Switcher */}
          <div className="h-44 border-t border-rosewood-900/40 bg-[#12090F] flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-rosewood-900/40 flex items-center justify-between text-[11px] font-mono text-stone-400">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-rosewood-400" />
                <span>Chuyển trang nhanh</span>
              </span>
              <span>{allPages.length} trang</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {allPages.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/pages/${p.id}`}
                  onClick={(e) => {
                    if (p.id === pageId) {
                      e.preventDefault();
                      return;
                    }
                    navigateAway(e, `/admin/pages/${p.id}`);
                  }}
                  aria-current={p.id === pageId ? 'page' : undefined}
                  aria-disabled={navigating || undefined}
                  className={`block px-2.5 py-1.5 rounded-lg text-xs font-mono truncate transition-all ${
                    p.id === pageId
                      ? 'bg-rosewood-900/60 text-champagne-300 font-bold border border-rosewood-700/50'
                      : 'text-stone-500 hover:text-stone-300 hover:bg-[#1E1119]'
                  }`}
                >
                  #{p.order} • {p.pageNumber === 0 ? 'Lời ngỏ' : `Trang ${p.pageNumber}`} {p.title ? `— ${p.title}` : ''}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN: React Konva Visual Canvas (Flex-1) */}
        <main className="editor-canvas flex flex-1 min-w-0 min-h-0 flex-col bg-[#0A0407] overflow-hidden relative">
          <div ref={canvasViewportRef} className="editor-viewport flex-1 min-h-0 min-w-0 flex items-center justify-center p-4 overflow-auto">
            <KonvaPageCanvas
              page={page}
              book={journal}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElementTransform={handleUpdateElementTransform}
              editingActiveArea={editingActiveArea && inspectorTab === 'interaction'}
              onUpdateActiveArea={handleUpdateActiveArea}
              scale={canvasScale}
              snappingEnabled={snappingEnabled}
              onGestureChange={handleGestureChange}
            />
          </div>
          {selectedElement?.type === 'TEXT' && mobilePanel !== 'properties' && (
            <button
              type="button"
              onClick={() => {
                setInspectorTab('element');
                setMobilePanel('properties');
              }}
              className="editor-compact-only absolute bottom-3 right-3 z-20 h-10 px-4 rounded-full bg-rosewood-600 text-white text-sm font-medium shadow-lg shadow-black/40"
            >
              Sửa nội dung chữ
            </button>
          )}
        </main>

        {/* RIGHT COLUMN: Properties Panel (width: 320px) */}
        <aside className="editor-properties bg-[#140B10] border-l border-rosewood-900/40 flex-col justify-between shrink-0 overflow-y-auto min-h-0">
          <div className="flex flex-col h-full">
            {/* Inspector Top Switcher (Tabs: Element vs Background vs Interaction vs Metadata) */}
            <div className="p-2 bg-[#1C0F16] border-b border-rosewood-900/40 grid grid-cols-4 gap-1 shrink-0 text-[11px]">
              <button
                type="button"
                onClick={() => setInspectorTab('element')}
                className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
                  inspectorTab === 'element'
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
                title="Thuộc tính phần tử"
              >
                <Sliders className="w-3 h-3" />
                <span className="truncate">Phần tử</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('interaction')}
                className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
                  inspectorTab === 'interaction'
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
                title="Tương tác phần tử"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="truncate">Tương tác</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('background')}
                className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
                  inspectorTab === 'background'
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
                title="Hình nền trang"
              >
                <Palette className="w-3 h-3 text-pink-400" />
                <span className="truncate">Nền</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('metadata')}
                className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
                  inspectorTab === 'metadata'
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
                title="Thông tin trang & Nhạc nền riêng"
              >
                <FileText className="w-3 h-3 text-champagne-300" />
                <span className="truncate">Trang</span>
              </button>
            </div>

            {/* Inspector Tab Content */}
            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 space-y-4">
              {inspectorTab === 'metadata' && (
                <div className="space-y-4 text-xs">
                  <div className="pb-2 border-b border-rosewood-900/40 flex items-center justify-between">
                    <span className="font-serif font-bold text-champagne-300 text-sm">
                      Thông Tin &amp; Nhạc Nền Trang
                    </span>
                    <span className="font-mono text-[10px] text-stone-500">#{page.order}</span>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-stone-300 font-medium mb-1">Tiêu đề trang</label>
                    <input
                      type="text"
                      value={page.title || ''}
                      onChange={(e) => updateMetadata({ title: e.target.value })}
                      onBlur={commitMetadataHistory}
                      placeholder="Nhập tiêu đề trang..."
                      className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white text-xs focus:outline-none focus:border-rosewood-500"
                    />
                  </div>

                  {/* Chapter */}
                  <div>
                    <label className="block text-stone-300 font-medium mb-1">Tên chương (Chapter)</label>
                    <input
                      type="text"
                      value={page.chapter || ''}
                      onChange={(e) => updateMetadata({ chapter: e.target.value })}
                      onBlur={commitMetadataHistory}
                      placeholder="Ví dụ: Chapter IV, Ngày Chung Đôi..."
                      className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white text-xs focus:outline-none focus:border-rosewood-500"
                    />
                  </div>

                  {/* Quote */}
                  <div>
                    <label className="block text-stone-300 font-medium mb-1">Lời trích dẫn (Quote)</label>
                    <textarea
                      rows={2}
                      value={page.quote || ''}
                      onChange={(e) => updateMetadata({ quote: e.target.value })}
                      onBlur={commitMetadataHistory}
                      placeholder="Câu danh ngôn hoặc tâm tình..."
                      className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white text-xs focus:outline-none focus:border-rosewood-500"
                    />
                  </div>

                  {/* Handwriting text */}
                  <div>
                    <label className="block text-stone-300 font-medium mb-1">Dòng chữ viết tay (Handwriting)</label>
                    <input
                      type="text"
                      value={page.handwriting || ''}
                      onChange={(e) => updateMetadata({ handwriting: e.target.value })}
                      onBlur={commitMetadataHistory}
                      placeholder="Chữ ký hoặc lời đề từ..."
                      className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white text-xs focus:outline-none focus:border-rosewood-500 font-serif italic"
                    />
                  </div>

                  {/* Page Audio Track */}
                  <div className="pt-2 border-t border-rosewood-900/40">
                    <label className="block text-stone-300 font-medium mb-1.5 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nhạc nền riêng cho trang này</span>
                    </label>
                    <select
                      value={(page as any).audioTrackId || ''}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        updatePage(
                          (prev) => ({ ...prev, isCustomized: true, audioTrackId: val } as Page),
                          'Đổi nhạc nền trang'
                        );
                      }}
                      className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="">(Không dùng nhạc riêng — Dùng nhạc nền sách)</option>
                      {audioTracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} — {t.artist}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-stone-500 mt-1.5">
                      Khi lật đến trang này, bài hát này sẽ tự động vang lên thay cho nhạc nền chung.
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === 'background' && (
                <BackgroundEditor
                  background={page.background || { type: 'color', color: '#F9F5EC' }}
                  onChange={(newBg) => {
                    updatePage(
                      (prevPage) => ({ ...prevPage, isCustomized: true, background: newBg }),
                      'Cập nhật nền trang'
                    );
                  }}
                  disabled={false}
                />
              )}

              {inspectorTab === 'interaction' && selectedElement && (
                <InteractionEditor
                  element={selectedElement}
                  pages={allPages}
                  audioTracks={audioTracks}
                  videoMedia={videoMedia}
                  onChange={(newInteraction) => {
                    updateSelectedElement((target) => ({
                      ...target,
                      interaction: newInteraction,
                    }));
                  }}
                  isEditingActiveArea={editingActiveArea}
                  onEditActiveArea={() => setEditingActiveArea(!editingActiveArea)}
                  disabled={false}
                />
              )}

              {inspectorTab === 'element' && selectedElement && (
                <>
                  {selectedElement.type === 'TEXT' && (
                    <AdvancedTextEditor
                      element={selectedElement}
                      onChange={(updated) => {
                        updateSelectedElement(updated);
                      }}
                      book={journal}
                      page={page}
                      disabled={false}
                    />
                  )}

                  {selectedElement.type === 'IMAGE' && (
                    <AdvancedImageEditor
                      element={selectedElement}
                      onChange={(updated) => {
                        updateSelectedElement(updated);
                      }}
                      disabled={false}
                    />
                  )}

                  {selectedElement.type === 'VIDEO' && (
                    <AdvancedVideoEditor
                      element={selectedElement}
                      onChange={(updated) => {
                        updateSelectedElement(updated);
                      }}
                      disabled={false}
                    />
                  )}

                  {selectedElement.type === 'SHAPE' && (
                    <AdvancedShapeEditor
                      element={selectedElement as any}
                      onChange={(updated) => {
                        updateSelectedElement(updated as any);
                      }}
                      disabled={false}
                    />
                  )}
                </>
              )}

              {(inspectorTab === 'element' || inspectorTab === 'interaction') && !selectedElement && (
                <div className="py-20 text-center text-xs text-stone-500">
                  <Sliders className="w-8 h-8 mx-auto mb-2 text-rosewood-800 opacity-50" />
                  <p>Chọn một phần tử trên canvas để chỉnh sửa thuộc tính.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </EditorWorkspace>

      {/* Layout Preset Picker Modal */}
      {showLayoutPicker && (
        <LayoutPresetPicker
          isOpen={showLayoutPicker}
          onClose={() => setShowLayoutPicker(false)}
          onSelectLayout={handleApplyLayoutTemplate}
          currentTemplateId={page?.layoutTemplateId || page?.layout}
          hasCustomizations={page?.isCustomized}
        />
      )}

      {/* Save Current Page as Layout Template Modal */}
      {showSaveAsLayout && (
        <SaveAsLayoutModal
          isOpen={showSaveAsLayout}
          onClose={() => setShowSaveAsLayout(false)}
          page={page}
          onSaved={() => {
            showToast('Đã lưu bố cục thành Layout Template mới!');
          }}
        />
      )}

      {/* Version History & Rollback Modal */}
      {journal && (
        <VersionHistoryModal
          bookId={journal.id}
          bookTitle={journal.title}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onRollbackSuccess={async () => {
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
          }}
        />
      )}

      <ConflictDialog
        open={Boolean(conflict) && !conflictDismissed}
        busy={resolvingConflict}
        onReload={handleReloadLatest}
        onOverwrite={handleOverwrite}
        onClose={() => setConflictDismissed(true)}
      />

      {/* Publish Validation & Confirmation Modal */}
      {validationModal && (
        <PublishValidationModal
          bookId={validationModal.bookId}
          isOpen={true}
          onClose={() => setValidationModal(null)}
          report={validationModal.report}
          onPublishSuccess={() => {
            refreshJournal();
            showToast('Đã xuất bản thành công bản phát hành mới!');
          }}
        />
      )}
    </div>
  );
}
