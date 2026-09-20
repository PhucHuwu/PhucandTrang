'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAdminAudioTracks,
  createAdminAudioTrack,
  updateAdminAudioTrack,
  deleteAdminAudioTrack,
} from '@/services/adminApi';
import {
  Music,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  ArrowLeft,
  Volume2,
  Repeat,
  Sparkles,
} from 'lucide-react';

export default function AdminAudioPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [src, setSrc] = useState('');
  const [volume, setVolume] = useState(0.8);
  const [loop, setLoop] = useState(true);
  const [startAt, setStartAt] = useState(0);
  const [fadeIn, setFadeIn] = useState(2.0);
  const [fadeOut, setFadeOut] = useState(2.0);
  const [submitting, setSubmitting] = useState(false);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const data = await getAdminAudioTracks();
      setTracks(data);
    } catch (err: any) {
      alert(err?.message || 'Lỗi tải danh sách nhạc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  const openCreateModal = () => {
    setEditingTrackId(null);
    setTitle('');
    setArtist('');
    setSrc('');
    setVolume(0.8);
    setLoop(true);
    setStartAt(0);
    setFadeIn(2.0);
    setFadeOut(2.0);
    setShowModal(true);
  };

  const openEditModal = (track: any) => {
    setEditingTrackId(track.id);
    setTitle(track.title || '');
    setArtist(track.artist || '');
    setSrc(track.src || '');
    setVolume(track.volume ?? 0.8);
    setLoop(track.loop ?? true);
    setStartAt(track.startAt ?? 0);
    setFadeIn(track.fadeIn ?? 2.0);
    setFadeOut(track.fadeOut ?? 2.0);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title,
        artist: artist || undefined,
        src,
        volume: Number(volume),
        loop,
        startAt: Number(startAt),
        fadeIn: Number(fadeIn),
        fadeOut: Number(fadeOut),
      };

      if (editingTrackId) {
        await updateAdminAudioTrack(editingTrackId, payload);
      } else {
        await createAdminAudioTrack(payload);
      }

      setShowModal(false);
      await fetchTracks();
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu bản nhạc');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, trackTitle: string) => {
    if (!confirm(`Bạn có chắc muốn xóa bài hát "${trackTitle}"? Sách hoặc trang đang sử dụng bài hát này sẽ được tự động bỏ liên kết an toàn.`)) {
      return;
    }
    try {
      await deleteAdminAudioTrack(id);
      await fetchTracks();
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa bài hát');
    }
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
              <Music className="w-6 h-6 text-rosewood-400" />
              <span>Kho Âm Thanh & Nhạc Nền (Audio Library)</span>
            </h1>
            <p className="text-xs text-stone-400">
              Quản lý các bài hát tình ca lãng mạn và nhạc nền chương
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTracks}
            className="p-2.5 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-parchment-300 border border-rosewood-900/40 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-medium shadow-lg shadow-rosewood-950/50 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm bài hát mới</span>
          </button>
        </div>
      </div>

      {/* Audio Tracks List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500 text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
          <span>Đang nạp danh sách âm thanh...</span>
        </div>
      ) : tracks.length === 0 ? (
        <div className="py-20 text-center bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-8">
          <Music className="w-12 h-12 text-rosewood-800 mx-auto mb-3" />
          <h3 className="font-serif text-lg text-parchment-200 font-semibold">Chưa có bài hát nào</h3>
          <p className="text-xs text-stone-500 mt-1">Bấm &quot;Thêm bài hát mới&quot; để bổ sung giai điệu đầu tiên.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="p-5 rounded-2xl bg-[#1A1016] border border-rosewood-900/40 hover:border-rosewood-700/50 transition-all shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-parchment-100 flex items-center gap-2">
                    <span>{track.title}</span>
                  </h3>
                  <p className="text-xs text-rosewood-300/80 mt-0.5">
                    {track.artist || 'Không rõ nghệ sĩ'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(track)}
                    className="p-2 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(track.id, track.title)}
                    className="p-2 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Audio Preview Player */}
              <div className="bg-[#12080D] p-2.5 rounded-xl border border-rosewood-900/40">
                <audio src={track.src} controls className="w-full h-8" preload="none" />
              </div>

              {/* Parameters info */}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-stone-400 pt-2 border-t border-rosewood-900/40">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Âm lượng: {Math.round((track.volume ?? 0.8) * 100)}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-stone-500" />
                  <span>Lặp lại: {track.loop ? 'Có' : 'Không'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-stone-500" />
                  <span>Fade: {track.fadeIn ?? 0}s / {track.fadeOut ?? 0}s</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#1B1017] border border-rosewood-800/60 rounded-2xl p-6 shadow-2xl text-parchment-100 space-y-4">
            <h3 className="font-serif text-lg font-bold text-champagne-300 flex items-center gap-2">
              <Music className="w-5 h-5 text-rosewood-400" />
              <span>{editingTrackId ? 'Chỉnh sửa bản nhạc' : 'Thêm bản nhạc mới'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-300 font-medium mb-1">Tên bài hát / Giai điệu</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Vạn vật như muốn ta bên nhau"
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Nghệ sĩ / Ca sĩ</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ví dụ: Hoàng Dũng"
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Đường dẫn file Audio (.mp3 / URL)</label>
                <input
                  type="text"
                  required
                  value={src}
                  onChange={(e) => setSrc(e.target.value)}
                  placeholder="/music/... hoặc https://..."
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono focus:outline-none focus:border-rosewood-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Âm lượng (0.0 - 1.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value) || 0.8)}
                    className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-medium mb-1">Vị trí bắt đầu (giây)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={startAt}
                    onChange={(e) => setStartAt(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Fade In (giây)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={fadeIn}
                    onChange={(e) => setFadeIn(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-medium mb-1">Fade Out (giây)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={fadeOut}
                    onChange={(e) => setFadeOut(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="loopCheck"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="w-4 h-4 rounded text-rosewood-600 bg-[#25151F] border-rosewood-800"
                />
                <label htmlFor="loopCheck" className="text-stone-300 font-medium">
                  Phát lặp lại liên tục (Loop)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rosewood-900/40">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rosewood-600 hover:bg-rosewood-500 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu bản nhạc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
