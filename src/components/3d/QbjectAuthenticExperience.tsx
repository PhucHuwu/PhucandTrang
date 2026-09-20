'use client';

import React, { useEffect, useRef, useState } from 'react';
import Flipbook from './qbject/flipbook';
import { PageTextureGenerator, PageMediaItem } from './PageTextureGenerator';
import { AtmosphericSystem } from './AtmosphericSystem';
import VintageMusicPlayer from '@/components/VintageMusicPlayer';
import { getMediaUrl } from '@/data/mediaConfig';
import { ensureCustomFontLoaded } from '@/data/fontLoader';
import { BookOpen } from 'lucide-react';

export default function QbjectAuthenticExperience() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0.04);
  const flipbookInstanceRef = useRef<Flipbook | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const initOriginalFlipbook = async () => {
      // Ensure custom font 2.otf is loaded before generating canvas textures
      await ensureCustomFontLoaded();
      setLoadingProgress(0.08);

      // 1. FRONT COVER WITH SUPPLIED first-cover.jpg & FONT 2.OTF
      const coverFront = await PageTextureGenerator.createCoverTexture(
        getMediaUrl('backgrounds/first-cover.jpg')
      );
      setLoadingProgress(0.12);
      const insideBlank = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 0,
        title: 'OUR STORY',
        quote: 'A story written one page at a time.',
        textLines: [
        ],
        backgroundSrc: getMediaUrl('backgrounds/page-0.jpg'),
        side: 'left',
      });
      setLoadingProgress(0.16);

      // 2. CHAPTER I: LẦN ĐẦU GẶP GỠ (13.10.2022)
      // Layout: Dual Columns (Trang 1 có 2 ảnh cạnh nhau song song ngày 13.10.2022)
      const p1Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 1,
        chapter: 'Chapter I',
        title: 'Lần Đầu Gặp Gỡ',
        quote: 'Vạn vật như muốn hai mình bên nhau...',
        textLines: [
          'Ngày 13 tháng 10 năm 2022,',
          'khoảnh khắc đầu tiên mình và bạn chạm ánh mắt nhau,',
          'thế giới bỗng trở nên thật dịu dàng và ấm áp.',
        ],
        layout: 'dual-columns',
        backgroundSrc: getMediaUrl('backgrounds/page-1.jpg'),
        media: [
          { src: getMediaUrl('First-meet-13-10-2022.jpg'), caption: '13.10.2022' },
          { src: getMediaUrl('First-meet-13-10-2022_2.jpg'), caption: '13.10.2022' },
        ],
        side: 'right',
      });

      // Layout: Single Hero (Trang 2 có ảnh ngang lớn ngày 13.10.2022 lưu giữ nụ cười)
      const p1Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 2,
        chapter: 'Chapter I',
        title: 'Ánh Nhìn Đầu Tiên',
        textLines: [
          'Cũng trong ngày 13 tháng 10 năm 2022 ấy,',
          'từng khoảnh khắc trôi qua đều ngập tràn niềm vui và sự xao xuyến.',
        ],
        layout: 'single-hero',
        backgroundSrc: getMediaUrl('backgrounds/page-2.jpg'),
        media: [
          { src: getMediaUrl('First-meet-13-10-2022_3.jpg'), caption: '13.10.2022 • Những ánh nhìn đầu tiên' },
        ],
        side: 'left',
      });

      // 3. CHAPTER II: LỜI TỎ TÌNH & MÙA GIÁNG SINH 2022
      // Layout: Dual Columns (Trang 3 có 2 ảnh dọc 3:4 đứng song song)
      const p2Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 3,
        chapter: 'Chapter II',
        title: 'Khoảnh Khắc 20.10.2022',
        quote: 'Thế cậu đồng ý làm bạn gái tớ không?',
        textLines: [
          'Ngày 20 tháng 10 năm 2022,',
        ],
        layout: 'dual-columns',
        backgroundSrc: getMediaUrl('backgrounds/page-3.jpg'),
        media: [
          { src: getMediaUrl('23-12-2022.jpg'), caption: '23.12.2022 • Dạo phố mùa đông' },
          { src: getMediaUrl('25-12-2022.jpg'), caption: '25.12.2022 • Giáng sinh đầu tiên' },
        ],
        side: 'right',
      });

      // Layout: Single Hero (Trang 4 chân dung Noel ấm áp)
      const p2Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 4,
        chapter: 'Chapter II',
        title: 'Giáng Sinh Ấm Áp',
        textLines: [
          'Đêm Noel lung linh ánh đèn đường.',
        ],
        layout: 'single-hero',
        backgroundSrc: getMediaUrl('backgrounds/page-4.jpg'),
        media: [
          { src: getMediaUrl('25-12-2022_2.jpg'), caption: '25.12.2022 • Merry Christmas' },
        ],
        side: 'left',
      });
      setLoadingProgress(0.28);

      // 4. CHAPTER III: MÙA XUÂN & MÙA HÈ 2023 (05.03 - 08.07.2023)
      // Layout: Diagonal Duo (2 ảnh nghiêng so le nghệ thuật)
      const p3Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 5,
        chapter: 'Chapter III',
        title: 'Mùa Xuân & Mùa Hè 2023',
        quote: 'Bên nhau qua từng mùa hoa nở...',
        textLines: [
          'Tháng 3 dịu mát và những ngày tháng 7 đầy nắng,',
          'hai mình cùng đi qua những cung đường mới.',
        ],
        layout: 'diagonal-duo',
        backgroundSrc: getMediaUrl('backgrounds/page-5.jpg'),
        media: [
          { src: getMediaUrl('05-03-2023.jpg'), caption: '05.03.2023 • Mùa xuân bên nhau' },
          { src: getMediaUrl('08-07-2023.jpg'), caption: '08.07.2023 • Mùa hè rạng rỡ' },
        ],
        side: 'right',
      });

      // Layout: Quad Gallery (Lưới 4 ảnh kỷ niệm 1 năm & tháng 12.2023)
      const p3Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 6,
        chapter: 'Chapter III',
        title: 'Kỷ Niệm 1 Năm & Mùa Đông 2023',
        textLines: [
          'Kỷ niệm 1 năm bên nhau.',
        ],
        layout: 'quad-gallery',
        backgroundSrc: getMediaUrl('backgrounds/page-6.jpg'),
        media: [
          { src: getMediaUrl('25-10-2023.jpg'), caption: '25.10.2023 • Tròn 1 năm yêu' },
          { src: getMediaUrl('25-10-2023_2.jpg'), caption: '25.10.2023 • Gắn kết bền lâu' },
          { src: getMediaUrl('02-12-2023.jpg'), caption: '02.12.2023 • Phố đông kỷ niệm' },
          { src: getMediaUrl('02-12-2023_2.jpg'), caption: '02.12.2023 • Nụ cười rạng rỡ' },
        ],
        side: 'left',
      });

      // 5. CHAPTER IV: THÁNG 12.2023 & NĂM 2024
      // Layout: Dual Columns (Trang 7 có 2 ảnh cạnh nhau song song)
      const p4Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 7,
        chapter: 'Chapter IV',
        title: 'Những Ngày Tháng 12.2023',
        textLines: [
        ],
        layout: 'dual-columns',
        backgroundSrc: getMediaUrl('backgrounds/page-7.jpg'),
        media: [
          { src: getMediaUrl('02-12-2023_3.jpg'), caption: '02.12.2023' },
          { src: getMediaUrl('26-06-2323_thumb.jpg'), caption: '26.06 • Video kỷ niệm', isVideo: true },
        ],
        side: 'right',
      });

      // Layout: Quad Gallery (Trang sinh nhật 25.05.2024 có video 16:9 & ảnh)
      const p4Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 8,
        chapter: 'Chapter IV',
        title: 'Sinh Nhật Bên Nhau 2024',
        quote: 'Tuổi mới ngập tràn niềm vui',
        textLines: [
          'Ngày 25 tháng 05 năm 2024,',
          'sinh nhật đặc biệt nhất khi luôn có bạn kề cạnh.',
        ],
        layout: 'quad-gallery',
        backgroundSrc: getMediaUrl('backgrounds/page-8.jpg'),
        media: [
          { src: getMediaUrl('Brithdate-together-25-05-2024_2.jpg'), caption: '25.05.2024' },
          { src: getMediaUrl('Brithdate-together-25-05-2024_3.jpg'), caption: '25.05.2024' },
          { src: getMediaUrl('Brithdate-together-25-05-2024_4.jpg'), caption: '25.05.2024' },
          { src: getMediaUrl('Brithdate-together-25-05-2024_thumb.jpg'), caption: '25.05.2024', isVideo: true },
        ],
        side: 'left',
      });
      setLoadingProgress(0.42);

      // 6. CHAPTER V: CHUYẾN DU XUÂN ĐẦU NĂM 2025 (02.01 & 17.01.2025)
      // Layout: Quad Gallery (Tuyển chọn 4 ảnh du xuân 02.01.2025 đẹp nhất, không trùng)
      const p5Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 9,
        chapter: 'Chapter V',
        title: 'Chào Đón Năm Mới 2025',
        quote: 'Mở đầu một năm tràn đầy yêu thương',
        textLines: [
          'Ngày 02 tháng 01 năm 2025,',
          'chuyến đi khởi đầu năm mới với bao hy vọng,',
          'hai mình cùng nhau lưu giữ những khoảnh khắc rạng rỡ.',
        ],
        layout: 'quad-gallery',
        backgroundSrc: getMediaUrl('backgrounds/page-9.jpg'),
        media: [
          { src: getMediaUrl('02-01-2025.jpg'), caption: '02.01.2025 • Du xuân năm mới' },
          { src: getMediaUrl('02-01-2025_2.jpg'), caption: '02.01.2025 • Đồng hành' },
          { src: getMediaUrl('02-01-2025_3.jpg'), caption: '02.01.2025 • Tươi tắn' },
          { src: getMediaUrl('02-01-2025_8.jpg'), caption: '02.01.2025 • Nụ cười rạng rỡ' },
        ],
        side: 'right',
      });

      // Gộp thẳng sang chuyến đi 17.01.2025 (Loại bỏ trang 10 bị trùng ảnh)
      // Layout: Quad Gallery
      const p5Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 10,
        chapter: 'Chapter V',
        title: 'Chuyến Đi 17.01.2025',
        textLines: [
          'Những góc chụp rạng rỡ và kỷ niệm ngày 17 tháng 01.',
        ],
        layout: 'quad-gallery',
        backgroundSrc: getMediaUrl('backgrounds/page-10.jpg'),
        media: [
          { src: getMediaUrl('17-01-1025.jpg'), caption: '17.01.2025 • Từng bước chân qua' },
          { src: getMediaUrl('17-01-2025_2.jpg'), caption: '17.01.2025 • Chuyến đi ý nghĩa' },
          { src: getMediaUrl('17-01-2025_3.jpg'), caption: '17.01.2025 • Khoảnh khắc đẹp' },
          { src: getMediaUrl('17-01-2025_4.jpg'), caption: '17.01.2025 • Trong trẻo' },
        ],
        side: 'left',
      });

      // 7. CHAPTER VI: KỶ NIỆM 17.01.2025 (ẢNH & VIDEO)
      // Layout: Dual Columns
      const p6Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 11,
        chapter: 'Chapter VI',
        title: 'Khoảnh Khắc Đáng Nhớ 17.01',
        quote: 'Hạnh phúc đọng lại nơi ánh mắt',
        textLines: [
          'Tháng 1 năm 2025 với những nụ cười hồn nhiên nhất.',
        ],
        layout: 'dual-columns',
        backgroundSrc: getMediaUrl('backgrounds/page-11.jpg'),
        media: [
          { src: getMediaUrl('17-01-2025_5.jpg'), caption: '17.01.2025 • Hồn nhiên' },
          { src: getMediaUrl('17-01-2025_thumb.jpg'), caption: 'Video 17.01.2025', isVideo: true },
        ],
        side: 'right',
      });

      // 8. CHAPTER VII: MÙA THU & MÙA ĐÔNG 2025 (20.08 - 22.11.2025)
      // Layout: Quad Gallery
      const p6Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 12,
        chapter: 'Chapter VII',
        title: 'Mùa Thu Ngày 20.08.2025',
        textLines: [
          'Tháng 8 mùa thu đưa hai mình đến những trải nghiệm mới.',
        ],
        layout: 'quad-gallery',
        backgroundSrc: getMediaUrl('backgrounds/page-12.jpg'),
        media: [
          { src: getMediaUrl('20-08-2025.jpg'), caption: '20.08.2025 • Nắng thu' },
          { src: getMediaUrl('20-08-2025_2.jpg'), caption: '20.08.2025 • Dịu mát' },
          { src: getMediaUrl('20-08-2025_3.jpg'), caption: '20.08.2025 • Bên bạn' },
          { src: getMediaUrl('20-08-2025_4.jpg'), caption: '20.08.2025 • Rạng ngời' },
        ],
        side: 'left',
      });
      setLoadingProgress(0.56);

      // Layout: Scrapbook Trio (3 ảnh đan xen độc đáo 22.11.2025)
      const p7Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 13,
        chapter: 'Chapter VII',
        title: 'Tháng 11 Ngày 22.11.2025',
        textLines: [
          'Những ngày cuối năm 2025 luôn đong đầy tình cảm.',
        ],
        layout: 'scrapbook-trio',
        backgroundSrc: getMediaUrl('backgrounds/page-13.jpg'),
        media: [
          { src: getMediaUrl('22-11-2025.jpg'), caption: '22.11.2025 • Chớm đông' },
          { src: getMediaUrl('22-11-2025_2.jpg'), caption: '22.11.2025 • Ấm áp' },
          { src: getMediaUrl('22-11-2025_3.jpg'), caption: '22.11.2025 • Nắm tay nhau' },
        ],
        side: 'right',
      });

      // 9. CHAPTER VIII: NHỮNG CHUYẾN ĐI TƯƠNG LAI 2026
      // Layout: Dual Columns
      const p7Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 14,
        chapter: 'Chapter VIII',
        title: 'Chuyến Đi Ngày 18.04',
        textLines: [
          'Những ngày tháng 4 đáng nhớ của tuổi trẻ.',
        ],
        layout: 'dual-columns',
        backgroundSrc: getMediaUrl('backgrounds/page-14.jpg'),
        media: [
          { src: getMediaUrl('18-04-2016.jpg'), caption: '18.04.2016 • Kỷ niệm' },
          { src: getMediaUrl('First-trip-14-03-2026.jpg'), caption: '14.03.2026 • First Trip' },
        ],
        side: 'left',
      });

      // Layout: Dual Stacked (2 ảnh ngang 16:9 của ngày 18.04.2026)
      const p8Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 15,
        chapter: 'Chapter VIII',
        title: 'Hẹn Ước Tương Lai',
        textLines: [
          'Những chuyến đi dài phía trước luôn có hai mình bên nhau.',
        ],
        layout: 'dual-stacked',
        backgroundSrc: getMediaUrl('backgrounds/page-15.jpg'),
        media: [
          { src: getMediaUrl('18-04-2026.jpg'), caption: '18.04.2026 • Ngày đẹp trời' },
          { src: getMediaUrl('18-04-2026_2.jpg'), caption: '18.04.2026 • Hẹn ước mai sau' },
        ],
        side: 'right',
      });

      // 10. CHAPTER IX: MÙA THU 21.08 (LOẠT ẢNH NGANG 16:9)
      // Layout: Dual Stacked
      const p8Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 16,
        chapter: 'Chapter IX',
        title: 'Mùa Thu Ngày 21.08',
        textLines: [
          'Loạt khoảnh khắc đẹp ngày 21 tháng 08.',
        ],
        layout: 'dual-stacked',
        backgroundSrc: getMediaUrl('backgrounds/page-16-17.jpg'),
        media: [
          { src: getMediaUrl('21-08-2026.jpg'), caption: '21.08.2026 • Nụ cười xinh' },
          { src: getMediaUrl('21-08-2026_2.jpg'), caption: '21.08.2026 • Nhẹ nhàng' },
        ],
        side: 'left',
      });
      setLoadingProgress(0.68);

      // Layout: Dual Stacked
      const p9Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 17,
        chapter: 'Chapter IX',
        title: 'Nắng Thu Ngọt Ngào',
        textLines: [
        ],
        layout: 'dual-stacked',
        backgroundSrc: getMediaUrl('backgrounds/page-16-17.jpg'),
        media: [
          { src: getMediaUrl('21-08-2026_3.jpg'), caption: '21.08.2026 • Dễ thương' },
          { src: getMediaUrl('21-08-2026_4.jpg'), caption: '21.08.2026 • Trong trẻo' },
        ],
        side: 'right',
      });

      // 11. CHAPTER X: NÀNG THƠ TRONG MẮT MÌNH (HER PORTRAITS)
      // Layout: Asymmetric Featured
      const p9Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 18,
        chapter: 'Chapter X',
        title: 'Nàng Thơ Trong Mắt Mình',
        quote: 'Bạn luôn là điều dịu dàng nhất...',
        textLines: [
          'Dù ở bất kỳ góc chụp nào, nét duyên dáng của bạn',
          'luôn làm trái tim mình rung động như ngày đầu.',
        ],
        layout: 'asymmetric-featured',
        backgroundSrc: getMediaUrl('backgrounds/page-18.jpg'),
        media: [
          { src: getMediaUrl('page18-her-pic-1.jpg'), caption: 'Nét dịu dàng của bạn' },
          { src: getMediaUrl('page18-her-pic-2.jpg'), caption: 'Một ngày thật đẹp' },
          { src: getMediaUrl('page18-her-pic-6.jpg'), caption: 'Nụ cười mình thương' },
        ],
        side: 'left',
      });

      // Layout: Asymmetric Featured
      const p10Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 19,
        chapter: 'Chapter X',
        title: 'Những Bức Hình Đẹp Nhất',
        textLines: [
          'Lưu giữ từng nụ cười và ánh mắt biết nói.',
        ],
        layout: 'asymmetric-featured',
        backgroundSrc: getMediaUrl('backgrounds/page-19.jpg'),
        media: [
          { src: getMediaUrl('page19-replacement.jpg'), caption: 'Xinh đẹp & Rạng rỡ' },
          { src: getMediaUrl('her-pic-3.jpg'), caption: 'Nét duyên dáng' },
          { src: getMediaUrl('her-pic-4.jpg'), caption: 'Đáng yêu' },
        ],
        side: 'right',
      });

      // 12. CHAPTER XI: CHÚNG MÌNH & HẸN ƯỚC MAI SAU
      // Layout: Dual Columns
      const p10Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 20,
        chapter: 'Chapter XI',
        title: 'Mãi Mãi Về Sau',
        quote: 'Hành trình này sẽ không có trang cuối...',
        textLines: [
          'Mỗi sớm mai thức dậy lại là một trang giấy mới,',
          'nơi tình yêu của hai mình vẫn lớn lên từng ngày.',
          'Yêu bạn đến tận cùng những năm tháng dịu dàng.',
        ],
        handwriting: 'Mình đây…',
        layout: 'dual-columns',
        backgroundSrc: getMediaUrl('backgrounds/page-20.jpg'),
        media: [
          { src: getMediaUrl('me-1.jpg'), caption: 'Chàng trai của bạn' },
          { src: getMediaUrl('me-2.jpg'), caption: 'Phúc & Trang' },
        ],
        side: 'left',
      });
      setLoadingProgress(0.78);

      // Back cover inside & outside use the supplied last-cover.jpg collage.
      const coverBackInside = await PageTextureGenerator.createBackCoverTexture(
        getMediaUrl('backgrounds/last-cover.jpg'),
        true
      );
      const coverBackOutside = await PageTextureGenerator.createBackCoverTexture(
        getMediaUrl('backgrounds/last-cover.jpg'),
        false
      );
      setLoadingProgress(0.84);

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
        p5Front.image as HTMLCanvasElement,
        p5Back.image as HTMLCanvasElement,
        p6Front.image as HTMLCanvasElement,
        p6Back.image as HTMLCanvasElement,
        p7Front.image as HTMLCanvasElement,
        p7Back.image as HTMLCanvasElement,
        p8Front.image as HTMLCanvasElement,
        p8Back.image as HTMLCanvasElement,
        p9Front.image as HTMLCanvasElement,
        p9Back.image as HTMLCanvasElement,
        p10Front.image as HTMLCanvasElement,
        p10Back.image as HTMLCanvasElement,
        coverBackInside.image as HTMLCanvasElement,
        coverBackOutside.image as HTMLCanvasElement,
      ];

      const pageUrls = textureCanvases.map((canvas) => canvas.toDataURL('image/jpeg', 0.90));

      // 12. Instantiate 100% Original Flipbook from Qbject
      const flipbook = new Flipbook({
        containerEl: container,
        pageWidth: 764,
        pageHeight: 1080,
        pageThickness: 1,
        pageRootThickness: 4,
        coverThickness: 5,
        coverMarginX: 8,
        coverMarginY: 10,
        pageEdgeColor: 0xb1a283,
        pageActiveAreas: [
          // p4Front (Page 7: right face of leaf 4 -> faceIndex = 4*2 = 8) -> 26-06-2323.mp4
          {
            faceIndex: 8,
            video: getMediaUrl('26-06-2323.mp4'),
            top: 0.1,
            left: 0.05,
            width: 0.9,
            height: 0.85,
            title: 'Xem Video Kỷ Niệm 26.06',
          },
          // p4Back (Page 8: left face of leaf 4 -> faceIndex = 4*2 + 1 = 9) -> Brithdate-together-25-05-2024.mp4
          {
            faceIndex: 9,
            video: getMediaUrl('Brithdate-together-25-05-2024.mp4'),
            top: 0.1,
            left: 0.05,
            width: 0.9,
            height: 0.85,
            title: 'Xem Video Sinh Nhật 25.05.2024',
          },
          // p6Front (Page 11: right face of leaf 6 -> faceIndex = 6*2 = 12) -> 17-01-2025.mp4
          {
            faceIndex: 12,
            video: getMediaUrl('17-01-2025.mp4'),
            top: 0.1,
            left: 0.05,
            width: 0.9,
            height: 0.85,
            title: 'Xem Video Chuyến Đi 17.01.2025',
          },
        ],
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
      setLoadingProgress(0.88);

      // Attach 3D atmospheric effects (18 butterflies, floating petals, glowing hearts, fairy dust) directly into Flipbook's 3D Scene
      const atmospheric = new AtmosphericSystem((flipbook as any).scene);
      flipbook.atmospheric = atmospheric;

      setTotalPages(pageUrls.length / 2);

      let lastPage = -1;
      let readyReported = false;
      const checkProgress = () => {
        if (!destroyed && flipbook) {
          const progress = Math.max(0.88, Math.min(1, flipbook.loadingProgress));
          setLoadingProgress(previous => Math.abs(previous - progress) > 0.005 ? progress : previous);
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
      {/* Romantic Warm Loading Screen with floating heart and fairy glow */}
      {showLoading && (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#1E1116] via-[#140B0E] to-[#0A0507] text-parchment-100 transition-opacity duration-700 ${isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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

      {/* Container where the original Flipbook Canvas is injected */}
      <div
        ref={containerRef}
        id="flipbook-container"
        className="absolute inset-0 z-0"
      />

      {/* Romantic Music Player */}
      <VintageMusicPlayer autoPlayTrigger={currentPage > 0} />
    </div>
  );
}
