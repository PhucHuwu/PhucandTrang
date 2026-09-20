import { PrismaClient, Role, BookStatus, PageSide, ElementType, LayoutMode, MediaType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database for Phúc & Trang Love Journey...');

  // 1. Seed Admin User
  const passwordHash = await bcrypt.hash('PhucAndTrang@20221020', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@phucandtrang.love' },
    update: {},
    create: {
      email: 'admin@phucandtrang.love',
      passwordHash,
      name: 'Phúc & Trang Admin',
      role: Role.ADMIN,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // 2. Seed Main Audio Track
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
  console.log(`Created audio track: ${audioTrack.title}`);

  // 3. Seed Layout Templates
  const templateIds = [
    { id: 'single-hero', name: 'Single Hero', description: '1 ảnh lớn tràn trang trang nhã' },
    { id: 'dual-columns', name: 'Dual Columns', description: '2 ảnh dọc thanh mảnh đứng cạnh nhau' },
    { id: 'dual-stacked', name: 'Dual Stacked', description: '2 ảnh ngang hoặc video poster xếp trên dưới' },
    { id: 'asymmetric-featured', name: 'Asymmetric Featured', description: '1 ảnh chủ đạo trên + 2 ảnh nhỏ bên dưới' },
    { id: 'scrapbook-trio', name: 'Scrapbook Trio', description: '3 ảnh so le phong cách dán ảnh scrapbook' },
    { id: 'quad-gallery', name: 'Quad Gallery', description: 'Lưới 4 ảnh polaroid thanh lịch' },
    { id: 'diagonal-duo', name: 'Diagonal Duo', description: '2 ảnh góc nghiêng đè nhẹ nghệ thuật' },
    { id: 'auto', name: 'Auto Adapt', description: 'Tự động dàn trang theo số lượng phương tiện' },
    { id: 'custom', name: 'Custom Canvas', description: 'Trang tự do không theo khuôn mẫu' },
  ];

  for (const t of templateIds) {
    await prisma.layoutTemplate.upsert({
      where: { id: t.id },
      update: { name: t.name, description: t.description },
      create: {
        id: t.id,
        name: t.name,
        description: t.description,
        slots: [],
        prototypes: [],
        isSystem: true,
      },
    });
  }
  console.log(`Seeded ${templateIds.length} layout templates.`);

  // 4. Seed Master Book: "Chúng Mình"
  const book = await prisma.book.upsert({
    where: { slug: 'phuc-and-trang' },
    update: {},
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
      ownerId: admin.id,
      cover: {
        front: {
          backgroundUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789577878/phuc_trang_backgrounds/first-cover.jpg',
          title: 'Chúng Mình',
          titleFont: 'SVN-Housttely Signature',
          counterBadge: {
            enabled: true,
            startDate: '2022-10-20',
            subtitle: 'Bên nhau từ ngày 20.10.2022',
          },
        },
        back: {
          insideBackgroundUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789577881/phuc_trang_backgrounds/last-cover.jpg',
          outsideBackgroundUrl: 'https://res.cloudinary.com/dlvpiesfj/image/upload/v1789577881/phuc_trang_backgrounds/last-cover.jpg',
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
  console.log(`Created book: ${book.title} (slug: ${book.slug})`);

  // 5. Seed Initial Version Snapshot
  await prisma.bookVersion.create({
    data: {
      bookId: book.id,
      version: '2.0.0',
      snapshot: {
        bookId: book.id,
        slug: book.slug,
        title: book.title,
        status: book.status,
      },
      changelog: 'Khởi tạo phiên bản 2.0.0 đầy đủ 21 trang cho cuốn nhật ký tình yêu',
      createdById: admin.id,
    },
  });
  console.log('Created initial version snapshot 2.0.0');

  // 6. Seed Legacy Cloudinary Media Catalog
  const cloudinaryUrlsPath = path.resolve(__dirname, '../../src/data/cloudinaryUrls.json');
  if (fs.existsSync(cloudinaryUrlsPath)) {
    const rawData = fs.readFileSync(cloudinaryUrlsPath, 'utf8');
    const cloudinaryUrls = JSON.parse(rawData);
    let seededMediaCount = 0;

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

      await prisma.media.upsert({
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
      seededMediaCount++;
    }
    console.log(`Seeded ${seededMediaCount} media items into Media catalog.`);
  }

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
