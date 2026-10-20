'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import EditorWorkspace from '@/components/admin/EditorWorkspace';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  getAdminPage,
  getAdminPages,
  getAdminAudioTracks,
  getAdminMedia,
  validateJournalForPublish,
  ValidationReport,
} from '@/services/adminApi';
import { useJournal } from '@/context/JournalContext';
import { Page, PageElement } from '@/types/book';
import { DESIGN_CANVAS_HEIGHT, DESIGN_CANVAS_WIDTH } from '@phucandtrang/shared';
import { useAutosavePage, readPageDraft, clearPageDraft, PageDraft } from '@/hooks/useAutosavePage';
import { usePageHistory } from '@/hooks/usePageHistory';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { usePageTabPresence } from '@/hooks/usePageTabPresence';
import EditorHeader from '@/components/admin/page-editor/EditorHeader';
import EditorNotices from '@/components/admin/page-editor/EditorNotices';
import EditorToast from '@/components/admin/page-editor/EditorToast';
import EditorToolbar from '@/components/admin/page-editor/EditorToolbar';
import LayersColumn from '@/components/admin/page-editor/LayersColumn';
import PropertiesColumn from '@/components/admin/page-editor/PropertiesColumn';
import EditorModals from '@/components/admin/page-editor/EditorModals';
import type { EditorToastMessage, InspectorTab } from '@/components/admin/page-editor/types';
import { usePageEditCallbacks } from '@/components/admin/page-editor/usePageEditCallbacks';
import { usePageElementActions } from '@/components/admin/page-editor/usePageElementActions';
import { usePageSyncActions } from '@/components/admin/page-editor/usePageSyncActions';

// Dynamic import KonvaPageCanvas with ssr: false because Konva requires DOM window & canvas
const KonvaPageCanvas = dynamic(() => import('@/components/admin/KonvaPageCanvas'), {
  ssr: false,
  loading: () => (
    <div
      className="w-[min(430px,90%)] rounded-2xl bg-[#140B10] border border-rosewood-900/40 flex flex-col items-center justify-center text-stone-500 text-xs"
      style={{ aspectRatio: `${DESIGN_CANVAS_WIDTH} / ${DESIGN_CANVAS_HEIGHT}` }}
    >
      <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
      <span>Khởi tạo Visual Canvas...</span>
    </div>
  ),
});

export default function VisualPageEditorDirectPage() {
  const params = useParams();
  const pageId = params.pageId as string;
  // Remount per page: no state, history, autosave baseline or in-flight save can leak across pages
  return <PageEditor key={pageId} pageId={pageId} />;
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
  const [toast, setToast] = useState<EditorToastMessage | null>(null);
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
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('element');
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

  const showToast = useCallback((message: string, tone: EditorToastMessage['tone'] = 'success', ms = 3000) => {
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

  const {
    updateSelectedElement,
    handleUpdateElementTransform,
    handleUpdateActiveArea,
    updateMetadata,
    commitMetadataHistory,
  } = usePageEditCallbacks({ pageRef, selectedElementId, updatePage, recordHistory });

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

  const { handleApplyLayoutTemplate, handleAddElement, handleDuplicateSelected, handleDeleteElement } =
    usePageElementActions({
      pageId,
      pageRef,
      selectedElementId,
      setSelectedElementId,
      setSaving,
      setToast,
      showToast,
      updatePage,
      adoptServerPage,
      runServerMutation,
      markElementOnServer,
      markElementDeleted,
      flushAutosave,
    });

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

  const {
    navigateAway,
    handleReloadLatest,
    handleOverwrite,
    handleRestoreDraft,
    handleDiscardDraft,
    handleSaveClick,
    handleRollbackSuccess,
  } = usePageSyncActions({
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
  });

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
      <EditorHeader
        page={page}
        navigateAway={navigateAway}
        autosaveStatus={autosaveStatus}
        lastSavedTime={lastSavedTime}
        autosaveError={autosaveError}
        retrySave={retrySave}
        flushAutosave={flushAutosave}
        setShowHistoryModal={setShowHistoryModal}
        handlePublishClick={handlePublishClick}
        publishing={publishing}
        saving={saving}
        onSave={handleSaveClick}
      />

      <EditorNotices
        otherTabOpen={otherTabOpen}
        draftOffer={draftOffer}
        conflict={conflict}
        conflictDismissed={conflictDismissed}
        handleRestoreDraft={handleRestoreDraft}
        handleDiscardDraft={handleDiscardDraft}
        setConflictDismissed={setConflictDismissed}
      />

      <EditorToast toast={toast} />

      {/* 3-Column Visual Layout */}
      <EditorWorkspace
        panel={mobilePanel}
        onPanelChange={setMobilePanel}
        toolbar={
          <EditorToolbar
            setShowLayoutPicker={setShowLayoutPicker}
            handleAddElement={handleAddElement}
            performUndo={performUndo}
            canUndo={canUndo}
            performRedo={performRedo}
            canRedo={canRedo}
            snappingEnabled={snappingEnabled}
            setSnappingEnabled={setSnappingEnabled}
            setShowSaveAsLayout={setShowSaveAsLayout}
            setCanvasScale={setCanvasScale}
            canvasScale={canvasScale}
            fitViewport={fitViewport}
          />
        }
      >
        {/* LEFT COLUMN: Layers Panel */}
        <LayersColumn
          page={page}
          pageId={pageId}
          allPages={allPages}
          selectedElementId={selectedElementId}
          setSelectedElementId={setSelectedElementId}
          updatePage={updatePage}
          handleDuplicateSelected={handleDuplicateSelected}
          handleDeleteElement={handleDeleteElement}
          navigateAway={navigateAway}
          navigating={navigating}
        />

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
        <PropertiesColumn
          page={page}
          journal={journal}
          allPages={allPages}
          audioTracks={audioTracks}
          videoMedia={videoMedia}
          inspectorTab={inspectorTab}
          setInspectorTab={setInspectorTab}
          selectedElement={selectedElement}
          updateSelectedElement={updateSelectedElement}
          updatePage={updatePage}
          updateMetadata={updateMetadata}
          commitMetadataHistory={commitMetadataHistory}
          editingActiveArea={editingActiveArea}
          setEditingActiveArea={setEditingActiveArea}
        />
      </EditorWorkspace>

      <EditorModals
        page={page}
        journal={journal}
        showLayoutPicker={showLayoutPicker}
        setShowLayoutPicker={setShowLayoutPicker}
        handleApplyLayoutTemplate={handleApplyLayoutTemplate}
        showSaveAsLayout={showSaveAsLayout}
        setShowSaveAsLayout={setShowSaveAsLayout}
        showHistoryModal={showHistoryModal}
        setShowHistoryModal={setShowHistoryModal}
        onRollbackSuccess={handleRollbackSuccess}
        conflict={conflict}
        conflictDismissed={conflictDismissed}
        setConflictDismissed={setConflictDismissed}
        resolvingConflict={resolvingConflict}
        handleReloadLatest={handleReloadLatest}
        handleOverwrite={handleOverwrite}
        validationModal={validationModal}
        setValidationModal={setValidationModal}
        refreshJournal={refreshJournal}
        showToast={showToast}
      />
    </div>
  );
}
