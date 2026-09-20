import {
  PrismaClient,
  Role,
  BookStatus,
  PageSide,
  ElementType,
  LayoutMode,
  MediaType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { REAL_LAYOUT_PRESETS } from '../src/templates/layout-presets.data';
import { derivePageSideEnum } from '../src/utils/page-utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for Phúc & Trang Love Journey...');

  // 1. Seed Admin User
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const enableDevSeed = process.env.ENABLE_DEV_SEED === 'true' || !isProduction;

  let admin: any = null;

  if (adminEmail && adminPassword) {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      console.log(`ℹ️ Admin user ${adminEmail} already exists. Preserving existing password.`);
      admin = existing;
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: 'Phúc & Trang Admin',
          role: Role.ADMIN,
        },
      });
      console.log(`✅ Admin user seeded: ${admin.email}`);
    }
  } else if (enableDevSeed) {
    const devEmail = 'admin@phucandtrang.love';
    const existing = await prisma.user.findUnique({ where: { email: devEmail } });
    if (existing) {
      console.log(`ℹ️ Dev admin user already exists. Preserving existing password.`);
      admin = existing;
    } else {
      const passwordHash = await bcrypt.hash('PhucAndTrang@20221020', 10);
      admin = await prisma.user.create({
        data: {
          email: devEmail,
          passwordHash,
          name: 'Phúc & Trang Admin (Dev)',
          role: Role.ADMIN,
        },
      });
      console.log(`✅ Dev admin user seeded: ${admin.email}`);
    }
  } else {
    throw new Error(
      'FATAL: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables are required for production seeding!',
    );
  }

  // 2. Seed Legacy Cloudinary Media Catalog
  const mediaUrlToIdMap = new Map<string, string>();
  const cloudinaryUrlsPath = path.resolve(__dirname, '../../src/data/cloudinaryUrls.json');

  if (fs.existsSync(cloudinaryUrlsPath)) {
    const rawData = fs.readFileSync(cloudinaryUrlsPath, 'utf8');
    const cloudinaryUrls = JSON.parse(rawData);

    for (const [key, url] of Object.entries(cloudinaryUrls)) {
      if (typeof url !== 'string') continue;

      let type: MediaType = MediaType.IMAGE;
      let folder = 'phuc_trang_memories';

      if (key.startsWith('backgrounds/')) {
        type = MediaType.BACKGROUND;
        folder = 'phuc_trang_backgrounds';
      } else if (key.endsWith('.mp4')) {
        type = MediaType.VIDEO;
      } else if (key.endsWith('.mp3') || key.endsWith('.wav')) {
        type = MediaType.AUDIO;
        folder = 'phuc_trang_audio';
      }

      const filename = url.split('/').pop() || key;
      const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`;

      const mediaRecord = await prisma.media.upsert({
        where: { url },
        update: {
          type,
          publicId,
          alt: key,
        },
        create: {
          type,
          provider: 'CLOUDINARY',
          url,
          publicId,
          alt: key,
          metadata: {
            originalKey: key,
            seeded: true,
          },
        },
      });

      mediaUrlToIdMap.set(url, mediaRecord.id);
      mediaUrlToIdMap.set(key, mediaRecord.id);
    }
    console.log(`✅ Seeded ${mediaUrlToIdMap.size} media catalog references.`);
  }

  // Helper to look up mediaId by filename or URL
  const getMediaId = (keyOrUrl: string): string | undefined => {
    return mediaUrlToIdMap.get(keyOrUrl);
  };

  // 3. Seed Main Audio Track
  const audioTrack = await prisma.audioTrack.upsert({
    where: { id: 'track-van-vat' },
    update: {
      volume: 0.8,
      loop: true,
      startAt: 0.0,
      fadeIn: 2.0,
      fadeOut: 2.0,
    },
    create: {
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
  });
  console.log(`✅ Audio track seeded: ${audioTrack.title}`);

  // 4. Seed Real Layout Templates (Full slots and element prototypes)
  for (const [key, t] of Object.entries(REAL_LAYOUT_PRESETS)) {
    await prisma.layoutTemplate.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        description: t.description,
        slots: t.slots as any,
        prototypes: (t.elementPrototypes || (t as any).prototypes) as any,
      },
      create: {
        id: t.id,
        name: t.name,
        description: t.description,
        slots: t.slots as any,
        prototypes: (t.elementPrototypes || (t as any).prototypes) as any,
        isSystem: true,
      },
    });
  }
  console.log(`✅ Seeded all 9 layout templates with complete prototypes.`);

  // 5. Seed Master Book: "Chúng Mình"
  const firstCoverUrl = 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904212/phuc_trang_backgrounds/first-cover.jpg';
  const lastCoverUrl = 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789904216/phuc_trang_backgrounds/last-cover.jpg';

  const book = await prisma.book.upsert({
    where: { slug: 'phuc-and-trang' },
    update: {
      title: 'Chúng Mình',
      contentRevision: 1,
      backgroundMusicId: audioTrack.id,
    },
    create: {
      slug: 'phuc-and-trang',
      title: 'Chúng Mình',
      description: 'Cuốn nhật ký tình yêu của hai mình từ ngày 20 tháng 10 năm 2022.',
      status: BookStatus.PUBLISHED,
      heName: 'Phúc',
      sheName: 'Trang',
      anniversaryDate: new Date('2022-10-20T00:00:00Z'),
      proposalQuote: 'Thế cậu đồng ý làm bạn gái tớ không?',
      backgroundMusicId: audioTrack.id,
      contentRevision: 1,
      ownerId: admin.id,
      cover: {
        front: {
          backgroundUrl: firstCoverUrl,
          mediaId: getMediaId(firstCoverUrl),
          title: 'Chúng Mình',
          titleFont: 'SVN-Housttely Signature',
          counterBadge: {
            enabled: true,
            startDate: '2022-10-20',
            subtitle: 'Bên nhau từ ngày {{anniversaryDate}}',
          },
          elements: [
            {
              id: 'cover-title',
              type: 'TEXT',
              slot: 'title',
              order: 1,
              zIndex: 10,
              visible: true,
              locked: true,
              opacity: 1,
              transform: { x: 0.068, y: 0.55, width: 0.86, height: 0.08, rotation: 0, scale: 1 },
              style: {
                textAlign: 'left',
                color: '#FFFFFF',
                fontFamily: '"SVN-Housttely Signature", "Coldwell Bridges", cursive, serif',
                fontSize: 60,
                letterSpacing: 1,
                shadow: { color: 'rgba(0, 0, 0, 0.85)', blur: 12, offsetX: 0, offsetY: 3 },
              },
              data: { text: 'Chúng Mình', variant: 'title' },
            },
            {
              id: 'cover-divider',
              type: 'SHAPE',
              slot: 'divider',
              order: 2,
              zIndex: 11,
              visible: true,
              locked: true,
              opacity: 1,
              transform: { x: 0.068, y: 0.625, width: 0.28, height: 0.002, rotation: 0, scale: 1 },
              data: { shapeType: 'line', strokeColor: '#F0B6C3', strokeWidth: 2 },
            },
            {
              id: 'cover-days-counter',
              type: 'TEXT',
              slot: 'counter',
              order: 3,
              zIndex: 12,
              visible: true,
              locked: true,
              opacity: 1,
              transform: { x: 0.068, y: 0.65, width: 0.86, height: 0.05, rotation: 0, scale: 1 },
              style: {
                textAlign: 'left',
                color: '#FFE5B4',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 32,
                fontWeight: 'bold',
                letterSpacing: 1,
                shadow: { color: 'rgba(0, 0, 0, 0.85)', blur: 12, offsetX: 0, offsetY: 3 },
              },
              data: { text: '{{daysTogether | number}} NGÀY', variant: 'title' },
            },
            {
              id: 'cover-subtitle',
              type: 'TEXT',
              slot: 'subtitle',
              order: 4,
              zIndex: 13,
              visible: true,
              locked: true,
              opacity: 1,
              transform: { x: 0.068, y: 0.685, width: 0.86, height: 0.04, rotation: 0, scale: 1 },
              style: {
                textAlign: 'left',
                color: 'rgba(255, 245, 247, 0.9)',
                fontFamily: '"Dancing Script", cursive',
                fontSize: 24,
                fontStyle: 'italic',
                shadow: { color: 'rgba(0, 0, 0, 0.85)', blur: 12, offsetX: 0, offsetY: 3 },
              },
              data: { text: 'Bên nhau từ ngày {{anniversaryDate}}', variant: 'quote' },
            },
          ],
        },
        back: {
          insideBackgroundUrl: lastCoverUrl,
          insideMediaId: getMediaId(lastCoverUrl),
          outsideBackgroundUrl: lastCoverUrl,
          outsideMediaId: getMediaId(lastCoverUrl),
          elements: [],
        },
      },
      settings: {
        dimensions: {
          pageWidth: 764,
          pageHeight: 1080,
          aspectRatio: 0.707,
          canvasResolution: { width: 1024, height: 1360 },
          pageThickness: 1,
          coverThickness: 5,
          pageRootThickness: 4,
          coverMarginX: 8,
          coverMarginY: 10,
        },
        camera: { fov: 14, distance: 5200, near: 1200, far: 9000 },
        theme: {
          edgeColor: 0xb1a283,
          paperColor: '#F9F5EC',
          textColor: '#292522',
          accentColor: '#94384F',
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
    },
  });
  console.log(`✅ Book entity created: "${book.title}" (slug: ${book.slug})`);

  // 6. Definition of all 21 inside pages
  const pagesData = [
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389696/phuc_trang_memories/First-meet-13-10-2022.jpg', caption: '13.10.2022' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389696/phuc_trang_memories/First-meet-14-10-2022.jpg', caption: '13.10.2022' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389694/phuc_trang_memories/First-ani-19-10-2022.jpg', caption: '13.10.2022 • Những ánh nhìn đầu tiên' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389681/phuc_trang_memories/23-12-2022.jpg', caption: '23.12.2022 • Dạo phố mùa đông' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389684/phuc_trang_memories/25-12-2022.jpg', caption: '25.12.2022 • Giáng sinh đầu tiên' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389685/phuc_trang_memories/25-12-2022_2.jpg', caption: '25.12.2022 • Merry Christmas' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389650/phuc_trang_memories/05-03-2023.jpg', caption: '05.03.2023 • Mùa xuân bên nhau' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389651/phuc_trang_memories/08-07-2023.jpg', caption: '08.07.2023 • Mùa hè rạng rỡ' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389682/phuc_trang_memories/25-10-2023.jpg', caption: '25.10.2023 • Tròn 1 năm yêu' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389683/phuc_trang_memories/25-10-2023_2.jpg', caption: '25.10.2023 • Gắn kết bền lâu' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389648/phuc_trang_memories/02-12-2023.jpg', caption: '02.12.2023 • Phố đông kỷ niệm' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389649/phuc_trang_memories/02-12-2023_2.jpg', caption: '02.12.2023 • Nụ cười rạng rỡ' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389650/phuc_trang_memories/02-12-2023_3.jpg', caption: '02.12.2023' },
        {
          src: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1789389686/phuc_trang_memories/26-06-2323.mp4',
          thumbnailUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789390296/phuc_trang_memories/26-06-2323_thumb.jpg',
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389692/phuc_trang_memories/Brithdate-together-25-05-2024_2.jpg', caption: '25.05.2024' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389693/phuc_trang_memories/Brithdate-together-25-05-2024_3.jpg', caption: '25.05.2024' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389694/phuc_trang_memories/Brithdate-together-25-05-2024_4.jpg', caption: '25.05.2024' },
        {
          src: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1789401361/phuc_trang_memories/Brithdate-together-25-05-2024.mp4',
          thumbnailUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789390299/phuc_trang_memories/Brithdate-together-25-05-2024_thumb.jpg',
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389635/phuc_trang_memories/02-01-2025.jpg', caption: '02.01.2025 • Du xuân năm mới' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389638/phuc_trang_memories/02-01-2025_2.jpg', caption: '02.01.2025 • Đồng hành' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389641/phuc_trang_memories/02-01-2025_3.jpg', caption: '02.01.2025 • Tươi tắn' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389646/phuc_trang_memories/02-01-2025_8.jpg', caption: '02.01.2025 • Nụ cười rạng rỡ' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389652/phuc_trang_memories/17-01-1025.jpg', caption: '17.01.2025 • Từng bước chân qua' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389659/phuc_trang_memories/17-01-2025_2.jpg', caption: '17.01.2025 • Chuyến đi ý nghĩa' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389660/phuc_trang_memories/17-01-2025_3.jpg', caption: '17.01.2025 • Khoảnh khắc đẹp' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389661/phuc_trang_memories/17-01-2025_4.jpg', caption: '17.01.2025 • Trong trẻo' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389662/phuc_trang_memories/17-01-2025_5.jpg', caption: '17.01.2025 • Hồn nhiên' },
        {
          src: 'https://res.cloudinary.com/dlvpiesfj/video/upload/v1789401266/phuc_trang_memories/17-01-2025.mp4',
          thumbnailUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789390294/phuc_trang_memories/17-01-2025_thumb.jpg',
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389668/phuc_trang_memories/20-08-2025.jpg', caption: '20.08.2025 • Nắng thu' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389669/phuc_trang_memories/20-08-2025_2.jpg', caption: '20.08.2025 • Dịu mát' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389670/phuc_trang_memories/20-08-2025_3.jpg', caption: '20.08.2025 • Bên bạn' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389671/phuc_trang_memories/20-08-2025_4.jpg', caption: '20.08.2025 • Rạng ngời' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389678/phuc_trang_memories/22-11-2025.jpg', caption: '22.11.2025 • Chớm đông' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389680/phuc_trang_memories/22-11-2025_2.jpg', caption: '22.11.2025 • Ấm áp' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389681/phuc_trang_memories/22-11-2025_3.jpg', caption: '22.11.2025 • Nắm tay nhau' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389665/phuc_trang_memories/18-04-2016.jpg', caption: '18.04.2016 • Kỷ niệm' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389697/phuc_trang_memories/First-trip-14-03-2026.jpg', caption: '14.03.2026 • First Trip' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389666/phuc_trang_memories/18-04-2026.jpg', caption: '18.04.2026 • Ngày đẹp trời' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389667/phuc_trang_memories/18-04-2026_2.jpg', caption: '18.04.2026 • Hẹn ước mai sau' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389672/phuc_trang_memories/21-08-2026.jpg', caption: '21.08.2026 • Nụ cười xinh' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389673/phuc_trang_memories/21-08-2026_2.jpg', caption: '21.08.2026 • Nhẹ nhàng' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389673/phuc_trang_memories/21-08-2026_3.jpg', caption: '21.08.2026 • Dễ thương' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389674/phuc_trang_memories/21-08-2026_4.jpg', caption: '21.08.2026 • Trong trẻo' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789576930/phuc_trang_memories/page18-her-pic-1.jpg', caption: 'Nét dịu dàng của bạn' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789576933/phuc_trang_memories/page18-her-pic-2.jpg', caption: 'Một ngày thật đẹp' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789576935/phuc_trang_memories/page18-her-pic-6.jpg', caption: 'Nụ cười mình thương' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789576936/phuc_trang_memories/page19-replacement.jpg', caption: 'Xinh đẹp & Rạng rỡ' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389700/phuc_trang_memories/her-pic-3.jpg', caption: 'Nét duyên dáng' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389702/phuc_trang_memories/her-pic-4.jpg', caption: 'Đáng yêu' },
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
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389704/phuc_trang_memories/me-1.jpg', caption: 'Chàng trai của bạn' },
        { src: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789389709/phuc_trang_memories/me-2.jpg', caption: '{{couple.he}} & {{couple.she}}' },
      ],
    },
  ];

  // 7. Insert all 21 pages and elements into PostgreSQL
  for (let i = 0; i < pagesData.length; i++) {
    const p = pagesData[i];
    const order = i;
    const derivedSide = derivePageSideEnum(order);
    const bgMediaId = getMediaId(p.bg);

    const pageRecord = await prisma.page.upsert({
      where: {
        bookId_pageNumber: {
          bookId: book.id,
          pageNumber: p.pageNumber,
        },
      },
      update: {
        order,
        side: derivedSide,
        chapter: p.chapter,
        title: p.title,
        quote: p.quote,
        handwriting: (p as any).handwriting,
        layoutTemplateId: p.layout,
        sourceTemplateId: p.layout,
        layoutMode: LayoutMode.PRESET,
        background: {
          type: 'image',
          imageUrl: p.bg,
          mediaId: bgMediaId,
          headerFade: { enabled: true, color: '#F9F5EC', height: 0.345, startOpacity: 0.92, endOpacity: 0 },
          gutterFade: { enabled: true, color: '#F9F5EC', width: 0.14, opacity: 0.28 },
        },
      },
      create: {
        bookId: book.id,
        pageNumber: p.pageNumber,
        order,
        side: derivedSide,
        chapter: p.chapter,
        title: p.title,
        quote: p.quote,
        handwriting: (p as any).handwriting,
        layoutTemplateId: p.layout,
        sourceTemplateId: p.layout,
        layoutMode: LayoutMode.PRESET,
        background: {
          type: 'image',
          imageUrl: p.bg,
          mediaId: bgMediaId,
          headerFade: { enabled: true, color: '#F9F5EC', height: 0.345, startOpacity: 0.92, endOpacity: 0 },
          gutterFade: { enabled: true, color: '#F9F5EC', width: 0.14, opacity: 0.28 },
        },
      },
    });

    // Delete existing elements to ensure idempotent refresh
    await prisma.pageElement.deleteMany({ where: { pageId: pageRecord.id } });

    const elementsToCreate: any[] = [];
    let currentZ = 1;

    // Subtitle element
    if (p.chapter) {
      elementsToCreate.push({
        type: ElementType.TEXT,
        slot: 'subtitle',
        order: currentZ,
        zIndex: currentZ++,
        transform: { x: 0.078, y: 0.062, width: 0.844, height: 0.022, rotation: 0, scale: 1 },
        style: {
          color: '#C99A9A',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 20,
          fontWeight: 'bold',
          letterSpacing: 4,
          textAlign: derivedSide === PageSide.LEFT ? 'left' : 'right',
        },
        data: { text: p.chapter.toUpperCase(), variant: 'chapter-label' },
      });
    }

    // Header line element
    elementsToCreate.push({
      type: ElementType.SHAPE,
      slot: 'header-line',
      order: currentZ,
      zIndex: currentZ++,
      transform: { x: 0.078, y: 0.077, width: 0.844, height: 0.0015, rotation: 0, scale: 1 },
      data: { shapeType: 'line', strokeColor: 'rgba(201, 154, 154, 0.3)', strokeWidth: 1.5 },
    });

    // Title element
    if (p.title) {
      elementsToCreate.push({
        type: ElementType.TEXT,
        slot: 'title',
        order: currentZ,
        zIndex: currentZ++,
        transform: { x: 0.078, y: 0.118, width: 0.844, height: 0.032, rotation: 0, scale: 1 },
        style: { textAlign: 'left', color: '#292522', fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 38, fontWeight: 'bold', letterSpacing: 1 },
        data: { text: p.title, variant: 'title' },
      });
    }

    // Quote element
    if (p.quote) {
      elementsToCreate.push({
        type: ElementType.TEXT,
        slot: 'quote',
        order: currentZ,
        zIndex: currentZ++,
        transform: { x: 0.078, y: 0.150, width: 0.844, height: 0.028, rotation: 0, scale: 1 },
        style: { textAlign: 'left', color: '#94384F', fontFamily: '"Dancing Script", "Playfair Display", Georgia, cursive', fontSize: 26, fontStyle: 'italic' },
        data: { text: p.quote, variant: 'quote' },
      });
    }

    // Body multiline text element
    if (p.textLines && p.textLines.length > 0) {
      elementsToCreate.push({
        type: ElementType.TEXT,
        slot: 'body',
        order: currentZ,
        zIndex: currentZ++,
        transform: { x: 0.078, y: 0.190, width: 0.844, height: p.textLines.length * 0.024, rotation: 0, scale: 1 },
        style: { textAlign: 'left', color: '#474039', fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 22, lineHeight: 30 },
        data: { text: p.textLines.join('\n'), textLines: p.textLines, variant: 'body', multiline: true },
      });
    }

    // Handwriting element
    if ((p as any).handwriting) {
      elementsToCreate.push({
        type: ElementType.TEXT,
        slot: 'handwriting',
        order: 90,
        zIndex: 90,
        transform: { x: derivedSide === PageSide.LEFT ? 0.04 : 0.08, y: 0.912, width: 0.844, height: 0.030, rotation: 0, scale: 1 },
        style: { color: '#38161E', fontFamily: '"Dancing Script", cursive', fontSize: 32, fontStyle: 'italic', textAlign: derivedSide === PageSide.LEFT ? 'right' : 'center' },
        data: { text: (p as any).handwriting, variant: 'handwriting' },
      });
    }

    // Media & Caption elements based on layout preset
    const preset = REAL_LAYOUT_PRESETS[p.layout] || REAL_LAYOUT_PRESETS['auto'];
    const mediaSlots = (preset.elementPrototypes || (preset as any).prototypes).filter(
      (pr: any) => pr.slot === 'primaryImage' || pr.slot === 'secondaryImage' || pr.slot === 'tertiaryImage' || pr.slot === 'quaternaryImage',
    );

    for (let mIdx = 0; mIdx < p.items.length; mIdx++) {
      const item: any = p.items[mIdx];
      const slotProto = mediaSlots[mIdx] || mediaSlots[0] || {
        slot: `media-${mIdx}`,
        zIndex: 10 + mIdx * 2,
        transform: { x: 0.08, y: 0.28, width: 0.84, height: 0.55, rotation: 0, scale: 1 },
      };

      const mediaZ = slotProto.zIndex;
      const mediaTransform = { ...slotProto.transform };
      delete (mediaTransform as any).zIndex;

      const mediaRecordId = getMediaId(item.src);
      const posterRecordId = item.thumbnailUrl ? getMediaId(item.thumbnailUrl) : undefined;

      if (item.isVideo) {
        elementsToCreate.push({
          type: ElementType.VIDEO,
          slot: slotProto.slot,
          order: mediaZ,
          zIndex: mediaZ,
          transform: mediaTransform,
          style: { polaroidFrame: true, washiTape: true },
          data: {
            src: item.src,
            thumbnailUrl: item.thumbnailUrl || item.src,
            mediaId: mediaRecordId,
            posterMediaId: posterRecordId,
          },
          interaction: {
            enabled: true,
            action: 'open-video',
            target: item.src,
            title: item.caption || 'Xem Video',
            activeArea: { top: 0.1, left: 0.05, width: 0.9, height: 0.85 },
          },
        });
      } else {
        elementsToCreate.push({
          type: ElementType.IMAGE,
          slot: slotProto.slot,
          order: mediaZ,
          zIndex: mediaZ,
          transform: mediaTransform,
          style: { polaroidFrame: true, washiTape: true },
          data: {
            src: item.src,
            mediaId: mediaRecordId,
            objectFit: 'cover',
          },
        });
      }

      // Requirement 10: Caption becomes an independent TEXT element
      if (item.caption) {
        const captionZ = mediaZ + 1;
        const captionHeight = 0.035;
        const captionY = Math.min(0.94, mediaTransform.y + mediaTransform.height + 0.008);

        elementsToCreate.push({
          type: ElementType.TEXT,
          slot: `${slotProto.slot}-caption`,
          order: captionZ,
          zIndex: captionZ,
          transform: {
            x: mediaTransform.x,
            y: captionY,
            width: mediaTransform.width,
            height: captionHeight,
            rotation: mediaTransform.rotation || 0,
            scale: mediaTransform.scale || 1,
          },
          style: {
            textAlign: 'center',
            color: '#4A1523',
            fontFamily: '"Dancing Script", "Playfair Display", Georgia, cursive',
            fontSize: 19,
            fontStyle: 'italic',
          },
          data: {
            text: item.caption,
            variant: 'caption',
          },
        });
      }
    }

    // Insert all elements for this page
    for (const elem of elementsToCreate) {
      await prisma.pageElement.create({
        data: {
          pageId: pageRecord.id,
          type: elem.type,
          slot: elem.slot,
          order: elem.order,
          zIndex: elem.zIndex,
          visible: true,
          locked: false,
          opacity: 1.0,
          transform: elem.transform,
          style: elem.style,
          data: elem.data,
          interaction: elem.interaction,
        },
      });
    }
  }
  console.log(`✅ Seeded all 21 pages and elements into PostgreSQL.`);

  // 8. Seed Initial Version Snapshot with full complete pages & elements snapshot
  const fullBookForSnapshot = await prisma.book.findUnique({
    where: { id: book.id },
    include: {
      backgroundMusic: true,
      pages: {
        orderBy: { order: 'asc' },
        include: {
          elements: { orderBy: { zIndex: 'asc' } },
          layoutTemplate: true,
          audioTrack: true,
        },
      },
    },
  });

  await prisma.bookVersion.upsert({
    where: { id: 'initial-version-200' },
    update: {
      snapshot: fullBookForSnapshot as any,
    },
    create: {
      id: 'initial-version-200',
      bookId: book.id,
      version: '2.0.0',
      snapshot: fullBookForSnapshot as any,
      changelog: 'Khởi tạo hoàn chỉnh 21 trang với đầy đủ elements, captions, videos, và layout presets.',
      createdById: admin.id,
    },
  });
  console.log('✅ Initial version snapshot 2.0.0 created with complete pages.');

  console.log('🎉 Database seeding completed successfully! Ready for production.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
