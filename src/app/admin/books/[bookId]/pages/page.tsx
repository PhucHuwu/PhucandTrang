'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminPages,
  createAdminPage,
  deleteAdminPage,
  duplicateAdminPage,
  reorderAdminPages,
  getAdminLayoutTemplates,
} from '@/services/adminApi';
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
} from 'lucide-react';

export default function AdminPagesListPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutTemplates, setLayoutTemplates] = useState<any[]>([]);

  // Create page modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [quote, setQuote] = useState('');
  const [layoutTemplateId, setLayoutTemplateId] = useState('single-hero');
  const [creating, setCreating] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pagesData, layoutsData] = await Promise.all([
        getAdminPages(bookId),
        getAdminLayoutTemplates(),
      ]);
      setPages(pagesData);
      setLayoutTemplates(layoutsData);

      // Auto suggest next pageNumber
      const maxPageNum = pagesData.reduce((max: number, p: any) => Math.max(max, p.pageNumber ?? 0), 0);
      setPageNumber(maxPageNum + 1);
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải danh sách trang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [bookId]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await fetchPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi nhân bản trang');
    }
  };

  const handleDeletePage = async (pageId: string, pageNum: number) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa trang số ${pageNum}? Thao tác này sẽ xóa toàn bộ các phần tử thuộc trang!`)) {
      return;
    }
    try {
      await deleteAdminPage(pageId);
      await fetchPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa trang');
    }
  };

  // Move page up / down in physical order
  const handleMovePage = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const newPages = [...pages];
    const temp = newPages[index];
    newPages[index] = newPages[targetIndex];
    newPages[targetIndex] = temp;

    setPages(newPages);

    try {
      await reorderAdminPages(
        bookId,
        newPages.map((p) => ({ id: p.id }))
      );
      await fetchPages();
    } catch (err: any) {
      alert(err?.message || 'Lỗi sắp xếp trang');
      await fetchPages();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rosewood-900/40 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/books"
            className="p-2 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-stone-300 border border-rosewood-900/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-rosewood-400" />
              <span>Danh Sách Trang (Pages)</span>
            </h1>
            <p className="text-xs text-stone-400">
              Tổng cộng {pages.length} trang • Tự động xếp thứ tự 0..N-1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPages}
            className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-medium shadow-lg shadow-rosewood-950/50 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm trang mới</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Pages Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500 text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
          <span>Đang tải danh sách trang...</span>
        </div>
      ) : pages.length === 0 ? (
        <div className="py-20 text-center bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-8">
          <FileText className="w-12 h-12 text-rosewood-800 mx-auto mb-3" />
          <h3 className="font-serif text-lg text-parchment-200 font-semibold">Chưa có trang nào trong sách</h3>
          <p className="text-xs text-stone-500 mt-1">Bấm &quot;Thêm trang mới&quot; để tạo trang đầu tiên.</p>
        </div>
      ) : (
        <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-[#24151E] border-b border-rosewood-900/50 text-[11px] font-mono uppercase tracking-wider text-rosewood-300/80">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Order</th>
                  <th className="py-3 px-4 w-20">Trang số</th>
                  <th className="py-3 px-4 w-20">Mặt lật</th>
                  <th className="py-3 px-4">Chương & Tiêu đề</th>
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

                  return (
                    <tr key={page.id} className="hover:bg-[#24161F]/60 transition-colors">
                      {/* Physical Order */}
                      <td className="py-3 px-4 text-center font-mono text-stone-400 font-semibold">
                        #{page.order ?? index}
                      </td>

                      {/* Display Page Number */}
                      <td className="py-3 px-4 font-mono font-medium text-parchment-100">
                        {page.pageNumber === 0 ? 'Lời ngỏ (0)' : `Trang ${page.pageNumber}`}
                      </td>

                      {/* Derived Side */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold ${
                            page.side === 'LEFT' || page.side === 'left'
                              ? 'bg-purple-950/70 text-purple-300 border border-purple-800/40'
                              : 'bg-rose-950/70 text-rose-300 border border-rose-800/40'
                          }`}
                        >
                          {page.side}
                        </span>
                      </td>

                      {/* Title & Chapter */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-parchment-100">
                          {page.title || <span className="text-stone-600 italic">(Không tiêu đề)</span>}
                        </div>
                        {page.chapter && (
                          <div className="text-[11px] text-rosewood-400/80 font-serif">
                            {page.chapter}
                          </div>
                        )}
                      </td>

                      {/* Layout */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#2A1622] text-champagne-300/90 border border-rosewood-900/50 font-mono text-[11px]">
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
                          {/* Move Order Up/Down */}
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMovePage(index, 'up')}
                            className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Di chuyển lên"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMovePage(index, 'down')}
                            className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Elements & Live Preview */}
                          <Link
                            href={`/admin/books/${bookId}/pages/${page.id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rosewood-900/40 hover:bg-rosewood-900/80 text-champagne-300 font-medium border border-rosewood-800/40 transition-colors"
                            title="Chỉnh sửa phần tử & Live Preview"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </Link>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicatePage(page.id)}
                            className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 transition-colors"
                            title="Nhân bản trang"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeletePage(page.id, page.pageNumber)}
                            className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 transition-colors"
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
      )}

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#1B1017] border border-rosewood-800/60 rounded-2xl p-6 shadow-2xl text-parchment-100">
            <h3 className="font-serif text-lg font-bold mb-4 text-champagne-300 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rosewood-400" />
              <span>Thêm trang mới vào sách</span>
            </h3>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Số trang hiển thị (pageNumber)</label>
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
                  placeholder="Ví dụ: Ngày Đẹp Trời"
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Trích dẫn (quote)</label>
                <input
                  type="text"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="Ví dụ: Tình yêu là điều dịu dàng nhất..."
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
