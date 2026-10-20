'use client';

import React from 'react';
import { Sparkles, Sliders, Palette } from 'lucide-react';
import { Book, Page, PageElement } from '@/types/book';
import BackgroundEditor from '@/components/admin/BackgroundEditor';
import AdvancedTextEditor from '@/components/admin/AdvancedTextEditor';
import AdvancedImageEditor from '@/components/admin/AdvancedImageEditor';
import AdvancedVideoEditor from '@/components/admin/AdvancedVideoEditor';
import AdvancedShapeEditor from '@/components/admin/AdvancedShapeEditor';
import InteractionEditor from '@/components/admin/InteractionEditor';

export type CoverInspectorTab = 'element' | 'interaction' | 'background';

export interface CoverPropertiesColumnProps {
  virtualPage: Page;
  journal: Book | null;
  videoMedia: any[];
  inspectorTab: CoverInspectorTab;
  setInspectorTab: (tab: CoverInspectorTab) => void;
  selectedElement: PageElement | undefined;
  updateSelectedElement: (updater: (el: any) => any) => void;
  updateVirtualPage: (update: (prev: Page) => Page, description: string) => void;
  editingActiveArea: boolean;
  setEditingActiveArea: (editing: boolean) => void;
}

/** Right column of the cover studio: element / interaction / cover background inspectors. */
export default function CoverPropertiesColumn({
  virtualPage,
  journal,
  videoMedia,
  inspectorTab,
  setInspectorTab,
  selectedElement,
  updateSelectedElement,
  updateVirtualPage,
  editingActiveArea,
  setEditingActiveArea,
}: CoverPropertiesColumnProps) {
  return (
    <aside className="editor-properties bg-[#140B10] border-l border-rosewood-900/40 flex-col justify-between shrink-0 overflow-y-auto">
      <div className="flex flex-col h-full">
        {/* Inspector Tab Switcher */}
        <div className="p-2 bg-[#1C0F16] border-b border-rosewood-900/40 grid grid-cols-3 gap-1 shrink-0 text-[11px]">
          <button
            type="button"
            onClick={() => setInspectorTab('element')}
            className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
              inspectorTab === 'element'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Phần tử</span>
          </button>

          <button
            type="button"
            onClick={() => setInspectorTab('interaction')}
            className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
              inspectorTab === 'interaction'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tương tác</span>
          </button>

          <button
            type="button"
            onClick={() => setInspectorTab('background')}
            className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
              inspectorTab === 'background'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span>Nền bìa</span>
          </button>
        </div>

        {/* Inspector Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {inspectorTab === 'background' && (
            <BackgroundEditor
              background={virtualPage.background || { type: 'color', color: '#1A0E15' }}
              onChange={(newBg) => {
                updateVirtualPage((prev) => {
                  const nextPage = { ...prev, background: newBg };
                  return nextPage;
                }, 'Cập nhật nền bìa');
              }}
              disabled={false}
            />
          )}

          {inspectorTab === 'interaction' && selectedElement && (
            <InteractionEditor
              element={selectedElement}
              pages={[]}
              audioTracks={[]}
              videoMedia={videoMedia}
              onChange={(newInteraction) => {
                updateSelectedElement((target) => ({
                  ...target,
                  interaction: newInteraction,
                }));
              }}
              isEditingActiveArea={editingActiveArea}
              onEditActiveArea={() => setEditingActiveArea(!editingActiveArea)}
              disabled={false}
            />
          )}

          {inspectorTab === 'element' && selectedElement && (
            <>
              {selectedElement.type === 'TEXT' && (
                <AdvancedTextEditor
                  element={selectedElement}
                  onChange={(updated) => {
                    updateSelectedElement(updated);
                  }}
                  book={journal}
                  page={virtualPage}
                  disabled={false}
                />
              )}

              {selectedElement.type === 'IMAGE' && (
                <AdvancedImageEditor
                  element={selectedElement}
                  onChange={(updated) => {
                    updateSelectedElement(updated);
                  }}
                  disabled={false}
                />
              )}

              {selectedElement.type === 'VIDEO' && (
                <AdvancedVideoEditor
                  element={selectedElement}
                  onChange={(updated) => {
                    updateSelectedElement(updated);
                  }}
                  disabled={false}
                />
              )}

              {selectedElement.type === 'SHAPE' && (
                <AdvancedShapeEditor
                  element={selectedElement as any}
                  onChange={(updated) => {
                    updateSelectedElement(updated as any);
                  }}
                  disabled={false}
                />
              )}
            </>
          )}

          {inspectorTab !== 'background' && !selectedElement && (
            <div className="py-20 text-center text-xs text-stone-500">
              <Sliders className="w-8 h-8 mx-auto mb-2 text-rosewood-800 opacity-50" />
              <p>Chọn một phần tử trên bìa để chỉnh sửa thuộc tính.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
