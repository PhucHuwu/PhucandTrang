'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminBook,
  updateAdminBook,
  getAdminAudioTracks,
} from '@/services/adminApi';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  Settings,
  ArrowLeft,
  Save,
  Music,
  Palette,
  Sparkles,
  Camera,
  Layers,
  BookOpen,
} from 'lucide-react';

export default function BookSettingsPage() {
  const { isViewer } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'audio' | 'dimensions' | 'theme' | 'atmosphere' | 'cover'>('general');
  const [toast, setToast] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('PUBLISHED');
  const [description, setDescription] = useState('');
  const [heName, setHeName] = useState('Phúc');
  const [sheName, setSheName] = useState('Trang');
  const [anniversaryDate, setAnniversaryDate] = useState('2022-10-20');
  const [proposalQuote, setProposalQuote] = useState('Thế cậu đồng ý làm bạn gái tớ không?');
  const [backgroundMusicId, setBackgroundMusicId] = useState<string | null>(null);

  // Settings states
  const [dimensions, setDimensions] = useState({
    pageWidth: 764,
    pageHeight: 1080,
    pageThickness: 1,
    coverThickness: 5,
    pageRootThickness: 4,
    coverMarginX: 8,
    coverMarginY: 10,
    canvasResolution: { width: 1024, height: 1360 },
  });

  const [camera, setCamera] = useState({
    fov: 14,
    distance: 5200,
    near: 1200,
    far: 9000,
  });

  const [theme, setTheme] = useState({
    edgeColor: 0xb1a283,
    paperColor: '#F9F5EC',
    textColor: '#292522',
    accentColor: '#94384F',
    champagneGold: '#FFE5B4',
    deskColor: 0x1F1218,
  });

  const [atmospheric, setAtmospheric] = useState({
    enabled: true,
    butterflyCount: 12,
    petalCount: 34,
    dustCount: 90,
  });

  const [cover, setCover] = useState<any>({
    front: {
      backgroundUrl: '',
      title: 'Chúng Mình',
      titleFont: 'SVN-Housttely Signature',
      counterBadge: { enabled: true, subtitle: 'Bên nhau từ ngày {{anniversaryDate}}' },
    },
    back: {
      insideBackgroundUrl: '',
      outsideBackgroundUrl: '',
    },
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [bookData, tracksData] = await Promise.all([
          getAdminBook(bookId),
          getAdminAudioTracks(),
        ]);

        setAudioTracks(tracksData);

        setTitle(bookData.title || '');
        setSlug(bookData.slug || '');
        setStatus(bookData.status || 'PUBLISHED');
        setDescription(bookData.description || '');
        setHeName(bookData.heName || 'Phúc');
        setSheName(bookData.sheName || 'Trang');
        if (bookData.anniversaryDate) {
          setAnniversaryDate(new Date(bookData.anniversaryDate).toISOString().split('T')[0]);
        }
        setProposalQuote(bookData.proposalQuote || '');
        setBackgroundMusicId(bookData.backgroundMusicId || null);

        if (bookData.settings) {
          if (bookData.settings.dimensions) setDimensions(bookData.settings.dimensions);
          if (bookData.settings.camera) setCamera(bookData.settings.camera);
          if (bookData.settings.theme) setTheme(bookData.settings.theme);
          if (bookData.settings.atmospheric) setAtmospheric(bookData.settings.atmospheric);
        }

        if (bookData.cover) {
          setCover(bookData.cover);
        }
      } catch (err: any) {
        alert(err?.message || 'Không thể tải dữ liệu cài đặt sách');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookId]);

  const handleSave = async () => {
    if (isViewer) {
      alert('Tài khoản quyền VIEWER chỉ có quyền xem, không thể sửa đổi cấu hình sách.');
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await updateAdminBook(bookId, {
        title,
        slug,
        status,
        description,
        heName,
        sheName,
        anniversaryDate: `${anniversaryDate}T00:00:00Z`,
        proposalQuote,
        backgroundMusicId,
        settings: {
          dimensions,
          camera,
          theme,
          atmospheric,
        },
        cover,
      });

      setToast('Đã lưu cấu hình sách thành công!');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu cấu hình sách');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
        <span>Đang nạp thông số cấu hình cuốn sách...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
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
              <Settings className="w-6 h-6 text-rosewood-400" />
              <span>Cài Đặt Sách &quot;{title}&quot;</span>
            </h1>
            <p className="text-xs text-stone-400">/{slug} • ID: {bookId}</p>
          </div>
        </div>

        {!isViewer && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-lg shadow-rosewood-950/50 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        )}
      </div>

      {toast && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs text-center animate-fade-in">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#170E13] border border-rosewood-900/40 rounded-2xl overflow-x-auto text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'general'
              ? 'bg-rosewood-600 text-white shadow font-semibold'
              : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Thông tin chung</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'audio'
              ? 'bg-rosewood-600 text-white shadow font-semibold'
              : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Nhạc nền (Audio)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dimensions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'dimensions'
              ? 'bg-rosewood-600 text-white shadow font-semibold'
              : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Kích thước & Camera 3D</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'theme'
              ? 'bg-rosewood-600 text-white shadow font-semibold'
              : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Bảng màu giao diện</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('atmosphere')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'atmosphere'
              ? 'bg-rosewood-600 text-white shadow font-semibold'
              : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hiệu ứng không gian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cover')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'cover'
              ? 'bg-rosewood-600 text-white shadow font-semibold'
              : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Bìa trước & sau</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-6 shadow-xl space-y-6">
        {/* 1. General Tab */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Tiêu đề sách</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Đường dẫn slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Trạng thái xuất bản</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              >
                <option value="PUBLISHED">PUBLISHED (Công khai)</option>
                <option value="DRAFT">DRAFT (Bản nháp)</option>
                <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Ngày kỷ niệm</label>
              <input
                type="date"
                value={anniversaryDate}
                onChange={(e) => setAnniversaryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Tên bạn nam (he)</label>
              <input
                type="text"
                value={heName}
                onChange={(e) => setHeName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Tên bạn nữ (she)</label>
              <input
                type="text"
                value={sheName}
                onChange={(e) => setSheName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Câu tỏ tình / Trích dẫn tình yêu</label>
              <input
                type="text"
                value={proposalQuote}
                onChange={(e) => setProposalQuote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Mô tả ngắn</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>
          </div>
        )}

        {/* 2. Audio Tab */}
        {activeTab === 'audio' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Nhạc nền mặc định của cuốn sách
              </label>
              <select
                value={backgroundMusicId || ''}
                onChange={(e) => setBackgroundMusicId(e.target.value ? e.target.value : null)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              >
                <option value="">(Không bật nhạc nền - Null)</option>
                {audioTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.title} {track.artist ? `— ${track.artist}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
                Khi chọn &quot;Không bật nhạc nền&quot;, máy nghe nhạc đĩa than sẽ tự động ẩn và không phát nhạc khi mở sách.
              </p>
            </div>
          </div>
        )}

        {/* 3. Dimensions Tab */}
        {activeTab === 'dimensions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Chiều rộng trang 3D (pageWidth)</label>
              <input
                type="number"
                value={dimensions.pageWidth}
                onChange={(e) => setDimensions({ ...dimensions, pageWidth: parseInt(e.target.value, 10) || 764 })}
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Chiều cao trang 3D (pageHeight)</label>
              <input
                type="number"
                value={dimensions.pageHeight}
                onChange={(e) => setDimensions({ ...dimensions, pageHeight: parseInt(e.target.value, 10) || 1080 })}
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Độ phân giải Canvas Width (px)</label>
              <input
                type="number"
                value={dimensions.canvasResolution?.width || 1024}
                onChange={(e) =>
                  setDimensions({
                    ...dimensions,
                    canvasResolution: { ...dimensions.canvasResolution, width: parseInt(e.target.value, 10) || 1024 },
                  })
                }
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Độ phân giải Canvas Height (px)</label>
              <input
                type="number"
                value={dimensions.canvasResolution?.height || 1360}
                onChange={(e) =>
                  setDimensions({
                    ...dimensions,
                    canvasResolution: { ...dimensions.canvasResolution, height: parseInt(e.target.value, 10) || 1360 },
                  })
                }
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Khoảng cách Camera (distance)</label>
              <input
                type="number"
                value={camera.distance}
                onChange={(e) => setCamera({ ...camera, distance: parseInt(e.target.value, 10) || 5200 })}
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Góc nhìn Camera (fov)</label>
              <input
                type="number"
                value={camera.fov}
                onChange={(e) => setCamera({ ...camera, fov: parseInt(e.target.value, 10) || 14 })}
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* 4. Theme Tab */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Màu giấy trang (paperColor)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.paperColor || '#F9F5EC'}
                  onChange={(e) => setTheme({ ...theme, paperColor: e.target.value })}
                  className="w-9 h-9 rounded bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.paperColor || '#F9F5EC'}
                  onChange={(e) => setTheme({ ...theme, paperColor: e.target.value })}
                  className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Màu nhấn chủ đạo (accentColor)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.accentColor || '#94384F'}
                  onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                  className="w-9 h-9 rounded bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.accentColor || '#94384F'}
                  onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                  className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Màu chữ chính (textColor)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.textColor || '#292522'}
                  onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                  className="w-9 h-9 rounded bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.textColor || '#292522'}
                  onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                  className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Màu vàng sâm panh (champagneGold)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.champagneGold || '#FFE5B4'}
                  onChange={(e) => setTheme({ ...theme, champagneGold: e.target.value })}
                  className="w-9 h-9 rounded bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.champagneGold || '#FFE5B4'}
                  onChange={(e) => setTheme({ ...theme, champagneGold: e.target.value })}
                  className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Atmosphere Tab */}
        {activeTab === 'atmosphere' && (
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="atmosEnabled"
                checked={atmospheric.enabled}
                onChange={(e) => setAtmospheric({ ...atmospheric, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-rosewood-600 focus:ring-rosewood-500 bg-[#25151F] border-rosewood-800"
              />
              <label htmlFor="atmosEnabled" className="text-xs font-medium text-stone-200">
                Bật hiệu ứng không gian 3D (Đàn bướm, cánh hoa đào, bụi sáng)
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Số lượng bướm bay (butterflyCount)</label>
              <input
                type="number"
                value={atmospheric.butterflyCount}
                onChange={(e) => setAtmospheric({ ...atmospheric, butterflyCount: parseInt(e.target.value, 10) || 12 })}
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Số lượng cánh hoa rơi (petalCount)</label>
              <input
                type="number"
                value={atmospheric.petalCount}
                onChange={(e) => setAtmospheric({ ...atmospheric, petalCount: parseInt(e.target.value, 10) || 34 })}
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Số lượng bụi sáng lung linh (dustCount)</label>
              <input
                type="number"
                value={atmospheric.dustCount}
                onChange={(e) => setAtmospheric({ ...atmospheric, dustCount: parseInt(e.target.value, 10) || 90 })}
                className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* 6. Cover Tab */}
        {activeTab === 'cover' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Ảnh nền bìa trước (front.backgroundUrl)</label>
              <input
                type="text"
                value={cover.front?.backgroundUrl || ''}
                onChange={(e) => setCover({ ...cover, front: { ...cover.front, backgroundUrl: e.target.value } })}
                className="w-full px-3.5 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Ảnh mặt trong bìa sau (insideBackgroundUrl)</label>
                <input
                  type="text"
                  value={cover.back?.insideBackgroundUrl || ''}
                  onChange={(e) => setCover({ ...cover, back: { ...cover.back, insideBackgroundUrl: e.target.value } })}
                  className="w-full px-3.5 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Ảnh mặt ngoài bìa sau (outsideBackgroundUrl)</label>
                <input
                  type="text"
                  value={cover.back?.outsideBackgroundUrl || ''}
                  onChange={(e) => setCover({ ...cover, back: { ...cover.back, outsideBackgroundUrl: e.target.value } })}
                  className="w-full px-3.5 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
