'use client';

import React from 'react';
import Link from 'next/link';
import { Layers } from 'lucide-react';

export default function CoverSettingsTab() {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rosewood-950/60 to-[#2A1120] border border-rosewood-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-serif font-bold text-champagne-300">
            Visual Cover Studio
          </h3>
          <p className="text-xs text-stone-400 mt-1 max-w-lg leading-relaxed">
            Thiết kế đồ họa trực quan chuẩn xác cho Bìa trước, Mặt trong và Mặt ngoài bìa sau (Canvas 1024×1360px, hỗ trợ Text, Image, Video, Shapes, Background effects).
          </p>
        </div>

        <Link
          href="/admin/cover"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white text-xs font-semibold shadow-lg shadow-rosewood-950/50 transition active:scale-95 shrink-0"
        >
          <Layers className="w-4 h-4" />
          <span>Mở Visual Cover Studio</span>
        </Link>
      </div>
    </div>
  );
}
