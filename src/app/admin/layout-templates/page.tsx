'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminLayoutTemplates } from '@/services/adminApi';
import { LayoutGrid, Layers, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AdminLayoutTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getAdminLayoutTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi tải danh sách template');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-rosewood-900/40 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/books"
            className="p-2 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-stone-300 border border-rosewood-900/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-rosewood-400" />
              <span>Kho Bố Cục Trang (Layout Templates)</span>
            </h1>
            <p className="text-xs text-stone-400">
              Tổng cộng {templates.length} mẫu bố cục chuẩn hóa sẵn sàng cho việc dàn trang tự động
            </p>
          </div>
        </div>

        <button
          onClick={fetchTemplates}
          className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500 text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
          <span>Đang nạp danh sách layout template...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Template Cards List (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => {
              const isSelected = selectedTemplate?.id === tpl.id;
              const slotsCount = Array.isArray(tpl.slots) ? tpl.slots.length : 0;
              const protosCount = Array.isArray(tpl.prototypes) ? tpl.prototypes.length : 0;

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#281522] border-champagne-400/60 shadow-xl'
                      : 'bg-[#180E14] border-rosewood-900/40 hover:border-rosewood-700/50 hover:bg-[#1F121A]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif font-bold text-sm text-parchment-100">
                      {tpl.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#2E1727] text-champagne-300 border border-rosewood-800/50">
                      {tpl.id}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400 line-clamp-2 mb-3">
                    {tpl.description || 'Không có mô tả chi tiết'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 pt-2 border-t border-rosewood-900/40">
                    <span>{slotsCount} slots vị trí</span>
                    <span>{protosCount} phần tử mẫu</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Template Inspector (5 cols) */}
          <div className="lg:col-span-5 bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-5 shadow-xl sticky top-6 space-y-4">
            {selectedTemplate ? (
              <>
                <div className="flex items-center justify-between border-b border-rosewood-900/40 pb-3">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-champagne-300">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-xs text-stone-400 font-mono">ID: {selectedTemplate.id}</p>
                  </div>
                  {selectedTemplate.isSystem && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Hệ Thống</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-300 leading-relaxed">
                  {selectedTemplate.description}
                </p>

                {/* Slots List */}
                <div className="space-y-2 pt-2 border-t border-rosewood-900/40">
                  <h4 className="text-xs font-mono font-semibold text-rosewood-300 uppercase tracking-wider">
                    Các slot vị trí ({selectedTemplate.slots?.length || 0})
                  </h4>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {(selectedTemplate.slots || []).map((slot: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#25151F] border border-rosewood-900/50 text-xs flex items-center justify-between"
                      >
                        <span className="font-mono font-medium text-parchment-200">{slot.name}</span>
                        <span className="text-[10px] font-mono text-stone-400">
                          Loại: {(slot.allowedTypes || []).join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-stone-500">
                Chọn một template bên trái để xem chi tiết cấu trúc.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
