'use client';

import React, { useEffect, useState } from 'react';
import { LOVE_STORY_DATA } from '@/data/storyData';

interface TimeDifference {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function RealtimeLoveCounter() {
  const [timeTogether, setTimeTogether] = useState<TimeDifference>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const startDate = new Date(LOVE_STORY_DATA.couple.anniversaryDate).getTime();

    const calculate = () => {
      const now = new Date().getTime();
      const difference = Math.max(0, now - startDate);

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeTogether({ days, hours, minutes, seconds });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="my-8 py-6 px-4 sm:px-8 border-y border-dashed border-rosewood-200/80 bg-parchment-100/40 rounded-xl">
      <p className="text-center font-serif text-sm sm:text-base italic text-ink-600 mb-4 tracking-wide">
        — Cuốn nhật ký đã cùng hai ta đi qua từng nhịp thở —
      </p>

      <div className="grid grid-cols-4 gap-2 sm:gap-6 max-w-lg mx-auto text-center">
        {/* Days */}
        <div className="flex flex-col items-center bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-rosewood-100/70">
          <span className="text-2xl sm:text-4xl font-serif font-bold text-rosewood-900 tracking-tight">
            {timeTogether.days.toLocaleString()}
          </span>
          <span className="text-[11px] sm:text-xs uppercase tracking-widest text-ink-500 mt-1">
            Ngày
          </span>
        </div>

        {/* Hours */}
        <div className="flex flex-col items-center bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-rosewood-100/70">
          <span className="text-2xl sm:text-4xl font-serif font-bold text-rosewood-900 tracking-tight">
            {String(timeTogether.hours).padStart(2, '0')}
          </span>
          <span className="text-[11px] sm:text-xs uppercase tracking-widest text-ink-500 mt-1">
            Giờ
          </span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-rosewood-100/70">
          <span className="text-2xl sm:text-4xl font-serif font-bold text-rosewood-900 tracking-tight">
            {String(timeTogether.minutes).padStart(2, '0')}
          </span>
          <span className="text-[11px] sm:text-xs uppercase tracking-widest text-ink-500 mt-1">
            Phút
          </span>
        </div>

        {/* Seconds */}
        <div className="flex flex-col items-center bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-rosewood-100/70">
          <span className="text-2xl sm:text-4xl font-serif font-bold text-rosewood-500 tracking-tight animate-pulse">
            {String(timeTogether.seconds).padStart(2, '0')}
          </span>
          <span className="text-[11px] sm:text-xs uppercase tracking-widest text-ink-500 mt-1">
            Giây
          </span>
        </div>
      </div>

      <p className="text-center font-handwriting text-2xl sm:text-3xl text-rosewood-800 mt-4">
        &quot;và tình yêu này vẫn đang lớn dần theo từng giây phút...&quot;
      </p>
    </div>
  );
}
