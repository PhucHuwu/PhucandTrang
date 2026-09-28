'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Music, Disc } from 'lucide-react';
import { AudioTrack } from '@/types/book';

interface VintageMusicPlayerProps {
  autoPlayTrigger?: boolean;
  audioTrack?: AudioTrack | null;
}

export default function VintageMusicPlayer({
  autoPlayTrigger,
  audioTrack,
}: VintageMusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const songSrc = audioTrack?.src;
  const songTitle = audioTrack?.title || 'Nhạc kỷ niệm';
  const songArtist = audioTrack?.artist;
  const targetVolume = audioTrack?.volume ?? 0.8;
  const loop = audioTrack?.loop ?? true;
  const startAt = audioTrack?.startAt ?? 0.0;
  const fadeIn = audioTrack?.fadeIn ?? 0.0;
  const fadeOut = audioTrack?.fadeOut ?? 0.0;

  // Clear any active volume fade interval
  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  // Smooth fade-in volume transition
  const applyFadeIn = useCallback(() => {
    if (!audioRef.current) return;
    clearFade();

    if (fadeIn <= 0) {
      audioRef.current.volume = targetVolume;
      return;
    }

    const steps = 20;
    const stepTime = (fadeIn * 1000) / steps;
    const volumeIncrement = targetVolume / steps;

    audioRef.current.volume = 0.05;

    fadeIntervalRef.current = setInterval(() => {
      if (!audioRef.current) {
        clearFade();
        return;
      }

      const nextVol = audioRef.current.volume + volumeIncrement;
      if (nextVol >= targetVolume) {
        audioRef.current.volume = targetVolume;
        clearFade();
      } else {
        audioRef.current.volume = Math.min(1, Math.max(0, nextVol));
      }
    }, stepTime);
  }, [clearFade, fadeIn, targetVolume]);

  // Smooth fade-out volume transition before pause
  const applyFadeOutAndPause = useCallback(() => {
    if (!audioRef.current) return;
    clearFade();

    if (fadeOut <= 0) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    const steps = 15;
    const stepTime = (fadeOut * 1000) / steps;
    const currentVol = audioRef.current.volume;
    const volumeDecrement = currentVol / steps;

    fadeIntervalRef.current = setInterval(() => {
      if (!audioRef.current) {
        clearFade();
        return;
      }

      const nextVol = audioRef.current.volume - volumeDecrement;
      if (nextVol <= 0.05) {
        audioRef.current.volume = 0;
        audioRef.current.pause();
        audioRef.current.volume = targetVolume;
        setIsPlaying(false);
        clearFade();
      } else {
        audioRef.current.volume = Math.max(0, nextVol);
      }
    }, stepTime);
  }, [clearFade, fadeOut, targetVolume]);

  // Handle Play Request with Browser Autoplay Policy Resilience
  const startPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !songSrc) return;

    if (startAt > 0 && audio.currentTime === 0) {
      audio.currentTime = startAt;
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4500);
          applyFadeIn();
        })
        .catch(() => {
          // Autoplay policy prevented playback. Wait for user interaction.
          setIsPlaying(false);
        });
    }
  }, [applyFadeIn, songSrc, startAt]);

  // Trigger Autoplay when requested by the reader turning a page
  useEffect(() => {
    if (autoPlayTrigger && !isPlaying && songSrc) {
      startPlayback();
    }
  }, [autoPlayTrigger, isPlaying, songSrc, startPlayback]);

  // One-time interaction fallback: unlock audio on first page click or touch
  useEffect(() => {
    if (userInteracted || !songSrc) return;

    const handleFirstGesture = () => {
      setUserInteracted(true);
      if (autoPlayTrigger && !isPlaying) {
        startPlayback();
      }
    };

    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [autoPlayTrigger, isPlaying, songSrc, startPlayback, userInteracted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFade();
    };
  }, [clearFade]);

  // Toggle Play / Pause via Vinyl Disk button
  const togglePlay = () => {
    if (!audioRef.current || !songSrc) return;

    if (isPlaying) {
      applyFadeOutAndPause();
    } else {
      startPlayback();
    }
  };

  // If no audio track is provided, do not render player
  if (!songSrc) {
    return null;
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={songSrc}
        loop={loop}
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
          } bg-[#FBF7EE]/95 backdrop-blur-md border border-[#8C2437]/20 shadow-lg px-4 py-2 rounded-full hidden sm:flex items-center gap-2`}
        >
          <Music className="w-3.5 h-3.5 text-[#8C2437] animate-bounce" />
          <span className="text-xs tracking-wider text-[#2A2421] font-serif italic">
            Đang phát: {songTitle}
            {songArtist && <span className="opacity-70 font-normal"> • {songArtist}</span>}
          </span>
        </div>

        {/* Vintage disc button */}
        <button
          onClick={togglePlay}
          className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-[#FAF6EE] border border-[#D4AF37]/50 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-[#3A1F26]"
          aria-label="Toggle music player"
          title={isPlaying ? 'Tạm dừng nhạc' : `Bật nhạc: ${songTitle}`}
        >
          {/* Subtle spinning vinyl effect when playing */}
          <Disc
            className={`w-6 h-6 text-[#4A1521] transition-transform ${
              isPlaying ? 'animate-spin' : 'opacity-80'
            }`}
            style={{ animationDuration: '6s' }}
          />

          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            {isPlaying ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8C2437]/40 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#8C2437] items-center justify-center text-[9px] text-white">
                  <Volume2 className="w-2.5 h-2.5" />
                </span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#5C4D47] items-center justify-center text-[9px] text-white">
                <VolumeX className="w-2.5 h-2.5" />
              </span>
            )}
          </span>
        </button>
      </div>
    </>
  );
}
