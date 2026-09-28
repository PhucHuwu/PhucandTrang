'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAdminVersions,
  getAdminVersion,
  createAdminSnapshot,
  rollbackAdminSnapshot,
  BookVersionItem,
} from '@/services/adminApi';
import { useJournal } from '@/context/JournalContext';
import {
  History,
  Tag,
  Calendar,
  User as UserIcon,
  RotateCcw,
  Plus,
  Loader2,
  ChevronRight,
  FileText,
  Info,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

export default function VersionsDirectAdminPage() {
  const { journal, journalId, refreshJournal } = useJournal();

  const [versions, setVersions] = useState<BookVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<BookVersionItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Snapshot State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [versionTag, setVersionTag] = useState('');
  const [changelog, setChangelog] = useState('');
  const [creating, setCreating] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const fetchVersions = async () => {
    if (!journalId) return;
    setLoading(true);
    try {
      const list = await getAdminVersions(journalId);
      setVersions(list);
      if (list.length > 0) {
        handleInspect(list[0].id);
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể tải danh sách phiên bản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [journalId]);

  const handleInspect = async (id: string) => {
    try {
      setLoadingDetail(true);
      const detail = await getAdminVersion(id);
      setSelectedVersion(detail);
    } catch (err: any) {
      alert(err?.message || 'Lỗi tải chi tiết phiên bản');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTag.trim() || !journalId || creating) return;

    setCreating(true);
    try {
      await createAdminSnapshot(journalId, versionTag.trim(), changelog.trim() || undefined);
      setVersionTag('');
      setChangelog('');
      setShowCreateForm(false);
      await fetchVersions();
    } catch (err: any) {
      alert(err?.message || 'Lỗi tạo snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleRollback = async (ver: BookVersionItem) => {
    if (!journalId) return;
    const confirmMsg =
      `⚠️ CẢNH BÁO QUAN TRỌNG VỀ ROLLBACK:\n\n` +
      `Bạn có chắc chắn muốn phục hồi bản nháp (Draft) về phiên bản ${ver.version}?\n\n` +
      `• Toàn bộ trang và phần tử nháp hiện tại sẽ được khôi phục từ snapshot ${ver.version}.\n` +
      `• Website công khai KHÔNG tự động thay đổi (Live Public Site vẫn giữ nguyên).\n` +
      `• Bạn cần vào Preview kiểm tra và bấm "Publish" lại để áp dụng ra ngoài.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setRollingBackId(ver.id);
      const res = await rollbackAdminSnapshot(journalId, ver.id);
      alert(res.message);
      await refreshJournal();
      await fetchVersions();
    } catch (err: any) {
      alert(`Lỗi rollback: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setRollingBackId(null);
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
            <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2.5">
              <History className="w-6 h-6 text-rosewood-400" />
              <span>Lịch Sử Phiên Bản (Journal Versions)</span>
            </h1>
            <p className="text-xs text-stone-400">
              Nhật ký: {journal?.title} • Tổng cộng {versions.length} bản ghi phiên bản
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchVersions}
            className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-medium shadow-lg transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-champagne-300" />
            <span>Tạo Snapshot Mới</span>
          </button>
        </div>
      </div>

      {/* Create Form Drawer */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSnapshot}
          className="p-5 bg-[#1B1017] border border-rosewood-800/60 rounded-2xl flex flex-col sm:flex-row gap-3 items-end shadow-xl animate-in fade-in"
        >
          <div className="w-full sm:w-48">
            <label className="block text-xs font-mono text-stone-300 mb-1">Mã phiên bản (Tag)</label>
            <input
              type="text"
              required
              placeholder="VD: v2.5 hoặc snapshot-pre-edit"
              value={versionTag}
              onChange={(e) => setVersionTag(e.target.value)}
              className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
            />
          </div>
          <div className="w-full flex-1">
            <label className="block text-xs font-mono text-stone-300 mb-1">Ghi chú phát hành (Changelog)</label>
            <input
              type="text"
              placeholder="Mô tả tóm tắt nội dung thay đổi..."
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={creating || !versionTag.trim()}
              className="px-4 py-2.5 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white text-xs font-medium transition disabled:opacity-50"
            >
              {creating ? 'Đang tạo...' : 'Lưu Snapshot'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* 2-Columns Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Versions list (1 col) */}
        <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl overflow-hidden shadow-xl p-3 space-y-2">
          <div className="px-3 py-2 border-b border-rosewood-900/40 text-xs font-mono text-stone-400 flex items-center justify-between">
            <span>Danh sách ({versions.length})</span>
            <span>Mới nhất ở trên</span>
          </div>

          <div className="space-y-1.5 max-h-[68vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-stone-500 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-rosewood-400 mb-2" />
                <span>Đang tải danh sách...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="py-20 text-center text-xs text-stone-500">
                Chưa có bản ghi phiên bản nào.
              </div>
            ) : (
              versions.map((ver) => {
                const isSelected = selectedVersion?.id === ver.id;
                const dateStr = new Date(ver.createdAt).toLocaleString('vi-VN');

                return (
                  <div
                    key={ver.id}
                    onClick={() => handleInspect(ver.id)}
                    className={`p-3 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-rosewood-900/60 border-rosewood-600/80 shadow'
                        : 'bg-[#20111A] border-rosewood-900/30 hover:border-rosewood-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-champagne-300 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-rosewood-400" />
                        <span>{ver.version}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
                    </div>

                    <p className="text-xs text-stone-300 line-clamp-1 mb-2">
                      {ver.changelog || 'Không có mô tả chi tiết'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Version Details & Rollback (2 cols) */}
        <div className="lg:col-span-2 bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col justify-between">
          {loadingDetail ? (
            <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-rosewood-400 mb-2" />
              <span>Đang tải thông tin snapshot...</span>
            </div>
          ) : selectedVersion ? (
            <div className="space-y-6">
              <div className="border-b border-rosewood-900/40 pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-rosewood-900/70 border border-rosewood-500/50 font-mono text-xs font-bold text-champagne-300">
                      {selectedVersion.version}
                    </span>
                    <span className="text-xs font-mono text-stone-500">ID: {selectedVersion.id.slice(0, 8)}...</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-parchment-100">
                    {selectedVersion.snapshot?.title || 'Snapshot Bản Ghi'}
                  </h3>
                </div>

                {/* Rollback button */}
                <button
                  type="button"
                  onClick={() => handleRollback(selectedVersion)}
                  disabled={rollingBackId === selectedVersion.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-amber-950/40 transition disabled:opacity-50"
                  title="Khôi phục dữ liệu bản nháp về phiên bản này"
                >
                  {rollingBackId === selectedVersion.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span>Rollback Bản Nháp</span>
                </button>
              </div>

              {/* Metadata details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#20111A] border border-rosewood-900/40 space-y-1">
                  <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-rosewood-400" />
                    <span>Thời gian lưu snapshot</span>
                  </span>
                  <p className="font-medium text-parchment-200">
                    {new Date(selectedVersion.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#20111A] border border-rosewood-900/40 space-y-1">
                  <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-rosewood-400" />
                    <span>Người thực hiện</span>
                  </span>
                  <p className="font-medium text-parchment-200">
                    {selectedVersion.createdBy?.name || 'Quản trị viên'}
                  </p>
                </div>
              </div>

              {/* Changelog */}
              <div className="p-4 rounded-xl bg-[#20111A] border border-rosewood-900/40 space-y-1.5">
                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                  Ghi chú thay đổi (Changelog)
                </span>
                <p className="text-xs text-parchment-200 italic leading-relaxed">
                  &quot;{selectedVersion.changelog || 'Không có mô tả chi tiết'}&quot;
                </p>
              </div>

              {/* Summary of snapshot items */}
              {selectedVersion.snapshot && (
                <div className="p-4 rounded-xl bg-[#1C0F16] border border-rosewood-900/40 space-y-3">
                  <span className="text-[10px] font-mono text-champagne-300 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3 text-rosewood-400" />
                    <span>Cấu trúc nội dung snapshot</span>
                  </span>

                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-3 rounded-lg bg-[#271520]">
                      <span className="block font-mono text-base font-bold text-champagne-200">
                        {selectedVersion.snapshot.pages?.length || 0}
                      </span>
                      <span className="text-[10px] text-stone-400">Trang nội dung</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#271520]">
                      <span className="block font-mono text-base font-bold text-champagne-200">
                        {selectedVersion.snapshot.pages?.reduce(
                          (sum: number, p: any) => sum + (p.elements?.length || 0),
                          0
                        ) || 0}
                      </span>
                      <span className="text-[10px] text-stone-400">Phần tử (Elements)</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#271520]">
                      <span className="block font-mono text-base font-bold text-champagne-200">
                        {selectedVersion.snapshot.backgroundMusic ? 'Có' : 'Không'}
                      </span>
                      <span className="text-[10px] text-stone-400">Nhạc nền</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Safety notice */}
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Thao tác Rollback chỉ phục hồi lại các bảng nháp (Draft) trong database để bạn tiếp tục chỉnh sửa. Trang web công khai (Live Site) vẫn hiển thị bản xuất bản hiện tại cho đến khi bạn vào Preview và bấm &quot;Publish&quot; lại.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-32 text-center text-xs text-stone-500">
              Chọn một phiên bản bên trái để xem chi tiết metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
