'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminPage,
  getAdminBook,
  batchUpdateElements,
  createAdminElement,
  deleteAdminElement,
} from '@/services/adminApi';
import { Page, PageElement, PageElementType, Book } from '@/types/book';
import LivePagePreview from '@/components/admin/LivePagePreview';
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
  Check,
} from 'lucide-react';

export default function PageDetailAndElementEditor() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const pageId = params.pageId as string;

  const [book, setBook] = useState<Partial<Book> | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [bookData, pageData] = await Promise.all([
          getAdminBook(bookId),
          getAdminPage(pageId),
        ]);
        setBook(bookData);
        setPage(pageData);
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

  if (loading || !page) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
        <span>Đang nạp dữ liệu trang và phần tử...</span>
      </div>
    );
  }

  const selectedElement = (page.elements || []).find((el) => el.id === selectedElementId);

  // Update a field of the currently selected element
  const updateSelectedElement = (updater: (el: any) => any) => {
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
        elements: updatedElements,
      };
    });
  };

  // Add new element to page
  const handleAddElement = async (type: PageElementType) => {
    const maxZ = (page.elements || []).reduce((max, el) => Math.max(max, el.zIndex ?? 1), 0);
    const newZ = maxZ + 1;

    let defaultData: any = {};
    let defaultStyle: any = {};

    switch (type) {
      case 'TEXT':
        defaultData = { text: 'Nội dung kỷ niệm mới', variant: 'body' };
        defaultStyle = {
          fontFamily: '"Cormorant Garamond", Georgia, serif',
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
      setPage((prev) => (prev ? { ...prev, elements: [...prev.elements, created] } : prev));
      setSelectedElementId(created.id);
    } catch (err: any) {
      alert(err?.message || 'Lỗi thêm phần tử mới');
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
        return { ...prev, elements: remaining };
      });
      setSelectedElementId(null);
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa phần tử');
    }
  };

  // Save all elements
  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
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
      setToast('Đã lưu tất cả phần tử và cập nhật trang thành công!');
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu phần tử');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-rosewood-900/40 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/books/${bookId}/pages`}
            className="p-2 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-stone-300 border border-rosewood-900/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-xl font-bold text-parchment-100 flex items-center gap-2">
              <span>Chỉnh Sửa Trang {page.pageNumber}:</span>
              <span className="text-champagne-300">{page.title || '(Không tiêu đề)'}</span>
            </h1>
            <p className="text-xs text-stone-400">
              {page.chapter || 'Không chương'} • Bố cục: {page.layout} • Mặt: {page.side?.toUpperCase()}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-lg shadow-rosewood-950/50 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : 'Lưu toàn bộ thay đổi'}</span>
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs text-center animate-fade-in">
          {toast}
        </div>
      )}

      {/* Editor Grid: 2 Columns (Left: Elements & Form, Right: Live Canvas Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Elements Panel & Property Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Elements Selector Bar */}
          <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-parchment-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-rosewood-400" />
                <span>Danh sách phần tử ({page.elements?.length || 0})</span>
              </span>

              {/* Add Element Quick Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAddElement('TEXT')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rosewood-900/40 hover:bg-rosewood-800/60 text-parchment-200 text-xs border border-rosewood-700/40 transition-colors"
                  title="Thêm khối chữ"
                >
                  <Type className="w-3 h-3 text-champagne-400" />
                  <span>Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddElement('IMAGE')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rosewood-900/40 hover:bg-rosewood-800/60 text-parchment-200 text-xs border border-rosewood-700/40 transition-colors"
                  title="Thêm ảnh"
                >
                  <ImageIcon className="w-3 h-3 text-pink-400" />
                  <span>Ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddElement('VIDEO')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rosewood-900/40 hover:bg-rosewood-800/60 text-parchment-200 text-xs border border-rosewood-700/40 transition-colors"
                  title="Thêm video"
                >
                  <Video className="w-3 h-3 text-amber-400" />
                  <span>Video</span>
                </button>
              </div>
            </div>

            {/* Elements Chips List */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {(page.elements || []).map((el, idx) => {
                const isSelected = el.id === selectedElementId;
                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedElementId(el.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-rosewood-600 text-white font-semibold shadow-md'
                        : 'bg-[#25151F] text-stone-400 hover:text-white hover:bg-[#331C2A]'
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-75">z{el.zIndex ?? idx}</span>
                    <span>
                      {el.slot || el.type}: {(el.data as any).text || (el.data as any).caption || el.id.slice(0, 8)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Element Property Form */}
          {selectedElement ? (
            <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-5 shadow-xl space-y-5">
              {/* Form Header */}
              <div className="flex items-center justify-between border-b border-rosewood-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-rosewood-900/60 text-champagne-300 border border-rosewood-700/50">
                    {selectedElement.type}
                  </span>
                  <span className="text-xs font-mono text-stone-400">{selectedElement.id}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-900/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa phần tử</span>
                </button>
              </div>

              {/* 1. Transform Section: x, y, width, height, rotation, opacity, zIndex */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-champagne-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Tọa độ & Kích thước (Transform)</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">X (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedElement.transform.x}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, x: parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Y (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedElement.transform.y}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, y: parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Rộng width (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedElement.transform.width}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, width: parseFloat(e.target.value) || 0.1 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Cao height (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedElement.transform.height}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, height: parseFloat(e.target.value) || 0.1 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Góc xoay rotation (°)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.transform.rotation || 0}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          transform: { ...el.transform, rotation: parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Độ mờ opacity (0 - 1)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={selectedElement.opacity ?? 1}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          opacity: parseFloat(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Thứ tự layer zIndex</label>
                    <input
                      type="number"
                      value={selectedElement.zIndex ?? 1}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          zIndex: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Hiển thị (visible)</label>
                    <div className="pt-2">
                      <input
                        type="checkbox"
                        checked={selectedElement.visible !== false}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            visible: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-rosewood-600 bg-[#25151F] border-rosewood-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Content Data Form */}
              <div className="space-y-3 pt-3 border-t border-rosewood-900/40">
                <h4 className="text-xs font-semibold text-champagne-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  <span>Nội Dung & Dữ Liệu ({selectedElement.type})</span>
                </h4>

                {/* TEXT Element inputs */}
                {selectedElement.type === 'TEXT' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">
                        Đoạn văn bản (hỗ trợ biến {'{{...}}'})
                      </label>
                      <textarea
                        rows={3}
                        value={(selectedElement.data as any).text || ''}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            data: { ...el.data, text: e.target.value },
                          }))
                        }
                        placeholder="Ví dụ: {{couple.he}} & {{couple.she}} đã bên nhau {{daysTogether}} ngày..."
                        className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-serif"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Kiểu chữ variant</label>
                        <select
                          value={(selectedElement.data as any).variant || 'body'}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              data: { ...el.data, variant: e.target.value as any },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
                        >
                          <option value="body">Body (Thân bài)</option>
                          <option value="title">Title (Tiêu đề lớn)</option>
                          <option value="chapter-label">Chapter (Nhãn chương)</option>
                          <option value="quote">Quote (Trích dẫn nghiêng)</option>
                          <option value="handwriting">Handwriting (Viết tay)</option>
                          <option value="caption">Caption (Chú thích ảnh)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Cỡ chữ fontSize (px)</label>
                        <input
                          type="number"
                          value={selectedElement.style?.fontSize || 24}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              style: { ...el.style, fontSize: parseInt(e.target.value, 10) || 24 },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Màu chữ (color)</label>
                        <input
                          type="text"
                          value={selectedElement.style?.color || '#292522'}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              style: { ...el.style, color: e.target.value },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Căn lề textAlign</label>
                        <select
                          value={selectedElement.style?.textAlign || 'left'}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              style: { ...el.style, textAlign: e.target.value as any },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
                        >
                          <option value="left">Left (Trái)</option>
                          <option value="center">Center (Giữa)</option>
                          <option value="right">Right (Phải)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* IMAGE Element inputs */}
                {selectedElement.type === 'IMAGE' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Đường dẫn ảnh (src URL)</label>
                      <input
                        type="text"
                        value={(selectedElement.data as any).src || ''}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            data: { ...el.data, src: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">objectFit</label>
                        <select
                          value={(selectedElement.data as any).objectFit || 'cover'}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              data: { ...el.data, objectFit: e.target.value as any },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
                        >
                          <option value="cover">cover (Cắt vừa khít)</option>
                          <option value="contain">contain (Vừa vặn không crop)</option>
                          <option value="fill">fill (Kéo dãn toàn bộ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Khung ảnh Polaroid</label>
                        <select
                          value={selectedElement.style?.polaroidFrame !== false ? 'true' : 'false'}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              style: { ...el.style, polaroidFrame: e.target.value === 'true' },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
                        >
                          <option value="true">Bật khung ảnh trắng</option>
                          <option value="false">Tắt khung</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-stone-400 mb-1">Băng dính Washi Tape</label>
                        <select
                          value={selectedElement.style?.washiTape !== false ? 'true' : 'false'}
                          onChange={(e) =>
                            updateSelectedElement((el) => ({
                              ...el,
                              style: { ...el.style, washiTape: e.target.value === 'true' },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
                        >
                          <option value="true">Bật băng dính</option>
                          <option value="false">Tắt băng dính</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIDEO Element inputs */}
                {selectedElement.type === 'VIDEO' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Đường dẫn file Video (.mp4)</label>
                      <input
                        type="text"
                        value={(selectedElement.data as any).src || ''}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            data: { ...el.data, src: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Ảnh bìa video (thumbnailUrl / poster)</label>
                      <input
                        type="text"
                        value={(selectedElement.data as any).thumbnailUrl || ''}
                        onChange={(e) =>
                          updateSelectedElement((el) => ({
                            ...el,
                            data: { ...el.data, thumbnailUrl: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Interaction Section: action, target, activeArea */}
              <div className="space-y-3 pt-3 border-t border-rosewood-900/40">
                <h4 className="text-xs font-semibold text-champagne-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>Tương Tác & Click Zone (Interaction)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Hành động action</label>
                    <select
                      value={selectedElement.interaction?.action || 'none'}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          interaction: {
                            ...(el.interaction || { enabled: true }),
                            action: e.target.value as any,
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
                    >
                      <option value="none">none (Không tương tác)</option>
                      <option value="open-video">open-video (Mở Video Overlay)</option>
                      <option value="zoom">zoom (Phóng to ảnh)</option>
                      <option value="navigate-page">navigate-page (Chuyển trang)</option>
                      <option value="open-link">open-link (Mở liên kết web)</option>
                      <option value="play-audio">play-audio (Phát âm thanh)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Mục tiêu target (URL / số trang)</label>
                    <input
                      type="text"
                      value={selectedElement.interaction?.target?.toString() || ''}
                      onChange={(e) =>
                        updateSelectedElement((el) => ({
                          ...el,
                          interaction: {
                            ...(el.interaction || { enabled: true, action: 'none' }),
                            target: e.target.value,
                          },
                        }))
                      }
                      placeholder="URL video hoặc số trang cần lật"
                      className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#180E14] border border-rosewood-900/40 rounded-2xl text-stone-500 text-xs">
              Chọn một phần tử từ danh sách phía trên để chỉnh sửa thông số.
            </div>
          )}
        </div>

        {/* Right Column: Live Page Preview using PageTextureGenerator (5 cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <LivePagePreview page={page} book={book} />
        </div>
      </div>
    </div>
  );
}
