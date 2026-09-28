'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { LogOut, ExternalLink, ShieldCheck, Eye } from 'lucide-react';

export default function AdminHeader() {
  const { user, logout } = useAdminAuth();

  return (
    <header className="h-16 bg-[#160D12] border-b border-rosewood-900/40 px-6 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Single Admin Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rosewood-950/80 border border-rosewood-500/50 text-champagne-300 text-xs font-mono font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-rosewood-400" />
          <span>Quản Trị Viên (Admin)</span>
        </div>
      </div>

      {/* Right: User profile, Preview Draft, Public site link, Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Preview Draft Link */}
        <Link
          href="/admin/preview"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 text-xs font-medium border border-amber-800/40 transition-colors shadow-sm"
          title="Xem trước bản nháp trên 3D Flipbook thực tế"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Preview Draft</span>
        </Link>

        {/* Live Public Website Link */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium border border-emerald-800/40 transition-colors shadow-sm"
          title="Mở xem website công khai đã xuất bản (Live Published Site)"
        >
          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Live Public Site</span>
        </Link>

        {/* Current User Info */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-rosewood-900/40">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rosewood-700 to-rosewood-900 border border-rosewood-500/40 flex items-center justify-center text-champagne-200 text-xs font-serif font-bold shadow">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-parchment-100 leading-tight">{user.name}</p>
              <p className="text-[10px] font-mono text-stone-400">{user.email}</p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-medium border border-red-800/40 transition-colors"
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
