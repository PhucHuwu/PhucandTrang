'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Send, History } from 'lucide-react';
import { Page } from '@/types/book';
import AutosaveIndicator from '@/components/admin/AutosaveIndicator';
import type { AutosaveStatus } from '@/hooks/useAutosavePage';

export interface EditorHeaderProps {
  page: Page;
  navigateAway: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  autosaveStatus: AutosaveStatus;
  lastSavedTime: Date | null;
  autosaveError: string | null;
  retrySave: () => void;
  flushAutosave: () => Promise<boolean>;
  setShowHistoryModal: (open: boolean) => void;
  handlePublishClick: () => void;
  publishing: boolean;
  saving: boolean;
  onSave: () => void;
}

/** Top application bar: back link, page title / badges, autosave state and the history / preview / publish / save actions. */
export default function EditorHeader({
  page,
  navigateAway,
  autosaveStatus,
  lastSavedTime,
  autosaveError,
  retrySave,
  flushAutosave,
  setShowHistoryModal,
  handlePublishClick,
  publishing,
  saving,
  onSave,
}: EditorHeaderProps) {
  return (
    <div className="editor-header bg-[#160D12] border-b border-rosewood-900/50 px-2 py-1.5 lg:px-4 flex items-center gap-2 shrink-0 z-30">
      <Link
        href="/admin/pages"
        onClick={(e) => navigateAway(e, '/admin/pages')}
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 border border-rosewood-900/40 transition-colors"
        title="Quay lại danh sách trang"
        aria-label="Quay lại danh sách trang"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <div className="flex-1 min-w-0">
        <h1 className="font-serif font-bold text-sm tracking-wide text-parchment-100 truncate" title={page.title || ''}>
          {page.pageNumber === 0 ? 'Lời ngỏ' : `Trang ${page.pageNumber}`}: {page.title || '(Không tiêu đề)'}
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <span className="px-1.5 rounded text-[10px] font-mono bg-rosewood-950 text-champagne-300 border border-rosewood-800/40">
            {page.side}
          </span>
          <span
            className={`px-1.5 rounded text-[10px] font-mono border truncate ${
              page.isCustomized
                ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {page.isCustomized ? 'Tùy biến' : `Template: ${page.layoutTemplateId || page.layout || 'Chưa chọn'}`}
          </span>
        </div>
      </div>

      <div className="editor-header-actions flex items-center gap-1.5 shrink-0">
        <AutosaveIndicator
          status={autosaveStatus}
          lastSavedTime={lastSavedTime}
          errorMessage={autosaveError}
          onRetry={retrySave}
        />

        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="h-10 flex items-center gap-1.5 px-2.5 rounded-lg bg-[#20111A] hover:bg-[#2C1923] text-amber-300 border border-rosewood-900/40 text-xs font-medium transition"
          title="Lịch sử phiên bản và Rollback"
          aria-label="Lịch sử phiên bản"
        >
          <History className="w-4 h-4 text-amber-400" />
          <span className="editor-header-label">Lịch sử</span>
        </button>

        <Link
          href="/admin/preview"
          target="_blank"
          onClick={(e) => {
            if (autosaveStatus === 'saved') return;
            // Open the tab synchronously (popup blockers), then navigate once pending edits are saved
            e.preventDefault();
            const previewTab = window.open('about:blank', '_blank');
            flushAutosave().finally(() => {
              if (previewTab) previewTab.location.href = '/admin/preview';
              else window.location.href = '/admin/preview';
            });
          }}
          className="h-10 flex items-center gap-1.5 px-2.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-xs font-medium transition"
          title="Xem trước bản nháp trên 3D Flipbook"
          aria-label="Xem trước bản nháp"
        >
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="editor-header-label">Preview</span>
        </Link>

        <button
          type="button"
          onClick={handlePublishClick}
          disabled={publishing}
          className="h-10 flex items-center gap-1.5 px-2.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-medium transition disabled:opacity-50"
          title="Đóng gói snapshot và xuất bản công khai"
          aria-label="Publish"
        >
          <Send className="w-4 h-4" />
          <span className="editor-header-label">{publishing ? 'Đang xuất bản...' : 'Publish'}</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || autosaveStatus === 'saving'}
          className="h-10 flex items-center gap-1.5 px-3 rounded-lg bg-rosewood-600 hover:bg-rosewood-500 text-white text-xs font-semibold transition active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving || autosaveStatus === 'saving' ? 'Đang lưu...' : 'Lưu'}</span>
        </button>
      </div>
    </div>
  );
}
