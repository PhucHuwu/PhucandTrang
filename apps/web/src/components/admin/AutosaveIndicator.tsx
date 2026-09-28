'use client';

import React from 'react';
import { AutosaveStatus } from '@/hooks/useAutosavePage';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, Clock } from 'lucide-react';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedTime?: Date | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export default function AutosaveIndicator({
  status,
  lastSavedTime,
  errorMessage,
  onRetry,
}: AutosaveIndicatorProps) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-600/40 text-sky-300 text-xs font-mono animate-pulse">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
        <span>Saving...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-600/50 text-rose-300 text-xs font-mono">
        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span className="truncate max-w-[140px]" title={errorMessage || 'Lỗi lưu dữ liệu'}>
          {errorMessage || 'Lỗi lưu'}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-white text-[10px] transition"
            title="Thử lưu lại"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Thử lại</span>
          </button>
        )}
      </div>
    );
  }

  if (status === 'unsaved') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Unsaved</span>
      </div>
    );
  }

  // status === 'saved'
  const timeFormatted = lastSavedTime
    ? lastSavedTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-700/40 text-emerald-400 text-xs font-mono"
      title={timeFormatted ? `Đã lưu lúc ${timeFormatted}` : 'Đã lưu tất cả thay đổi'}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      <span>Saved</span>
      {timeFormatted && <span className="text-[10px] text-emerald-500/70 hidden sm:inline">({timeFormatted})</span>}
    </div>
  );
}
