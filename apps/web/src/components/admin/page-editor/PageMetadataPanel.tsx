'use client';

import React from 'react';
import { Music } from 'lucide-react';
import { Page } from '@/types/book';

export interface PageMetadataPanelProps {
  page: Page;
  audioTracks: any[];
  updateMetadata: (fields: Partial<Page>) => void;
  commitMetadataHistory: () => void;
  updatePage: (update: (prev: Page) => Page, description?: string) => void;
}

/** "Trang" inspector tab: title, chapter, quote, handwriting and the page's own audio track. */
export default function PageMetadataPanel({
  page,
  audioTracks,
  updateMetadata,
  commitMetadataHistory,
  updatePage,
}: PageMetadataPanelProps) {
  return (
    <div className="space-y-4 text-xs">
      <div className="pb-2 border-b border-rosewood-900/40 flex items-center justify-between">
        <span className="font-serif font-bold text-champagne-300 text-sm">
          Thông Tin &amp; Nhạc Nền Trang
        </span>
        <span className="font-mono text-[10px] text-stone-500">#{page.order}</span>
      </div>

      {/* Title */}
      <div>
        <label className="block text-stone-300 font-medium mb-1">Tiêu đề trang</label>
        <input
          type="text"
          value={page.title || ''}
          onChange={(e) => updateMetadata({ title: e.target.value })}
          onBlur={commitMetadataHistory}
          placeholder="Nhập tiêu đề trang..."
          className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white text-xs focus:outline-none focus:border-rosewood-500"
        />
      </div>

      {/* Chapter */}
      <div>
        <label className="block text-stone-300 font-medium mb-1">Tên chương (Chapter)</label>
        <input
          type="text"
          value={page.chapter || ''}
          onChange={(e) => updateMetadata({ chapter: e.target.value })}
          onBlur={commitMetadataHistory}
          placeholder="Ví dụ: Chapter IV, Ngày Chung Đôi..."
          className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white text-xs focus:outline-none focus:border-rosewood-500"
        />
      </div>

      {/* Quote */}
      <div>
        <label className="block text-stone-300 font-medium mb-1">Lời trích dẫn (Quote)</label>
        <textarea
          rows={2}
          value={page.quote || ''}
          onChange={(e) => updateMetadata({ quote: e.target.value })}
          onBlur={commitMetadataHistory}
          placeholder="Câu danh ngôn hoặc tâm tình..."
          className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white text-xs focus:outline-none focus:border-rosewood-500"
        />
      </div>

      {/* Handwriting text */}
      <div>
        <label className="block text-stone-300 font-medium mb-1">Dòng chữ viết tay (Handwriting)</label>
        <input
          type="text"
          value={page.handwriting || ''}
          onChange={(e) => updateMetadata({ handwriting: e.target.value })}
          onBlur={commitMetadataHistory}
          placeholder="Chữ ký hoặc lời đề từ..."
          className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white text-xs focus:outline-none focus:border-rosewood-500 font-serif italic"
        />
      </div>

      {/* Page Audio Track */}
      <div className="pt-2 border-t border-rosewood-900/40">
        <label className="block text-stone-300 font-medium mb-1.5 flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-amber-400" />
          <span>Nhạc nền riêng cho trang này</span>
        </label>
        <select
          value={(page as any).audioTrackId || ''}
          onChange={(e) => {
            const val = e.target.value || null;
            updatePage(
              (prev) => ({ ...prev, isCustomized: true, audioTrackId: val } as Page),
              'Đổi nhạc nền trang'
            );
          }}
          className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
        >
          <option value="">(Không dùng nhạc riêng — Dùng nhạc nền sách)</option>
          {audioTracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} — {t.artist}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-stone-500 mt-1.5">
          Khi lật đến trang này, bài hát này sẽ tự động vang lên thay cho nhạc nền chung.
        </p>
      </div>
    </div>
  );
}
