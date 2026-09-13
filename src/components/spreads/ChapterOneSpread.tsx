'use client';

import React from 'react';
import Image from 'next/image';
import { Quote } from 'lucide-react';
import RealtimeLoveCounter from '@/components/RealtimeLoveCounter';

export default function ChapterOneSpread() {
  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center select-none">
      {/* Left Page (Chapter Title, Date, Editorial narrative) */}
      <div className="space-y-4 pr-0 md:pr-6 border-b md:border-b-0 md:border-r border-rosewood-200/50 pb-4 md:pb-0">
        <div className="flex items-center justify-between text-xs text-rosewood-400 font-serif italic border-b border-rosewood-200/40 pb-2">
          <span>CHAPTER 01</span>
          <span>12.08.2022 — 20.10.2022</span>
        </div>

        <div>
          <span className="text-[11px] font-sans uppercase tracking-[0.25em] text-rosewood-500 font-semibold">
            The First Page
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink-900 font-semibold mt-1">
            Nơi Khởi Đầu
          </h2>
          <p className="font-script text-2xl text-rosewood-800">
            Ngày câu chuyện của hai ta lặng lẽ bắt đầu.
          </p>
        </div>

        <div className="font-serif text-ink-700 text-sm sm:text-base leading-relaxed space-y-3">
          <p>
            Có những cuộc gặp gỡ trong đời ngỡ như tình cờ, nhưng hóa ra lại là sự an bài dịu dàng nhất của số phận.
          </p>
          <p>
            Giữa biển người tấp nập, ánh mắt chạm nhau, một trang giấy trắng tinh khôi đã mở ra — nơi từng câu chữ sau này chỉ viết về em.
          </p>
          <div className="flex items-center gap-2 text-rosewood-800 italic pt-1">
            <Quote className="w-3.5 h-3.5 text-champagne-500 shrink-0" />
            <span>&quot;The day our story quietly began.&quot;</span>
          </div>
        </div>

        {/* Handwritten signature at bottom of left page */}
        <div className="pt-2 text-right">
          <span className="font-handwriting text-2xl text-rosewood-700">
            ~ Phúc &amp; Trang
          </span>
        </div>
      </div>

      {/* Right Page (Featured Polaroid Photo with Washi Tape & Live Love Counter) */}
      <div className="flex flex-col items-center justify-center space-y-4 pl-0 md:pl-4">
        <div className="relative bg-white p-3 pb-6 rounded-xs shadow-polaroid border border-stone-200 transform rotate-1 hover:rotate-0 transition-transform max-w-[240px] sm:max-w-[270px]">
          <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-5 z-10" />
          <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
            <Image
              src="/img/1.JPEG"
              alt="Chúng Mình"
              fill
              className="object-cover"
              priority
            />
          </div>
          <p className="font-handwriting text-xl text-center text-rosewood-900 mt-2">
            Nụ cười đầu tiên...
          </p>
        </div>

        {/* Real-time Ticking Counter */}
        <div className="w-full">
          <RealtimeLoveCounter />
        </div>
      </div>
    </div>
  );
}
