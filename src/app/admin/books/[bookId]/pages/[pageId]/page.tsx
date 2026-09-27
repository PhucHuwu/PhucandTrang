'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  getAdminPage,
  getAdminBook,
  getAdminPages,
  batchUpdateElements,
  createAdminElement,
  deleteAdminElement,
  duplicateAdminElement,
  updateAdminPage,
} from '@/services/adminApi';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Page, PageElement, PageElementType, Book } from '@/types/book';
import LayoutPresetPicker from '@/components/admin/LayoutPresetPicker';
import SaveAsLayoutModal from '@/components/admin/SaveAsLayoutModal';
import {
  applyLayoutTemplate,
  extractContentFromPage,
  LayoutPresetDefinition,
} from '@/templates/layoutPresets';
import {
  ArrowLeft,
  Save,
  Plus,
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
} from 'lucide-react';

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

export default function VisualPageEditorPage() {
  const { isViewer } = useAdminAuth();
  const params = useParams();
  const bookId = params.bookId as string;
  const pageId = params.pageId as string;

  const [book, setBook] = useState<Partial<Book> | null>(null);
  const [allPages, setAllPages] = useState<any[]>([]);
  const [page, setPage] = useState<Page | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(0.42);

  // Layout Picker Modal state (Prompt 16)
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  // Save As Layout Modal state (Prompt 17)
  const [showSaveAsLayout, setShowSaveAsLayout] = useState(false);

  // Load initial page, all book pages, and book settings
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [bookData, pageData, pagesList] = await Promise.all([
          getAdminBook(bookId),
          getAdminPage(pageId),
          getAdminPages(bookId),
        ]);
        setBook(bookData);
        setPage(pageData);
        setAllPages(pagesList);
        if (pageData.elements && pageData.elements.length > 0) {
          setSelectedElementId(pageData.elements[0].id);
        }
      } catch (err: any) {
        alert(err?.message || 'Không thể nạp dữ liệu trang');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookId, pageId]);

  const selectedElement = (page?.elements || []).find((el) => el.id === selectedElementId);

  // Update selected element property locally -> sets isCustomized = true (Prompt 16 Requirement)
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
      return {
        ...prevPage,
        isCustomized: true, // Setting property sets isCustomized = true
        elements: updatedElements,
      };
    });
  }, [selectedElementId]);

  // Update normalized transform when dragged or resized on Konva Canvas -> sets isCustomized = true (Prompt 16 Requirement)
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
        return {
          ...prevPage,
          isCustomized: true, // Dragging/resizing sets isCustomized = true
          elements: updatedElements,
        };
      });
    },
    []
  );

  // Apply Layout Template (Prompt 16 Core Requirement)
  const handleApplyLayoutTemplate = async (templateDef: LayoutPresetDefinition) => {
    if (isViewer || !page) return;
    setSaving(true);
    setToast(null);

    try {
      // 1. Extract existing reusable content (media, text, quote, handwriting) from current page
      const extractedContent = extractContentFromPage(page);

      // 2. Apply template definition to arrange elements into new slots
      const newlyArrangedPage = applyLayoutTemplate(
        {
          ...page,
          pageNumber: page.pageNumber,
          side: page.side,
        },
        templateDef,
        extractedContent
      );

      // Explicit requirements for Apply Layout:
      // - layoutTemplateId = template.id
      // - layoutMode = PRESET
      // - sourceTemplateId = template.id
      // - isCustomized = false
      const updatedMetadata = {
        layoutTemplateId: templateDef.id,
        layoutMode: 'PRESET',
        sourceTemplateId: templateDef.id,
        isCustomized: false,
      };

      // 3. Update page metadata in backend
      await updateAdminPage(pageId, updatedMetadata, true);

      // 4. Batch save the newly arranged elements
      const elementsToSave = newlyArrangedPage.elements.map((el) => ({
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
      }));

      await batchUpdateElements(pageId, elementsToSave);

      // Refresh page from backend to ensure consistent state
      const refreshedPage = await getAdminPage(pageId);
      setPage(refreshedPage);
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

  // Add new element to page
  const handleAddElement = async (type: PageElementType) => {
    if (isViewer || !page) return;
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
      setPage((prev) => (prev ? { ...prev, isCustomized: true, elements: [...prev.elements, created] } : prev));
      setSelectedElementId(created.id);
    } catch (err: any) {
      alert(err?.message || 'Lỗi thêm phần tử mới');
    }
  };

  // Duplicate selected element
  const handleDuplicateSelected = async () => {
    if (isViewer || !selectedElementId) return;
    try {
      const dup = await duplicateAdminElement(selectedElementId, 0.03, 0.03);
      setPage((prev) => (prev ? { ...prev, isCustomized: true, elements: [...prev.elements, dup] } : prev));
      setSelectedElementId(dup.id);
      setToast('Đã nhân bản phần tử!');
      setTimeout(() => setToast(null), 2500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi nhân bản phần tử');
    }
  };

  // Delete element
  const handleDeleteElement = async (elementId: string) => {
    if (isViewer) return;
    if (!confirm('Bạn có chắc chắn muốn xóa phần tử này khỏi trang?')) return;
    try {
      await deleteAdminElement(elementId);
      setPage((prev) => {
        if (!prev) return prev;
        const remaining = prev.elements.filter((el) => el.id !== elementId);
        return { ...prev, isCustomized: true, elements: remaining };
      });
      setSelectedElementId(null);
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa phần tử');
    }
  };

  // Save all modified elements to database via batchUpdateElements API
  const handleSave = async () => {
    if (isViewer || !page) return;
    setSaving(true);
    setToast(null);
    try {
      // 1. Save page level metadata if customized
      await updateAdminPage(
        pageId,
        {
          isCustomized: page.isCustomized ?? true,
          layoutTemplateId: page.layoutTemplateId || undefined,
          sourceTemplateId: page.sourceTemplateId || undefined,
          layoutMode: page.layoutMode || undefined,
        },
        true
      );

      // 2. Batch update all elements
      const elementsToSave = (page.elements || []).map((el) => ({
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

      await batchUpdateElements(pageId, elementsToSave);
      setToast('Đã lưu toàn bộ thay đổi lên cơ sở dữ liệu!');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu phần tử');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !page) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
        <span>Đang nạp Visual Editor...</span>
      </div>
    );
  }

  // Sort elements for Layers panel
  const sortedLayers = [...(page.elements || [])].sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0C0609] select-none text-parchment-100 font-sans">
      {/* Top Application Bar */}
      <div className="h-14 bg-[#160D12] border-b border-rosewood-900/50 px-5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/books/${bookId}/pages`}
            className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 border border-rosewood-900/40 transition-colors"
            title="Quay lại danh sách trang"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-sm tracking-wide text-parchment-100">
              Trang {page.pageNumber}: {page.title || '(Không tiêu đề)'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rosewood-950 text-champagne-300 border border-rosewood-800/40">
              Order #{page.order} • {page.side?.toUpperCase()}
            </span>

            {/* Layout Status Badge */}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                page.isCustomized
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {page.isCustomized ? 'Đã chỉnh tự do (Customized)' : `Template: ${page.layoutTemplateId || page.layout}`}
            </span>
          </div>
        </div>

        {/* Center Quick Action Bar (Add Elements + Layout Preset Picker) */}
        {!isViewer && (
          <div className="flex items-center gap-2">
            {/* Prompt 16: Layout Picker Button */}
            <button
              type="button"
              onClick={() => setShowLayoutPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rosewood-900/80 to-[#2A1220] hover:border-champagne-400 text-champagne-300 text-xs font-medium border border-rosewood-700/60 shadow-md transition-all active:scale-95"
              title="Mở kho Layout Templates để đổi bố cục trang"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-champagne-400" />
              <span>Đổi Bố Cục</span>
            </button>

            {/* Prompt 17: Save Current Arrangement as Custom Layout Template */}
            <button
              type="button"
              onClick={() => setShowSaveAsLayout(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22101A] hover:bg-[#2D1623] hover:border-rosewood-600 text-parchment-200 text-xs font-medium border border-rosewood-800/60 shadow-md transition-all active:scale-95"
              title="Lưu bố cục hiện tại thành template tùy biến để tái sử dụng"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Lưu Template</span>
            </button>

            {/* Add Elements Group */}
            <div className="flex items-center gap-1 bg-[#20111A] p-1 rounded-xl border border-rosewood-900/40 text-xs">
              <button
                type="button"
                onClick={() => handleAddElement('TEXT')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition-colors"
                title="Thêm khối chữ Text"
              >
                <Type className="w-3.5 h-3.5 text-champagne-300" />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('IMAGE')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition-colors"
                title="Thêm ảnh Polaroid"
              >
                <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                <span>Ảnh</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('VIDEO')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition-colors"
                title="Thêm video clip"
              >
                <Video className="w-3.5 h-3.5 text-amber-400" />
                <span>Video</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('SHAPE')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rosewood-800/60 text-parchment-200 transition-colors"
                title="Thêm đường kẻ Shape"
              >
                <Square className="w-3.5 h-3.5 text-rosewood-400" />
                <span>Shape</span>
              </button>
            </div>
          </div>
        )}

        {/* Right Action: Save Button */}
        <div className="flex items-center gap-3">
          {toast && (
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{toast}</span>
            </span>
          )}

          {!isViewer && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-lg shadow-rosewood-950/50 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Đang lưu...' : 'Lưu trang'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Visual Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Pages / Layers (width: 260px) */}
        <aside className="w-64 bg-[#140B10] border-r border-rosewood-900/40 flex flex-col justify-between shrink-0 overflow-hidden">
          {/* Section 1: Layers Stacking Order */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-[#1C0F16] border-b border-rosewood-900/40 flex items-center justify-between text-xs font-semibold text-parchment-200">
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-champagne-300">
                <Layers className="w-3.5 h-3.5 text-rosewood-400" />
                <span>Layers (Lớp phần tử)</span>
              </span>
              <span className="text-[10px] font-mono text-stone-500">{page.elements?.length || 0}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sortedLayers.map((el) => {
                const isSelected = el.id === selectedElementId;
                const isLocked = Boolean(el.locked);
                const isVisible = el.visible !== false;

                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rosewood-600 text-white font-semibold shadow-md'
                        : 'bg-[#1E1119] text-stone-400 hover:text-white hover:bg-[#2A1622]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 pr-2">
                      <span className="font-mono text-[10px] opacity-70 w-5">z{el.zIndex}</span>
                      <span className="truncate">
                        {(el.data as any).text || (el.data as any).caption || el.slot || el.type}
                      </span>
                    </div>

                    {!isViewer && (
                      <div className="flex items-center gap-1 text-stone-400">
                        {/* Lock toggle button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSelectedElement((target) => (target.id === el.id ? { ...target, locked: !isLocked } : target));
                          }}
                          className={`p-1 rounded hover:text-white ${isLocked ? 'text-amber-400' : 'opacity-60'}`}
                          title={isLocked ? 'Mở khóa' : 'Khóa layer'}
                        >
                          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>

                        {/* Visibility toggle button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSelectedElement((target) => (target.id === el.id ? { ...target, visible: !isVisible } : target));
                          }}
                          className={`p-1 rounded hover:text-white ${!isVisible ? 'text-stone-600' : 'opacity-60'}`}
                          title={isVisible ? 'Ẩn layer' : 'Hiện layer'}
                        >
                          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {sortedLayers.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-500">Chưa có phần tử nào trên trang này.</div>
              )}
            </div>
          </div>

          {/* Section 2: Quick Pages Navigation Switcher */}
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
                  href={`/admin/books/${bookId}/pages/${p.id}`}
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
                onClick={() => setCanvasScale((s) => Math.min(1.0, parseFloat((s + 0.05).toFixed(2))))}
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
              book={book}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElementTransform={handleUpdateElementTransform}
              scale={canvasScale}
            />
          </div>
        </main>

        {/* RIGHT COLUMN: Properties Panel (width: 320px) */}
        <aside className="w-80 bg-[#140B10] border-l border-rosewood-900/40 flex flex-col justify-between shrink-0 overflow-y-auto">
          {selectedElement ? (
            <div className="p-4 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-rosewood-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rosewood-900/60 text-champagne-300 border border-rosewood-700/50">
                    {selectedElement.type}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">{selectedElement.id.slice(0, 10)}</span>
                </div>

                {!isViewer && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDuplicateSelected}
                      className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 transition-colors"
                      title="Nhân bản phần tử"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors"
                      title="Xóa phần tử"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Transform Property Section: x, y, width, height, rotation, opacity, zIndex */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-champagne-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-rosewood-400" />
                  <span>Transform (Tọa độ Normalized)</span>
                </h4>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">X (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isViewer || Boolean(selectedElement.locked)}
                      value={selectedElement.transform.x}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, x: parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Y (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isViewer || Boolean(selectedElement.locked)}
                      value={selectedElement.transform.y}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, y: parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Width (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isViewer || Boolean(selectedElement.locked)}
                      value={selectedElement.transform.width}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, width: parseFloat(e.target.value) || 0.1 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Height (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isViewer || Boolean(selectedElement.locked)}
                      value={selectedElement.transform.height}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, height: parseFloat(e.target.value) || 0.1 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Rotation (°)</label>
                    <input
                      type="number"
                      step="1"
                      disabled={isViewer || Boolean(selectedElement.locked)}
                      value={selectedElement.transform.rotation || 0}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, rotation: parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Opacity (0 - 1)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      disabled={isViewer}
                      value={selectedElement.opacity ?? 1}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          opacity: parseFloat(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">zIndex</label>
                    <input
                      type="number"
                      disabled={isViewer}
                      value={selectedElement.zIndex ?? 1}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          zIndex: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Khóa (Locked)</label>
                    <div className="pt-2">
                      <input
                        type="checkbox"
                        disabled={isViewer}
                        checked={Boolean(selectedElement.locked)}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            locked: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-rosewood-600 bg-[#20111A] border-rosewood-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Properties based on element type */}
              <div className="space-y-3 pt-3 border-t border-rosewood-900/40">
                <h4 className="text-xs font-semibold text-champagne-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-rosewood-400" />
                  <span>Dữ Liệu Phần Tử ({selectedElement.type})</span>
                </h4>

                {/* TEXT Element */}
                {selectedElement.type === 'TEXT' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Văn bản (hỗ trợ biến {'{{...}}'})</label>
                      <textarea
                        rows={3}
                        disabled={isViewer}
                        value={(selectedElement.data as any).text || ''}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            data: { ...el.data, text: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-[#20111A] border border-rosewood-900/60 rounded-xl text-white font-serif disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Cỡ chữ fontSize</label>
                        <input
                          type="number"
                          disabled={isViewer}
                          value={selectedElement.style?.fontSize || 24}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              style: { ...el.style, fontSize: parseInt(e.target.value, 10) || 24 },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Màu chữ</label>
                        <input
                          type="text"
                          disabled={isViewer}
                          value={selectedElement.style?.color || '#292522'}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              style: { ...el.style, color: e.target.value },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* IMAGE Element */}
                {selectedElement.type === 'IMAGE' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Ảnh URL</label>
                      <input
                        type="text"
                        disabled={isViewer}
                        value={(selectedElement.data as any).src || ''}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            data: { ...el.data, src: e.target.value },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* VIDEO Element */}
                {selectedElement.type === 'VIDEO' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Video MP4 URL</label>
                      <input
                        type="text"
                        disabled={isViewer}
                        value={(selectedElement.data as any).src || ''}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            data: { ...el.data, src: e.target.value },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-[#20111A] border border-rosewood-900/60 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-stone-500">
              Nhấp chọn một phần tử trên Canvas hoặc từ bảng Layers để chỉnh sửa thông số.
            </div>
          )}
        </aside>
      </div>

      {/* Prompt 16: Layout Preset Picker Modal */}
      <LayoutPresetPicker
        currentTemplateId={page.layoutTemplateId || page.layout}
        hasCustomizations={Boolean(page.isCustomized)}
        isOpen={showLayoutPicker}
        onClose={() => setShowLayoutPicker(false)}
        onSelectLayout={handleApplyLayoutTemplate}
      />

      {/* Prompt 17: Save Current Arrangement as Custom Layout Template Modal */}
      <SaveAsLayoutModal
        page={page}
        isOpen={showSaveAsLayout}
        onClose={() => setShowSaveAsLayout(false)}
        onSaved={(newTpl) => {
          setToast(`Đã lưu bố cục "${newTpl.name}" thành công!`);
          setTimeout(() => setToast(null), 3000);
        }}
      />
    </div>
  );
}
