'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Music,
  LayoutGrid,
  Settings,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      match: pathname === '/admin',
    },
    {
      label: 'Pages (Các trang)',
      href: '/admin/pages',
      icon: FileText,
      match: pathname.startsWith('/admin/pages') || (pathname.includes('/books/') && pathname.includes('/pages')),
    },
    {
      label: 'Media (Thư viện ảnh)',
      href: '/admin/media',
      icon: ImageIcon,
      match: pathname.startsWith('/admin/media'),
    },
    {
      label: 'Audio (Kho nhạc)',
      href: '/admin/audio',
      icon: Music,
      match: pathname.startsWith('/admin/audio'),
    },
    {
      label: 'Layouts (Bố cục)',
      href: '/admin/layouts',
      icon: LayoutGrid,
      match: pathname.startsWith('/admin/layouts') || pathname.startsWith('/admin/layout-templates'),
    },
    {
      label: 'Book Settings (Cài đặt)',
      href: '/admin/settings',
      icon: Settings,
      match: pathname.startsWith('/admin/settings') || (pathname.includes('/books/') && pathname.includes('/settings')),
    },
    {
      label: 'Books (Tất cả sách)',
      href: '/admin/books',
      icon: BookOpen,
      match: pathname === '/admin/books',
    },
  ];

  return (
    <aside className="w-64 bg-[#180E13] border-r border-rosewood-900/40 flex flex-col justify-between select-none text-parchment-200 shrink-0">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-rosewood-900/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rosewood-500 to-rosewood-700 flex items-center justify-center shadow-lg text-white">
            <Sparkles className="w-5 h-5 text-champagne-300" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-base text-parchment-100 tracking-wide">
              Chúng Mình CMS
            </h1>
            <p className="text-[11px] text-rosewood-300/70">Quản trị nhật ký tình yêu</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-rosewood-600/30 text-champagne-300 font-semibold border border-rosewood-500/40 shadow-sm'
                    : 'text-stone-400 hover:text-parchment-100 hover:bg-[#25151F]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-champagne-400' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding Info */}
      <div className="p-4 border-t border-rosewood-900/40 bg-[#140A0F] text-[11px] font-mono text-stone-500 text-center">
        <span>Admin CMS v2.0 • Phúc & Trang</span>
      </div>
    </aside>
  );
}
