'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Flipbook from './qbject/flipbook';
import { PageTextureGenerator } from './PageTextureGenerator';
import { AtmosphericSystem } from './AtmosphericSystem';
import { LazyPageTextureManager } from './LazyPageTextureManager';
import { MediaPreloader } from './MediaPreloader';
import VintageMusicPlayer from '@/components/VintageMusicPlayer';
import { ensureCustomFontLoaded } from '@/data/fontLoader';
import { fetchPublishedBook } from '@/services/bookApi';
import { Book } from '@/types/book';
import { BookOpen, RefreshCw } from 'lucide-react';
import { deriveFaceIndex, computeActiveAreaPageRect } from '@phucandtrang/shared';

interface QbjectAuthenticExperienceProps {
  customBookData?: Book;
  isDraftPreview?: boolean;
}

export default function QbjectAuthenticExperience({
  customBookData,
  isDraftPreview = false,
}: QbjectAuthenticExperienceProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0.04);
  const [bookData, setBookData] = useState<Book | null>(customBookData || null);
  const [error, setError] = useState<string | null>(null);
  const flipbookInstanceRef = useRef<Flipbook | null>(null);
  const lazyTextureManagerRef = useRef<LazyPageTextureManager | null>(null);
  const mediaPreloaderRef = useRef<MediaPreloader | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const initOriginalFlipbook = async () => {
      try {
        setError(null);
        setLoadingProgress(0.04);

        // 1. If customBookData provided (e.g. preview mode), use it; otherwise fetch published book
        let book: Book;
        if (customBookData) {
          book = customBookData;
        } else {
          const { book: fetchedBook, error: fetchErr } = await fetchPublishedBook('phuc-and-trang');
          if (fetchErr && !fetchedBook) {
            throw new Error(fetchErr);
          }
          book = fetchedBook;
        }
        if (destroyed) return;
        setBookData(book);
        setLoadingProgress(0.08);

        // 2. Ensure custom font 2.otf (SVN-Housttely Signature) is loaded
        await ensureCustomFontLoaded();
        if (destroyed) return;
        setLoadingProgress(0.15);

        // 3. Prompt 26: Initialize Lazy Texture Manager
        const lazyManager = new LazyPageTextureManager(book);
        lazyTextureManagerRef.current = lazyManager;

        // Prompt 27: Initialize MediaPreloader for priority-driven background preloading
        const mediaPreloader = new MediaPreloader(book);
        mediaPreloaderRef.current = mediaPreloader;
        mediaPreloader.init(0);

        const totalInsidePages = book.pages.length;
        const totalFaces = totalInsidePages + 3; // front cover + N inside pages + 2 back covers
        const placeholderUrl = lazyManager.getPlaceholder();

        // 4. Initial Window: Generate immediate front cover & first 2 pages (Window 0..2)
        // This cuts initial load time from seconds to a few hundred milliseconds!
        const initialFacesCount = Math.min(totalFaces, 3);
        const pageUrls: string[] = new Array(totalFaces).fill(placeholderUrl);

        for (let i = 0; i < initialFacesCount; i++) {
          if (destroyed) return;
          const url = await lazyManager.getPageTextureUrl(i);
          pageUrls[i] = url;
          setLoadingProgress(0.2 + ((i + 1) / initialFacesCount) * 0.65);
        }

        if (destroyed) return;
        setLoadingProgress(0.88);

        // 5. Dynamically derive 3D raycast pageActiveAreas from book.pages elements
        const pageActiveAreas: PageActiveArea[] = [];
        book.pages.forEach((page, physicalIndex) => {
          const faceIndex = deriveFaceIndex(physicalIndex);

          page.elements.forEach((el) => {
            if (el.type === 'VIDEO' || el.interaction?.action === 'open-video') {
              const videoUrl =
                el.type === 'VIDEO'
                  ? el.data.src
                  : String(el.interaction?.target || '');
              if (!videoUrl) return;

              // Compute normalized page coordinates using element bounding box and relative activeArea
              const rect = computeActiveAreaPageRect(
                el.transform,
                el.interaction?.activeArea
              );

              pageActiveAreas.push({
                faceIndex,
                video: videoUrl,
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                title:
                  el.interaction?.title ||
                  (el.data as any).caption ||
                  'Xem Video',
              });
            }
          });
        });

        // 6. Instantiate 100% Original Flipbook from Qbject with fast initial textures
        const flipbook = new Flipbook({
          containerEl: container,
          pageWidth: book.settings.dimensions.pageWidth,
          pageHeight: book.settings.dimensions.pageHeight,
          pageThickness: book.settings.dimensions.pageThickness,
          pageRootThickness: book.settings.dimensions.pageRootThickness,
          coverThickness: book.settings.dimensions.coverThickness,
          coverMarginX: book.settings.dimensions.coverMarginX,
          coverMarginY: book.settings.dimensions.coverMarginY,
          pageEdgeColor: book.settings.theme.edgeColor,
          pageActiveAreas,
          textureUrls: {
            pages: pageUrls,
            spineInner: pageUrls[0],
            spineOuter: pageUrls[0],
            coverEdgeTB: pageUrls[0],
            coverEdgeLR: pageUrls[0],
            spineEdgeTB: pageUrls[0],
            spineEdgeLR: pageUrls[0],
            desk: '',
          },
        });

        flipbookInstanceRef.current = flipbook;

        // 7. Attach 3D atmospheric environment (butterflies, floating petals, fairy dust)
        if (book.settings.atmospheric?.enabled !== false) {
          const atmos = book.settings.atmospheric;
          const atmospheric = new AtmosphericSystem(
            (flipbook as any).scene,
            {
              butterflyCount: atmos?.butterflyCount,
              petalCount: atmos?.petalCount,
              dustCount: atmos?.dustCount,
            }
          );
          flipbook.atmospheric = atmospheric;
        }

        setTotalPages(pageUrls.length / 2);

        // Preload rest of window around page 0
        lazyManager.updateActiveWindow(0, (faceIdx, textureUrl) => {
          if (!destroyed && flipbook) {
            flipbook.updateFaceTexture(faceIdx, textureUrl);
          }
        });

        let lastPage = -1;
        let readyReported = false;
        const checkProgress = () => {
          if (!destroyed && flipbook) {
            const progress = Math.max(0.88, Math.min(1, flipbook.loadingProgress));
            setLoadingProgress((prev) => (Math.abs(prev - progress) > 0.005 ? progress : prev));
            if (flipbook.isReady && !readyReported) {
              readyReported = true;
              setLoadingProgress(1);
              setIsReady(true);
            }
            const current = Math.round((flipbook as any).progress?.getValue?.() || 0);
            if (current !== lastPage) {
              lastPage = current;
              setCurrentPage(current);

              // Prompt 26: Trigger lazy loading for window around new currentPage
              lazyManager.updateActiveWindow(current, (faceIdx, textureUrl) => {
                if (!destroyed && flipbookInstanceRef.current) {
                  flipbookInstanceRef.current.updateFaceTexture(faceIdx, textureUrl);
                }
              });

              // Prompt 27: Re-prioritize media preloading based on current spread
              mediaPreloader.updatePagePriorities(current);
            }
            requestAnimationFrame(checkProgress);
          }
        };
        requestAnimationFrame(checkProgress);
      } catch (err: any) {
        if (!destroyed) {
          console.error('[Flipbook] Initialization error:', err);
          setError(err?.message || 'Không thể hiển thị cuốn sách');
        }
      }
    };

    initOriginalFlipbook();

    return () => {
      destroyed = true;
      mediaPreloaderRef.current?.destroy();
      mediaPreloaderRef.current = null;
      lazyTextureManagerRef.current?.destroy();
      lazyTextureManagerRef.current = null;
      flipbookInstanceRef.current?.destroy();
      flipbookInstanceRef.current = null;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* Loading Progress Screen */}
      {showLoading && (
        <div
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#1C0E14] via-[#12080D] to-[#0A0507] text-parchment-100 transition-opacity duration-1000 ${
            isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          onTransitionEnd={() => setShowLoading(false)}
        >
          <div className="flex flex-col items-center max-w-sm px-6 text-center">
            {/* Romantic Ornament */}
            <div className="w-12 h-12 rounded-full border border-rosewood-500/30 flex items-center justify-center mb-6 animate-pulse">
              <span className="font-serif italic text-rosewood-300 text-lg">P &amp; T</span>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl text-parchment-100 tracking-wider mb-2 font-normal">
              Chúng Mình
            </h2>

            <p className="font-serif italic text-xs text-rosewood-300/80 mb-8 tracking-widest uppercase">
              Hành Trình Kỷ Niệm Tình Yêu
            </p>

            {/* Progress Bar Container */}
            <div className="w-48 sm:w-64 h-[2px] bg-rosewood-950/80 rounded-full overflow-hidden mb-3 border border-rosewood-900/30">
              <div
                className="h-full bg-gradient-to-r from-rosewood-400 via-rosewood-300 to-parchment-200 transition-all duration-300 ease-out shadow-sm"
                style={{ width: `${Math.round(loadingProgress * 100)}%` }}
              />
            </div>

            <p className="font-serif italic text-xs sm:text-sm text-stone-400 tracking-wider">
              Đang chuẩn bị cuốn nhật ký tình yêu... {Math.round(loadingProgress * 100)}%
            </p>
          </div>
        </div>
      )}

      {/* Error Fallback Screen */}
      {error && !isReady && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#1C0E14] via-[#12080D] to-[#0A0507] text-parchment-100 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rosewood-500/20 border border-rosewood-400/40 flex items-center justify-center mb-4 text-rosewood-300">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-2xl text-rosewood-100 mb-2">Không thể tải cuốn nhật ký</h3>
          <p className="font-serif text-xs text-stone-400 max-w-sm mb-6 leading-relaxed">
            {error}. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rosewood-500 hover:bg-rosewood-600 active:scale-95 text-white font-serif text-xs tracking-wider transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tải lại trang</span>
          </button>
        </div>
      )}

      {/* Container where the original Flipbook Canvas is injected */}
      <div
        ref={containerRef}
        id="flipbook-container"
        className="absolute inset-0 z-0"
      />

      {/* Draft Preview Badge indicator */}
      {isDraftPreview && (
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 backdrop-blur-md text-xs font-sans font-medium shadow-lg pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>CHẾ ĐỘ XEM TRƯỚC BẢN NHÁP (DRAFT PREVIEW)</span>
        </div>
      )}

      {/* Romantic Music Player */}
      <VintageMusicPlayer
        autoPlayTrigger={currentPage > 0}
        audioTrack={bookData?.audio}
      />
    </div>
  );
}
