'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  getAdminPage,
  getJournal,
  getAdminPages,
  applyAdminLayout,
  batchUpdateElements,
  createAdminElement,
  deleteAdminElement,
  duplicateAdminElement,
  updateAdminPage,
  getAdminAudioTracks,
  getAdminMedia,
  publishJournal,
  validateJournalForPublish,
  ValidationReport,
} from '@/services/adminApi';
import { useJournal } from '@/context/JournalContext';
import { Page, PageElement, PageElementType, Book } from '@/types/book';
import LayoutPresetPicker from '@/components/admin/LayoutPresetPicker';
import SaveAsLayoutModal from '@/components/admin/SaveAsLayoutModal';
import BackgroundEditor from '@/components/admin/BackgroundEditor';
import AdvancedTextEditor from '@/components/admin/AdvancedTextEditor';
import AdvancedImageEditor from '@/components/admin/AdvancedImageEditor';
import AdvancedVideoEditor from '@/components/admin/AdvancedVideoEditor';
import InteractionEditor from '@/components/admin/InteractionEditor';
import {
  applyLayoutTemplate,
  extractContentFromPage,
  LayoutPresetDefinition,
} from '@/templates/layoutPresets';
import {
  ArrowLeft,
  Save,
  Trash2,
  Copy,
  Layers,
  Type,
  Image as ImageIcon,
  Video,
  Square,
  Sparkles,
  Sliders,
  MousePointer,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  FileText,
  Palette,
  LayoutGrid,
  BookmarkPlus,
  Send,
  ExternalLink,
  History,
  Undo2,
  Redo2,
  Magnet,
  Music,
} from 'lucide-react';
import VersionHistoryModal from '@/components/admin/VersionHistoryModal';
import PublishValidationModal from '@/components/admin/PublishValidationModal';
import { useAutosavePage } from '@/hooks/useAutosavePage';
import AutosaveIndicator from '@/components/admin/AutosaveIndicator';
import { usePageHistory } from '@/hooks/usePageHistory';
import LayersPanel from '@/components/admin/LayersPanel';

// Dynamic import KonvaPageCanvas with ssr: false because Konva requires DOM window & canvas
const KonvaPageCanvas = dynamic(() => import('@/components/admin/KonvaPageCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-[430px] h-[570px] rounded-2xl bg-[#140B10] border border-rosewood-900/40 flex flex-col items-center justify-center text-stone-500 text-xs">
      <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
      <span>Khởi tạo Visual Canvas...</span>
    </div>
  ),
});

export default function VisualPageEditorDirectPage() {
  const params = useParams();
  const pageId = params.pageId as string;
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
  const [page, setPage] = useState<Page | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(0.42);

  // Layout Picker Modal state
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  // Save As Layout Modal state
  const [showSaveAsLayout, setShowSaveAsLayout] = useState(false);

  // Active Inspector Tab
  const [inspectorTab, setInspectorTab] = useState<'element' | 'interaction' | 'background' | 'metadata'>('element');
  const [editingActiveArea, setEditingActiveArea] = useState(false);

  // Snapping Toggle
  const [snappingEnabled, setSnappingEnabled] = useState(true);

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
      if (restoredPage.elements?.length > 0 && selectedElementId) {
        const stillExists = restoredPage.elements.some((el) => el.id === selectedElementId);
        if (!stillExists) setSelectedElementId(restoredPage.elements[0].id);
      }
    },
  });

  // Autosave
  const {
    status: autosaveStatus,
    lastSavedTime,
    errorMessage: autosaveError,
    retrySave,
    forceSave,
  } = useAutosavePage(page, {
    pageId,
    isViewer: false,
    debounceMs: 800,
  });

  // Load page and related journal data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [pageData, tracks, videos] = await Promise.all([
          getAdminPage(pageId),
          getAdminAudioTracks(),
          getAdminMedia({ type: 'VIDEO', limit: 100 }),
        ]);
        setPage(pageData);
        initHistory(pageData);
        setAudioTracks(tracks);
        setVideoMedia(videos.items || []);
        if (pageData.elements && pageData.elements.length > 0) {
          setSelectedElementId(pageData.elements[0].id);
        }

        // Fetch pages list of this journal
        const pagesList = await getAdminPages(pageData.bookId);
        setAllPages(pagesList);
      } catch (err: any) {
        alert(err?.message || 'Không thể nạp dữ liệu trang');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [pageId, initHistory]);

  const selectedElement = (page?.elements || []).find((el) => el.id === selectedElementId);

  // Update selected element property locally
  const updateSelectedElement = useCallback((updater: (el: any) => any) => {
    if (!selectedElementId) return;
    setPage((prevPage) => {
      if (!prevPage) return prevPage;
      const updatedElements = (prevPage.elements || []).map((el) => {
        if (el.id === selectedElementId) {
          return updater(el) as PageElement;
        }
        return el;
      });
      const nextPage = {
        ...prevPage,
        isCustomized: true,
        elements: updatedElements,
      };
      recordHistory(nextPage, 'Chỉnh sửa thuộc tính phần tử');
      return nextPage;
    });
  }, [selectedElementId, recordHistory]);

  // Update normalized transform when dragged or resized on Konva Canvas
  const handleUpdateElementTransform = useCallback(
    (id: string, normalizedTransform: { x: number; y: number; width: number; height: number; rotation: number }) => {
      setPage((prevPage) => {
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
          isCustomized: true,
          elements: updatedElements,
        };
        recordHistory(nextPage, 'Thay đổi vị trí / kích thước phần tử');
        return nextPage;
      });
    },
    [recordHistory]
  );

  const handleUpdateActiveArea = useCallback(
    (id: string, activeArea: { left: number; top: number; width: number; height: number }) => {
      setPage((prevPage) => {
        if (!prevPage) return prevPage;
        const nextPage = {
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
        };
        recordHistory(nextPage, 'Cập nhật vùng bấm tương tác');
        return nextPage;
      });
    },
    [recordHistory]
  );

  // Apply Layout Template
  const handleApplyLayoutTemplate = async (templateDef: LayoutPresetDefinition) => {
    if (!page) return;
    setSaving(true);
    setToast(null);

    try {
      const extractedContent = extractContentFromPage(page);
      const newlyArrangedPage = applyLayoutTemplate(
        {
          ...page,
          pageNumber: page.pageNumber,
          side: page.side,
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

      // Atomic Apply Layout (single transaction replaces elements & sets isCustomized=false)
      const refreshedPage = await applyAdminLayout(pageId, templateDef.id, elementsToSave);

      setPage(refreshedPage);
      recordHistory(refreshedPage, `Áp dụng bố cục ${templateDef.name}`);
      if (refreshedPage.elements?.length > 0) {
        setSelectedElementId(refreshedPage.elements[0].id);
      }

      setToast(`Đã áp dụng bố cục "${templateDef.name}" thành công!`);
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Lỗi áp dụng bố cục mới');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishClick = async () => {
    if (publishing) return;
    try {
      setPublishing(true);
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
    if (!page) return;
    const maxZ = (page.elements || []).reduce((max, el) => Math.max(max, el.zIndex ?? 1), 0);
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
      const created = await createAdminElement(newElementPayload);
      setPage((prev) => {
        if (!prev) return prev;
        const nextPage = { ...prev, isCustomized: true, elements: [...prev.elements, created] };
        recordHistory(nextPage, `Thêm phần tử ${type}`);
        return nextPage;
      });
      setSelectedElementId(created.id);
    } catch (err: any) {
      alert(err?.message || 'Lỗi thêm phần tử mới');
    }
  };

  // Duplicate selected element
  const handleDuplicateSelected = async () => {
    if (!selectedElementId) return;
    try {
      const dup = await duplicateAdminElement(selectedElementId, 0.03, 0.03);
      setPage((prev) => {
        if (!prev) return prev;
        const nextPage = { ...prev, isCustomized: true, elements: [...prev.elements, dup] };
        recordHistory(nextPage, 'Nhân bản phần tử');
        return nextPage;
      });
      setSelectedElementId(dup.id);
      setToast('Đã nhân bản phần tử!');
      setTimeout(() => setToast(null), 2500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi nhân bản phần tử');
    }
  };

  // Delete element
  const handleDeleteElement = async (elementId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phần tử này khỏi trang?')) return;
    try {
      await deleteAdminElement(elementId);
      setPage((prev) => {
        if (!prev) return prev;
        const remaining = prev.elements.filter((el) => el.id !== elementId);
        const nextPage = { ...prev, isCustomized: true, elements: remaining };
        recordHistory(nextPage, 'Xóa phần tử');
        return nextPage;
      });
      setSelectedElementId(null);
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa phần tử');
    }
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

  if (loading || !page) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
        <span>Đang nạp Visual Studio...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0C0609] select-none text-parchment-100 font-sans">
      {/* Top Application Bar */}
      <div className="h-14 bg-[#160D12] border-b border-rosewood-900/50 px-5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages"
            className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 border border-rosewood-900/40 transition-colors"
            title="Quay lại danh sách trang"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-sm tracking-wide text-parchment-100">
              Trang {page.pageNumber === 0 ? 'Lời ngỏ' : page.pageNumber}: {page.title || '(Không tiêu đề)'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rosewood-950 text-champagne-300 border border-rosewood-800/40">
              {page.side}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                page.isCustomized
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {page.isCustomized ? 'Tùy biến' : `Template: ${page.layoutTemplateId || page.layout}`}
            </span>
          </div>
        </div>

        {/* Center Quick Action Bar (Undo/Redo + Snap + Add Elements + Layout Preset Picker) */}
        <div className="flex items-center gap-2">
          {/* Undo & Redo */}
          <div className="flex items-center gap-0.5 bg-[#20111A] p-1 rounded-xl border border-rosewood-900/40 text-xs">
            <button
              type="button"
              onClick={() => performUndo()}
              disabled={!canUndo}
              className="p-1.5 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition disabled:opacity-30"
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => performRedo()}
              disabled={!canRedo}
              className="p-1.5 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition disabled:opacity-30"
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
            <Magnet className={`w-3.5 h-3.5 ${snappingEnabled ? 'text-cyan-400' : 'text-stone-500'}`} />
            <span className="hidden sm:inline">Snap: {snappingEnabled ? 'BẬT' : 'TẮT'}</span>
          </button>

          {/* Layout Picker Button */}
          <button
            type="button"
            onClick={() => setShowLayoutPicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rosewood-900/80 to-[#2A1220] hover:border-champagne-400 text-champagne-300 text-xs font-medium border border-rosewood-700/60 shadow-md transition-all active:scale-95"
            title="Đổi bố cục trang"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-champagne-400" />
            <span>Đổi Bố Cục</span>
          </button>

          {/* Save As Custom Layout Template */}
          <button
            type="button"
            onClick={() => setShowSaveAsLayout(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22101A] hover:bg-[#2D1623] hover:border-rosewood-600 text-parchment-200 text-xs font-medium border border-rosewood-800/60 shadow-md transition-all active:scale-95"
            title="Lưu bố cục hiện tại thành template tùy biến"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Lưu Template</span>
          </button>

          {/* Add Elements Group */}
          <div className="flex items-center gap-1 bg-[#20111A] p-1 rounded-xl border border-rosewood-900/40 text-xs">
            <button
              type="button"
              onClick={() => handleAddElement('TEXT')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition"
              title="Thêm khối chữ"
            >
              <Type className="w-3.5 h-3.5 text-champagne-300" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddElement('IMAGE')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition"
              title="Thêm ảnh"
            >
              <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
              <span>Ảnh</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddElement('VIDEO')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition"
              title="Thêm video"
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Video</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddElement('SHAPE')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition"
              title="Thêm đường kẻ"
            >
              <Square className="w-3.5 h-3.5 text-rosewood-400" />
              <span>Shape</span>
            </button>
          </div>
        </div>

        {/* Right Action: Autosave Indicator, Preview & Publish & Save Buttons */}
        <div className="flex items-center gap-2">
          <AutosaveIndicator
            status={autosaveStatus}
            lastSavedTime={lastSavedTime}
            errorMessage={autosaveError}
            onRetry={retrySave}
          />

          {toast && (
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-fade-in mr-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{toast}</span>
            </span>
          )}

          {/* Version History Button */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#20111A] hover:bg-[#2C1923] text-amber-300 border border-rosewood-900/40 text-xs font-medium transition shadow-sm"
            title="Lịch sử phiên bản và Rollback"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Lịch sử</span>
          </button>

          {/* Preview Draft Button */}
          <Link
            href="/admin/preview"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-xs font-medium transition shadow-sm"
            title="Xem trước bản nháp trên 3D Flipbook"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Preview Draft</span>
          </Link>

          {/* Publish Button */}
          <button
            type="button"
            onClick={handlePublishClick}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-medium shadow-md transition disabled:opacity-50"
            title="Đóng gói snapshot và xuất bản công khai"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{publishing ? 'Đang xuất bản...' : 'Publish'}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              try {
                await forceSave();
                setToast('Đã lưu trang thành công!');
                setTimeout(() => setToast(null), 2500);
              } catch (err: any) {
                alert(`Lỗi khi lưu trang: ${err?.message || 'Vui lòng kiểm tra lại'}`);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || autosaveStatus === 'saving'}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-lg shadow-rosewood-950/50 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving || autosaveStatus === 'saving' ? 'Đang lưu...' : 'Lưu trang'}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Visual Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Layers Panel */}
        <aside className="w-68 bg-[#140B10] border-r border-rosewood-900/40 flex flex-col justify-between shrink-0 overflow-hidden">
          <LayersPanel
            elements={page.elements || []}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={(elId, updater) => {
              setPage((prevPage) => {
                if (!prevPage) return prevPage;
                const updatedElements = (prevPage.elements || []).map((el) =>
                  el.id === elId ? updater(el) : el
                );
                const nextPage = {
                  ...prevPage,
                  isCustomized: true,
                  elements: updatedElements,
                };
                recordHistory(nextPage, 'Cập nhật layer');
                return nextPage;
              });
            }}
            onReorderElements={(newElements) => {
              setPage((prevPage) => {
                if (!prevPage) return prevPage;
                const nextPage = {
                  ...prevPage,
                  isCustomized: true,
                  elements: newElements,
                };
                recordHistory(nextPage, 'Sắp xếp lại thứ tự z-index layers');
                return nextPage;
              });
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
        <main className="flex-1 flex flex-col bg-[#0A0407] overflow-hidden relative">
          {/* Canvas Viewport Toolbar */}
          <div className="h-10 bg-[#140B10] border-b border-rosewood-900/40 px-4 flex items-center justify-between text-xs text-stone-400 z-10 shrink-0">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Canvas 1024 × 1360px</span>
              <span className="text-stone-600">|</span>
              <span>Tỉ lệ: {Math.round(canvasScale * 100)}%</span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCanvasScale((s) => Math.max(0.2, parseFloat((s - 0.05).toFixed(2))))}
                className="p-1 rounded bg-[#20111A] hover:bg-rosewood-800 text-stone-300 transition-colors"
                title="Thu nhỏ canvas"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono w-10 text-center text-[11px]">{Math.round(canvasScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setCanvasScale((s) => Math.min(1.2, parseFloat((s + 0.05).toFixed(2))))}
                className="p-1 rounded bg-[#20111A] hover:bg-rosewood-800 text-stone-300 transition-colors"
                title="Phóng to canvas"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCanvasScale(0.42)}
                className="p-1 rounded bg-[#20111A] hover:bg-rosewood-800 text-stone-300 transition-colors"
                title="Tỉ lệ chuẩn 42%"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Konva Canvas Viewport */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
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
            />
          </div>
        </main>

        {/* RIGHT COLUMN: Properties Panel (width: 320px) */}
        <aside className="w-80 bg-[#140B10] border-l border-rosewood-900/40 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Inspector Top Switcher (Tabs: Element vs Background vs Interaction vs Metadata) */}
            <div className="p-2 bg-[#1C0F16] border-b border-rosewood-900/40 grid grid-cols-4 gap-1 shrink-0 text-[11px]">
              <button
                type="button"
                onClick={() => setInspectorTab('element')}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition-all ${
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
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition-all ${
                  inspectorTab === 'interaction'
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
                title="Tương tác phần tử"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="truncate">T.Tác</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('background')}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition-all ${
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
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition-all ${
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
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setPage((prev) => (prev ? { ...prev, isCustomized: true, title: val } : prev));
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setPage((prev) => (prev ? { ...prev, isCustomized: true, chapter: val } : prev));
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setPage((prev) => (prev ? { ...prev, isCustomized: true, quote: val } : prev));
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setPage((prev) => (prev ? { ...prev, isCustomized: true, handwriting: val } : prev));
                      }}
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
                        setPage((prev) => (prev ? { ...prev, isCustomized: true, audioTrackId: val } as any : prev));
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
                    setPage((prevPage) => {
                      if (!prevPage) return prevPage;
                      const nextPage = {
                        ...prevPage,
                        isCustomized: true,
                        background: newBg,
                      };
                      recordHistory(nextPage, 'Cập nhật nền trang');
                      return nextPage;
                    });
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
                </>
              )}

              {inspectorTab !== 'background' && !selectedElement && (
                <div className="py-20 text-center text-xs text-stone-500">
                  <Sliders className="w-8 h-8 mx-auto mb-2 text-rosewood-800 opacity-50" />
                  <p>Chọn một phần tử trên canvas để chỉnh sửa thuộc tính.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

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
            setToast('Đã lưu bố cục thành Layout Template mới!');
            setTimeout(() => setToast(null), 3000);
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
              setPage(refreshed);
            } catch {
              window.location.reload();
            }
          }}
        />
      )}

      {/* Publish Validation & Confirmation Modal */}
      {validationModal && (
        <PublishValidationModal
          bookId={validationModal.bookId}
          isOpen={true}
          onClose={() => setValidationModal(null)}
          report={validationModal.report}
          onPublishSuccess={() => {
            refreshJournal();
            setToast('Đã xuất bản thành công bản phát hành mới!');
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}
    </div>
  );
}
