'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminBooks } from '@/services/adminApi';

export default function AdminSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function loadPrimaryBook() {
      try {
        const books = await getAdminBooks();
        if (books && books.length > 0) {
          router.replace(`/admin/books/${books[0].id}/settings`);
        } else {
          router.replace('/admin/books');
        }
      } catch {
        router.replace('/admin/books');
      }
    }
    loadPrimaryBook();
  }, [router]);

  return (
    <div className="py-32 flex flex-col items-center justify-center text-stone-500 text-xs">
      <div className="w-8 h-8 rounded-full border-2 border-rosewood-500 border-t-transparent animate-spin mb-3" />
      <span>Đang điều hướng đến cấu hình sách...</span>
    </div>
  );
}
