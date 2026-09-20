'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAdminToken } from '@/services/adminApi';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    setMounted(true);
    const token = getAdminToken();
    if (!token && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [isLoginPage, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0E070A] text-parchment-200 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-[#0E070A] text-parchment-100 overflow-hidden font-sans">
      <AdminSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#12090D]">
        {children}
      </main>
    </div>
  );
}
