'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { EditorToastMessage } from './types';

export default function EditorToast({ toast }: { toast: EditorToastMessage | null }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] max-w-[calc(100vw-2rem)] px-4 py-2 rounded-xl border text-xs flex items-center gap-2 shadow-lg ${
        toast.tone === 'warning'
          ? 'bg-amber-950/95 border-amber-600/50 text-amber-200'
          : 'bg-emerald-950/95 border-emerald-600/50 text-emerald-300'
      }`}
    >
      {toast.tone === 'warning' ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      )}
      <span>{toast.message}</span>
    </div>
  );
}
