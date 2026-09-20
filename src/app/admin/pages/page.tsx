'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAdminBooks,
  getAdminPages,
  createAdminPage,
  deleteAdminPage,
  duplicateAdminPage,
  reorderAdminPages,
  getAdminLayoutTemplates,
} from '@/services/adminApi';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  FileText,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Edit,
  RefreshCw,
  GripVertical,
  ShieldAlert,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export default function AdminPagesOverviewPage() {
  const { isAdmin, isEditor, isViewer } = useAdminAuth();

  const [bookId, setBookId] = useState<string>('');
  const [book, setBook] = useState<any | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [layoutTemplates, setLayoutTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Drag & drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [quote, setQuote] = useState('');
  const [layoutTemplateId, setLayoutTemplateId] = useState('single-hero');
  const [creating, setCreating] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [booksData, layoutsData] = await Promise.all([
        getAdminBooks(),
        getAdminLayoutTemplates(),
      ]);

      setLayoutTemplates(layoutsData);

      if (booksData && booksData.length > 0) {
        const active = booksData[0];
        setBookId(active.id);
        setBook(active);

        const pagesData = await getAdminPages(active.id);
        setPages(pagesData);

        const maxPageNum = pagesData.reduce(
          (max: number, p: any) => Math.max(max, p.pageNumber ?? 0),
          0
        );
        setPageNumber(maxPageNum + 1);
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải danh sách trang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const refreshPages = async (targetBookId: string = bookId) => {
    if (!targetBookId) return;
    try {
      const pagesData = await getAdminPages(targetBookId);
      setPages(pagesData);
      const maxPageNum = pagesData.reduce(
        (max: number, p: any) => Math.max(max, p.pageNumber ?? 0),
        0
      );
      setPageNumber(maxPageNum + 1);
    } catch (err: any) {
      setError(err?.message || 'Lỗi làm mới danh sách trang');
    }
  };

  // Reorder save helper
  const handleApplyReorder = async (reorderedPages: any[]) => {
    setPages(reorderedPages);
    try {
      await reorderAdminPages(
        bookId,
        reorderedPages.map((p) => ({ id: p.id }))
      );
      setToast('Đã lưu thứ tự trang thành công!');
      setTimeout(() => setToast(null), 2500);
      await refreshPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi sắp xếp lại thứ tự trang');
      await refreshPages();
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isViewer) return;
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isViewer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    if (isViewer) return;
    e.preventDefault();
    setDragOverIndex(null);

    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = parseInt(sourceIndexStr, 10);

    if (isNaN(sourceIndex) || sourceIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const updated = [...pages];
    const [movedItem] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    await handleApplyReorder(updated);
  };

  // Up / Down Button Handlers
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (isViewer) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    await handleApplyReorder(updated);
  };

  // Create Page (EDITOR / ADMIN)
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    setCreating(true);
    try {
      await createAdminPage({
        bookId,
        pageNumber,
        title: title || undefined,
        chapter: chapter || undefined,
        quote: quote || undefined,
        layoutTemplateId,
        background: {
          type: 'color',
          color: '#F9F5EC',
        },
      });
      setShowCreateModal(false);
      setTitle('');
      setChapter('');
      setQuote('');
      await refreshPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi thêm trang mới');
    } finally {
      setCreating(false);
    }
  };

  // Duplicate Page (EDITOR / ADMIN)
  const handleDuplicatePage = async (pageId: string) => {
    if (isViewer) return;
    try {
      await duplicateAdminPage(pageId, true);
      setToast('Đã nhân bản trang thành công!');
      setTimeout(() => setToast(null), 2500);
      await refreshPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi nhân bản trang');
    }
  };

  // Delete Page (ADMIN ONLY!)
  const handleDeletePage = async (pageId: string, pageNum: number) => {
    if (!isAdmin) {
      alert('Chỉ người dùng có quyền ADMIN mới được phép xóa trang.');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa trang số ${pageNum}? Thao tác này không thể hoàn tác!`)) {
      return;
    }
    try {
      await deleteAdminPage(pageId);
      setToast(`Đã xóa trang ${pageNum} thành công.`);
      setTimeout(() => setToast(null), 2500);
      await refreshPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa trang');
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
        <span>Đang nạp danh sách trang sách...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rosewood-900/40 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-rosewood-400" />
            <span>Quản Lý Các Trang (Pages)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Sách: <strong className="text-parchment-200">{book?.title || 'Chúng Mình'}</strong> • Tổng cộng {pages.length} trang
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshPages()}
            className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Create Page Button: disabled for VIEWER */}
          {!isViewer && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-medium shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm trang mới</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs text-center animate-fade-in flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Pages Table with Drag & Drop */}
      <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-3.5 bg-[#20121A] border-b border-rosewood-900/40 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2 font-mono">
            <GripVertical className="w-4 h-4 text-stone-500" />
            <span>Kéo thả dòng để sắp xếp thứ tự vật lý (Drag & Drop)</span>
          </div>
          <span className="font-mono text-[11px] text-rosewood-300/80">
            order 0..N-1 • side tự động
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-[#24151E] border-b border-rosewood-900/50 text-[11px] font-mono uppercase tracking-wider text-rosewood-300/80">
              <tr>
                <th className="py-3.5 px-3 w-12 text-center">#</th>
                <th className="py-3.5 px-3 w-16 text-center">Order</th>
                <th className="py-3.5 px-4 w-28">Số trang</th>
                <th className="py-3.5 px-4 w-20">Mặt lật</th>
                <th className="py-3.5 px-4">Chương & Tiêu đề</th>
                <th className="py-3.5 px-4">Layout Template</th>
                <th className="py-3.5 px-4 w-24 text-center">Phần tử</th>
                <th className="py-3.5 px-4 w-48 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rosewood-900/30 font-sans">
              {pages.map((page, index) => {
                const elementsCount = page.elements?.length || 0;
                const isFirst = index === 0;
                const isLast = index === pages.length - 1;
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <tr
                    key={page.id}
                    draggable={!isViewer}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`transition-all ${
                      isDragging ? 'opacity-30 bg-rosewood-950/80' : ''
                    } ${isDragOver ? 'border-t-2 border-champagne-400 bg-rosewood-900/30' : ''} hover:bg-[#24161F]/70`}
                  >
                    {/* Drag Grip Handle */}
                    <td className="py-3 px-3 text-center cursor-grab active:cursor-grabbing text-stone-600 hover:text-stone-300">
                      {!isViewer && <GripVertical className="w-4 h-4 mx-auto" />}
                    </td>

                    {/* Order (Physical Position) */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-parchment-200">
                      #{page.order ?? index}
                    </td>

                    {/* Display Page Number */}
                    <td className="py-3 px-4 font-mono text-champagne-300 font-semibold">
                      {page.pageNumber === 0 ? 'Lời ngỏ (0)' : `Trang ${page.pageNumber}`}
                    </td>

                    {/* Derived Side */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
                          page.side === 'LEFT' || page.side === 'left'
                            ? 'bg-purple-950/70 text-purple-300 border border-purple-800/50'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-800/50'
                        }`}
                      >
                        {page.side}
                      </span>
                    </td>

                    {/* Chapter & Title */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-parchment-100">
                        {page.title || <span className="text-stone-600 italic">(Không có tiêu đề)</span>}
                      </div>
                      {page.chapter && (
                        <div className="text-[11px] text-rosewood-400/80 font-serif">
                          {page.chapter}
                        </div>
                      )}
                    </td>

                    {/* Layout */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#2A1622] text-stone-300 border border-rosewood-900/50 font-mono text-[11px]">
                        {page.layoutTemplateId || page.layout || 'auto'}
                      </span>
                    </td>

                    {/* Elements Count */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-[#201319] text-stone-300">
                        {elementsCount}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Move Up / Down Accessible Buttons */}
                        {!isViewer && (
                          <>
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMove(index, 'up')}
                              className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 disabled:opacity-25 transition-colors"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMove(index, 'down')}
                              className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 disabled:opacity-25 transition-colors"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Edit Page & Elements */}
                        <Link
                          href={`/admin/books/${bookId}/pages/${page.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rosewood-900/40 hover:bg-rosewood-900/80 text-champagne-300 text-xs font-medium border border-rosewood-800/40 transition-colors"
                          title="Chỉnh sửa chi tiết & Live Preview"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </Link>

                        {/* Duplicate (EDITOR / ADMIN) */}
                        {!isViewer && (
                          <button
                            type="button"
                            onClick={() => handleDuplicatePage(page.id)}
                            className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 transition-colors"
                            title="Nhân bản trang (chèn ngay phía sau)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Page: ADMIN ONLY (Requirement #10) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeletePage(page.id, page.pageNumber)}
                            className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/60 text-red-400 transition-colors border border-red-900/30"
                            title="Xóa trang (chỉ quyền ADMIN)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Page Modal */}
      {showCreateModal && !isViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#1B1017] border border-rosewood-800/60 rounded-2xl p-6 shadow-2xl text-parchment-100">
            <h3 className="font-serif text-lg font-bold mb-4 text-champagne-300 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rosewood-400" />
              <span>Thêm trang mới vào sách</span>
            </h3>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Số trang hiển thị (pageNumber metadata)
                </label>
                <input
                  type="number"
                  required
                  value={pageNumber}
                  onChange={(e) => setPageNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Tiêu đề chương (chapter)</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="Ví dụ: Chapter XII"
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Tiêu đề trang (title)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Kỷ Niệm Mới"
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Trích dẫn (quote)</label>
                <input
                  type="text"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="Ví dụ: Bên nhau qua năm tháng..."
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Mẫu bố cục (Layout Template)</label>
                <select
                  value={layoutTemplateId}
                  onChange={(e) => setLayoutTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                >
                  {layoutTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.id})
                    </option>
                  ))}
                  {layoutTemplates.length === 0 && (
                    <>
                      <option value="single-hero">Single Hero (1 ảnh lớn)</option>
                      <option value="dual-columns">Dual Columns (2 ảnh dọc)</option>
                      <option value="dual-stacked">Dual Stacked (2 ảnh ngang/video)</option>
                      <option value="asymmetric-featured">Asymmetric Featured (1 lớn + 2 nhỏ)</option>
                      <option value="scrapbook-trio">Scrapbook Trio (3 ảnh so le)</option>
                      <option value="quad-gallery">Quad Gallery (4 ảnh polaroid 2x2)</option>
                      <option value="diagonal-duo">Diagonal Duo (2 ảnh nghiêng)</option>
                      <option value="auto">Auto Adapt</option>
                      <option value="custom">Custom Canvas</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rosewood-900/40">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? 'Đang thêm...' : 'Thêm trang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
