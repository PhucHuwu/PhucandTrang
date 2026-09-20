'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  getAdminMedia,
  getAdminMediaReferences,
  deleteAdminMedia,
  requestSignedUpload,
  saveUploadedMediaMetadata,
} from '@/services/adminApi';
import { uploadDirectToCloudinary } from '@/services/mediaApi';
import { Media, MediaType } from '@/types/book';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Trash2,
  ExternalLink,
  Copy,
  Info,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Check,
} from 'lucide-react';

export default function AdminMediaPage() {
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<MediaType | ''>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // References Modal state
  const [inspectReferences, setInspectReferences] = useState<{
    media: Media;
    references: any[];
    isInUse: boolean;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const data = await getAdminMedia({
        type: selectedType || undefined,
        search: search || undefined,
        limit: 100,
      });
      setMediaItems(data.items);
    } catch (err: any) {
      alert(err?.message || 'Lỗi tải danh sách media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMedia();
  };

  // Direct Cloudinary Upload Flow without passing heavy file through NestJS
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      let mediaType: MediaType = 'IMAGE';
      if (file.type.startsWith('video/')) mediaType = 'VIDEO';
      else if (file.type.startsWith('audio/')) mediaType = 'AUDIO';

      // Step 1: Get signed upload configuration from Backend
      const config = await requestSignedUpload(mediaType);

      // Step 2: Upload directly to Cloudinary CDN
      const uploadRes = await uploadDirectToCloudinary(file, config, (percent) => {
        setUploadProgress(percent);
      });

      // Step 3: Save metadata to Backend
      await saveUploadedMediaMetadata({
        type: mediaType,
        url: uploadRes.url,
        publicId: uploadRes.publicId,
        width: uploadRes.width,
        height: uploadRes.height,
        mimeType: file.type || `image/${uploadRes.format}`,
        size: uploadRes.bytes || file.size,
        alt: file.name,
      });

      alert('Tải lên media thành công!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchMedia();
    } catch (err: any) {
      alert(err?.message || 'Lỗi tải lên file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCheckReferences = async (id: string) => {
    try {
      const data = await getAdminMediaReferences(id);
      setInspectReferences(data);
    } catch (err: any) {
      alert(err?.message || 'Lỗi kiểm tra liên kết media');
    }
  };

  const handleDeleteMedia = async (id: string, force = false) => {
    setDeletingId(id);
    try {
      await deleteAdminMedia(id, force);
      setInspectReferences(null);
      await fetchMedia();
    } catch (err: any) {
      // If 409 conflict, open references modal automatically to show in-use locations
      try {
        const refData = await getAdminMediaReferences(id);
        setInspectReferences(refData);
      } catch {
        alert(err?.message || 'Không thể xóa media');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rosewood-900/40 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/books"
            className="p-2 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-stone-300 border border-rosewood-900/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-rosewood-400" />
              <span>Thư Viện Media (Media Library)</span>
            </h1>
            <p className="text-xs text-stone-400">
              Quản lý hình ảnh, video kỷ niệm được lưu trữ tối ưu trên Cloudinary CDN
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMedia}
            className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/mp4,audio/*"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-medium shadow-lg shadow-rosewood-950/50 transition-all active:scale-95 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? `Đang tải lên (${uploadProgress}%)...` : 'Tải lên Media'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-3 shadow-lg">
        {/* Type Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { label: 'Tất cả', value: '' },
            { label: 'Ảnh (Image)', value: 'IMAGE' },
            { label: 'Video', value: 'VIDEO' },
            { label: 'Ảnh nền (BG)', value: 'BACKGROUND' },
            { label: 'Âm thanh', value: 'AUDIO' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedType(tab.value as any)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                selectedType === tab.value
                  ? 'bg-rosewood-600 text-white font-semibold'
                  : 'text-stone-400 hover:text-white hover:bg-[#261620]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc URL..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rosewood-500"
          />
        </form>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500 text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
          <span>Đang nạp thư viện media...</span>
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="py-20 text-center bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-8">
          <ImageIcon className="w-12 h-12 text-rosewood-800 mx-auto mb-3" />
          <h3 className="font-serif text-lg text-parchment-200 font-semibold">Chưa có media nào</h3>
          <p className="text-xs text-stone-500 mt-1">Bấm &quot;Tải lên Media&quot; để thêm ảnh hoặc video đầu tiên.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mediaItems.map((item) => {
            const isVideo = item.type === 'VIDEO';
            const isAudio = item.type === 'AUDIO';

            return (
              <div
                key={item.id}
                className="group relative bg-[#180E14] border border-rosewood-900/40 rounded-xl overflow-hidden hover:border-rosewood-700/60 transition-all flex flex-col justify-between shadow-lg"
              >
                {/* Thumbnail Preview */}
                <div className="relative aspect-square w-full bg-[#12080D] overflow-hidden flex items-center justify-center">
                  {isVideo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-amber-300 p-2 text-center bg-black/40">
                      <span className="text-xs font-mono font-bold uppercase">VIDEO</span>
                      <span className="text-[10px] text-stone-400 truncate w-full mt-1">{item.alt}</span>
                    </div>
                  ) : isAudio ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-champagne-300 p-2 text-center bg-black/40">
                      <span className="text-xs font-mono font-bold uppercase">AUDIO</span>
                      <span className="text-[10px] text-stone-400 truncate w-full mt-1">{item.alt}</span>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Type Badge */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/70 text-stone-300">
                    {item.type}
                  </span>
                </div>

                {/* Info & Actions */}
                <div className="p-2 space-y-1.5 bg-[#1F121A]">
                  <p className="text-[11px] text-parchment-200 font-mono truncate" title={item.alt || item.url}>
                    {item.alt || item.publicId || 'Media item'}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-rosewood-900/40">
                    <button
                      onClick={() => copyToClipboard(item.url)}
                      className="p-1 rounded text-stone-400 hover:text-champagne-300 transition-colors"
                      title="Sao chép URL"
                    >
                      {copiedUrl === item.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleCheckReferences(item.id)}
                      className="p-1 rounded text-stone-400 hover:text-rosewood-300 transition-colors"
                      title="Kiểm tra liên kết"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-stone-400 hover:text-parchment-100 transition-colors"
                      title="Mở tab mới"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleDeleteMedia(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1 rounded text-red-400/80 hover:text-red-400 transition-colors"
                      title="Xóa media"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* References Inspection Modal */}
      {inspectReferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#1B1017] border border-rosewood-800/60 rounded-2xl p-6 shadow-2xl text-parchment-100 space-y-4">
            <div className="flex items-center justify-between border-b border-rosewood-900/50 pb-3">
              <h3 className="font-serif text-base font-bold text-champagne-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-rosewood-400" />
                <span>Kiểm tra liên kết của Media</span>
              </h3>
              <button
                onClick={() => setInspectReferences(null)}
                className="text-stone-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <p className="font-mono text-stone-300 break-all">URL: {inspectReferences.media.url}</p>
              <p className="text-stone-400">
                Tên / Alt: <span className="text-parchment-200">{inspectReferences.media.alt}</span>
              </p>
              <p className="text-stone-400">
                Trạng thái:{' '}
                {inspectReferences.isInUse ? (
                  <span className="text-amber-400 font-semibold font-mono">
                    Đang được sử dụng ở {inspectReferences.references.length} vị trí
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold font-mono">Không có trang nào sử dụng</span>
                )}
              </p>
            </div>

            {inspectReferences.references.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {inspectReferences.references.map((ref: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#261521] border border-rosewood-900/60 text-xs">
                    <span className="font-semibold text-rosewood-300 font-mono text-[11px] block">
                      [{ref.targetType}]
                    </span>
                    <p className="text-stone-300 mt-0.5">{ref.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-rosewood-900/40">
              <button
                onClick={() => setInspectReferences(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
              >
                Đóng
              </button>

              {inspectReferences.isInUse ? (
                <button
                  onClick={() => handleDeleteMedia(inspectReferences.media.id, true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-lg"
                  title="Cưỡng chế xóa dù đang có trang sử dụng"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Cưỡng chế xóa (Force Delete)</span>
                </button>
              ) : (
                <button
                  onClick={() => handleDeleteMedia(inspectReferences.media.id, false)}
                  className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                >
                  Xóa media này
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
