'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, Sparkles } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function PageMemoriesOne() {
  const photo1 = LOVE_STORY_DATA.gallery[1]; // img 2
  const photo2 = LOVE_STORY_DATA.gallery[2]; // img 3

  return (
    <div className="h-full flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rosewood-200/50 pb-2 text-xs text-rosewood-400 font-serif italic">
          <span>Scrapbook Tập 1</span>
          <span>Chapter III</span>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1 text-xs text-rosewood-500 font-serif mb-1">
            <Camera className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest text-[10px]">Cuộn Phim Kỷ Niệm</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-900 font-semibold tracking-tight">
            Nụ Cười &amp; Ánh Mắt
          </h2>
          <p className="font-handwriting text-2xl text-rosewood-800">
            Nơi nào có cậu, nơi đó có niềm vui
          </p>
        </div>

        {/* Dual Scrapbook Polaroids */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Photo 1 */}
          <div className="relative bg-white p-3 pb-5 rounded-xs shadow-polaroid border border-stone-200 transform -rotate-2 hover:rotate-0 transition-transform group">
            <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 z-10" />
            <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
              <Image
                src={photo1.src}
                alt={photo1.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] uppercase tracking-wider text-rosewood-400 font-sans border border-rosewood-100 px-1.5 py-0.5 rounded">
                Inseparable Souls
              </span>
              <p className="font-handwriting text-lg text-rosewood-900 mt-1">
                &quot;{photo1.caption}&quot;
              </p>
            </div>
          </div>

          {/* Photo 2 */}
          <div className="relative bg-white p-3 pb-5 rounded-xs shadow-polaroid border border-stone-200 transform rotate-2 hover:rotate-0 transition-transform group">
            <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 z-10" />
            <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
              <Image
                src={photo2.src}
                alt={photo2.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] uppercase tracking-wider text-rosewood-400 font-sans border border-rosewood-100 px-1.5 py-0.5 rounded">
                Love In Our Eyes
              </span>
              <p className="font-handwriting text-lg text-rosewood-900 mt-1">
                &quot;{photo2.caption}&quot;
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-3 border-t border-rosewood-100 text-[11px] font-serif italic text-ink-400">
        — Trang nhật ký thứ 3 / Ký ức ngọt ngào —
      </div>
    </div>
  );
}
