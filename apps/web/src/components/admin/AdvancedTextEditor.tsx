'use client';

import React, { useMemo } from 'react';
import { TextElement, TextElementData, ElementStyle, Book, Page } from '@/types/book';
import { TextVariableResolver, safeParseFloat, safeParseInt } from '@phucandtrang/shared';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Sparkles,
  Eye,
  Sliders,
  RotateCw,
  SunMedium,
  Layers,
} from 'lucide-react';

interface AdvancedTextEditorProps {
  element: TextElement;
  book?: Partial<Book> | null;
  page?: Page | null;
  onChange: (updater: (el: TextElement) => TextElement) => void;
  disabled?: boolean;
}

const FONT_OPTIONS = [
  { label: 'Cormorant Garamond (Serif Cổ Điển)', value: '"Cormorant Garamond", Georgia, serif' },
  { label: 'Dancing Script (Viết Tay Cảm Xúc)', value: '"Dancing Script", cursive' },
  { label: 'SVN-Housttely Signature (Chữ Ký Nghệ Thuật)', value: '"SVN-Housttely Signature", cursive, serif' },
  { label: 'Montserrat (Hiện Đại Không Chân)', value: 'Montserrat, sans-serif' },
  { label: 'Playfair Display (Thanh Lịch Sang Trọng)', value: '"Playfair Display", Georgia, serif' },
];

const QUICK_VARIABLES = [
  { label: '{{daysTogether}}', value: '{{daysTogether}}', desc: 'Số ngày yêu nhau' },
  { label: '{{daysTogether | number}}', value: '{{daysTogether | number}}', desc: 'Số ngày có dấu chấm (VD: 1.432)' },
  { label: '{{anniversaryDate}}', value: '{{anniversaryDate}}', desc: 'Ngày kỷ niệm (20.10.2022)' },
  { label: '{{couple.he}}', value: '{{couple.he}}', desc: 'Tên bạn nam (Phúc)' },
  { label: '{{couple.she}}', value: '{{couple.she}}', desc: 'Tên bạn nữ (Trang)' },
  { label: '{{currentDate}}', value: '{{currentDate}}', desc: 'Ngày hôm nay' },
];

export default function AdvancedTextEditor({
  element,
  book,
  page,
  onChange,
  disabled = false,
}: AdvancedTextEditorProps) {
  const d = element.data as TextElementData;
  const s = (element.style || {}) as ElementStyle;
  const t = element.transform;

  // Resolve template string into live preview for user feedback
  const varContext = useMemo(() => {
    return TextVariableResolver.createContext({
      book: book || undefined,
      page: page || undefined,
    });
  }, [book, page]);

  const rawText = d.text || (d.textLines ? d.textLines.join('\n') : '');
  const resolvedPreview = useMemo(() => {
    return TextVariableResolver.resolve(rawText, varContext);
  }, [rawText, varContext]);

  // Insert variable tag into textarea at cursor or end
  const insertVariable = (variableTag: string) => {
    if (disabled) return;
    const newText = rawText ? `${rawText} ${variableTag}` : variableTag;
    onChange((el) => ({
      ...el,
      data: {
        ...el.data,
        text: newText,
      },
    }));
  };

  return (
    <div className="space-y-4 text-xs text-parchment-200">
      {/* 1. Text Input & Live Variable Resolver Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-rosewood-400" />
            <span>Nội Dung Văn Bản (Text)</span>
          </label>
        </div>

        <textarea
          rows={3}
          disabled={disabled}
          value={rawText}
          onChange={(e) =>
            onChange((el) => ({
              ...el,
              data: {
                ...el.data,
                text: e.target.value,
              },
            }))
          }
          placeholder="Nhập nội dung chữ hoặc chèn biến động..."
          className="w-full px-3 py-2 bg-[#20111A] border border-rosewood-900/60 rounded-xl text-white font-serif text-xs placeholder-stone-600 focus:outline-none focus:border-rosewood-500 disabled:opacity-50"
        />

        {/* Dynamic Variable Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-champagne-400" />
            <span>Chèn biến động nhanh (Click để chèn):</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_VARIABLES.map((v) => (
              <button
                key={v.value}
                type="button"
                disabled={disabled}
                onClick={() => insertVariable(v.value)}
                className="px-2 py-0.5 rounded-lg bg-[#271520] hover:bg-rosewood-900/60 text-champagne-300 font-mono text-[10px] border border-rosewood-800/40 transition-colors"
                title={v.desc}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Resolved Preview Box */}
        {rawText.includes('{{') && (
          <div className="p-2.5 rounded-xl bg-[#1C0F17] border border-champagne-500/30 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-mono text-champagne-400 uppercase font-semibold">
              <Eye className="w-3 h-3" />
              <span>Giá Trị Thực Tế Sau Khi Phân Giải (Preview):</span>
            </div>
            <p className="text-white font-serif text-xs italic break-words leading-relaxed">
              &ldquo;{resolvedPreview}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* 2. Typography: FontFamily, FontSize, Variant */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <div>
          <label className="block text-[11px] text-stone-300 font-medium mb-1">Kiểu phông chữ (fontFamily)</label>
          <select
            disabled={disabled}
            value={s.fontFamily || '"Cormorant Garamond", Georgia, serif'}
            onChange={(e) =>
              onChange((el) => ({
                ...el,
                style: { ...el.style, fontFamily: e.target.value },
              }))
            }
            className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white text-xs"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1">Cỡ chữ fontSize (px)</label>
            <input
              type="number"
              min="8"
              max="160"
              disabled={disabled}
              value={s.fontSize || 24}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  style: { ...el.style, fontSize: parseInt(e.target.value, 10) || 24 },
                }))
              }
              className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1">Biến thể variant</label>
            <select
              disabled={disabled}
              value={d.variant || 'body'}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  data: { ...el.data, variant: e.target.value as any },
                }))
              }
              className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
            >
              <option value="body">Body (Thân bài)</option>
              <option value="title">Title (Tiêu đề lớn)</option>
              <option value="chapter-label">Chapter (Nhãn chương)</option>
              <option value="quote">Quote (Trích dẫn nghiêng)</option>
              <option value="handwriting">Handwriting (Viết tay)</option>
              <option value="caption">Caption (Chú thích ảnh)</option>
            </select>
          </div>
        </div>

        {/* Bold, Italic & Text Alignment */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Bold & Italic Toggles */}
          <div>
            <label className="block text-[10px] text-stone-400 mb-1">Định dạng chữ</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange((el) => ({
                    ...el,
                    style: {
                      ...el.style,
                      fontWeight: el.style?.fontWeight === 'bold' ? 'normal' : 'bold',
                    },
                  }))
                }
                className={`p-1.5 rounded-lg border transition-colors ${
                  s.fontWeight === 'bold'
                    ? 'bg-rosewood-600 text-white border-rosewood-500'
                    : 'bg-[#25151F] text-stone-400 border-rosewood-900/60 hover:text-white'
                }`}
                title="Chữ đậm (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange((el) => ({
                    ...el,
                    style: {
                      ...el.style,
                      fontStyle: el.style?.fontStyle === 'italic' ? 'normal' : 'italic',
                    },
                  }))
                }
                className={`p-1.5 rounded-lg border transition-colors ${
                  s.fontStyle === 'italic'
                    ? 'bg-rosewood-600 text-white border-rosewood-500'
                    : 'bg-[#25151F] text-stone-400 border-rosewood-900/60 hover:text-white'
                }`}
                title="Chữ nghiêng (Italic)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Alignment Toggles */}
          <div>
            <label className="block text-[10px] text-stone-400 mb-1">Căn lề (Alignment)</label>
            <div className="flex items-center gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange((el) => ({
                      ...el,
                      style: { ...el.style, textAlign: align },
                    }))
                  }
                  className={`p-1.5 rounded-lg border transition-colors ${
                    (s.textAlign || 'left') === align
                      ? 'bg-rosewood-600 text-white border-rosewood-500'
                      : 'bg-[#25151F] text-stone-400 border-rosewood-900/60 hover:text-white'
                  }`}
                  title={`Căn ${align}`}
                >
                  {align === 'left' ? (
                    <AlignLeft className="w-3.5 h-3.5" />
                  ) : align === 'center' ? (
                    <AlignCenter className="w-3.5 h-3.5" />
                  ) : (
                    <AlignRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Color, LineHeight, LetterSpacing & Opacity */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        {/* Color */}
        <div>
          <label className="block text-[11px] text-stone-300 font-medium mb-1">Màu sắc (Color)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled={disabled}
              value={s.color || '#292522'}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  style: { ...el.style, color: e.target.value },
                }))
              }
              className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
            />
            <input
              type="text"
              disabled={disabled}
              value={s.color || '#292522'}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  style: { ...el.style, color: e.target.value },
                }))
              }
              className="flex-1 px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1">
              Dãn dòng lineHeight ({s.lineHeight || Math.round((s.fontSize || 24) * 1.35)}px)
            </label>
            <input
              type="number"
              min="10"
              max="200"
              disabled={disabled}
              value={s.lineHeight || Math.round((s.fontSize || 24) * 1.35)}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  style: { ...el.style, lineHeight: safeParseInt(e.target.value, 24) },
                }))
              }
              className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1">
              Khoảng cách chữ (letterSpacing)
            </label>
            <input
              type="number"
              step="0.5"
              min="-2"
              max="20"
              disabled={disabled}
              value={s.letterSpacing ?? 0}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  style: { ...el.style, letterSpacing: safeParseFloat(e.target.value, 0) },
                }))
              }
              className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs"
            />
          </div>
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
            step="1"
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

      {/* 4. Shadow Configuration */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-stone-300 flex items-center gap-1.5">
            <SunMedium className="w-3.5 h-3.5 text-champagne-400" />
            <span>Hiệu ứng đổ bóng (Shadow)</span>
          </label>
          <input
            type="checkbox"
            disabled={disabled}
            checked={Boolean(s.shadow)}
            onChange={(e) =>
              onChange((el) => ({
                ...el,
                style: {
                  ...el.style,
                  shadow: e.target.checked
                    ? el.style?.shadow || { color: 'rgba(0,0,0,0.5)', blur: 6, offsetX: 0, offsetY: 2 }
                    : undefined,
                },
              }))
            }
            className="w-4 h-4 rounded text-rosewood-600 bg-[#25151F] border-rosewood-800"
          />
        </div>

        {s.shadow && (
          <div className="space-y-2 pt-1 border-t border-rosewood-900/40">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-stone-400 mb-0.5">Blur (px)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  disabled={disabled}
                  value={s.shadow.blur ?? 0}
                  onChange={(e) =>
                    onChange((el) => ({
                      ...el,
                      style: {
                        ...el.style,
                        shadow: { ...el.style!.shadow!, blur: safeParseInt(e.target.value, 0) },
                      },
                    }))
                  }
                  className="w-full px-2 py-1 bg-[#25151F] border border-rosewood-900/60 rounded text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-stone-400 mb-0.5">Offset X</label>
                <input
                  type="number"
                  min="-30"
                  max="30"
                  disabled={disabled}
                  value={s.shadow.offsetX ?? 0}
                  onChange={(e) =>
                    onChange((el) => ({
                      ...el,
                      style: {
                        ...el.style,
                        shadow: { ...el.style!.shadow!, offsetX: safeParseInt(e.target.value, 0) },
                      },
                    }))
                  }
                  className="w-full px-2 py-1 bg-[#25151F] border border-rosewood-900/60 rounded text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-stone-400 mb-0.5">Offset Y</label>
                <input
                  type="number"
                  min="-30"
                  max="30"
                  disabled={disabled}
                  value={s.shadow.offsetY ?? 0}
                  onChange={(e) =>
                    onChange((el) => ({
                      ...el,
                      style: {
                        ...el.style,
                        shadow: { ...el.style!.shadow!, offsetY: safeParseInt(e.target.value, 0) },
                      },
                    }))
                  }
                  className="w-full px-2 py-1 bg-[#25151F] border border-rosewood-900/60 rounded text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-stone-400 mb-0.5">Màu bóng đổ</label>
              <input
                type="text"
                disabled={disabled}
                value={s.shadow.color || 'rgba(0,0,0,0.5)'}
                onChange={(e) =>
                  onChange((el) => ({
                    ...el,
                    style: {
                      ...el.style,
                      shadow: { ...el.style!.shadow!, color: e.target.value },
                    },
                  }))
                }
                className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded text-xs text-white font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
