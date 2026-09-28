import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#110D0E] text-parchment-100 p-4 text-center">
      <h2 className="font-serif text-3xl mb-2">Trang không tồn tại</h2>
      <p className="font-serif text-stone-400 mb-4">Cuốn nhật ký không có trang này.</p>
      <Link href="/" className="px-4 py-2 rounded-full bg-rosewood-500 text-white text-xs uppercase tracking-widest font-serif">
        Về trang chính
      </Link>
    </div>
  );
}
