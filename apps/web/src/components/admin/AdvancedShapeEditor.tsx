'use client';

import React from 'react';
import { ShapeElement, ElementStyle } from '@/types/book';
import { safeParseFloat, safeParseInt } from '@phucandtrang/shared';
import { Square, Circle, Minus, Sliders, Palette, RotateCw } from 'lucide-react';

interface AdvancedShapeEditorProps {
  element: ShapeElement;
  onChange: (updater: (el: ShapeElement) => ShapeElement) => void;
  disabled?: boolean;
}

export default function AdvancedShapeEditor({
  element,
  onChange,
  disabled = false,
}: AdvancedShapeEditorProps) {
  const d = (element.data || {}) as Record<string, any>;
  const s = (element.style || {}) as ElementStyle;
  const t = element.transform;
  const currentShape = d.shapeType || 'rectangle';

  return (
    <div className="space-y-4 text-xs text-parchment-200">
      {/* 1. Shape Type Selection */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
          <Square className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Hình Dáng (Shape Type)</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange((el) => ({
                ...el,
                data: { ...el.data, shapeType: 'rectangle' },
              }))
            }
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition ${
              currentShape === 'rectangle'
                ? 'bg-rosewood-900/80 border-rosewood-500 text-white font-medium shadow-md'
                : 'bg-[#25151F] border-rosewood-900/60 text-stone-400 hover:text-white'
            }`}
          >
            <Square className="w-4 h-4" />
            <span className="text-[10px]">Chữ nhật</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange((el) => ({
                ...el,
                data: { ...el.data, shapeType: 'circle' },
              }))
            }
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition ${
              currentShape === 'circle'
                ? 'bg-rosewood-900/80 border-rosewood-500 text-white font-medium shadow-md'
                : 'bg-[#25151F] border-rosewood-900/60 text-stone-400 hover:text-white'
            }`}
          >
            <Circle className="w-4 h-4" />
            <span className="text-[10px]">Hình tròn</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange((el) => ({
                ...el,
                data: { ...el.data, shapeType: 'line' },
              }))
            }
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition ${
              currentShape === 'line'
                ? 'bg-rosewood-900/80 border-rosewood-500 text-white font-medium shadow-md'
                : 'bg-[#25151F] border-rosewood-900/60 text-stone-400 hover:text-white'
            }`}
          >
            <Minus className="w-4 h-4" />
            <span className="text-[10px]">Đường kẻ</span>
          </button>
        </div>
      </div>

      {/* 2. Color & Stroke Styling */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Màu Sắc &amp; Viền (Colors)</span>
        </label>

        {currentShape !== 'line' && (
          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1">Màu tô (Fill Color)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                disabled={disabled}
                value={d.fillColor || s.backgroundColor || '#C99A9A'}
                onChange={(e) =>
                  onChange((el) => ({
                    ...el,
                    data: { ...el.data, fillColor: e.target.value },
                    style: { ...el.style, backgroundColor: e.target.value },
                  }))
                }
                className="w-8 h-8 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
              />
              <input
                type="text"
                disabled={disabled}
                value={d.fillColor || s.backgroundColor || '#C99A9A'}
                onChange={(e) =>
                  onChange((el) => ({
                    ...el,
                    data: { ...el.data, fillColor: e.target.value },
                    style: { ...el.style, backgroundColor: e.target.value },
                  }))
                }
                className="flex-1 px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Stroke Color */}
        <div>
          <label className="block text-[11px] text-stone-300 font-medium mb-1">
            {currentShape === 'line' ? 'Màu đường kẻ (Line Color)' : 'Màu viền (Stroke Color)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled={disabled}
              value={d.strokeColor || s.borderColor || '#F0B6C3'}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  data: { ...el.data, strokeColor: e.target.value },
                  style: { ...el.style, borderColor: e.target.value },
                }))
              }
              className="w-8 h-8 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
            />
            <input
              type="text"
              disabled={disabled}
              value={d.strokeColor || s.borderColor || '#F0B6C3'}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  data: { ...el.data, strokeColor: e.target.value },
                  style: { ...el.style, borderColor: e.target.value },
                }))
              }
              className="flex-1 px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs"
            />
          </div>
        </div>

        {/* Stroke Width */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-stone-300 mb-1">
            <span>Độ dày viền (Stroke Width)</span>
            <span className="font-mono text-stone-400">{d.strokeWidth || s.borderWidth || 1}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            disabled={disabled}
            value={d.strokeWidth ?? s.borderWidth ?? 1}
            onChange={(e) =>
              onChange((el) => ({
                ...el,
                data: { ...el.data, strokeWidth: safeParseInt(e.target.value, 1) },
                style: { ...el.style, borderWidth: safeParseInt(e.target.value, 1) },
              }))
            }
            className="w-full accent-rosewood-500 cursor-pointer"
          />
        </div>

        {/* Border Radius (only rectangle) */}
        {currentShape === 'rectangle' && (
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-300 mb-1">
              <span>Bo góc (Border Radius)</span>
              <span className="font-mono text-stone-400">{s.borderRadius || 0}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              disabled={disabled}
              value={s.borderRadius || 0}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  style: { ...el.style, borderRadius: safeParseInt(e.target.value, 0) },
                }))
              }
              className="w-full accent-rosewood-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 3. Transform & Opacity */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Biến Đổi &amp; Độ Mờ (Transform)</span>
        </label>

        {/* Opacity */}
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
      </div>
    </div>
  );
}
