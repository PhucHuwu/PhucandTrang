'use client';

import React from 'react';
import InteractiveLoveLetter from '@/components/InteractiveLoveLetter';

export default function PageLoveLetter() {
  return (
    <div className="h-full flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-6">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rosewood-200/50 pb-2 text-xs text-rosewood-400 font-serif italic">
          <span>Gửi người thương</span>
          <span>Chapter V</span>
        </div>

        <div className="text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-900 font-semibold tracking-tight">
            Bức Thư Tay Gửi Trang
          </h2>
          <p className="font-script text-xl sm:text-2xl text-rosewood-800">
            Tâm tư cất giấu nơi đáy lòng
          </p>
        </div>

        {/* Envelope Component inside the page */}
        <div className="pt-2">
          <InteractiveLoveLetter />
        </div>
      </div>

      <div className="text-center pt-2 border-t border-rosewood-100 text-[11px] font-serif italic text-ink-400">
        — Trang nhật ký thứ 5 / Lời thì thầm chân thành —
      </div>
    </div>
  );
}
