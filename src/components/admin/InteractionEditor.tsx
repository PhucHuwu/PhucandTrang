'use client';

import React, { useMemo } from 'react';
import { PageElement, ElementInteraction } from '@/types/book';
import {
  ELEMENT_INTERACTION_ACTIONS,
  ElementInteractionAction,
  validateInteractionTarget,
} from '../../../shared/interactionContract';
import {
  MousePointer,
  ExternalLink,
  FileText,
  Music,
  Video,
  ZoomIn,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';

interface InteractionEditorProps {
  element: PageElement;
  pages: any[];
  audioTracks: any[];
  videoMedia: any[];
  onChange: (interaction: ElementInteraction) => void;
  disabled?: boolean;
  onEditActiveArea?: () => void;
  isEditingActiveArea?: boolean;
}

const ACTION_LABELS: Record<ElementInteractionAction, string> = {
  none: 'Không tương tác',
  'open-video': 'Mở Video Overlay',
  zoom: 'Phóng to phần tử',
  'open-link': 'Mở liên kết Web',
  'navigate-page': 'Chuyển tới trang khác',
  'play-audio': 'Phát Audio Track',
};

export default function InteractionEditor({
  element,
  pages,
  audioTracks,
  videoMedia,
  onChange,
  disabled = false,
  onEditActiveArea,
  isEditingActiveArea = false,
}: InteractionEditorProps) {
  const current: ElementInteraction = element.interaction || {
    enabled: false,
    action: 'none',
    activeArea: { left: 0, top: 0, width: 1, height: 1 },
  };

  const action = current.action || 'none';
  const enabled = current.enabled !== false && action !== 'none';
  const validationError = useMemo(
    () => validateInteractionTarget(action, current.target),
    [action, current.target]
  );

  const update = (patch: Partial<ElementInteraction>) => {
    const next = { ...current, ...patch } as ElementInteraction;
    onChange(next);
  };

  const handleActionChange = (newAction: ElementInteractionAction) => {
    let target: string | number | undefined;

    if (newAction === 'open-video') {
      target = (element.data as any)?.mediaId || (element.data as any)?.src || '';
    } else if (newAction === 'navigate-page') {
      target = pages[0]?.id || '';
    } else if (newAction === 'play-audio') {
      target = audioTracks[0]?.id || '';
    } else if (newAction === 'open-link') {
      target = '';
    }

    onChange({
      ...current,
      enabled: newAction !== 'none',
      action: newAction,
      target,
      activeArea: current.activeArea || { left: 0, top: 0, width: 1, height: 1 },
    });
  };

  const area = current.activeArea || { left: 0, top: 0, width: 1, height: 1 };

  return (
    <div className="space-y-4 text-xs text-parchment-200">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
          <MousePointer className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Element Interaction</span>
        </h4>
        <label className="flex items-center gap-2 text-[11px] text-stone-300">
          <span>Enabled</span>
          <input
            type="checkbox"
            disabled={disabled || action === 'none'}
            checked={enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="w-4 h-4 rounded text-rosewood-600 bg-[#20111A] border-rosewood-800"
          />
        </label>
      </div>

      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <div>
          <label className="block text-[11px] text-stone-300 font-medium mb-1">Action</label>
          <select
            disabled={disabled}
            value={action}
            onChange={(e) => handleActionChange(e.target.value as ElementInteractionAction)}
            className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white text-xs"
          >
            {ELEMENT_INTERACTION_ACTIONS.map((item) => (
              <option key={item} value={item}>
                {ACTION_LABELS[item]} ({item})
              </option>
            ))}
          </select>
        </div>

        {action === 'open-link' && (
          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3 text-rosewood-400" /> URL http/https
            </label>
            <input
              type="url"
              disabled={disabled}
              value={typeof current.target === 'string' ? current.target : ''}
              onChange={(e) => update({ target: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white font-mono"
            />
          </div>
        )}

        {action === 'navigate-page' && (
          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-rosewood-400" /> Trang đích
            </label>
            <select
              disabled={disabled}
              value={current.target?.toString() || ''}
              onChange={(e) => update({ target: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
            >
              <option value="">-- Chọn trang --</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  Order {page.order} — Trang {page.pageNumber}: {page.title || 'Không tiêu đề'}
                </option>
              ))}
            </select>
          </div>
        )}

        {action === 'play-audio' && (
          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1 flex items-center gap-1">
              <Music className="w-3 h-3 text-rosewood-400" /> Audio track
            </label>
            <select
              disabled={disabled}
              value={current.target?.toString() || ''}
              onChange={(e) => update({ target: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
            >
              <option value="">-- Chọn audio --</option>
              {audioTracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title} {track.artist ? `— ${track.artist}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {action === 'open-video' && (
          <div>
            <label className="block text-[11px] text-stone-300 font-medium mb-1 flex items-center gap-1">
              <Video className="w-3 h-3 text-amber-400" /> Video target
            </label>
            <select
              disabled={disabled}
              value={current.target?.toString() || ''}
              onChange={(e) => update({ target: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
            >
              <option value="">-- Chọn video --</option>
              {videoMedia.map((media) => (
                <option key={media.id} value={media.url}>
                  {media.alt || media.publicId || media.id}
                </option>
              ))}
              {typeof current.target === 'string' &&
                current.target &&
                !videoMedia.some((media) => media.url === current.target) && (
                  <option value={current.target}>Video hiện tại</option>
                )}
            </select>
            {(element.data as any)?.mediaId && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => update({ target: (element.data as any).src || current.target || '' })}
                className="mt-1 text-[10px] text-amber-300 hover:text-white"
              >
                Dùng video của phần tử hiện tại (mediaId: {(element.data as any).mediaId})
              </button>
            )}
          </div>
        )}

        {action === 'zoom' && (
          <div className="p-2 rounded-lg bg-[#25151F] border border-rosewood-900/50 text-[11px] text-stone-400 flex items-center gap-2">
            <ZoomIn className="w-3.5 h-3.5 text-rosewood-400" />
            <span>Zoom sử dụng chính phần tử hiện tại, không cần target.</span>
          </div>
        )}

        <div>
          <label className="block text-[11px] text-stone-300 font-medium mb-1">Tooltip / Title</label>
          <input
            type="text"
            disabled={disabled}
            value={current.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Ví dụ: Xem video kỷ niệm"
            className="w-full px-3 py-1.5 bg-[#25151F] border border-rosewood-900/60 rounded-lg text-white"
          />
        </div>

        {validationError && enabled && (
          <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-[11px] flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-[#1C0F17] border border-rosewood-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-champagne-300 font-semibold flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-rosewood-400" /> Active Area
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={onEditActiveArea}
            className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${
              isEditingActiveArea
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-[#25151F] text-champagne-300 border-rosewood-800/50 hover:bg-rosewood-900/60'
            }`}
          >
            {isEditingActiveArea ? 'Đang chỉnh trên Canvas' : 'Chỉnh trực quan'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['left', 'top', 'width', 'height'] as const).map((key) => (
            <div key={key}>
              <label className="block text-[10px] text-stone-400 mb-0.5">{key}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                disabled={disabled}
                value={area[key]}
                onChange={(e) =>
                  update({
                    activeArea: {
                      ...area,
                      [key]: parseFloat(e.target.value) || (key === 'width' || key === 'height' ? 0.001 : 0),
                    },
                  })
                }
                className="w-full px-2 py-1 bg-[#25151F] border border-rosewood-900/60 rounded text-white font-mono"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => update({ activeArea: { left: 0, top: 0, width: 1, height: 1 } })}
          className="w-full py-1.5 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-stone-300 text-[11px] border border-rosewood-900/50"
        >
          Reset về toàn bộ phần tử
        </button>
      </div>
    </div>
  );
}
