'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAdminPages,
  createAdminPage,
  deleteAdminPage,
  duplicateAdminPage,
  reorderAdminPages,
  getAdminLayoutTemplates,
} from '@/services/adminApi';
import { useJournal } from '@/context/JournalContext';
import {
  FileText,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Edit,
  ArrowLeft,
  Layers,
  RefreshCw,
  Eye,
  GripVertical,
  CheckCircle2,
} from 'lucide-react';

export default function AdminPagesListPage() {
  const { journal, journalId } = useJournal();

  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [layoutTemplates, setLayoutTemplates] = useState<any[]>([]);

  // Drag & Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Create page modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [quote, setQuote] = useState('');
  const [layoutTemplateId, setLayoutTemplateId] = useState('single-hero');
  const [creating, setCreating] = useState(false);

  const fetchPages = async () => {
    if (!journalId) return;
    setLoading(true);
    setError(null);
    try {
      const [pagesData, layoutsData] = await Promise.all([
        getAdminPages(journalId),
        getAdminLayoutTemplates(),
      ]);

      setPages(pagesData);
      setLayoutTemplates(layoutsData);

      const maxPageNum = pagesData.reduce(
        (max: number, p: any) => Math.max(max, p.pageNumber ?? 0),
        0
      );
      setPageNumber(maxPageNum + 1);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách trang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [journalId]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalId || creating) return;

    setCreating(true);
    try {
      await createAdminPage({
        bookId: journalId,
        pageNumber: Number(pageNumber),
        title: title || undefined,
        chapter: chapter || undefined,
        quote: quote || undefined,
        layoutTemplateId,
        layoutMode: 'PRESET',
        background: { type: 'color', color: '#F9F5EC' },
      });

      setShowCreateModal(false);
      setTitle('');
      setChapter('');
      setQuote('');
      setToast('Đã thêm trang mới thành công!');
      setTimeout(() => setToast(null), 3000);
      await fetchPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi tạo trang mới');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    try {
      await duplicateAdminPage(pageId, true);
      setToast('Đã nhân bản trang thành công!');
      setTimeout(() => setToast(null), 3000);
      await fetchPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi nhân bản trang');
    }
  };

  const handleDeletePage = async (pageId: string, pageNum: number) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa trang số ${pageNum}? Toàn bộ phần tử trên trang sẽ bị xóa.`)) {
      return;
    }
    try {
      await deleteAdminPage(pageId);
      setToast(`Đã xóa trang ${pageNum}`);
      setTimeout(() => setToast(null), 3000);
      await fetchPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa trang');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length || !journalId) return;

    const copy = [...pages];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setPages(copy);

    try {
      await reorderAdminPages(
        journalId,
        copy.map((p) => ({ id: p.id }))
      );
      await fetchPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi sắp xếp trang');
      await fetchPages();
    }
  };

  // Drag & drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index || !journalId) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const copy = [...pages];
    const [dragged] = copy.splice(draggedIndex, 1);
    copy.splice(index, 0, dragged);

    setPages(copy);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      await reorderAdminPages(
        journalId,
        copy.map((p) => ({ id: p.id }))
      );
      await fetchPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi cập nhật thứ tự');
      await fetchPages();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rosewood-900/40 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-stone-300 border border-rosewood-900/40 transition-colors"
            title="Quay lại Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-rosewood-400" />
              <span>Quản Lý Các Trang Nhật Ký</span>
            </h1>
            <p className="text-xs text-stone-400">
              Tổng cộng {pages.length} trang • Tự động xếp thứ tự vật lý 0..N-1 (Trái/Phải)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/preview"
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-xs font-medium transition shadow-sm"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Preview Draft</span>
          </Link>

          <button
            onClick={fetchPages}
            className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-medium shadow-lg shadow-rosewood-950/50 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm trang mới</span>
          </button>
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

      {/* Pages Table */}
      <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-3.5 bg-[#20121A] border-b border-rosewood-900/40 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2 font-mono">
            <GripVertical className="w-4 h-4 text-stone-500" />
            <span>Kéo thả dòng để sắp xếp thứ tự lật sách 3D</span>
          </div>
          <span className="font-mono text-[11px] text-rosewood-300/80">
            Order 0..N-1 • Side tự động (Chẵn = Trái, Lẻ = Phải)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-[#24151E] border-b border-rosewood-900/50 text-[11px] font-mono uppercase tracking-wider text-rosewood-300/80">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-20 text-center">Số trang</th>
                <th className="py-3 px-4 w-20 text-center">Mặt lật</th>
                <th className="py-3 px-4">Chương &amp; Tiêu đề</th>
                <th className="py-3 px-4">Layout Template</th>
                <th className="py-3 px-4 w-24 text-center">Phần tử</th>
                <th className="py-3 px-4 w-44 text-right">Thao tác</th>
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
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    className={`hover:bg-[#24161F]/60 transition-colors ${
                      isDragging ? 'opacity-40' : ''
                    } ${isDragOver ? 'border-t-2 border-champagne-400' : ''}`}
                  >
                    {/* Handle & Physical Order */}
                    <td className="py-3 px-4 text-center font-mono text-stone-400 font-semibold cursor-grab">
                      <div className="flex items-center justify-center gap-1">
                        <GripVertical className="w-3.5 h-3.5 text-stone-600" />
                        <span>{page.order ?? index}</span>
                      </div>
                    </td>

                    {/* Display Page Number */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-champagne-300">
                      {page.pageNumber === 0 ? 'Lời ngỏ' : page.pageNumber}
                    </td>

                    {/* Side */}
                    <td className="py-3 px-4 text-center font-mono text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                          page.side === 'LEFT' || page.side === 'left'
                            ? 'bg-rosewood-950 text-pink-300 border border-pink-900/50'
                            : 'bg-stone-900 text-stone-300 border border-stone-800'
                        }`}
                      >
                        {page.side}
                      </span>
                    </td>

                    {/* Title & Chapter */}
                    <td className="py-3 px-4">
                      <div>
                        {page.chapter && (
                          <span className="font-mono text-[10px] text-rosewood-400 block uppercase tracking-wider">
                            {page.chapter}
                          </span>
                        )}
                        <span className="font-serif font-bold text-sm text-parchment-100">
                          {page.title || '(Không có tiêu đề)'}
                        </span>
                        {page.quote && (
                          <p className="text-[11px] text-stone-400 italic line-clamp-1 mt-0.5">
                            &quot;{page.quote}&quot;
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Layout Template */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className="px-2.5 py-1 rounded-lg bg-[#281521] border border-rosewood-900/60 text-stone-300">
                        {page.layoutTemplateId || page.layout || 'custom'}
                      </span>
                      {page.isCustomized && (
                        <span className="ml-1.5 text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                          Tùy biến
                        </span>
                      )}
                    </td>

                    {/* Elements Count */}
                    <td className="py-3 px-4 text-center font-mono text-stone-400">
                      {elementsCount}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMove(index, 'up')}
                          className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 disabled:opacity-25 transition"
                          title="Lên 1 bậc"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMove(index, 'down')}
                          className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 disabled:opacity-25 transition"
                          title="Xuống 1 bậc"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          href={`/admin/pages/${page.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rosewood-900/50 hover:bg-rosewood-800 text-champagne-300 text-xs font-medium border border-rosewood-700/50 transition"
                          title="Mở Visual Canvas Studio"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDuplicatePage(page.id)}
                          className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 transition"
                          title="Nhân bản trang"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePage(page.id, page.pageNumber)}
                          className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 transition"
                          title="Xóa trang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#1B1017] border border-rosewood-800/60 rounded-2xl p-6 shadow-2xl text-parchment-100">
            <h3 className="font-serif text-lg font-bold mb-4 text-champagne-300 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rosewood-400" />
              <span>Thêm trang nhật ký mới</span>
            </h3>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Số trang hiển thị</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={pageNumber}
                  onChange={(e) => setPageNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Tên chương (Tùy chọn)</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="Ví dụ: Chapter I, Kỷ niệm..."
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Tiêu đề trang</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tiêu đề gợi nhớ..."
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Mẫu bố cục ban đầu</label>
                <select
                  value={layoutTemplateId}
                  onChange={(e) => setLayoutTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white"
                >
                  <option value="single-hero">Single Hero (1 ảnh lớn nổi bật)</option>
                  <option value="dual-stacked">Dual Stacked (2 ảnh xếp dọc)</option>
                  <option value="dual-columns">Dual Columns (2 ảnh cột đứng)</option>
                  <option value="asymmetric-featured">Asymmetric Featured (1 lớn + 2 nhỏ)</option>
                  <option value="scrapbook-trio">Scrapbook Trio (3 ảnh nghệ thuật)</option>
                  <option value="quad-gallery">Quad Gallery (Lưới 4 ảnh polaroid)</option>
                  <option value="diagonal-duo">Diagonal Duo (2 ảnh nghiêng nghệ thuật)</option>
                  {layoutTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rosewood-900/40">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white text-xs font-medium transition disabled:opacity-50"
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
