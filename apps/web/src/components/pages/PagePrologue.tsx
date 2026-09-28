'use client';

import React from 'react';
import Image from 'next/image';
import { Quote } from 'lucide-react';
import RealtimeLoveCounter from '@/components/RealtimeLoveCounter';

export default function PagePrologue() {
  return (
    <div className="h-full flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-6">
      <div className="space-y-4">
        {/* Decorative Top header */}
        <div className="flex items-center justify-between border-b border-rosewood-200/50 pb-2 text-xs text-rosewood-400 font-serif italic">
          <span>Khởi đầu hành trình</span>
          <span>Chapter I</span>
        </div>

        <div className="text-center">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-900 font-semibold tracking-tight">
            Nơi Tình Yêu Bắt Đầu
          </h2>
          <p className="font-handwriting text-2xl sm:text-3xl text-rosewood-800 mt-1">
            Những dòng nhật ký đầu tiên...
          </p>
        </div>

        {/* Narrative & Photo in scrapbook format */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
          <div className="md:col-span-7 space-y-3 font-serif text-ink-700 text-sm sm:text-base leading-relaxed">
            <p>
              Có những cuộc gặp gỡ ngỡ như tình cờ của định mệnh. Vào một ngày thu thật đẹp, ánh mắt hai đứa chạm nhau và thế giới bỗng chốc trở nên êm dịu đến lạ thường.
            </p>
            <p>
              Cuốn nhật ký này được viết ra để gìn giữ từng nụ cười, từng chuyến đi và những khoảnh khắc thanh xuân ngọt ngào nhất mà Phúc và Trang cùng nhau bước qua.
            </p>
            <div className="flex items-center gap-2 text-rosewood-800 italic text-xs sm:text-sm pt-1">
              <Quote className="w-3.5 h-3.5 text-champagne-500 shrink-0" />
              <span>&quot;Vạn vật trên đời dường như đều muốn hai ta bên nhau.&quot;</span>
            </div>
          </div>

          {/* Polaroid Photo with Washi Tape */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative bg-white p-2.5 sm:p-3 pb-4 rounded-xs shadow-polaroid border border-stone-200 max-w-[200px] sm:max-w-[220px] transform -rotate-2 hover:rotate-0 transition-transform">
              <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 z-10" />
              <div className="relative aspect-[4/5] w-full rounded overflow-hidden">
                <Image
                  src="/img/1.JPEG"
                  alt="Phúc & Trang"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <p className="font-handwriting text-xl text-center text-rosewood-900 mt-2">
                Ánh nhìn đầu tiên
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Love Counter at page bottom */}
      <div className="pt-2">
        <RealtimeLoveCounter />
      </div>
    </div>
  );
}
