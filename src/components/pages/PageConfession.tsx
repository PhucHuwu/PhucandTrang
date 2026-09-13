'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, Calendar, Sparkles } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function PageConfession() {
  return (
    <div className="h-full flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rosewood-200/50 pb-2 text-xs text-rosewood-400 font-serif italic">
          <span>Ngày định mệnh</span>
          <span>Chapter II</span>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rosewood-50 border border-rosewood-200 text-rosewood-600 text-xs font-serif italic mb-1">
            <Calendar className="w-3 h-3" />
            <span>20 tháng 10 năm 2022</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-900 font-semibold tracking-tight">
            Khoảnh Khắc Diệu Kỳ
          </h2>
          <p className="font-script text-xl sm:text-2xl text-rosewood-800">
            Giây phút trái tim tìm thấy nhau
          </p>
        </div>

        {/* Confession Box */}
        <div className="bg-parchment-100/90 border border-rosewood-200/80 rounded-xl p-4 sm:p-6 text-center space-y-3 relative overflow-hidden shadow-xs">
          <div className="w-8 h-8 mx-auto rounded-full bg-rosewood-100 text-rosewood-600 flex items-center justify-center">
            <Heart className="w-4 h-4 fill-rosewood-500" />
          </div>

          <p className="font-serif italic text-xs sm:text-sm text-ink-500">
            Câu nói ngập ngừng nhưng chân thành nhất của tuổi trẻ:
          </p>

          <div className="py-2 border-y border-dashed border-rosewood-300">
            <p className="font-handwriting text-2xl sm:text-4xl text-rosewood-900 font-bold leading-relaxed">
              &quot;{LOVE_STORY_DATA.couple.proposalQuote}&quot;
            </p>
          </div>

          <p className="font-serif text-xs sm:text-sm text-ink-700 leading-relaxed max-w-lg mx-auto">
            Và nụ cười dịu dàng cùng cái gật đầu của em ngày hôm ấy đã biến ngày 20.10.2022 trở thành ngày hạnh phúc nhất trần đời của tớ.
          </p>
        </div>

        {/* Polaroid Memory of this chapter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
          <div className="relative bg-white p-2.5 pb-4 rounded-xs shadow-polaroid border border-stone-200 max-w-[210px] mx-auto transform rotate-1">
            <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 z-10" />
            <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
              <Image
                src="/img/2.JPEG"
                alt="20.10.2022"
                fill
                className="object-cover"
              />
            </div>
            <p className="font-handwriting text-lg text-center text-rosewood-800 mt-2">
              Bàn tay nắm lấy bàn tay
            </p>
          </div>

          <div className="font-serif text-xs sm:text-sm text-ink-700 space-y-2 leading-relaxed">
            <div className="flex items-center gap-1.5 text-rosewood-600 font-semibold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ghi chú từ cuốn sổ:</span>
            </div>
            <p>
              &quot;Kể từ ngày hôm đó, hai cuộc đời đã hòa làm một. Chúng mình cùng nhau san sẻ những buồn vui, cùng đi qua những cơn mưa rào mùa hạ và cả những ngày đông ấm áp.&quot;
            </p>
          </div>
        </div>
      </div>

      <div className="text-center pt-3 border-t border-rosewood-100 text-[11px] font-serif italic text-ink-400">
        — Trang nhật ký thứ 2 / Kỷ niệm 20.10.2022 —
      </div>
    </div>
  );
}
