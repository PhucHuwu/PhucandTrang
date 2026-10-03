'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Disc,
  SkipForward,
  SkipBack,
  ListMusic,
  X,
} from 'lucide-react';
import { AudioTrack } from '@/types/book';

interface VintageMusicPlayerProps {
  autoPlayTrigger?: boolean;
  audioTrack?: AudioTrack | null;
  playlist?: AudioTrack[];
}

export default function VintageMusicPlayer({
  autoPlayTrigger,
  audioTrack,
  playlist,
}: VintageMusicPlayerProps) {
  // Combine single audioTrack fallback and playlist into active queue
  const queue: AudioTrack[] = useMemo(() => {
    if (Array.isArray(playlist) && playlist.length > 0) {
      return playlist;
    }
    if (audioTrack && audioTrack.src) {
      return [audioTrack];
    }
    return [];
  }, [playlist, audioTrack]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // Track whether user explicitly stopped or paused playback
  const isManuallyPausedRef = useRef(false);
  // Track whether initial autoplay has already fired
  const hasAutoPlayedRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentTrack: AudioTrack | undefined = queue[currentIndex] || queue[0];
  const songSrc = currentTrack?.src;
  const songTitle = currentTrack?.title || 'Nhạc kỷ niệm';
  const songArtist = currentTrack?.artist;
  const targetVolume = currentTrack?.volume ?? 0.8;
  const loop = queue.length === 1 ? (currentTrack?.loop ?? true) : false;
  const startAt = currentTrack?.startAt ?? 0.0;
  const fadeIn = currentTrack?.fadeIn ?? 0.0;
  const fadeOut = currentTrack?.fadeOut ?? 0.0;

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
          setIsPlaying(false);
        });
    }
  }, [applyFadeIn, songSrc, startAt]);

  // Next Track in Playlist
  const handleNextTrack = useCallback(() => {
    if (queue.length <= 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }
    const nextIdx = (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIdx);
    setTimeout(() => {
      startPlayback();
    }, 100);
  }, [currentIndex, queue.length, startPlayback]);

  // Previous Track in Playlist
  const handlePrevTrack = useCallback(() => {
    if (queue.length <= 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      return;
    }
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prevIdx);
    setTimeout(() => {
      startPlayback();
    }, 100);
  }, [currentIndex, queue.length, startPlayback]);

  // Handle Track Completion: Automatically play next song in Playlist!
  const handleSongEnded = useCallback(() => {
    if (queue.length > 1) {
      handleNextTrack();
    } else if (loop) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      setIsPlaying(false);
    }
  }, [handleNextTrack, loop, queue.length]);

  // Trigger Autoplay ONLY ONCE when reader first starts opening the book (page > 0)
  // Strictly respects user pause: NEVER restart if user manually paused!
  useEffect(() => {
    if (
      autoPlayTrigger &&
      !hasAutoPlayedRef.current &&
      !isManuallyPausedRef.current &&
      !isPlaying &&
      songSrc
    ) {
      hasAutoPlayedRef.current = true;
      startPlayback();
    }
  }, [autoPlayTrigger, isPlaying, songSrc, startPlayback]);

  // One-time interaction fallback: unlock audio on first gesture if not manually paused
  useEffect(() => {
    if (userInteracted || !songSrc) return;

    const handleFirstGesture = () => {
      setUserInteracted(true);
      if (autoPlayTrigger && !hasAutoPlayedRef.current && !isManuallyPausedRef.current && !isPlaying) {
        hasAutoPlayedRef.current = true;
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
      isManuallyPausedRef.current = true;
      applyFadeOutAndPause();
    } else {
      isManuallyPausedRef.current = false;
      startPlayback();
    }
  };

  // If no audio tracks are in queue, do not render player
  if (queue.length === 0 || !songSrc) {
    return null;
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={songSrc}
        loop={loop}
        preload="auto"
        onEnded={handleSongEnded}
      />

      {/* Floating mini music controller */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {/* Toast track info */}
        <div
          className={`transition-all duration-500 transform ${
            showToast
              ? 'opacity-100 translate-x-0 pointer-events-auto'
              : 'opacity-0 translate-x-4 pointer-events-none'
          } bg-[#FBF7EE]/95 backdrop-blur-md border border-[#8C2437]/20 shadow-lg px-4 py-2 rounded-full hidden sm:flex items-center gap-2`}
        >
          <Music className="w-3.5 h-3.5 text-[#8C2437] animate-bounce" />
          <span className="text-xs tracking-wider text-[#2A2421] font-serif italic truncate max-w-xs">
            {currentIndex + 1}/{queue.length}: {songTitle}
            {songArtist && <span className="opacity-70 font-normal"> • {songArtist}</span>}
          </span>
        </div>

        {/* Playlist Controls bar if multi-track */}
        {queue.length > 1 && (
          <div className="flex items-center gap-1 bg-[#FAF6EE]/90 backdrop-blur-md border border-[#D4AF37]/40 px-2 py-1.5 rounded-full shadow-lg">
            <button
              onClick={handlePrevTrack}
              className="p-1 rounded-full hover:bg-rosewood-100 text-[#4A1521] transition active:scale-90"
              title="Bài trước đó"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowPlaylistModal(!showPlaylistModal)}
              className="p-1 rounded-full hover:bg-rosewood-100 text-[#4A1521] transition active:scale-90 relative"
              title="Danh sách Playlist"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span className="absolute -top-1 -right-1 bg-rosewood-600 text-white rounded-full text-[9px] w-3.5 h-3.5 flex items-center justify-center font-mono">
                {queue.length}
              </span>
            </button>

            <button
              onClick={handleNextTrack}
              className="p-1 rounded-full hover:bg-rosewood-100 text-[#4A1521] transition active:scale-90"
              title="Bài kế tiếp"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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

      {/* Playlist Drawer/Modal */}
      {showPlaylistModal && (
        <div className="fixed bottom-20 right-6 z-50 w-72 max-h-80 bg-[#1C0F17]/95 border border-rosewood-800/80 backdrop-blur-xl shadow-2xl rounded-2xl p-3 text-xs text-parchment-200 overflow-y-auto animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-rosewood-900/60 mb-2">
            <span className="font-serif font-bold text-champagne-300 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-amber-400" />
              <span>Playlist ({queue.length} bài)</span>
            </span>
            <button
              onClick={() => setShowPlaylistModal(false)}
              className="p-1 rounded hover:bg-rosewood-900/60 text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {queue.map((track, idx) => (
              <button
                key={track.id || idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  isManuallyPausedRef.current = false;
                  setTimeout(() => {
                    startPlayback();
                  }, 100);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition ${
                  idx === currentIndex
                    ? 'bg-rosewood-900/80 text-champagne-300 font-bold border border-rosewood-600/50'
                    : 'hover:bg-rosewood-950/60 text-stone-300'
                }`}
              >
                <span className="font-mono text-[10px] text-stone-500 w-4 text-center">
                  {idx + 1}
                </span>
                <div className="flex-1 truncate">
                  <p className="truncate font-medium">{track.title}</p>
                  {track.artist && (
                    <p className="text-[10px] text-stone-500 truncate">{track.artist}</p>
                  )}
                </div>
                {idx === currentIndex && isPlaying && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
