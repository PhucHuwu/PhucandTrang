'use client';

import React from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Page, PageElement } from '@/types/book';
import LayersPanel from '@/components/admin/LayersPanel';

export interface LayersColumnProps {
  page: Page;
  pageId: string;
  allPages: any[];
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  updatePage: (update: (prev: Page) => Page, description?: string) => void;
  handleDuplicateSelected: () => void;
  handleDeleteElement: (elementId: string) => void;
  navigateAway: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  navigating: boolean;
}

/** Left column: layers panel plus the quick page switcher. */
export default function LayersColumn({
  page,
  pageId,
  allPages,
  selectedElementId,
  setSelectedElementId,
  updatePage,
  handleDuplicateSelected,
  handleDeleteElement,
  navigateAway,
  navigating,
}: LayersColumnProps) {
  return (
    <aside className="editor-layers bg-[#140B10] border-r border-rosewood-900/40 flex-col justify-between shrink-0 overflow-y-auto min-h-0">
      <LayersPanel
        elements={page.elements || []}
        selectedElementId={selectedElementId}
        onSelectElement={setSelectedElementId}
        onUpdateElement={(elId, updater) => {
          updatePage(
            (prevPage) => ({
              ...prevPage,
              isCustomized: true,
              elements: (prevPage.elements || []).map((el) => (el.id === elId ? updater(el) : el)),
            }),
            'Cập nhật layer'
          );
        }}
        onReorderElements={(newElements) => {
          updatePage(
            (prevPage) => ({ ...prevPage, isCustomized: true, elements: newElements }),
            'Sắp xếp lại thứ tự z-index layers'
          );
        }}
        onDuplicateElement={handleDuplicateSelected}
        onDeleteElement={handleDeleteElement}
        isViewer={false}
      />

      {/* Quick Pages Navigation Switcher */}
      <div className="h-44 border-t border-rosewood-900/40 bg-[#12090F] flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-rosewood-900/40 flex items-center justify-between text-[11px] font-mono text-stone-400">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-rosewood-400" />
            <span>Chuyển trang nhanh</span>
          </span>
          <span>{allPages.length} trang</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {allPages.map((p) => (
            <Link
              key={p.id}
              href={`/admin/pages/${p.id}`}
              onClick={(e) => {
                if (p.id === pageId) {
                  e.preventDefault();
                  return;
                }
                navigateAway(e, `/admin/pages/${p.id}`);
              }}
              aria-current={p.id === pageId ? 'page' : undefined}
              aria-disabled={navigating || undefined}
              className={`block px-2.5 py-1.5 rounded-lg text-xs font-mono truncate transition-all ${
                p.id === pageId
                  ? 'bg-rosewood-900/60 text-champagne-300 font-bold border border-rosewood-700/50'
                  : 'text-stone-500 hover:text-stone-300 hover:bg-[#1E1119]'
              }`}
            >
              #{p.order} • {p.pageNumber === 0 ? 'Lời ngỏ' : `Trang ${p.pageNumber}`} {p.title ? `— ${p.title}` : ''}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
