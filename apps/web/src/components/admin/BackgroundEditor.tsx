'use client';

import React, { useState } from 'react';
import { PageBackground, LinearGradientConfig, GradientStop } from '@/types/book';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import { safeParseFloat, safeParseInt } from '@phucandtrang/shared';
import {
  Palette,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  SlidersHorizontal,
  FolderOpen,
} from 'lucide-react';

interface BackgroundEditorProps {
  background?: PageBackground;
  onChange: (bg: PageBackground) => void;
  disabled?: boolean;
}

export default function BackgroundEditor({
  background = { type: 'color', color: '#F9F5EC' },
  onChange,
  disabled = false,
}: BackgroundEditorProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const currentType = background.type || 'color';

  // Helper to update background fields cleanly
  const updateField = (fields: Partial<PageBackground>) => {
    onChange({
      ...background,
      ...fields,
    });
  };

  // Helper to switch type
  const handleTypeChange = (newType: 'color' | 'image' | 'gradient') => {
    if (newType === 'color') {
      onChange({
        ...background,
        type: 'color',
        color: background.color || '#F9F5EC',
      });
    } else if (newType === 'image') {
      onChange({
        ...background,
        type: 'image',
        imageUrl: background.imageUrl || 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904218/phuc_trang_backgrounds/page-1.jpg',
        opacity: background.opacity ?? 1.0,
        objectFit: background.objectFit || 'cover',
        focalPoint: background.focalPoint || { x: 0.5, y: 0.5 },
      });
    } else if (newType === 'gradient') {
      onChange({
        ...background,
        type: 'gradient',
        gradient: background.gradient || {
          type: 'linear',
          angle: 180,
          stops: [
            { offset: 0, color: '#FFE8EE' },
            { offset: 1, color: '#F7D6DE' },
          ],
        },
      });
    }
  };

  // Gradient helpers
  const handleGradientAngleChange = (angle: number) => {
    const existingGrad = background.gradient || {
      type: 'linear',
      angle: 180,
      stops: [
        { offset: 0, color: '#FFE8EE' },
        { offset: 1, color: '#F7D6DE' },
      ],
    };
    updateField({
      gradient: {
        ...existingGrad,
        angle,
      },
    });
  };

  const handleUpdateStop = (index: number, updatedStop: Partial<GradientStop>) => {
    if (!background.gradient) return;
    const stops = [...background.gradient.stops];
    stops[index] = { ...stops[index], ...updatedStop };
    updateField({
      gradient: {
        ...background.gradient,
        stops,
      },
    });
  };

  const handleAddStop = () => {
    const existingStops = background.gradient?.stops || [
      { offset: 0, color: '#FFE8EE' },
      { offset: 1, color: '#F7D6DE' },
    ];
    const newStop: GradientStop = { offset: 0.5, color: '#FFFFFF' };
    const newStops = [...existingStops, newStop].sort((a, b) => a.offset - b.offset);
    updateField({
      gradient: {
        type: 'linear',
        angle: background.gradient?.angle ?? 180,
        stops: newStops,
      },
    });
  };

  const handleRemoveStop = (index: number) => {
    if (!background.gradient || background.gradient.stops.length <= 2) {
      alert('Một gradient cần tối thiểu 2 điểm màu (stops).');
      return;
    }
    const stops = background.gradient.stops.filter((_, idx) => idx !== index);
    updateField({
      gradient: {
        ...background.gradient,
        stops,
      },
    });
  };

  return (
    <div className="space-y-5 text-xs text-parchment-200">
      {/* 1. Background Type Switcher */}
      <div>
        <label className="block text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold mb-2">
          Loại Nền (Background Type)
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#1A0E15] border border-rosewood-900/60 rounded-xl">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTypeChange('color')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentType === 'color'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Đơn sắc</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTypeChange('image')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentType === 'image'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Hình ảnh</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTypeChange('gradient')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentType === 'gradient'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Gradient</span>
          </button>
        </div>
      </div>

      {/* 2. COLOR Configuration */}
      {currentType === 'color' && (
        <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
          <label className="block text-[11px] text-stone-300 font-medium">Màu nền trang</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled={disabled}
              value={background.color || '#F9F5EC'}
              onChange={(e) => updateField({ color: e.target.value })}
              className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
            />
            <input
              type="text"
              disabled={disabled}
              value={background.color || '#F9F5EC'}
              onChange={(e) => updateField({ color: e.target.value })}
              className="flex-1 px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs"
            />
          </div>
        </div>
      )}

      {/* 3. IMAGE Configuration: Media picker, objectFit (cover/contain/fill), focalPoint X/Y, opacity */}
      {currentType === 'image' && (
        <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] text-stone-300 font-medium">
                Ảnh nền trang (Background Image)
              </label>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rosewood-900/60 hover:bg-rosewood-800 text-champagne-300 hover:text-white border border-rosewood-700/50 text-[10px] font-medium transition"
                  title="Chọn ảnh từ Thư viện Media"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>Chọn từ Thư viện</span>
                </button>
              )}
            </div>

            <input
              type="text"
              disabled={disabled}
              value={background.imageUrl || ''}
              onChange={(e) => {
                const newUrl = e.target.value;
                updateField({
                  imageUrl: newUrl,
                  mediaId: background.mediaId && newUrl !== background.imageUrl ? undefined : background.mediaId,
                });
              }}
              placeholder="https://res.cloudinary.com/..."
              className="w-full px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs"
            />
          </div>

          {/* Media Picker Modal */}
          {showMediaPicker && (
            <MediaPickerModal
              isOpen={showMediaPicker}
              onClose={() => setShowMediaPicker(false)}
              filterType="IMAGE"
              onSelect={(selected) => {
                updateField({
                  imageUrl: selected.url,
                  mediaId: selected.mediaId,
                });
                setShowMediaPicker(false);
              }}
            />
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-stone-300 font-medium mb-1">Kiểu lấp đầy (objectFit)</label>
              <select
                disabled={disabled}
                value={background.objectFit || 'cover'}
                onChange={(e) => updateField({ objectFit: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white text-xs"
              >
                <option value="cover">cover (Lấp đầy & cắt mép)</option>
                <option value="contain">contain (Giữ nguyên tỉ lệ)</option>
                <option value="fill">fill (Kéo dãn full box)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-stone-300 font-medium mb-1">Độ mờ đục opacity (0 - 1)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                disabled={disabled}
                value={background.opacity ?? 1.0}
                onChange={(e) => updateField({ opacity: safeParseFloat(e.target.value, 1.0) })}
                className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs"
              />
            </div>
          </div>

          {/* FocalPoint X / Y */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-stone-300">
              <span className="font-medium">Điểm neo căn chỉnh (focalPoint X / Y)</span>
              <span className="font-mono text-stone-500">
                X: {Math.round((background.focalPoint?.x ?? 0.5) * 100)}% | Y: {Math.round((background.focalPoint?.y ?? 0.5) * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-stone-400 mb-0.5">Trục ngang X (0: Trái, 1: Phải)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={disabled}
                  value={background.focalPoint?.x ?? 0.5}
                  onChange={(e) =>
                    updateField({
                      focalPoint: {
                        x: safeParseFloat(e.target.value, 0.5),
                        y: background.focalPoint?.y ?? 0.5,
                      },
                    })
                  }
                  className="w-full accent-rosewood-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] text-stone-400 mb-0.5">Trục dọc Y (0: Trên, 1: Dưới)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={disabled}
                  value={background.focalPoint?.y ?? 0.5}
                  onChange={(e) =>
                    updateField({
                      focalPoint: {
                        x: background.focalPoint?.x ?? 0.5,
                        y: safeParseFloat(e.target.value, 0.5),
                      },
                    })
                  }
                  className="w-full accent-rosewood-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. GRADIENT Configuration: angle, multiple stops (color & offset) */}
      {currentType === 'gradient' && (
        <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-stone-300 font-medium">Góc xoay gradient (angle)</label>
            <span className="font-mono text-stone-400">{background.gradient?.angle ?? 180}°</span>
          </div>

          <input
            type="range"
            min="0"
            max="360"
            step="5"
            disabled={disabled}
            value={background.gradient?.angle ?? 180}
            onChange={(e) => handleGradientAngleChange(safeParseInt(e.target.value, 180))}
            className="w-full accent-rosewood-500 cursor-pointer"
          />

          {/* Stops List */}
          <div className="space-y-2 pt-2 border-t border-rosewood-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-stone-300">
                Các điểm chuyển màu (Color Stops)
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={handleAddStop}
                className="flex items-center gap-1 text-[10px] text-champagne-300 hover:text-white bg-rosewood-900/40 hover:bg-rosewood-800/60 px-2 py-0.5 rounded-md border border-rosewood-700/40 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm Stop</span>
              </button>
            </div>

            <div className="space-y-2">
              {(background.gradient?.stops || []).map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[#25151F] border border-rosewood-900/50">
                  <input
                    type="color"
                    disabled={disabled}
                    value={stop.color}
                    onChange={(e) => handleUpdateStop(idx, { color: e.target.value })}
                    className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    disabled={disabled}
                    value={stop.color}
                    onChange={(e) => handleUpdateStop(idx, { color: e.target.value })}
                    className="w-20 px-2 py-1 bg-[#1C0F17] border border-rosewood-900/60 rounded text-[11px] text-white font-mono"
                  />
                  <div className="flex-1 flex items-center gap-1 text-[11px] font-mono text-stone-400">
                    <span>{Math.round(stop.offset * 100)}%</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      disabled={disabled}
                      value={stop.offset}
                      onChange={(e) => handleUpdateStop(idx, { offset: safeParseFloat(e.target.value, 0) })}
                      className="flex-1 accent-rosewood-500 cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={disabled || (background.gradient?.stops.length ?? 0) <= 2}
                    onClick={() => handleRemoveStop(idx)}
                    className="p-1 text-stone-500 hover:text-red-400 disabled:opacity-30"
                    title="Xóa điểm màu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Effects Section: headerFade & gutterFade */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3.5">
        <div className="flex items-center gap-1.5 font-medium text-[11px] uppercase tracking-wider text-rosewood-300 font-mono">
          <Sliders className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Hiệu Ứng Chuyển Mờ (Reading Fade Effects)</span>
        </div>

        {/* Header Fade */}
        <div className="space-y-2 p-2.5 rounded-lg bg-[#25151F] border border-rosewood-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="headerFadeEnabled"
                disabled={disabled}
                checked={background.headerFade?.enabled !== false}
                onChange={(e) =>
                  updateField({
                    headerFade: {
                      ...(background.headerFade || { color: '#F9F5EC', height: 0.345, startOpacity: 0.92, endOpacity: 0 }),
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded text-rosewood-600 bg-[#1C0F17] border-rosewood-800"
              />
              <label htmlFor="headerFadeEnabled" className="text-xs font-medium text-stone-200 cursor-pointer">
                Dải mờ đọc chữ đầu trang (headerFade)
              </label>
            </div>
          </div>

          {background.headerFade?.enabled !== false && (
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
              <div>
                <label className="block text-stone-400 mb-0.5">Độ cao ({Math.round((background.headerFade?.height ?? 0.345) * 100)}%)</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.6"
                  step="0.02"
                  disabled={disabled}
                  value={background.headerFade?.height ?? 0.345}
                  onChange={(e) =>
                    updateField({
                      headerFade: {
                        ...(background.headerFade || { enabled: true, startOpacity: 0.92, endOpacity: 0 }),
                        height: safeParseFloat(e.target.value, 0.345),
                      },
                    })
                  }
                  className="w-full accent-rosewood-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-0.5">Độ mờ ban đầu ({Math.round((background.headerFade?.startOpacity ?? 0.92) * 100)}%)</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  disabled={disabled}
                  value={background.headerFade?.startOpacity ?? 0.92}
                  onChange={(e) =>
                    updateField({
                      headerFade: {
                        ...(background.headerFade || { enabled: true, height: 0.345, endOpacity: 0 }),
                        startOpacity: safeParseFloat(e.target.value, 0.92),
                      },
                    })
                  }
                  className="w-full accent-rosewood-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Gutter Fade */}
        <div className="space-y-2 p-2.5 rounded-lg bg-[#25151F] border border-rosewood-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gutterFadeEnabled"
                disabled={disabled}
                checked={background.gutterFade?.enabled !== false}
                onChange={(e) =>
                  updateField({
                    gutterFade: {
                      ...(background.gutterFade || { width: 0.14, opacity: 0.28 }),
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded text-rosewood-600 bg-[#1C0F17] border-rosewood-800"
              />
              <label htmlFor="gutterFadeEnabled" className="text-xs font-medium text-stone-200 cursor-pointer">
                Bóng đổ gáy sách (gutterFade)
              </label>
            </div>
          </div>

          {background.gutterFade?.enabled !== false && (
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
              <div>
                <label className="block text-stone-400 mb-0.5">Bề rộng ({Math.round((background.gutterFade?.width ?? 0.14) * 100)}%)</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.3"
                  step="0.01"
                  disabled={disabled}
                  value={background.gutterFade?.width ?? 0.14}
                  onChange={(e) =>
                    updateField({
                      gutterFade: {
                        ...(background.gutterFade || { enabled: true, opacity: 0.28 }),
                        width: safeParseFloat(e.target.value, 0.14),
                      },
                    })
                  }
                  className="w-full accent-rosewood-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-0.5">Độ đậm ({Math.round((background.gutterFade?.opacity ?? 0.28) * 100)}%)</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.02"
                  disabled={disabled}
                  value={background.gutterFade?.opacity ?? 0.28}
                  onChange={(e) =>
                    updateField({
                      gutterFade: {
                        ...(background.gutterFade || { enabled: true, width: 0.14 }),
                        opacity: safeParseFloat(e.target.value, 0.28),
                      },
                    })
                  }
                  className="w-full accent-rosewood-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
