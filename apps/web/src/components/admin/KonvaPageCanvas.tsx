'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import { Page, Book } from '@/types/book';
import { textFontShorthand } from '@/components/admin/editorTextTypography';
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
  TextVariableResolver,
  computeSnapping,
  BoxRect,
} from '@phucandtrang/shared';
import KonvaElementItem from './konva/KonvaElementItem';
import PageBackgroundLayer from './konva/PageBackgroundLayer';
import { useKonvaImage } from './konva/useKonvaImage';
import { canvasFontsReady } from './konva/textMeasure';
import { useSnapGuides } from './konva/useSnapGuides';

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

  // Active magnetic snapping guide lines (committed at most once per animation frame).
  const { activeGuides, scheduleGuides, clearGuides } = useSnapGuides();

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
        <PageBackgroundLayer page={page} book={book} canvasW={canvasW} canvasH={canvasH} bgImageObj={bgImageObj} />

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
