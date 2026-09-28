'use client';

import React from 'react';
import { Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function ChapterFinalSpread() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center select-none py-6 px-4 space-y-6">
      <div className="w-14 h-14 mx-auto rounded-full bg-rosewood-100/60 border border-rosewood-200 text-rosewood-600 flex items-center justify-center">
        <InfinityIcon className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-[0.3em] text-rosewood-400 font-sans font-semibold">
          Final Chapter • TO BE CONTINUED
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl text-ink-900 font-semibold tracking-tight">
          OUR STORY
        </h2>
        <p className="font-script text-2xl sm:text-3xl text-rosewood-800">
          is still being written...
        </p>
      </div>

      <div className="max-w-md mx-auto font-serif text-ink-700 text-sm sm:text-base leading-relaxed space-y-3 py-2 border-y border-dashed border-rosewood-200/80">
        <p>
          Cuốn nhật ký này sẽ không có trang cuối cùng. Mỗi bình minh thức dậy bên nhau lại là một trang giấy mới được mở ra, tràn ngập tình yêu và sự chở che.
        </p>
        <p className="font-handwriting text-2xl sm:text-3xl text-rosewood-900 font-bold">
          &quot;Cảm ơn em vì đã đến và trở thành điều tuyệt vời nhất trong cuộc đời của tớ.&quot;
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs font-serif italic text-rosewood-500">
        <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
        <span>Phúc &amp; Trang • Mãi mãi về sau</span>
        <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
      </div>
    </div>
  );
}
