'use client';

import React, { useRef, useState } from 'react';
import { Sparkles, Heart, BookOpen, Feather } from 'lucide-react';
import { gsap } from 'gsap';
import { LOVE_STORY_DATA } from '@/data/storyData';

interface ClosedBookCoverProps {
  onOpenBook: () => void;
}

export default function ClosedBookCover({ onOpenBook }: ClosedBookCoverProps) {
  const [isOpening, setIsOpening] = useState(false);
  const bookCoverRef = useRef<HTMLDivElement | null>(null);
  const bookContainerRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  const handleBookClick = () => {
    if (isOpening) return;
    setIsOpening(true);

    const tl = gsap.timeline({
      onComplete: () => {
        onOpenBook();
      }
    });

    // 1. Subtle camera zoom & glow warming up
    tl.to(bookContainerRef.current, {
      scale: 1.06,
      duration: 0.8,
      ease: 'power2.out'
    })
    .to(glowRef.current, {
      opacity: 0.9,
      scale: 1.3,
      duration: 0.9,
      ease: 'sine.inOut'
    }, '-=0.6')
    // 2. Front cover opening (3D rotation around left spine)
    .to(bookCoverRef.current, {
      rotateY: -110,
      duration: 1.4,
      ease: 'power3.inOut'
    }, '-=0.4')
    // 3. Fade out cover view and immerse into journal pages
    .to(bookContainerRef.current, {
      opacity: 0,
      scale: 1.18,
      duration: 0.8,
      ease: 'power2.in'
    }, '-=0.3');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F0D0B] overflow-hidden px-4 select-none">
      {/* Soft warm light glow radiating behind book */}
      <div
        ref={glowRef}
        className="absolute w-[360px] sm:w-[540px] h-[360px] sm:h-[540px] rounded-full bg-gradient-to-tr from-rosewood-500/20 via-champagne-500/30 to-rosewood-200/10 blur-3xl pointer-events-none opacity-40 transition-opacity"
      />

      {/* Intro Header */}
      <div className="text-center mb-8 z-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-champagne-500/30 bg-white/5 backdrop-blur-sm text-champagne-400 text-xs tracking-widest uppercase font-sans mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Cuốn Nhật Ký Kỷ Niệm
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-wide text-parchment-100">
          Chuyện Tình Chúng Mình
        </h1>
        <p className="font-handwriting text-2xl sm:text-3xl text-rosewood-200 mt-2">
          {LOVE_STORY_DATA.couple.he} &amp; {LOVE_STORY_DATA.couple.she}
        </p>
      </div>

      {/* 3D Book Container */}
      <div
        ref={bookContainerRef}
        className="perspective-1000 cursor-pointer group transition-transform"
        onClick={handleBookClick}
      >
        <div className="relative w-[270px] sm:w-[320px] h-[390px] sm:h-[460px] preserve-3d">
          {/* Book Spine (Left 3D Edge) */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-[#381B15] rounded-l-md transform -translate-x-4 translate-z-[-10px] rotateY-[-90deg] shadow-2xl border-r border-[#6B3A2C]" />

          {/* Book Back Cover */}
          <div className="absolute inset-0 bg-[#251310] rounded-r-lg shadow-book-deep border border-[#4E2B21]" />

          {/* Golden Page Edges (Gilded Pages look) */}
          <div className="absolute right-2 top-3 bottom-3 w-4 bg-gradient-to-r from-[#D4AF37]/50 via-[#F7E7CE] to-[#C59B27] rounded-r-xs shadow-inner" />

          {/* Front Cover (Leaves & Leather texture) */}
          <div
            ref={bookCoverRef}
            style={{ transformOrigin: 'left center' }}
            className="absolute inset-0 preserve-3d rounded-r-lg bg-gradient-to-br from-[#401C24] via-[#2D1219] to-[#1F0B11] border-2 border-[#D4AF37]/40 shadow-2xl p-6 flex flex-col justify-between overflow-hidden"
          >
            {/* Elegant Gilded Border Framing */}
            <div className="absolute inset-2 border border-[#D4AF37]/30 rounded pointer-events-none" />
            <div className="absolute inset-3 border border-dashed border-[#D4AF37]/20 rounded pointer-events-none" />

            {/* Corner Filigrees */}
            <span className="absolute top-4 left-4 text-[#D4AF37]/50 text-xs font-serif">✦</span>
            <span className="absolute top-4 right-4 text-[#D4AF37]/50 text-xs font-serif">✦</span>
            <span className="absolute bottom-4 left-4 text-[#D4AF37]/50 text-xs font-serif">✦</span>
            <span className="absolute bottom-4 right-4 text-[#D4AF37]/50 text-xs font-serif">✦</span>

            {/* Header / Date */}
            <div className="text-center pt-4">
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37]/80 font-sans">
                A Journey of Two Hearts
              </span>
              <div className="w-12 h-[1px] bg-[#D4AF37]/40 mx-auto mt-2" />
            </div>

            {/* Center Monogram / Title */}
            <div className="text-center my-auto py-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full border border-[#D4AF37]/40 flex items-center justify-center bg-black/20 shadow-inner">
                <Heart className="w-7 h-7 text-[#E8BCC6] fill-[#D58E9F]/40 animate-pulse" />
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-parchment-100 font-medium tracking-wide">
                Our Story
              </h2>
              <p className="font-handwriting text-2xl sm:text-3xl text-[#E8BCC6] mt-1">
                Phúc &amp; Trang
              </p>
              <p className="font-serif text-xs text-parchment-300/70 italic mt-2">
                Từ ngày 20.10.2022
              </p>
            </div>

            {/* Book Footer call to action */}
            <div className="text-center pb-2">
              <div className="w-8 h-[1px] bg-[#D4AF37]/40 mx-auto mb-3" />
              <div className="inline-flex items-center gap-1.5 text-xs text-champagne-400 group-hover:text-parchment-100 transition-colors font-serif italic">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Chạm để mở cuốn sổ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="mt-8 text-center text-xs text-stone-400 font-serif italic flex items-center gap-2">
        <Feather className="w-3.5 h-3.5 text-rosewood-300" />
        <span>Từng trang kỷ niệm đang chờ được lật mở...</span>
      </div>
    </div>
  );
}
