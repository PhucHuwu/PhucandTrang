import { Book, Page, LayoutTemplate, PageMediaItem } from '@/types/book';
import { applyLayoutTemplate } from '@/templates/layoutPresets';
import { getMediaUrl } from '@/data/mediaConfig';

/**
 * Creates a normalized Page data entity using the Layout Template Preset System.
 */
function createBookPage(params: {
  pageNumber: number;
  side: 'left' | 'right';
  chapter?: string;
  title?: string;
  quote?: string;
  textLines?: string[];
  handwriting?: string;
  layout?: LayoutTemplate;
  backgroundUrl?: string;
  media?: PageMediaItem[];
}): Page {
  const layout = params.layout || 'auto';
  return applyLayoutTemplate(
    {
      pageNumber: params.pageNumber,
      side: params.side,
      chapter: params.chapter,
      title: params.title,
      quote: params.quote,
      textLines: params.textLines,
      handwriting: params.handwriting,
      layout,
      background: {
        type: params.backgroundUrl ? 'image' : 'color',
        imageUrl: params.backgroundUrl,
        color: '#F9F5EC',
        headerFade: {
          enabled: true,
          color: '#F9F5EC',
          height: 0.345,
          startOpacity: 0.92,
          endOpacity: 0,
        },
        gutterFade: {
          enabled: true,
          color: '#F9F5EC',
          width: 0.14,
          opacity: 0.28,
        },
      },
    },
    layout,
    {
      title: params.title,
      subtitle: params.chapter,
      chapter: params.chapter,
      quote: params.quote,
      textLines: params.textLines,
      handwriting: params.handwriting,
      media: params.media,
    }
  );
}

/**
 * The Master Content-Driven Book Data for Phúc & Trang's Love Journey.
 * Centralizes all story chapters, copy, media CDN URLs, and layouts into a single schema.
 */
export const PHUC_AND_TRANG_BOOK: Book = {
  id: 'phuc-and-trang-love-journey',
  title: 'Chúng Mình',
  slug: 'chung-minh',
  description: 'Cuốn nhật ký tình yêu của hai mình từ ngày 20 tháng 10 năm 2022.',
  version: '2.0.0',
  couple: {
    he: 'Phúc',
    she: 'Trang',
    anniversaryDate: '2022-10-20T00:00:00',
    proposalQuote: 'Thế cậu đồng ý làm bạn gái tớ không?',
  },
  cover: {
    front: {
      backgroundUrl: getMediaUrl('backgrounds/first-cover.jpg'),
      title: 'Chúng Mình',
      titleFont: 'SVN-Housttely Signature',
      counterBadge: {
        enabled: true,
        startDate: '2022-10-20',
        subtitle: 'Bên nhau từ ngày 20.10.2022',
      },
    },
    back: {
      insideBackgroundUrl: getMediaUrl('backgrounds/last-cover.jpg'),
      outsideBackgroundUrl: getMediaUrl('backgrounds/last-cover.jpg'),
    },
  },
  backgroundMusicId: 'track-van-vat',
  audio: {
    id: 'track-van-vat',
    title: 'Vạn vật như muốn ta bên nhau',
    artist: 'Hoàng Dũng',
    src: '/music/van-vat-nhu-muon-ta-ben-nhau.mp3',
    autoPlay: true,
    loop: true,
    volume: 0.8,
    startAt: 0.0,
    fadeIn: 2.0,
    fadeOut: 2.0,
  },
  settings: {
    dimensions: {
      pageWidth: 764,
      pageHeight: 1080,
      aspectRatio: 764 / 1080,
      canvasResolution: {
        width: 1024,
        height: 1360,
      },
      pageThickness: 1,
      coverThickness: 5,
      pageRootThickness: 4,
      coverMarginX: 8,
      coverMarginY: 10,
    },
    camera: {
      fov: 14,
      distance: 5200,
      near: 1200,
      far: 9000,
    },
    theme: {
      edgeColor: 0xb1a283,
      paperColor: '#F9F5EC',
      textColor: '#292522',
      accentColor: '#94384F',
      subtleColor: '#C99A9A',
      champagneGold: '#FFE5B4',
      deskColor: 0x1F1218,
    },
    typography: {
      titleFont: 'SVN-Housttely Signature',
      bodyFont: 'Cormorant Garamond',
      handwritingFont: 'Dancing Script',
      sansFont: 'Montserrat',
    },
    atmospheric: {
      enabled: true,
      butterflyCount: 12,
      petalCount: 34,
      dustCount: 90,
    },
  },
  pages: [
    // Page 0: Lời ngỏ bên trong bìa trước
    createBookPage({
      pageNumber: 0,
      side: 'left',
      title: 'OUR STORY',
      quote: 'A story written one page at a time.',
      textLines: [],
      backgroundUrl: getMediaUrl('backgrounds/page-0.jpg'),
      layout: 'auto',
      media: [],
    }),

    // Page 1: Chapter I - Lần Đầu Gặp Gỡ
    createBookPage({
      pageNumber: 1,
      side: 'right',
      chapter: 'Chapter I',
      title: 'Lần Đầu Gặp Gỡ',
      quote: 'Vạn vật như muốn hai mình bên nhau...',
      textLines: [
        'Ngày 13 và 14 tháng 10 năm 2022,',
        'khoảnh khắc đầu tiên mình và bạn chạm ánh mắt nhau,',
        'thế giới bỗng trở nên thật dịu dàng và ấm áp.',
      ],
      layout: 'dual-columns',
      backgroundUrl: getMediaUrl('backgrounds/page-1.jpg'),
      media: [
        { src: getMediaUrl('First-meet-13-10-2022.jpg'), caption: '13.10.2022' },
        { src: getMediaUrl('First-meet-13-10-2022_2.jpg'), caption: '13.10.2022' },
      ],
    }),

    // Page 2: Chapter I - Ánh Nhìn Đầu Tiên
    createBookPage({
      pageNumber: 2,
      side: 'left',
      chapter: 'Chapter I',
      title: 'Ánh Nhìn Đầu Tiên',
      textLines: [
        'Cũng trong ngày 13 tháng 10 năm 2022 ấy,',
        'từng khoảnh khắc trôi qua đều ngập tràn niềm vui và sự xao xuyến.',
      ],
      layout: 'single-hero',
      backgroundUrl: getMediaUrl('backgrounds/page-2.jpg'),
      media: [
        { src: getMediaUrl('First-meet-13-10-2022_3.jpg'), caption: '13.10.2022 • Những ánh nhìn đầu tiên' },
      ],
    }),

    // Page 3: Chapter II - Khoảnh Khắc 20.10.2022
    createBookPage({
      pageNumber: 3,
      side: 'right',
      chapter: 'Chapter II',
      title: 'Khoảnh Khắc 20.10.2022',
      quote: 'Thế cậu đồng ý làm bạn gái tớ không?',
      textLines: ['Ngày 20 tháng 10 năm 2022,'],
      layout: 'dual-columns',
      backgroundUrl: getMediaUrl('backgrounds/page-3.jpg'),
      media: [
        { src: getMediaUrl('23-12-2022.jpg'), caption: '23.12.2022 • Dạo phố mùa đông' },
        { src: getMediaUrl('25-12-2022.jpg'), caption: '25.12.2022 • Giáng sinh đầu tiên' },
      ],
    }),

    // Page 4: Chapter II - Giáng Sinh Ấm Áp
    createBookPage({
      pageNumber: 4,
      side: 'left',
      chapter: 'Chapter II',
      title: 'Giáng Sinh Ấm Áp',
      textLines: ['Đêm Noel lung linh ánh đèn đường.'],
      layout: 'single-hero',
      backgroundUrl: getMediaUrl('backgrounds/page-4.jpg'),
      media: [
        { src: getMediaUrl('25-12-2022_2.jpg'), caption: '25.12.2022 • Merry Christmas' },
      ],
    }),

    // Page 5: Chapter III - Những Mùa Thương Yêu 2023
    createBookPage({
      pageNumber: 5,
      side: 'right',
      chapter: 'Chapter III',
      title: 'Những Mùa Thương Yêu 2023',
      quote: 'Bên nhau qua từng mùa hoa nở...',
      textLines: [
        'Tháng 3 dịu mát và những ngày tháng 7 đầy nắng,',
        'hai mình cùng đi qua những cung đường mới.',
      ],
      layout: 'diagonal-duo',
      backgroundUrl: getMediaUrl('backgrounds/page-5.jpg'),
      media: [
        { src: getMediaUrl('05-03-2023.jpg'), caption: '05.03.2023 • Mùa xuân bên nhau' },
        { src: getMediaUrl('08-07-2023.jpg'), caption: '08.07.2023 • Mùa hè rạng rỡ' },
      ],
    }),

    // Page 6: Chapter III - Kỷ Niệm 1 Năm & Mùa Đông 2023
    createBookPage({
      pageNumber: 6,
      side: 'left',
      chapter: 'Chapter III',
      title: 'Kỷ Niệm 1 Năm & Mùa Đông 2023',
      textLines: ['Kỷ niệm 1 năm bên nhau.'],
      layout: 'quad-gallery',
      backgroundUrl: getMediaUrl('backgrounds/page-6.jpg'),
      media: [
        { src: getMediaUrl('25-10-2023.jpg'), caption: '25.10.2023 • Tròn 1 năm yêu' },
        { src: getMediaUrl('25-10-2023_2.jpg'), caption: '25.10.2023 • Gắn kết bền lâu' },
        { src: getMediaUrl('02-12-2023.jpg'), caption: '02.12.2023 • Phố đông kỷ niệm' },
        { src: getMediaUrl('02-12-2023_2.jpg'), caption: '02.12.2023 • Nụ cười rạng rỡ' },
      ],
    }),

    // Page 7: Chapter IV - Những Ngày Tháng 12.2023 (Video 26.06)
    createBookPage({
      pageNumber: 7,
      side: 'right',
      chapter: 'Chapter IV',
      title: 'Những Ngày Tháng 12.2023',
      textLines: [],
      layout: 'dual-columns',
      backgroundUrl: getMediaUrl('backgrounds/page-7.jpg'),
      media: [
        { src: getMediaUrl('02-12-2023_3.jpg'), caption: '02.12.2023' },
        {
          src: getMediaUrl('26-06-2323.mp4'),
          thumbnailUrl: getMediaUrl('26-06-2323_thumb.jpg'),
          caption: '26.06 • Video kỷ niệm',
          isVideo: true,
        },
      ],
    }),

    // Page 8: Chapter IV - Sinh Nhật Bên Nhau 2024 (Video 25.05.2024)
    createBookPage({
      pageNumber: 8,
      side: 'left',
      chapter: 'Chapter IV',
      title: 'Sinh Nhật Bên Nhau 2024',
      quote: 'Tuổi mới ngập tràn niềm vui',
      textLines: [
        'Ngày 25 tháng 05 năm 2024,',
        'sinh nhật đặc biệt nhất khi luôn có bạn kề cạnh.',
      ],
      layout: 'quad-gallery',
      backgroundUrl: getMediaUrl('backgrounds/page-8.jpg'),
      media: [
        { src: getMediaUrl('Brithdate-together-25-05-2024_2.jpg'), caption: '25.05.2024' },
        { src: getMediaUrl('Brithdate-together-25-05-2024_3.jpg'), caption: '25.05.2024' },
        { src: getMediaUrl('Brithdate-together-25-05-2024_4.jpg'), caption: '25.05.2024' },
        {
          src: getMediaUrl('Brithdate-together-25-05-2024.mp4'),
          thumbnailUrl: getMediaUrl('Brithdate-together-25-05-2024_thumb.jpg'),
          caption: '25.05.2024',
          isVideo: true,
        },
      ],
    }),

    // Page 9: Chapter V - Chào Đón Năm Mới 2025
    createBookPage({
      pageNumber: 9,
      side: 'right',
      chapter: 'Chapter V',
      title: 'Chào Đón Năm Mới 2025',
      quote: 'Mở đầu một năm tràn đầy yêu thương',
      textLines: [
        'Ngày 02 tháng 01 năm 2025,',
        'chuyến đi khởi đầu năm mới với bao hy vọng,',
        'hai mình cùng nhau lưu giữ những khoảnh khắc rạng rỡ.',
      ],
      layout: 'quad-gallery',
      backgroundUrl: getMediaUrl('backgrounds/page-9.jpg'),
      media: [
        { src: getMediaUrl('02-01-2025.jpg'), caption: '02.01.2025 • Du xuân năm mới' },
        { src: getMediaUrl('02-01-2025_2.jpg'), caption: '02.01.2025 • Đồng hành' },
        { src: getMediaUrl('02-01-2025_3.jpg'), caption: '02.01.2025 • Tươi tắn' },
        { src: getMediaUrl('02-01-2025_8.jpg'), caption: '02.01.2025 • Nụ cười rạng rỡ' },
      ],
    }),

    // Page 10: Chapter V - Chuyến Đi 17.01.2025
    createBookPage({
      pageNumber: 10,
      side: 'left',
      chapter: 'Chapter V',
      title: 'Chuyến Đi 17.01.2025',
      textLines: ['Những góc chụp rạng rỡ và kỷ niệm ngày 17 tháng 01.'],
      layout: 'quad-gallery',
      backgroundUrl: getMediaUrl('backgrounds/page-10.jpg'),
      media: [
        { src: getMediaUrl('17-01-1025.jpg'), caption: '17.01.2025 • Từng bước chân qua' },
        { src: getMediaUrl('17-01-2025_2.jpg'), caption: '17.01.2025 • Chuyến đi ý nghĩa' },
        { src: getMediaUrl('17-01-2025_3.jpg'), caption: '17.01.2025 • Khoảnh khắc đẹp' },
        { src: getMediaUrl('17-01-2025_4.jpg'), caption: '17.01.2025 • Trong trẻo' },
      ],
    }),

    // Page 11: Chapter VI - Khoảnh Khắc Đáng Nhớ 17.01 (Video 17.01.2025)
    createBookPage({
      pageNumber: 11,
      side: 'right',
      chapter: 'Chapter VI',
      title: 'Khoảnh Khắc Đáng Nhớ 17.01',
      quote: 'Hạnh phúc đọng lại nơi ánh mắt',
      textLines: ['Tháng 1 năm 2025 với những nụ cười hồn nhiên nhất.'],
      layout: 'dual-columns',
      backgroundUrl: getMediaUrl('backgrounds/page-11.jpg'),
      media: [
        { src: getMediaUrl('17-01-2025_5.jpg'), caption: '17.01.2025 • Hồn nhiên' },
        {
          src: getMediaUrl('17-01-2025.mp4'),
          thumbnailUrl: getMediaUrl('17-01-2025_thumb.jpg'),
          caption: 'Video 17.01.2025',
          isVideo: true,
        },
      ],
    }),

    // Page 12: Chapter VII - Mùa Thu Ngày 20.08.2025
    createBookPage({
      pageNumber: 12,
      side: 'left',
      chapter: 'Chapter VII',
      title: 'Mùa Thu Ngày 20.08.2025',
      textLines: ['Tháng 8 mùa thu đưa hai mình đến những trải nghiệm mới.'],
      layout: 'quad-gallery',
      backgroundUrl: getMediaUrl('backgrounds/page-12.jpg'),
      media: [
        { src: getMediaUrl('20-08-2025.jpg'), caption: '20.08.2025 • Nắng thu' },
        { src: getMediaUrl('20-08-2025_2.jpg'), caption: '20.08.2025 • Dịu mát' },
        { src: getMediaUrl('20-08-2025_3.jpg'), caption: '20.08.2025 • Bên bạn' },
        { src: getMediaUrl('20-08-2025_4.jpg'), caption: '20.08.2025 • Rạng ngời' },
      ],
    }),

    // Page 13: Chapter VII - Tháng 11 Ngày 22.11.2025
    createBookPage({
      pageNumber: 13,
      side: 'right',
      chapter: 'Chapter VII',
      title: 'Tháng 11 Ngày 22.11.2025',
      textLines: ['Những ngày cuối năm 2025 luôn đong đầy tình cảm.'],
      layout: 'scrapbook-trio',
      backgroundUrl: getMediaUrl('backgrounds/page-13.jpg'),
      media: [
        { src: getMediaUrl('22-11-2025.jpg'), caption: '22.11.2025 • Chớm đông' },
        { src: getMediaUrl('22-11-2025_2.jpg'), caption: '22.11.2025 • Ấm áp' },
        { src: getMediaUrl('22-11-2025_3.jpg'), caption: '22.11.2025 • Nắm tay nhau' },
      ],
    }),

    // Page 14: Chapter VIII - Chuyến Đi Ngày 18.04
    createBookPage({
      pageNumber: 14,
      side: 'left',
      chapter: 'Chapter VIII',
      title: 'Chuyến Đi Ngày 18.04',
      textLines: ['Những ngày tháng 4 đáng nhớ của tuổi trẻ.'],
      layout: 'dual-columns',
      backgroundUrl: getMediaUrl('backgrounds/page-14.jpg'),
      media: [
        { src: getMediaUrl('18-04-2016.jpg'), caption: '18.04.2016 • Kỷ niệm' },
        { src: getMediaUrl('First-trip-14-03-2026.jpg'), caption: '14.03.2026 • First Trip' },
      ],
    }),

    // Page 15: Chapter VIII - Hẹn Ước Tương Lai
    createBookPage({
      pageNumber: 15,
      side: 'right',
      chapter: 'Chapter VIII',
      title: 'Hẹn Ước Tương Lai',
      textLines: ['Những chuyến đi dài phía trước luôn có hai mình bên nhau.'],
      layout: 'dual-stacked',
      backgroundUrl: getMediaUrl('backgrounds/page-15.jpg'),
      media: [
        { src: getMediaUrl('18-04-2026.jpg'), caption: '18.04.2026 • Ngày đẹp trời' },
        { src: getMediaUrl('18-04-2026_2.jpg'), caption: '18.04.2026 • Hẹn ước mai sau' },
      ],
    }),

    // Page 16: Chapter IX - Mùa Thu Ngày 21.08
    createBookPage({
      pageNumber: 16,
      side: 'left',
      chapter: 'Chapter IX',
      title: 'Mùa Thu Ngày 21.08',
      textLines: ['Loạt khoảnh khắc đẹp ngày 21 tháng 08.'],
      layout: 'dual-stacked',
      backgroundUrl: getMediaUrl('backgrounds/page-16-17.jpg'),
      media: [
        { src: getMediaUrl('21-08-2026.jpg'), caption: '21.08.2026 • Nụ cười xinh' },
        { src: getMediaUrl('21-08-2026_2.jpg'), caption: '21.08.2026 • Nhẹ nhàng' },
      ],
    }),

    // Page 17: Chapter IX - Nắng Thu Ngọt Ngào
    createBookPage({
      pageNumber: 17,
      side: 'right',
      chapter: 'Chapter IX',
      title: 'Nắng Thu Ngọt Ngào',
      textLines: [],
      layout: 'dual-stacked',
      backgroundUrl: getMediaUrl('backgrounds/page-16-17.jpg'),
      media: [
        { src: getMediaUrl('21-08-2026_3.jpg'), caption: '21.08.2026 • Dễ thương' },
        { src: getMediaUrl('21-08-2026_4.jpg'), caption: '21.08.2026 • Trong trẻo' },
      ],
    }),

    // Page 18: Chapter X - Nàng Thơ Trong Mắt Mình
    createBookPage({
      pageNumber: 18,
      side: 'left',
      chapter: 'Chapter X',
      title: 'Nàng Thơ Trong Mắt Mình',
      quote: 'Bạn luôn là điều dịu dàng nhất...',
      textLines: [
        'Dù ở bất kỳ góc chụp nào, nét duyên dáng của bạn',
        'luôn làm trái tim mình rung động như ngày đầu.',
      ],
      layout: 'asymmetric-featured',
      backgroundUrl: getMediaUrl('backgrounds/page-18.jpg'),
      media: [
        { src: getMediaUrl('page18-her-pic-1.jpg'), caption: 'Nét dịu dàng của bạn' },
        { src: getMediaUrl('page18-her-pic-2.jpg'), caption: 'Một ngày thật đẹp' },
        { src: getMediaUrl('page18-her-pic-6.jpg'), caption: 'Nụ cười mình thương' },
      ],
    }),

    // Page 19: Chapter X - Những Bức Hình Đẹp Nhất
    createBookPage({
      pageNumber: 19,
      side: 'right',
      chapter: 'Chapter X',
      title: 'Những Bức Hình Đẹp Nhất',
      textLines: ['Lưu giữ từng nụ cười và ánh mắt biết nói.'],
      layout: 'asymmetric-featured',
      backgroundUrl: getMediaUrl('backgrounds/page-19.jpg'),
      media: [
        { src: getMediaUrl('page19-replacement.jpg'), caption: 'Xinh đẹp & Rạng rỡ' },
        { src: getMediaUrl('her-pic-3.jpg'), caption: 'Nét duyên dáng' },
        { src: getMediaUrl('her-pic-4.jpg'), caption: 'Đáng yêu' },
      ],
    }),

    // Page 20: Chapter XI - Mãi Mãi Về Sau
    createBookPage({
      pageNumber: 20,
      side: 'left',
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
      backgroundUrl: getMediaUrl('backgrounds/page-20.jpg'),
      media: [
        { src: getMediaUrl('me-1.jpg'), caption: 'Chàng trai của bạn' },
        { src: getMediaUrl('me-2.jpg'), caption: 'Phúc & Trang' },
      ],
    }),
  ],
};
