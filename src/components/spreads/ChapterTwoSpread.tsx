'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, Calendar, Sparkles } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function ChapterTwoSpread() {
  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center select-none">
      {/* Left Page (The Confession proposal box) */}
      <div className="space-y-4 pr-0 md:pr-6 border-b md:border-b-0 md:border-r border-rosewood-200/50 pb-4 md:pb-0">
        <div className="flex items-center justify-between text-xs text-rosewood-400 font-serif italic border-b border-rosewood-200/40 pb-2">
          <span>CHAPTER 02</span>
          <span>20.10.2022</span>
        </div>

        <div>
          <span className="text-[11px] font-sans uppercase tracking-[0.25em] text-rosewood-500 font-semibold">
            The Confession
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink-900 font-semibold mt-1">
            Khoảnh Khắc Diệu Kỳ
          </h2>
          <p className="font-script text-2xl text-rosewood-800">
            Giây phút trái tim tìm thấy nhau
          </p>
        </div>

        {/* Vintage Confession Box */}
        <div className="bg-parchment-100/90 border border-rosewood-200/80 rounded-xl p-5 text-center space-y-3 relative overflow-hidden shadow-xs">
          <div className="w-8 h-8 mx-auto rounded-full bg-rosewood-100 text-rosewood-600 flex items-center justify-center">
            <Heart className="w-4 h-4 fill-rosewood-500" />
          </div>

          <p className="font-serif italic text-xs sm:text-sm text-ink-500">
            Câu nói ngập ngừng nhưng chân thành nhất của tuổi trẻ:
          </p>

          <div className="py-2 border-y border-dashed border-rosewood-300">
            <p className="font-handwriting text-2xl sm:text-3xl text-rosewood-900 font-bold leading-relaxed">
              &quot;{LOVE_STORY_DATA.couple.proposalQuote}&quot;
            </p>
          </div>

          <p className="font-serif text-xs sm:text-sm text-ink-700 leading-relaxed">
            Và cái gật đầu cùng nụ cười rạng rỡ của em ngày 20.10 năm ấy đã biến khoảnh khắc ấy trở thành ngày hạnh phúc nhất đời tớ.
          </p>
        </div>

        <div className="flex items-center gap-2 text-rosewood-500 text-xs font-serif italic pt-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>Kỷ niệm tròn đầy từ mùa thu năm 2022</span>
        </div>
      </div>

      {/* Right Page (Polaroid with handwritten confession notes) */}
      <div className="flex flex-col items-center justify-center space-y-4 pl-0 md:pl-4">
        <div className="relative bg-white p-3 pb-6 rounded-xs shadow-polaroid border border-stone-200 transform -rotate-2 hover:rotate-0 transition-transform max-w-[240px] sm:max-w-[270px]">
          <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-5 z-10" />
          <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
            <Image
              src="/img/2.JPEG"
              alt="Moment 20.10"
              fill
              className="object-cover"
            />
          </div>
          <p className="font-handwriting text-xl text-center text-rosewood-900 mt-2">
            Inseparable Souls
          </p>
        </div>

        <div className="w-full bg-parchment-100/50 p-4 rounded-lg border border-rosewood-100/80 font-serif text-xs sm:text-sm text-ink-700 leading-relaxed">
          <div className="flex items-center gap-1.5 text-rosewood-600 font-semibold text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trích từ cuốn nhật ký:</span>
          </div>
          <p>
            &quot;Kể từ giây phút ấy, chúng mình cùng nhau bước qua những cơn mưa rào, đón những mùa thu vàng ấm áp và viết nên câu chuyện chỉ riêng hai người hiểu.&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
