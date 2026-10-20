'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import DialogPortal from '@/components/admin/DialogPortal';
import { useAdminDialog } from '@/hooks/useAdminDialog';

export default function ConflictDialog({
  open,
  busy,
  onReload,
  onOverwrite,
  onClose,
}: {
  open: boolean;
  busy: boolean;
  onReload: () => void;
  onOverwrite: () => void;
  onClose: () => void;
}) {
  const dialogRef = useAdminDialog(open, onClose);
  if (!open) return null;
  return (
    <DialogPortal>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Xung đột chỉnh sửa"
        className="cms-dialog fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md select-none"
      >
        <div className="cms-dialog-panel relative w-full sm:max-w-md bg-[#180E14] border border-amber-700/60 rounded-t-2xl sm:rounded-2xl shadow-2xl text-parchment-100 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-sm">
              <h2 className="font-serif font-bold text-champagne-300">Trang đã được thay đổi ở nơi khác</h2>
              <p className="text-stone-300 text-xs leading-relaxed">
                Trang này vừa được lưu từ một tab hoặc thiết bị khác. Tự động lưu đã tạm dừng để không ghi đè
                lên thay đổi đó.
              </p>
              <p className="text-stone-400 text-xs leading-relaxed">
                Chọn <strong>Tải bản mới nhất</strong> để bỏ các chỉnh sửa chưa lưu ở đây, hoặc <strong>Ghi đè</strong>{' '}
                để thay bản trên máy chủ bằng nội dung bạn đang thấy.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-10 px-3 rounded-lg text-xs text-stone-400 hover:text-stone-200 disabled:opacity-50"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={onReload}
              disabled={busy}
              className="h-10 px-3 rounded-lg bg-[#25151F] hover:bg-[#331C2A] border border-rosewood-800/60 text-xs font-medium text-parchment-100 disabled:opacity-50"
            >
              Tải bản mới nhất
            </button>
            <button
              type="button"
              onClick={onOverwrite}
              disabled={busy}
              className="h-10 px-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-xs font-semibold text-white disabled:opacity-50"
            >
              Ghi đè
            </button>
          </div>
        </div>
      </div>
    </DialogPortal>
  );
}
