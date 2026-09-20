'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/services/adminApi';
import { Lock, Mail, Sparkles, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@phucandtrang.love');
  const [pass, setPass] = useState('PhucAndTrang@20221020');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await loginAdmin(email, pass);
      router.push('/admin/books');
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#1C0D15] via-[#12070D] to-[#0A0407] p-4">
      {/* Decorative warm aura */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-rosewood-600/15 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#180E14]/90 backdrop-blur-xl border border-rosewood-800/50 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rosewood-600 to-pink-600 shadow-xl mb-4 text-white">
            <Sparkles className="w-7 h-7 text-champagne-300" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-parchment-100 tracking-wide">
            Chúng Mình CMS
          </h1>
          <p className="text-xs text-rosewood-200/70 mt-1 font-sans">
            Đăng nhập hệ thống quản trị nhật ký tình yêu
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-parchment-300 mb-1.5">
              Email đăng nhập
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@phucandtrang.love"
                className="w-full pl-10 pr-4 py-2.5 bg-[#25151F]/70 border border-rosewood-900/60 rounded-xl text-xs text-parchment-100 placeholder-stone-600 focus:outline-none focus:border-rosewood-500 focus:ring-1 focus:ring-rosewood-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-parchment-300 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#25151F]/70 border border-rosewood-900/60 rounded-xl text-xs text-parchment-100 placeholder-stone-600 focus:outline-none focus:border-rosewood-500 focus:ring-1 focus:ring-rosewood-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rosewood-600 to-rosewood-700 hover:from-rosewood-500 hover:to-rosewood-600 text-white font-medium text-xs tracking-wider shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
