'use client';

import React, { useMemo, useRef } from 'react';
import { Rect, Text as KonvaText, Image as KonvaImage, Group, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import { PageElement, Book } from '@/types/book';
import { resolveTextTypography, textFontShorthand } from '@/components/admin/editorTextTypography';
import { normalizedToCanvasTransform, computeImageFit, TextVariableResolver } from '@phucandtrang/shared';
import { useKonvaImage } from './useKonvaImage';
import { getMeasureContext, wrapTextLikeViewer } from './textMeasure';

// Single Element Renderer inside Konva
export default function KonvaElementItem({
  element,
  isSelected,
  onSelect,
  onChange,
  onDragMoveSnap,
  onDragEndSnap,
  onGestureChange,
  varContext,
  book,
}: {
  element: PageElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  onDragMoveSnap?: (id: string, currentX: number, currentY: number, width: number, height: number, shiftKey: boolean) => { x: number; y: number };
  onDragEndSnap?: () => void;
  onGestureChange?: (active: boolean) => void;
  varContext?: any;
  book?: Partial<Book> | null;
}) {
  const groupRef = useRef<Konva.Group | null>(null);
  const t = normalizedToCanvasTransform(element.transform);
  const isLocked = Boolean(element.locked);

  const imgSrc =
    element.type === 'IMAGE'
      ? (element.data as any).src
      : element.type === 'VIDEO'
      ? (element.data as any).thumbnailUrl || (element.data as any).src
      : undefined;

  const imageObj = useKonvaImage(imgSrc);

  const s = element.style || {};
  const d = element.data as any;

  // Text: same typography, wrapping and placement rules as PageTextureGenerator.renderTextElement
  const textLayout = useMemo(() => {
    if (element.type !== 'TEXT') return null;
    const typo = resolveTextTypography(element, book, t.width);
    const font = textFontShorthand(element, book);
    const letterSpacing = s.letterSpacing || 0;
    const lines: string[] = [];
    for (const raw of typo.lines) {
      const resolved = varContext ? TextVariableResolver.resolve(raw, varContext) : raw;
      lines.push(...wrapTextLikeViewer(resolved, font, letterSpacing, typo.wrapWidth));
    }
    // Konva truncates lines wider than `width`; the viewer lets an unbreakable word overflow instead
    let widest = 0;
    const measureCtx = getMeasureContext();
    if (measureCtx) {
      measureCtx.font = font;
      for (const line of lines) widest = Math.max(widest, measureCtx.measureText(line).width + letterSpacing * line.length);
    }
    const width = Math.max(t.width, Math.ceil(widest) + 1);
    const x = typo.align === 'center' ? (t.width - width) / 2 : typo.align === 'right' ? t.width - width : 0;
    return {
      ...typo,
      text: lines.join('\n'),
      // Konva has no separate weight prop: its fontStyle accepts "italic bold"
      konvaFontStyle: `${typo.fontStyle} ${typo.fontWeight}`,
      x,
      // The viewer centres the line block vertically in the element box (it may overflow the box)
      y: (t.height - lines.length * typo.lineHeightPx) / 2,
      width,
    };
  }, [element, book, t.width, t.height, s.letterSpacing, varContext]);

  // Render polaroid frame if enabled
  const usePolaroid = s.polaroidFrame !== false;
  const padding = usePolaroid ? (s.padding ?? 14) : 0;
  const captionText = d?.caption ? (varContext ? TextVariableResolver.resolve(d.caption, varContext) : d.caption) : '';
  // Polaroid always keeps a bottom strip for the caption, even before one is written.
  const captionSpace = usePolaroid || captionText ? 38 : 0;

  // Image fitting
  const rawSrcW = imageObj?.naturalWidth || imageObj?.width || 400;
  const rawSrcH = imageObj?.naturalHeight || imageObj?.height || 300;
  const maxImgW = Math.max(10, t.width - padding * 2);
  const maxImgH = Math.max(10, t.height - padding * 2 - captionSpace);

  const imgFit = computeImageFit(
    rawSrcW,
    rawSrcH,
    maxImgW,
    maxImgH,
    d?.objectFit || (element.type === 'IMAGE' ? 'contain' : 'cover'),
    d?.focalPoint || { x: 0.5, y: 0.5 }
  );
  // Same as PageTextureGenerator: the card hugs the fitted photo, centred in the element box.
  const cardW = imageObj ? imgFit.dw + padding * 2 : t.width;
  const cardH = imageObj ? imgFit.dh + padding * 2 + captionSpace : t.height;
  const cardX = (t.width - cardW) / 2;
  const cardY = (t.height - cardH) / 2;

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={t.x}
      y={t.y}
      width={t.width}
      height={t.height}
      rotation={t.rotation}
      opacity={element.opacity ?? 1}
      draggable={!isLocked}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => onGestureChange?.(true)}
      onTransformStart={() => onGestureChange?.(true)}
      onDragMove={(e) => {
        if (onDragMoveSnap) {
          const shiftKey = Boolean((e.evt as MouseEvent)?.shiftKey);
          const snappedPos = onDragMoveSnap(
            element.id,
            e.target.x(),
            e.target.y(),
            t.width,
            t.height,
            shiftKey
          );
          e.target.x(snappedPos.x);
          e.target.y(snappedPos.y);
        }
      }}
      onDragEnd={(e) => {
        if (onDragEndSnap) onDragEndSnap();
        onGestureChange?.(false);
        onChange({
          x: e.target.x(),
          y: e.target.y(),
          width: t.width,
          height: t.height,
          rotation: e.target.rotation(),
        });
      }}
      onTransformEnd={() => {
        onGestureChange?.(false);
        const node = groupRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        const newWidth = Math.max(20, node.width() * scaleX);
        const newHeight = Math.max(20, node.height() * scaleY);

        onChange({
          x: node.x(),
          y: node.y(),
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
        });
      }}
    >
      {/* SHAPE: Rectangle */}
      {element.type === 'SHAPE' && d?.shapeType === 'rectangle' && (
        <Rect
          width={t.width}
          height={t.height}
          fill={d.fillColor || '#FFE5B4'}
          stroke={d.strokeColor}
          strokeWidth={d.strokeWidth || 1}
          cornerRadius={s.borderRadius || 0}
        />
      )}

      {/* SHAPE: Circle */}
      {element.type === 'SHAPE' && d?.shapeType === 'circle' && (
        <Circle
          x={t.width / 2}
          y={t.height / 2}
          radius={Math.min(t.width, t.height) / 2}
          fill={d.fillColor || '#FFE5B4'}
          stroke={d.strokeColor}
          strokeWidth={d.strokeWidth || 1}
        />
      )}

      {/* SHAPE: Line */}
      {element.type === 'SHAPE' && d?.shapeType === 'line' && (
        <Line
          points={[0, t.height / 2, t.width, t.height / 2]}
          stroke={d.strokeColor || 'rgba(201, 154, 154, 0.4)'}
          strokeWidth={d.strokeWidth || 2}
        />
      )}

      {/* IMAGE / VIDEO Element */}
      {(element.type === 'IMAGE' || element.type === 'VIDEO') && (
        <Group width={t.width} height={t.height}>
          {usePolaroid && (
            <Rect
              x={cardX}
              y={cardY}
              width={cardW}
              height={cardH}
              fill={s.backgroundColor || '#FFFFFF'}
              stroke={s.borderColor || 'rgba(180, 160, 140, 0.3)'}
              strokeWidth={s.borderWidth || 1}
              cornerRadius={s.borderRadius || 2}
              shadowColor="rgba(0,0,0,0.18)"
              shadowBlur={8}
              shadowOffset={{ x: 0, y: 4 }}
              shadowOpacity={0.6}
            />
          )}

          {/* Actual photo content using shared computeImageFit */}
          {imageObj ? (
            <KonvaImage
              image={imageObj}
              x={cardX + padding}
              y={cardY + padding}
              width={imgFit.dw}
              height={imgFit.dh}
              crop={{
                x: imgFit.sx,
                y: imgFit.sy,
                width: imgFit.sw,
                height: imgFit.sh,
              }}
            />
          ) : (
            <Rect
              x={padding}
              y={padding}
              width={maxImgW}
              height={maxImgH}
              fill="#2A1622"
            />
          )}

          {/* Washi tape graphic */}
          {usePolaroid && s.washiTape !== false && (
            <Rect
              x={t.width / 2 - 38}
              y={cardY - 7}
              width={76}
              height={16}
              fill="rgba(235, 225, 205, 0.85)"
              shadowColor="rgba(0,0,0,0.1)"
              shadowBlur={2}
            />
          )}

          {/* Polaroid caption text */}
          {captionText && (
            <KonvaText
              x={cardX + 8}
              y={cardY + cardH - captionSpace}
              height={captionSpace}
              verticalAlign="middle"
              width={Math.max(10, cardW - 16)}
              wrap="none"
              ellipsis
              text={captionText}
              fontFamily="Dancing Script"
              fontSize={19}
              fontStyle="italic"
              fill={s.color || '#4A1523'}
              align="center"
            />
          )}

          {/* Video play overlay badge */}
          {element.type === 'VIDEO' && (
            <Group x={t.width / 2} y={t.height / 2 - captionSpace / 2}>
              <Circle radius={24} fill="rgba(24, 15, 18, 0.72)" stroke="#FFE5B4" strokeWidth={2} />
              <Line points={[-6, -10, 10, 0, -6, 10]} closed fill="#FFE5B4" />
            </Group>
          )}
        </Group>
      )}

      {/* TEXT Element */}
      {element.type === 'TEXT' && textLayout && (
        <KonvaText
          x={textLayout.x}
          y={textLayout.y}
          width={textLayout.width}
          text={textLayout.text}
          fontFamily={textLayout.fontFamily}
          fontSize={textLayout.fontSize}
          fontStyle={textLayout.konvaFontStyle}
          fill={textLayout.color}
          align={textLayout.align}
          lineHeight={textLayout.lineHeightPx / textLayout.fontSize}
          letterSpacing={s.letterSpacing || 0}
          wrap="none"
          shadowColor={s.shadow?.color}
          shadowBlur={s.shadow?.blur}
          shadowOffset={s.shadow ? { x: s.shadow.offsetX, y: s.shadow.offsetY } : undefined}
          shadowOpacity={s.shadow ? 1 : 0}
        />
      )}

      {/* DECORATION Element */}
      {element.type === 'DECORATION' && (
        <Group width={t.width} height={t.height}>
          {d?.decorationType === 'washi-tape' ? (
            <Rect width={t.width} height={t.height} fill="rgba(235, 225, 205, 0.85)" />
          ) : (
            <Rect
              width={t.width}
              height={t.height}
              fill="rgba(201, 154, 154, 0.2)"
              stroke="#C99A9A"
              strokeWidth={1}
            />
          )}
        </Group>
      )}

      {/* Visual lock badge if element is locked */}
      {isLocked && (
        <Rect
          x={0}
          y={0}
          width={t.width}
          height={t.height}
          stroke="rgba(239, 68, 68, 0.4)"
          strokeWidth={1}
          dash={[4, 4]}
        />
      )}
    </Group>
  );
}
