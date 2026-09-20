'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Flipbook from './qbject/flipbook';
import { PageTextureGenerator } from './PageTextureGenerator';
import { AtmosphericSystem } from './AtmosphericSystem';
import VintageMusicPlayer from '@/components/VintageMusicPlayer';
import { ensureCustomFontLoaded } from '@/data/fontLoader';
import { fetchPublishedBook } from '@/services/bookApi';
import { Book } from '@/types/book';
import { BookOpen, RefreshCw } from 'lucide-react';

export default function QbjectAuthenticExperience() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0.04);
  const [bookData, setBookData] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flipbookInstanceRef = useRef<Flipbook | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const initOriginalFlipbook = async () => {
      try {
        setError(null);
        setLoadingProgress(0.04);

        // 1. Fetch published book document from Backend API (with automatic local fallback)
        const { book, source, error: fetchErr } = await fetchPublishedBook('phuc-and-trang');
        if (destroyed) return;
        setBookData(book);
        setLoadingProgress(0.08);

        // 2. Ensure custom font 2.otf (SVN-Housttely Signature) is loaded
        await ensureCustomFontLoaded();
        if (destroyed) return;
        setLoadingProgress(0.12);

        // 3. Render front cover
        const coverFront = await PageTextureGenerator.createCoverTexture(
          book.cover.front.backgroundUrl,
          book
        );
        if (destroyed) return;
        setLoadingProgress(0.16);

        // 4. Render all inside pages dynamically from API book.pages via Generic Page Renderer
        const pageTextures: THREE.CanvasTexture[] = [];
        const totalPageCount = book.pages.length;

        for (let i = 0; i < totalPageCount; i++) {
          if (destroyed) return;
          const page = book.pages[i];
          const texture = await PageTextureGenerator.renderPageTexture(page, book);
          pageTextures.push(texture);

          // Advance loading progress smoothly across pages
          const p = 0.16 + ((i + 1) / totalPageCount) * 0.68;
          setLoadingProgress(parseFloat(p.toFixed(2)));
        }

        // 5. Render back cover (inside & outside)
        const coverBackInside = await PageTextureGenerator.createBackCoverTexture(
          book.cover.back.insideBackgroundUrl,
          true
        );
        const coverBackOutside = await PageTextureGenerator.createBackCoverTexture(
          book.cover.back.outsideBackgroundUrl,
          false
        );
        if (destroyed) return;
        setLoadingProgress(0.86);

        // 6. Convert textures to Data URLs for 3D Flipbook engine
        const allCanvases: HTMLCanvasElement[] = [
          coverFront.image as HTMLCanvasElement,
          ...pageTextures.map((t) => t.image as HTMLCanvasElement),
          coverBackInside.image as HTMLCanvasElement,
          coverBackOutside.image as HTMLCanvasElement,
        ];

        const pageUrls = allCanvases.map((canvas) => canvas.toDataURL('image/jpeg', 0.90));

        // 7. Dynamically derive 3D raycast pageActiveAreas from book.pages elements
        const pageActiveAreas: PageActiveArea[] = [];
        book.pages.forEach((page) => {
          const leafIndex = page.pageNumber === 0 ? 0 : Math.ceil(page.pageNumber / 2);
          const faceIndex = page.side === 'right' ? leafIndex * 2 : leafIndex * 2 + 1;

          page.elements.forEach((el) => {
            if (el.type === 'VIDEO' || el.interaction?.action === 'open-video') {
              const videoUrl = el.type === 'VIDEO' ? el.data.src : String(el.interaction?.target);
              const activeRect = el.interaction?.activeArea;
              pageActiveAreas.push({
                faceIndex,
                video: videoUrl,
                top: activeRect?.top ?? el.transform.y,
                left: activeRect?.left ?? el.transform.x,
                width: activeRect?.width ?? el.transform.width,
                height: activeRect?.height ?? el.transform.height,
                title: el.interaction?.title || (el.data as any).caption || 'Xem Video',
              });
            }
          });
        });

        // 8. Instantiate 100% Original Flipbook from Qbject
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

        // 9. Attach 3D atmospheric environment (18 butterflies, floating petals, fairy dust)
        if (book.settings.atmospheric.enabled) {
          const atmospheric = new AtmosphericSystem((flipbook as any).scene);
          flipbook.atmospheric = atmospheric;
        }

        setTotalPages(pageUrls.length / 2);

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
      flipbookInstanceRef.current?.destroy();
      flipbookInstanceRef.current = null;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => setShowLoading(false), 750);
    return () => window.clearTimeout(timeout);
  }, [isReady]);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-black">
      {/* Romantic Warm Loading Screen with floating book icon and glowing aura */}
      {showLoading && !error && (
        <div
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#1E1116] via-[#140B0E] to-[#0A0507] text-parchment-100 transition-opacity duration-700 ${
            isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Ambient Warm Glow Aura */}
          <div className="absolute w-[420px] h-[420px] rounded-full bg-gradient-to-r from-rosewood-400/20 via-pink-400/25 to-champagne-400/20 blur-3xl animate-pulse-glow pointer-events-none" />

          {/* Center Floating Icon & Title */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-pink-300/30 backdrop-blur-md flex items-center justify-center mb-6 shadow-xl animate-heart-float text-pink-200">
              <BookOpen className="w-9 h-9 stroke-[1.5]" />
            </div>

            <h2
              className="text-4xl sm:text-5xl text-[#FFF0F4] font-normal mb-8 tracking-wide drop-shadow-md"
              style={{ fontFamily: '"SVN-Housttely Signature", "Coldwell Bridges", cursive, serif' }}
            >
              Chúng Mình
            </h2>

            {/* Elegant Loading Progress Line */}
            <div className="w-48 sm:w-64 h-[2px] bg-white/10 rounded-full overflow-hidden relative mb-4">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#E295A8] via-[#FFE5B4] to-[#F0B6C3] transition-[width] duration-300 ease-out"
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

      {/* Romantic Music Player */}
      <VintageMusicPlayer
        autoPlayTrigger={currentPage > 0}
        audioTrack={bookData?.audio}
      />
    </div>
  );
}
