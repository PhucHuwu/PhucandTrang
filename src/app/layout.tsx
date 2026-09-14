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

export const metadata: Metadata = {
  title: 'Phúc & Trang — Hành Trình Bên Nhau',
  description: 'Cuốn nhật ký tình yêu của chúng tôi từ ngày 20 tháng 10 năm 2022.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23E85A7E%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z%22/><path d=%22M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z%22/></svg>',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${cormorant.variable} ${montserrat.variable} ${dancingScript.variable}`}>
      <body className="bg-[#12100E] text-ink-800 antialiased selection:bg-rosewood-200 selection:text-rosewood-900">
        {children}
      </body>
    </html>
  );
}
