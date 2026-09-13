import type { Metadata } from 'next';
import { Cormorant_Garamond, Montserrat, Pinyon_Script, Alex_Brush } from 'next/font/google';
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

const pinyon = Pinyon_Script({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-pinyon',
  display: 'swap',
});

const alexBrush = Alex_Brush({
  subsets: ['latin', 'vietnamese'],
  weight: ['400'],
  variable: '--font-alex-brush',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Phúc & Trang — Hành Trình Bên Nhau',
  description: 'Cuốn nhật ký tình yêu của chúng tôi từ ngày 20 tháng 10 năm 2022.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📖</text></svg>',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${cormorant.variable} ${montserrat.variable} ${pinyon.variable} ${alexBrush.variable}`}>
      <body className="bg-[#12100E] text-ink-800 antialiased selection:bg-rosewood-200 selection:text-rosewood-900">
        {children}
      </body>
    </html>
  );
}
