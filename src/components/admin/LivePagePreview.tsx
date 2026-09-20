'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Page, Book } from '@/types/book';
import { PageTextureGenerator } from '@/components/3d/PageTextureGenerator';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface LivePagePreviewProps {
  page: Page;
  book?: Partial<Book> | null;
  className?: string;
}

export default function LivePagePreview({
  page,
  book,
  className = '',
}: LivePagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(0.42);
  const [renderError, setRenderError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const canvasWidth =
    book?.settings?.dimensions?.canvasResolution?.width || 1024;
    const canvasHeight =
    book?.settings?.dimensions?.canvasResolution?.height || 1360;

  const triggerRender = () => {
    if (!canvasRef.current) return;
    setRendering(true);
    setRenderError(null);

    PageTextureGenerator.renderPageToCanvas(page, canvasRef.current, book || undefined)
      .then(() => {
        setRendering(false);
      })
      .catch((err: any) => {
        console.error('[LivePagePreview] Error rendering page:', err);
        setRenderError(err?.message || 'Lỗi vẽ trang');
        setRendering(false);
      });
  };

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Debounce rendering slightly to keep UI super snappy during rapid input typing
    debounceTimerRef.current = setTimeout(() => {
      triggerRender();
    }, 120);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [page, book]);

  return (
    <div className={`flex flex-col bg-[#1A1115] border border-rosewood-900/40 rounded-xl overflow-hidden shadow-2xl ${className}`}>
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#25181F] border-b border-rosewood-900/50 text-parchment-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-serif text-sm font-semibold tracking-wide">
            Live Preview (Trang {page.pageNumber ?? 0})
          </span>
          <span className="text-xs text-rosewood-300/70 font-mono">
            {page.side?.toUpperCase()} • {page.layout || 'auto'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.2, parseFloat((s - 0.05).toFixed(2))))}
            className="p-1 rounded bg-[#33202A] hover:bg-rosewood-800 text-parchment-300 transition-colors"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(0.8, parseFloat((s + 0.05).toFixed(2))))}
            className="p-1 rounded bg-[#33202A] hover:bg-rosewood-800 text-parchment-300 transition-colors"
            title="Phóng to"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setScale(0.42)}
            className="p-1 rounded bg-[#33202A] hover:bg-rosewood-800 text-parchment-300 transition-colors"
            title="Reset tỉ lệ"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={triggerRender}
            className="flex items-center gap-1 px-2 py-1 rounded bg-rosewood-600/60 hover:bg-rosewood-600 text-white transition-colors"
            title="Vẽ lại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rendering ? 'animate-spin' : ''}`} />
            <span>Render</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-4 min-h-[480px] max-h-[720px] overflow-auto bg-[#0E080B]">
        {renderError && (
          <div className="absolute top-4 left-4 right-4 z-10 p-3 bg-red-900/80 border border-red-500/50 rounded text-red-200 text-xs">
            {renderError}
          </div>
        )}

        <div
          className="relative shadow-2xl rounded border border-rosewood-300/30 overflow-hidden transition-transform duration-150"
          style={{
            width: `${canvasWidth * scale}px`,
            height: `${canvasHeight * scale}px`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-full object-contain block"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-[#20151B] border-t border-rosewood-900/40 text-[11px] text-stone-400 flex items-center justify-between font-mono">
        <span>Kích thước gốc: {canvasWidth} × {canvasHeight}px</span>
        <span>Phần tử: {(page.elements || []).length} items</span>
      </div>
    </div>
  );
}
