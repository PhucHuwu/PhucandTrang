'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAdminBooks,
  createAdminBook,
  deleteAdminBook,
} from '@/services/adminApi';
import {
  BookOpen,
  Plus,
  Settings,
  FileText,
  ExternalLink,
  Trash2,
  Calendar,
  Heart,
  RefreshCw,
} from 'lucide-react';

export default function AdminBooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New book form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [heName, setHeName] = useState('Phúc');
  const [sheName, setSheName] = useState('Trang');
  const [anniversaryDate, setAnniversaryDate] = useState('2022-10-20');
  const [creating, setCreating] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminBooks();
      setBooks(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createAdminBook({
        title,
        slug,
        heName,
        sheName,
        anniversaryDate: `${anniversaryDate}T00:00:00Z`,
        cover: {
          front: {
            backgroundUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904212/phuc_trang_backgrounds/first-cover.jpg',
            title,
          },
          back: {
            insideBackgroundUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904216/phuc_trang_backgrounds/last-cover.jpg',
            outsideBackgroundUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904216/phuc_trang_backgrounds/last-cover.jpg',
          },
        },
        settings: {
          dimensions: { pageWidth: 764, pageHeight: 1080, aspectRatio: 0.707 },
          theme: { edgeColor: 0xb1a283, paperColor: '#F9F5EC' },
          atmospheric: { enabled: true },
        },
      });
      setShowCreateModal(false);
      setTitle('');
      setSlug('');
      await fetchBooks();
    } catch (err: any) {
      alert(err?.message || 'Lỗi tạo sách');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBook = async (id: string, bookTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa cuốn sách "${bookTitle}" cùng tất cả các trang liên quan? Thao tác này không thể hoàn tác!`)) {
      return;
    }
    try {
      await deleteAdminBook(id);
      await fetchBooks();
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa sách');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rosewood-900/40 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-parchment-100 tracking-wide flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-rosewood-400" />
            <span>Sách Kỷ Niệm (Books)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Quản lý các cuốn nhật ký tình yêu và hành trình kỷ niệm
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBooks}
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
            <span>Tạo sách mới</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Book Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500 text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
          <span>Đang tải danh sách sách...</span>
        </div>
      ) : books.length === 0 ? (
        <div className="py-20 text-center bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-8">
          <BookOpen className="w-12 h-12 text-rosewood-800 mx-auto mb-3" />
          <h3 className="font-serif text-lg text-parchment-200 font-semibold">Chưa có cuốn sách nào</h3>
          <p className="text-xs text-stone-500 mt-1">Bấm &quot;Tạo sách mới&quot; để bắt đầu lưu giữ kỷ niệm.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const frontCover = book.cover?.front?.backgroundUrl;
            const pagesCount = book._count?.pages ?? (book.pages?.length || 0);

            return (
              <div
                key={book.id}
                className="group relative bg-[#1A1016] border border-rosewood-900/50 rounded-2xl overflow-hidden hover:border-rosewood-700/60 transition-all duration-300 shadow-xl flex flex-col justify-between"
              >
                {/* Book Banner */}
                <div className="relative h-44 w-full overflow-hidden bg-[#2A1622]">
                  {frontCover ? (
                    <img
                      src={frontCover}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-rosewood-800">
                      <BookOpen className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1016] via-transparent to-black/40" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase font-mono ${
                        book.status === 'PUBLISHED'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      {book.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/60 text-stone-300 font-mono">
                      v{book.version || '2.0.0'}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-parchment-100 tracking-wide group-hover:text-champagne-300 transition-colors">
                      {book.title}
                    </h2>
                    <p className="text-xs text-stone-400 font-mono mt-0.5">/{book.slug}</p>

                    <div className="mt-4 space-y-2 text-xs text-stone-400">
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-rosewood-400" />
                        <span>
                          {book.heName || 'Phúc'} & {book.sheName || 'Trang'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span>
                          Kỷ niệm: {new Date(book.anniversaryDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-stone-500" />
                        <span>{pagesCount} trang nội dung</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-rosewood-900/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <Link
                        href={`/admin/books/${book.id}/pages`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rosewood-900/40 hover:bg-rosewood-900/70 text-champagne-300 text-xs font-medium border border-rosewood-800/40 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Các trang</span>
                      </Link>
                      <Link
                        href={`/admin/books/${book.id}/settings`}
                        className="p-2 rounded-xl bg-[#25151F] hover:bg-[#331C2A] text-stone-300 border border-rosewood-900/40 transition-colors"
                        title="Cài đặt sách"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                      <Link
                        href="/"
                        target="_blank"
                        className="p-2 rounded-xl bg-[#25151F] hover:bg-[#331C2A] text-stone-300 border border-rosewood-900/40 transition-colors"
                        title="Xem trang thực tế"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>

                    <button
                      onClick={() => handleDeleteBook(book.id, book.title)}
                      className="p-2 rounded-xl bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/30 transition-colors"
                      title="Xóa sách"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Book Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#1B1017] border border-rosewood-800/60 rounded-2xl p-6 shadow-2xl text-parchment-100">
            <h3 className="font-serif text-lg font-bold mb-4 text-champagne-300 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rosewood-400" />
              <span>Tạo cuốn sách mới</span>
            </h3>

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Tiêu đề sách</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slug) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, '')
                      );
                    }
                  }}
                  placeholder="Ví dụ: Chúng Mình"
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Slug (Đường dẫn)</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="chung-minh"
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Tên bạn nam</label>
                  <input
                    type="text"
                    required
                    value={heName}
                    onChange={(e) => setHeName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Tên bạn nữ</label>
                  <input
                    type="text"
                    required
                    value={sheName}
                    onChange={(e) => setSheName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Ngày kỷ niệm</label>
                <input
                  type="date"
                  required
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#261621] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
                />
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
                  {creating ? 'Đang tạo...' : 'Tạo sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
