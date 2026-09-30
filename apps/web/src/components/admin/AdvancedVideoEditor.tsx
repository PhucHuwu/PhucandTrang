'use client';

import React, { useState } from 'react';
import { VideoElement, VideoElementData, ElementStyle } from '@/types/book';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import { safeParseFloat } from '@phucandtrang/shared';
import {
  Video,
  Image as ImageIcon,
  Play,
  RotateCw,
  FolderOpen,
  Sparkles,
  Maximize2,
  Sliders,
  MousePointer,
  Check,
  Film,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface AdvancedVideoEditorProps {
  element: VideoElement;
  onChange: (updater: (el: VideoElement) => VideoElement) => void;
  disabled?: boolean;
}

export default function AdvancedVideoEditor({
  element,
  onChange,
  disabled = false,
}: AdvancedVideoEditorProps) {
  const d = (element.data || {}) as VideoElementData;
  const s = (element.style || {}) as ElementStyle;
  const t = element.transform;

  // Picker states: 'video' | 'poster' | null
  const [pickerTarget, setPickerTarget] = useState<'video' | 'poster' | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Handle media selection for video source or poster image
  const handleMediaSelect = (selected: { mediaId: string; url: string; alt?: string }) => {
    if (pickerTarget === 'video') {
      onChange((el) => ({
        ...el,
        data: {
          ...el.data,
          mediaId: selected.mediaId, // Canonical video mediaId
          src: selected.url, // Resolved runtime video URL
          caption: el.data?.caption || selected.alt || 'Video kỷ niệm',
        },
        interaction: {
          ...(el.interaction || { enabled: true, action: 'open-video' }),
          action: 'open-video',
          target: selected.url,
          title: el.interaction?.title || el.data?.caption || selected.alt || 'Xem Video Kỷ Niệm',
          activeArea: el.interaction?.activeArea || { top: 0.1, left: 0.05, width: 0.9, height: 0.85 },
        },
      }));
    } else if (pickerTarget === 'poster') {
      onChange((el) => ({
        ...el,
        data: {
          ...el.data,
          posterMediaId: selected.mediaId, // Canonical poster mediaId
          thumbnailUrl: selected.url, // Resolved runtime poster URL
        },
      }));
    }
    setPickerTarget(null);
  };

  return (
    <div className="space-y-4 text-xs text-parchment-200">
      {/* 1. Video Source Section (Canonical mediaId & runtime src) */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span>Tệp Video MP4 (Video Source)</span>
          </label>

          {d.mediaId && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/70 text-amber-300 border border-amber-500/40">
              mediaId: {d.mediaId.slice(0, 8)}...
            </span>
          )}
        </div>

        {/* Video URL Display & Actions */}
        <div className="space-y-2">
          <input
            type="text"
            disabled={disabled}
            value={d.src || ''}
            onChange={(e) => {
              const newUrl = e.target.value;
              onChange((el) => {
                const updatedData = { ...el.data, src: newUrl };
                // If user changes URL manually and it differs from canonical media URL, clear stale mediaId
                if (el.data.mediaId && newUrl !== el.data.src) {
                  delete updatedData.mediaId;
                }
                return {
                  ...el,
                  data: updatedData,
                  interaction: {
                    ...(el.interaction || { enabled: true, action: 'open-video' }),
                    target: newUrl,
                  },
                };
              });
            }}
            placeholder="https://res.cloudinary.com/.../video.mp4"
            className="w-full px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono text-xs placeholder-stone-600"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPickerTarget('video')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-medium text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{d.src ? 'Thay đổi Video' : 'Chọn / Tải Video'}</span>
            </button>

            {d.src && (
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#25151F] hover:bg-[#331C2A] text-amber-300 border border-amber-700/40 transition-colors"
                title="Phát thử video"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Xem thử</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Poster Image Section (Canonical posterMediaId & runtime thumbnailUrl) */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-pink-300 font-semibold flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
            <span>Ảnh Bìa Poster (Poster Thumbnail)</span>
          </label>

          {d.posterMediaId && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-pink-950/70 text-pink-300 border border-pink-500/40">
              posterMediaId: {d.posterMediaId.slice(0, 8)}...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#10070D] border border-rosewood-900/60 shrink-0 flex items-center justify-center">
            {d.thumbnailUrl ? (
              <img src={d.thumbnailUrl} alt="Poster" className="w-full h-full object-cover" />
            ) : (
              <Film className="w-6 h-6 text-stone-600" />
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPickerTarget('poster')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white font-medium text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{d.thumbnailUrl ? 'Thay đổi ảnh bìa poster' : 'Chọn ảnh bìa poster'}</span>
            </button>
            <p className="text-[10px] text-stone-500 font-mono truncate">
              {d.thumbnailUrl ? d.thumbnailUrl.split('/').pop() : '(Chưa chọn ảnh bìa)'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-stone-300 font-medium mb-1">
            Chú thích / Tiêu đề video (Caption)
          </label>
          <input
            type="text"
            disabled={disabled}
            value={d.caption || ''}
            onChange={(e) =>
              onChange((el) => ({
                ...el,
                data: { ...el.data, caption: e.target.value },
                interaction: {
                  ...(el.interaction || { enabled: true, action: 'open-video' }),
                  title: e.target.value,
                },
              }))
            }
            placeholder="Ví dụ: Sinh nhật bên nhau 2024..."
            className="w-full px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white text-xs placeholder-stone-600"
          />
        </div>
      </div>

      {/* 3. Interaction & Playback Options */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
          <MousePointer className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Tương Tác & Lớp Phủ Video (Interaction)</span>
        </label>

        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 p-2 rounded-lg bg-[#25151F] border border-rosewood-900/50 cursor-pointer">
            <input
              type="checkbox"
              disabled={disabled}
              checked={element.interaction?.action === 'open-video'}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  interaction: {
                    ...(el.interaction || { enabled: true }),
                    action: e.target.checked ? 'open-video' : 'none',
                    target: el.data?.src,
                    title: el.data?.caption || 'Xem Video Kỷ Niệm',
                  },
                }))
              }
              className="w-4 h-4 rounded text-rosewood-600 bg-[#1C0F17] border-rosewood-800"
            />
            <span className="text-[11px] text-stone-200">
              Kích hoạt Video Overlay Popup khi người xem nhấp chuột (open-video)
            </span>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-lg bg-[#25151F] border border-rosewood-900/50 cursor-pointer">
            <input
              type="checkbox"
              disabled={disabled}
              checked={d.muted !== false}
              onChange={(e) =>
                onChange((el) => ({
                  ...el,
                  data: { ...el.data, muted: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded text-rosewood-600 bg-[#1C0F17] border-rosewood-800"
            />
            <span className="text-[11px] text-stone-200">
              Tắt tiếng mặc định (muted) để không ngắt nhạc nền lãng mạn
            </span>
          </label>
        </div>
      </div>

      {/* 4. Style & Polaroid Aesthetic: polaroidFrame, washiTape, opacity, rotation */}
      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Phong Cách Khung Polaroid & Hiệu Ứng (Style)</span>
        </label>

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
            <span className="text-[11px] text-stone-200">Khung Polaroid</span>
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

      {/* Media Picker Modal for Video or Poster */}
      <MediaPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleMediaSelect}
        filterType={pickerTarget === 'video' ? 'VIDEO' : 'IMAGE'}
        title={pickerTarget === 'video' ? 'Chọn Video Từ Thư Viện Media' : 'Chọn Ảnh Bìa Poster Cho Video'}
      />

      {/* Video Preview Modal */}
      {showPreviewModal && d.src && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#160D12] border border-rosewood-800/60 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-rosewood-900/40 pb-2">
              <h4 className="font-serif font-bold text-sm text-champagne-300 flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Xem Thử Video: {d.caption || 'Video Kỷ Niệm'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video src={d.src} controls autoPlay className="w-full h-full object-contain" />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
