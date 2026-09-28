'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getJournal,
  getAdminMedia,
  validateJournalForPublish,
  ValidationReport,
} from '@/services/adminApi';
import { useJournal } from '@/context/JournalContext';
import PublishValidationModal from '@/components/admin/PublishValidationModal';
import VersionHistoryModal from '@/components/admin/VersionHistoryModal';
import {
  FileText,
  ImageIcon,
  Music,
  Settings,
  Layers,
  Sparkles,
  Calendar,
  Heart,
  RefreshCw,
  Eye,
  Send,
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { journal, refreshJournal } = useJournal();
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Modals state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [validationModal, setValidationModal] = useState<{
    bookId: string;
    report: ValidationReport;
  } | null>(null);

  const fetchExtraStats = async () => {
    try {
      const mediaData = await getAdminMedia({ limit: 1 });
      setMediaCount(mediaData?.total || 0);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchExtraStats();
  }, []);

  const handlePublishClick = async () => {
    if (!journal || publishing) return;
    try {
      setPublishing(true);
      const report = await validateJournalForPublish();
      setValidationModal({
        bookId: journal.id,
        report,
      });
    } catch (err: any) {
      alert(`Lỗi kiểm tra xuất bản: ${err?.message || 'Vui lòng thử lại.'}`);
    } finally {
      setPublishing(false);
    }
  };

  const pageCount = (journal as any)?._count?.pages ?? (journal?.pages?.length || 0);
  const publishedRevision = (journal as any)?.publishedRevision ?? 1;
  const draftRevision = (journal as any)?.contentRevision ?? 1;
  const status = (journal as any)?.status || 'PUBLISHED';
  const frontCover = journal?.cover?.front?.backgroundUrl;
  const lastPublishedStr = (journal as any)?.publishedAt
    ? new Date((journal as any).publishedAt).toLocaleString('vi-VN')
    : 'Chưa ghi nhận';

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rosewood-900/40 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-champagne-300" />
            <span>Nhật Ký Tình Yêu — {journal?.title || 'Chúng Mình'}</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Dành riêng cho {journal?.couple?.he || (journal as any)?.heName || 'Phúc'} &amp;{' '}
            {journal?.couple?.she || (journal as any)?.sheName || 'Trang'} • Kỷ niệm từ{' '}
            {journal?.couple?.anniversaryDate || (journal as any)?.anniversaryDate
              ? new Date(journal?.couple?.anniversaryDate || (journal as any)?.anniversaryDate).toLocaleDateString('vi-VN')
              : '20.10.2022'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshJournal()}
            className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
            title="Làm mới thông số"
          >
            <RefreshCw className="w-4 h-4 text-stone-400" />
          </button>

          <Link
            href="/admin/preview"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-xs font-medium transition shadow-sm"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Xem trước bản nháp</span>
          </Link>

          <button
            onClick={handlePublishClick}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{publishing ? 'Đang kiểm tra...' : 'Xuất bản (Publish)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Status */}
        <div className="p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Trạng thái phát hành</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${status === 'PUBLISHED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <h3 className="font-serif text-lg font-bold text-parchment-100">{status}</h3>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">Rev đã xuất bản: #{publishedRevision}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 2: Pages */}
        <div className="p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Tổng số trang</p>
            <h3 className="font-serif text-2xl font-bold text-champagne-200 mt-1">{pageCount} trang</h3>
            <p className="text-[10px] text-stone-500 mt-1">Trang vật lý 3D liên tục</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rosewood-950/80 border border-rosewood-500/40 flex items-center justify-center text-rosewood-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 3: Media */}
        <div className="p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Kho ảnh &amp; video</p>
            <h3 className="font-serif text-2xl font-bold text-champagne-200 mt-1">{mediaCount} items</h3>
            <p className="text-[10px] text-stone-500 mt-1">Cloudinary CDN signed</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-400">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 4: Last Published */}
        <div className="p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Lần xuất bản gần nhất</p>
            <p className="font-sans text-xs font-medium text-parchment-200 mt-1.5 line-clamp-1">{lastPublishedStr}</p>
            <p className="text-[10px] text-stone-500 mt-1">Draft revision: #{draftRevision}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Action Hub: 2-Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Studio Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif text-lg font-bold text-parchment-100 flex items-center gap-2">
            <span>Truy Cập Nhanh Quản Trị</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Pages List */}
            <Link
              href="/admin/pages"
              className="group p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 hover:border-rosewood-600/70 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-rosewood-950 border border-rosewood-500/40 flex items-center justify-center text-rosewood-400 mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-parchment-100 group-hover:text-champagne-300 transition-colors">
                  Quản lý trang (Pages)
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Xem danh sách, thêm trang mới, kéo thả sắp xếp thứ tự và mở trình soạn thảo trực quan Canvas.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-rosewood-900/30 flex items-center justify-between text-xs text-champagne-300 font-medium">
                <span>{pageCount} trang</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 2: Cover Studio */}
            <Link
              href="/admin/cover"
              className="group p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 hover:border-rosewood-600/70 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-950 border border-pink-500/40 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-parchment-100 group-hover:text-champagne-300 transition-colors">
                  Bìa sách (Cover Studio)
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Thiết kế đồ họa chuyên sâu cho Bìa trước (Front), Mặt trong và Mặt ngoài bìa sau.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-rosewood-900/30 flex items-center justify-between text-xs text-champagne-300 font-medium">
                <span>Mở Visual Studio</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 3: Media Library */}
            <Link
              href="/admin/media"
              className="group p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 hover:border-rosewood-600/70 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-parchment-100 group-hover:text-champagne-300 transition-colors">
                  Thư viện Media
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Quản lý kho ảnh, video Cloudinary, kiểm tra tham chiếu an toàn trước khi xóa.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-rosewood-900/30 flex items-center justify-between text-xs text-champagne-300 font-medium">
                <span>{mediaCount} tệp</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 4: Settings */}
            <Link
              href="/admin/settings"
              className="group p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 hover:border-rosewood-600/70 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-parchment-100 group-hover:text-champagne-300 transition-colors">
                  Cài đặt nhật ký (Settings)
                </h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Tùy chỉnh thông tin cặp đôi, ngày kỷ niệm, lời ngỏ, bảng màu, typography, camera và không gian 3D.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-rosewood-900/30 flex items-center justify-between text-xs text-champagne-300 font-medium">
                <span>7 nhóm thông số</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>

        {/* Right: Journal Profile & Versioning Hub */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-parchment-100">
            Thông Tin Nhật Ký
          </h2>

          <div className="bg-[#1A1016] border border-rosewood-900/40 rounded-2xl overflow-hidden p-5 space-y-4">
            {frontCover && (
              <div className="w-full h-44 rounded-xl overflow-hidden border border-rosewood-900/50 relative bg-[#2A1622]">
                <img
                  src={frontCover}
                  alt={journal?.title || 'Chúng Mình'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                  <span className="font-serif text-sm text-champagne-200 font-bold">{journal?.title}</span>
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-rosewood-400 shrink-0" />
                <span>{journal?.couple?.he || (journal as any)?.heName || 'Phúc'} &amp; {journal?.couple?.she || (journal as any)?.sheName || 'Trang'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span>
                  Bắt đầu từ:{' '}
                  {journal?.couple?.anniversaryDate || (journal as any)?.anniversaryDate
                    ? new Date(journal?.couple?.anniversaryDate || (journal as any)?.anniversaryDate).toLocaleDateString('vi-VN')
                    : '20.10.2022'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Nhạc nền: {journal?.audio?.title || (journal as any)?.backgroundMusic?.title || '(Chưa gán nhạc)'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-rosewood-900/40">
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rosewood-900/40 hover:bg-rosewood-900/70 text-champagne-300 border border-rosewood-800/40 text-xs font-medium transition"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>Lịch sử phiên bản &amp; Rollback</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      {journal && (
        <VersionHistoryModal
          bookId={journal.id}
          bookTitle={journal.title}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onRollbackSuccess={() => {
            refreshJournal();
          }}
        />
      )}

      {/* Publish Validation Modal */}
      {validationModal && (
        <PublishValidationModal
          bookId={validationModal.bookId}
          isOpen={true}
          onClose={() => setValidationModal(null)}
          report={validationModal.report}
          onPublishSuccess={() => {
            refreshJournal();
          }}
        />
      )}
    </div>
  );
}
