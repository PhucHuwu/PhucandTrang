'use client';

import React from 'react';
import SectionHeader from './SectionHeader';
import type { SettingsAtmospheric } from './settingsDefaults';

export default function AtmosphereSettingsTab({ atmospheric, setAtmospheric, onReset }: {
  atmospheric: SettingsAtmospheric;
  setAtmospheric: (atmospheric: SettingsAtmospheric) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Hiệu ứng lãng mạn trong không gian 3D" onReset={onReset} />

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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-5 pt-3">
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
  );
}
