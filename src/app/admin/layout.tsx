'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <AdminAuthProvider>
      {isLoginPage ? (
        <main className="min-h-screen bg-[#0E070A] text-parchment-100 font-sans">
          {children}
        </main>
      ) : (
        <div className="flex h-screen bg-[#0E070A] text-parchment-100 overflow-hidden font-sans">
          <AdminSidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#12090D]">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </AdminAuthProvider>
  );
}
