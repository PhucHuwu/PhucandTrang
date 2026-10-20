'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

/** Section title with the "Reset Mặc Định" button shared by the theme / typography / 3D / atmosphere tabs. */
export default function SectionHeader({ title, onReset }: { title: React.ReactNode; onReset: () => void }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-rosewood-900/40">
      <span className="text-xs font-semibold text-champagne-300 uppercase tracking-wider">
        {title}
      </span>
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-white"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Reset Mặc Định</span>
      </button>
    </div>
  );
}
