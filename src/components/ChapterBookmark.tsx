'use client';

import React from 'react';
import { Bookmark } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

interface ChapterBookmarkProps {
  activeChapter: string;
  onSelectChapter: (id: string) => void;
}

export default function ChapterBookmark({ activeChapter, onSelectChapter }: ChapterBookmarkProps) {
  return (
    <aside className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3">
      {/* Decorative Ribbon Header */}
      <div className="flex items-center justify-center mb-1">
        <div className="w-8 h-12 bg-rosewood-500 rounded-t-sm shadow-md flex items-center justify-center text-white border-t border-rosewood-300">
          <Bookmark className="w-4 h-4 fill-white" />
        </div>
      </div>

      <nav className="bg-parchment-100/90 backdrop-blur-md border border-rosewood-200/70 rounded-2xl p-2 shadow-xl flex flex-col gap-2">
        {LOVE_STORY_DATA.bookPages.map((chap) => {
          const isActive = activeChapter === chap.id;

          return (
            <button
              key={chap.id}
              onClick={() => onSelectChapter(chap.id)}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-300 ${
                isActive
                  ? 'bg-rosewood-100/80 text-rosewood-900 font-semibold shadow-xs'
                  : 'text-ink-600 hover:text-rosewood-800 hover:bg-parchment-200/50'
              }`}
              title={chap.chapterTitle}
            >
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-rosewood-600 scale-125' : 'bg-ink-400 group-hover:bg-rosewood-400'
                }`}
              />
              <div className="flex flex-col">
                <span className="text-[10px] tracking-wider uppercase font-sans text-rosewood-400">
                  {chap.chapterNumber}
                </span>
                <span className="font-serif text-xs whitespace-nowrap">
                  {chap.chapterTitle}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
