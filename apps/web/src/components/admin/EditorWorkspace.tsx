'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

type Panel = 'canvas' | 'layers' | 'properties';

export default function EditorWorkspace({
  children,
  panel: controlledPanel,
  onPanelChange,
  toolbar,
}: {
  children: React.ReactNode;
  panel?: Panel;
  onPanelChange?: (panel: Panel) => void;
  toolbar?: React.ReactNode;
}) {
  const [localPanel, setLocalPanel] = useState<Panel>('canvas');
  const panel = controlledPanel ?? localPanel;
  const setPanel = onPanelChange ?? setLocalPanel;
  return (
    <section className="editor-workspace flex-1 min-h-0 min-w-0 flex flex-col" data-panel={panel}>
      <div className={`editor-toolbar ${toolbar ? '' : 'editor-toolbar--nav-only'} min-h-12 px-2 py-1 flex items-center gap-2 shrink-0 bg-[#140B10] border-b border-rosewood-900/40`}>
        <nav aria-label="Khu vực chỉnh sửa" className="editor-panel-nav flex items-center gap-1 shrink-0">
          {(['layers', 'properties'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={panel === value}
              onClick={() => setPanel(panel === value ? 'canvas' : value)}
              className={`min-h-10 px-3 rounded-lg text-sm whitespace-nowrap transition-colors ${panel === value ? 'bg-rosewood-700 text-white' : 'bg-[#25151F] text-stone-300 hover:text-white'}`}
            >
              {value === 'layers' ? 'Lớp' : 'Thuộc tính'}
            </button>
          ))}
          {panel !== 'canvas' && (
            <button
              type="button"
              aria-label="Đóng panel"
              title="Đóng panel"
              onClick={() => setPanel('canvas')}
              className="min-h-10 w-10 flex items-center justify-center rounded-lg text-stone-300 hover:text-white hover:bg-[#25151F]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </nav>
        {toolbar && <div className="editor-toolbar-main flex-1 min-w-0 flex items-center gap-2">{toolbar}</div>}
      </div>
      <div className="editor-columns flex-1 min-h-0 min-w-0 flex relative overflow-hidden">
        {children}
        <div className="editor-backdrop" aria-hidden="true" onClick={() => setPanel('canvas')} />
      </div>
    </section>
  );
}
