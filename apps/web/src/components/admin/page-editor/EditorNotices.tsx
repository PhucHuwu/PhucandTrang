'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { PageConflictInfo, PageDraft } from '@/hooks/useAutosavePage';

export interface EditorNoticesProps {
  otherTabOpen: boolean;
  draftOffer: { draft: PageDraft; serverIds: string[] } | null;
  conflict: PageConflictInfo | null;
  conflictDismissed: boolean;
  handleRestoreDraft: () => void;
  handleDiscardDraft: () => void;
  setConflictDismissed: (dismissed: boolean) => void;
}

/** Banners under the header: page open in another tab, restorable local draft, paused autosave after a conflict. */
export default function EditorNotices({
  otherTabOpen,
  draftOffer,
  conflict,
  conflictDismissed,
  handleRestoreDraft,
  handleDiscardDraft,
  setConflictDismissed,
}: EditorNoticesProps) {
  if (!(otherTabOpen || draftOffer || (conflict && conflictDismissed))) return null;
  return (
    <div className="shrink-0 z-20 flex flex-col">
      {otherTabOpen && (
        <div
          role="alert"
          className="px-3 py-2 bg-amber-950/80 border-b border-amber-700/50 text-amber-200 text-xs flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Trang này đang được mở ở một tab khác. Chỉnh sửa ở hai nơi cùng lúc có thể ghi đè lên nhau — hãy đóng
            bớt một tab.
          </span>
        </div>
      )}
      {draftOffer && (
        <div
          role="alert"
          aria-label="Bản nháp chưa lưu"
          className="px-3 py-2 bg-sky-950/80 border-b border-sky-700/50 text-sky-200 text-xs flex flex-wrap items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-sky-400" />
          <span className="flex-1 min-w-0">
            Có bản nháp chưa lưu trên trình duyệt này (
            {new Date(draftOffer.draft.savedAt).toLocaleString('vi-VN')}), khác với bản trên máy chủ. Nếu trang đã
            được sửa ở nơi khác sau đó, bạn sẽ được hỏi trước khi ghi đè.
          </span>
          <button
            type="button"
            onClick={handleRestoreDraft}
            className="h-8 px-3 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-medium"
          >
            Khôi phục bản nháp
          </button>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="h-8 px-3 rounded-lg text-sky-300 hover:text-white"
          >
            Bỏ bản nháp
          </button>
        </div>
      )}
      {conflict && conflictDismissed && (
        <div
          role="alert"
          className="px-3 py-2 bg-amber-950/80 border-b border-amber-700/50 text-amber-200 text-xs flex flex-wrap items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="flex-1 min-w-0">Tự động lưu đang tạm dừng vì trang đã được thay đổi ở nơi khác.</span>
          <button
            type="button"
            onClick={() => setConflictDismissed(false)}
            className="h-8 px-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-medium"
          >
            Giải quyết xung đột
          </button>
        </div>
      )}
    </div>
  );
}
