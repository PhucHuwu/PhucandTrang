'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bookmark, BookOpen, Feather } from 'lucide-react';
import { gsap } from 'gsap';
import PagePrologue from './pages/PagePrologue';
import PageConfession from './pages/PageConfession';
import PageMemoriesOne from './pages/PageMemoriesOne';
import PageMemoriesTwo from './pages/PageMemoriesTwo';
import PageLoveLetter from './pages/PageLoveLetter';
import PageEpilogue from './pages/PageEpilogue';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function BookPageFlipper() {
  const [currentPage, setCurrentPage] = useState(0); // 0 to 5
  const [isFlipping, setIsFlipping] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  const pages = [
    { id: 'prologue', component: <PagePrologue />, title: 'Lời Mở Đầu' },
    { id: 'confession', component: <PageConfession />, title: 'Khoảnh Khắc 20.10' },
    { id: 'memories-1', component: <PageMemoriesOne />, title: 'Ký Ức Đôi Ta (1)' },
    { id: 'memories-2', component: <PageMemoriesTwo />, title: 'Ký Ức Đôi Ta (2)' },
    { id: 'love-letter', component: <PageLoveLetter />, title: 'Bức Thư Tình' },
    { id: 'epilogue', component: <PageEpilogue />, title: 'Mãi Mãi Về Sau' },
  ];

  const totalPages = pages.length;

  const flipToPage = (targetPageIndex: number) => {
    if (isFlipping || targetPageIndex === currentPage || targetPageIndex < 0 || targetPageIndex >= totalPages) {
      return;
    }

    setIsFlipping(true);
    const isForward = targetPageIndex > currentPage;

    const el = pageContainerRef.current;
    if (!el) {
      setCurrentPage(targetPageIndex);
      setIsFlipping(false);
      return;
    }

    // GSAP 3D Page Flip Animation
    const tl = gsap.timeline({
      onComplete: () => {
        setIsFlipping(false);
      }
    });

    tl.to(el, {
      rotateY: isForward ? -25 : 25,
      opacity: 0.2,
      scale: 0.96,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => {
        setCurrentPage(targetPageIndex);
      }
    })
    .to(el, {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      duration: 0.45,
      ease: 'power2.out'
    });
  };

  const handleNext = () => flipToPage(currentPage + 1);
  const handlePrev = () => flipToPage(currentPage - 1);

  // Keyboard navigation (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, isFlipping]);

  return (
    <div className="relative w-full max-w-5xl mx-auto px-2 sm:px-6 py-4 sm:py-8 flex flex-col items-center">
      {/* Top Ribbon Chapters & Bookmarks */}
      <div className="w-full flex items-center justify-between mb-4 px-2 sm:px-4">
        <div className="flex items-center gap-2 text-rosewood-600">
          <BookOpen className="w-4 h-4" />
          <span className="font-serif text-xs sm:text-sm italic">
            Trang {currentPage + 1} / {totalPages} — {pages[currentPage].title}
          </span>
        </div>

        {/* Quick Chapter Select Ribbons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => flipToPage(idx)}
              className={`text-xs px-2 sm:px-3 py-1 rounded-t-md border-b-2 transition-all font-serif ${
                currentPage === idx
                  ? 'bg-rosewood-500 text-white border-rosewood-700 shadow-md scale-105'
                  : 'bg-parchment-100/70 text-ink-600 hover:bg-rosewood-100 border-transparent'
              }`}
              title={p.title}
            >
              <span className="hidden sm:inline">{p.title}</span>
              <span className="sm:hidden">{idx + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3D Journal Book Spread Container */}
      <div className="relative w-full perspective-1000">
        {/* Book Outer Leather Base Shadow */}
        <div className="absolute inset-0 bg-[#251310] rounded-2xl transform translate-y-3 translate-x-1 shadow-2xl pointer-events-none opacity-80" />

        {/* Book Paper Core */}
        <div
          ref={pageContainerRef}
          className="relative paper-texture rounded-xl sm:rounded-2xl border border-[#D58E9F]/40 shadow-book-deep min-h-[580px] sm:min-h-[640px] flex flex-col justify-between p-4 sm:p-8 preserve-3d transition-transform overflow-hidden"
        >
          {/* Subtle Gilded corner filigree */}
          <span className="absolute top-3 left-3 text-[#D4AF37]/40 text-xs font-serif pointer-events-none">✦</span>
          <span className="absolute top-3 right-3 text-[#D4AF37]/40 text-xs font-serif pointer-events-none">✦</span>
          <span className="absolute bottom-3 left-3 text-[#D4AF37]/40 text-xs font-serif pointer-events-none">✦</span>
          <span className="absolute bottom-3 right-3 text-[#D4AF37]/40 text-xs font-serif pointer-events-none">✦</span>

          {/* Book Spine (Left on single page or middle on open book) */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />

          {/* Render Active Page Component */}
          <div className="flex-1">
            {pages[currentPage].component}
          </div>

          {/* Bottom Flip Navigation Bar inside the book */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-rosewood-200/50">
            {/* Previous Page Button */}
            <button
              onClick={handlePrev}
              disabled={currentPage === 0 || isFlipping}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-serif text-xs sm:text-sm transition-all ${
                currentPage === 0
                  ? 'opacity-30 cursor-not-allowed text-ink-400'
                  : 'bg-parchment-200/80 hover:bg-rosewood-100 text-rosewood-900 shadow-xs hover:scale-105 active:scale-95'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang trước</span>
            </button>

            {/* Middle Bookmark Ribbon Indicator */}
            <div className="flex items-center gap-1">
              {pages.map((_, i) => (
                <div
                  key={i}
                  onClick={() => flipToPage(i)}
                  className={`cursor-pointer transition-all duration-300 rounded-full ${
                    currentPage === i
                      ? 'w-6 h-2 bg-rosewood-500'
                      : 'w-2 h-2 bg-rosewood-200 hover:bg-rosewood-300'
                  }`}
                  title={`Đi tới trang ${i + 1}`}
                />
              ))}
            </div>

            {/* Next Page Button */}
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages - 1 || isFlipping}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-serif text-xs sm:text-sm transition-all ${
                currentPage === totalPages - 1
                  ? 'opacity-30 cursor-not-allowed text-ink-400'
                  : 'bg-rosewood-500 hover:bg-rosewood-600 text-white shadow-md hover:scale-105 active:scale-95'
              }`}
            >
              <span>Trang kế</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Keyboard Hint */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-400 font-serif italic">
        <Feather className="w-3.5 h-3.5 text-rosewood-300" />
        <span>Bạn có thể dùng phím mũi tên ← / → hoặc nút bấm để lật từng trang ký ức</span>
      </div>
    </div>
  );
}
