'use client';

import React, { useState } from 'react';
import { Page } from '@/types/book';
import { extractLayoutDefinitionFromPage } from '@/templates/layoutPresets';
import { createAdminLayoutTemplate } from '@/services/adminApi';
import { BookmarkPlus, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface SaveAsLayoutModalProps {
  page: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (newTemplate: any) => void;
}

export default function SaveAsLayoutModal({
  page,
  isOpen,
  onClose,
  onSaved,
}: SaveAsLayoutModalProps) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!templateId) {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setTemplateId(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !templateId.trim()) {
      setError('Vui lòng nhập tên và mã định danh cho layout template');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Extract normalized slots and prototypes from current page arrangement
      const layoutDef = extractLayoutDefinitionFromPage(
        page,
        templateId.trim(),
        name.trim(),
        description.trim() || undefined
      );

      // Create custom layout template via API (isSystem is strictly false)
      const created = await createAdminLayoutTemplate({
        id: layoutDef.id,
        name: layoutDef.name,
        description: layoutDef.description,
        slots: layoutDef.slots,
        prototypes: layoutDef.elementPrototypes,
        isSystem: false,
      });

      if (onSaved) {
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi lưu bố cục trang');
    } finally {
      setSubmitting(false);
    }
  };

  const elementsCount = (page.elements || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#180E14] border border-rosewood-800/60 rounded-2xl shadow-2xl overflow-hidden text-parchment-100 flex flex-col">
        {/* Header */}
        <div className="h-14 px-5 bg-[#20111A] border-b border-rosewood-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rosewood-600 to-rosewood-800 flex items-center justify-center text-champagne-300 shadow">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-parchment-100">
                Lưu Thành Bố Cục Mới (Save as Layout)
              </h3>
              <p className="text-[11px] text-rosewood-300/70 font-mono">
                Lưu {elementsCount} phần tử hiện tại thành template tùy biến
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-rosewood-900/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs text-center">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-stone-300 font-medium mb-1">
              Tên bố cục (Layout Name) <span className="text-rosewood-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ví dụ: Bố Cục Album Mùa Thu 3 Ảnh"
              className="w-full px-3 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-medium mb-1">
              Mã định danh (Template ID) <span className="text-rosewood-400">*</span>
            </label>
            <input
              type="text"
              required
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="bo-cuc-album-mua-thu"
              className="w-full px-3 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
            />
            <p className="text-[10px] text-stone-500 mt-1 font-mono">
              Hỗ trợ chuỗi chữ thường, số và dấu gạch ngang (arbitrary string).
            </p>
          </div>

          <div>
            <label className="block text-stone-300 font-medium mb-1">Mô tả tóm tắt</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Bố cục 1 ảnh chủ đạo trên và 2 ảnh polaroid lãng mạn bên dưới..."
              className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#20111A] border border-rosewood-900/40 text-[11px] text-stone-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-parchment-200">
              <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
              <span>Bố cục tùy biến (Custom Layout)</span>
            </div>
            <p>
              Tự động lưu tọa độ normalized, góc xoay, zIndex và kiểu dáng của {elementsCount} phần tử hiện tại. Sau khi lưu, bạn có thể áp dụng ngay cho bất kỳ trang nào khác.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-rosewood-900/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>{submitting ? 'Đang tạo template...' : 'Lưu bố cục'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
