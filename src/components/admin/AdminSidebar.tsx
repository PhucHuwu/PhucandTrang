'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Settings,
  LayoutGrid,
  Image as ImageIcon,
  Music,
  LogOut,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { clearAdminToken, getAdminUser } from '@/services/adminApi';

interface AdminSidebarProps {
  activeBookId?: string;
}

export default function AdminSidebar({ activeBookId = 'phuc-and-trang-love-journey' }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getAdminUser();

  const handleLogout = () => {
    clearAdminToken();
    router.push('/admin/login');
  };

  const navItems = [
    {
      label: 'Sách kỷ niệm',
      href: '/admin/books',
      icon: BookOpen,
      match: pathname === '/admin/books' || pathname === '/admin',
    },
    {
      label: 'Quản lý trang',
      href: `/admin/books/${activeBookId}/pages`,
      icon: FileText,
      match: pathname.includes('/pages'),
    },
    {
      label: 'Cài đặt sách',
      href: `/admin/books/${activeBookId}/settings`,
      icon: Settings,
      match: pathname.includes('/settings'),
    },
    {
      label: 'Kho giao diện (Layout)',
      href: '/admin/layout-templates',
      icon: LayoutGrid,
      match: pathname.startsWith('/admin/layout-templates'),
    },
    {
      label: 'Thư viện ảnh / Media',
      href: '/admin/media',
      icon: ImageIcon,
      match: pathname.startsWith('/admin/media'),
    },
    {
      label: 'Nhạc nền & Audio',
      href: '/admin/audio',
      icon: Music,
      match: pathname.startsWith('/admin/audio'),
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
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
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

      {/* Footer / User Profile & Logout */}
      <div className="p-4 border-t border-rosewood-900/40 bg-[#140A0F] space-y-3">
        {/* User Card */}
        {user && (
          <div className="flex items-center justify-between text-xs">
            <div className="truncate">
              <p className="font-medium text-parchment-200 truncate">{user.name}</p>
              <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-rosewood-900/60 text-rosewood-300 border border-rosewood-700/40 font-mono">
              {user.role}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/"
            target="_blank"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#25151F] hover:bg-[#331C2A] text-parchment-300 text-xs transition-colors border border-rosewood-900/40"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở trang web</span>
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-300 transition-colors border border-red-800/30"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
