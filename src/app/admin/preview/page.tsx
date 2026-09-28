'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QbjectAuthenticExperience from '@/components/3d/QbjectAuthenticExperience';
import {
  getJournal,
  previewJournalDraft,
  publishJournal,
  checkAdminAuth,
} from '@/services/adminApi';
import { Book } from '@/types/book';
import { PHUC_AND_TRANG_BOOK } from '@/data/bookData';
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminPreviewDraftDirectPage() {
  const router = useRouter();

  const [draftBook, setDraftBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  useEffect(() => {
    let unmounted = false;

    async function loadDraft() {
      try {
        setLoading(true);
        setError(null);

        // Verify authenticated admin session
        await checkAdminAuth();

        const previewRes = await previewJournalDraft();
        if (unmounted) return;

        const doc = previewRes.document;
        const resolvedAudio = doc.audio !== undefined ? doc.audio : null;

        const mappedBook: Book = {
          id: doc.id,
          title: doc.title,
          slug: doc.slug,
          description: doc.description,
          version: doc.version || '2.0.0',
          contentRevision: doc.contentRevision || 1,
          couple: doc.couple,
          cover: doc.cover,
          backgroundMusicId: resolvedAudio?.id || null,
          audio: resolvedAudio,
          settings: doc.settings || PHUC_AND_TRANG_BOOK.settings,
          pages: (doc.pages || []).map((p: any) => ({
            ...p,
            audioTrackId: p.audio?.id || null,
            audio: p.audio !== undefined ? p.audio : null,
          })),
        };

        setDraftBook(mappedBook);
      } catch (err: any) {
        if (!unmounted) {
          setError(err?.message || 'Không thể tải bản xem trước (Draft Preview).');
        }
      } finally {
        if (!unmounted) {
          setLoading(false);
        }
      }
    }

    loadDraft();

    return () => {
      unmounted = true;
    };
  }, []);

  const handlePublish = async () => {
    if (publishing) return;
    const confirmPub = window.confirm(
      'Bạn có chắc chắn muốn xuất bản (Publish) toàn bộ bản nháp hiện tại lên website công khai?\n\n' +
      'Bản snapshot mới sẽ được biên dịch và phục vụ ngay lập tức cho độc giả.'
    );
    if (!confirmPub) return;

    try {
      setPublishing(true);
      const res = await publishJournal();
      setPublishSuccess(res.message || 'Đã xuất bản thành công!');
      setTimeout(() => {
        setPublishSuccess(null);
      }, 4000);
    } catch (err: any) {
      alert(`Lỗi khi xuất bản: ${err?.message || 'Vui lòng thử lại.'}`);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#110D0E] text-stone-300">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
        <p className="font-serif tracking-widest text-sm">Đang kết xuất bản nháp (Draft Preview)...</p>
      </div>
    );
  }

  if (error || !draftBook) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#110D0E] text-stone-200 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-xl font-semibold mb-2">Không thể xem trước bản nháp</h2>
        <p className="text-sm text-stone-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang quản trị</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#110D0E]">
      {/* Top Floating Control Bar */}
      <header className="absolute top-4 inset-x-4 z-50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800/90 text-stone-200 backdrop-blur-md border border-stone-700/60 shadow-xl text-xs font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát xem trước</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 backdrop-blur-md text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Xem trước bản nháp (Draft Preview)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          {publishSuccess && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 backdrop-blur-md text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{publishSuccess}</span>
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 text-white font-medium text-xs shadow-xl transition"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{publishing ? 'Đang xuất bản...' : 'Xuất bản ngay (Publish)'}</span>
          </button>
        </div>
      </header>

      {/* 3D Authentic Flipbook Rendering the Draft */}
      <QbjectAuthenticExperience
        customBookData={draftBook}
        isDraftPreview={true}
      />
    </div>
  );
}
