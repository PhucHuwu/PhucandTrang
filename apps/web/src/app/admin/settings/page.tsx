'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getJournal,
  updateJournal,
  getAdminAudioTracks,
} from '@/services/adminApi';
import { useJournal } from '@/context/JournalContext';
import { Settings, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { SETTINGS_FORM_DEFAULTS as DEFAULT_SETTINGS, SettingsTab } from '@/components/admin/settings/settingsDefaults';
import SettingsTabBar from '@/components/admin/settings/SettingsTabBar';
import GeneralSettingsTab from '@/components/admin/settings/GeneralSettingsTab';
import ThemeSettingsTab from '@/components/admin/settings/ThemeSettingsTab';
import TypographySettingsTab from '@/components/admin/settings/TypographySettingsTab';
import ThreeDSettingsTab from '@/components/admin/settings/ThreeDSettingsTab';
import AtmosphereSettingsTab from '@/components/admin/settings/AtmosphereSettingsTab';
import AudioSettingsTab from '@/components/admin/settings/AudioSettingsTab';
import CoverSettingsTab from '@/components/admin/settings/CoverSettingsTab';

export type { SettingsTab };

export default function JournalSettingsDirectPage() {
  const { journal, refreshJournal } = useJournal();

  const [saving, setSaving] = useState(false);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [toast, setToast] = useState<string | null>(null);

  // 1. General Info states
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('PUBLISHED');
  const [description, setDescription] = useState('');
  const [heName, setHeName] = useState('Phúc');
  const [sheName, setSheName] = useState('Trang');
  const [anniversaryDate, setAnniversaryDate] = useState('2022-10-20');
  const [proposalQuote, setProposalQuote] = useState('Thế cậu đồng ý làm bạn gái tớ không?');

  // 2. Audio state
  const [backgroundMusicId, setBackgroundMusicId] = useState<string | null>(null);
  const [playlistTrackIds, setPlaylistTrackIds] = useState<string[]>([]);

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

  // Sync state when journal context loads
  useEffect(() => {
    if (journal) {
      const jAny = journal as any;
      setTitle(journal.title || '');
      setStatus(jAny.status || 'PUBLISHED');
      setDescription(journal.description || '');
      setHeName(journal.couple?.he || jAny.heName || 'Phúc');
      setSheName(journal.couple?.she || jAny.sheName || 'Trang');
      if (journal.couple?.anniversaryDate || jAny.anniversaryDate) {
        setAnniversaryDate(new Date(journal.couple?.anniversaryDate || jAny.anniversaryDate).toISOString().split('T')[0]);
      }
      setProposalQuote(journal.couple?.proposalQuote || jAny.proposalQuote || '');
      setBackgroundMusicId(journal.backgroundMusicId || null);

      if (journal.settings) {
        if (journal.settings.dimensions) setDimensions({ ...DEFAULT_SETTINGS.dimensions, ...journal.settings.dimensions });
        if (journal.settings.camera) setCamera({ ...DEFAULT_SETTINGS.camera, ...journal.settings.camera });
        if (journal.settings.theme) setTheme({ ...DEFAULT_SETTINGS.theme, ...journal.settings.theme });
        if (journal.settings.typography) setTypography({ ...DEFAULT_SETTINGS.typography, ...journal.settings.typography });
        if (journal.settings.atmospheric) setAtmospheric({ ...DEFAULT_SETTINGS.atmospheric, ...journal.settings.atmospheric });
        if (Array.isArray((journal.settings as any).playlistTrackIds)) {
          setPlaylistTrackIds((journal.settings as any).playlistTrackIds);
        } else if (Array.isArray((journal.settings as any).playlistIds)) {
          setPlaylistTrackIds((journal.settings as any).playlistIds);
        } else if (journal.backgroundMusicId) {
          setPlaylistTrackIds([journal.backgroundMusicId]);
        }
      }

      if (journal.cover) {
        setCover(journal.cover);
      }
    }
  }, [journal]);

  // Load audio tracks
  useEffect(() => {
    async function loadTracks() {
      try {
        const tracksData = await getAdminAudioTracks();
        setAudioTracks(tracksData);
      } catch {
        // Ignore
      }
    }
    loadTracks();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      await updateJournal({
        title,
        description,
        heName,
        sheName,
        anniversaryDate: `${anniversaryDate}T00:00:00Z`,
        proposalQuote,
        backgroundMusicId: backgroundMusicId || (playlistTrackIds.length > 0 ? playlistTrackIds[0] : null),
        settings: {
          dimensions,
          camera,
          theme,
          typography,
          atmospheric,
          playlistTrackIds,
          playlistIds: playlistTrackIds,
          playlistTracks: playlistTrackIds
            .map((id) => audioTracks.find((t) => t.id === id))
            .filter(Boolean),
        },
        cover,
      });

      await refreshJournal();
      setToast('Đã lưu cài đặt nhật ký thành công!');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Lỗi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = (tab: SettingsTab) => {
    const confirmReset = window.confirm(`Bạn có chắc chắn muốn khôi phục giá trị mặc định cho tab "${tab.toUpperCase()}"?`);
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

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between border-b border-rosewood-900/40 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-[#201319] hover:bg-[#2C1923] text-stone-300 border border-rosewood-900/40 transition-colors"
            title="Quay lại Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-parchment-100 flex items-center gap-2">
              <Settings className="w-6 h-6 text-rosewood-400" />
              <span>Cài Đặt Nhật Ký Tình Yêu</span>
            </h1>
            <p className="text-xs text-stone-400">{journal?.title}</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white text-xs font-semibold shadow-lg shadow-rosewood-950/50 transition active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
        </button>
      </div>

      {toast && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs text-center animate-fade-in flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Tabs */}
      <SettingsTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Tab Panels */}
      <div className="bg-[#180E14] border border-rosewood-900/40 rounded-2xl p-6 shadow-xl space-y-6">
        {/* 1. General Tab */}
        {activeTab === 'general' && (
          <GeneralSettingsTab
            title={title}
            setTitle={setTitle}
            status={status}
            anniversaryDate={anniversaryDate}
            setAnniversaryDate={setAnniversaryDate}
            heName={heName}
            setHeName={setHeName}
            sheName={sheName}
            setSheName={setSheName}
            proposalQuote={proposalQuote}
            setProposalQuote={setProposalQuote}
            description={description}
            setDescription={setDescription}
          />
        )}

        {/* 2. Theme Tab */}
        {activeTab === 'theme' && (
          <ThemeSettingsTab theme={theme} setTheme={setTheme} onReset={() => handleResetDefaults('theme')} />
        )}

        {/* 3. Typography Tab */}
        {activeTab === 'typography' && (
          <TypographySettingsTab
            typography={typography}
            setTypography={setTypography}
            onReset={() => handleResetDefaults('typography')}
          />
        )}

        {/* 4. 3D & Camera Tab */}
        {activeTab === '3d' && (
          <ThreeDSettingsTab
            dimensions={dimensions}
            setDimensions={setDimensions}
            camera={camera}
            setCamera={setCamera}
            onReset={() => handleResetDefaults('3d')}
          />
        )}

        {/* 5. Atmosphere Tab */}
        {activeTab === 'atmosphere' && (
          <AtmosphereSettingsTab
            atmospheric={atmospheric}
            setAtmospheric={setAtmospheric}
            onReset={() => handleResetDefaults('atmosphere')}
          />
        )}

        {/* 6. Audio Tab */}
        {activeTab === 'audio' && (
          <AudioSettingsTab
            audioTracks={audioTracks}
            backgroundMusicId={backgroundMusicId}
            setBackgroundMusicId={setBackgroundMusicId}
            playlistTrackIds={playlistTrackIds}
            setPlaylistTrackIds={setPlaylistTrackIds}
          />
        )}

        {/* 7. Cover Tab */}
        {activeTab === 'cover' && <CoverSettingsTab />}
      </div>
    </div>
  );
}
