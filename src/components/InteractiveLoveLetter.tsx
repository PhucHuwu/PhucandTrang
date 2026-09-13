'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Mail, Sparkles, Heart } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

export default function InteractiveLoveLetter() {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Trigger romantic warm petal confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#D58E9F', '#E8BCC6', '#E6C687', '#F5E3E7']
      });
    }
  };

  return (
    <div className="my-16 max-w-xl mx-auto px-4">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-[0.25em] text-rosewood-400 font-semibold">
          Final Note • Chapter IV
        </span>
        <h3 className="font-serif text-2xl sm:text-3xl text-ink-900 mt-1">
          Bức Thư Tay Gửi Trang
        </h3>
        <p className="font-serif italic text-sm text-ink-600 mt-1">
          Chạm vào phong bì để mở những lời thì thầm từ đáy lòng...
        </p>
      </div>

      {/* Envelope Component */}
      <div className="relative flex flex-col items-center">
        {/* Envelope Body */}
        <div
          onClick={handleOpen}
          className={`cursor-pointer w-full max-w-md bg-[#F4EDE2] border-2 border-[#DEC49C] rounded-lg shadow-xl p-6 transition-all duration-700 ease-out hover:shadow-2xl hover:border-rosewood-300 relative overflow-hidden ${
            isOpen ? 'ring-2 ring-rosewood-300' : ''
          }`}
        >
          {/* Wax seal stamp */}
          <div className="absolute top-4 right-4 w-11 h-11 rounded-full bg-rosewood-700 border border-rosewood-900 shadow-md flex items-center justify-center text-champagne-400 font-serif text-xs font-bold ring-2 ring-rosewood-400/40">
            <Heart className="w-5 h-5 fill-champagne-400 text-champagne-400" />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-full bg-parchment-200/80 text-rosewood-700">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="font-serif text-xs text-ink-500 uppercase tracking-wider">Gửi người con gái tớ thương</p>
              <h4 className="font-serif font-bold text-lg text-ink-900">Nguyễn Thu Trang</h4>
            </div>
          </div>

          {!isOpen ? (
            <div className="py-8 text-center border-t border-dashed border-parchment-300 flex flex-col items-center justify-center gap-2 text-rosewood-600">
              <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="font-serif italic text-sm text-ink-700">
                [ Phong bì niêm phong — Bấm để mở thư ]
              </span>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-rosewood-200/80 animate-fade-in">
              <div className="lined-paper py-2 px-3 text-ink-800 font-serif text-base sm:text-lg space-y-4">
                <p className="font-script text-2xl text-rosewood-800">
                  Gửi Trang yêu dấu của tớ,
                </p>

                <p className="leading-relaxed">
                  Từ ngày 20 tháng 10 năm 2022, khi tớ lấy hết can đảm để hỏi câu hỏi ấy:
                  <span className="block my-2 text-center font-handwriting text-2xl sm:text-3xl text-rosewood-900 font-bold">
                    &quot;{LOVE_STORY_DATA.couple.proposalQuote}&quot;
                  </span>
                  cuộc đời tớ đã bước sang một trang giấy ngập tràn màu hồng và những giai điệu êm dịu nhất.
                </p>

                <p className="leading-relaxed">
                  Cảm ơn em vì đã luôn kiên nhẫn, luôn cùng tớ sẻ chia từng niềm vui nhỏ nhặt và những nỗi âu lo trong cuộc sống. Từng nụ cười của em luôn là điều quý giá nhất mà tớ trân trọng.
                </p>

                <p className="leading-relaxed">
                  Dù sau này thời gian trôi qua, tóc có thêm sợi bạc, cuốn nhật ký này sẽ luôn dày thêm với những hành trình mới mà chỉ riêng hai đứa mình cùng viết nên.
                </p>

                <div className="pt-4 text-right">
                  <p className="font-serif text-sm text-ink-500">Yêu em trọn vẹn,</p>
                  <p className="font-handwriting text-3xl sm:text-4xl text-rosewood-900 mt-1">
                    {LOVE_STORY_DATA.couple.he}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
