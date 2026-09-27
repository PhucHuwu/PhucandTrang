'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  getAdminMedia,
  requestSignedUpload,
  saveUploadedMediaMetadata,
} from '@/services/adminApi';
import { uploadDirectToCloudinary } from '@/services/mediaApi';
import { Media, MediaType } from '@/types/book';
import {
  Image as ImageIcon,
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
  onSelect: (media: { mediaId: string; url: string; alt?: string }) => void;
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
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-[#180E14] border border-rosewood-800/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-parchment-100">
        {/* Header */}
        <div className="h-14 px-6 bg-[#20111A] border-b border-rosewood-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rosewood-600 to-rosewood-800 flex items-center justify-center text-champagne-300 shadow">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-parchment-100">{title}</h3>
              <p className="text-[11px] text-rosewood-300/70 font-mono">
                Chọn ảnh có sẵn hoặc tải ảnh mới trực tiếp lên Cloudinary
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

        {/* Toolbar: Search & Direct Upload */}
        <div className="p-4 bg-[#140A0F] border-b border-rosewood-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm hình ảnh theo tên..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={fetchMedia}
              className="p-2 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*"
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? `Đang tải lên (${uploadProgress}%)...` : 'Tải ảnh mới'}</span>
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-500 text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
              <span>Đang nạp thư viện ảnh...</span>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-20 text-center text-xs text-stone-500">
              Không tìm thấy hình ảnh nào. Bấm &quot;Tải ảnh mới&quot; để bổ sung vào thư viện.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {mediaList.map((m) => {
                const isSelected = m.id === selectedId;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isSelected
                        ? 'border-champagne-400 ring-2 ring-champagne-400/40 shadow-lg scale-[0.98]'
                        : 'border-transparent hover:border-rosewood-700/60 bg-[#1D1018]'
                    }`}
                  >
                    <img
                      src={m.url}
                      alt={m.alt || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-6 bg-[#20111A] border-t border-rosewood-900/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-400 truncate max-w-md">
            {currentSelected ? (
              <span className="font-mono text-champagne-300">
                Đã chọn: {currentSelected.alt || currentSelected.id}
              </span>
            ) : (
              <span>Vui lòng nhấp chọn một ảnh để chèn vào phần tử</span>
            )}
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
              disabled={!currentSelected}
              onClick={handleConfirmSelect}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sử dụng ảnh này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
