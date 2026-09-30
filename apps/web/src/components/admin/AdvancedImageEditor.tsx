'use client';

import React, { useState } from 'react';
import { ImageElement, ImageElementData, ElementStyle } from '@/types/book';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import { safeParseFloat } from '@phucandtrang/shared';
import {
  Image as ImageIcon,
  Sliders,
  RotateCw,
  FolderOpen,
  Sparkles,
  Maximize2,
  Crop,
  Layers,
  Check,
} from 'lucide-react';

interface AdvancedImageEditorProps {
  element: ImageElement;
  onChange: (updater: (el: ImageElement) => ImageElement) => void;
  disabled?: boolean;
}

export default function AdvancedImageEditor({
  element,
  onChange,
  disabled = false,
}: AdvancedImageEditorProps) {
  const d = (element.data || {}) as ImageElementData;
  const s = (element.style || {}) as ElementStyle;
  const t = element.transform;

  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // When image is chosen from Media Library or newly uploaded
  const handleMediaSelect = (selected: { mediaId: string; url: string; alt?: string }) => {
    onChange((el) => ({
      ...el,
      data: {
        ...el.data,
        mediaId: selected.mediaId, // Canonical DB reference
        src: selected.url, // Runtime preview URL
        alt: selected.alt || (el.data as any)?.alt || 'Ảnh kỷ niệm',
      },
    }));
  };

  return (
    <div className="space-y-4 text-xs text-parchment-200">
      {/* 1. Image Source & Media Library Picker (Prompt 20 Core Requirement) */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-rosewood-400" />
            <span>Hình Ảnh (Image Source)</span>
          </label>

          {/* Canonical Media ID badge if present */}
          {d.mediaId && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
              mediaId: {d.mediaId.slice(0, 8)}...
            </span>
          )}
        </div>

        {/* Thumbnail Preview & Picker Action Button */}
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#10070D] border border-rosewood-900/60 shrink-0">
            {d.src ? (
              <img src={d.src} alt={d.alt || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-600">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowMediaPicker(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white font-medium text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Chọn / Tải Ảnh Từ Thư Viện</span>
            </button>
            <p className="text-[10px] text-stone-500 font-mono truncate">
              {d.src ? d.src.split('/').pop() : 'Chưa có ảnh được chọn'}
            </p>
          </div>
        </div>

        {/* Alt Text */}
        <div>
          <label className="block text-[11px] text-stone-300 font-medium mb-1">
            Văn bản thay thế (Alt text)
          </label>
          <input
            type="text"
            disabled={disabled}
            value={d.alt || ''}
            onChange={(e) =>
              onChange((el) => ({
                ...el,
                data: { ...el.data, alt: e.target.value },
              }))
            }
            placeholder="Mô tả bức ảnh kỷ niệm..."
            className="w-full px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white text-xs placeholder-stone-600"
          />
        </div>
      </div>

      {/* 2. Crop & Fitting: objectFit (cover/contain/fill), focalPoint (X/Y) */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
          <Crop className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Kiểu Khớp Ảnh & Điểm Neo Cắt (Crop & Fit)</span>
        </label>

        <div>
          <label className="block text-[11px] text-stone-300 font-medium mb-1">objectFit</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#150A10] border border-rosewood-900/60 rounded-xl">
            {(['cover', 'contain', 'fill'] as const).map((fitMode) => (
              <button
                key={fitMode}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange((el) => ({
                    ...el,
                    data: { ...el.data, objectFit: fitMode },
                  }))
                }
                className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  (d.objectFit || 'cover') === fitMode
                    ? 'bg-rosewood-600 text-white font-semibold shadow'
                    : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
                }`}
              >
                {fitMode}
              </button>
            ))}
          </div>
        </div>

        {/* FocalPoint X / Y (Only applicable when objectFit = cover) */}
        {(d.objectFit || 'cover') === 'cover' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] text-stone-300">
              <span className="font-medium">Điểm neo căn chỉnh (focalPoint)</span>
              <span className="font-mono text-stone-500">
                X: {Math.round((d.focalPoint?.x ?? 0.5) * 100)}% | Y: {Math.round((d.focalPoint?.y ?? 0.5) * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-stone-400 mb-0.5">Trục ngang X (Trái ↔ Phải)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={disabled}
                  value={d.focalPoint?.x ?? 0.5}
                  onChange={(e) =>
                    onChange((el) => ({
                      ...el,
                      data: {
                        ...el.data,
                        focalPoint: {
                          x: safeParseFloat(e.target.value, 0.5),
                          y: (el.data as any)?.focalPoint?.y ?? 0.5,
                        },
                      },
                    }))
                  }
                  className="w-full accent-rosewood-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] text-stone-400 mb-0.5">Trục dọc Y (Trên ↕ Dưới)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={disabled}
                  value={d.focalPoint?.y ?? 0.5}
                  onChange={(e) =>
                    onChange((el) => ({
                      ...el,
                      data: {
                        ...el.data,
                        focalPoint: {
                          x: (el.data as any)?.focalPoint?.x ?? 0.5,
                          y: safeParseFloat(e.target.value, 0.5),
                        },
                      },
                    }))
                  }
                  className="w-full accent-rosewood-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Style & Polaroid Aesthetic: polaroidFrame, washiTape, opacity, rotation, scale */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Phong Cách Polaroid & Hiệu Ứng (Style)</span>
        </label>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <label className="flex items-center gap-2 p-2 rounded-lg bg-[#25151F] border border-rosewood-900/50 cursor-pointer">
            <input
              type="checkbox"
              disabled={disabled}
              checked={s.polaroidFrame !== false}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  style: { ...el.style, polaroidFrame: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded text-rosewood-600 bg-[#1C0F17] border-rosewood-800"
            />
            <span className="text-[11px] text-stone-200">Khung ảnh Polaroid</span>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-lg bg-[#25151F] border border-rosewood-900/50 cursor-pointer">
            <input
              type="checkbox"
              disabled={disabled}
              checked={s.washiTape !== false}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  style: { ...el.style, washiTape: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded text-rosewood-600 bg-[#1C0F17] border-rosewood-800"
            />
            <span className="text-[11px] text-stone-200">Băng dính Washi Tape</span>
          </label>
        </div>

        {/* Opacity slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-stone-300 mb-1">
            <span>Độ mờ đục (Opacity)</span>
            <span className="font-mono text-stone-400">{Math.round((element.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            disabled={disabled}
            value={element.opacity ?? 1}
            onChange={(e) =>
              onChange((el) => ({
                ...el,
                opacity: safeParseFloat(e.target.value, 1),
              }))
            }
            className="w-full accent-rosewood-500 cursor-pointer"
          />
        </div>

        {/* Rotation */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-stone-300 mb-1">
            <span className="flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-rosewood-400" />
              <span>Góc xoay (Rotation)</span>
            </span>
            <span className="font-mono text-stone-400">{t.rotation || 0}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="0.5"
            disabled={disabled || Boolean(element.locked)}
            value={t.rotation || 0}
            onChange={(e) =>
              onChange((el) => ({
                ...el,
                transform: { ...el.transform, rotation: safeParseFloat(e.target.value, 0) },
              }))
            }
            className="w-full accent-rosewood-500 cursor-pointer"
          />
        </div>

        {/* Scale Multiplier */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-stone-300 mb-1">
            <span>Tỉ lệ phóng to thu nhỏ (Scale)</span>
            <span className="font-mono text-stone-400">{t.scale || 1}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            disabled={disabled || Boolean(element.locked)}
            value={t.scale || 1}
            onChange={(e) =>
              onChange((el) => ({
                ...el,
                transform: { ...el.transform, scale: safeParseFloat(e.target.value, 1) },
              }))
            }
            className="w-full accent-rosewood-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        filterType="IMAGE"
        title="Chọn Hình Ảnh Cho Phần Tử"
      />
    </div>
  );
}
