'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, Sparkles } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function PageMemoriesTwo() {
  const photo3 = LOVE_STORY_DATA.gallery[3]; // img 4
  const photo4 = LOVE_STORY_DATA.gallery[4]; // img 5

  return (
    <div className="h-full flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rosewood-200/50 pb-2 text-xs text-rosewood-400 font-serif italic">
          <span>Scrapbook Tập 2</span>
          <span>Chapter IV</span>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1 text-xs text-rosewood-500 font-serif mb-1">
            <Camera className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest text-[10px]">Từng Chuyến Đi Cùng Nhau</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-900 font-semibold tracking-tight">
            Tay Trong Tay Đi Muôn Nơi
          </h2>
          <p className="font-handwriting text-2xl text-rosewood-800">
            Điểm đến không quan trọng bằng người đồng hành
          </p>
        </div>

        {/* Dual Scrapbook Polaroids */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Photo 3 */}
          <div className="relative bg-white p-3 pb-5 rounded-xs shadow-polaroid border border-stone-200 transform rotate-1 hover:rotate-0 transition-transform group">
            <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 z-10" />
            <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
              <Image
                src={photo3.src}
                alt={photo3.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] uppercase tracking-wider text-rosewood-400 font-sans border border-rosewood-100 px-1.5 py-0.5 rounded">
                Hand In Hand
              </span>
              <p className="font-handwriting text-lg text-rosewood-900 mt-1">
                &quot;{photo3.caption}&quot;
              </p>
            </div>
          </div>

          {/* Photo 4 */}
          <div className="relative bg-white p-3 pb-5 rounded-xs shadow-polaroid border border-stone-200 transform -rotate-1 hover:rotate-0 transition-transform group">
            <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 z-10" />
            <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
              <Image
                src={photo4.src}
                alt={photo4.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] uppercase tracking-wider text-rosewood-400 font-sans border border-rosewood-100 px-1.5 py-0.5 rounded">
                Loving You Forever
              </span>
              <p className="font-handwriting text-lg text-rosewood-900 mt-1">
                &quot;{photo4.caption}&quot;
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-3 border-t border-rosewood-100 text-[11px] font-serif italic text-ink-400">
        — Trang nhật ký thứ 4 / Bước cùng năm tháng —
      </div>
    </div>
  );
}
