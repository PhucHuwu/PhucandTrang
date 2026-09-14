'use client';

import React, { useEffect, useRef, useState } from 'react';
import Flipbook from './qbject/flipbook';
import { PageTextureGenerator, PageMediaItem } from './PageTextureGenerator';
import VintageMusicPlayer from '@/components/VintageMusicPlayer';
import { getMediaUrl } from '@/data/mediaConfig';

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
      // 1. FRONT COVER
      const coverFront = PageTextureGenerator.createCoverTexture(
        'CHÚNG MÌNH',
        'Phúc & Trang',
        '20.10.2022'
      );
      const insideBlank = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 0,
        title: 'OUR STORY',
        quote: 'A story written one page at a time.',
        textLines: [
          'Mỗi bức ảnh, mỗi thước phim lưu lại nơi đây',
          'là từng viên gạch xây nên tình yêu của hai mình.',
        ],
        side: 'left',
      });

      // 2. CHAPTER I: LẦN ĐẦU GẶP GỠ (13.10 - 19.10.2022)
      // Layout: Dual Columns (Trang 1 có 2 ảnh cạnh nhau song song)
      const p1Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 1,
        chapter: 'Chapter I',
        title: 'Lần Đầu Gặp Gỡ',
        quote: 'Vạn vật như muốn hai mình bên nhau...',
        textLines: [
          'Ngày 13 và 14 tháng 10 năm 2022,',
          'khoảnh khắc đầu tiên mình và bạn chạm ánh mắt nhau,',
          'thế giới bỗng trở nên thật dịu dàng và ấm áp.',
        ],
        layout: 'dual-columns',
        media: [
          { src: getMediaUrl('First-meet-13-10-2022.jpg'), caption: '13.10.2022 • Cuộc gặp gỡ định mệnh' },
          { src: getMediaUrl('First-meet-14-10-2022.jpg'), caption: '14.10.2022 • Rung động đầu đời' },
        ],
        side: 'right',
      });

      // Layout: Single Hero (Trang 2 có 1 ảnh ngang lớn 19.10 cực đẹp)
      const p1Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 2,
        chapter: 'Chapter I',
        title: 'Ánh Nhìn Đầu Tiên',
        textLines: [
          'Đêm 19 tháng 10 năm 2022,',
          'những dòng tin nhắn và hồi hộp chờ đợi ngày mai.',
        ],
        layout: 'single-hero',
        media: [
          { src: getMediaUrl('First-ani-19-10-2022.jpg'), caption: '19.10.2022 • Đêm trước ngày chung đôi' },
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
          'và nụ cười gật đầu của bạn là món quà tuyệt vời nhất.',
        ],
        layout: 'dual-columns',
        media: [
          { src: getMediaUrl('23-12-2022.JPG'), caption: '23.12.2022 • Dạo phố mùa đông' },
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
          'Những góc phố lung linh ánh đèn Noel,',
          'tay trong tay xua đi cái lạnh giá.',
        ],
        layout: 'single-hero',
        media: [
          { src: getMediaUrl('25-12-2022_2.jpg'), caption: '25.12.2022 • Hơi ấm ngọt ngào' },
        ],
        side: 'left',
      });

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
          'Tròn 1 năm ngày nhận lời yêu và mùa đông ấm cúng.',
        ],
        layout: 'quad-gallery',
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
          'Gom góp từng khoảnh khắc bình dị cùng bạn.',
        ],
        layout: 'dual-columns',
        media: [
          { src: getMediaUrl('02-12-2023_3.jpg'), caption: '02.12.2023 • Bình yên bên bạn' },
          { src: getMediaUrl('26-06-2323_thumb.jpg'), caption: '26.06 • Video kỷ niệm', isVideo: true },
        ],
        side: 'right',
      });

      // Layout: Quad Gallery (Trang sinh nhật 25.05.2024 có video 16:9 & ảnh)
      const p4Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 8,
        chapter: 'Chapter IV',
        title: 'Sinh Nhật Bên Nhau 2024',
        quote: 'Tuổi mới ngập tràn niềm vui cùng bạn',
        textLines: [
          'Ngày 25 tháng 05 năm 2024,',
          'sinh nhật đặc biệt nhất khi luôn có bạn kề cạnh.',
        ],
        layout: 'quad-gallery',
        media: [
          { src: getMediaUrl('Brithdate-together-25-05-2024_2.jpg'), caption: '25.05.2024 • Thổi nến sinh nhật' },
          { src: getMediaUrl('Brithdate-together-25-05-2024_3.jpg'), caption: '25.05.2024 • Nụ cười ngọt ngào' },
          { src: getMediaUrl('Brithdate-together-25-05-2024_4.jpg'), caption: '25.05.2024 • Niềm vui trọn vẹn' },
          { src: getMediaUrl('Brithdate-together-25-05-2024_thumb.jpg'), caption: 'Video sinh nhật 25.05.2024', isVideo: true },
        ],
        side: 'left',
      });

      // 6. CHAPTER V: MÙA HÈ 2024 & CHUYẾN ĐI ĐẦU NĂM 2025 (02.01.2025)
      // Layout: Quad Gallery
      const p5Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 9,
        chapter: 'Chapter V',
        title: 'Mùa Hè 2024 & Đón Năm Mới 2025',
        textLines: [
          'Tháng 7.2024 rực rỡ và chuyến đi đầu năm 02.01.2025.',
        ],
        layout: 'quad-gallery',
        media: [
          { src: getMediaUrl('02-07-2024.jpg'), caption: '02.07.2024 • Nắng hè' },
          { src: getMediaUrl('02-01-2025.jpg'), caption: '02.01.2025 • Chuyến đi năm mới' },
          { src: getMediaUrl('02-01-2025_2.jpg'), caption: '02.01.2025 • Đồng hành cùng nhau' },
          { src: getMediaUrl('02-01-2025_3.jpg'), caption: '02.01.2025 • Nụ cười đầu xuân' },
        ],
        side: 'right',
      });

      // Layout: Quad Gallery
      const p5Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 10,
        chapter: 'Chapter V',
        title: 'Bộ Ảnh Ngày 02.01.2025',
        textLines: [
          'Từng góc máy lưu giữ trọn vẹn sự rạng rỡ của bạn.',
        ],
        layout: 'quad-gallery',
        media: [
          { src: getMediaUrl('02-01-2025_4.jpg'), caption: '02.01.2025 • Duyên dáng' },
          { src: getMediaUrl('02-01-2025_5.jpg'), caption: '02.01.2025 • Khoảnh khắc đáng nhớ' },
          { src: getMediaUrl('02-01-2025_6.jpg'), caption: '02.01.2025 • Ánh mắt trong veo' },
          { src: getMediaUrl('02-01-2025_7.jpg'), caption: '02.01.2025 • Dịu dàng' },
        ],
        side: 'left',
      });

      // 7. CHAPTER VI: CHUYẾN ĐI THÁNG 01.2025 (17.01.2025)
      // Layout: Quad Gallery
      const p6Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 11,
        chapter: 'Chapter VI',
        title: 'Chuyến Đi 17.01.2025',
        quote: 'Gom góp yêu thương trên từng chặng đường',
        textLines: [
          'Tháng 1 năm 2025 với những chuyến hành trình đáng nhớ nhất.',
        ],
        layout: 'quad-gallery',
        media: [
          { src: getMediaUrl('02-01-2025_8.jpg'), caption: '02.01.2025 • Nụ cười tỏa nắng' },
          { src: getMediaUrl('17-01-1025.jpg'), caption: '17.01.2025 • Từng bước chân qua' },
          { src: getMediaUrl('17-01-2025_2.jpg'), caption: '17.01.2025 • Chuyến đi ý nghĩa' },
          { src: getMediaUrl('17-01-2025_3.jpg'), caption: '17.01.2025 • Khoảnh khắc đẹp' },
        ],
        side: 'right',
      });

      // Layout: Quad Gallery (kèm Video 17.01.2025)
      const p6Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 12,
        chapter: 'Chapter VI',
        title: 'Kỷ Niệm 17.01.2025',
        textLines: [
          'Những bức hình và thước phim quý giá của hai đứa.',
        ],
        layout: 'quad-gallery',
        media: [
          { src: getMediaUrl('17-01-2025_4.jpg'), caption: '17.01.2025 • Đẹp trong trẻo' },
          { src: getMediaUrl('17-01-2025_5.jpg'), caption: '17.01.2025 • Nét hồn nhiên' },
          { src: getMediaUrl('17-01-2025_6.jpg'), caption: '17.01.2025 • Hạnh phúc giản đơn' },
          { src: getMediaUrl('17-01-2025_thumb.jpg'), caption: 'Video 17.01.2025', isVideo: true },
        ],
        side: 'left',
      });

      // 8. CHAPTER VII: MÙA THU & MÙA ĐÔNG 2025 (20.08 - 22.11.2025)
      // Layout: Quad Gallery
      const p7Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 13,
        chapter: 'Chapter VII',
        title: 'Mùa Thu Ngày 20.08.2025',
        textLines: [
          'Tháng 8 mùa thu đưa hai mình đến những trải nghiệm mới.',
        ],
        layout: 'quad-gallery',
        media: [
          { src: getMediaUrl('20-08-2025.jpg'), caption: '20.08.2025 • Nắng thu' },
          { src: getMediaUrl('20-08-2025_2.jpg'), caption: '20.08.2025 • Dịu mát' },
          { src: getMediaUrl('20-08-2025_3.jpg'), caption: '20.08.2025 • Bên bạn' },
          { src: getMediaUrl('20-08-2025_4.jpg'), caption: '20.08.2025 • Rạng ngời' },
        ],
        side: 'right',
      });

      // Layout: Scrapbook Trio (3 ảnh đan xen độc đáo)
      const p7Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 14,
        chapter: 'Chapter VII',
        title: 'Tháng 11 Ngày 22.11.2025',
        textLines: [
          'Những ngày cuối năm 2025 luôn đong đầy tình cảm.',
        ],
        layout: 'scrapbook-trio',
        media: [
          { src: getMediaUrl('22-11-2025.jpg'), caption: '22.11.2025 • Chớm đông' },
          { src: getMediaUrl('22-11-2025_2.jpg'), caption: '22.11.2025 • Ấm áp' },
          { src: getMediaUrl('22-11-2025_3.jpg'), caption: '22.11.2025 • Nắm tay nhau' },
        ],
        side: 'left',
      });

      // 9. CHAPTER VIII: NHỮNG CHUYẾN ĐI TƯƠNG LAI 2026
      // Layout: Dual Columns (2 ảnh dọc song song)
      const p8Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 15,
        chapter: 'Chapter VIII',
        title: 'Chuyến Đi Ngày 18.04',
        textLines: [
          'Những ngày tháng 4 đáng nhớ của tuổi trẻ.',
        ],
        layout: 'dual-columns',
        media: [
          { src: getMediaUrl('18-04-2016.jpg'), caption: '18.04 • Kỷ niệm' },
          { src: getMediaUrl('First-trip-14-03-2026.jpg'), caption: '14.03.2026 • First Trip' },
        ],
        side: 'right',
      });

      // Layout: Dual Stacked (2 ảnh ngang 16:9 của ngày 18.04.2026)
      const p8Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 16,
        chapter: 'Chapter VIII',
        title: 'Hẹn Ước Tương Lai',
        textLines: [
          'Những chuyến đi dài phía trước luôn có hai mình bên nhau.',
        ],
        layout: 'dual-stacked',
        media: [
          { src: getMediaUrl('18-04-2026.jpg'), caption: '18.04 • Ngày đẹp trời' },
          { src: getMediaUrl('18-04-2026_2.jpg'), caption: '18.04 • Hẹn ước mai sau' },
        ],
        side: 'left',
      });

      // 10. CHAPTER IX: MÙA THU 21.08 (LOẠT ẢNH NGANG 16:9)
      // Layout: Dual Stacked (2 ảnh ngang 16:9 ngày 21.08)
      const p9Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 17,
        chapter: 'Chapter IX',
        title: 'Mùa Thu Ngày 21.08',
        textLines: [
          'Loạt khoảnh khắc đẹp ngày 21 tháng 08.',
        ],
        layout: 'dual-stacked',
        media: [
          { src: getMediaUrl('21-08-2026.jpg'), caption: '21.08 • Nụ cười xinh' },
          { src: getMediaUrl('21-08-2026_2.jpg'), caption: '21.08 • Nhẹ nhàng' },
        ],
        side: 'right',
      });

      // Layout: Dual Stacked (2 ảnh ngang 16:9 tiếp theo)
      const p9Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 18,
        chapter: 'Chapter IX',
        title: 'Nắng Thu Ngọt Ngào',
        textLines: [
          'Từng khung hình rạng rỡ của bạn.',
        ],
        layout: 'dual-stacked',
        media: [
          { src: getMediaUrl('21-08-2026_3.jpg'), caption: '21.08 • Dễ thương' },
          { src: getMediaUrl('21-08-2026_4.jpg'), caption: '21.08 • Trong trẻo' },
        ],
        side: 'left',
      });

      // 11. CHAPTER X: NÀNG THƠ TRONG MẮT MÌNH (HER PORTRAITS)
      // Layout: Asymmetric Featured (1 ảnh ngang 16:9 + 2 ảnh dọc chân dung nàng thơ)
      const p10Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 19,
        chapter: 'Chapter X',
        title: 'Nàng Thơ Trong Mắt Mình',
        quote: 'Bạn luôn là điều dịu dàng nhất...',
        textLines: [
          'Dù ở bất kỳ góc chụp nào, nét duyên dáng của bạn',
          'luôn làm trái tim mình rung động như ngày đầu.',
        ],
        layout: 'asymmetric-featured',
        media: [
          { src: getMediaUrl('21-08-2026_5.jpg'), caption: '21.08 • Tỏa nắng' },
          { src: getMediaUrl('her-pic-1.jpg'), caption: 'Nụ cười tỏa nắng' },
          { src: getMediaUrl('her-pic-2.jpg'), caption: 'Nét trong trẻo' },
        ],
        side: 'right',
      });

      // Layout: Asymmetric Featured (1 ảnh vuông Polaroid đặc biệt her-pic-5 + 2 ảnh dọc)
      const p10Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 20,
        chapter: 'Chapter X',
        title: 'Những Bức Hình Đẹp Nhất',
        textLines: [
          'Lưu giữ từng nụ cười và ánh mắt biết nói.',
        ],
        layout: 'asymmetric-featured',
        media: [
          { src: getMediaUrl('her-pic-5.jpg'), caption: 'Xinh đẹp & Rạng rỡ' },
          { src: getMediaUrl('her-pic-3.jpg'), caption: 'Nét duyên dáng' },
          { src: getMediaUrl('her-pic-4.jpg'), caption: 'Đáng yêu' },
        ],
        side: 'left',
      });

      // 12. CHAPTER XI: CHÚNG MÌNH & HẸN ƯỚC MAI SAU
      // Layout: Dual Columns (2 ảnh chân dung: Phúc & Trang bên nhau)
      const p11Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 21,
        chapter: 'Chapter XI',
        title: 'Mãi Mãi Về Sau',
        quote: 'Hành trình này sẽ không có trang cuối...',
        textLines: [
          'Mỗi sớm mai thức dậy lại là một trang giấy mới,',
          'nơi tình yêu của hai mình vẫn lớn lên từng ngày.',
          'Yêu bạn đến tận cùng những năm tháng dịu dàng.',
        ],
        handwriting: '~ Yêu bạn trọn vẹn, Phúc ~',
        layout: 'dual-columns',
        media: [
          { src: getMediaUrl('me-1.jpg'), caption: 'Chàng trai của bạn' },
          { src: getMediaUrl('me-2.jpg'), caption: 'Phúc & Trang' },
        ],
        side: 'right',
      });

      // Layout: Single Hero (Trang kết bức thư tình khép lại cuốn sách)
      const p11Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 22,
        chapter: 'The End',
        title: 'Cảm Ơn Bạn Vì Đã Đến',
        quote: 'Hạnh phúc là hành trình, không phải đích đến.',
        textLines: [
          'Cảm ơn bạn vì đã cùng mình tạo nên cuốn nhật ký tuyệt vời này.',
          'Dù cuốn sách này có khép lại,',
          'chuyện tình của chúng mình sẽ luôn được viết tiếp mỗi ngày.',
        ],
        handwriting: 'Phúc & Trang • Forever & Always',
        side: 'left',
      });

      const coverBack = PageTextureGenerator.createBackCoverTexture();

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
        p11Front.image as HTMLCanvasElement,
        p11Back.image as HTMLCanvasElement,
        coverBack.image as HTMLCanvasElement,
        coverBack.image as HTMLCanvasElement,
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
          // p4Front (Page 7, Trang 7: right face of leaf 4 -> faceIndex = 4*2 = 8) -> 26-06-2323.mp4
          {
            faceIndex: 8,
            video: getMediaUrl('26-06-2323.mp4'),
            top: 0.1,
            left: 0.05,
            width: 0.9,
            height: 0.85,
            title: 'Xem Video Kỷ Niệm 26.06',
          },
          // p4Back (Page 8, Trang 8: left face of leaf 4 -> faceIndex = 4*2 + 1 = 9) -> Brithdate-together-25-05-2024.mp4
          {
            faceIndex: 9,
            video: getMediaUrl('Brithdate-together-25-05-2024.mp4'),
            top: 0.1,
            left: 0.05,
            width: 0.9,
            height: 0.85,
            title: 'Xem Video Sinh Nhật 25.05.2024',
          },
          // p6Back (Page 12, Trang 12: left face of leaf 6 -> faceIndex = 6*2 + 1 = 13) -> 17-01-2025.mp4
          {
            faceIndex: 13,
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
      setTotalPages(pageUrls.length / 2);
      setIsReady(true);

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
    </div>
  );
}
