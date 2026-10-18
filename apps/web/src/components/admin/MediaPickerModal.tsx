'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAdminDialog } from '@/hooks/useAdminDialog';
import DialogPortal from '@/components/admin/DialogPortal';
import {
  getAdminMedia,
  requestSignedUpload,
  saveUploadedMediaMetadata,
} from '@/services/adminApi';
import { uploadDirectToCloudinary } from '@/services/mediaApi';
import { Media, MediaType } from '@/types/book';
import {
  Image as ImageIcon,
  Video,
  Upload,
  Search,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: { mediaId: string; url: string; alt?: string; width?: number | null; height?: number | null }) => void;
  filterType?: MediaType;
  title?: string;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  filterType = 'IMAGE',
  title = 'Chọn Hình Ảnh Từ Thư Viện Media',
}: MediaPickerModalProps) {
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useAdminDialog(isOpen, onClose);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const data = await getAdminMedia({
        type: filterType,
        search: search.trim() || undefined,
        limit: 80,
      });
      setMediaList(data.items || []);
    } catch (err: any) {
      console.error('Lỗi nạp danh sách media:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen, filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMedia();
  };

  // Direct Cloudinary Upload Flow without passing file bytes through NestJS
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get signed config from Backend
      const config = await requestSignedUpload(filterType);

      // 2. Upload directly to Cloudinary
      const uploadRes = await uploadDirectToCloudinary(file, config, (percent) => {
        setUploadProgress(percent);
      });

      // 3. Save metadata to database
      const savedMedia = await saveUploadedMediaMetadata({
        type: filterType,
        url: uploadRes.url,
        publicId: uploadRes.publicId,
        width: uploadRes.width,
        height: uploadRes.height,
        mimeType: file.type || `image/${uploadRes.format}`,
        size: uploadRes.bytes || file.size,
        alt: file.name.replace(/\.[^/.]+$/, ''),
      });

      // Immediately select newly uploaded media
      onSelect({
        mediaId: savedMedia.id,
        url: savedMedia.url,
        alt: savedMedia.alt || undefined,
        width: savedMedia.width,
        height: savedMedia.height,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Lỗi tải ảnh lên');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  const currentSelected = mediaList.find((m) => m.id === selectedId);

  const handleConfirmSelect = () => {
    if (!currentSelected) return;
    onSelect({
      mediaId: currentSelected.id,
      url: currentSelected.url,
      alt: currentSelected.alt || undefined,
      width: currentSelected.width,
      height: currentSelected.height,
    });
    onClose();
  };

  return (
    <DialogPortal>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className="cms-dialog fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="cms-dialog-panel relative w-full max-w-4xl bg-[#180E14] border border-rosewood-800/60 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] text-parchment-100">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 bg-[#20111A] border-b border-rosewood-900/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="hidden sm:flex w-8 h-8 shrink-0 rounded-xl bg-gradient-to-tr from-rosewood-600 to-rosewood-800 items-center justify-center text-champagne-300 shadow">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-base text-parchment-100 truncate">{title}</h3>
              <p className="text-[11px] text-rosewood-300/80 truncate">
                Chọn file có sẵn hoặc tải file mới lên
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-stone-400 hover:text-white hover:bg-rosewood-900/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Direct Upload */}
        <div className="p-3 sm:p-4 bg-[#140A0F] border-b border-rosewood-900/40 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
          <form onSubmit={handleSearchSubmit} role="search" className="relative flex-1 min-w-[12rem] sm:max-w-80">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên..."
              aria-label="Tìm media theo tên"
              className="w-full h-11 pl-9 pr-3 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rosewood-500"
            />
          </form>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchMedia}
              aria-label="Làm mới"
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept={filterType === 'VIDEO' ? 'video/mp4,video/*' : filterType === 'AUDIO' ? 'audio/*' : 'image/*'}
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-11 flex items-center justify-center gap-1.5 px-4 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white text-sm font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? `Đang tải (${uploadProgress}%)` : filterType === 'VIDEO' ? 'Tải video' : 'Tải ảnh'}</span>
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-500 text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
              <span>Đang nạp thư viện media...</span>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-20 text-center text-xs text-stone-500">
              Không tìm thấy media phù hợp. Bấm nút tải lên để bổ sung vào thư viện.
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2 sm:gap-3">
              {mediaList.map((m) => {
                const isSelected = m.id === selectedId;

                return (
                  <button
                    type="button"
                    key={m.id}
                    aria-pressed={isSelected}
                    aria-label={m.alt || m.publicId?.split('/').pop() || 'Ảnh'}
                    onClick={() => setSelectedId(m.id)}
                    onDoubleClick={() => { setSelectedId(m.id); onSelect({ mediaId: m.id, url: m.url, alt: m.alt || undefined, width: m.width, height: m.height }); onClose(); }}
                    className={`group relative block w-full p-0 aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isSelected
                        ? 'border-champagne-400 ring-2 ring-champagne-400/40 shadow-lg scale-[0.98]'
                        : 'border-transparent hover:border-rosewood-700/60 bg-[#1D1018]'
                    }`}
                  >
                    {m.type === 'VIDEO' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#2A1622] to-black text-amber-300 gap-2">
                        <Video className="w-8 h-8" />
                        <span className="text-[9px] font-mono uppercase tracking-wider">Video MP4</span>
                      </div>
                    ) : (
                      <img
                        src={m.url}
                        alt={m.alt || ''}
                        className="w-full h-full object-contain"
                      />
                    )}

                    {/* Check icon badge */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-champagne-400 text-rosewood-950 flex items-center justify-center shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    {/* Bottom label */}
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] text-stone-300 truncate font-mono">
                        {m.alt || m.publicId?.split('/').pop() || 'Ảnh'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="cms-dialog-footer px-4 sm:px-6 py-3 bg-[#20111A] border-t border-rosewood-900/40 flex items-center justify-between gap-3 shrink-0">
          <div className="hidden sm:block min-w-0 text-xs text-stone-400 truncate">
            {currentSelected ? (
              <span className="font-mono text-champagne-300">
                Đã chọn: {currentSelected.alt || currentSelected.id}
              </span>
            ) : (
              <span>Chọn một file để chèn vào phần tử</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!currentSelected}
              onClick={handleConfirmSelect}
              className="h-11 flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white text-sm font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{filterType === 'VIDEO' ? 'Dùng video này' : 'Dùng ảnh này'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </DialogPortal>
  );
}
