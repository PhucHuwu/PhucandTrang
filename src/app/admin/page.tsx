'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminBooks, getAdminMedia } from '@/services/adminApi';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  BookOpen,
  FileText,
  ImageIcon,
  Music,
  Settings,
  Layers,
  Sparkles,
  ExternalLink,
  Calendar,
  Heart,
  RefreshCw,
  GitCommit,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { isViewer, role } = useAdminAuth();
  const [book, setBook] = useState<any | null>(null);
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [booksData, mediaData] = await Promise.all([
        getAdminBooks(),
        getAdminMedia({ limit: 1 }),
      ]);

      if (booksData && booksData.length > 0) {
        setBook(booksData[0]);
      }
      setMediaCount(mediaData?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Không thể nạp dữ liệu bảng điều khiển');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
        <span>Đang nạp dữ liệu tổng quan Dashboard...</span>
      </div>
    );
  }

  const pageCount = book?._count?.pages ?? (book?.pages?.length || 0);
  const contentRevision = book?.contentRevision ?? 1;
  const status = book?.status || 'PUBLISHED';
  const frontCover = book?.cover?.front?.backgroundUrl;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rosewood-900/40 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-champagne-300" />
            <span>Dashboard — Bảng Điều Khiển</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Tổng quan nhật ký tình yêu &quot;{book?.title || 'Chúng Mình'}&quot;
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-medium shadow-lg transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Mở website</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Stats Cards Grid (Scope #9: book, page count, media count, status, contentRevision) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Status */}
        <div className="p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-mono">Trạng thái</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'PUBLISHED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-serif text-xl font-bold tracking-wide ${
                status === 'PUBLISHED' ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-[11px] text-stone-500">Đang xuất bản công khai</p>
        </div>

        {/* Card 2: Page Count */}
        <Link
          href="/admin/pages"
          className="group p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 hover:border-rosewood-700/60 shadow-xl space-y-2 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-mono">Tổng số trang</span>
            <FileText className="w-4 h-4 text-rosewood-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-parchment-100 group-hover:text-champagne-300 transition-colors">
              {pageCount}
            </span>
            <span className="text-xs text-stone-500">trang</span>
          </div>
          <p className="text-[11px] text-stone-500 flex items-center gap-1 group-hover:text-rosewood-300">
            <span>Quản lý trang</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        {/* Card 3: Media Count */}
        <Link
          href="/admin/media"
          className="group p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 hover:border-rosewood-700/60 shadow-xl space-y-2 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-mono">Thư viện Media</span>
            <ImageIcon className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-parchment-100 group-hover:text-champagne-300 transition-colors">
              {mediaCount}
            </span>
            <span className="text-xs text-stone-500">tệp tin</span>
          </div>
          <p className="text-[11px] text-stone-500 flex items-center gap-1 group-hover:text-pink-300">
            <span>Mở thư viện</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        {/* Card 4: Content Revision */}
        <div className="p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-mono">Revision ETag</span>
            <GitCommit className="w-4 h-4 text-champagne-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-champagne-300 font-mono">
              #{contentRevision}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 font-mono">v{book?.version || '2.0.0'}</p>
        </div>
      </div>

      {/* Book Detailed Overview Card */}
      {book && (
        <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
          {/* Cover Image banner */}
          <div className="md:w-80 h-56 md:h-auto relative bg-[#201018] shrink-0 overflow-hidden">
            {frontCover ? (
              <img
                src={frontCover}
                alt={book.title}
                className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-rosewood-800">
                <BookOpen className="w-16 h-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#180E14] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#180E14]" />
          </div>

          {/* Book Content Summary */}
          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rosewood-950 text-champagne-300 border border-rosewood-800/50">
                  SLUG: {book.slug}
                </span>
                <span className="text-xs text-stone-500 font-mono">ID: {book.id}</span>
              </div>

              <h2 className="font-serif text-2xl font-bold text-parchment-100">{book.title}</h2>
              {book.description && (
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">{book.description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-rosewood-900/40 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rosewood-400" />
                  <span>
                    Chủ nhân: <strong className="text-parchment-100">{book.heName || 'Phúc'}</strong> & <strong className="text-parchment-100">{book.sheName || 'Trang'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-champagne-400" />
                  <span>
                    Ngày kỷ niệm: <strong className="text-parchment-100">{new Date(book.anniversaryDate).toLocaleDateString('vi-VN')}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:col-span-2">
                  <span className="text-rosewood-400 font-serif italic">&ldquo;{book.proposalQuote}&rdquo;</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-rosewood-900/40">
              <Link
                href="/admin/pages"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rosewood-900/40 hover:bg-rosewood-900/70 text-champagne-300 text-xs font-medium border border-rosewood-800/50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Quản lý trang ({pageCount})</span>
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25151F] hover:bg-[#331C2A] text-parchment-300 text-xs font-medium border border-rosewood-900/40 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Cài đặt sách</span>
              </Link>

              <Link
                href="/admin/media"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25151F] hover:bg-[#331C2A] text-parchment-300 text-xs font-medium border border-rosewood-900/40 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Thư viện Media</span>
              </Link>

              <Link
                href="/admin/audio"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25151F] hover:bg-[#331C2A] text-parchment-300 text-xs font-medium border border-rosewood-900/40 transition-colors"
              >
                <Music className="w-4 h-4" />
                <span>Kho Audio</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
