'use client';

import React, { useEffect, useRef, useState } from 'react';
import Flipbook from './qbject/flipbook';
import { PageTextureGenerator } from './PageTextureGenerator';
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
        side: 'left',
      });

      // 2. CHAPTER I: LẦN ĐẦU GẶP GỠ (13.10.2022 - 19.10.2022)
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
        imageSrc: '/memories/First-meet-13-10-2022.jpg',
        imageCaption: '13.10.2022 • Cuộc gặp gỡ định mệnh',
        side: 'right',
      });

      const p1Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 2,
        chapter: 'Chapter I',
        title: 'Ánh Nhìn Đầu Tiên',
        textLines: [
          'Ngày 14.10.2022 và đêm trước ngày tỏ tình 19.10,',
          'từng khoảnh khắc trôi qua đều ngập tràn sự nhớ nhung.',
        ],
        imageSrc: '/memories/First-meet-14-10-2022.jpg',
        imageCaption: '14.10.2022 • Những rung động đầu tiên',
        secondaryImageSrc: '/memories/First-ani-19-10-2022.jpg',
        secondaryImageCaption: '19.10.2022 • Đêm trước ngày nhận lời',
        side: 'left',
      });

      // 3. CHAPTER II: LỜI TỎ TÌNH & MÙA GIÁNG SINH ĐẦU TIÊN (20.10 - 25.12.2022)
      const p2Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 3,
        chapter: 'Chapter II',
        title: 'Khoảnh Khắc 20.10.2022',
        quote: 'Thế bạn đồng ý làm bạn gái mình không?',
        textLines: [
          'Ngày 20 tháng 10 năm 2022,',
          'câu hỏi ngập ngừng chứa trọn sự chân thành của tuổi trẻ,',
          'và nụ cười gật đầu của bạn là món quà tuyệt vời nhất đời mình.',
        ],
        imageSrc: '/memories/23-12-2022.JPG',
        imageCaption: '23.12.2022 • Trước thềm Giáng Sinh',
        side: 'right',
      });

      const p2Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 4,
        chapter: 'Chapter II',
        title: 'Giáng Sinh Ấm Áp 2022',
        textLines: [
          'Giáng sinh đầu tiên cùng nhau dạo phố,',
          'cái lạnh mùa đông tan biến trước hơi ấm đôi bàn tay.',
        ],
        imageSrc: '/memories/25-12-2022.jpg',
        imageCaption: '25.12.2022 • Mùa đông an yên',
        secondaryImageSrc: '/memories/25-12-2022_2.jpg',
        secondaryImageCaption: 'Tay trong tay đón Giáng sinh',
        side: 'left',
      });

      // 4. CHAPTER III: NHỮNG KỶ NIỆM NĂM 2023 (05.03 - 02.12.2023)
      const p3Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 5,
        chapter: 'Chapter III',
        title: 'Những Mùa Thương Yêu 2023',
        quote: 'Bên nhau qua từng mùa hoa nở...',
        textLines: [
          'Tháng 3 dịu dàng, mùa hè tháng 7 rực rỡ nắng vàng,',
          'và ngày 25.10.2023 kỷ niệm tròn một năm chúng mình bên nhau.',
        ],
        imageSrc: '/memories/05-03-2023.jpg',
        imageCaption: '05.03.2023 • Những ngày mùa xuân',
        secondaryImageSrc: '/memories/08-07-2023.jpg',
        secondaryImageCaption: '08.07.2023 • Nắng hè rạng rỡ',
        side: 'right',
      });

      const p3Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 6,
        chapter: 'Chapter III',
        title: 'Mùa Đông Tháng 12.2023',
        textLines: [
          'Những góc phố tháng 12 lưu giữ nụ cười của hai đứa,',
          'bình yên bên nhau qua từng năm tháng.',
        ],
        imageSrc: '/memories/02-12-2023.jpg',
        imageCaption: '02.12.2023 • Kỷ niệm tháng 12',
        secondaryImageSrc: '/memories/02-12-2023_2.jpg',
        secondaryImageCaption: '02.12.2023 • Dạo phố cùng nhau',
        side: 'left',
      });

      // 5. CHAPTER IV: SINH NHẬT & NHỮNG CHUYẾN ĐI (2024)
      const p4Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 7,
        chapter: 'Chapter IV',
        title: 'Sinh Nhật Bên Nhau 2024',
        quote: 'Tuổi mới ngập tràn niềm vui cùng bạn',
        textLines: [
          'Ngày 25 tháng 05 năm 2024,',
          'sinh nhật đặc biệt nhất khi luôn có bạn kề cạnh,',
          'cùng thổi nến và sẻ chia những ước nguyện mai sau.',
        ],
        imageSrc: '/memories/Brithdate-together-25-05-2024_2.jpg',
        imageCaption: '25.05.2024 • Sinh nhật ngọt ngào',
        secondaryImageSrc: '/memories/Brithdate-together-25-05-2024_3.jpg',
        secondaryImageCaption: '25.05.2024 • Nụ cười hạnh phúc',
        side: 'right',
      });

      const p4Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 8,
        chapter: 'Chapter IV',
        title: 'Mùa Hè Tháng 07.2024',
        textLines: [
          'Những ngày tháng 7 đầy ắp kỷ niệm và tiếng cười,',
          'tình cảm của chúng mình ngày càng thêm gắn kết.',
        ],
        imageSrc: '/memories/Brithdate-together-25-05-2024_4.jpg',
        imageCaption: '25.05.2024 • Khoảnh khắc đáng nhớ',
        secondaryImageSrc: '/memories/02-07-2024.jpg',
        secondaryImageCaption: '02.07.2024 • Mùa hè yêu thương',
        side: 'left',
      });

      // 6. CHAPTER V: CHUYẾN DU XUÂN ĐẦU NĂM (02.01 - 17.01.2025)
      const p5Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 9,
        chapter: 'Chapter V',
        title: 'Chào Đón Năm Mới 2025',
        quote: 'Mở đầu một năm tràn đầy yêu thương',
        textLines: [
          'Ngày 02 tháng 01 năm 2025,',
          'chuyến đi khởi đầu năm mới với bao hy vọng,',
          'mình và bạn cùng nhau gom góp thêm thật nhiều bức ảnh đẹp.',
        ],
        imageSrc: '/memories/02-01-2025.jpg',
        imageCaption: '02.01.2025 • Du xuân năm mới',
        secondaryImageSrc: '/memories/02-01-2025_2.jpg',
        secondaryImageCaption: '02.01.2025 • Bên nhau bình yên',
        side: 'right',
      });

      const p5Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 10,
        chapter: 'Chapter V',
        title: 'Chuyến Đi Tháng 01.2025',
        textLines: [
          'Những góc chụp rạng rỡ ngày 02 và 17 tháng 01,',
          'từng cung đường đi qua đều in dấu chân của hai mình.',
        ],
        imageSrc: '/memories/02-01-2025_3.jpg',
        imageCaption: '02.01.2025 • Rạng rỡ nụ cười',
        secondaryImageSrc: '/memories/17-01-2025_2.jpg',
        secondaryImageCaption: '17.01.2025 • Chuyến đi đáng nhớ',
        side: 'left',
      });

      // 7. CHAPTER VI: NÀNG THƠ TRONG MẮT MÌNH (HER PORTRAITS)
      const p6Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 11,
        chapter: 'Chapter VI',
        title: 'Nàng Thơ Trong Mắt Mình',
        quote: 'Bạn luôn là điều dịu dàng nhất...',
        textLines: [
          'Dù ở bất kỳ góc chụp nào hay khoảnh khắc nào,',
          'nụ cười và nét duyên dáng của bạn',
          'luôn làm trái tim mình rung động như ngày đầu.',
        ],
        imageSrc: '/memories/her-pic-1.jpg',
        imageCaption: 'Nụ cười tỏa nắng của bạn',
        secondaryImageSrc: '/memories/her-pic-2.jpg',
        secondaryImageCaption: 'Nét dịu dàng trong trẻo',
        side: 'right',
      });

      const p6Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 12,
        chapter: 'Chapter VI',
        title: 'Những Bức Hình Đẹp Nhất',
        textLines: [
          'Lưu giữ từng nụ cười rạng rỡ và ánh mắt biết nói,',
          'người con gái mình luôn yêu thương và trân quý.',
        ],
        imageSrc: '/memories/her-pic-5.jpg',
        imageCaption: 'Xinh đẹp & Rạng rỡ',
        secondaryImageSrc: '/memories/20-08-2025_4.jpg',
        secondaryImageCaption: '20.08.2025 • Dịu dàng mùa thu',
        side: 'left',
      });

      // 8. CHAPTER VII: HÀNH TRÌNH TIẾP NỐI & HẸN ƯỚC
      const p7Front = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 13,
        chapter: 'Chapter VII',
        title: 'Những Chuyến Đi Tương Lai',
        quote: 'Cùng nhau đi khắp muôn nơi...',
        textLines: [
          'Tháng 11.2025, chuyến đi 2026 và những ngày tháng sau này,',
          'chúng mình vẫn sẽ luôn nắm chặt tay nhau như thế.',
        ],
        imageSrc: '/memories/22-11-2025.jpg',
        imageCaption: '22.11.2025 • Gắn kết bền chặt',
        secondaryImageSrc: '/memories/18-04-2026.jpg',
        secondaryImageCaption: '18.04.2026 • Hẹn ước tương lai',
        side: 'right',
      });

      const p7Back = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 14,
        chapter: 'Epilogue',
        title: 'Mãi Mãi Về Sau',
        quote: 'Hành trình này sẽ không có trang cuối...',
        textLines: [
          'Mỗi sớm mai thức dậy lại là một trang giấy mới,',
          'nơi tình yêu của hai mình vẫn lớn lên từng ngày.',
          'Yêu bạn đến tận cùng những năm tháng dịu dàng.',
        ],
        handwriting: '~ Yêu bạn trọn vẹn, Phúc ~',
        secondaryImageSrc: '/memories/First-trip-14-03-2026.jpg',
        secondaryImageCaption: '14.03.2026 • Bên nhau mãi mãi',
        side: 'left',
      });

      // 9. CHAPTER VIII: TRANG KẾT & BÌA SAU
      const p8Inside = await PageTextureGenerator.createInsidePageTexture({
        pageNumber: 15,
        chapter: 'The End',
        title: 'Cảm Ơn Bạn Vì Đã Đến',
        quote: 'Hạnh phúc là hành trình, không phải đích đến.',
        textLines: [
          'Cảm ơn bạn vì đã cùng mình tạo nên cuốn nhật ký tuyệt vời này.',
          'Dù cuốn sách này có khép lại,',
          'chuyện tình của chúng mình sẽ luôn được viết tiếp mỗi ngày.',
        ],
        handwriting: 'Phúc & Trang • Forever & Always',
        side: 'right',
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
        p8Inside.image as HTMLCanvasElement,
        coverBack.image as HTMLCanvasElement,
      ];

      const pageUrls = textureCanvases.map((canvas) => canvas.toDataURL('image/jpeg', 0.92));

      // 10. Instantiate 100% Original Flipbook from Qbject
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
