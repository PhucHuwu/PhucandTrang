'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, Sparkles } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function ChapterThreeSpread() {
  const photo1 = LOVE_STORY_DATA.gallery[2]; // img 3
  const photo2 = LOVE_STORY_DATA.gallery[3]; // img 4

  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center select-none">
      {/* Left Page (First Scrapbook Memory) */}
      <div className="space-y-4 pr-0 md:pr-6 border-b md:border-b-0 md:border-r border-rosewood-200/50 pb-4 md:pb-0 flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-xs text-rosewood-400 font-serif italic border-b border-rosewood-200/40 pb-2">
          <span>CHAPTER 03</span>
          <span>Scrapbook Memories</span>
        </div>

        <div className="text-center w-full">
          <span className="text-[11px] font-sans uppercase tracking-[0.25em] text-rosewood-500 font-semibold">
            Cherished Days
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink-900 font-semibold mt-1">
            Nụ Cười &amp; Ánh Mắt
          </h2>
        </div>

        {/* Polaroid 1 */}
        <div className="relative bg-white p-3 pb-6 rounded-xs shadow-polaroid border border-stone-200 transform -rotate-2 hover:rotate-0 transition-transform max-w-[240px] sm:max-w-[260px]">
          <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-5 z-10" />
          <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
            <Image
              src={photo1.src}
              alt={photo1.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="mt-2 text-center">
            <p className="font-serif font-semibold text-xs text-ink-800">{photo1.title}</p>
            <p className="font-handwriting text-lg text-rosewood-900 mt-1">
              &quot;{photo1.caption}&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Right Page (Second Scrapbook Memory) */}
      <div className="space-y-4 pl-0 md:pl-4 flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-xs text-rosewood-400 font-serif italic border-b border-rosewood-200/40 pb-2">
          <span>Tay Trong Tay</span>
          <span>Bên Nhau Bình Yên</span>
        </div>

        <div className="text-center w-full">
          <span className="text-[11px] font-sans uppercase tracking-[0.25em] text-rosewood-500 font-semibold">
            Hand in Hand
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink-900 font-semibold mt-1">
            Gom Góp Yêu Thương
          </h2>
        </div>

        {/* Polaroid 2 */}
        <div className="relative bg-white p-3 pb-6 rounded-xs shadow-polaroid border border-stone-200 transform rotate-2 hover:rotate-0 transition-transform max-w-[240px] sm:max-w-[260px]">
          <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-5 z-10" />
          <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
            <Image
              src={photo2.src}
              alt={photo2.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="mt-2 text-center">
            <p className="font-serif font-semibold text-xs text-ink-800">{photo2.title}</p>
            <p className="font-handwriting text-lg text-rosewood-900 mt-1">
              &quot;{photo2.caption}&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
