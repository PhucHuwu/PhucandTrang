'use client';

import React from 'react';
import { Layer, Rect, Text as KonvaText, Image as KonvaImage } from 'react-konva';
import { Page, Book } from '@/types/book';
import { computeImageFit } from '@phucandtrang/shared';

export interface PageBackgroundLayerProps {
  page: Page;
  book?: Partial<Book> | null;
  canvasW: number;
  canvasH: number;
  bgImageObj: HTMLImageElement | null;
}

/** Non-interactive page background: paper colour, gradient, photo, header / gutter fades and the page number. */
export default function PageBackgroundLayer({ page, book, canvasW, canvasH, bgImageObj }: PageBackgroundLayerProps) {
  // Background math using shared computeImageFit
  const bgSrcW = bgImageObj?.naturalWidth || bgImageObj?.width || canvasW;
  const bgSrcH = bgImageObj?.naturalHeight || bgImageObj?.height || canvasH;
  const bgFit = computeImageFit(
    bgSrcW,
    bgSrcH,
    canvasW,
    canvasH,
    (page.background?.objectFit as any) || 'cover',
    page.background?.focalPoint || { x: 0.5, y: 0.5 }
  );

  // Gradient computation for Konva
  const gradientAngleRad = (((page.background?.gradient?.angle ?? 180) - 90) * Math.PI) / 180;
  const gradStartX = canvasW / 2 - (Math.cos(gradientAngleRad) * canvasW) / 2;
  const gradStartY = canvasH / 2 - (Math.sin(gradientAngleRad) * canvasH) / 2;
  const gradEndX = canvasW / 2 + (Math.cos(gradientAngleRad) * canvasW) / 2;
  const gradEndY = canvasH / 2 + (Math.sin(gradientAngleRad) * canvasH) / 2;

  const gradColorStops: (number | string)[] = [];
  if (page.background?.type === 'gradient' && page.background.gradient?.stops) {
    for (const stop of page.background.gradient.stops) {
      gradColorStops.push(stop.offset, stop.color);
    }
  }

  // Header fade effect heights & opacities
  const headerFadeHeight = (page.background?.headerFade?.height ?? 0.345) * canvasH;
  const headerFadeColor = page.background?.headerFade?.color || '#F9F5EC';
  const gutterFadeWidth = (page.background?.gutterFade?.width ?? 0.14) * canvasW;
  const gutterFadeColor = page.background?.gutterFade?.color || '#F9F5EC';

  return (
    <Layer listening={false}>
      {/* Base Paper Color Fill */}
      <Rect
        width={canvasW}
        height={canvasH}
        fill={page.background?.color || book?.settings?.theme?.paperColor || '#F9F5EC'}
      />

      {/* Gradient Background if type is gradient */}
      {page.background?.type === 'gradient' && gradColorStops.length > 0 && (
        <Rect
          width={canvasW}
          height={canvasH}
          fillLinearGradientStartPoint={{ x: gradStartX, y: gradStartY }}
          fillLinearGradientEndPoint={{ x: gradEndX, y: gradEndY }}
          fillLinearGradientColorStops={gradColorStops}
        />
      )}

      {/* Photo background using shared computeImageFit if present */}
      {bgImageObj && (
        <KonvaImage
          image={bgImageObj}
          x={bgFit.dx}
          y={bgFit.dy}
          width={bgFit.dw}
          height={bgFit.dh}
          crop={{
            x: bgFit.sx,
            y: bgFit.sy,
            width: bgFit.sw,
            height: bgFit.sh,
          }}
          opacity={page.background?.opacity ?? 1}
        />
      )}

      {/* Header Reading Zone Fade effect */}
      {page.background?.headerFade?.enabled !== false && (
        <Rect
          x={0}
          y={0}
          width={canvasW}
          height={headerFadeHeight}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: 0, y: headerFadeHeight }}
          fillLinearGradientColorStops={[
            0,
            headerFadeColor,
            0.66,
            `${headerFadeColor}66`,
            1,
            'rgba(249, 245, 236, 0)',
          ]}
        />
      )}

      {/* Spine Gutter Fade effect */}
      {page.background?.gutterFade?.enabled !== false && (
        <Rect
          x={page.side === 'left' ? canvasW - gutterFadeWidth : 0}
          y={0}
          width={gutterFadeWidth}
          height={canvasH}
          fillLinearGradientStartPoint={{
            x: page.side === 'left' ? gutterFadeWidth : 0,
            y: 0,
          }}
          fillLinearGradientEndPoint={{
            x: page.side === 'left' ? 0 : gutterFadeWidth,
            y: 0,
          }}
          fillLinearGradientColorStops={[
            0,
            gutterFadeColor,
            1,
            'rgba(249, 245, 236, 0)',
          ]}
        />
      )}

      {/* Page Number Guide (if enabled) */}
      {page.showPageNumber !== false && page.pageNumber !== undefined && page.pageNumber > 0 && (
        <KonvaText
          x={0}
          y={canvasH - 45}
          width={canvasW}
          text={`— ${page.pageNumber} —`}
          fontFamily={'"Cormorant Garamond", Georgia, serif'}
          fontSize={16}
          fontStyle="italic"
          fill="#8C6F5A"
          align="center"
          letterSpacing={2}
        />
      )}
    </Layer>
  );
}
