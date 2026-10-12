'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { JournalProvider } from '@/context/JournalContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const isPreview = pathname === '/admin/preview';
  const isEditor = pathname === '/admin/cover' || /^\/admin\/pages\/[^/]+$/.test(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>('button, a')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key !== 'Tab' || !drawer) return;
      const items = Array.from(drawer.querySelectorAll<HTMLElement>('button, a[href]'));
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [menuOpen]);

  return (
    <AdminAuthProvider>
      {isLoginPage ? (
        <main className="min-h-screen bg-[#0E070A] text-parchment-100 font-sans">
          {children}
        </main>
      ) : (
        <JournalProvider>
          {isPreview ? children : <div className="cms-shell flex h-[100dvh] bg-[#0E070A] text-parchment-100 overflow-hidden font-sans">
            <div className={`${sidebarVisible ? 'hidden min-[1200px]:flex' : 'hidden'} shrink-0 overflow-y-auto`}><AdminSidebar /></div>
            <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-[#12090D]" inert={menuOpen ? true : undefined}>
              <AdminHeader onMenu={() => {
                if (window.matchMedia('(min-width: 1200px)').matches) setSidebarVisible((visible) => !visible);
                else setMenuOpen(true);
              }} />
              <main className={`flex-1 min-w-0 min-h-0 ${isEditor ? 'overflow-hidden' : 'overflow-y-auto'} cms-content`}>
                {children}
              </main>
            </div>
            {menuOpen && <div className="fixed inset-0 z-[100] bg-black/70" onClick={() => setMenuOpen(false)}>
              <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu quản trị" onClick={(event) => event.stopPropagation()} className="flex flex-col w-72 max-w-[90vw] h-[100dvh] overflow-y-auto bg-[#180E13]">
                <button type="button" onClick={() => setMenuOpen(false)} className="min-h-11 p-3 text-left">Đóng menu</button>
                <AdminSidebar />
              </div>
            </div>}
          </div>}
        </JournalProvider>
      )}
    </AdminAuthProvider>
  );
}
