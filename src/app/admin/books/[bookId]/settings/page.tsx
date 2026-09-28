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
  Type,
  Box,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export type SettingsTab = 'general' | 'theme' | 'typography' | '3d' | 'atmosphere' | 'audio' | 'cover';

const DEFAULT_SETTINGS = {
  dimensions: {
    pageWidth: 764,
    pageHeight: 1080,
    pageThickness: 1,
    coverThickness: 5,
    pageRootThickness: 4,
    coverMarginX: 8,
    coverMarginY: 10,
    canvasResolution: { width: 1024, height: 1360 },
  },
  camera: {
    fov: 14,
    distance: 5200,
    near: 1200,
    far: 9000,
  },
  theme: {
    edgeColor: 0xb1a283,
    paperColor: '#F9F5EC',
    textColor: '#292522',
    accentColor: '#94384F',
    champagneGold: '#FFE5B4',
    deskColor: 0x1f1218,
  },
  typography: {
    titleFont: 'SVN-Housttely Signature',
    bodyFont: 'Cormorant Garamond',
    handwritingFont: 'Dancing Script',
    headingFont: 'Montserrat',
    baseFontSize: 22,
    baseLineHeight: 1.5,
  },
  atmospheric: {
    enabled: true,
    butterflyCount: 12,
    petalCount: 34,
    dustCount: 90,
  },
};

export default function BookSettingsPage() {
  const { isViewer } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [toast, setToast] = useState<string | null>(null);

  // 1. General Info states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('PUBLISHED');
  const [description, setDescription] = useState('');
  const [heName, setHeName] = useState('Phúc');
  const [sheName, setSheName] = useState('Trang');
  const [anniversaryDate, setAnniversaryDate] = useState('2022-10-20');
  const [proposalQuote, setProposalQuote] = useState('Thế cậu đồng ý làm bạn gái tớ không?');

  // 2. Audio state
  const [backgroundMusicId, setBackgroundMusicId] = useState<string | null>(null);

  // 3. 3D & Dimensions states
  const [dimensions, setDimensions] = useState(DEFAULT_SETTINGS.dimensions);
  const [camera, setCamera] = useState(DEFAULT_SETTINGS.camera);

  // 4. Theme Colors state
  const [theme, setTheme] = useState(DEFAULT_SETTINGS.theme);

  // 5. Typography state
  const [typography, setTypography] = useState(DEFAULT_SETTINGS.typography);

  // 6. Atmospheric state
  const [atmospheric, setAtmospheric] = useState(DEFAULT_SETTINGS.atmospheric);

  // 7. Cover state
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
          if (bookData.settings.dimensions) setDimensions({ ...DEFAULT_SETTINGS.dimensions, ...bookData.settings.dimensions });
          if (bookData.settings.camera) setCamera({ ...DEFAULT_SETTINGS.camera, ...bookData.settings.camera });
          if (bookData.settings.theme) setTheme({ ...DEFAULT_SETTINGS.theme, ...bookData.settings.theme });
          if (bookData.settings.typography) setTypography({ ...DEFAULT_SETTINGS.typography, ...bookData.settings.typography });
          if (bookData.settings.atmospheric) setAtmospheric({ ...DEFAULT_SETTINGS.atmospheric, ...bookData.settings.atmospheric });
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

  // Safe PATCH semantics: preserves partial JSON hierarchies
  const handleSave = async () => {
    if (isViewer) {
      alert('Tài khoản quyền VIEWER chỉ có quyền xem, không thể sửa đổi cấu hình sách.');
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await updateAdminBook(
        bookId,
        {
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
            typography,
            atmospheric,
          },
          cover,
        },
        true // isPatch = true
      );

      setToast('Đã lưu cấu hình sách an toàn (Safe PATCH)!');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu cấu hình sách');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = (tab: SettingsTab) => {
    const confirmReset = window.confirm(`Bạn có chắc chắn muốn khôi phục các giá trị mặc định cho tab "${tab.toUpperCase()}"?`);
    if (!confirmReset) return;

    if (tab === '3d') {
      setDimensions(DEFAULT_SETTINGS.dimensions);
      setCamera(DEFAULT_SETTINGS.camera);
    } else if (tab === 'theme') {
      setTheme(DEFAULT_SETTINGS.theme);
    } else if (tab === 'typography') {
      setTypography(DEFAULT_SETTINGS.typography);
    } else if (tab === 'atmosphere') {
      setAtmospheric(DEFAULT_SETTINGS.atmospheric);
    }
    setToast(`Đã reset cài đặt ${tab} về mặc định! Hãy bấm Lưu để ghi nhận.`);
    setTimeout(() => setToast(null), 3000);
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
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs text-center animate-fade-in flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#170E13] border border-rosewood-900/40 rounded-2xl overflow-x-auto text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'general' ? 'bg-rosewood-600 text-white shadow font-semibold' : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>General</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'theme' ? 'bg-rosewood-600 text-white shadow font-semibold' : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('typography')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'typography' ? 'bg-rosewood-600 text-white shadow font-semibold' : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Typography</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('3d')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === '3d' ? 'bg-rosewood-600 text-white shadow font-semibold' : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D &amp; Camera</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('atmosphere')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'atmosphere' ? 'bg-rosewood-600 text-white shadow font-semibold' : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Atmosphere</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'audio' ? 'bg-rosewood-600 text-white shadow font-semibold' : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Audio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cover')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'cover' ? 'bg-rosewood-600 text-white shadow font-semibold' : 'text-stone-400 hover:text-white hover:bg-[#261620]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Cover</span>
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
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Tên Bạn Trai (He)</label>
              <input
                type="text"
                value={heName}
                onChange={(e) => setHeName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Tên Bạn Gái (She)</label>
              <input
                type="text"
                value={sheName}
                onChange={(e) => setSheName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Câu ngỏ lời tình yêu (Proposal Quote)</label>
              <input
                type="text"
                value={proposalQuote}
                onChange={(e) => setProposalQuote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Mô tả cuốn sách</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
              />
            </div>
          </div>
        )}

        {/* 2. Theme Tab */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-rosewood-900/40">
              <span className="text-xs font-semibold text-champagne-300 uppercase tracking-wider">
                Bảng màu sắc không gian sách
              </span>
              <button
                type="button"
                onClick={() => handleResetDefaults('theme')}
                className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Mặc Định</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu giấy lật (Paper Color)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.paperColor || '#F9F5EC'}
                    onChange={(e) => setTheme({ ...theme, paperColor: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
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
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu chữ mặc định (Text Color)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.textColor || '#292522'}
                    onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
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
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu điểm nhấn (Accent Color)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.accentColor || '#94384F'}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
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
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu vàng ánh kim (Champagne Gold)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.champagneGold || '#FFE5B4'}
                    onChange={(e) => setTheme({ ...theme, champagneGold: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-transparent border border-rosewood-800 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.champagneGold || '#FFE5B4'}
                    onChange={(e) => setTheme({ ...theme, champagneGold: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Mép trang 3D (Edge Color Hex)</label>
                <input
                  type="text"
                  value={`0x${(theme.edgeColor || 0xb1a283).toString(16)}`}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 16);
                    if (!isNaN(parsed)) setTheme({ ...theme, edgeColor: parsed });
                  }}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Màu bàn đọc 3D (Desk Color Hex)</label>
                <input
                  type="text"
                  value={`0x${(theme.deskColor || 0x1f1218).toString(16)}`}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 16);
                    if (!isNaN(parsed)) setTheme({ ...theme, deskColor: parsed });
                  }}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Typography Tab */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-rosewood-900/40">
              <span className="text-xs font-semibold text-champagne-300 uppercase tracking-wider">
                Cấu hình phông chữ hệ thống
              </span>
              <button
                type="button"
                onClick={() => handleResetDefaults('typography')}
                className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Mặc Định</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Phông tiêu đề bìa (Title Font)</label>
                <select
                  value={typography.titleFont || 'SVN-Housttely Signature'}
                  onChange={(e) => setTypography({ ...typography, titleFont: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="SVN-Housttely Signature">SVN-Housttely Signature (Chữ ký nghệ thuật)</option>
                  <option value="Dancing Script">Dancing Script (Thư pháp bay bổng)</option>
                  <option value="Cormorant Garamond">Cormorant Garamond (Cổ điển sang trọng)</option>
                  <option value="Playfair Display">Playfair Display (Trang nhã)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Phông nội dung chính (Body Font)</label>
                <select
                  value={typography.bodyFont || 'Cormorant Garamond'}
                  onChange={(e) => setTypography({ ...typography, bodyFont: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Cormorant Garamond">Cormorant Garamond (Serif cổ điển)</option>
                  <option value="Montserrat">Montserrat (Hiện đại)</option>
                  <option value="Playfair Display">Playfair Display</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Phông viết tay (Handwriting Font)</label>
                <select
                  value={typography.handwritingFont || 'Dancing Script'}
                  onChange={(e) => setTypography({ ...typography, handwritingFont: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Dancing Script">Dancing Script</option>
                  <option value="SVN-Housttely Signature">SVN-Housttely Signature</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Cỡ chữ cơ bản (Base Font Size px)</label>
                <input
                  type="number"
                  value={typography.baseFontSize || 22}
                  onChange={(e) => setTypography({ ...typography, baseFontSize: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. 3D & Camera Tab */}
        {activeTab === '3d' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-rosewood-900/40">
              <span className="text-xs font-semibold text-champagne-300 uppercase tracking-wider">
                Kích thước vật lý &amp; Camera 3D
              </span>
              <button
                type="button"
                onClick={() => handleResetDefaults('3d')}
                className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Mặc Định</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Chiều rộng trang 3D (pageWidth)</label>
                <input
                  type="number"
                  value={dimensions.pageWidth}
                  onChange={(e) => setDimensions({ ...dimensions, pageWidth: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Chiều cao trang 3D (pageHeight)</label>
                <input
                  type="number"
                  value={dimensions.pageHeight}
                  onChange={(e) => setDimensions({ ...dimensions, pageHeight: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Độ dày bìa sách (coverThickness)</label>
                <input
                  type="number"
                  value={dimensions.coverThickness}
                  onChange={(e) => setDimensions({ ...dimensions, coverThickness: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Độ phân giải Canvas Width (px)</label>
                <input
                  type="number"
                  value={dimensions.canvasResolution?.width || 1024}
                  onChange={(e) => setDimensions({ ...dimensions, canvasResolution: { ...dimensions.canvasResolution, width: Number(e.target.value) } })}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Độ phân giải Canvas Height (px)</label>
                <input
                  type="number"
                  value={dimensions.canvasResolution?.height || 1360}
                  onChange={(e) => setDimensions({ ...dimensions, canvasResolution: { ...dimensions.canvasResolution, height: Number(e.target.value) } })}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Khoảng cách Camera (distance)</label>
                <input
                  type="number"
                  value={camera.distance}
                  onChange={(e) => setCamera({ ...camera, distance: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Góc nhìn Camera (FOV độ)</label>
                <input
                  type="number"
                  value={camera.fov}
                  onChange={(e) => setCamera({ ...camera, fov: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Atmosphere Tab */}
        {activeTab === 'atmosphere' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-rosewood-900/40">
              <span className="text-xs font-semibold text-champagne-300 uppercase tracking-wider">
                Hiệu ứng lãng mạn trong không gian 3D
              </span>
              <button
                type="button"
                onClick={() => handleResetDefaults('atmosphere')}
                className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Mặc Định</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="atmos-enabled"
                checked={atmospheric.enabled}
                onChange={(e) => setAtmospheric({ ...atmospheric, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-rosewood-600 focus:ring-rosewood-500 bg-[#25151F] border-rosewood-800"
              />
              <label htmlFor="atmos-enabled" className="text-xs font-medium text-white cursor-pointer">
                Bật hiệu ứng không gian 3D (Cánh bướm, cánh hoa hồng rơi, bụi tiên phát sáng)
              </label>
            </div>

            {atmospheric.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">Số lượng bướm bay (butterflyCount)</label>
                  <input
                    type="number"
                    value={atmospheric.butterflyCount}
                    onChange={(e) => setAtmospheric({ ...atmospheric, butterflyCount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">Số lượng cánh hoa rơi (petalCount)</label>
                  <input
                    type="number"
                    value={atmospheric.petalCount}
                    onChange={(e) => setAtmospheric({ ...atmospheric, petalCount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">Số lượng hạt bụi tiên (dustCount)</label>
                  <input
                    type="number"
                    value={atmospheric.dustCount}
                    onChange={(e) => setAtmospheric({ ...atmospheric, dustCount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Audio Tab */}
        {activeTab === 'audio' && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Nhạc nền chính của cuốn sách</label>
              <select
                value={backgroundMusicId || ''}
                onChange={(e) => setBackgroundMusicId(e.target.value ? e.target.value : null)}
                className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="">(Không dùng nhạc nền — Tắt âm thanh)</option>
                {audioTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} — {t.artist}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-500 mt-2">
                Nhạc nền sẽ tự động phát sau khi người dùng bắt đầu lật mở bìa sách đầu tiên.
              </p>
            </div>
          </div>
        )}

        {/* 7. Cover Tab */}
        {activeTab === 'cover' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Ảnh nền Bìa trước (Front Cover URL)</label>
                <input
                  type="text"
                  value={cover.front?.backgroundUrl || ''}
                  onChange={(e) => setCover({ ...cover, front: { ...cover.front, backgroundUrl: e.target.value } })}
                  className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Tiêu đề trên bìa</label>
                <input
                  type="text"
                  value={cover.front?.title || ''}
                  onChange={(e) => setCover({ ...cover, front: { ...cover.front, title: e.target.value } })}
                  className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Ảnh nền Mặt trong Bìa sau (Inside Back Cover)</label>
                <input
                  type="text"
                  value={cover.back?.insideBackgroundUrl || ''}
                  onChange={(e) => setCover({ ...cover, back: { ...cover.back, insideBackgroundUrl: e.target.value } })}
                  className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">Ảnh nền Mặt ngoài Bìa sau (Outside Back Cover)</label>
                <input
                  type="text"
                  value={cover.back?.outsideBackgroundUrl || ''}
                  onChange={(e) => setCover({ ...cover, back: { ...cover.back, outsideBackgroundUrl: e.target.value } })}
                  className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
