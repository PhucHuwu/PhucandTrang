export interface CanonicalPageItem {
  src: string;
  caption: string;
  thumbnailUrl?: string;
  isVideo?: boolean;
}

export interface CanonicalPageDefinition {
  pageNumber: number;
  chapter?: string;
  title: string;
  quote?: string;
  textLines?: string[];
  handwriting?: string;
  bg: string;
  layout: string;
  items: CanonicalPageItem[];
}

/** Definition of all 21 inside pages of the canonical journal. */
export const CANONICAL_PAGES: CanonicalPageDefinition[] = [
  {
    pageNumber: 0,
    title: 'OUR STORY',
    quote: 'A story written one page at a time.',
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904217/phuc_trang_backgrounds/page-0.jpg',
    layout: 'auto',
    items: [],
  },
  {
    pageNumber: 1,
    chapter: 'Chapter I',
    title: 'Lần Đầu Gặp Gỡ',
    quote: 'Vạn vật như muốn hai mình bên nhau...',
    textLines: [
      'Ngày 13 và 14 tháng 10 năm 2022,',
      'khoảnh khắc đầu tiên mình và bạn chạm ánh mắt nhau,',
      'thế giới bỗng trở nên thật dịu dàng và ấm áp.',
    ],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904218/phuc_trang_backgrounds/page-1.jpg',
    layout: 'dual-columns',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389696/phuc_trang_memories/First-meet-13-10-2022.jpg',
        caption: '13.10.2022',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389696/phuc_trang_memories/First-meet-14-10-2022.jpg',
        caption: '13.10.2022',
      },
    ],
  },
  {
    pageNumber: 2,
    chapter: 'Chapter I',
    title: 'Ánh Nhìn Đầu Tiên',
    textLines: [
      'Cũng trong ngày 13 tháng 10 năm 2022 ấy,',
      'từng khoảnh khắc trôi qua đều ngập tràn niềm vui và sự xao xuyến.',
    ],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904220/phuc_trang_backgrounds/page-2.jpg',
    layout: 'single-hero',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389694/phuc_trang_memories/First-ani-19-10-2022.jpg',
        caption: '13.10.2022 • Những ánh nhìn đầu tiên',
      },
    ],
  },
  {
    pageNumber: 3,
    chapter: 'Chapter II',
    title: 'Khoảnh Khắc 20.10.2022',
    quote: 'Thế cậu đồng ý làm bạn gái tớ không?',
    textLines: ['Ngày 20 tháng 10 năm 2022,'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904222/phuc_trang_backgrounds/page-3.jpg',
    layout: 'dual-columns',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389681/phuc_trang_memories/23-12-2022.jpg',
        caption: '23.12.2022 • Dạo phố mùa đông',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389684/phuc_trang_memories/25-12-2022.jpg',
        caption: '25.12.2022 • Giáng sinh đầu tiên',
      },
    ],
  },
  {
    pageNumber: 4,
    chapter: 'Chapter II',
    title: 'Giáng Sinh Ấm Áp',
    textLines: ['Đêm Noel lung linh ánh đèn đường.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904222/phuc_trang_backgrounds/page-4.jpg',
    layout: 'single-hero',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389685/phuc_trang_memories/25-12-2022_2.jpg',
        caption: '25.12.2022 • Merry Christmas',
      },
    ],
  },
  {
    pageNumber: 5,
    chapter: 'Chapter III',
    title: 'Những Mùa Thương Yêu 2023',
    quote: 'Bên nhau qua từng mùa hoa nở...',
    textLines: [
      'Tháng 3 dịu mát và những ngày tháng 7 đầy nắng,',
      'hai mình cùng đi qua những cung đường mới.',
    ],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904223/phuc_trang_backgrounds/page-5.jpg',
    layout: 'diagonal-duo',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389650/phuc_trang_memories/05-03-2023.jpg',
        caption: '05.03.2023 • Mùa xuân bên nhau',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389651/phuc_trang_memories/08-07-2023.jpg',
        caption: '08.07.2023 • Mùa hè rạng rỡ',
      },
    ],
  },
  {
    pageNumber: 6,
    chapter: 'Chapter III',
    title: 'Kỷ Niệm 1 Năm & Mùa Đông 2023',
    textLines: ['Kỷ niệm 1 năm bên nhau.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904224/phuc_trang_backgrounds/page-6.jpg',
    layout: 'quad-gallery',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389682/phuc_trang_memories/25-10-2023.jpg',
        caption: '25.10.2023 • Tròn 1 năm yêu',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389683/phuc_trang_memories/25-10-2023_2.jpg',
        caption: '25.10.2023 • Gắn kết bền lâu',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389648/phuc_trang_memories/02-12-2023.jpg',
        caption: '02.12.2023 • Phố đông kỷ niệm',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389649/phuc_trang_memories/02-12-2023_2.jpg',
        caption: '02.12.2023 • Nụ cười rạng rỡ',
      },
    ],
  },
  {
    pageNumber: 7,
    chapter: 'Chapter IV',
    title: 'Những Ngày Tháng 12.2023',
    textLines: [],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904225/phuc_trang_backgrounds/page-7.jpg',
    layout: 'dual-columns',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389650/phuc_trang_memories/02-12-2023_3.jpg',
        caption: '02.12.2023',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1789389686/phuc_trang_memories/26-06-2323.mp4',
        thumbnailUrl:
          'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789390296/phuc_trang_memories/26-06-2323_thumb.jpg',
        caption: '26.06 • Video kỷ niệm',
        isVideo: true,
      },
    ],
  },
  {
    pageNumber: 8,
    chapter: 'Chapter IV',
    title: 'Sinh Nhật Bên Nhau 2024',
    quote: 'Tuổi mới ngập tràn niềm vui',
    textLines: [
      'Ngày 25 tháng 05 năm 2024,',
      'sinh nhật đặc biệt nhất khi luôn có bạn kề cạnh.',
    ],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904226/phuc_trang_backgrounds/page-8.jpg',
    layout: 'quad-gallery',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389692/phuc_trang_memories/Brithdate-together-25-05-2024_2.jpg',
        caption: '25.05.2024',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389693/phuc_trang_memories/Brithdate-together-25-05-2024_3.jpg',
        caption: '25.05.2024',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389694/phuc_trang_memories/Brithdate-together-25-05-2024_4.jpg',
        caption: '25.05.2024',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1789401361/phuc_trang_memories/Brithdate-together-25-05-2024.mp4',
        thumbnailUrl:
          'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789390299/phuc_trang_memories/Brithdate-together-25-05-2024_thumb.jpg',
        caption: '25.05.2024',
        isVideo: true,
      },
    ],
  },
  {
    pageNumber: 9,
    chapter: 'Chapter V',
    title: 'Chào Đón Năm Mới 2025',
    quote: 'Mở đầu một năm tràn đầy yêu thương',
    textLines: [
      'Ngày 02 tháng 01 năm 2025,',
      'chuyến đi khởi đầu năm mới với bao hy vọng,',
      'hai mình cùng nhau lưu giữ những khoảnh khắc rạng rỡ.',
    ],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904227/phuc_trang_backgrounds/page-9.jpg',
    layout: 'quad-gallery',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389635/phuc_trang_memories/02-01-2025.jpg',
        caption: '02.01.2025 • Du xuân năm mới',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389638/phuc_trang_memories/02-01-2025_2.jpg',
        caption: '02.01.2025 • Đồng hành',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389641/phuc_trang_memories/02-01-2025_3.jpg',
        caption: '02.01.2025 • Tươi tắn',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389646/phuc_trang_memories/02-01-2025_8.jpg',
        caption: '02.01.2025 • Nụ cười rạng rỡ',
      },
    ],
  },
  {
    pageNumber: 10,
    chapter: 'Chapter V',
    title: 'Chuyến Đi 17.01.2025',
    textLines: ['Những góc chụp rạng rỡ và kỷ niệm ngày 17 tháng 01.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904228/phuc_trang_backgrounds/page-10.jpg',
    layout: 'quad-gallery',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389652/phuc_trang_memories/17-01-1025.jpg',
        caption: '17.01.2025 • Từng bước chân qua',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389659/phuc_trang_memories/17-01-2025_2.jpg',
        caption: '17.01.2025 • Chuyến đi ý nghĩa',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389660/phuc_trang_memories/17-01-2025_3.jpg',
        caption: '17.01.2025 • Khoảnh khắc đẹp',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389661/phuc_trang_memories/17-01-2025_4.jpg',
        caption: '17.01.2025 • Trong trẻo',
      },
    ],
  },
  {
    pageNumber: 11,
    chapter: 'Chapter VI',
    title: 'Khoảnh Khắc Đáng Nhớ 17.01',
    quote: 'Hạnh phúc đọng lại nơi ánh mắt',
    textLines: ['Tháng 1 năm 2025 với những nụ cười hồn nhiên nhất.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904229/phuc_trang_backgrounds/page-11.jpg',
    layout: 'dual-columns',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389662/phuc_trang_memories/17-01-2025_5.jpg',
        caption: '17.01.2025 • Hồn nhiên',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1789401266/phuc_trang_memories/17-01-2025.mp4',
        thumbnailUrl:
          'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789390294/phuc_trang_memories/17-01-2025_thumb.jpg',
        caption: 'Video 17.01.2025',
        isVideo: true,
      },
    ],
  },
  {
    pageNumber: 12,
    chapter: 'Chapter VII',
    title: 'Mùa Thu Ngày 20.08.2025',
    textLines: ['Tháng 8 mùa thu đưa hai mình đến những trải nghiệm mới.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904230/phuc_trang_backgrounds/page-12.jpg',
    layout: 'quad-gallery',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389668/phuc_trang_memories/20-08-2025.jpg',
        caption: '20.08.2025 • Nắng thu',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389669/phuc_trang_memories/20-08-2025_2.jpg',
        caption: '20.08.2025 • Dịu mát',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389670/phuc_trang_memories/20-08-2025_3.jpg',
        caption: '20.08.2025 • Bên bạn',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389671/phuc_trang_memories/20-08-2025_4.jpg',
        caption: '20.08.2025 • Rạng ngời',
      },
    ],
  },
  {
    pageNumber: 13,
    chapter: 'Chapter VII',
    title: 'Tháng 11 Ngày 22.11.2025',
    textLines: ['Những ngày cuối năm 2025 luôn đong đầy tình cảm.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904231/phuc_trang_backgrounds/page-13.jpg',
    layout: 'scrapbook-trio',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389678/phuc_trang_memories/22-11-2025.jpg',
        caption: '22.11.2025 • Chớm đông',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389680/phuc_trang_memories/22-11-2025_2.jpg',
        caption: '22.11.2025 • Ấm áp',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389681/phuc_trang_memories/22-11-2025_3.jpg',
        caption: '22.11.2025 • Nắm tay nhau',
      },
    ],
  },
  {
    pageNumber: 14,
    chapter: 'Chapter VIII',
    title: 'Chuyến Đi Ngày 18.04',
    textLines: ['Những ngày tháng 4 đáng nhớ của tuổi trẻ.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904231/phuc_trang_backgrounds/page-14.jpg',
    layout: 'dual-columns',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389665/phuc_trang_memories/18-04-2016.jpg',
        caption: '18.04.2016 • Kỷ niệm',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389697/phuc_trang_memories/First-trip-14-03-2026.jpg',
        caption: '14.03.2026 • First Trip',
      },
    ],
  },
  {
    pageNumber: 15,
    chapter: 'Chapter VIII',
    title: 'Hẹn Ước Tương Lai',
    textLines: ['Những chuyến đi dài phía trước luôn có hai mình bên nhau.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904233/phuc_trang_backgrounds/page-15.jpg',
    layout: 'dual-stacked',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389666/phuc_trang_memories/18-04-2026.jpg',
        caption: '18.04.2026 • Ngày đẹp trời',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389667/phuc_trang_memories/18-04-2026_2.jpg',
        caption: '18.04.2026 • Hẹn ước mai sau',
      },
    ],
  },
  {
    pageNumber: 16,
    chapter: 'Chapter IX',
    title: 'Mùa Thu Ngày 21.08',
    textLines: ['Loạt khoảnh khắc đẹp ngày 21 tháng 08.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904234/phuc_trang_backgrounds/page-16-17.jpg',
    layout: 'dual-stacked',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389672/phuc_trang_memories/21-08-2026.jpg',
        caption: '21.08.2026 • Nụ cười xinh',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389673/phuc_trang_memories/21-08-2026_2.jpg',
        caption: '21.08.2026 • Nhẹ nhàng',
      },
    ],
  },
  {
    pageNumber: 17,
    chapter: 'Chapter IX',
    title: 'Nắng Thu Ngọt Ngào',
    textLines: [],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904234/phuc_trang_backgrounds/page-16-17.jpg',
    layout: 'dual-stacked',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389673/phuc_trang_memories/21-08-2026_3.jpg',
        caption: '21.08.2026 • Dễ thương',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389674/phuc_trang_memories/21-08-2026_4.jpg',
        caption: '21.08.2026 • Trong trẻo',
      },
    ],
  },
  {
    pageNumber: 18,
    chapter: 'Chapter X',
    title: 'Nàng Thơ Trong Mắt Mình',
    quote: 'Bạn luôn là điều dịu dàng nhất...',
    textLines: [
      'Dù ở bất kỳ góc chụp nào, nét duyên dáng của bạn',
      'luôn làm trái tim mình rung động như ngày đầu.',
    ],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904234/phuc_trang_backgrounds/page-18.jpg',
    layout: 'asymmetric-featured',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789576930/phuc_trang_memories/page18-her-pic-1.jpg',
        caption: 'Nét dịu dàng của bạn',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789576933/phuc_trang_memories/page18-her-pic-2.jpg',
        caption: 'Một ngày thật đẹp',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789576935/phuc_trang_memories/page18-her-pic-6.jpg',
        caption: 'Nụ cười mình thương',
      },
    ],
  },
  {
    pageNumber: 19,
    chapter: 'Chapter X',
    title: 'Những Bức Hình Đẹp Nhất',
    textLines: ['Lưu giữ từng nụ cười và ánh mắt biết nói.'],
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904235/phuc_trang_backgrounds/page-19.jpg',
    layout: 'asymmetric-featured',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789576936/phuc_trang_memories/page19-replacement.jpg',
        caption: 'Xinh đẹp & Rạng rỡ',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389700/phuc_trang_memories/her-pic-3.jpg',
        caption: 'Nét duyên dáng',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389702/phuc_trang_memories/her-pic-4.jpg',
        caption: 'Đáng yêu',
      },
    ],
  },
  {
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
    bg: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904236/phuc_trang_backgrounds/page-20.jpg',
    layout: 'dual-columns',
    items: [
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389704/phuc_trang_memories/me-1.jpg',
        caption: 'Chàng trai của bạn',
      },
      {
        src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389709/phuc_trang_memories/me-2.jpg',
        caption: '{{couple.he}} & {{couple.she}}',
      },
    ],
  },
];
