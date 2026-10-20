'use client';

import React from 'react';
import SectionHeader from './SectionHeader';
import type { SettingsTypography } from './settingsDefaults';

export default function TypographySettingsTab({ typography, setTypography, onReset }: {
  typography: SettingsTypography;
  setTypography: (typography: SettingsTypography) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Cấu hình phông chữ hệ thống" onReset={onReset} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Phông tiêu đề bìa (Title Font)</label>
          <select
            value={typography.titleFont || 'SVN-Housttely Signature'}
            onChange={(e) => setTypography({ ...typography, titleFont: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="SVN-Housttely Signature">Font 2.otf — SVN-Housttely Signature (Chữ ký nghệ thuật)</option>
            <option value="SVN-Honeyguide Caps">Font 1.otf — SVN-Honeyguide Caps / Baby Doll (Dễ thương)</option>
            <option value="Dancing Script">Dancing Script (Thư pháp bay bổng)</option>
            <option value="Cormorant Garamond">Cormorant Garamond (Cổ điển sang trọng)</option>
            <option value="Playfair Display">Playfair Display (Trang nhã)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Phông nội dung chính (Body Font)</label>
          <select
            value={typography.bodyFont || 'Cormorant Garamond'}
            onChange={(e) => setTypography({ ...typography, bodyFont: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="Cormorant Garamond">Cormorant Garamond (Serif cổ điển)</option>
            <option value="Montserrat">Montserrat (Hiện đại)</option>
            <option value="Playfair Display">Playfair Display</option>
            <option value="SVN-Housttely Signature">Font 2.otf — SVN-Housttely Signature</option>
            <option value="SVN-Honeyguide Caps">Font 1.otf — SVN-Honeyguide Caps / Baby Doll</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Phông viết tay (Handwriting Font)</label>
          <select
            value={typography.handwritingFont || 'Dancing Script'}
            onChange={(e) => setTypography({ ...typography, handwritingFont: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="SVN-Housttely Signature">Font 2.otf — SVN-Housttely Signature</option>
            <option value="SVN-Honeyguide Caps">Font 1.otf — SVN-Honeyguide Caps / Baby Doll</option>
            <option value="Dancing Script">Dancing Script (Viết tay cảm xúc)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Cỡ chữ cơ bản (Base Font Size px)</label>
          <input
            type="number"
            value={typography.baseFontSize || 22}
            onChange={(e) => setTypography({ ...typography, baseFontSize: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
