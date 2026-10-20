'use client';

import React from 'react';
import {
  Type,
  Image as ImageIcon,
  Video,
  Square,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  BookmarkPlus,
  Undo2,
  Redo2,
  Magnet,
} from 'lucide-react';
import { PageElementType } from '@/types/book';

export interface EditorToolbarProps {
  setShowLayoutPicker: (open: boolean) => void;
  handleAddElement: (type: PageElementType) => void;
  performUndo: () => void;
  canUndo: boolean;
  performRedo: () => void;
  canRedo: boolean;
  snappingEnabled: boolean;
  setSnappingEnabled: (enabled: boolean) => void;
  setShowSaveAsLayout: (open: boolean) => void;
  setCanvasScale: (update: React.SetStateAction<number>) => void;
  canvasScale: number;
  fitViewport: () => void;
}

/** Canvas toolbar: layout picker, add-element buttons, undo / redo, snapping, save-as-template and zoom controls. */
export default function EditorToolbar({
  setShowLayoutPicker,
  handleAddElement,
  performUndo,
  canUndo,
  performRedo,
  canRedo,
  snappingEnabled,
  setSnappingEnabled,
  setShowSaveAsLayout,
  setCanvasScale,
  canvasScale,
  fitViewport,
}: EditorToolbarProps) {
  return (
    <>
      <div className="editor-scroll flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setShowLayoutPicker(true)}
          className="h-10 shrink-0 flex items-center gap-1.5 px-3 rounded-lg bg-[#2A1220] hover:border-champagne-400 text-champagne-300 text-xs font-medium border border-rosewood-700/60 transition-colors"
          title="Đổi bố cục trang"
        >
          <LayoutGrid className="w-4 h-4 text-champagne-400" />
          <span>Đổi bố cục</span>
        </button>

        <div className="shrink-0 flex items-center gap-0.5 bg-[#20111A] p-0.5 rounded-lg border border-rosewood-900/40 text-xs" role="group" aria-label="Thêm phần tử">
          {([
            ['TEXT', 'Chữ', Type, 'text-champagne-300'],
            ['IMAGE', 'Ảnh', ImageIcon, 'text-pink-400'],
            ['VIDEO', 'Video', Video, 'text-amber-400'],
            ['SHAPE', 'Đường kẻ', Square, 'text-rosewood-400'],
          ] as const).map(([type, label, Icon, color]) => (
            <button
              key={type}
              type="button"
              onClick={() => handleAddElement(type)}
              className="h-9 min-w-9 flex items-center justify-center gap-1 px-2 rounded-md hover:bg-rosewood-800/60 text-parchment-200 transition"
              title={`Thêm ${label.toLowerCase()}`}
              aria-label={`Thêm ${label.toLowerCase()}`}
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="editor-label">{label}</span>
            </button>
          ))}
        </div>

        <div className="shrink-0 flex items-center gap-0.5 bg-[#20111A] p-0.5 rounded-lg border border-rosewood-900/40">
          <button
            type="button"
            onClick={() => performUndo()}
            disabled={!canUndo}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800/60 text-parchment-200 transition disabled:opacity-30"
            title="Hoàn tác (Ctrl+Z)"
            aria-label="Hoàn tác"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => performRedo()}
            disabled={!canRedo}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800/60 text-parchment-200 transition disabled:opacity-30"
            title="Làm lại (Ctrl+Shift+Z)"
            aria-label="Làm lại"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSnappingEnabled(!snappingEnabled)}
          aria-pressed={snappingEnabled}
          className={`h-10 shrink-0 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs transition-all ${
            snappingEnabled
              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
              : 'bg-[#20111A] border-rosewood-900/40 text-stone-500 hover:text-stone-300'
          }`}
          title="Bật/tắt hít từ tính"
          aria-label="Hít từ tính"
        >
          <Magnet className="w-4 h-4" />
          <span className="editor-label">Snap</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSaveAsLayout(true)}
          className="h-10 shrink-0 flex items-center gap-1.5 px-2.5 rounded-lg bg-[#22101A] hover:bg-[#2D1623] text-parchment-200 text-xs font-medium border border-rosewood-800/60 transition"
          title="Lưu bố cục hiện tại thành template tùy biến"
          aria-label="Lưu Template"
        >
          <BookmarkPlus className="w-4 h-4 text-pink-400" />
          <span className="editor-label">Lưu Template</span>
        </button>
      </div>

      <div className="shrink-0 flex items-center gap-0.5 bg-[#20111A] p-0.5 rounded-lg border border-rosewood-900/40 text-stone-300">
        <button
          type="button"
          onClick={() => setCanvasScale((s) => Math.max(0.2, parseFloat((s - 0.05).toFixed(2))))}
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800 transition-colors"
          title="Thu nhỏ canvas"
          aria-label="Thu nhỏ canvas"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="font-mono w-10 text-center text-[11px]" aria-live="polite">{Math.round(canvasScale * 100)}%</span>
        <button
          type="button"
          onClick={() => setCanvasScale((s) => Math.min(1.2, parseFloat((s + 0.05).toFixed(2))))}
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800 transition-colors"
          title="Phóng to canvas"
          aria-label="Phóng to canvas"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={fitViewport}
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-rosewood-800 transition-colors"
          title="Vừa vùng làm việc"
          aria-label="Vừa vùng làm việc"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
