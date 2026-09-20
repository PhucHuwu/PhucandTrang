'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { LogOut, ExternalLink, Shield, ShieldAlert, Eye, User } from 'lucide-react';

export default function AdminHeader() {
  const { user, role, isAdmin, isEditor, isViewer, logout } = useAdminAuth();

  return (
    <header className="h-16 bg-[#160D12] border-b border-rosewood-900/40 px-6 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Role Info / Viewer Banner */}
      <div className="flex items-center gap-3">
        {isViewer ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs font-medium animate-pulse">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Chế độ Chỉ Xem (VIEWER) — Thao tác chỉnh sửa bị khóa</span>
          </div>
        ) : isAdmin ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rosewood-950/80 border border-rosewood-500/50 text-champagne-300 text-xs font-mono font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-rosewood-400" />
            <span>Quyền Quản Trị Cao Nhất (ADMIN)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/50 text-sky-200 text-xs font-mono font-semibold">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>Quyền Biên Tập Viên (EDITOR)</span>
          </div>
        )}
      </div>

      {/* Right: User profile, Public site preview, Logout */}
      <div className="flex items-center gap-4">
        {/* Live Public Website Link */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#23141E] hover:bg-[#301B29] text-parchment-200 hover:text-champagne-300 text-xs font-medium border border-rosewood-900/40 transition-colors shadow-sm"
          title="Mở xem website thực tế trên tab mới"
        >
          <ExternalLink className="w-3.5 h-3.5 text-rosewood-400" />
          <span className="hidden sm:inline">Xem trang web</span>
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
