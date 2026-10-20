'use client';

import { useEffect, useState } from 'react';

// Custom hook to load an image safely for Konva
export function useKonvaImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setImage(null);
    };
    img.src = src;
    return () => {
      // A slower load for a previous src must not replace the current image
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return image;
}
