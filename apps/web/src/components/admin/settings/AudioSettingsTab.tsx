'use client';

import React from 'react';
import { Music } from 'lucide-react';

export interface AudioSettingsTabProps {
  audioTracks: any[];
  backgroundMusicId: string | null;
  setBackgroundMusicId: (id: string | null) => void;
  playlistTrackIds: string[];
  setPlaylistTrackIds: (ids: string[]) => void;
}

export default function AudioSettingsTab({
  audioTracks,
  backgroundMusicId,
  setBackgroundMusicId,
  playlistTrackIds,
  setPlaylistTrackIds,
}: AudioSettingsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1.5">
          Bài hát khởi đầu mặc định
        </label>
        <select
          value={backgroundMusicId || ''}
          onChange={(e) => {
            const val = e.target.value ? e.target.value : null;
            setBackgroundMusicId(val);
            if (val && !playlistTrackIds.includes(val)) {
              setPlaylistTrackIds([val, ...playlistTrackIds]);
            }
          }}
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
          Bài hát này sẽ được phát đầu tiên khi độc giả mở sách.
        </p>
      </div>

      {/* Playlist Multi-track Management */}
      <div className="p-4 rounded-xl bg-[#20111A] border border-rosewood-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-champagne-300 uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-amber-400" />
              <span>Danh Sách Phát Nhạc Toàn Quyển (Global Playlist)</span>
            </h4>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Chọn các bài hát sẽ được phát liên tục trong cuốn sách. Hết bài tự chuyển tiếp bài sau.
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-rosewood-900/60 text-amber-300 border border-rosewood-700/50">
            {playlistTrackIds.length} bài hát
          </span>
        </div>

        {/* Tracks Checklist */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {audioTracks.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-4 text-center">
              Chưa có bài hát nào trong Kho Âm Thanh. Hãy vào mục Quản lý Audio để thêm bài hát.
            </p>
          ) : (
            audioTracks.map((track) => {
              const isSelected = playlistTrackIds.includes(track.id);
              const orderIndex = playlistTrackIds.indexOf(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    if (isSelected) {
                      setPlaylistTrackIds(playlistTrackIds.filter((id) => id !== track.id));
                      if (backgroundMusicId === track.id) {
                        const remaining = playlistTrackIds.filter((id) => id !== track.id);
                        setBackgroundMusicId(remaining.length > 0 ? remaining[0] : null);
                      }
                    } else {
                      setPlaylistTrackIds([...playlistTrackIds, track.id]);
                      if (!backgroundMusicId) {
                        setBackgroundMusicId(track.id);
                      }
                    }
                  }}
                  className={`flex flex-wrap gap-2 items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-rosewood-900/60 border-rosewood-600/70 text-white font-medium shadow-sm'
                      : 'bg-[#25151F] border-rosewood-900/40 text-stone-400 hover:text-stone-200 hover:bg-[#2C1825]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Controlled via row click
                      className="w-4 h-4 rounded text-rosewood-600 focus:ring-rosewood-500 bg-[#1C0F17] border-rosewood-800 pointer-events-none"
                    />
                    <div>
                      <p className="text-xs">{track.title}</p>
                      {track.artist && (
                        <p className="text-[10px] text-stone-500">{track.artist}</p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rosewood-950 text-amber-300 border border-amber-600/30">
                        Thứ tự: #{orderIndex + 1}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
