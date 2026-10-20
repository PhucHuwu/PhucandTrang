'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Text as KonvaText,
  Image as KonvaImage,
  Group,
  Line,
  Circle,
  Transformer,
} from 'react-konva';
import type Konva from 'konva';
import { Page, PageElement, Book } from '@/types/book';
import { resolveTextTypography, textFontShorthand } from '@/components/admin/editorTextTypography';
import {
  CAPTION_FONT,
  PAGE_NUMBER_FONT,
  ensureCanvasFontLoaded,
  ensureCustomFontLoaded,
} from '@/data/fontLoader';
import {
  DESIGN_CANVAS_WIDTH,
  DESIGN_CANVAS_HEIGHT,
  normalizedToCanvasTransform,
  canvasToNormalizedTransform,
  computeActiveAreaPageRect,
  computeRelativeActiveArea,
  computeImageFit,
  TextVariableResolver,
  computeSnapping,
  SnapGuideLine,
  BoxRect,
} from '@phucandtrang/shared';

interface KonvaPageCanvasProps {
  page: Page;
  book?: Partial<Book> | null;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElementTransform: (
    id: string,
    transform: { x: number; y: number; width: number; height: number; rotation: number }
  ) => void;
  editingActiveArea?: boolean;
  onUpdateActiveArea?: (
    id: string,
    activeArea: { left: number; top: number; width: number; height: number }
  ) => void;
  scale: number;
  snappingEnabled?: boolean;
  /** Called with true when a drag / transform gesture starts and false when it ends. */
  onGestureChange?: (active: boolean) => void;
}

// Custom hook to load an image safely for Konva
function useKonvaImage(src?: string) {
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

let measureCtx: CanvasRenderingContext2D | null = null;

/**
 * Same greedy word wrap as the 3D viewer (PageTextureGenerator.wrapText): breaks only at spaces,
 * never inside a word, so editor line breaks match the published page.
 */
function wrapTextLikeViewer(text: string, font: string, letterSpacing: number, maxWidth: number): string[] {
  if (!text) return [];
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const ctx = measureCtx;
  if (!ctx) return text.split('\n');
  ctx.font = font;
  (ctx as any).letterSpacing = letterSpacing ? `${letterSpacing}px` : '0px';

  const wrapped: string[] = [];
  for (const para of text.split('\n')) {
    if (para.trim() === '') {
      wrapped.push('');
      continue;
    }
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) wrapped.push(current);
  }
  return wrapped;
}

/** True when every shorthand already resolves — a warm session needs no load and no Stage re-key. */
function canvasFontsReady(shorthands: string[]): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  try {
    return shorthands.every((shorthand) => document.fonts.check(shorthand));
  } catch {
    return false;
  }
}

// Single Element Renderer inside Konva
function KonvaElementItem({
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

export default function KonvaPageCanvas({
  page,
  book,
  selectedElementId,
  onSelectElement,
  onUpdateElementTransform,
  editingActiveArea = false,
  onUpdateActiveArea,
  scale,
  snappingEnabled = true,
  onGestureChange,
}: KonvaPageCanvasProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const activeAreaRef = useRef<Konva.Rect | null>(null);
  const activeAreaTransformerRef = useRef<Konva.Transformer | null>(null);

  // Active magnetic snapping guide lines. dragmove fires per pointer event; the guides are
  // committed to state at most once per animation frame and only when they actually change.
  const [activeGuides, setActiveGuides] = useState<SnapGuideLine[]>([]);
  const pendingGuidesRef = useRef<SnapGuideLine[]>([]);
  const committedGuidesKeyRef = useRef('[]');
  const guidesFrameRef = useRef<number | null>(null);

  const scheduleGuides = (guides: SnapGuideLine[]) => {
    pendingGuidesRef.current = guides;
    if (guidesFrameRef.current !== null) return;
    guidesFrameRef.current = window.requestAnimationFrame(() => {
      guidesFrameRef.current = null;
      const next = pendingGuidesRef.current;
      const key = JSON.stringify(next);
      if (key === committedGuidesKeyRef.current) return;
      committedGuidesKeyRef.current = key;
      setActiveGuides(next);
    });
  };

  const clearGuides = () => {
    if (guidesFrameRef.current !== null) {
      window.cancelAnimationFrame(guidesFrameRef.current);
      guidesFrameRef.current = null;
    }
    pendingGuidesRef.current = [];
    if (committedGuidesKeyRef.current !== '[]') {
      committedGuidesKeyRef.current = '[]';
      setActiveGuides([]);
    }
  };

  useEffect(
    () => () => {
      if (guidesFrameRef.current !== null) window.cancelAnimationFrame(guidesFrameRef.current);
    },
    []
  );

  // Konva rasterizes into its own canvas, so text is painted with whatever faces are loaded at
  // draw time and never waits for a webfont — an element-style stack silently falls through to
  // `cursive`. Flipping this once the page fonts land re-keys the Stage below so Konva measures
  // the line breaks again with the real faces instead of keeping the fallback layout. A warm
  // session starts ready, so the re-key (which recreates every Konva node) only ever runs cold.
  const pageFontShorthands = useMemo(() => {
    const shorthands = new Set<string>([CAPTION_FONT, PAGE_NUMBER_FONT]);
    for (const el of page.elements || []) {
      if (el.visible === false) continue;
      if (el.type === 'TEXT') shorthands.add(textFontShorthand(el, book));
    }
    return Array.from(shorthands);
  }, [page.elements, book]);

  const [fontsReady, setFontsReady] = useState(() => canvasFontsReady(pageFontShorthands));

  const canvasW = book?.settings?.dimensions?.canvasResolution?.width || DESIGN_CANVAS_WIDTH;
  const canvasH = book?.settings?.dimensions?.canvasResolution?.height || DESIGN_CANVAS_HEIGHT;

  // Background Image
  const bgImageObj = useKonvaImage(page.background?.imageUrl);

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

  // Variable context for template resolving
  const varContext = useMemo(
    () =>
      TextVariableResolver.createContext({
        book: book || undefined,
        page,
      }),
    [book, page]
  );

  // Sort elements by canonical zIndex ascending
  const sortedElements = [...(page.elements || [])].filter((el) => el.visible !== false);
  sortedElements.sort((a, b) => a.zIndex - b.zIndex);

  // Every family this page can paint must be loaded before the first Stage draw (see fontsReady).
  useEffect(() => {
    if (canvasFontsReady(pageFontShorthands)) {
      setFontsReady(true);
      return;
    }

    let cancelled = false;

    Promise.all([
      ensureCustomFontLoaded(),
      ...pageFontShorthands.map((shorthand) => ensureCanvasFontLoaded(shorthand)),
    ]).then(() => {
      if (!cancelled) setFontsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [pageFontShorthands]);

  // Attach transformer to selected node
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    if (selectedElementId) {
      const selectedNode = stageRef.current.findOne(`#${selectedElementId}`);
      const selectedElement = page.elements?.find((el) => el.id === selectedElementId);

      if (selectedNode && !selectedElement?.locked && !editingActiveArea) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    transformerRef.current.nodes([]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedElementId, page.elements, scale, editingActiveArea, fontsReady]);

  useEffect(() => {
    if (!activeAreaTransformerRef.current) return;
    if (editingActiveArea && activeAreaRef.current) {
      activeAreaTransformerRef.current.nodes([activeAreaRef.current]);
    } else {
      activeAreaTransformerRef.current.nodes([]);
    }
    activeAreaTransformerRef.current.getLayer()?.batchDraw();
  }, [editingActiveArea, selectedElementId, page.elements, scale, fontsReady]);

  // Click on stage blank area deselects
  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onSelectElement(null);
    }
  };

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

  const selectedElement = page.elements?.find((el) => el.id === selectedElementId);
  const activeAreaPageRect = selectedElement
    ? computeActiveAreaPageRect(
        selectedElement.transform,
        selectedElement.interaction?.activeArea
      )
    : null;

  // Snapping handler for KonvaElementItem
  const handleDragMoveSnap = (
    elementId: string,
    currentX: number,
    currentY: number,
    width: number,
    height: number,
    shiftKey: boolean
  ) => {
    // If Shift key is held down or snapping is toggled OFF, disable magnetic snapping
    if (!snappingEnabled || shiftKey) {
      scheduleGuides([]);
      return { x: currentX, y: currentY };
    }

    // Build bounding boxes of all OTHER elements on the page
    const otherBoxes: BoxRect[] = (page.elements || [])
      .filter((el) => el.id !== elementId && el.visible !== false)
      .map((el) => {
        const trans = normalizedToCanvasTransform(el.transform);
        return {
          x: trans.x,
          y: trans.y,
          width: trans.width,
          height: trans.height,
        };
      });

    const draggingBox: BoxRect = {
      x: currentX,
      y: currentY,
      width,
      height,
    };

    const snapResult = computeSnapping(draggingBox, otherBoxes, canvasW, canvasH, {
      threshold: 8,
      margin: 60,
      enabled: true,
    });

    scheduleGuides(snapResult.guides);
    return { x: snapResult.x, y: snapResult.y };
  };

  const handleDragEndSnap = () => {
    clearGuides();
  };

  return (
    <div
      className="relative shadow-2xl rounded border border-rosewood-900/50 overflow-hidden bg-[#0D070A] select-none"
      style={{
        width: `${canvasW * scale}px`,
        height: `${canvasH * scale}px`,
      }}
    >
      <Stage
        key={fontsReady ? 'fonts-ready' : 'fonts-loading'}
        ref={stageRef}
        width={canvasW * scale}
        height={canvasH * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
      >
        {/* Background Layer */}
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

        {/* Elements Interactive Layer */}
        <Layer>
          {sortedElements.map((el) => (
            <KonvaElementItem
              key={el.id}
              element={el}
              isSelected={el.id === selectedElementId}
              onSelect={() => onSelectElement(el.id)}
              onDragMoveSnap={handleDragMoveSnap}
              onDragEndSnap={handleDragEndSnap}
              onGestureChange={onGestureChange}
              book={book}
              onChange={(newAttrs) => {
                const normalized = canvasToNormalizedTransform(
                  {
                    x: newAttrs.x,
                    y: newAttrs.y,
                    width: newAttrs.width,
                    height: newAttrs.height,
                    rotation: newAttrs.rotation,
                    scaleX: 1,
                    scaleY: 1,
                  },
                  canvasW,
                  canvasH
                );
                onUpdateElementTransform(el.id, normalized);
              }}
              varContext={varContext}
            />
          ))}

          {/* Transformer for Selection, Drag, Resize, and Rotate */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center',
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 15 || newBox.height < 15) {
                return oldBox;
              }
              return newBox;
            }}
            anchorCornerRadius={3}
            anchorSize={9}
            anchorStyleFunc={(anchor) => anchor.hitStrokeWidth(16)}
            anchorStroke="#8C2437"
            anchorFill="#FFE5B4"
            borderStroke="#8C2437"
            borderDash={[4, 4]}
          />

          {editingActiveArea && selectedElement && activeAreaPageRect && !selectedElement.locked && (
            <>
              <Rect
                ref={activeAreaRef}
                x={activeAreaPageRect.left * canvasW}
                y={activeAreaPageRect.top * canvasH}
                width={activeAreaPageRect.width * canvasW}
                height={activeAreaPageRect.height * canvasH}
                fill="rgba(245, 158, 11, 0.12)"
                stroke="#F59E0B"
                strokeWidth={2}
                dash={[8, 5]}
                draggable={true}
                onDragStart={() => onGestureChange?.(true)}
                onTransformStart={() => onGestureChange?.(true)}
                onDragEnd={(e) => {
                  onGestureChange?.(false);
                  const node = e.target;
                  const relative = computeRelativeActiveArea(selectedElement.transform, {
                    left: node.x() / canvasW,
                    top: node.y() / canvasH,
                    width: node.width() / canvasW,
                    height: node.height() / canvasH,
                  });
                  onUpdateActiveArea?.(selectedElement.id, relative);
                }}
                onTransformEnd={() => {
                  onGestureChange?.(false);
                  const node = activeAreaRef.current;
                  if (!node) return;
                  const width = Math.max(2, node.width() * Math.abs(node.scaleX()));
                  const height = Math.max(2, node.height() * Math.abs(node.scaleY()));
                  node.scaleX(1);
                  node.scaleY(1);
                  node.width(width);
                  node.height(height);

                  const relative = computeRelativeActiveArea(selectedElement.transform, {
                    left: node.x() / canvasW,
                    top: node.y() / canvasH,
                    width: width / canvasW,
                    height: height / canvasH,
                  });
                  onUpdateActiveArea?.(selectedElement.id, relative);
                }}
              />
              <Transformer
                ref={activeAreaTransformerRef}
                rotateEnabled={false}
                keepRatio={false}
                enabledAnchors={[
                  'top-left',
                  'top-right',
                  'bottom-left',
                  'bottom-right',
                  'middle-left',
                  'middle-right',
                  'top-center',
                  'bottom-center',
                ]}
                anchorSize={7}
                anchorStroke="#F59E0B"
                anchorFill="#FEF3C7"
                borderStroke="#F59E0B"
                borderDash={[5, 4]}
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
                }
              />
            </>
          )}

          {/* Prompt 31: Dynamic Alignment Snapping Guide Lines Overlay */}
          {activeGuides.map((guide, idx) => (
            <Line
              key={`snap-guide-${idx}`}
              points={guide.points}
              stroke="#06B6D4" // Cyan / Aqua magnetic guideline
              strokeWidth={1.5}
              dash={[6, 4]}
              listening={false}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
