'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
import InteractionEditor from '@/components/admin/InteractionEditor';
import { usePageHistory } from '@/hooks/usePageHistory';
import {
  ArrowLeft,
  Save,
  Type,
  Image as ImageIcon,
  Video,
  Square,
  Sparkles,
  Layers,
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
  const [canvasScale, setCanvasScale] = useState(0.42);
  const [snappingEnabled, setSnappingEnabled] = useState(true);

  // Media picker cache
  const [videoMedia, setVideoMedia] = useState<any[]>([]);

  // Virtual Page representing current cover side for the visual editor engine
  const [virtualPage, setVirtualPage] = useState<Page | null>(null);

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

  // Keyboard Shortcuts: Ctrl/Cmd + Z (Undo), Ctrl/Cmd + Shift + Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) performRedo();
        } else {
          if (canUndo) performUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, performUndo, performRedo]);

  const selectedElement = (virtualPage?.elements || []).find((el) => el.id === selectedElementId);

  // Update selected element property
  const updateSelectedElement = useCallback((updater: (el: any) => any) => {
    if (!selectedElementId) return;
    setVirtualPage((prevPage) => {
      if (!prevPage) return prevPage;
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
      recordHistory(nextPage, 'Chỉnh sửa thuộc tính phần tử bìa');
      return nextPage;
    });
  }, [selectedElementId, recordHistory]);

  // Update transform from Konva Canvas drag/resize/rotate
  const handleUpdateElementTransform = useCallback(
    (id: string, normalizedTransform: { x: number; y: number; width: number; height: number; rotation: number }) => {
      setVirtualPage((prevPage) => {
        if (!prevPage) return prevPage;
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
        recordHistory(nextPage, 'Di chuyển / co giãn phần tử bìa');
        return nextPage;
      });
    },
    [recordHistory]
  );

  const handleUpdateActiveArea = useCallback(
    (id: string, activeArea: { left: number; top: number; width: number; height: number }) => {
      setVirtualPage((prevPage) => {
        if (!prevPage) return prevPage;
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
        recordHistory(nextPage, 'Cập nhật vùng tương tác bìa');
        return nextPage;
      });
    },
    [recordHistory]
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
          objectFit: 'cover',
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

    setVirtualPage((prev) => {
      if (!prev) return prev;
      const nextPage = { ...prev, elements: [...prev.elements, newElement] };
      recordHistory(nextPage, `Thêm phần tử ${type} vào bìa`);
      return nextPage;
    });
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

    setVirtualPage((prev) => {
      if (!prev) return prev;
      const nextPage = { ...prev, elements: [...prev.elements, dup] };
      recordHistory(nextPage, 'Nhân bản phần tử bìa');
      return nextPage;
    });
    setSelectedElementId(dup.id);
    setToast('Đã nhân bản phần tử trên bìa!');
    setTimeout(() => setToast(null), 2500);
  };

  // Delete Element
  const handleDeleteElement = (elementId: string) => {
    if (!virtualPage) return;
    if (!confirm('Bạn có chắc chắn muốn xóa phần tử này khỏi bìa sách?')) return;

    setVirtualPage((prev) => {
      if (!prev) return prev;
      const remaining = prev.elements.filter((el) => el.id !== elementId);
      const nextPage = { ...prev, elements: remaining };
      recordHistory(nextPage, 'Xóa phần tử trên bìa');
      return nextPage;
    });
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#0C0609] select-none text-parchment-100 font-sans">
      {/* Top Application Bar */}
      <div className="h-14 bg-[#160D12] border-b border-rosewood-900/50 px-5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 border border-rosewood-900/40 transition-colors"
            title="Quay lại Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-sm tracking-wide text-parchment-100">
              Biên Tập Bìa Nhật Ký: {journal?.title || 'Chúng Mình'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rosewood-950 text-champagne-300 border border-rosewood-800/40 uppercase">
              {activeSide}
            </span>
          </div>
        </div>

        {/* Center: Cover Sides Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#20111A] rounded-xl border border-rosewood-900/50 text-xs">
          <button
            type="button"
            onClick={() => handleSwitchSide('front')}
            className={`px-3 py-1 rounded-lg transition ${
              activeSide === 'front'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Bìa trước (Front)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSide('back-inside')}
            className={`px-3 py-1 rounded-lg transition ${
              activeSide === 'back-inside'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Bìa sau trong (Inside)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSide('back-outside')}
            className={`px-3 py-1 rounded-lg transition ${
              activeSide === 'back-outside'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Bìa sau ngoài (Outside)
          </button>
        </div>

        {/* Right Action: Undo/Redo & Save Cover */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 bg-[#20111A] p-1 rounded-xl border border-rosewood-900/40 text-xs">
            <button
              type="button"
              onClick={() => performUndo()}
              disabled={!canUndo}
              className="p-1.5 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition-colors disabled:opacity-30"
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => performRedo()}
              disabled={!canRedo}
              className="p-1.5 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition-colors disabled:opacity-30"
              title="Làm lại (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Snap toggle */}
          <button
            type="button"
            onClick={() => setSnappingEnabled(!snappingEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              snappingEnabled
                ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 shadow-sm'
                : 'bg-[#20111A] border-rosewood-900/40 text-stone-500 hover:text-stone-300'
            }`}
            title="Bật/tắt hít từ tính"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Snap: {snappingEnabled ? 'BẬT' : 'TẮT'}</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveCover}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Đang lưu...' : 'Lưu bìa'}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-5 py-2 text-xs text-emerald-300 flex items-center justify-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main 3-Column Studio Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Layers Panel */}
        <aside className="w-68 bg-[#140B10] border-r border-rosewood-900/40 flex flex-col justify-between shrink-0 overflow-hidden">
          <LayersPanel
            elements={virtualPage.elements}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={(elId, updater) => {
              setVirtualPage((prev) => {
                if (!prev) return prev;
                const nextElements = prev.elements.map((el) => (el.id === elId ? updater(el) : el));
                const nextPage = { ...prev, elements: nextElements };
                recordHistory(nextPage, 'Cập nhật layer bìa');
                return nextPage;
              });
            }}
            onReorderElements={(newElements) => {
              setVirtualPage((prev) => {
                if (!prev) return prev;
                const nextPage = { ...prev, elements: newElements };
                recordHistory(nextPage, 'Sắp xếp z-index bìa');
                return nextPage;
              });
            }}
            onDuplicateElement={handleDuplicateSelected}
            onDeleteElement={handleDeleteElement}
            isViewer={false}
          />
        </aside>

        {/* CENTER COLUMN: Visual Konva Canvas Viewport */}
        <main className="flex-1 flex flex-col bg-[#0A0407] overflow-hidden relative">
          {/* Top Quick Elements Add Bar */}
          <div className="h-10 bg-[#140B10] border-b border-rosewood-900/40 px-4 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Bìa Canvas 1024 × 1360px</span>
              <span className="text-stone-600">|</span>
              <span>Tỉ lệ: {Math.round(canvasScale * 100)}%</span>
            </div>

            {/* Add Elements buttons */}
            <div className="flex items-center gap-1 bg-[#20111A] p-0.5 rounded-lg border border-rosewood-900/40">
              <button
                type="button"
                onClick={() => handleAddElement('TEXT')}
                className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-rosewood-800/60 text-parchment-200 transition"
                title="Thêm khối chữ"
              >
                <Type className="w-3.5 h-3.5 text-champagne-300" />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('IMAGE')}
                className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-rosewood-800/60 text-parchment-200 transition"
                title="Thêm ảnh"
              >
                <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                <span>Ảnh</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('VIDEO')}
                className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-rosewood-800/60 text-parchment-200 transition"
                title="Thêm video"
              >
                <Video className="w-3.5 h-3.5 text-amber-400" />
                <span>Video</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('SHAPE')}
                className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-rosewood-800/60 text-parchment-200 transition"
                title="Thêm đường kẻ"
              >
                <Square className="w-3.5 h-3.5 text-rosewood-400" />
                <span>Shape</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCanvasScale((s) => Math.max(0.2, parseFloat((s - 0.05).toFixed(2))))}
                className="p-1 rounded bg-[#20111A] hover:bg-rosewood-800 text-stone-300"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono w-10 text-center text-[11px]">{Math.round(canvasScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setCanvasScale((s) => Math.min(1.2, parseFloat((s + 0.05).toFixed(2))))}
                className="p-1 rounded bg-[#20111A] hover:bg-rosewood-800 text-stone-300"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCanvasScale(0.42)}
                className="p-1 rounded bg-[#20111A] hover:bg-rosewood-800 text-stone-300"
                title="Chuẩn 42%"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Konva Canvas Rendering Virtual Cover Page */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
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
            />
          </div>
        </main>

        {/* RIGHT COLUMN: Properties Panel */}
        <aside className="w-80 bg-[#140B10] border-l border-rosewood-900/40 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Inspector Tab Switcher */}
            <div className="p-2.5 bg-[#1C0F16] border-b border-rosewood-900/40 flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setInspectorTab('element')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                    setVirtualPage((prev) => {
                      if (!prev) return prev;
                      const nextPage = { ...prev, background: newBg };
                      recordHistory(nextPage, 'Cập nhật nền bìa');
                      return nextPage;
                    });
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
      </div>
    </div>
  );
}
