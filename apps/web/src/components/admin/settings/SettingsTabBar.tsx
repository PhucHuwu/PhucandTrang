'use client';

import React from 'react';
import { Music, Palette, Sparkles, Layers, BookOpen, Type, Box } from 'lucide-react';
import type { SettingsTab } from './settingsDefaults';

export default function SettingsTabBar({
  activeTab,
  setActiveTab,
}: {
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
}) {
  return (
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
  );
}
