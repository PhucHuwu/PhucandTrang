'use client';

import React, { useState } from 'react';
import { PageElement } from '@/types/book';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Edit2,
  Check,
  Type,
  Image as ImageIcon,
  Video,
  Square,
  Sparkles,
  GripVertical,
} from 'lucide-react';

interface LayersPanelProps {
  elements: PageElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updater: (el: PageElement) => PageElement) => void;
  onReorderElements: (newSortedElements: PageElement[]) => void;
  onDuplicateElement: () => void;
  onDeleteElement: (id: string) => void;
  isViewer?: boolean;
}

export default function LayersPanel({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onReorderElements,
  onDuplicateElement,
  onDeleteElement,
  isViewer = false,
}: LayersPanelProps) {
  // Sort elements by canonical zIndex descending (highest zIndex at top, like Figma/Canva)
  const sortedLayers = [...elements].sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1));

  // Inline editing label
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Drag and drop reordering states
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'TEXT':
        return <Type className="w-3.5 h-3.5 text-champagne-300 shrink-0" />;
      case 'IMAGE':
        return <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      case 'VIDEO':
        return <Video className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'SHAPE':
        return <Square className="w-3.5 h-3.5 text-rosewood-400 shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-stone-400 shrink-0" />;
    }
  };

  const getElementDisplayLabel = (el: PageElement) => {
    const d = (el.data as any) || {};
    if (d.customLabel) return d.customLabel;
    if (d.text) return d.text;
    if (d.caption) return d.caption;
    if (el.slot) return el.slot;
    return `${el.type} Layer`;
  };

  const startEditingLabel = (el: PageElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isViewer) return;
    setEditingLabelId(el.id);
    setEditingText(getElementDisplayLabel(el));
  };

  const saveEditingLabel = (id: string) => {
    if (editingText.trim()) {
      onUpdateElement(id, (el) => ({
        ...el,
        data: {
          ...(el.data as any),
          customLabel: editingText.trim(),
        } as any,
      }));
    }
    setEditingLabelId(null);
  };

  // Re-normalize canonical zIndex strictly from 1..N based on new array order
  // Array is top-to-bottom (descending), so index 0 gets highest zIndex = N
  const commitReorderedList = (reorderedDescList: PageElement[]) => {
    const total = reorderedDescList.length;
    const normalized = reorderedDescList.map((el, idx) => ({
      ...el,
      zIndex: total - idx,
      order: total - idx,
    }));
    onReorderElements(normalized);
  };

  // Move Forward (Up one level in z-index)
  const handleMoveForward = (index: number) => {
    if (index <= 0 || isViewer) return;
    const copy = [...sortedLayers];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    commitReorderedList(copy);
  };

  // Move Backward (Down one level in z-index)
  const handleMoveBackward = (index: number) => {
    if (index >= sortedLayers.length - 1 || isViewer) return;
    const copy = [...sortedLayers];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    commitReorderedList(copy);
  };

  // Bring to Front (Top of stack)
  const handleBringToFront = (index: number) => {
    if (index <= 0 || isViewer) return;
    const copy = [...sortedLayers];
    const [target] = copy.splice(index, 1);
    copy.unshift(target);
    commitReorderedList(copy);
  };

  // Send to Back (Bottom of stack)
  const handleSendToBack = (index: number) => {
    if (index >= sortedLayers.length - 1 || isViewer) return;
    const copy = [...sortedLayers];
    const [target] = copy.splice(index, 1);
    copy.push(target);
    commitReorderedList(copy);
  };

  // Drag & drop handlers
  const handleDragStart = (index: number) => {
    if (isViewer) return;
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggingIndex === null || draggingIndex === index || isViewer) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }

    const copy = [...sortedLayers];
    const [dragged] = copy.splice(draggingIndex, 1);
    copy.splice(index, 0, dragged);

    setDraggingIndex(null);
    setDragOverIndex(null);
    commitReorderedList(copy);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#140B10]">
      {/* Panel Header */}
      <div className="p-3 bg-[#1C0F16] border-b border-rosewood-900/40 flex items-center justify-between text-xs font-semibold text-parchment-200">
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-champagne-300">
          <Layers className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Layers ({elements.length})</span>
        </span>

        {/* Selected Layer Order Quick Controls */}
        {selectedElementId && !isViewer && (
          <div className="flex items-center gap-0.5">
            {(() => {
              const selIdx = sortedLayers.findIndex((el) => el.id === selectedElementId);
              if (selIdx < 0) return null;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => handleBringToFront(selIdx)}
                    disabled={selIdx === 0}
                    className="p-1 rounded hover:bg-rosewood-800/60 text-stone-400 hover:text-white transition disabled:opacity-20"
                    title="Lên trên cùng (Bring to Front)"
                  >
                    <ChevronsUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveForward(selIdx)}
                    disabled={selIdx === 0}
                    className="p-1 rounded hover:bg-rosewood-800/60 text-stone-400 hover:text-white transition disabled:opacity-20"
                    title="Lên 1 lớp (Move Forward)"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveBackward(selIdx)}
                    disabled={selIdx === sortedLayers.length - 1}
                    className="p-1 rounded hover:bg-rosewood-800/60 text-stone-400 hover:text-white transition disabled:opacity-20"
                    title="Xuống 1 lớp (Move Backward)"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToBack(selIdx)}
                    disabled={selIdx === sortedLayers.length - 1}
                    className="p-1 rounded hover:bg-rosewood-800/60 text-stone-400 hover:text-white transition disabled:opacity-20"
                    title="Xuống dưới cùng (Send to Back)"
                  >
                    <ChevronsDown className="w-3 h-3" />
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Layers Draggable List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedLayers.map((el, index) => {
          const isSelected = el.id === selectedElementId;
          const isLocked = Boolean(el.locked);
          const isVisible = el.visible !== false;
          const isEditing = editingLabelId === el.id;
          const isDragging = draggingIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={el.id}
              draggable={!isViewer && !isEditing}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onClick={() => onSelectElement(el.id)}
              className={`group relative flex items-center justify-between px-2 py-1.5 rounded-xl text-xs cursor-pointer select-none transition-all ${
                isSelected
                  ? 'bg-rosewood-600 text-white font-medium shadow-md'
                  : 'bg-[#1E1119] text-stone-400 hover:text-white hover:bg-[#2A1622]'
              } ${isDragging ? 'opacity-40' : ''} ${
                isDragOver ? 'border-t-2 border-champagne-400' : ''
              }`}
            >
              {/* Left Handle & Label */}
              <div className="flex items-center gap-1.5 truncate flex-1 pr-2">
                {!isViewer && (
                  <span
                    className="cursor-grab active:cursor-grabbing text-stone-600 group-hover:text-stone-400"
                    title="Kéo thả để đổi thứ tự z-index"
                  >
                    <GripVertical className="w-3 h-3" />
                  </span>
                )}

                {getElementIcon(el.type)}

                <span className="font-mono text-[10px] opacity-60 w-5">z{el.zIndex}</span>

                {isEditing ? (
                  <div
                    className="flex items-center gap-1 flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditingLabel(el.id);
                        if (e.key === 'Escape') setEditingLabelId(null);
                      }}
                      className="w-full px-1.5 py-0.5 bg-[#12080F] border border-rosewood-500 rounded text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => saveEditingLabel(el.id)}
                      className="p-1 rounded bg-rosewood-700 hover:bg-rosewood-600 text-white"
                      title="Lưu tên layer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    onDoubleClick={(e) => startEditingLabel(el, e)}
                    className="truncate flex-1"
                    title="Nhấp đúp chuột để đổi tên layer"
                  >
                    {getElementDisplayLabel(el)}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {!isViewer && (
                <div className="flex items-center gap-0.5 text-stone-400 shrink-0">
                  {/* Rename label button */}
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={(e) => startEditingLabel(el, e)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-white transition"
                      title="Đổi tên layer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}

                  {/* Duplicate layer button */}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateElement();
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-white transition"
                      title="Nhân bản layer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}

                  {/* Lock toggle button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateElement(el.id, (t) => ({ ...t, locked: !isLocked }));
                    }}
                    className={`p-1 rounded hover:text-white transition ${
                      isLocked ? 'text-amber-400 opacity-100' : 'opacity-40 hover:opacity-100'
                    }`}
                    title={isLocked ? 'Mở khóa' : 'Khóa layer'}
                  >
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>

                  {/* Visibility toggle button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateElement(el.id, (t) => ({ ...t, visible: !isVisible }));
                    }}
                    className={`p-1 rounded hover:text-white transition ${
                      !isVisible ? 'text-stone-600 opacity-100' : 'opacity-40 hover:opacity-100'
                    }`}
                    title={isVisible ? 'Ẩn layer' : 'Hiện layer'}
                  >
                    {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteElement(el.id);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                    title="Xóa layer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {sortedLayers.length === 0 && (
          <div className="p-6 text-center text-xs text-stone-500">
            Chưa có layer nào trên trang.
          </div>
        )}
      </div>
    </div>
  );
}
