'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function PageEpilogue() {
  return (
    <div className="h-full flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rosewood-200/50 pb-2 text-xs text-rosewood-400 font-serif italic">
          <span>Hẹn ước mai sau</span>
          <span>Chapter VI</span>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-rosewood-50 border border-rosewood-200 text-rosewood-600 flex items-center justify-center mb-2">
            <InfinityIcon className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl sm:text-4xl text-ink-900 font-semibold tracking-tight">
            Mãi Mãi Về Sau
          </h2>
          <p className="font-handwriting text-2xl sm:text-3xl text-rosewood-800 mt-1">
            Hành trình này sẽ không có trang cuối...
          </p>
        </div>

        <div className="bg-parchment-100/60 p-6 rounded-xl border border-rosewood-200/60 max-w-lg mx-auto text-center space-y-4">
          <p className="font-serif text-ink-700 text-sm sm:text-base leading-relaxed">
            Mỗi ngày trôi qua, cuốn nhật ký tình yêu của Phúc &amp; Trang lại được dày thêm bởi những tiếng cười, những bữa ăn ấm cúng, và cả những dự định tương lai.
          </p>
          <p className="font-serif text-ink-700 text-sm sm:text-base leading-relaxed">
            Dù sau này tóc có điểm hoa râm, năm tháng có đổi thay, tình cảm này vẫn sẽ nguyên vẹn như ngày đầu tiên ta trao nhau ánh nhìn ngượng ngùng ấy.
          </p>

          <div className="pt-2">
            <p className="font-handwriting text-3xl text-rosewood-900 font-bold">
              &quot;Yêu em đến tận cùng những năm tháng dịu dàng.&quot;
            </p>
          </div>
        </div>

        <div className="flex justify-center items-center gap-3 text-rosewood-500 text-xs font-serif italic">
          <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
          <span>Phúc &amp; Trang • Since 20.10.2022</span>
          <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
        </div>
      </div>

      <div className="text-center pt-3 border-t border-rosewood-100 text-[11px] font-serif italic text-ink-400">
        — Trang nhật ký thứ 6 / Lời kết mở cho tương lai —
      </div>
    </div>
  );
}
