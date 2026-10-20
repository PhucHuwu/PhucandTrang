'use client';

import React from 'react';

export interface GeneralSettingsTabProps {
  title: string;
  setTitle: (value: string) => void;
  status: string;
  anniversaryDate: string;
  setAnniversaryDate: (value: string) => void;
  heName: string;
  setHeName: (value: string) => void;
  sheName: string;
  setSheName: (value: string) => void;
  proposalQuote: string;
  setProposalQuote: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

export default function GeneralSettingsTab({
  title,
  setTitle,
  status,
  anniversaryDate,
  setAnniversaryDate,
  heName,
  setHeName,
  sheName,
  setSheName,
  proposalQuote,
  setProposalQuote,
  description,
  setDescription,
}: GeneralSettingsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1.5">Tiêu đề nhật ký</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1.5">Trạng thái hiện tại</label>
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#20111A] border border-rosewood-900/60 rounded-xl text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'PUBLISHED' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="font-mono text-white font-semibold">{status}</span>
          <span className="text-[11px] text-stone-400 ml-auto">
            {status === 'PUBLISHED' ? 'Đang phát hành công khai' : 'Bản nháp (Dùng Preview ➔ Publish)'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1.5">Ngày kỷ niệm</label>
        <input
          type="date"
          value={anniversaryDate}
          onChange={(e) => setAnniversaryDate(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1.5">Tên Bạn Trai (He)</label>
        <input
          type="text"
          value={heName}
          onChange={(e) => setHeName(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-300 mb-1.5">Tên Bạn Gái (She)</label>
        <input
          type="text"
          value={sheName}
          onChange={(e) => setSheName(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-stone-300 mb-1.5">Câu ngỏ lời tình yêu (Proposal Quote)</label>
        <input
          type="text"
          value={proposalQuote}
          onChange={(e) => setProposalQuote(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-stone-300 mb-1.5">Mô tả nhật ký</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[#25151F] border border-rosewood-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-rosewood-500"
        />
      </div>
    </div>
  );
}
