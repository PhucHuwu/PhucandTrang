'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Flipbook from './qbject/flipbook';
import { PageTextureGenerator } from './PageTextureGenerator';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import VintageMusicPlayer from '@/components/VintageMusicPlayer';

export default function QbjectAuthenticExperience() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const flipbookInstanceRef = useRef<Flipbook | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const initOriginalFlipbook = async () => {
      // 1. Generate High-Res 764x1080 textures matching Qbject Book Aspect Ratio
      const coverFront = PageTextureGenerator.createCoverTexture(
        'CHÚNG MÌNH',
        'Phúc & Trang',
        '20.10.2022'
      );
      const insideBlank = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 0,
        title: 'OUR STORY',
        quote: 'A story written one page at a time.',
        side: 'left',
      });

      const p1Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 1,
        chapter: 'Chapter I',
        title: 'Lời Mở Đầu',
        quote: 'Vạn vật như muốn ta bên nhau...',
        textLines: [
          'Có những cuộc gặp gỡ trong đời ngỡ như tình cờ,',
          'nhưng hóa ra lại là định mệnh đẹp đẽ nhất.',
          'Cuốn nhật ký này được viết ra để gìn giữ',
          'từng khoảnh khắc thanh xuân của hai ta.',
        ],
        side: 'right',
      });

      const p1Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 2,
        chapter: 'Chapter I',
        title: 'Ánh Nhìn Đầu Tiên',
        imageSrc: '/img/1.JPEG',
        imageCaption: 'Nụ cười dịu dàng làm bừng sáng cả mùa thu',
        side: 'left',
      });

      const p2Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 3,
        chapter: 'Chapter II',
        title: 'Khoảnh Khắc Diệu Kỳ',
        quote: 'Thế cậu đồng ý làm bạn gái tớ không?',
        textLines: [
          'Câu nói ngập ngừng nhưng chứa trọn sự chân thành.',
          'Và cái gật đầu của em đã biến ngày 20.10.2022',
          'trở thành ngày hạnh phúc nhất cuộc đời tớ.',
        ],
        side: 'right',
      });

      const p2Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 4,
        chapter: 'Chapter II',
        title: 'Bàn Tay Nắm Lấy Bàn Tay',
        imageSrc: '/img/2.JPEG',
        imageCaption: 'Inseparable Souls • Kỷ niệm ngày nhận lời yêu',
        side: 'left',
      });

      const p3Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 5,
        chapter: 'Chapter III',
        title: 'Love In Our Eyes',
        imageSrc: '/img/3.JPEG',
        imageCaption: 'Nụ cười rạng rỡ của em là niềm vui mỗi ngày',
        side: 'right',
      });

      const p3Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 6,
        chapter: 'Chapter III',
        title: 'Hand In Hand',
        imageSrc: '/img/4.JPEG',
        imageCaption: 'Cùng nhau đi qua từng con phố thân quen',
        side: 'left',
      });

      const p4Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 7,
        chapter: 'Chapter IV',
        title: 'Loving You Forever',
        imageSrc: '/img/5.JPEG',
        imageCaption: 'Cảm ơn vì đã luôn ở bên và yêu thương tớ',
        side: 'right',
      });

      const p4Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 8,
        chapter: 'Epilogue',
        title: 'Mãi Mãi Về Sau',
        quote: 'Hành trình này sẽ không có trang cuối...',
        textLines: [
          'Mỗi sớm mai thức dậy lại là một trang giấy mới,',
          'nơi tình yêu đôi mình vẫn lớn lên từng ngày.',
          'Yêu em đến tận cùng những năm tháng dịu dàng.',
        ],
        handwriting: '~ Yêu em trọn vẹn, Phúc ~',
        side: 'left',
      });

      if (destroyed) return;

      // Convert CanvasTextures to data URLs for the original Flipbook engine
      const textureCanvases = [
        coverFront.image as HTMLCanvasElement,
        insideBlank.image as HTMLCanvasElement,
        p1Front.image as HTMLCanvasElement,
        p1Back.image as HTMLCanvasElement,
        p2Front.image as HTMLCanvasElement,
        p2Back.image as HTMLCanvasElement,
        p3Front.image as HTMLCanvasElement,
        p3Back.image as HTMLCanvasElement,
        p4Front.image as HTMLCanvasElement,
        p4Back.image as HTMLCanvasElement,
      ];

      const pageUrls = textureCanvases.map((canvas) => canvas.toDataURL('image/jpeg', 0.92));

      // 2. Instantiate 100% Original Flipbook from Qbject
      const flipbook = new Flipbook({
        containerEl: container,
        pageWidth: 764,
        pageHeight: 1080,
        pageThickness: 1,
        pageRootThickness: 5,
        coverThickness: 5,
        coverMarginX: 8,
        coverMarginY: 10,
        pageEdgeColor: 0xb1a283,
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
      setTotalPages(pageUrls.length / 2);
      setIsReady(true);

      // Listen to page changes
      const checkProgress = () => {
        if (!destroyed && flipbook) {
          const current = Math.round((flipbook as any).progress?.getValue?.() || 0);
          setCurrentPage(current);
          requestAnimationFrame(checkProgress);
        }
      };
      requestAnimationFrame(checkProgress);
    };

    initOriginalFlipbook();

    return () => {
      destroyed = true;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  const turnToPage = (index: number) => {
    if (!flipbookInstanceRef.current) return;
    const progress = (flipbookInstanceRef.current as any).progress;
    if (progress) {
      progress.unlock();
      progress.setMin(0);
      progress.setMax(totalPages);
      progress.setValue(index);
      setCurrentPage(index);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-black">
      {/* Container where the original Flipbook Canvas is injected */}
      <div
        ref={containerRef}
        id="flipbook-container"
        className="absolute inset-0 z-0"
      >
        <div className="intro-overlay" style={{ display: isReady ? 'none' : 'block' }}>
          <div className="centered-box">
            <div className="progress">
              <div className="progress-inner" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Romantic Music Player */}
      <VintageMusicPlayer autoPlayTrigger={currentPage > 0} />

      {/* HUD Navigation Overlay */}
      {isReady && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between max-w-5xl w-full mx-auto pointer-events-auto">
            <div className="flex items-center gap-2 text-rosewood-400 font-serif text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 text-champagne-400" />
              <span>
                {currentPage === 0
                  ? 'Bìa Sách — Kéo vuốt chuột để lật trang'
                  : `Trang ${currentPage} / ${totalPages}`}
              </span>
            </div>

            {/* Quick Page Tab Ribbon */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    turnToPage(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentPage === idx
                      ? 'bg-rosewood-500 scale-125'
                      : 'bg-parchment-300/40 hover:bg-rosewood-300'
                  }`}
                  title={idx === 0 ? 'Bìa sách' : `Trang ${idx}`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Flip Navigation Bar */}
          <div className="flex items-center justify-between max-w-5xl w-full mx-auto pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                turnToPage(Math.max(0, currentPage - 1));
              }}
              disabled={currentPage === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-full bg-parchment-100/80 backdrop-blur-sm font-serif text-xs sm:text-sm text-ink-800 shadow-md transition-all ${
                currentPage === 0
                  ? 'opacity-20 cursor-not-allowed'
                  : 'hover:bg-rosewood-100 hover:scale-105 active:scale-95'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Lật lùi</span>
            </button>

            <span className="text-[11px] font-serif italic text-stone-400 hidden sm:inline">
              Kéo chuột sang trái/phải trên sách để trải nghiệm lật trang nguyên bản của Qbject
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                turnToPage(Math.min(totalPages, currentPage + 1));
              }}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-1 px-4 py-2 rounded-full bg-rosewood-500 text-white font-serif text-xs sm:text-sm shadow-md transition-all ${
                currentPage === totalPages
                  ? 'opacity-20 cursor-not-allowed'
                  : 'hover:bg-rosewood-600 hover:scale-105 active:scale-95'
              }`}
            >
              <span>{currentPage === 0 ? 'Mở sách' : 'Lật tiếp'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
