'use client';

import React, { useEffect, useState } from 'react';
import {
  getAdminVersions,
  getAdminVersion,
  createAdminSnapshot,
  rollbackAdminBookSnapshot,
  BookVersionItem,
} from '@/services/adminApi';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  History,
  X,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User as UserIcon,
  Tag,
  FileText,
  Loader2,
  Info,
  ChevronRight,
} from 'lucide-react';

interface VersionHistoryModalProps {
  bookId: string;
  bookTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onRollbackSuccess?: () => void;
}

export default function VersionHistoryModal({
  bookId,
  bookTitle = 'Cuốn sách',
  isOpen,
  onClose,
  onRollbackSuccess,
}: VersionHistoryModalProps) {
  const { isViewer, isAdmin } = useAdminAuth();

  const [versions, setVersions] = useState<BookVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected version for inspection
  const [selectedVersion, setSelectedVersion] = useState<BookVersionItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Snapshot State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [versionTag, setVersionTag] = useState('');
  const [changelog, setChangelog] = useState('');
  const [creating, setCreating] = useState(false);

  // Rollback Action State
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getAdminVersions(bookId);
      setVersions(list);
      if (list.length > 0 && !selectedVersion) {
        handleInspectVersion(list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải lịch sử phiên bản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bookId) {
      fetchVersions();
    } else {
      setSelectedVersion(null);
      setShowCreateForm(false);
    }
  }, [isOpen, bookId]);

  const handleInspectVersion = async (versionId: string) => {
    try {
      setLoadingDetail(true);
      const detail = await getAdminVersion(versionId);
      setSelectedVersion(detail);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi tải chi tiết phiên bản');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTag.trim() || creating) return;

    try {
      setCreating(true);
      await createAdminSnapshot(bookId, versionTag.trim(), changelog.trim());
      setVersionTag('');
      setChangelog('');
      setShowCreateForm(false);
      setToastMessage('Đã tạo bản snapshot thủ công thành công!');
      setTimeout(() => setToastMessage(null), 3500);
      await fetchVersions();
    } catch (err: any) {
      alert(err?.message || 'Lỗi tạo snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleRollback = async (ver: BookVersionItem) => {
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (ADMIN) mới có quyền Rollback bản nháp!');
      return;
    }

    const confirmMsg =
      `⚠️ CẢNH BÁO QUAN TRỌNG VỀ ROLLBACK:\n\n` +
      `Bạn có chắc chắn muốn phục hồi bản nháp (Draft) về phiên bản ${ver.version}?\n\n` +
      `• Toàn bộ trang và phần tử nháp hiện tại sẽ được thay thế bằng dữ liệu của snapshot ${ver.version}.\n` +
      `• Website công khai KHÔNG tự động thay đổi (Live Public Site vẫn giữ nguyên).\n` +
      `• Bạn cần vào Preview kiểm tra và bấm "Publish" lại để áp dụng ra ngoài.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setRollingBackId(ver.id);
      const res = await rollbackAdminBookSnapshot(bookId, ver.id);
      alert(res.message);
      if (onRollbackSuccess) {
        onRollbackSuccess();
      }
      onClose();
    } catch (err: any) {
      alert(`Lỗi rollback: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setRollingBackId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#170E14] border border-rosewood-800/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-parchment-100">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-rosewood-900/50 bg-[#1D1019] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rosewood-600/20 border border-rosewood-500/40 flex items-center justify-center text-rosewood-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-champagne-300 leading-tight">
                Lịch Sử Phiên Bản (Version History)
              </h2>
              <p className="text-xs text-stone-400">
                {bookTitle} • Quản lý snapshots và phục hồi bản nháp (Rollback Draft)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isViewer && (
              <button
                type="button"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rosewood-900/60 hover:bg-rosewood-800/80 text-parchment-100 text-xs font-medium border border-rosewood-700/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-champagne-300" />
                <span>Tạo Snapshot Mới</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-rosewood-900/40 text-stone-400 hover:text-white transition-colors"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast Banner */}
        {toastMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-5 py-2 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Create Snapshot Form Drawer */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateSnapshot}
            className="p-4 bg-[#23121E] border-b border-rosewood-800/60 flex flex-col sm:flex-row gap-3 items-end shrink-0"
          >
            <div className="w-full sm:w-48">
              <label className="block text-[11px] font-mono text-stone-300 mb-1">Mã phiên bản (Tag)</label>
              <input
                type="text"
                required
                placeholder="v2.5 hoặc snapshot-pre-edit"
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#140A10] border border-rosewood-900/60 rounded-lg text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
              />
            </div>
            <div className="w-full flex-1">
              <label className="block text-[11px] font-mono text-stone-300 mb-1">Ghi chú thay đổi (Changelog)</label>
              <input
                type="text"
                placeholder="VD: Cập nhật font chữ và layout trang 1-5"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#140A10] border border-rosewood-900/60 rounded-lg text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={creating || !versionTag.trim()}
                className="px-4 py-2 rounded-lg bg-rosewood-600 hover:bg-rosewood-500 text-white text-xs font-medium disabled:opacity-50 transition"
              >
                {creating ? 'Đang tạo...' : 'Lưu Snapshot'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* Content 2-Column Split: Versions List (Left) - Metadata Inspector (Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Versions List */}
          <div className="w-full sm:w-2/5 border-r border-rosewood-900/40 flex flex-col bg-[#140B10]">
            <div className="p-3 bg-[#1C0F16] border-b border-rosewood-900/40 flex items-center justify-between text-xs font-mono text-stone-400">
              <span>Danh sách ({versions.length})</span>
              <span>Mới nhất ở trên</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-stone-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-rosewood-400 mb-2" />
                  <span>Đang tải lịch sử phiên bản...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="py-16 text-center text-stone-500 text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Chưa có phiên bản nào được ghi nhận.</p>
                </div>
              ) : (
                versions.map((ver) => {
                  const isSelected = selectedVersion?.id === ver.id;
                  const dateStr = new Date(ver.createdAt).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={ver.id}
                      onClick={() => handleInspectVersion(ver.id)}
                      className={`group p-3 rounded-xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-rosewood-900/60 border-rosewood-600/80 shadow-md'
                          : 'bg-[#1C1017] border-rosewood-900/30 hover:border-rosewood-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-champagne-300 flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-rosewood-400" />
                          <span>{ver.version}</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 transition-transform" />
                      </div>

                      <p className="text-xs text-stone-300 line-clamp-1 mb-2">
                        {ver.changelog || 'Không có ghi chú thay đổi'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </span>
                        {ver.createdBy && (
                          <span className="flex items-center gap-1 truncate max-w-[110px]" title={ver.createdBy.name}>
                            <UserIcon className="w-3 h-3" />
                            <span className="truncate">{ver.createdBy.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Metadata Inspector & Rollback Action */}
          <div className="hidden sm:flex flex-1 flex-col bg-[#170E14] overflow-hidden">
            {loadingDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center text-stone-500 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-rosewood-400 mb-2" />
                <span>Đang tải thông tin chi tiết snapshot...</span>
              </div>
            ) : selectedVersion ? (
              <div className="flex-1 flex flex-col justify-between overflow-y-auto p-6 space-y-6">
                <div className="space-y-5">
                  {/* Title & Tag */}
                  <div className="border-b border-rosewood-900/40 pb-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-rosewood-900/70 border border-rosewood-500/50 font-mono text-xs font-bold text-champagne-300">
                          {selectedVersion.version}
                        </span>
                        <span className="text-xs font-mono text-stone-500">ID: {selectedVersion.id.slice(0, 8)}...</span>
                      </div>
                      <h3 className="font-serif text-lg font-bold text-parchment-100">
                        {selectedVersion.snapshot?.title || 'Bản ghi Snapshot'}
                      </h3>
                    </div>

                    {/* Rollback Button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRollback(selectedVersion)}
                        disabled={rollingBackId === selectedVersion.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50"
                        title="Khôi phục dữ liệu bản nháp về phiên bản này"
                      >
                        {rollingBackId === selectedVersion.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        <span>Rollback Bản Nháp</span>
                      </button>
                    )}
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#20111A] border border-rosewood-900/40 space-y-1">
                      <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-rosewood-400" />
                        <span>Thời gian lưu</span>
                      </span>
                      <p className="font-sans font-medium text-parchment-200">
                        {new Date(selectedVersion.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#20111A] border border-rosewood-900/40 space-y-1">
                      <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-rosewood-400" />
                        <span>Người thực hiện</span>
                      </span>
                      <p className="font-sans font-medium text-parchment-200">
                        {selectedVersion.createdBy?.name || 'Hệ thống'}
                        {selectedVersion.createdBy?.email ? ` (${selectedVersion.createdBy.email})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Changelog Card */}
                  <div className="p-4 rounded-xl bg-[#20111A] border border-rosewood-900/40 space-y-1.5">
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                      Ghi chú phát hành (Changelog)
                    </span>
                    <p className="text-xs text-parchment-200 leading-relaxed italic">
                      &quot;{selectedVersion.changelog || 'Không có mô tả chi tiết'}&quot;
                    </p>
                  </div>

                  {/* Snapshot Contents Summary */}
                  {selectedVersion.snapshot && (
                    <div className="p-4 rounded-xl bg-[#1C0F16] border border-rosewood-900/40 space-y-2">
                      <span className="text-[10px] font-mono text-champagne-300 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3 text-rosewood-400" />
                        <span>Cấu trúc nội dung snapshot</span>
                      </span>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-[#271520]">
                          <span className="block font-mono text-sm font-bold text-champagne-200">
                            {selectedVersion.snapshot.pages?.length || 0}
                          </span>
                          <span className="text-[10px] text-stone-400">Trang nội dung</span>
                        </div>

                        <div className="p-2 rounded-lg bg-[#271520]">
                          <span className="block font-mono text-sm font-bold text-champagne-200">
                            {selectedVersion.snapshot.pages?.reduce(
                              (sum: number, p: any) => sum + (p.elements?.length || 0),
                              0
                            ) || 0}
                          </span>
                          <span className="text-[10px] text-stone-400">Phần tử (Elements)</span>
                        </div>

                        <div className="p-2 rounded-lg bg-[#271520]">
                          <span className="block font-mono text-sm font-bold text-champagne-200">
                            {selectedVersion.snapshot.backgroundMusic ? 'Có' : 'Không'}
                          </span>
                          <span className="text-[10px] text-stone-400">Nhạc nền</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rollback Safety Notice */}
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-300">Quy tắc an toàn khi Rollback:</p>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Thao tác Rollback chỉ phục hồi lại các bảng nháp (Draft) trong database để bạn tiếp tục chỉnh sửa. Trang web công khai (Live Site) vẫn hiển thị bản xuất bản hiện tại cho đến khi bạn vào Preview và bấm &quot;Publish&quot; lại.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-stone-500 text-xs p-6 text-center">
                <History className="w-10 h-10 mb-2 opacity-40 text-rosewood-400" />
                <p>Chọn một phiên bản bên trái để xem chi tiết metadata và cấu trúc snapshot.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
