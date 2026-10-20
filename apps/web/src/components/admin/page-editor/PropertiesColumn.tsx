'use client';

import React from 'react';
import { Sliders, Sparkles, Palette, FileText } from 'lucide-react';
import { Book, Page, PageElement } from '@/types/book';
import BackgroundEditor from '@/components/admin/BackgroundEditor';
import AdvancedTextEditor from '@/components/admin/AdvancedTextEditor';
import AdvancedImageEditor from '@/components/admin/AdvancedImageEditor';
import AdvancedVideoEditor from '@/components/admin/AdvancedVideoEditor';
import AdvancedShapeEditor from '@/components/admin/AdvancedShapeEditor';
import InteractionEditor from '@/components/admin/InteractionEditor';
import PageMetadataPanel from './PageMetadataPanel';
import type { InspectorTab } from './types';

export interface PropertiesColumnProps {
  page: Page;
  journal: Book | null;
  allPages: any[];
  audioTracks: any[];
  videoMedia: any[];
  inspectorTab: InspectorTab;
  setInspectorTab: (tab: InspectorTab) => void;
  selectedElement: PageElement | undefined;
  updateSelectedElement: (updater: (el: any) => any) => void;
  updatePage: (update: (prev: Page) => Page, description?: string) => void;
  updateMetadata: (fields: Partial<Page>) => void;
  commitMetadataHistory: () => void;
  editingActiveArea: boolean;
  setEditingActiveArea: (editing: boolean) => void;
}

/** Right column: inspector tab switcher and the element / interaction / background / page panels. */
export default function PropertiesColumn({
  page,
  journal,
  allPages,
  audioTracks,
  videoMedia,
  inspectorTab,
  setInspectorTab,
  selectedElement,
  updateSelectedElement,
  updatePage,
  updateMetadata,
  commitMetadataHistory,
  editingActiveArea,
  setEditingActiveArea,
}: PropertiesColumnProps) {
  return (
    <aside className="editor-properties bg-[#140B10] border-l border-rosewood-900/40 flex-col justify-between shrink-0 overflow-y-auto min-h-0">
      <div className="flex flex-col h-full">
        {/* Inspector Top Switcher (Tabs: Element vs Background vs Interaction vs Metadata) */}
        <div className="p-2 bg-[#1C0F16] border-b border-rosewood-900/40 grid grid-cols-4 gap-1 shrink-0 text-[11px]">
          <button
            type="button"
            onClick={() => setInspectorTab('element')}
            className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
              inspectorTab === 'element'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
            title="Thuộc tính phần tử"
          >
            <Sliders className="w-3 h-3" />
            <span className="truncate">Phần tử</span>
          </button>

          <button
            type="button"
            onClick={() => setInspectorTab('interaction')}
            className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
              inspectorTab === 'interaction'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
            title="Tương tác phần tử"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="truncate">Tương tác</span>
          </button>

          <button
            type="button"
            onClick={() => setInspectorTab('background')}
            className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
              inspectorTab === 'background'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
            title="Hình nền trang"
          >
            <Palette className="w-3 h-3 text-pink-400" />
            <span className="truncate">Nền</span>
          </button>

          <button
            type="button"
            onClick={() => setInspectorTab('metadata')}
            className={`min-h-11 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg font-medium leading-tight transition-all ${
              inspectorTab === 'metadata'
                ? 'bg-rosewood-600 text-white font-semibold shadow'
                : 'text-stone-400 hover:text-white hover:bg-[#25151F]'
            }`}
            title="Thông tin trang & Nhạc nền riêng"
          >
            <FileText className="w-3 h-3 text-champagne-300" />
            <span className="truncate">Trang</span>
          </button>
        </div>

        {/* Inspector Tab Content */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 space-y-4">
          {inspectorTab === 'metadata' && (
            <PageMetadataPanel
              page={page}
              audioTracks={audioTracks}
              updateMetadata={updateMetadata}
              commitMetadataHistory={commitMetadataHistory}
              updatePage={updatePage}
            />
          )}

          {inspectorTab === 'background' && (
            <BackgroundEditor
              background={page.background || { type: 'color', color: '#F9F5EC' }}
              onChange={(newBg) => {
                updatePage(
                  (prevPage) => ({ ...prevPage, isCustomized: true, background: newBg }),
                  'Cập nhật nền trang'
                );
              }}
              disabled={false}
            />
          )}

          {inspectorTab === 'interaction' && selectedElement && (
            <InteractionEditor
              element={selectedElement}
              pages={allPages}
              audioTracks={audioTracks}
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
                  page={page}
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

          {(inspectorTab === 'element' || inspectorTab === 'interaction') && !selectedElement && (
            <div className="py-20 text-center text-xs text-stone-500">
              <Sliders className="w-8 h-8 mx-auto mb-2 text-rosewood-800 opacity-50" />
              <p>Chọn một phần tử trên canvas để chỉnh sửa thuộc tính.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
