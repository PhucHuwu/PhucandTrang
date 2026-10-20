'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import EditorWorkspace from '@/components/admin/EditorWorkspace';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  getJournal,
  updateJournal,
  getAdminMedia,
} from '@/services/adminApi';
import { useJournal } from '@/context/JournalContext';
import { Book, Page, PageElement, PageElementType } from '@/types/book';
import LayersPanel from '@/components/admin/LayersPanel';
import BackgroundEditor from '@/components/admin/BackgroundEditor';
import AdvancedTextEditor from '@/components/admin/AdvancedTextEditor';
import AdvancedImageEditor from '@/components/admin/AdvancedImageEditor';
import AdvancedVideoEditor from '@/components/admin/AdvancedVideoEditor';
import AdvancedShapeEditor from '@/components/admin/AdvancedShapeEditor';
import InteractionEditor from '@/components/admin/InteractionEditor';
import { usePageHistory } from '@/hooks/usePageHistory';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import {
  ArrowLeft,
  Save,
  Type,
  Image as ImageIcon,
  Video,
  Square,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Undo2,
  Redo2,
  Magnet,
  Sliders,
  Palette,
} from 'lucide-react';

export type CoverSide = 'front' | 'back-inside' | 'back-outside';

// Dynamic import KonvaPageCanvas with ssr: false
const KonvaPageCanvas = dynamic(() => import('@/components/admin/KonvaPageCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-[430px] h-[570px] rounded-2xl bg-[#140B10] border border-rosewood-900/40 flex flex-col items-center justify-center text-stone-500 text-xs">
      <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
      <span>Khởi tạo Cover Canvas...</span>
    </div>
  ),
});

export default function BookCoverEditorPage() {
  const { journal, refreshJournal } = useJournal();
  const [activeSide, setActiveSide] = useState<CoverSide>('front');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Selected element ID
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Inspector Tab
  const [inspectorTab, setInspectorTab] = useState<'element' | 'interaction' | 'background'>('element');
  const [editingActiveArea, setEditingActiveArea] = useState(false);

  // Viewport zoom & snapping
  const [snappingEnabled, setSnappingEnabled] = useState(true);

  // Media picker cache
  const [videoMedia, setVideoMedia] = useState<any[]>([]);

  // Virtual Page representing current cover side for the visual editor engine
  const [virtualPage, setVirtualPageState] = useState<Page | null>(null);
  // Synchronous mirror so edits are computed (and history recorded) outside setState updaters
  const virtualPageRef = useRef<Page | null>(null);
  const setVirtualPage = useCallback((next: Page | null) => {
    virtualPageRef.current = next;
    setVirtualPageState(next);
  }, []);
  const gestureRef = useRef(false);
  const { viewportRef, scale: canvasScale, zoom: setCanvasScale, fitViewport } = useCanvasViewport(Boolean(virtualPage));

  // Undo / Redo History Hook
  const {
    canUndo,
    canRedo,
    undo: performUndo,
    redo: performRedo,
    recordHistory,
    initHistory,
  } = usePageHistory(virtualPage, {
    maxHistory: 30,
    onHistoryChange: (restoredPage) => {
      setVirtualPage(restoredPage);
      if (restoredPage.elements?.length > 0 && selectedElementId) {
        const stillExists = restoredPage.elements.some((el) => el.id === selectedElementId);
        if (!stillExists) setSelectedElementId(restoredPage.elements[0].id);
      }
    },
  });

  const updateVirtualPage = useCallback(
    (update: (prev: Page) => Page, description: string) => {
      const prev = virtualPageRef.current;
      if (!prev) return;
      const next = update(prev);
      setVirtualPage(next);
      recordHistory(next, description);
    },
    [setVirtualPage, recordHistory]
  );

  // Construct virtual Page model from current Book.cover side
  const buildVirtualPage = useCallback((b: Book, side: CoverSide): Page => {
    const cover = (b.cover as any) || { front: {}, back: {} };

    let targetSideObj: any;
    let elements: PageElement[] = [];

    if (side === 'front') {
      targetSideObj = cover.front || {};
      elements = targetSideObj.elements || [];
    } else if (side === 'back-inside') {
      targetSideObj = cover.back?.insideBackground || cover.back || {};
      elements = cover.back?.insideElements || [];
    } else {
      targetSideObj = cover.back?.outsideBackground || cover.back || {};
      elements = cover.back?.elements || [];
    }

    const bgUrl =
      side === 'front'
        ? targetSideObj.backgroundUrl || targetSideObj.imageUrl || ''
        : side === 'back-inside'
        ? targetSideObj.insideBackgroundUrl || targetSideObj.imageUrl || ''
        : targetSideObj.outsideBackgroundUrl || targetSideObj.imageUrl || '';

    const bgMediaId =
      side === 'front'
        ? targetSideObj.mediaId
        : side === 'back-inside'
        ? targetSideObj.insideMediaId || targetSideObj.mediaId
        : targetSideObj.outsideMediaId || targetSideObj.mediaId;

    return {
      id: `cover-${side}`,
      pageNumber: 0,
      showPageNumber: false, // Core requirement: showPageNumber = false for covers
      side: side === 'back-inside' ? 'left' : 'right',
      order: 0,
      layout: 'custom',
      layoutMode: 'FREEFORM',
      isCustomized: true,
      background: {
        type: targetSideObj.type || (bgUrl ? 'image' : 'color'),
        imageUrl: bgUrl,
        mediaId: bgMediaId,
        color: targetSideObj.color || '#1A0E15',
        opacity: targetSideObj.opacity !== undefined ? targetSideObj.opacity : 1,
        objectFit: targetSideObj.objectFit || 'cover',
        focalPoint: targetSideObj.focalPoint || { x: 0.5, y: 0.5 },
        gradient: targetSideObj.gradient,
        headerFade: targetSideObj.headerFade,
        gutterFade: targetSideObj.gutterFade,
      },
      elements: JSON.parse(JSON.stringify(elements)),
    };
  }, []);

  // Sync virtual page when journal loads or active side changes
  useEffect(() => {
    if (journal) {
      const pageData = buildVirtualPage(journal, activeSide);
      setVirtualPage(pageData);
      initHistory(pageData);
      if (pageData.elements?.length > 0 && !selectedElementId) {
        setSelectedElementId(pageData.elements[0].id);
      }
    }
  }, [journal, activeSide, buildVirtualPage, initHistory]);

  // Load media videos once
  useEffect(() => {
    async function loadMedia() {
      try {
        const mediaRes = await getAdminMedia({ type: 'VIDEO', limit: 50 });
        setVideoMedia(mediaRes.items || []);
      } catch {
        // Ignore
      }
    }
    loadMedia();
  }, []);

  // Switch side handler (front, back inside, back outside)
  const handleSwitchSide = (newSide: CoverSide) => {
    if (!journal || newSide === activeSide) return;
    setActiveSide(newSide);
    setSelectedElementId(null);
  };

  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z / Ctrl+Y redo (ignored mid-drag and inside form controls)
  useUndoRedoShortcuts({
    canUndo,
    canRedo,
    undo: performUndo,
    redo: performRedo,
    isBlocked: () => gestureRef.current,
  });

  const selectedElement = (virtualPage?.elements || []).find((el) => el.id === selectedElementId);

  // Update selected element property
  const updateSelectedElement = useCallback((updater: (el: any) => any) => {
    if (!selectedElementId) return;
    updateVirtualPage((prevPage) => {
      const updatedElements = (prevPage.elements || []).map((el) => {
        if (el.id === selectedElementId) {
          return updater(el) as PageElement;
        }
        return el;
      });
      const nextPage = {
        ...prevPage,
        elements: updatedElements,
      };
      return nextPage;
    }, 'Chỉnh sửa thuộc tính phần tử bìa');
  }, [selectedElementId, updateVirtualPage]);

  // Update transform from Konva Canvas drag/resize/rotate
  const handleUpdateElementTransform = useCallback(
    (id: string, normalizedTransform: { x: number; y: number; width: number; height: number; rotation: number }) => {
      updateVirtualPage((prevPage) => {
        const updatedElements = (prevPage.elements || []).map((el) => {
          if (el.id === id) {
            return {
              ...el,
              transform: {
                ...el.transform,
                ...normalizedTransform,
              },
            };
          }
          return el;
        });
        const nextPage = {
          ...prevPage,
          elements: updatedElements,
        };
        return nextPage;
      }, 'Di chuyển / co giãn phần tử bìa');
    },
    [updateVirtualPage]
  );

  const handleUpdateActiveArea = useCallback(
    (id: string, activeArea: { left: number; top: number; width: number; height: number }) => {
      updateVirtualPage((prevPage) => {
        const nextPage = {
          ...prevPage,
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
        };
        return nextPage;
      }, 'Cập nhật vùng tương tác bìa');
    },
    [updateVirtualPage]
  );

  // Add Element to Cover
  const handleAddElement = (type: PageElementType) => {
    if (!virtualPage) return;
    const maxZ = (virtualPage.elements || []).reduce((max, el) => Math.max(max, el.zIndex ?? 1), 0);
    const newZ = maxZ + 1;

    let defaultData: any = {};
    let defaultStyle: any = {};

    switch (type) {
      case 'TEXT':
        defaultData = { text: activeSide === 'front' ? 'Chúng Mình' : 'Kỷ Niệm Tình Yêu', variant: 'title' };
        defaultStyle = {
          fontFamily: 'SVN-Housttely Signature',
          fontSize: 48,
          color: '#FFE5B4',
          textAlign: 'center',
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
        defaultData = { shapeType: 'line', strokeColor: '#FFE5B4', strokeWidth: 2 };
        break;
      case 'DECORATION':
        defaultData = { decorationType: 'washi-tape' };
        break;
    }

    const newElement: PageElement = {
      id: `cover-el-${Date.now()}`,
      type,
      zIndex: newZ,
      visible: true,
      locked: false,
      opacity: 1.0,
      transform: { x: 0.15, y: 0.25, width: 0.7, height: 0.2, rotation: 0, scale: 1 },
      style: defaultStyle,
      data: defaultData,
    } as any;

    updateVirtualPage((prev) => {
      const nextPage = { ...prev, elements: [...prev.elements, newElement] };
      return nextPage;
    }, `Thêm phần tử ${type} vào bìa`);
    setSelectedElementId(newElement.id);
  };

  // Duplicate Element
  const handleDuplicateSelected = () => {
    if (!selectedElementId || !virtualPage) return;
    const target = virtualPage.elements.find((el) => el.id === selectedElementId);
    if (!target) return;

    const dup: PageElement = {
      ...JSON.parse(JSON.stringify(target)),
      id: `cover-el-${Date.now()}`,
      zIndex: virtualPage.elements.length + 1,
      transform: {
        ...target.transform,
        x: Math.min(0.8, target.transform.x + 0.03),
        y: Math.min(0.8, target.transform.y + 0.03),
      },
    };

    updateVirtualPage((prev) => {
      const nextPage = { ...prev, elements: [...prev.elements, dup] };
      return nextPage;
    }, 'Nhân bản phần tử bìa');
    setSelectedElementId(dup.id);
    setToast('Đã nhân bản phần tử trên bìa!');
    setTimeout(() => setToast(null), 2500);
  };

  // Delete Element
  const handleDeleteElement = (elementId: string) => {
    if (!virtualPage) return;
    if (!confirm('Bạn có chắc chắn muốn xóa phần tử này khỏi bìa sách?')) return;

    updateVirtualPage((prev) => {
      const remaining = prev.elements.filter((el) => el.id !== elementId);
      const nextPage = { ...prev, elements: remaining };
      return nextPage;
    }, 'Xóa phần tử trên bìa');
    setSelectedElementId(null);
  };

  // Save changes to Book.cover
  const handleSaveCover = async () => {
    if (!journal || !virtualPage) return;
    setSaving(true);
    setToast(null);

    try {
      const currentCover = JSON.parse(JSON.stringify(journal.cover || { front: {}, back: {} }));
      const bg = virtualPage.background as any;

      if (activeSide === 'front') {
        currentCover.front = {
          ...currentCover.front,
          ...bg,
          backgroundUrl: bg?.imageUrl || currentCover.front?.backgroundUrl || '',
          mediaId: bg?.mediaId || currentCover.front?.mediaId,
          elements: virtualPage.elements,
          headerFade: bg?.headerFade,
          gutterFade: bg?.gutterFade,
        };
      } else if (activeSide === 'back-inside') {
        currentCover.back = {
          ...currentCover.back,
          insideBackgroundUrl: bg?.imageUrl || currentCover.back?.insideBackgroundUrl || '',
          insideMediaId: bg?.mediaId || currentCover.back?.insideMediaId,
          insideBackground: bg,
          insideElements: virtualPage.elements,
          headerFade: bg?.headerFade,
          gutterFade: bg?.gutterFade,
        };
      } else {
        currentCover.back = {
          ...currentCover.back,
          outsideBackgroundUrl: bg?.imageUrl || currentCover.back?.outsideBackgroundUrl || '',
          outsideMediaId: bg?.mediaId || currentCover.back?.outsideMediaId,
          outsideBackground: bg,
          elements: virtualPage.elements,
          headerFade: bg?.headerFade,
          gutterFade: bg?.gutterFade,
        };
      }

      await updateJournal({
        cover: currentCover,
      });

      await refreshJournal();
      setToast(`Đã lưu thiết kế ${activeSide.toUpperCase()} lên cơ sở dữ liệu!`);
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu bìa sách');
    } finally {
      setSaving(false);
    }
  };

  if (!virtualPage) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
        <span>Đang nạp Cover Studio...</span>
      </div>
    );
  }

  return (
    <div className="cover-editor editor-root flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-[#0C0609] select-none text-parchment-100 font-sans">
      {/* Top Application Bar */}
      <div className="editor-header bg-[#160D12] border-b border-rosewood-900/50 px-2 py-1.5 lg:px-4 flex items-center gap-2 shrink-0 z-30">
        <Link
          href="/admin"
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 border border-rosewood-900/40 transition-colors"
          title="Quay lại Dashboard"
          aria-label="Quay lại Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="editor-header-label font-serif font-bold text-sm tracking-wide text-parchment-100 truncate min-w-0 shrink" title={journal?.title || ''}>
          Bìa nhật ký
        </h1>

        <div role="tablist" aria-label="Mặt bìa" className="flex-1 min-w-0 max-w-md mr-auto flex items-center gap-0.5 p-0.5 bg-[#20111A] rounded-lg border border-rosewood-900/50 text-xs overflow-x-auto">
          {([
            ['front', 'Bìa trước', 'Trước'],
            ['back-inside', 'Sau – trong', 'Trong'],
            ['back-outside', 'Sau – ngoài', 'Ngoài'],
          ] as const).map(([side, label, short]) => (
            <button
              key={side}
              type="button"
              role="tab"
              aria-selected={activeSide === side}
              onClick={() => handleSwitchSide(side)}
              aria-label={label}
              title={label}
              className={`h-9 flex-1 min-w-max max-w-40 px-2.5 rounded-md whitespace-nowrap transition ${
                activeSide === side ? 'bg-rosewood-600 text-white font-semibold shadow' : 'text-stone-400 hover:text-white'
              }`}
            >
              <span className="editor-header-label">{label}</span>
              <span className="editor-header-short">{short}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSaveCover}
          disabled={saving}
          className="shrink-0 h-10 flex items-center gap-1.5 px-3 rounded-lg bg-rosewood-600 hover:bg-rosewood-500 text-white text-xs font-semibold transition active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] max-w-[calc(100vw-2rem)] px-4 py-2 rounded-xl bg-emerald-950/95 border border-emerald-600/50 text-emerald-300 text-xs flex items-center gap-2 shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main 3-Column Studio Layout */}
      <EditorWorkspace
        toolbar={
          <>
            <div className="editor-scroll flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto">
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
            elements={virtualPage.elements}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={(elId, updater) => {
              updateVirtualPage((prev) => {
                const nextElements = prev.elements.map((el) => (el.id === elId ? updater(el) : el));
                const nextPage = { ...prev, elements: nextElements };
                return nextPage;
              }, 'Cập nhật layer bìa');
            }}
            onReorderElements={(newElements) => {
              updateVirtualPage((prev) => {
                const nextPage = { ...prev, elements: newElements };
                return nextPage;
              }, 'Sắp xếp z-index bìa');
            }}
            onDuplicateElement={handleDuplicateSelected}
            onDeleteElement={handleDeleteElement}
            isViewer={false}
          />
        </aside>

        {/* CENTER COLUMN: Visual Konva Canvas Viewport */}
        <main className="editor-canvas flex-1 min-w-0 min-h-0 flex flex-col bg-[#0A0407] overflow-hidden relative">
          {/* Konva Canvas Rendering Virtual Cover Page */}
          <div ref={viewportRef} className="editor-viewport flex-1 min-h-0 min-w-0 flex items-center justify-center p-4 overflow-auto">
            <KonvaPageCanvas
              page={virtualPage}
              book={journal}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElementTransform={handleUpdateElementTransform}
              editingActiveArea={editingActiveArea && inspectorTab === 'interaction'}
              onUpdateActiveArea={handleUpdateActiveArea}
              scale={canvasScale}
              snappingEnabled={snappingEnabled}
              onGestureChange={(active) => {
                gestureRef.current = active;
              }}
            />
          </div>
        </main>

        {/* RIGHT COLUMN: Properties Panel */}
        <aside className="editor-properties bg-[#140B10] border-l border-rosewood-900/40 flex-col justify-between shrink-0 overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Inspector Tab Switcher */}
            <div className="p-2 bg-[#1C0F16] border-b border-rosewood-900/40 grid grid-cols-3 gap-1 shrink-0 text-[11px]">
              <button
                type="button"
                onClick={() => setInspectorTab('element')}
                className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
                  inspectorTab === 'element'
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Phần tử</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('interaction')}
                className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
                  inspectorTab === 'interaction'
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Tương tác</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('background')}
                className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
                  inspectorTab === 'background'
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                <span>Nền bìa</span>
              </button>
            </div>

            {/* Inspector Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {inspectorTab === 'background' && (
                <BackgroundEditor
                  background={virtualPage.background || { type: 'color', color: '#1A0E15' }}
                  onChange={(newBg) => {
                    updateVirtualPage((prev) => {
                      const nextPage = { ...prev, background: newBg };
                      return nextPage;
                    }, 'Cập nhật nền bìa');
                  }}
                  disabled={false}
                />
              )}

              {inspectorTab === 'interaction' && selectedElement && (
                <InteractionEditor
                  element={selectedElement}
                  pages={[]}
                  audioTracks={[]}
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
                      page={virtualPage}
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

              {inspectorTab !== 'background' && !selectedElement && (
                <div className="py-20 text-center text-xs text-stone-500">
                  <Sliders className="w-8 h-8 mx-auto mb-2 text-rosewood-800 opacity-50" />
                  <p>Chọn một phần tử trên bìa để chỉnh sửa thuộc tính.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </EditorWorkspace>
    </div>
  );
}
