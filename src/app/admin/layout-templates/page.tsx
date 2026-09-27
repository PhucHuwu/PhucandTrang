'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAdminLayoutTemplates,
  updateAdminLayoutTemplate,
  duplicateAdminLayoutTemplate,
  deleteAdminLayoutTemplate,
} from '@/services/adminApi';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  LayoutGrid,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Trash2,
  Edit2,
  Sparkles,
  Info,
  Check,
  X,
} from 'lucide-react';

export default function AdminLayoutTemplatesPage() {
  const { isViewer } = useAdminAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  // Edit / Rename modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Duplicate modal state
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [dupId, setDupId] = useState('');
  const [dupName, setDupName] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getAdminLayoutTemplates();
      setTemplates(data);
      if (data.length > 0) {
        if (!selectedTemplate) {
          setSelectedTemplate(data[0]);
        } else {
          const matched = data.find((t) => t.id === selectedTemplate.id);
          setSelectedTemplate(matched || data[0]);
        }
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

  const handleStartEdit = () => {
    if (!selectedTemplate) return;
    setEditName(selectedTemplate.name);
    setEditDescription(selectedTemplate.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTemplate || !editName.trim()) return;
    setActionLoading(true);
    try {
      const updated = await updateAdminLayoutTemplate(selectedTemplate.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
      setSelectedTemplate(updated);
      setToast('Đã cập nhật tên và mô tả bố cục thành công!');
      setTimeout(() => setToast(null), 3000);
      await fetchTemplates();
    } catch (err: any) {
      alert(err?.message || 'Lỗi cập nhật bố cục');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDuplicate = () => {
    if (!selectedTemplate) return;
    setDupId(`${selectedTemplate.id}-copy`);
    setDupName(`${selectedTemplate.name} (Bản sao)`);
    setIsDuplicating(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!selectedTemplate || !dupId.trim() || !dupName.trim()) return;
    setActionLoading(true);
    try {
      const duplicated = await duplicateAdminLayoutTemplate(
        selectedTemplate.id,
        dupId.trim(),
        dupName.trim()
      );
      setIsDuplicating(false);
      setSelectedTemplate(duplicated);
      setToast(`Đã nhân bản bố cục thành "${duplicated.name}"!`);
      setTimeout(() => setToast(null), 3000);
      await fetchTemplates();
    } catch (err: any) {
      alert(err?.message || 'Lỗi nhân bản bố cục');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (tpl: any) => {
    if (tpl.isSystem) {
      alert('Không thể xóa bố cục hệ thống mặc định!');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa bố cục tùy biến "${tpl.name}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await deleteAdminLayoutTemplate(tpl.id);
      setToast(`Đã xóa bố cục "${tpl.name}" thành công.`);
      setTimeout(() => setToast(null), 3000);
      setSelectedTemplate(null);
      await fetchTemplates();
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa bố cục');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-rosewood-900/40 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages"
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
              Tổng cộng {templates.length} mẫu bố cục (Hệ thống & Tùy biến người dùng)
            </p>
          </div>
        </div>

        <button
          onClick={fetchTemplates}
          className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
          title="Làm mới danh sách"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs text-center animate-fade-in flex items-center justify-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

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
              const isSystem = Boolean(tpl.isSystem);

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#281522] border-champagne-400/80 shadow-xl ring-1 ring-champagne-400/30'
                      : 'bg-[#180E14] border-rosewood-900/40 hover:border-rosewood-700/50 hover:bg-[#1F121A]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-serif font-bold text-sm text-parchment-100">
                        {tpl.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          isSystem
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                            : 'bg-pink-950/70 text-pink-300 border-pink-500/40'
                        }`}
                      >
                        {isSystem ? 'Hệ thống' : 'Tùy biến'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-400 line-clamp-2 mb-3 leading-relaxed">
                      {tpl.description || 'Bố cục tự động dàn trang tối ưu'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 pt-2 border-t border-rosewood-900/40">
                    <span>{slotsCount} slots</span>
                    <span className="text-[10px] text-stone-600 truncate max-w-[140px]">{tpl.id}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Template Inspector (5 cols) */}
          <div className="lg:col-span-5 bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-5 shadow-xl sticky top-6 space-y-4">
            {selectedTemplate ? (
              <>
                <div className="flex items-start justify-between border-b border-rosewood-900/40 pb-3 gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-champagne-300">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-xs text-stone-400 font-mono">ID: {selectedTemplate.id}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Duplicate */}
                    {!isViewer && (
                      <button
                        type="button"
                        onClick={handleStartDuplicate}
                        className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 transition-colors"
                        title="Nhân bản bố cục này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Edit Name & Description (Only for Custom Templates or Admin) */}
                    {!isViewer && (!selectedTemplate.isSystem) && (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="p-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 transition-colors"
                        title="Đổi tên / sửa mô tả"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Custom Layout (Never delete system templates) */}
                    {!isViewer && !selectedTemplate.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedTemplate)}
                        className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors"
                        title="Xóa bố cục tùy biến này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      selectedTemplate.isSystem
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                        : 'bg-pink-950/70 text-pink-300 border-pink-500/40'
                    }`}
                  >
                    {selectedTemplate.isSystem ? 'Bố cục Hệ thống (Bảo vệ)' : 'Bố cục Tùy biến (Custom)'}
                  </span>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed">
                  {selectedTemplate.description || 'Chưa có mô tả cho mẫu bố cục này.'}
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
                          {(slot.allowedTypes || []).join(', ')}
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

      {/* Edit / Rename Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-md bg-[#180E14] border border-rosewood-800/60 rounded-2xl shadow-2xl p-6 text-parchment-100 space-y-4">
            <h3 className="font-serif font-bold text-sm text-champagne-300">
              Đổi Tên & Mô Tả Bố Cục
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-medium mb-1">Tên bố cục</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Mô tả</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rosewood-900/40 text-xs">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading || !editName.trim()}
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white font-semibold"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {isDuplicating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-md bg-[#180E14] border border-rosewood-800/60 rounded-2xl shadow-2xl p-6 text-parchment-100 space-y-4">
            <h3 className="font-serif font-bold text-sm text-champagne-300">
              Nhân Bản Bố Cục Thành Custom Template
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-medium mb-1">Tên bố cục mới</label>
                <input
                  type="text"
                  value={dupName}
                  onChange={(e) => setDupName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Mã định danh mới (ID)</label>
                <input
                  type="text"
                  value={dupId}
                  onChange={(e) => setDupId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono focus:outline-none focus:border-rosewood-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rosewood-900/40 text-xs">
              <button
                type="button"
                onClick={() => setIsDuplicating(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading || !dupId.trim() || !dupName.trim()}
                onClick={handleConfirmDuplicate}
                className="px-4 py-2 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white font-semibold"
              >
                Nhân bản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
