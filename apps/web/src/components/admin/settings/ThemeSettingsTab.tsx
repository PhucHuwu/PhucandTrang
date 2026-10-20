'use client';

import React from 'react';
import SectionHeader from './SectionHeader';
import type { SettingsTheme } from './settingsDefaults';

export default function ThemeSettingsTab({ theme, setTheme, onReset }: {
  theme: SettingsTheme;
  setTheme: (theme: SettingsTheme) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Bảng màu sắc không gian sách" onReset={onReset} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu giấy lật (Paper Color)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.paperColor || '#F9F5EC'}
              onChange={(e) => setTheme({ ...theme, paperColor: e.target.value })}
              className="w-9 h-9 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
            />
            <input
              type="text"
              value={theme.paperColor || '#F9F5EC'}
              onChange={(e) => setTheme({ ...theme, paperColor: e.target.value })}
              className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu chữ mặc định (Text Color)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.textColor || '#292522'}
              onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
              className="w-9 h-9 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
            />
            <input
              type="text"
              value={theme.textColor || '#292522'}
              onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
              className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu điểm nhấn (Accent Color)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.accentColor || '#94384F'}
              onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
              className="w-9 h-9 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
            />
            <input
              type="text"
              value={theme.accentColor || '#94384F'}
              onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
              className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu vàng ánh kim (Champagne Gold)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.champagneGold || '#FFE5B4'}
              onChange={(e) => setTheme({ ...theme, champagneGold: e.target.value })}
              className="w-9 h-9 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
            />
            <input
              type="text"
              value={theme.champagneGold || '#FFE5B4'}
              onChange={(e) => setTheme({ ...theme, champagneGold: e.target.value })}
              className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Mép trang 3D (Edge Color Hex)</label>
          <input
            type="text"
            value={`0x${(theme.edgeColor || 0xb1a283).toString(16)}`}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 16);
              if (!isNaN(parsed)) setTheme({ ...theme, edgeColor: parsed });
            }}
            className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu bàn đọc 3D (Desk Color Hex)</label>
          <input
            type="text"
            value={`0x${(theme.deskColor || 0x1f1218).toString(16)}`}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 16);
              if (!isNaN(parsed)) setTheme({ ...theme, deskColor: parsed });
            }}
            className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
          />
        </div>
      </div>
    </div>
  );
}
