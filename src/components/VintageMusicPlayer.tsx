'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music, Disc } from 'lucide-react';
import { LOVE_STORY_DATA } from '@/data/storyData';

interface VintageMusicPlayerProps {
  autoPlayTrigger?: boolean;
}

export default function VintageMusicPlayer({ autoPlayTrigger }: VintageMusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (autoPlayTrigger && !isPlaying && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4500);
          })
          .catch(() => {
            // Browser policy blocked autoplay
            setIsPlaying(false);
          });
      }
    }
  }, [autoPlayTrigger]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      }).catch((e) => console.log('Playback error:', e));
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={LOVE_STORY_DATA.couple.songSrc}
        loop
        preload="auto"
      />

      {/* Floating mini music controller */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Toast track info */}
        <div
          className={`transition-all duration-500 transform ${
            showToast
              ? 'opacity-100 translate-x-0 pointer-events-auto'
              : 'opacity-0 translate-x-4 pointer-events-none'
          } bg-parchment-100/90 backdrop-blur-md border border-rosewood-200/50 shadow-lg px-4 py-2 rounded-full hidden sm:flex items-center gap-2`}
        >
          <Music className="w-3.5 h-3.5 text-rosewood-500 animate-bounce" />
          <span className="text-xs tracking-wider text-ink-700 font-serif italic">
            Đang phát: {LOVE_STORY_DATA.couple.songTitle}
          </span>
        </div>

        {/* Vintage disc button */}
        <button
          onClick={togglePlay}
          className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-parchment-50 border border-champagne-500/40 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-rosewood-900"
          aria-label="Toggle music player"
          title={isPlaying ? "Tạm dừng nhạc" : "Bật nhạc kỉ niệm"}
        >
          {/* Subtle spinning vinyl effect when playing */}
          <Disc
            className={`w-6 h-6 text-rosewood-800 transition-transform ${
              isPlaying ? 'animate-spin' : 'opacity-80'
            }`}
            style={{ animationDuration: '6s' }}
          />

          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            {isPlaying ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rosewood-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rosewood-500 items-center justify-center text-[9px] text-white">
                  <Volume2 className="w-2.5 h-2.5" />
                </span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-4 w-4 bg-ink-600 items-center justify-center text-[9px] text-white">
                <VolumeX className="w-2.5 h-2.5" />
              </span>
            )}
          </span>
        </button>
      </div>
    </>
  );
}
