'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, Heart } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

interface PhotoItem {
  id: number;
  src: string;
  title: string;
  caption: string;
  rotation: string;
  stamp: string;
}

export default function ScrapbookGallery() {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  return (
    <div className="my-10">
      <div className="text-center mb-8">
        <span className="text-xs uppercase tracking-[0.3em] text-rosewood-400 font-sans font-semibold">
          Scrapbook Memoir
        </span>
        <h3 className="font-serif text-2xl sm:text-3xl font-medium text-ink-900 mt-1">
          Những Bức Ảnh Kỷ Niệm
        </h3>
        <p className="font-script text-xl sm:text-2xl text-rosewood-800 mt-1">
          Từng khoảnh khắc đọng lại mãi trên mặt giấy
        </p>
      </div>

      {/* Polaroid Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-6 px-2 sm:px-6">
        {LOVE_STORY_DATA.gallery.map((photo, index) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className={`group cursor-pointer transform transition-all duration-500 hover:scale-105 hover:z-20 hover:rotate-0 ${photo.rotation}`}
          >
            {/* Polaroid card wrapper */}
            <div className="bg-white p-3 sm:p-4 rounded-sm shadow-polaroid border border-stone-200/80 relative overflow-hidden transition-shadow group-hover:shadow-2xl">
              {/* Fake Washi Tape on top */}
              <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-5 z-10 border border-stone-300/40 opacity-80" />

              {/* Image box */}
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xs bg-stone-100">
                <Image
                  src={photo.src}
                  alt={photo.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-white text-xs font-serif italic flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-champagne-400" />
                    Chạm để xem rõ hơn
                  </span>
                </div>
              </div>

              {/* Handwritten Note underneath */}
              <div className="pt-3 pb-1 px-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-serif font-semibold text-sm sm:text-base text-ink-800">
                    {photo.title}
                  </h4>
                  <span className="text-[10px] font-sans uppercase tracking-widest text-rosewood-400 px-1.5 py-0.5 border border-rosewood-200/60 rounded">
                    {photo.stamp}
                  </span>
                </div>
                <p className="font-handwriting text-xl sm:text-2xl text-rosewood-800 mt-1 line-clamp-2 leading-tight">
                  &quot;{photo.caption}&quot;
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-parchment-50 rounded-lg p-4 sm:p-6 shadow-2xl border border-rosewood-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-ink-700 hover:text-rosewood-800 shadow-lg flex items-center justify-center transition-transform hover:scale-110"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative aspect-[4/5] sm:aspect-[4/3] w-full rounded overflow-hidden shadow-inner bg-black">
              <Image
                src={selectedPhoto.src}
                alt={selectedPhoto.title}
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs uppercase tracking-widest text-rosewood-500 font-semibold">
                Kỷ Niệm Của Phúc & Trang
              </span>
              <h3 className="font-serif text-2xl font-semibold text-ink-900 mt-1">
                {selectedPhoto.title}
              </h3>
              <p className="font-handwriting text-2xl sm:text-3xl text-rosewood-800 mt-2 px-4 leading-relaxed">
                &quot;{selectedPhoto.caption}&quot;
              </p>
              <div className="flex justify-center items-center gap-1 text-rosewood-400 mt-3 text-xs">
                <Heart className="w-3.5 h-3.5 fill-rosewood-400" />
                <span>Khoảnh khắc vĩnh cửu</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
