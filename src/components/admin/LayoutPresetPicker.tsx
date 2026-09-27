'use client';

import React, { useEffect, useState } from 'react';
import { getAdminLayoutTemplates } from '@/services/adminApi';
import { LayoutPresetDefinition } from '@/templates/layoutPresets';
import {
  LayoutGrid,
  Check,
  AlertTriangle,
  X,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface LayoutPresetPickerProps {
  currentTemplateId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectLayout: (template: LayoutPresetDefinition) => void;
  hasCustomizations?: boolean;
}

export default function LayoutPresetPicker({
  currentTemplateId,
  isOpen,
  onClose,
  onSelectLayout,
  hasCustomizations = false,
}: LayoutPresetPickerProps) {
  const [templates, setTemplates] = useState<LayoutPresetDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(currentTemplateId || 'single-hero');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadTemplates() {
      setLoading(true);
      try {
        const data = await getAdminLayoutTemplates();
        setTemplates(data);
        if (currentTemplateId) {
          setSelectedId(currentTemplateId);
        } else if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (err: any) {
        console.error('Lỗi nạp layout templates:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, [isOpen, currentTemplateId]);

  if (!isOpen) return null;

  const currentSelected = templates.find((t) => t.id === selectedId);

  const handleApplyClick = () => {
    if (!currentSelected) return;

    // If current arrangement is customized or different template, show confirmation warning
    if (hasCustomizations || (currentTemplateId && currentTemplateId !== selectedId)) {
      setShowConfirm(true);
      return;
    }

    onSelectLayout(currentSelected);
    onClose();
  };

  const handleConfirmApply = () => {
    if (!currentSelected) return;
    setShowConfirm(false);
    onSelectLayout(currentSelected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-[#180E14] border border-rosewood-800/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="h-14 px-6 bg-[#20111A] border-b border-rosewood-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rosewood-600 to-rosewood-800 flex items-center justify-center text-champagne-300 shadow">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-parchment-100 tracking-wide">
                Chọn Bố Cục Trang (Layout Preset Picker)
              </h3>
              <p className="text-[11px] text-rosewood-300/70 font-mono">
                Áp dụng template vị trí, giữ nguyên toàn bộ ảnh và nội dung hiện có
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

        {/* Content Area: Grid of Templates & Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-stone-500 text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
              <span>Đang tải các mẫu bố cục từ cơ sở dữ liệu...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {templates.map((tpl) => {
                const isSelected = tpl.id === selectedId;
                const isCurrent = tpl.id === currentTemplateId;
                const slotsCount = Array.isArray(tpl.slots) ? tpl.slots.length : 0;
                const protos: any[] = (tpl as any).elementPrototypes || (tpl as any).prototypes || [];

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedId(tpl.id)}
                    className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#291423] border-champagne-400 shadow-xl shadow-rosewood-950/60 ring-1 ring-champagne-400/40'
                        : 'bg-[#1D1018] border-rosewood-900/40 hover:border-rosewood-700/60 hover:bg-[#23141F]'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-2.5">
                        <span className="font-serif font-bold text-xs text-parchment-100 group-hover:text-champagne-300 transition-colors">
                          {tpl.name}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                            Đang dùng
                          </span>
                        )}
                      </div>

                      {/* Schematic Diagram Thumbnail */}
                      <div className="relative aspect-[3/4] w-full max-h-40 rounded-xl bg-[#10080D] border border-rosewood-900/40 mb-3 overflow-hidden p-2 flex flex-col justify-between">
                        {/* Title guide line */}
                        <div className="h-1.5 w-1/2 bg-rosewood-700/60 rounded" />
                        <div className="h-1 w-3/4 bg-stone-700/40 rounded mt-1" />

                        {/* Middle Slots Blueprint */}
                        <div className="flex-1 my-2 flex items-center justify-center relative">
                          {protos
                            .filter((pr) => pr.slot && pr.slot.toLowerCase().includes('image'))
                            .map((pr, idx) => {
                              const t = pr.transform || { x: 0.1, y: 0.3, width: 0.8, height: 0.5 };
                              return (
                                <div
                                  key={idx}
                                  className="absolute rounded bg-rosewood-600/30 border border-champagne-400/40 flex items-center justify-center text-[9px] font-mono text-champagne-300/80"
                                  style={{
                                    left: `${t.x * 100}%`,
                                    top: `${(t.y - 0.25) * 120}%`,
                                    width: `${t.width * 100}%`,
                                    height: `${t.height * 100}%`,
                                    transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined,
                                  }}
                                >
                                  {idx + 1}
                                </div>
                              );
                            })}
                        </div>

                        {/* Signature line */}
                        <div className="h-1 w-1/3 bg-stone-700/40 rounded self-end" />
                      </div>

                      <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
                        {tpl.description || 'Bố cục tự động dàn trang tối ưu'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-rosewood-900/40 flex items-center justify-between text-[10px] font-mono text-stone-500">
                      <span>{slotsCount} vị trí (slots)</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-champagne-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-6 bg-[#20111A] border-t border-rosewood-900/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-rosewood-400" />
            <span>
              Áp dụng sẽ sắp xếp lại vị trí các phần tử theo layout mới, sau đó bạn vẫn có thể kéo thả tự do.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!currentSelected || loading}
              onClick={handleApplyClick}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-lg shadow-rosewood-950/60 transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
              <span>Áp dụng bố cục này</span>
            </button>
          </div>
        </div>

        {/* Confirmation Sub-Modal if layout will reset customized arrangements */}
        {showConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="max-w-md w-full p-6 rounded-2xl bg-[#23121D] border border-amber-500/50 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center mx-auto text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-serif font-bold text-base text-parchment-100">
                  Xác nhận thay đổi bố cục trang?
                </h4>
                <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                  Trang hiện tại đã được bạn kéo thả / điều chỉnh thủ công. Việc áp dụng layout mới{' '}
                  <strong className="text-champagne-300">&quot;{currentSelected?.name}&quot;</strong> sẽ sắp xếp lại tọa độ của các phần tử theo khuôn mẫu mới.
                </p>
                <p className="text-[11px] text-stone-400 mt-1 font-mono">
                  (Toàn bộ nội dung chữ, ảnh và video của bạn vẫn được giữ nguyên vẹn 100%).
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                >
                  Giữ bố cục cũ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApply}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg transition-colors"
                >
                  Đồng ý áp dụng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
