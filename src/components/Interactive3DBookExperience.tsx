'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Feather } from 'lucide-react';
import { gsap } from 'gsap';
import BookCanvas3D from '@/components/3d/BookCanvas3D';
import VintageMusicPlayer from '@/components/VintageMusicPlayer';
import ChapterOneSpread from '@/components/spreads/ChapterOneSpread';
import ChapterTwoSpread from '@/components/spreads/ChapterTwoSpread';
import ChapterThreeSpread from '@/components/spreads/ChapterThreeSpread';
import ChapterFourSpread from '@/components/spreads/ChapterFourSpread';
import ChapterFinalSpread from '@/components/spreads/ChapterFinalSpread';

export default function Interactive3DBookExperience() {
  const [bookState, setBookState] = useState<'closed' | 'opening' | 'opened' | 'closing'>('closed');
  const [openProgress, setOpenProgress] = useState(0); // 0 to 1
  const [currentSpread, setCurrentSpread] = useState(0); // 0 to 4
  const [flipProgress, setFlipProgress] = useState(0); // 0 to 1
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');
  const [isFlipping, setIsFlipping] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);

  const spreads = [
    { id: 'chap1', component: <ChapterOneSpread />, title: 'The First Page' },
    { id: 'chap2', component: <ChapterTwoSpread />, title: 'The Confession' },
    { id: 'chap3', component: <ChapterThreeSpread />, title: 'Cherished Days' },
    { id: 'chap4', component: <ChapterFourSpread />, title: 'Love Letter' },
    { id: 'final', component: <ChapterFinalSpread />, title: 'Our Story...' },
  ];

  const totalSpreads = spreads.length;

  // 1. Opening Animation Sequence (2.5s cinematic opening)
  const handleOpenBook = () => {
    if (bookState !== 'closed') return;
    setBookState('opening');

    const obj = { progress: 0 };
    gsap.to(obj, {
      progress: 1,
      duration: 2.6,
      ease: 'power3.inOut',
      onUpdate: () => {
        setOpenProgress(obj.progress);
      },
      onComplete: () => {
        setBookState('opened');
      },
    });
  };

  // 2. Page Turning with 3D sync
  const flipToSpread = (targetIndex: number) => {
    if (isFlipping || targetIndex === currentSpread || targetIndex < 0 || targetIndex >= totalSpreads) {
      return;
    }

    setIsFlipping(true);
    const forward = targetIndex > currentSpread;
    setFlipDirection(forward ? 'forward' : 'backward');

    // Sync HTML fade out & 3D WebGL page curl
    const flipObj = { p: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        setIsFlipping(false);
        setFlipProgress(0);
      },
    });

    // Fade out old content
    if (contentContainerRef.current) {
      tl.to(contentContainerRef.current, {
        opacity: 0.1,
        y: forward ? -6 : 6,
        duration: 0.35,
        ease: 'power2.in',
      });
    }

    // 3D Flip progress from 0 -> 1
    tl.to(flipObj, {
      p: 1,
      duration: 0.75,
      ease: 'power2.inOut',
      onUpdate: () => {
        setFlipProgress(flipObj.p);
      },
      onComplete: () => {
        setCurrentSpread(targetIndex);
      },
    }, '-=0.2');

    // Fade in new content
    if (contentContainerRef.current) {
      tl.to(contentContainerRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: 'power2.out',
      });
    }
  };

  const handleNext = () => flipToSpread(currentSpread + 1);
  const handlePrev = () => flipToSpread(currentSpread - 1);

  // 3. Virtual Scroll & Keyboard Page Turning
  useEffect(() => {
    let lastWheelTime = 0;

    const handleWheel = (e: WheelEvent) => {
      if (bookState === 'closed') {
        if (e.deltaY > 20) {
          handleOpenBook();
        }
        return;
      }

      const now = Date.now();
      if (now - lastWheelTime < 700 || isFlipping) return;

      if (e.deltaY > 35) {
        lastWheelTime = now;
        handleNext();
      } else if (e.deltaY < -35) {
        lastWheelTime = now;
        handlePrev();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (bookState === 'closed') {
        if (e.key === 'Enter' || e.key === ' ') {
          handleOpenBook();
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrev();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bookState, currentSpread, isFlipping]);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#120E0E]">
      {/* 3D WebGL Three.js Canvas Layer */}
      <BookCanvas3D
        bookState={bookState}
        openProgress={openProgress}
        flipProgress={flipProgress}
        flipDirection={flipDirection}
        onBookClick={bookState === 'closed' ? handleOpenBook : undefined}
      />

      {/* Atmospheric Music Player */}
      <VintageMusicPlayer autoPlayTrigger={bookState === 'opened' || bookState === 'opening'} />

      {/* Screen 1: Closed Book Cover Typography Overlay */}
      {bookState === 'closed' && (
        <div
          onClick={handleOpenBook}
          className="absolute inset-0 z-20 flex flex-col items-center justify-between py-12 px-4 pointer-events-auto cursor-pointer"
        >
          {/* Top subtle label */}
          <div className="text-center animate-fade-in">
            <span className="text-[11px] font-sans tracking-[0.35em] uppercase text-champagne-500/80">
              A Love Journal
            </span>
          </div>

          {/* Center Book Title */}
          <div className="text-center max-w-lg space-y-3 pointer-events-none">
            <h1 className="font-serif text-4xl sm:text-6xl text-parchment-100 font-light tracking-wide">
              OUR STORY
            </h1>
            <p className="font-serif text-xs sm:text-sm uppercase tracking-[0.3em] text-champagne-400/90">
              20.10.2022 — FOREVER
            </p>
            <div className="w-12 h-[1px] bg-champagne-500/40 mx-auto mt-2" />
            <p className="font-script text-2xl sm:text-3xl text-rosewood-200 pt-2">
              A story written one page at a time.
            </p>
          </div>

          {/* Bottom call to action */}
          <div className="text-center space-y-2 animate-pulse">
            <span className="font-serif text-xs text-parchment-200/70 tracking-widest uppercase">
              [ Chạm hoặc cuộn chuột để mở sách ]
            </span>
          </div>
        </div>
      )}

      {/* Screen 2: Opened Book Interactive HTML Overlay */}
      {bookState === 'opened' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-4 sm:p-8 pointer-events-none">
          {/* Top Chapter Progress & Bookmark Navigation */}
          <header className="w-full max-w-5xl flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2 text-rosewood-400 font-serif text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 text-champagne-400" />
              <span>Chương {currentSpread + 1} / {totalSpreads} — {spreads[currentSpread].title}</span>
            </div>

            {/* Quick Bookmark tabs */}
            <div className="flex items-center gap-1 sm:gap-2">
              {spreads.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => flipToSpread(idx)}
                  className={`text-xs px-2 sm:px-3 py-1 rounded-t-md transition-all font-serif ${
                    currentSpread === idx
                      ? 'bg-rosewood-500 text-white shadow-md scale-105'
                      : 'bg-parchment-100/60 text-ink-600 hover:bg-rosewood-100'
                  }`}
                  title={s.title}
                >
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                </button>
              ))}
            </div>
          </header>

          {/* Central Book Content Spread Viewport (75vw - 85vw x 65vh - 75vh) */}
          <div className="relative w-[88vw] sm:w-[80vw] max-w-5xl h-[70vh] sm:h-[72vh] flex items-center justify-center pointer-events-auto">
            <div
              ref={contentContainerRef}
              className="relative w-full h-full paper-texture rounded-xl shadow-book-deep border border-rosewood-200/50 p-4 sm:p-8 flex items-center overflow-y-auto sm:overflow-hidden"
            >
              {/* Vertical book spine shadow in the middle */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 book-spine pointer-events-none z-10" />

              {/* Left & Right page flip edge click areas */}
              <button
                onClick={handlePrev}
                disabled={currentSpread === 0 || isFlipping}
                aria-label="Previous Page"
                className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 hover:bg-black/5 flex items-center justify-center text-rosewood-800 opacity-0 hover:opacity-100 transition-opacity disabled:pointer-events-none z-20"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNext}
                disabled={currentSpread === totalSpreads - 1 || isFlipping}
                aria-label="Next Page"
                className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 hover:bg-black/5 flex items-center justify-center text-rosewood-800 opacity-0 hover:opacity-100 transition-opacity disabled:pointer-events-none z-20"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Spread Content */}
              <div className="w-full h-full flex items-center justify-center">
                {spreads[currentSpread].component}
              </div>
            </div>
          </div>

          {/* Bottom Controls & Interaction Hints */}
          <footer className="w-full max-w-5xl flex items-center justify-between pointer-events-auto pt-2">
            <button
              onClick={handlePrev}
              disabled={currentSpread === 0 || isFlipping}
              className={`flex items-center gap-1 text-xs sm:text-sm font-serif px-3 py-1.5 rounded-full bg-parchment-100/70 backdrop-blur-sm transition-all ${
                currentSpread === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-rosewood-100 text-ink-800'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang trước</span>
            </button>

            {/* Timeline Progress dots */}
            <div className="flex items-center gap-1.5">
              {spreads.map((_, i) => (
                <div
                  key={i}
                  onClick={() => flipToSpread(i)}
                  className={`cursor-pointer transition-all duration-300 rounded-full ${
                    currentSpread === i
                      ? 'w-6 h-1.5 bg-rosewood-500'
                      : 'w-1.5 h-1.5 bg-parchment-300 hover:bg-rosewood-300'
                  }`}
                  title={`Trang ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={currentSpread === totalSpreads - 1 || isFlipping}
              className={`flex items-center gap-1 text-xs sm:text-sm font-serif px-3 py-1.5 rounded-full bg-rosewood-500 text-white transition-all ${
                currentSpread === totalSpreads - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-rosewood-600'
              }`}
            >
              <span>Trang kế</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
