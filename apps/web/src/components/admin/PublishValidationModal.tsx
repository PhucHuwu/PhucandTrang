'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ValidationReport,
  ValidationIssue,
  publishAdminBook,
} from '@/services/adminApi';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Send,
  Loader2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface PublishValidationModalProps {
  bookId: string;
  bookTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  report: ValidationReport | null;
  onPublishSuccess?: (publishedRevision: number) => void;
}

export default function PublishValidationModal({
  bookId,
  bookTitle = 'Cuốn sách',
  isOpen,
  onClose,
  report,
  onPublishSuccess,
}: PublishValidationModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [changelog, setChangelog] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !report) return null;

  const errors = report.issues.filter((i) => i.severity === 'ERROR');
  const warnings = report.issues.filter((i) => i.severity === 'WARNING');

  const handleProceedPublish = async () => {
    if (!report.isValid || publishing) return;

    try {
      setPublishing(true);
      setErrorMsg(null);
      const res = await publishAdminBook(bookId, changelog.trim() || undefined);
      alert(res.message);
      if (onPublishSuccess) {
        onPublishSuccess(res.publishedRevision);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi khi xuất bản sách');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#170E14] border border-rosewood-800/60 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-parchment-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-rosewood-900/50 bg-[#1D1019] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                report.isValid
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400'
                  : 'bg-rose-950/70 border-rose-500/50 text-rose-400'
              }`}
            >
              {report.isValid ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-champagne-300 leading-tight">
                {report.isValid ? 'Kiểm Tra Toàn Vẹn Xuất Bản: ĐẠT' : 'Phát Hiện Lỗi Cản Trở Xuất Bản'}
              </h2>
              <p className="text-xs text-stone-400">
                {bookTitle} • {report.errorCount} lỗi chặn (Blocking Errors) • {report.warningCount} cảnh báo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-rosewood-900/40 text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification banner if server rejects */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border-b border-rose-600/50 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Issues List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary Status Box */}
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              report.isValid
                ? 'bg-emerald-950/30 border-emerald-700/40 text-emerald-200'
                : 'bg-rose-950/30 border-rose-700/40 text-rose-200'
            }`}
          >
            {report.isValid ? (
              <p>
                Toàn bộ cấu trúc sách, trang, ảnh, video, âm thanh và liên kết đều hợp lệ. Bạn có thể tiến hành xuất bản ngay để độc giả thưởng thức trên Live Public Site.
              </p>
            ) : (
              <p>
                <strong>Không thể xuất bản:</strong> Sách chứa {report.errorCount} lỗi nghiêm trọng cần khắc phục trước khi đóng gói snapshot công khai. Nhấp vào nút &quot;Khắc phục&quot; ở từng mục để chuyển nhanh đến màn hình chỉnh sửa tương ứng.
              </p>
            )}
          </div>

          {/* BLOCKING ERRORS LIST */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Lỗi cản trở xuất bản (Blocking Errors — {errors.length})</span>
              </span>

              <div className="space-y-2">
                {errors.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl bg-[#221016] border border-rose-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-700/50">
                          {issue.code}
                        </span>
                        {issue.location.pageNumber !== undefined && (
                          <span className="text-[11px] text-stone-400 font-mono">
                            Trang {issue.location.pageNumber}
                          </span>
                        )}
                        {issue.location.elementType && (
                          <span className="text-[11px] text-champagne-300 font-mono">
                            [{issue.location.elementType}]
                          </span>
                        )}
                      </div>
                      <p className="text-parchment-200">{issue.message}</p>
                    </div>

                    {issue.fixLink && (
                      <Link
                        href={issue.fixLink}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rosewood-900/60 hover:bg-rosewood-800 text-champagne-300 hover:text-white border border-rosewood-700/60 font-medium text-[11px] transition shrink-0 self-start sm:self-auto"
                      >
                        <span>Khắc phục</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NON-BLOCKING WARNINGS LIST */}
          {warnings.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Cảnh báo khuyến nghị (Warnings — {warnings.length})</span>
              </span>

              <div className="space-y-2">
                {warnings.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl bg-[#1F1514] border border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-700/50">
                          {issue.code}
                        </span>
                        {issue.location.pageNumber !== undefined && (
                          <span className="text-[11px] text-stone-400 font-mono">
                            Trang {issue.location.pageNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-stone-300">{issue.message}</p>
                    </div>

                    {issue.fixLink && (
                      <Link
                        href={issue.fixLink}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2A1D1C] hover:bg-[#352524] text-amber-300 hover:text-white border border-amber-800/50 font-medium text-[11px] transition shrink-0 self-start sm:self-auto"
                      >
                        <span>Xem</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Changelog Input if Valid */}
          {report.isValid && (
            <div className="pt-2 border-t border-rosewood-900/40 space-y-1.5">
              <label className="block text-xs font-mono text-stone-300">
                Ghi chú phát hành phiên bản mới (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="VD: Cập nhật video kỷ niệm 26-06 và hoàn thiện trang 5"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                className="w-full px-3 py-2 bg-[#20111A] border border-rosewood-900/60 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#1A0E15] border-t border-rosewood-900/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition"
          >
            Đóng
          </button>

          {report.isValid ? (
            <button
              type="button"
              onClick={handleProceedPublish}
              disabled={publishing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition active:scale-95 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{publishing ? 'Đang xuất bản...' : 'Xác nhận xuất bản (Publish)'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/40 text-stone-500 text-xs font-medium cursor-not-allowed border border-rose-900/40"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Bị khóa do có {report.errorCount} lỗi chặn</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
