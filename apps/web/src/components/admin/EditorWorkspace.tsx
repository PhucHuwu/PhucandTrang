'use client';

import React, { useState } from 'react';

export default function EditorWorkspace({ children, panel: controlledPanel, onPanelChange }: { children: React.ReactNode; panel?: 'canvas' | 'layers' | 'properties'; onPanelChange?: (panel: 'canvas' | 'layers' | 'properties') => void }) {
  const [localPanel, setLocalPanel] = useState<'canvas' | 'layers' | 'properties'>('canvas');
  const panel = controlledPanel ?? localPanel;
  const setPanel = onPanelChange ?? setLocalPanel;
  return (
    <section className="editor-workspace flex-1 min-h-0 min-w-0 flex flex-col" data-panel={panel}>
      <nav aria-label="Khu vực chỉnh sửa" className="editor-panel-nav flex gap-2 p-2 shrink-0">
        {(['canvas', 'layers', 'properties'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={panel === value} onClick={() => setPanel(value)}
            className={`min-h-11 px-4 rounded-lg text-sm ${panel === value ? 'bg-rosewood-700 text-white' : 'bg-[#25151F] text-stone-300'}`}>
            {value === 'canvas' ? 'Canvas' : value === 'layers' ? 'Lớp' : 'Thuộc tính'}
          </button>
        ))}
        {panel !== 'canvas' && <button type="button" onClick={() => setPanel('canvas')} className="min-h-11 px-3 ml-auto text-sm">Đóng panel</button>}
      </nav>
      <div className="editor-columns flex-1 min-h-0 min-w-0 flex relative overflow-hidden">{children}</div>
    </section>
  );
}
