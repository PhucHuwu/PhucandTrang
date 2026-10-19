import type { Metadata } from 'next';
import { Cormorant_Garamond, Montserrat, Dancing_Script } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
});

const dancingScript = Dancing_Script({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700'],
  variable: '--font-handwriting',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://love.phuchuwu.io.vn';
// Cloudinary-resized to the 1.91:1 size social networks expect (the original is 4032x2268, ~1.6 MB)
const OG_IMAGE =
  'https://res.cloudinary.com/dlvpiesfj/image/upload/c_fill,g_auto,w_1200,h_630,q_auto:good,f_jpg/v1789389673/phuc_trang_memories/21-08-2026_3.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  title: 'Phúc & Trang — Hành Trình Bên Nhau',
  description: 'Cuốn nhật ký tình yêu của hai mình từ ngày 20 tháng 10 năm 2022.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23E85A7E%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z%22/><path d=%22M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z%22/></svg>',
  },
  openGraph: {
    title: 'Phúc & Trang — Chúng Mình (Our Love Journal)',
    description: 'Cuốn nhật ký tình yêu của hai mình từ ngày 20 tháng 10 năm 2022.',
    url: '/',
    siteName: 'Chúng Mình - Phúc & Trang',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'Phúc & Trang • Kỷ niệm ngày 21.08',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Phúc & Trang — Chúng Mình',
    description: 'Cuốn nhật ký tình yêu của hai mình từ ngày 20 tháng 10 năm 2022.',
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${cormorant.variable} ${montserrat.variable} ${dancingScript.variable}`}>
      <body suppressHydrationWarning className="bg-[#12100E] text-ink-800 antialiased selection:bg-rosewood-200 selection:text-rosewood-900">
        {children}
      </body>
    </html>
  );
}
