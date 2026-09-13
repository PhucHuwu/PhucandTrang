'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { QbjectFlipbook } from './qbject/QbjectFlipbook';
import { PageTextureGenerator } from './PageTextureGenerator';
import { AtmosphericSystem } from './AtmosphericSystem';
import { ChevronLeft, ChevronRight, BookOpen, Volume2, VolumeX, Music, Heart, Sparkles } from 'lucide-react';
import VintageMusicPlayer from '@/components/VintageMusicPlayer';

export default function QbjectAuthenticExperience() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const flipbookRef = useRef<QbjectFlipbook | null>(null);
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera & Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      28,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.2, 7.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Warm Studio Lighting Setup from the-book-of-qbject
    const ambientLight = new THREE.AmbientLight(0xFFFAF2, 1.25);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xFFE8D0, 120);
    spotLight.position.set(4, 9, 8);
    spotLight.angle = 0.65;
    spotLight.penumbra = 0.6;
    spotLight.decay = 1.2;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    spotLight.shadow.bias = -0.0001;
    scene.add(spotLight);

    const fillLight = new THREE.DirectionalLight(0xE8BCC6, 0.7);
    fillLight.position.set(-6, 3, 4);
    scene.add(fillLight);

    // 3. Atmospheric System (Butterflies & Dust particles)
    const atmospheric = new AtmosphericSystem(scene);

    // 4. Qbject Flipbook Instance
    const flipbook = new QbjectFlipbook(scene);
    flipbookRef.current = flipbook;

    const loadBookPages = async () => {
      // Cover textures
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

      // Chapter I: The Beginning
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

      // Chapter II: Confession 20.10.2022
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

      // Chapter III: Cherished Moments
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

      // Chapter IV: Love Letter & Eternity
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

      const pages = [
        { frontTexture: coverFront, backTexture: insideBlank, isCover: true },
        { frontTexture: p1Front, backTexture: p1Back },
        { frontTexture: p2Front, backTexture: p2Back },
        { frontTexture: p3Front, backTexture: p3Back },
        { frontTexture: p4Front, backTexture: p4Back },
      ];

      flipbook.addPages(pages);
      setTotalPages(pages.length);
      setIsReady(true);
    };

    loadBookPages();

    // 5. Mouse Parallax
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 6. Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse interpolation
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.05;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.05;

      const mx = mousePos.current.x;
      const my = mousePos.current.y;

      // Gentle book tilt
      flipbook.group.rotation.x = my * 0.04;
      flipbook.group.rotation.y = mx * 0.06;

      // Update Flipbook physics & curve calculations
      flipbook.update(dt);
      atmospheric.update(elapsed, { x: mx, y: my });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      flipbook.destroy();
      atmospheric.destroy();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const turnToPage = (index: number) => {
    if (!flipbookRef.current) return;
    setCurrentPage(index);
    flipbookRef.current.setPageIndex(index);
  };

  // Wheel & Arrow keys
  useEffect(() => {
    let lastWheelTime = 0;
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastWheelTime < 450) return;
      if (e.deltaY > 25) {
        lastWheelTime = now;
        turnToPage(Math.min(totalPages, currentPage + 1));
      } else if (e.deltaY < -25) {
        lastWheelTime = now;
        turnToPage(Math.max(0, currentPage - 1));
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        turnToPage(Math.min(totalPages, currentPage + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        turnToPage(Math.max(0, currentPage - 1));
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKey);
    };
  }, [currentPage, totalPages]);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#110D0E]">
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={containerRef}
        onClick={() => {
          if (currentPage === 0) turnToPage(1);
        }}
        className="absolute inset-0 z-0 cursor-pointer"
        style={{
          background: 'radial-gradient(ellipse at center, #24161B 0%, #150D11 55%, #0A0608 100%)',
        }}
      />

      {/* Romantic Music Player */}
      <VintageMusicPlayer autoPlayTrigger={currentPage > 0} />

      {/* Loading Overlay */}
      {!isReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#110D0E] text-parchment-200 font-serif italic text-sm">
          Đang chuẩn bị cuốn nhật ký tình yêu...
        </div>
      )}

      {/* UI Controls Overlay */}
      {isReady && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between max-w-5xl w-full mx-auto pointer-events-auto">
            <div className="flex items-center gap-2 text-rosewood-400 font-serif text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 text-champagne-400" />
              <span>
                {currentPage === 0
                  ? 'Bìa Sách — Chạm hoặc cuộn chuột để mở'
                  : `Trang ${currentPage} / ${totalPages}`}
              </span>
            </div>

            {/* Quick Page Tab Ribbon */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => turnToPage(idx)}
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
              onClick={() => turnToPage(Math.max(0, currentPage - 1))}
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
              Cuộn chuột hoặc bấm mũi tên ← / → để lật trang
            </span>

            <button
              onClick={() => turnToPage(Math.min(totalPages, currentPage + 1))}
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
