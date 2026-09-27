'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import {
  DESIGN_CANVAS_WIDTH,
  DESIGN_CANVAS_HEIGHT,
  normalizedToCanvasTransform,
  canvasToNormalizedTransform,
  computeActiveAreaPageRect,
  computeRelativeActiveArea,
} from '@/utils/coordinateConversion';
import { computeImageFit } from '@/utils/imageFitting';
import { TextVariableResolver } from '@/utils/textVariableResolver';

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
}

// Custom hook to load an image safely for Konva
function useKonvaImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
  }, [src]);

  return image;
}

// Single Element Renderer inside Konva
function KonvaElementItem({
  element,
  isSelected,
  onSelect,
  onChange,
  varContext,
}: {
  element: PageElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  varContext?: any;
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

  // Text variant styling
  const fontFamily =
    s.fontFamily ||
    (d?.variant === 'handwriting'
      ? 'Dancing Script'
      : d?.variant === 'quote'
      ? 'Dancing Script'
      : d?.variant === 'chapter-label'
      ? 'Montserrat'
      : 'Cormorant Garamond');

  const fontSize =
    s.fontSize ||
    (d?.variant === 'title'
      ? 38
      : d?.variant === 'chapter-label'
      ? 20
      : d?.variant === 'quote'
      ? 26
      : d?.variant === 'handwriting'
      ? 32
      : d?.variant === 'caption'
      ? 19
      : 22);

  const fontStyle =
    s.fontStyle === 'italic' ||
    d?.variant === 'quote' ||
    d?.variant === 'handwriting' ||
    d?.variant === 'caption'
      ? 'italic'
      : s.fontWeight === 'bold' || d?.variant === 'title' || d?.variant === 'chapter-label'
      ? 'bold'
      : 'normal';

  const rawText = d?.text || (d?.textLines ? d.textLines.join('\n') : '');
  const displayText = varContext ? TextVariableResolver.resolve(rawText, varContext) : rawText;

  // Render polaroid frame if enabled
  const usePolaroid = s.polaroidFrame !== false;
  const padding = usePolaroid ? (s.padding ?? 14) : 0;
  const captionText = d?.caption ? (varContext ? TextVariableResolver.resolve(d.caption, varContext) : d.caption) : '';
  const captionSpace = usePolaroid && captionText ? 36 : usePolaroid ? 20 : 0;

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
    d?.objectFit || (usePolaroid ? 'contain' : 'cover'),
    d?.focalPoint || { x: 0.5, y: 0.5 }
  );

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
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
          width: t.width,
          height: t.height,
          rotation: e.target.rotation(),
        });
      }}
      onTransformEnd={() => {
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
              width={t.width}
              height={t.height}
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
              x={padding + imgFit.dx}
              y={padding + imgFit.dy}
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
              y={-7}
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
              x={0}
              y={t.height - captionSpace + 4}
              width={t.width}
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
      {element.type === 'TEXT' && (
        <KonvaText
          width={t.width}
          text={displayText}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontStyle={fontStyle}
          fill={s.color || '#292522'}
          align={(s.textAlign as any) || 'left'}
          lineHeight={s.lineHeight ? s.lineHeight / fontSize : 1.35}
          letterSpacing={s.letterSpacing || 0}
          wrap="word"
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
}: KonvaPageCanvasProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const activeAreaRef = useRef<Konva.Rect | null>(null);
  const activeAreaTransformerRef = useRef<Konva.Transformer | null>(null);

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
  const varContext = TextVariableResolver.createContext({
    book: book || undefined,
    page,
  });

  // Sort elements by canonical zIndex ascending
  const sortedElements = [...(page.elements || [])].filter((el) => el.visible !== false);
  sortedElements.sort((a, b) => a.zIndex - b.zIndex);

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
  }, [selectedElementId, page.elements, scale, editingActiveArea]);

  useEffect(() => {
    if (!activeAreaTransformerRef.current) return;
    if (editingActiveArea && activeAreaRef.current) {
      activeAreaTransformerRef.current.nodes([activeAreaRef.current]);
    } else {
      activeAreaTransformerRef.current.nodes([]);
    }
    activeAreaTransformerRef.current.getLayer()?.batchDraw();
  }, [editingActiveArea, selectedElementId, page.elements, scale]);

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

  return (
    <div
      className="relative shadow-2xl rounded border border-rosewood-900/50 overflow-hidden bg-[#0D070A] select-none"
      style={{
        width: `${canvasW * scale}px`,
        height: `${canvasH * scale}px`,
      }}
    >
      <Stage
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
              fontFamily="Cormorant Garamond"
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
            anchorSize={8}
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
                onDragEnd={(e) => {
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
        </Layer>
      </Stage>
    </div>
  );
}
