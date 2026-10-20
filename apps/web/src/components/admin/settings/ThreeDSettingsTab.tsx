'use client';

import React from 'react';
import { DESIGN_CANVAS_HEIGHT, DESIGN_CANVAS_WIDTH } from '@phucandtrang/shared';
import SectionHeader from './SectionHeader';
import type { SettingsCamera, SettingsDimensions } from './settingsDefaults';

export default function ThreeDSettingsTab({ dimensions, setDimensions, camera, setCamera, onReset }: {
  dimensions: SettingsDimensions;
  setDimensions: (dimensions: SettingsDimensions) => void;
  camera: SettingsCamera;
  setCamera: (camera: SettingsCamera) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Kích thước vật lý & Camera 3D" onReset={onReset} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-5">
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
            value={dimensions.canvasResolution?.width || DESIGN_CANVAS_WIDTH}
            onChange={(e) => setDimensions({ ...dimensions, canvasResolution: { ...dimensions.canvasResolution, width: Number(e.target.value) } })}
            className="w-full px-3 py-2 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1.5">Độ phân giải Canvas Height (px)</label>
          <input
            type="number"
            value={dimensions.canvasResolution?.height || DESIGN_CANVAS_HEIGHT}
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
  );
}
